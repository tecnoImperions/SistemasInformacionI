import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Search, Plus, X, Printer, FileText, Trash2, User, Calendar, Truck, MapPin, Phone, Mail } from 'lucide-react';
const logoImg = import.meta.env.BASE_URL + 'logo.png';
export default function NotasEntrega({ addToast, userProfile }) {
  const { tipoCambio } = useStore();
  const [notas, setNotas] = useState([]);
  const [search, setSearch] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Print state
  const [printData, setPrintData] = useState(null);

  // Master-Detail Form State
  // Master-Detail Form State
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  const [formData, setFormData] = useState({
    numero_nota: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: '',
    id_transportista: '',
    id_cotizacion: '',
    tipo_cambio: tipoCambio // Use global store exchange rate
  });
  
  const [detalles, setDetalles] = useState([]); 

  // Autocomplete states
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const clienteSearchRef = useRef(null);
  
  const [showTranspSearch, setShowTranspSearch] = useState(false);
  const [transpSearchTerm, setTranspSearchTerm] = useState('');
  const transpSearchRef = useRef(null);

  const [activeProveedorRow, setActiveProveedorRow] = useState(null);
  const proveedorSearchRef = useRef(null);

  useEffect(() => {
    fetchNotas();
    fetchDependencies();

    function handleClickOutside(event) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(event.target)) {
        setShowClienteSearch(false);
      }
      if (transpSearchRef.current && !transpSearchRef.current.contains(event.target)) {
        setShowTranspSearch(false);
      }
      if (proveedorSearchRef.current && !proveedorSearchRef.current.contains(event.target)) {
        setActiveProveedorRow(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generatePdf = (element, filename) => {
    window.html2pdf().set({
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => setPrintData(null));
  };

  useEffect(() => {
    if (printData && printData.action === 'pdf') {
      setTimeout(() => {
        const element = document.getElementById('print-container');
        if (!window.html2pdf) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = () => generatePdf(element, `Nota_Entrega_${printData.numero_nota}.pdf`);
          document.body.appendChild(script);
        } else {
          generatePdf(element, `Nota_Entrega_${printData.numero_nota}.pdf`);
        }
      }, 500);
    }
  }, [printData]);

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notas_entrega')
        .select(`
          *,
          clientes ( nombre, empresa, direccion, telefono ),
          usuarios ( nombre )
        `)
        .order('id_nota', { ascending: false });
      
      if (error) throw error;
      setNotas(data || []);
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudieron cargar las notas de entrega', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const { data: cData } = await supabase.from('clientes').select('*');
      const { data: pData } = await supabase.from('proveedores').select('*').eq('estado', true);
      const { data: tData } = await supabase.from('transportistas').select('*');
      const { data: cotData } = await supabase.from('cotizaciones').select('*, clientes(nombre)').eq('estado', 'ACEPTADA');
      
      setClientes(cData || []);
      setProveedores(pData || []);
      setTransportistas(tData || []);
      setCotizaciones(cotData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const generateNotaNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000); // 5 digits
    return `${year}-${random}`;
  };

  const openPanel = () => {
    setSelectedCliente(null);
    setDetalles([]);
    setFormData({
      numero_nota: generateNotaNumber(),
      fecha: new Date().toISOString().split('T')[0],
      observaciones: '',
      id_cotizacion: '',
      tipo_cambio: tipoCambio
    });
    setClienteSearchTerm('');
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const agregarDetalle = () => {
    setDetalles([...detalles, {
      id_proveedor: '',
      numero_factura: '',
      valor_factura: '0',
      flete: '0',
      cantidad_bultos: '1',
      peso_kg: '0',
      total_liquidacion: 0,
      nombre_proveedor: ''
    }]);
  };

  const removerDetalle = (index) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const actualizarDetalle = (index, field, value) => {
    const newDetalles = [...detalles];
    
    if (field === 'id_proveedor' || field === 'numero_factura' || field === 'nombre_proveedor') {
      newDetalles[index][field] = value;
    } else {
      let val = String(value).replace(/[^0-9.,]/g, '');
      const match = val.match(/[.,]/g);
      if (match && match.length > 1) {
         const firstIndex = val.search(/[.,]/);
         val = val.substring(0, firstIndex + 1) + val.substring(firstIndex + 1).replace(/[.,]/g, '');
      }
      newDetalles[index][field] = val;
    }
    
    const parseNum = (str) => parseFloat((str || '0').toString().replace(',', '.')) || 0;

    const valor = parseNum(newDetalles[index].valor_factura);
    const flete = parseNum(newDetalles[index].flete);
    newDetalles[index].total_liquidacion = parseFloat((valor + flete).toFixed(2));
    
    setDetalles(newDetalles);
  };

  const calcularTotales = () => {
    let bultos = 0;
    let peso = 0;
    let totalUsd = 0;

    const parseNum = (str) => parseFloat((str || '0').toString().replace(',', '.')) || 0;

    detalles.forEach(d => {
      bultos += (parseInt(d.cantidad_bultos) || 0);
      peso += parseNum(d.peso_kg);
      totalUsd += parseNum(d.total_liquidacion);
    });

    const totalBs = parseFloat((totalUsd * formData.tipo_cambio).toFixed(2));

    return { bultos, peso, totalUsd, totalBs };
  };

  const handleSave = async () => {
    if (!selectedCliente) {
      if (addToast) addToast('Error', 'Debe seleccionar un cliente', 'error');
      return;
    }
    if (detalles.length === 0) {
      if (addToast) addToast('Error', 'Debe agregar al menos un detalle', 'error');
      return;
    }

    // Validar detalles
    const invalido = detalles.some(d => !d.id_proveedor || !d.numero_factura);
    if (invalido) {
      if (addToast) addToast('Error', 'Complete todos los campos obligatorios del detalle (Proveedor, Factura)', 'error');
      return;
    }

    try {
      const totales = calcularTotales();
      
      const { data: notaData, error: notaError } = await supabase
        .from('notas_entrega')
        .insert([{
          numero_nota: formData.numero_nota,
          id_cliente: selectedCliente.id_cliente,
          id_transportista: formData.id_transportista || null,
          fecha: formData.fecha,
          tipo_cambio: formData.tipo_cambio,
          total_bultos: totales.bultos,
          total_peso_kg: totales.peso,
          total_usd: totales.totalUsd,
          total_bs: totales.totalBs,
          observaciones: formData.observaciones,
          estado: 'EMITIDA',
          id_cotizacion: formData.id_cotizacion || null,
          id_usuario: userProfile?.id || null
        }])
        .select()
        .single();

      if (notaError) throw notaError;

      // 2. Insert Detalles
      const parseNumHelper = (val) => parseFloat(String(val || '0').replace(',', '.')) || 0;
      const detallesAInsertar = detalles.map(d => ({
        id_nota: notaData.id_nota,
        id_proveedor: d.id_proveedor,
        numero_factura: d.numero_factura || 'S/N',
        valor_factura: parseNumHelper(d.valor_factura),
        flete: parseNumHelper(d.flete),
        cantidad_bultos: parseInt(d.cantidad_bultos) || 0,
        peso_kg: parseNumHelper(d.peso_kg),
        total_liquidacion: parseNumHelper(d.total_liquidacion)
      }));

      const { error: detError } = await supabase
        .from('detalle_liquidacion_transporte')
        .insert(detallesAInsertar);

      if (detError) throw detError;

      if (addToast) addToast('Éxito', 'Nota de entrega generada correctamente', 'success');
      fetchNotas();
      closePanel();
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'Error al guardar la nota de entrega', 'error');
    }
  };

  const handleChangeEstado = async (id_nota, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from('notas_entrega')
        .update({ 
          estado: nuevoEstado,
          id_usuario: userProfile?.id || null
        })
        .eq('id_nota', id_nota);
      
      if (error) throw error;
      if (addToast) addToast('Éxito', `Estado actualizado a ${nuevoEstado}`, 'success');
      fetchNotas();

      if (nuevoEstado === 'EN CAMINO') {
        const notaActual = notas.find(n => n.id_nota === id_nota);
        const transportista = notaActual ? transportistas.find(t => t.id_transportista == notaActual.id_transportista) : null;
        if (notaActual && transportista && transportista.telefono) {
          const confirmar = window.confirm(`🚛 El pedido cambió a EN CAMINO.\n\n¿Deseas enviar AHORA por WhatsApp la información de la ubicación y mercancía al chofer (${transportista.nombre}) para que salga hacia el cliente?`);
          if (confirmar) {
            handleActionRequest(notaActual, 'whatsapp_chofer');
          }
        } else if (notaActual && (!transportista || !transportista.telefono)) {
          if (addToast) addToast('Atención', 'El pedido está EN CAMINO, pero no tiene un chofer con teléfono asignado para enviarle la ubicación.', 'warning');
        }
      }
    } catch (err) {
      if (addToast) addToast('Error', 'No se pudo actualizar el estado', 'error');
    }
  };

  const handleActionRequest = async (nota, action) => {
    if (action === 'whatsapp') {
      const emojiWave = '\u{1F44B}';
      const emojiDoc = '\u{1F4CB}';
      const emojiMoney = '\u{1F4B5}';
      const emojiSparkle = '\u{2728}';
      
      const nombreCliente = (nota.clientes?.nombre || 'Estimado cliente').trim();
      const numeroNota = (nota.numero_nota || '').trim();
      const totalBs = parseFloat(nota.total_bs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const msg = `Hola *${nombreCliente}* ${emojiWave}\n\n` +
        `Desde *IPCB IMPORT* te compartimos el detalle de tu pedido:\n\n` +
        `${emojiDoc} *Nota de Entrega N°:* ${numeroNota}\n` +
        `${emojiMoney} *Total a pagar:* BS ${totalBs}\n\n` +
        `Quedamos atentos para cualquier consulta o coordinación de entrega. ¡Muchas gracias por tu preferencia! ${emojiSparkle}`;
      
      let phone = (nota.clientes?.telefono || '').replace(/[^0-9]/g, '');
      window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, 'WhatsAppTab');
      return;
    }
    
    if (action === 'email') {
      const nombreCliente = (nota.clientes?.nombre || 'Estimado cliente').trim();
      const numeroNota = (nota.numero_nota || '').trim();
      const totalBs = parseFloat(nota.total_bs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const subject = `Nota de Entrega N° ${numeroNota} - IPCB IMPORT`;
      const body = `Hola ${nombreCliente},\n\nAdjunto enviamos su Nota de Entrega N° ${numeroNota} por un total de BS ${totalBs}.\n\nGracias por confiar en IPCB IMPORT.`;
      window.location.href = `mailto:${nota.clientes?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    if (action === 'whatsapp_chofer') {
      const transportista = transportistas.find(t => t.id_transportista == nota.id_transportista);
      if (!transportista || !transportista.telefono) {
        if (addToast) addToast('Atención', 'Esta nota no tiene un chofer con teléfono registrado asignado.', 'warning');
        return;
      }
      let phone = transportista.telefono.replace(/[^0-9]/g, '');
      
      try {
        const { data: detallesData } = await supabase
          .from('detalle_liquidacion_transporte')
          .select('*, proveedores ( nombre )')
          .eq('id_nota', nota.id_nota);

        const emojiTruck = '\u{1F69A}'; // 🚚
        const emojiClipboard = '\u{1F4CB}'; // 📋
        const emojiUser = '\u{1F464}'; // 👤
        const emojiPhone = '\u{1F4F1}'; // 📞
        const emojiHouse = '\u{1F3E0}'; // 🏠
        const emojiPin = '\u{1F4CD}'; // 📍
        const emojiBox = '\u{1F4E6}'; // 📦
        const emojiNote = '\u{1F4DD}'; // 📝
        const emojiZap = '\u{26A1}'; // ⚡
        const emojiLorry = '\u{1F69B}'; // 🚛

        let detallesTexto = '';
        if (detallesData && detallesData.length > 0) {
          detallesTexto = `\n${emojiBox} *Mercancía que trajeron para entregar:*\n` + detallesData.map(d => `• ${d.cantidad_bultos} bultos (${d.peso_kg} Kg) - Prov: ${d.proveedores?.nombre || 'General'} (Fact: ${d.numero_factura || 'S/N'})`).join('\n');
        } else {
          detallesTexto = `\n${emojiBox} *Mercancía que trajeron para entregar:*\n• ${nota.total_bultos} bultos | Peso total: ${nota.total_peso_kg} Kg`;
        }

        const direccionTexto = nota.clientes?.direccion || 'Sin dirección registrada';
        const dirParaMapa = nota.clientes?.direccion && !nota.clientes.direccion.toLowerCase().includes('sin dirección')
          ? nota.clientes.direccion.trim()
          : '';
        const queryMap = encodeURIComponent(`${dirParaMapa ? dirParaMapa + ' ' : ''}Santa Cruz de la Sierra Bolivia`);
        let gpsLink = `${emojiPin} *Ubicación GPS (Google Maps):*\nhttps://www.google.com/maps/search/?api=1&query=${queryMap}\n`;

        const msg = `${emojiTruck} *ORDEN DE DESPACHO Y ENTREGA - IPCB IMPORT* ${emojiTruck}\n\n` +
          `Hola *${transportista.nombre}*, por favor dirígete a entregar la mercancía al siguiente cliente:\n\n` +
          `${emojiClipboard} *Nota de Entrega N°:* ${nota.numero_nota}\n` +
          `${emojiUser} *Cliente Destino:* ${nota.clientes?.nombre || 'Desconocido'} ${nota.clientes?.empresa ? `(${nota.clientes.empresa})` : ''}\n` +
          `${emojiPhone} *Teléfono Cliente:* ${nota.clientes?.telefono || 'Sin teléfono registrado'}\n` +
          `${emojiHouse} *Dirección de Entrega:* ${direccionTexto}\n` +
          `${gpsLink}` +
          `${detallesTexto}\n` +
          `${nota.observaciones ? `\n${emojiNote} *Observaciones:* ${nota.observaciones}\n` : ''}` +
          `\n${emojiZap} *Instrucción:* Sal hacia la ubicación del cliente para entregarle su mercancía y contáctale al llegar. ¡Gracias y buen viaje! ${emojiLorry}`;

        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, 'WhatsAppTab');
      } catch (err) {
        console.error(err);
        if (addToast) addToast('Error', 'No se pudieron procesar los datos para el chofer', 'error');
      }
      return;
    }

    try {
      const { data: detallesData, error } = await supabase
        .from('detalle_liquidacion_transporte')
        .select(`
          *,
          proveedores ( nombre )
        `)
        .eq('id_nota', nota.id_nota);
        
      if (error) throw error;
      
      const transportista = transportistas.find(t => t.id_transportista == nota.id_transportista);
      setPrintData({
        ...nota,
        transportista,
        detalles: detallesData || [],
        action: 'pdf'
      });
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudieron cargar los detalles para el PDF', 'error');
    }
  };

  const filteredNotas = notas.filter(n => 
    n.clientes?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    n.numero_nota?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase()))
  ).slice(0, 5);

  const totalesForm = calcularTotales();

  return (
    <>
      {!printData && (
        <div className="content-area no-print">
        <div className="clients-section">
          <h1 className="page-title">Liquidaciones / Notas de Entrega</h1>
          
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', padding: '16px', borderRadius: '12px', marginBottom: '20px', color: '#9A3412' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold' }}>🚚 Módulo de Entregas Nacionales</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>Crea una nota cuando el contenedor llegó a tu almacén y vayas a despachar a los clientes. Cambia el estado a <strong>EN CAMINO</strong> cuando el camión salga, y a <strong>ENTREGADA</strong> cuando el cliente reciba.</p>
          </div>
          
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} color="#9CA3AF" />
              <input 
                type="text" 
                placeholder="Buscar por cliente o Nro de Nota..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => openPanel()}>
              <Plus size={18} /> NUEVA NOTA DE ENTREGA
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>NRO. NOTA</th>
                  <th>CLIENTE</th>
                  <th>FECHA</th>
                  <th>BULTOS / PESO</th>
                  <th>TOTAL (Bs.)</th>
                  <th>ESTADO</th>
                  <th>CHOFER / LOGÍSTICA</th>
                  <th>OPERADOR</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
                ) : filteredNotas.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No hay notas de entrega registradas.</td></tr>
                ) : (
                  filteredNotas.map((nota) => {
                    const transportista = transportistas.find(t => t.id_transportista == nota.id_transportista);
                    return (
                      <tr key={nota.id_nota}>
                        <td style={{ fontWeight: '600' }}>{nota.numero_nota}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} color="#6B7280" /> {nota.clientes?.nombre || 'Desconocido'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color="#6B7280" /> {nota.fecha}
                          </div>
                        </td>
                        <td>{nota.total_bultos} Bultos | {nota.total_peso_kg} Kg</td>
                        <td style={{ fontWeight: '700', color: '#134B82' }}>
                          Bs. {parseFloat(nota.total_bs).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <select 
                            value={nota.estado}
                            onChange={(e) => handleChangeEstado(nota.id_nota, e.target.value)}
                            style={{ 
                              padding: '4px 8px', 
                              background: nota.estado === 'ENTREGADA' ? '#D1FAE5' : (nota.estado === 'CANCELADA' ? '#FEE2E2' : '#FEF3C7'), 
                              color: nota.estado === 'ENTREGADA' ? '#065F46' : (nota.estado === 'CANCELADA' ? '#991B1B' : '#92400E'), 
                              border: 'none',
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="EMITIDA">EMITIDA</option>
                            <option value="EN CAMINO">EN CAMINO</option>
                            <option value="ENTREGADA">ENTREGADA</option>
                            <option value="CANCELADA">CANCELADA</option>
                          </select>
                        </td>
                        <td style={{ fontSize: '12px', color: '#334155', textAlign: 'left' }}>
                          {transportista ? (
                            <div>
                              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', color: '#0369A1' }}>
                                <Truck size={14} /> {transportista.nombre}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                {transportista.placa_vehiculo || 'S/P'} | {transportista.telefono || 'Sin telf.'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '11px' }}>Sin chofer asignado</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#6B7280' }}>
                          {nota.usuarios?.nombre || 'S/N'}
                        </td>
                        <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn-action" style={{ background: '#FEE2E2', color: '#B91C1C' }} onClick={() => handleActionRequest(nota, 'pdf')} title="Descargar PDF">
                            <FileText size={12} /> PDF
                          </button>
                          <button className="btn-action" style={{ background: '#D1FAE5', color: '#047857' }} onClick={() => handleActionRequest(nota, 'whatsapp')} title="Enviar por WhatsApp al Cliente">
                            <Phone size={12} /> WA
                          </button>
                          <button className="btn-action" style={{ background: '#E0F2FE', color: '#0369A1' }} onClick={() => handleActionRequest(nota, 'email')} title="Enviar por Correo al Cliente">
                            <Mail size={12} />
                          </button>
                          <button 
                            className="btn-action" 
                            style={{ 
                              background: transportista && transportista.telefono ? '#FEF3C7' : '#F3F4F6', 
                              color: transportista && transportista.telefono ? '#D97706' : '#9CA3AF',
                              cursor: transportista && transportista.telefono ? 'pointer' : 'not-allowed',
                              fontWeight: 'bold',
                              border: transportista && transportista.telefono ? '1px solid #F59E0B' : '1px solid #E5E7EB'
                            }} 
                            onClick={() => handleActionRequest(nota, 'whatsapp_chofer')} 
                            title="Enviar ubicación y mercancía al Chofer para entrega (WhatsApp)"
                          >
                            <Truck size={12} /> WA CHOFER
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isPanelOpen && (
          <div className="action-panel" style={{ width: '800px', maxWidth: '95vw' }}>
            <div className="panel-header">
              <span>Nueva Nota de Entrega / Liquidación</span>
              <button className="panel-close" onClick={closePanel}>
                <X size={18} />
              </button>
            </div>
            
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ padding: '12px', background: '#EFF6FF', border: '1px dashed #60A5FA', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#1E3A8A', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                  <span style={{ marginRight: '6px', color: '#F59E0B' }}>⚡</span> Acción Rápida: Levantar pedido de Cotización
                </div>
                <select 
                  value={formData.id_cotizacion || ''}
                  onChange={async (e) => {
                    const id_cot = e.target.value;
                    setFormData({...formData, id_cotizacion: id_cot});
                    if (id_cot) {
                      const cot = cotizaciones.find(c => c.id_cotizacion == id_cot);
                      if (cot && cot.id_cliente) {
                        const cliente = clientes.find(c => c.id_cliente == cot.id_cliente);
                        if (cliente) {
                          setSelectedCliente(cliente);
                        }
                        
                        // Fetch pieces in this quote
                        const { data: quoteDetails } = await supabase
                          .from('detalle_cotizacion')
                          .select('id_pieza')
                          .eq('id_cotizacion', id_cot);
                          
                        const quotePieceIds = quoteDetails ? quoteDetails.map(qd => qd.id_pieza) : [];
                        
                        let contDetalles = [];
                        if (quotePieceIds.length > 0) {
                          const { data: result } = await supabase
                            .from('contenedor_detalles')
                            .select('*, proveedores(nombre)')
                            .eq('id_cliente', cot.id_cliente)
                            .in('id_pieza', quotePieceIds)
                            .order('created_at', { ascending: false });
                            
                          if (result && result.length > 0) {
                            // Keep only the most recent container detail per piece to avoid pulling historical providers
                            const latestPieces = {};
                            result.forEach(r => {
                              if (!latestPieces[r.id_pieza]) {
                                latestPieces[r.id_pieza] = r;
                              }
                            });
                            contDetalles = Object.values(latestPieces);
                          }
                        }
                          
                        if (contDetalles.length > 0) {
                          const grouped = {};
                          contDetalles.forEach(cd => {
                            if (!grouped[cd.id_proveedor]) {
                              grouped[cd.id_proveedor] = {
                                id_proveedor: cd.id_proveedor,
                                nombre_proveedor: cd.proveedores?.nombre || '',
                                numero_factura: cd.numero_factura || '',
                                valor_factura: 0,
                                flete: 0,
                                cantidad_bultos: 1,
                                peso_kg: 0,
                                total_liquidacion: 0
                              };
                            } else {
                              if (cd.numero_factura && !grouped[cd.id_proveedor].numero_factura.includes(cd.numero_factura)) {
                                grouped[cd.id_proveedor].numero_factura += grouped[cd.id_proveedor].numero_factura ? `, ${cd.numero_factura}` : cd.numero_factura;
                              }
                            }
                            grouped[cd.id_proveedor].valor_factura += (parseFloat(cd.costo_compra) * parseInt(cd.cantidad));
                          });
                          
                          // Convert to array and update total liquidacion
                          const newDetalles = Object.values(grouped).map(d => ({
                            ...d,
                            total_liquidacion: d.valor_factura + d.flete
                          }));
                          setDetalles(newDetalles);
                        }
                      }
                    } else {
                      setDetalles([]);
                    }
                  }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="">-- Selecciona una Cotización Aceptada --</option>
                  {cotizaciones.map(c => (
                    <option key={c.id_cotizacion} value={c.id_cotizacion}>
                      {c.numero_cotizacion || `COT-${c.id_cotizacion}`} | Cliente: {c.clientes?.nombre || 'Desconocido'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                {/* Cliente Select */}
                <div className="detail-group" ref={clienteSearchRef} style={{ flex: 2, margin: 0 }}>
                  <div className="detail-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cliente Destino *</span>
                    {selectedCliente && (
                      <button onClick={() => { setSelectedCliente(null); setClienteSearchTerm(''); }} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>CAMBIAR CLIENTE</button>
                    )}
                  </div>
                  {!selectedCliente ? (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Buscar por nombre o empresa..."
                        value={clienteSearchTerm}
                        onChange={(e) => { setClienteSearchTerm(e.target.value); setShowClienteSearch(true); }}
                        onFocus={() => setShowClienteSearch(true)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #3B82F6', borderRadius: '4px', background: '#EFF6FF', outline: 'none' }}
                      />
                      {showClienteSearch && (
                        <div className="autocomplete-dropdown">
                          {clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase())).slice(0, 5).map(c => (
                            <div key={c.id_cliente} className="autocomplete-item" onClick={() => { setSelectedCliente(c); setShowClienteSearch(false); }}>
                              <strong>{c.nombre}</strong> {c.empresa && <span style={{ fontSize: '11px', color: '#6B7280' }}>({c.empresa})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontWeight: 'bold', color: '#166534', fontSize: '14px' }}>{selectedCliente.nombre}</div>
                      <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px' }}>{selectedCliente.empresa || 'Cliente Final'} | {selectedCliente.telefono || 'Sin teléfono'}</div>
                    </div>
                  )}
                </div>

                <div className="detail-group" ref={transpSearchRef} style={{ flex: 1, margin: 0 }}>
                  <div className="detail-label">Transportista (Chofer)</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Buscar chofer/placa..."
                      value={transpSearchTerm}
                      onChange={(e) => { 
                        setTranspSearchTerm(e.target.value); 
                        setShowTranspSearch(true); 
                        if(formData.id_transportista) setFormData({...formData, id_transportista: ''});
                      }}
                      onFocus={() => setShowTranspSearch(true)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '4px', outline: 'none' }}
                    />
                    {showTranspSearch && (
                      <div className="autocomplete-dropdown" style={{ background: '#FFF', position: 'absolute', top: '100%', zIndex: 50, width: '100%', border: '1px solid #E5E7EB', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        {transportistas.filter(t => t.nombre.toLowerCase().includes(transpSearchTerm.toLowerCase()) || (t.placa_vehiculo||'').toLowerCase().includes(transpSearchTerm.toLowerCase())).map(t => (
                          <div key={t.id_transportista} className="autocomplete-item" style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }} onClick={() => { 
                            setFormData({...formData, id_transportista: t.id_transportista});
                            setTranspSearchTerm(`${t.nombre} - ${t.placa_vehiculo || 'S/P'}`);
                            setShowTranspSearch(false);
                          }}>
                            <strong>{t.nombre}</strong> <span style={{ fontSize: '11px', color: '#6B7280' }}>{t.placa_vehiculo || 'Sin placa'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-group" style={{ flex: 1, margin: 0 }}>
                  <div className="detail-label">Nro. Nota</div>
                  <input type="text" value={formData.numero_nota} onChange={e => setFormData({...formData, numero_nota: e.target.value})} style={{ width: '100%', padding: '8px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '4px', fontWeight: 'bold' }} />
                </div>
              </div>

              {/* Detalles Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="section-title" style={{ margin: 0 }}>Liquidación de Transporte</div>
                <button onClick={agregarDetalle} style={{ background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Añadir Fila
                </button>
              </div>
              
              <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '4px', marginBottom: '16px' }}>
                <table style={{ width: '100%', minWidth: '700px' }}>
                  <thead style={{ background: '#F9FAFB' }}>
                    <tr>
                      <th colSpan="8" style={{ padding: '8px', fontSize: '12px', background: '#FFFBEB', color: '#B45309', borderBottom: '1px solid #FDE68A', textAlign: 'center', fontWeight: '600' }}>
                        Nota: Para decimales, utiliza siempre el punto ( Ej: 10.50 )
                      </th>
                    </tr>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>PROVEEDOR (BÚSQUEDA)</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Nº FACTURA</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #E5E7EB' }}>VALOR FACT.</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #E5E7EB' }}>FLETE</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>BULTOS</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #E5E7EB' }}>PESO KG</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #E5E7EB' }}>TOTAL LIQ. ($)</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'center', borderBottom: '1px solid #E5E7EB', width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6' }} ref={activeProveedorRow === i ? proveedorSearchRef : null}>
                          <div className="autocomplete-container">
                            <input 
                              type="text" 
                              placeholder="Buscar proveedor..." 
                              value={d.nombre_proveedor || ''}
                              onChange={e => {
                                const val = e.target.value;
                                actualizarDetalle(i, 'nombre_proveedor', val);
                                const prov = proveedores.find(p => p.nombre.toLowerCase() === val.toLowerCase());
                                actualizarDetalle(i, 'id_proveedor', prov ? prov.id_proveedor : '');
                              }}
                              onFocus={() => setActiveProveedorRow(i)}
                              style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                            />
                            {activeProveedorRow === i && (
                              <div className="autocomplete-dropdown" style={{ top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                                {proveedores.filter(p => p.nombre.toLowerCase().includes((d.nombre_proveedor || '').toLowerCase())).slice(0,50).map(p => (
                                  <div key={p.id_proveedor} className="autocomplete-item" onClick={() => { 
                                      actualizarDetalle(i, 'nombre_proveedor', p.nombre);
                                      actualizarDetalle(i, 'id_proveedor', p.id_proveedor);
                                      setActiveProveedorRow(null); 
                                  }}>
                                    <span className="autocomplete-item-title">{p.nombre}</span>
                                  </div>
                                ))}
                                {proveedores.filter(p => p.nombre.toLowerCase().includes((d.nombre_proveedor || '').toLowerCase())).length === 0 && (
                                  <div style={{ padding: '10px', fontSize: '12px', color: '#6B7280' }}>
                                    Usar nombre personalizado: "{d.nombre_proveedor}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6' }}>
                          <input type="text" value={d.numero_factura} onChange={(e) => actualizarDetalle(i, 'numero_factura', e.target.value)} style={{ width: '80px', padding: '4px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>
                          <input type="text" value={d.valor_factura} onChange={(e) => actualizarDetalle(i, 'valor_factura', e.target.value)} style={{ width: '80px', padding: '4px', textAlign: 'right', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>
                          <input type="text" value={d.flete} onChange={(e) => actualizarDetalle(i, 'flete', e.target.value)} style={{ width: '60px', padding: '4px', textAlign: 'right', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>
                          <input type="text" value={d.cantidad_bultos} onChange={(e) => actualizarDetalle(i, 'cantidad_bultos', e.target.value)} style={{ width: '50px', padding: '4px', textAlign: 'center', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>
                          <input type="text" value={d.peso_kg} onChange={(e) => actualizarDetalle(i, 'peso_kg', e.target.value)} style={{ width: '60px', padding: '4px', textAlign: 'right', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid #F3F4F6', textAlign: 'right', color: '#134B82' }}>
                          {d.total_liquidacion.toFixed(2)}
                        </td>
                        <td style={{ padding: '4px 8px', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>
                          <button onClick={() => removerDetalle(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    ))}
                    {detalles.length === 0 && (
                      <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>Agregue facturas de proveedores</td></tr>
                    )}
                  </tbody>
                  <tfoot style={{ background: '#F9FAFB', fontWeight: 'bold' }}>
                    <tr>
                      <td colSpan="4" style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>TOTALES:</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{totalesForm.bultos}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{totalesForm.peso.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px', color: '#134B82' }}>$ {totalesForm.totalUsd.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Totales y T/C */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px', marginBottom: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>T/C:</span>
                  <input type="number" step="0.01" value={formData.tipo_cambio} onChange={e => setFormData({...formData, tipo_cambio: parseFloat(e.target.value)||0})} style={{ width: '60px', padding: '4px', textAlign: 'right', border: '1px solid #D1D5DB', borderRadius: '4px', fontWeight: 'bold' }} />
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>
                  BS. {totalesForm.totalBs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="detail-group">
                <div className="detail-label">Observaciones Adicionales</div>
                <div className="detail-value">
                  <textarea 
                    value={formData.observaciones} 
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    style={{ width: '100%', minHeight: '40px', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                    placeholder="Notas..."
                  />
                </div>
              </div>

              <div className="panel-actions">
                <button className="btn-save" onClick={handleSave}>GENERAR NOTA DE ENTREGA</button>
                <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* VISTA PARA IMPRESIÓN (PDF) */}
      {printData && printData.action === 'pdf' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', paddingTop: '20px' }}>
          <div style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold', color: '#FFF' }}>
            Generando PDF Corporativo... Por favor espere.
          </div>
          
          <div id="print-container" style={{ 
            position: 'relative',
            fontFamily: 'Calibri, Arial, sans-serif', 
            width: '215.9mm',
            minHeight: '279.4mm',
            padding: '10mm 15mm', 
            boxSizing: 'border-box',
            backgroundColor: '#FFF',
            color: '#000',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
          {/* Watermark */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, pointerEvents: 'none', zIndex: 0 }}>
            <img src={logoImg} alt="Watermark" style={{ width: '600px' }} />
          </div>

          <style>
            {`
              @media print {
                @page { size: letter; margin: 0; }
                body { margin: 0; padding: 0; }
                .print-only { padding: 15mm 15mm !important; }
              }
              .print-only table td, .print-only table th {
                color: #000 !important;
              }
              .print-only .tc-table td, .print-only .tc-table tr {
                border: none !important;
              }
            `}
          </style>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
            <div style={{ width: '320px', color: '#000' }}>
              <img src={logoImg} alt="IPCB Logo" style={{ width: '250px', marginBottom: '10px' }} />
              <div style={{ marginTop: '12px', fontSize: '10px', lineHeight: '1.5', paddingLeft: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <MapPin size={12} style={{ marginTop: '2px', marginRight: '5px', flexShrink: 0 }}/>
                  <div>
                    <strong>Dirección:</strong> Barrio Minero Calle 16 de julio Nº 7170<br/>
                    Zona Plan 3000
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <Phone size={12} style={{ marginRight: '5px', flexShrink: 0 }}/>
                  <div><strong>Cel.:</strong> 687-27310</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <Mail size={12} style={{ marginRight: '5px', color: '#DC2626', flexShrink: 0 }}/>
                  <div><strong>Correo:</strong> <span style={{ color: '#2563EB', textDecoration: 'underline' }}>jbanegas.ipcb@outlook.com</span></div>
                </div>
                <div style={{ marginTop: '2px' }}>Santa Cruz - Bolivia</div>
              </div>
            </div>
            
            <div style={{ width: '320px', paddingTop: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', marginBottom: '20px', color: '#000', fontWeight: 'bold' }}>Santa Cruz {new Date(printData.fecha).toLocaleDateString('es-BO')}</div>
                <h2 style={{ fontSize: '20px', color: '#D9A01B', margin: '0 0 5px 0', fontWeight: 'bold' }}>NOTA DE ENTREGA</h2>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#D9A01B' }}>Nº {printData.numero_nota}</div>
              </div>

              {/* Client Info */}
              <div style={{ display: 'flex', width: '195px', marginLeft: 'auto', marginTop: '25px', fontSize: '11px', lineHeight: '1.6', textAlign: 'left' }}>
                <div style={{ width: '80px', fontWeight: 'bold' }}>
                  Nombre:<br/>
                  Empresa:<br/>
                  Dirección:<br/>
                  Celular:<br/>
                  Chofer/Transp:
                </div>
                <div style={{ flex: 1, fontStyle: 'italic' }}>
                  {printData.clientes?.nombre?.toUpperCase()}<br/>
                  {printData.clientes?.empresa || '-'}<br/>
                  {printData.clientes?.direccion || 'SANTA CRUZ'}<br/>
                  {printData.clientes?.telefono || '-'}<br/>
                  {printData.transportista ? `${printData.transportista.nombre?.toUpperCase()} (${printData.transportista.placa_vehiculo || 'S/P'})` : '-'}
                </div>
              </div>
            </div>
          </div>

          <h3 style={{ textAlign: 'center', fontSize: '16px', margin: '25px 0 10px 0', fontWeight: '900', color: '#000' }}>LIQUIDACIÓN DE TRANSPORTE PANAMA - BOLIVIA</h3>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>PROVEEDOR</th>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>Nº DE<br/>FACTURA</th>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>VALOR<br/>FACTURA</th>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>FLETE</th>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>CANTIDAD<br/>DE BULTOS</th>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>PESO EN KG.</th>
                <th style={{ border: '2px solid #000', padding: '8px 4px', textAlign: 'center' }}>TOTAL<br/>LIQUIDACION</th>
              </tr>
            </thead>
            <tbody>
              {printData.detalles?.map((d, i) => {
                const isLastDataRow = (i === (printData.detalles?.length || 0) - 1) && (printData.detalles?.length || 0) >= 8;
                return (
                  <tr key={i}>
                    <td style={{ border: '1px solid #000', borderLeft: '2px solid #000', borderRight: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{d.proveedores?.nombre?.toUpperCase()}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{d.numero_factura}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{parseFloat(d.valor_factura || 0).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{parseFloat(d.flete || 0).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{d.cantidad_bultos}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{parseFloat(d.peso_kg || 0).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', borderRight: '2px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>$b</span>
                      <span>{parseFloat(d.total_liquidacion || 0).toFixed(2)}</span>
                    </td>
                  </tr>
                );
              })}
              {/* Filas vacías para rellenar (como en el excel) */}
              {Array.from({ length: Math.max(0, 8 - (printData.detalles?.length || 0)) }).map((_, i, arr) => (
                <tr key={`empty-${i}`}>
                  <td style={{ border: '1px solid #000', borderLeft: '2px solid #000', borderRight: '1px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000', height: '22px' }}></td>
                  <td style={{ border: '1px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', borderRight: '2px solid #000', borderBottom: i === arr.length - 1 ? '2px solid #000' : '1px solid #000' }}></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" style={{ border: 'none' }}></td>
                <td colSpan="2" style={{ border: '2px solid #000', borderTop: 'none', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>TOTALES</td>
                <td style={{ border: '2px solid #000', borderTop: 'none', padding: '6px', fontWeight: 'bold', fontSize: '13px' }}>{printData.total_bultos}</td>
                <td style={{ border: '2px solid #000', borderTop: 'none', padding: '6px', fontWeight: 'bold', fontSize: '13px' }}>{parseFloat(printData.total_peso_kg).toFixed(2)}</td>
                <td style={{ border: '2px solid #000', borderTop: 'none', padding: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>$b</span>
                  <span>{parseFloat(printData.total_usd).toFixed(2)}</span>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Conversion */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', marginRight: '10px' }}>
            <table className="tc-table" style={{ width: '220px', fontSize: '13px', fontWeight: 'bold', border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'right', paddingRight: '25px', paddingBottom: '4px' }}>T/C</td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{parseFloat(printData.tipo_cambio).toFixed(2).replace('.', ',')}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'right', paddingRight: '25px', color: '#00B050' }}>BS.</td>
                  <td style={{ textAlign: 'right', color: '#00B050', fontSize: '15px' }}>{parseFloat(printData.total_bs).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Firmas */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', padding: '0 30px', fontSize: '11px', textAlign: 'center' }}>
            <div style={{ width: '220px' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '5px' }}>ENTREGUE CONFORME</div>
            </div>
            <div style={{ width: '280px', textAlign: 'left' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '5px', textAlign: 'center', marginBottom: '15px' }}>RECIBI CONFORME</div>
              <div style={{ marginBottom: '15px' }}>Nombre: ........................................................................................</div>
              <div>C.I.:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;........................................................................................</div>
            </div>
          </div>

          {/* Footer Note and QR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', padding: '0 40px' }}>
            <div style={{ width: '80px', position: 'relative', zIndex: 1 }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`IPCB IMPORT - Nota N° ${printData.numero_nota} - Válido`)}`} 
                alt="QR Code" 
                style={{ width: '80px', height: '80px' }} 
              />
            </div>
            <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', lineHeight: '1.5', flex: 1, position: 'relative', zIndex: 1 }}>
              "Gracias por su pedido. La entrega se<br/>
              considera finalizada al recibirla. No se<br/>
              aceptan reclamos por errores o faltas<br/>
              después de la entrega."
            </div>
            <div style={{ width: '80px' }}></div>
          </div>
        </div>
        </div>
      )}
    </>
  );
}
