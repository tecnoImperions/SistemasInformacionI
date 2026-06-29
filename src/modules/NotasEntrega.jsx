import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Search, Plus, X, Printer, FileText, Trash2, User, Calendar, Truck, MapPin, Phone, Mail } from 'lucide-react';

export default function NotasEntrega({ addToast }) {
  const { tipoCambio } = useStore();
  const [notas, setNotas] = useState([]);
  const [search, setSearch] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Print state
  const [printData, setPrintData] = useState(null);

  // Master-Detail Form State
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  const [formData, setFormData] = useState({
    numero_nota: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: '',
    tipo_cambio: tipoCambio // Use global store exchange rate
  });
  
  const [detalles, setDetalles] = useState([]); 

  // Autocomplete states
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const clienteSearchRef = useRef(null);
  const [activeProveedorRow, setActiveProveedorRow] = useState(null);
  const proveedorSearchRef = useRef(null);

  useEffect(() => {
    fetchNotas();
    fetchDependencies();

    function handleClickOutside(event) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(event.target)) {
        setShowClienteSearch(false);
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
      html2canvas: { scale: 2, useCORS: true },
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
          clientes ( nombre, empresa, direccion, telefono )
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
      const { data: cData } = await supabase.from('clientes').select('*').eq('estado', true);
      const { data: pData } = await supabase.from('proveedores').select('*').eq('estado', true);
      
      setClientes(cData || []);
      setProveedores(pData || []);
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
          fecha: formData.fecha,
          tipo_cambio: formData.tipo_cambio,
          total_bultos: totales.bultos,
          total_peso_kg: totales.peso,
          total_usd: totales.totalUsd,
          total_bs: totales.totalBs,
          observaciones: formData.observaciones,
          estado: 'EMITIDA',
          usuario_id: userProfile?.id || null
        }])
        .select()
        .single();

      if (notaError) throw notaError;

      // 2. Insert Detalles
      const detallesAInsertar = detalles.map(d => ({
        id_nota: notaData.id_nota,
        id_proveedor: d.id_proveedor,
        numero_factura: d.numero_factura,
        valor_factura: d.valor_factura,
        flete: d.flete,
        cantidad_bultos: d.cantidad_bultos,
        peso_kg: d.peso_kg,
        total_liquidacion: d.total_liquidacion
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

  const handleActionRequest = async (nota, action) => {
    if (action === 'whatsapp') {
      const msg = `Hola ${nota.clientes?.nombre || ''}, te enviamos tu Nota de Entrega N° ${nota.numero_nota} por un total de BS ${parseFloat(nota.total_bs).toLocaleString('es-BO', { minimumFractionDigits: 2 })}.`;
      let phone = nota.clientes?.telefono || '';
      phone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    
    if (action === 'email') {
      const subject = `Nota de Entrega N° ${nota.numero_nota} - IPCB IMPORT`;
      const body = `Hola ${nota.clientes?.nombre || ''},\n\nAdjunto enviamos su Nota de Entrega N° ${nota.numero_nota} por un total de BS ${parseFloat(nota.total_bs).toLocaleString('es-BO', { minimumFractionDigits: 2 })}.\n\nGracias por confiar en IPCB IMPORT.`;
      window.location.href = `mailto:${nota.clientes?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
      
      setPrintData({
        ...nota,
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
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
                ) : filteredNotas.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No hay notas de entrega registradas.</td></tr>
                ) : (
                  filteredNotas.map((nota) => (
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
                        <span style={{ padding: '4px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {nota.estado}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-action" style={{ background: '#FEE2E2', color: '#B91C1C' }} onClick={() => handleActionRequest(nota, 'pdf')} title="Descargar PDF">
                          <FileText size={12} /> PDF
                        </button>
                        <button className="btn-action" style={{ background: '#D1FAE5', color: '#047857' }} onClick={() => handleActionRequest(nota, 'whatsapp')} title="Enviar por WhatsApp">
                          <Phone size={12} /> WA
                        </button>
                        <button className="btn-action" style={{ background: '#E0F2FE', color: '#0369A1' }} onClick={() => handleActionRequest(nota, 'email')} title="Enviar por Correo">
                          <Mail size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
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
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                {/* Cliente Select */}
                <div className="detail-group" ref={clienteSearchRef} style={{ flex: 2, margin: 0 }}>
                  <div className="detail-label">Cliente *</div>
                  {selectedCliente ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{selectedCliente.nombre}</div>
                      <button onClick={() => setSelectedCliente(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><X size={14}/></button>
                    </div>
                  ) : (
                    <div className="autocomplete-container">
                      <input 
                        type="text" 
                        placeholder="Buscar cliente..." 
                        value={clienteSearchTerm}
                        onChange={(e) => { setClienteSearchTerm(e.target.value); setShowClienteSearch(true); }}
                        onFocus={() => setShowClienteSearch(true)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px' }}
                      />
                      {showClienteSearch && (
                        <div className="autocomplete-dropdown">
                          {filteredClientes.map(c => (
                            <div key={c.id_cliente} className="autocomplete-item" onClick={() => { setSelectedCliente(c); setShowClienteSearch(false); }}>
                              <span className="autocomplete-item-title">{c.nombre}</span>
                              <span className="autocomplete-item-subtitle">{c.email || c.telefono || 'Sin datos'}</span>
                            </div>
                          ))}
                          {filteredClientes.length === 0 && <div style={{ padding: '10px', fontSize: '12px', color: '#6B7280' }}>No se encontraron clientes</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="detail-group" style={{ flex: 1, margin: 0 }}>
                  <div className="detail-label">Nro de Nota</div>
                  <input type="text" value={formData.numero_nota} onChange={e => setFormData({...formData, numero_nota: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }} />
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
                              <div className="autocomplete-dropdown" style={{ top: '100%', left: 0, right: 0, zIndex: 10 }}>
                                {proveedores.filter(p => p.nombre.toLowerCase().includes((d.nombre_proveedor || '').toLowerCase())).slice(0,5).map(p => (
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
            <img src="/logo.png" alt="Watermark" style={{ width: '600px' }} />
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
              <img src="/logo.png" alt="IPCB Logo" style={{ width: '250px', marginBottom: '10px' }} />
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
                <div style={{ width: '70px', fontWeight: 'bold' }}>
                  Nombre:<br/>
                  Empresa:<br/>
                  Dirección:<br/>
                  Celular:
                </div>
                <div style={{ flex: 1, fontStyle: 'italic' }}>
                  {printData.clientes?.nombre?.toUpperCase()}<br/>
                  {printData.clientes?.empresa || '-'}<br/>
                  {printData.clientes?.direccion || 'SANTA CRUZ'}<br/>
                  {printData.clientes?.telefono || '-'}
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
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{parseFloat(d.valor_factura || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{parseFloat(d.flete || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{d.cantidad_bultos}</td>
                    <td style={{ border: '1px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px' }}>{parseFloat(d.peso_kg || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                    <td style={{ border: '1px solid #000', borderRight: '2px solid #000', borderBottom: isLastDataRow ? '2px solid #000' : '1px solid #000', padding: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>$b</span>
                      <span>{parseFloat(d.total_liquidacion || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
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
                <td style={{ border: '2px solid #000', borderTop: 'none', padding: '6px', fontWeight: 'bold', fontSize: '13px' }}>{parseFloat(printData.total_peso_kg).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                <td style={{ border: '2px solid #000', borderTop: 'none', padding: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>$b</span>
                  <span>{parseFloat(printData.total_usd).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
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
                  <td style={{ textAlign: 'right', color: '#00B050', fontSize: '15px' }}>{parseFloat(printData.total_bs).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
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
