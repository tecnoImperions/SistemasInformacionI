import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { Search, Plus, Edit2, X, Package, MapPin, DollarSign, Calendar, Navigation, Ship, Truck, CheckCircle, Home, Anchor, Map, Trash2, Save, Clock, Printer } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase';

export default function Contenedores({ addToast, userProfile }) {
  const [contenedores, setContenedores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedContenedor, setSelectedContenedor] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('INFO'); // INFO, CARGA, RUTA, FINANZAS
  
  // Data for selects
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [piezas, setPiezas] = useState([]);

  // Sub-data for selected contenedor
  const [carga, setCarga] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [cotizacionesAprobadas, setCotizacionesAprobadas] = useState([]);
  const [quoteItems, setQuoteItems] = useState([]); // Items from selected quote

  // Forms
  const [formData, setFormData] = useState({
    codigo_serial: '',
    fecha_llegada: '',
    estado_distribucion: 'En Tránsito',
    puerto_origen: '',
    puerto_destino: '',
    linea_naviera: '',
    costo_flete_total: 0
  });

  const [formCarga, setFormCarga] = useState({
    id_pieza: '', id_cliente: '', id_proveedor: '', cantidad: 1, costo_compra: 0, precio_venta: 0, numero_factura: ''
  });

  const [formRuta, setFormRuta] = useState({
    ubicacion_actual: '', fecha_llegada: '', estado: 'EN_TRANSITO', observaciones: ''
  });

  // Search states for Carga
  const [piezaSearch, setPiezaSearch] = useState('');
  const [showPiezaSearch, setShowPiezaSearch] = useState(false);
  const [provSearch, setProvSearch] = useState('');
  const [showProvSearch, setShowProvSearch] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteSearch, setShowClienteSearch] = useState(false);

  // Derived filtered lists
  const filteredPiezas = piezas.filter(p => p.nombre.toLowerCase().includes(piezaSearch.toLowerCase()) || (p.codigo_pieza || '').toLowerCase().includes(piezaSearch.toLowerCase()));
  const filteredProv = proveedores.filter(p => p.nombre.toLowerCase().includes(provSearch.toLowerCase()));
  const filteredClientes = clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()));

  const ESTADOS_DISPONIBLES = ['En Origen', 'En Tránsito', 'En Aduana', 'Recibido', 'En Almacén'];

  useEffect(() => {
    fetchContenedores();
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    const [resCli, resProv, resPiezas, resCot] = await Promise.all([
      supabase.from('clientes').select('id_cliente, nombre, empresa').eq('estado', true),
      supabase.from('proveedores').select('id_proveedor, nombre, pais').eq('estado', true),
      supabase.from('catalogo_piezas').select('id_pieza, nombre, marca').eq('disponible', true),
      supabase.from('cotizaciones').select('id_cotizacion, clientes(id_cliente, nombre)').eq('estado', 'ACEPTADA')
    ]);
    if (resCli.data) setClientes(resCli.data);
    if (resProv.data) setProveedores(resProv.data);
    if (resPiezas.data) setPiezas(resPiezas.data);
    if (resCot.data) setCotizacionesAprobadas(resCot.data);
  };

  const fetchContenedores = async () => {
    const { data, error } = await supabase.from('contenedores').select('*, usuarios(nombre)').order('id_contenedor', { ascending: false });
    if (!error) setContenedores(data || []);
  };

  const fetchDetallesContenedor = async (id) => {
    // Fetch Carga
    const { data: dataCarga } = await supabase
      .from('contenedor_detalles')
      .select('*, catalogo_piezas(nombre), clientes(nombre), proveedores(nombre)')
      .eq('id_contenedor', id);
    setCarga(dataCarga || []);

    // Fetch Rutas
    const { data: dataRutas } = await supabase
      .from('rutas_contenedor')
      .select('*')
      .eq('id_contenedor', id)
      .order('created_at', { ascending: false });
    setRutas(dataRutas || []);
  };

  const filteredContenedores = contenedores.filter(c => 
    (c.codigo_serial && c.codigo_serial.toLowerCase().includes(search.toLowerCase())) ||
    (c.estado_distribucion && c.estado_distribucion.toLowerCase().includes(search.toLowerCase()))
  );

  const handleChangeEstadoFast = async (id, nuevoEstado) => {
    const { error } = await supabase.from('contenedores').update({ 
      estado_distribucion: nuevoEstado,
      id_usuario: userProfile?.id || null
    }).eq('id_contenedor', id);
    if (!error) {
      if (addToast) addToast('Éxito', `Estado cambiado a ${nuevoEstado}`, 'success');
      fetchContenedores();
    } else {
      if (addToast) addToast('Error', 'No se pudo actualizar el estado', 'error');
    }
  };

  const openPanel = (contenedor = null) => {
    if (contenedor) {
      setSelectedContenedor(contenedor);
      setFormData({
        codigo_serial: contenedor.codigo_serial || '',
        fecha_llegada: contenedor.fecha_llegada || '',
        estado_distribucion: contenedor.estado_distribucion || 'En Tránsito',
        puerto_origen: contenedor.puerto_origen || '',
        puerto_destino: contenedor.puerto_destino || '',
        linea_naviera: contenedor.linea_naviera || '',
        costo_flete_total: contenedor.costo_flete_total || 0
      });
      fetchDetallesContenedor(contenedor.id_contenedor);
    } else {
      setSelectedContenedor(null);
      setFormData({
        codigo_serial: '', fecha_llegada: new Date().toISOString().split('T')[0],
        estado_distribucion: 'En Tránsito', puerto_origen: '', puerto_destino: '', linea_naviera: '', costo_flete_total: 0
      });
      setCarga([]); setRutas([]);
    }
    setActiveTab('INFO');
    setIsPanelOpen(true);
  };

  const handleSaveInfo = async () => {
    if (!formData.codigo_serial.trim()) return addToast('Error', 'El código serial es obligatorio.', 'error');
    const payload = { ...formData, id_usuario: userProfile?.id || null };
    
    const syncAduanasImportacion = async (contId) => {
      if (formData.estado_distribucion === 'En Aduana') {
        const { data: exist } = await supabase.from('importaciones').select('id_importacion').eq('id_contenedor', contId);
        if (!exist || exist.length === 0) {
          const { data: det } = await supabase.from('contenedor_detalles').select('precio_venta, cantidad').eq('id_contenedor', contId);
          let sumM = 0;
          if (det) det.forEach(d => sumM += (parseFloat(d.precio_venta || 0) * parseInt(d.cantidad || 0)));
          const totalEst = sumM + parseFloat(formData.costo_flete_total || 0);
          
          let autoP = 'Otro';
          if (formData.puerto_origen) {
            const pMap = { 'China': 'China', 'Brasil': 'Brasil', 'Estados': 'Estados Unidos', 'Argentina': 'Argentina', 'Perú': 'Perú', 'Peru': 'Perú', 'Corea': 'Corea del Sur', 'Japón': 'Japón', 'Japon': 'Japón' };
            Object.keys(pMap).forEach(k => { if (formData.puerto_origen.includes(k)) autoP = pMap[k]; });
          }
          
          await supabase.from('importaciones').insert([{
            id_contenedor: contId,
            pais_origen: autoP,
            fecha_importacion: new Date().toISOString().split('T')[0],
            costo_total: totalEst > 0 ? totalEst.toFixed(2) : 0,
            estado: 'En Aduana'
          }]);
          addToast('🏛️ Aduanas', 'Se generó automáticamente el expediente en Importaciones.', 'info');
        }
      }
    };
    
    if (selectedContenedor) {
      const { error } = await supabase.from('contenedores').update(payload).eq('id_contenedor', selectedContenedor.id_contenedor);
      if (!error) {
        await syncAduanasImportacion(selectedContenedor.id_contenedor);
        fetchContenedores(); addToast('Éxito', 'Contenedor actualizado.', 'success');
      } else addToast('Error', 'No se pudo actualizar.', 'error');
    } else {
      payload.id_usuario = userProfile?.id || null;
      const { data, error } = await supabase.from('contenedores').insert([payload]).select().single();
      if (!error && data) {
        await syncAduanasImportacion(data.id_contenedor);
        fetchContenedores(); openPanel(data); addToast('Éxito', 'Contenedor registrado.', 'success');
      } else addToast('Error', 'No se pudo registrar.', 'error');
    }
  };

  const handleAddCarga = async () => {
    if (!selectedContenedor) return addToast('Error', 'Guarda el contenedor primero.', 'warning');
    if (!formCarga.id_pieza || !formCarga.id_cliente || !formCarga.id_proveedor || formCarga.cantidad < 1) {
      return addToast('Error', 'Completa todos los datos de la carga.', 'error');
    }
    
    const newDetalle = {
      ...formCarga,
      id_contenedor: selectedContenedor.id_contenedor,
      numero_factura: formCarga.numero_factura || null
    };

    const { data, error } = await supabase.from('contenedor_detalles').insert([newDetalle]).select('*, catalogo_piezas(nombre), clientes(nombre), proveedores(nombre)').single();
    if (!error) {
      addToast('Éxito', 'Carga añadida.', 'success');
      setCarga([...carga, data]);
      // Reset only piece details, preserve supplier, client and invoice for faster batch entry
      setFormCarga(prev => ({ ...prev, id_pieza: '', cantidad: 1, costo_compra: 0, precio_venta: 0 }));
      setPiezaSearch('');
    } else addToast('Error', 'Fallo al añadir carga. Verifica si ya aplicaste el script SQL.', 'error');
  };

  const handleRemoveCarga = async (id) => {
    await supabase.from('contenedor_detalles').delete().eq('id_detalle', id);
    fetchDetallesContenedor(selectedContenedor.id_contenedor);
    addToast('Info', 'Carga eliminada.', 'info');
  };

  const loadQuoteDetails = async (idCotizacion) => {
    if (!idCotizacion) {
      setQuoteItems([]);
      return;
    }
    const { data } = await supabase
      .from('detalle_cotizacion')
      .select('id_pieza, cantidad, precio_unitario, cotizaciones(clientes(id_cliente, nombre)), catalogo_piezas(nombre)')
      .eq('id_cotizacion', idCotizacion);
      
    if (data) {
      setQuoteItems(data);
      if (addToast) addToast('Info', `Se encontraron ${data.length} repuestos en esta cotización.`, 'info');
    }
  };

  const importQuoteItem = (item) => {
    const clienteObj = item.cotizaciones?.clientes;
    const clienteId = clienteObj?.id_cliente || '';
    const clienteNombre = clienteObj?.nombre || '';
    
    setFormCarga(prev => ({
      ...prev,
      id_pieza: item.id_pieza,
      id_cliente: clienteId || prev.id_cliente,
      cantidad: item.cantidad,
      costo_compra: 0,
      precio_venta: parseFloat(item.precio_unitario) || 0
    }));
    setPiezaSearch(item.catalogo_piezas?.nombre || '');
    if (clienteNombre) setClienteSearch(clienteNombre);
    if (addToast) addToast('Info', 'Repuesto autocompletado. Proveedor y Factura conservados.', 'info');
  };

  const handleAddRuta = async () => {
    if (!selectedContenedor) return;
    if (!formRuta.ubicacion_actual) return addToast('Error', 'Ingresa la ubicación.', 'error');

    const { error } = await supabase.from('rutas_contenedor').insert([{
      id_contenedor: selectedContenedor.id_contenedor,
      ...formRuta
    }]);

    if (!error) {
      addToast('Éxito', 'Ruta actualizada.', 'success');
      fetchDetallesContenedor(selectedContenedor.id_contenedor);
      setFormRuta({ ubicacion_actual: '', fecha_llegada: '', estado: 'EN_TRANSITO', observaciones: '' });
    } else addToast('Error', 'Fallo al añadir ruta. Verifica el script SQL.', 'error');
  };

  // Finanzas Calc
  const totalFlete = parseFloat(formData.costo_flete_total || 0);
  const ingresosCarga = carga.reduce((acc, item) => acc + (parseFloat(item.precio_venta || 0) * item.cantidad), 0);
  const costosCarga = carga.reduce((acc, item) => acc + (parseFloat(item.costo_compra || 0) * item.cantidad), 0);
  const gananciaNeta = ingresosCarga - costosCarga - totalFlete;

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title">Gestión de Contenedores y Rutas</h1>
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#9CA3AF" />
            <input type="text" placeholder="Buscar contenedor..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => openPanel()}><Plus size={18} /> NUEVO CONTENEDOR</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>CÓDIGO SERIAL</th>
                <th>RUTA</th>
                <th>FECHA ESTIMADA</th>
                <th>ESTADO</th>
                <th>OPERADOR</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredContenedores.map((c) => (
                <tr key={c.id_contenedor}>
                  <td style={{ fontWeight: '600', color: '#134B82' }}>{c.codigo_serial}</td>
                  <td>{c.puerto_origen ? `${c.puerto_origen} → ${c.puerto_destino}` : 'Sin definir'}</td>
                  <td>{c.fecha_llegada ? new Date(c.fecha_llegada).toLocaleDateString() : '-'}</td>
                  <td>
                    <select 
                      value={c.estado_distribucion || 'En Origen'}
                      onChange={(e) => handleChangeEstadoFast(c.id_contenedor, e.target.value)}
                      style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: 'none', outline: 'none', cursor: 'pointer',
                        background: c.estado_distribucion === 'En Almacén' ? '#D1FAE5' : '#DBEAFE',
                        color: c.estado_distribucion === 'En Almacén' ? '#065F46' : '#1E40AF'
                      }}
                    >
                      <option value="En Origen">En Origen</option>
                      <option value="En Tránsito">En Tránsito</option>
                      <option value="En Aduana">En Aduana</option>
                      <option value="En Almacén">En Almacén</option>
                    </select>
                  </td>
                  <td style={{ fontSize: '12px', color: '#6B7280' }}>
                    {c.usuarios?.nombre || 'S/N'}
                  </td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openPanel(c)}><Edit2 size={12} /> GESTIONAR</button>
                  </td>
                </tr>
              ))}
              {filteredContenedores.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No hay contenedores registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPanelOpen && (
        <div className="action-panel" style={{ width: '600px' }}>
          <div className="panel-header">
            <span>{selectedContenedor ? `Contenedor: ${formData.codigo_serial}` : 'Nuevo Contenedor'}</span>
            <button className="panel-close" onClick={() => setIsPanelOpen(false)}><X size={18} /></button>
          </div>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', padding: '0 16px' }}>
            {['INFO', 'CARGA', 'FINANZAS'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '600', color: activeTab === tab ? '#134B82' : '#6B7280',
                  borderBottom: activeTab === tab ? '2px solid #134B82' : '2px solid transparent'
                }}
              >
                {tab === 'INFO' && <span style={{ display:'flex', gap:'6px' }}><Package size={14}/> INFO</span>}
                {tab === 'CARGA' && <span style={{ display:'flex', gap:'6px' }}><Package size={14}/> CARGA</span>}
                {tab === 'FINANZAS' && <span style={{ display:'flex', gap:'6px' }}><DollarSign size={14}/> REPORTE</span>}
              </button>
            ))}
          </div>

          <div className="panel-content" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
            
            {/* Visual Timeline Tracker */}
            {selectedContenedor && (
              <div style={{ padding: '24px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tracking Logístico</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  
                  {/* Progress Line Background */}
                  <div style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '3px', background: '#E2E8F0', zIndex: 1 }}></div>
                  
                  {/* Dynamic Progress Line */}
                  <div style={{ 
                    position: 'absolute', top: '20px', left: '10%', height: '3px', background: '#10B981', zIndex: 1, transition: 'width 0.3s',
                    width: formData.estado_distribucion === 'En Origen' ? '0%' : 
                           formData.estado_distribucion === 'En Tránsito' ? '25%' : 
                           formData.estado_distribucion === 'En Aduana' ? '50%' : 
                           formData.estado_distribucion === 'Recibido' ? '75%' : 
                           formData.estado_distribucion === 'En Almacén' ? '100%' : '0%' 
                  }}></div>

                  {[
                    { state: 'En Origen', label: 'Origen', icon: Ship },
                    { state: 'En Tránsito', label: 'Tránsito', icon: Navigation },
                    { state: 'En Aduana', label: 'Aduana', icon: Anchor },
                    { state: 'Recibido', label: 'Recibido', icon: Truck },
                    { state: 'En Almacén', label: 'Almacén', icon: Home }
                  ].map((step, idx) => {
                    const isCompleted = ['En Origen', 'En Tránsito', 'En Aduana', 'Recibido', 'En Almacén'].indexOf(formData.estado_distribucion) >= idx;
                    const isCurrent = formData.estado_distribucion === step.state;
                    const Icon = step.icon;
                    return (
                      <div key={step.state} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                          background: isCompleted ? '#10B981' : '#F1F5F9',
                          border: isCurrent ? '3px solid #34D399' : (isCompleted ? '3px solid #059669' : '3px solid #E2E8F0'),
                          color: isCompleted ? 'white' : '#94A3B8',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none',
                          transition: 'all 0.2s'
                        }}>
                          <Icon size={18} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: isCurrent ? '#0F172A' : (isCompleted ? '#10B981' : '#94A3B8'), marginTop: '8px' }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {activeTab === 'INFO' && (
              <div>
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '16px', borderRadius: '12px', marginBottom: '20px', color: '#1E3A8A' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold' }}>ℹ️ Paso Inicial: Datos del Barco</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>Aquí defines los puertos y la naviera que trae la mercancía. <strong>Importante:</strong> Coloca el costo total del Flete para que el reporte financiero sea exacto.</p>
                </div>
                <div className="detail-group">
                  <div className="detail-label">Código Serial</div>
                  <div className="detail-value"><input type="text" name="codigo_serial" value={formData.codigo_serial} onChange={(e) => setFormData({...formData, codigo_serial: e.target.value})} style={{ textTransform: 'uppercase' }} /></div>
                </div>
                <div className="detail-group">
                  <div className="detail-label">Línea Naviera</div>
                  <div className="detail-value">
                    <select value={formData.linea_naviera} onChange={(e) => setFormData({...formData, linea_naviera: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '4px' }}>
                      <option value="">Selecciona Naviera</option>
                      <option value="MSC">MSC</option>
                      <option value="Maersk">Maersk</option>
                      <option value="COSCO">COSCO</option>
                      <option value="CMA CGM">CMA CGM</option>
                      <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                      <option value="ONE">ONE</option>
                      <option value="Evergreen">Evergreen</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="detail-group" style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #CBD5E1', marginBottom: '16px' }}>
                  <div className="detail-label" style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                    <span style={{ color: '#F59E0B' }}>⚡</span> Autocompletar Origen (Opcional)
                  </div>
                  <div className="detail-value">
                    <select 
                      onChange={(e) => {
                        const provId = e.target.value;
                        const prov = proveedores.find(p => p.id_proveedor == provId);
                        if (prov && prov.pais) {
                          const paisMapping = {
                            'china': 'China (CN)',
                            'brasil': 'Brasil (BR)',
                            'unidos': 'Estados Unidos (US)',
                            'argentina': 'Argentina (AR)',
                            'peru': 'Perú (PE)',
                            'perú': 'Perú (PE)',
                            'corea': 'Corea del Sur (KR)',
                            'japon': 'Japón (JP)',
                            'japón': 'Japón (JP)'
                          };
                          
                          let newOrigen = 'Otro';
                          const paisLower = prov.pais.toLowerCase();
                          Object.keys(paisMapping).forEach(key => {
                            if (paisLower.includes(key)) {
                              newOrigen = paisMapping[key];
                            }
                          });
                          
                          setFormData({...formData, puerto_origen: newOrigen});
                          addToast('Autocompletado', `Origen establecido a ${newOrigen} desde el proveedor.`, 'info');
                        }
                      }} 
                      style={{ width: '100%', padding: '8px', border: '1px solid #93C5FD', borderRadius: '4px', background: '#EFF6FF', fontSize: '13px' }}
                    >
                      <option value="">-- Selecciona el Proveedor Principal --</option>
                      {proveedores.map(p => (
                        <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre} {p.pais ? `(${p.pais})` : ''}</option>
                      ))}
                    </select>
                    <small style={{ color: '#64748B', display: 'block', marginTop: '6px', fontSize: '11px' }}>Seleccionar un proveedor ajustará automáticamente el país de origen del barco.</small>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="detail-group" style={{ flex: 1 }}>
                    <div className="detail-label">País/Puerto Origen</div>
                    <div className="detail-value">
                      <select value={formData.puerto_origen} onChange={(e) => setFormData({...formData, puerto_origen: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '4px' }}>
                        <option value="">Selecciona Origen</option>
                        <option value="China (CN)">China (CN)</option>
                        <option value="Brasil (BR)">Brasil (BR)</option>
                        <option value="Estados Unidos (US)">Estados Unidos (US)</option>
                        <option value="Argentina (AR)">Argentina (AR)</option>
                        <option value="Perú (PE)">Perú (PE)</option>
                        <option value="Corea del Sur (KR)">Corea del Sur (KR)</option>
                        <option value="Japón (JP)">Japón (JP)</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div className="detail-group" style={{ flex: 1 }}>
                    <div className="detail-label">Puerto Destino (Tránsito)</div>
                    <div className="detail-value">
                      <select value={formData.puerto_destino} onChange={(e) => setFormData({...formData, puerto_destino: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '4px' }}>
                        <option value="">Selecciona Destino</option>
                        <option value="Arica (Chile)">Arica (Chile)</option>
                        <option value="Iquique (Chile)">Iquique (Chile)</option>
                        <option value="Tambo Quemado (Frontera)">Tambo Quemado (Frontera)</option>
                        <option value="Desaguadero (Frontera)">Desaguadero (Frontera)</option>
                        <option value="Puerto Suárez (Bolivia)">Puerto Suárez (Bolivia)</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="detail-group" style={{ flex: 1 }}>
                    <div className="detail-label">Fecha Llegada</div>
                    <div className="detail-value"><input type="date" value={formData.fecha_llegada} onChange={(e) => setFormData({...formData, fecha_llegada: e.target.value})} /></div>
                  </div>
                  <div className="detail-group" style={{ flex: 1 }}>
                    <div className="detail-label">Costo Flete ($)</div>
                    <div className="detail-value"><input type="number" value={formData.costo_flete_total} onChange={(e) => setFormData({...formData, costo_flete_total: e.target.value})} /></div>
                  </div>
                </div>
                <div className="detail-group">
                  <div className="detail-label">Estado Global</div>
                  <div className="detail-value">
                    <select value={formData.estado_distribucion} onChange={(e) => setFormData({...formData, estado_distribucion: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px' }}>
                      {ESTADOS_DISPONIBLES.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <button className="btn-save" onClick={handleSaveInfo} style={{ width: '100%' }}><Save size={16} style={{marginRight:'8px'}}/> GUARDAR INFO BASE</button>
                </div>
                {formData.estado_distribucion === 'En Aduana' && (
                  <div style={{ marginTop: '16px', background: '#FEF3C7', border: '1px solid #F59E0B', padding: '12px', borderRadius: '8px', color: '#92400E' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span>🏛️ Conectividad con Aduanas</span>
                    </div>
                    <p style={{ margin: '0', fontSize: '12px' }}>
                      Al poner el estado en <strong>"En Aduana"</strong>, ve al módulo de <strong>Importaciones</strong> y selecciona este contenedor: el sistema conectará los datos automáticamente y calculará la póliza aduanera.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'CARGA' && (
              <div>
                <div style={{ background: '#ECFDF5', border: '1px solid #34D399', padding: '16px', borderRadius: '12px', marginBottom: '20px', color: '#065F46' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📦 Instrucciones para llenar la carga:
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    <strong>Paso 1:</strong> Selecciona el producto de tu inventario. <br/>
                    <strong>Paso 2:</strong> Asigna a quién se lo compraste (Proveedor) y a quién se lo vas a entregar (Cliente). <br/>
                    <strong>Paso 3:</strong> Ingresa la cantidad y los costos para calcular la ganancia.
                  </p>
                </div>
                {!selectedContenedor ? (
                  <p style={{ color: '#EF4444', fontSize: '13px' }}>Debes guardar el contenedor primero para agregar carga.</p>
                ) : (
                  <>
                    <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px dashed #93C5FD' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E3A8A', display: 'block', marginBottom: '8px' }}>
                        ⚡ Acción Rápida: Levantar pedido de Cotización
                      </label>
                      <select 
                        onChange={(e) => loadQuoteDetails(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #BFDBFE', borderRadius: '4px' }}
                      >
                        <option value="">-- Selecciona una Cotización Aprobada --</option>
                        {cotizacionesAprobadas.map(c => (
                          <option key={c.id_cotizacion} value={c.id_cotizacion}>
                            COT-{c.id_cotizacion} | Cliente: {c.clientes?.nombre}
                          </option>
                        ))}
                      </select>
                      
                      {quoteItems.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {quoteItems.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', padding: '8px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                              <span style={{ fontSize: '12px', color: '#374151' }}>
                                <strong>{item.cantidad}x</strong> {item.catalogo_piezas?.nombre}
                              </span>
                              <button onClick={() => importQuoteItem(item)} className="btn-action" style={{ background: '#3B82F6', color: '#FFF' }}>
                                CARGAR AL FORMULARIO
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#374151' }}>Agregar Pieza al Contenedor</h4>
                      <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>PIEZA DEL INVENTARIO</label>
                        <input
                          type="text"
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                          placeholder="Escribe el nombre o código de la pieza..."
                          value={piezaSearch}
                          onChange={(e) => {
                            setPiezaSearch(e.target.value);
                            setShowPiezaSearch(true);
                            // Clear selection if typing
                            if (formCarga.id_pieza) setFormCarga({...formCarga, id_pieza: ''});
                          }}
                          onFocus={() => setShowPiezaSearch(true)}
                          onBlur={() => setTimeout(() => setShowPiezaSearch(false), 200)}
                        />
                        {showPiezaSearch && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #D1D5DB', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            {filteredPiezas.length === 0 ? (
                              <div style={{ padding: '8px', color: '#6B7280', fontSize: '12px' }}>No hay resultados</div>
                            ) : (
                              filteredPiezas.slice(0, 50).map(p => (
                                <div 
                                  key={p.id_pieza}
                                  style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}
                                  onMouseDown={() => {
                                    setFormCarga({...formCarga, id_pieza: p.id_pieza});
                                    setPiezaSearch(`${p.codigo_pieza || ''} - ${p.nombre} (${p.marca})`);
                                    setShowPiezaSearch(false);
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <strong>{p.codigo_pieza || 'S/C'}</strong> - {p.nombre} ({p.marca})
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>PROVEEDOR</label>
                          <input
                            type="text"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                            placeholder="Buscar proveedor..."
                            value={provSearch}
                            onChange={(e) => {
                              setProvSearch(e.target.value);
                              setShowProvSearch(true);
                              if (formCarga.id_proveedor) setFormCarga({...formCarga, id_proveedor: ''});
                            }}
                            onFocus={() => setShowProvSearch(true)}
                            onBlur={() => setTimeout(() => setShowProvSearch(false), 200)}
                          />
                          {showProvSearch && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #D1D5DB', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                              {filteredProv.slice(0, 20).map(p => (
                                <div 
                                  key={p.id_proveedor}
                                  style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}
                                  onMouseDown={() => {
                                    setFormCarga({...formCarga, id_proveedor: p.id_proveedor});
                                    setProvSearch(p.nombre);
                                    setShowProvSearch(false);
                                  }}
                                >
                                  {p.nombre}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
                          <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>CLIENTE DESTINO</label>
                          <input
                            type="text"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                            placeholder="Buscar cliente..."
                            value={clienteSearch}
                            onChange={(e) => {
                              setClienteSearch(e.target.value);
                              setShowClienteSearch(true);
                              if (formCarga.id_cliente) setFormCarga({...formCarga, id_cliente: ''});
                            }}
                            onFocus={() => setShowClienteSearch(true)}
                            onBlur={() => setTimeout(() => setShowClienteSearch(false), 200)}
                          />
                          {showClienteSearch && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #D1D5DB', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                              {filteredClientes.slice(0, 20).map(c => (
                                <div 
                                  key={c.id_cliente}
                                  style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}
                                  onMouseDown={() => {
                                    setFormCarga({...formCarga, id_cliente: c.id_cliente});
                                    setClienteSearch(c.nombre);
                                    setShowClienteSearch(false);
                                  }}
                                >
                                  {c.nombre}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: '0 0 80px' }}>
                          <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>CANTIDAD</label>
                          <input type="number" placeholder="Ej. 100" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }} value={formCarga.cantidad} onChange={e => setFormCarga({...formCarga, cantidad: e.target.value})} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>COSTO COMPRA ($)</label>
                          <input type="number" placeholder="Costo unitario" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }} value={formCarga.costo_compra} onChange={e => setFormCarga({...formCarga, costo_compra: e.target.value})} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>PRECIO VENTA ($)</label>
                          <input type="number" placeholder="Precio unitario" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }} value={formCarga.precio_venta} onChange={e => setFormCarga({...formCarga, precio_venta: e.target.value})} />
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 'bold' }}>NÚMERO DE FACTURA (Proveedor)</label>
                        <input type="text" placeholder="Ej. INV-2026-88" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }} value={formCarga.numero_factura} onChange={e => setFormCarga({...formCarga, numero_factura: e.target.value})} />
                      </div>
                      
                      <button onClick={handleAddCarga} style={{ width: '100%', padding: '8px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}>+ AÑADIR A LA CARGA</button>
                    </div>

                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#374151', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>Contenido Actual ({carga.length} ítems)</h4>
                    {carga.length === 0 ? <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Contenedor vacío.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {carga.map(c => (
                          <div key={c.id_detalle} style={{ padding: '12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                              <span>{c.catalogo_piezas?.nombre} (x{c.cantidad})</span>
                              <button onClick={() => handleRemoveCarga(c.id_detalle)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
                            </div>
                            <div style={{ color: '#6B7280' }}>
                              De: {c.proveedores?.nombre} | Para: {c.clientes?.nombre}
                              {c.numero_factura && <span style={{ marginLeft: '8px', color: '#0369A1', background: '#E0F2FE', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>Factura: {c.numero_factura}</span>}
                            </div>
                            <div style={{ color: '#10B981', marginTop: '4px', fontWeight: '600' }}>Ganancia Proyectada: ${( (c.precio_venta - c.costo_compra) * c.cantidad ).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'RUTA' && (
              <div>
                <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '16px', borderRadius: '12px', marginBottom: '20px', color: '#5B21B6' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold' }}>📍 Mapeo de Ruta</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>Anota aquí cada puerto o ciudad por donde va pasando el barco. Esto creará una línea de tiempo para saber exactamente dónde está la mercancía.</p>
                </div>
                {!selectedContenedor ? (
                  <p style={{ color: '#EF4444', fontSize: '13px' }}>Debes guardar el contenedor primero.</p>
                ) : (
                  <>
                    <div style={{ background: '#F0F9FF', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #BAE6FD' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#0369A1' }}>Registrar Punto en la Ruta</h4>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input type="text" placeholder="Ubicación (Ej. Canal de Panamá)" style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #BAE6FD' }} value={formRuta.ubicacion_actual} onChange={e => setFormRuta({...formRuta, ubicacion_actual: e.target.value})} />
                        <input type="date" style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #BAE6FD' }} value={formRuta.fecha_llegada} onChange={e => setFormRuta({...formRuta, fecha_llegada: e.target.value})} />
                      </div>
                      <input type="text" placeholder="Observaciones..." style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #BAE6FD' }} value={formRuta.observaciones} onChange={e => setFormRuta({...formRuta, observaciones: e.target.value})} />
                      <button onClick={handleAddRuta} style={{ width: '100%', padding: '8px', background: '#0EA5E9', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>+ REGISTRAR UBICACIÓN</button>
                    </div>

                    <div style={{ borderLeft: '2px solid #E5E7EB', marginLeft: '12px', paddingLeft: '16px' }}>
                      {rutas.length === 0 ? <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Sin historial de ruta.</p> : (
                        rutas.map((r, idx) => (
                          <div key={r.id_ruta} style={{ position: 'relative', marginBottom: '16px' }}>
                            <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: idx === 0 ? '#10B981' : '#9CA3AF' }}></div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>{r.ubicacion_actual}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              {r.fecha_llegada ? new Date(r.fecha_llegada).toLocaleDateString() : 'Sin fecha'} - {new Date(r.created_at).toLocaleString()}
                            </div>
                            {r.observaciones && <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px', background: '#F3F4F6', padding: '4px 8px', borderRadius: '4px' }}>{r.observaciones}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'FINANZAS' && (
              <div>
                {!selectedContenedor ? (
                  <p style={{ color: '#EF4444', fontSize: '13px' }}>Debes guardar el contenedor primero.</p>
                ) : (
                  <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: '0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={20} color="#10B981"/> Reporte de Importación
                      </h3>
                      <button 
                        onClick={() => window.print()} 
                        style={{ padding: '8px 16px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Printer size={16} /> GENERAR PDF
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Inversión Carga (Proveedores)</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#EF4444' }}>${costosCarga.toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Costo Flete/Aduana</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F59E0B' }}>${totalFlete.toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Ingresos Brutos (Ventas a Clientes)</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3B82F6' }}>${ingresosCarga.toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#FFF', padding: '12px', borderRadius: '8px', border: '2px solid #10B981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: 'bold', textTransform: 'uppercase' }}>Ganancia Neta Importadora</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#10B981' }}>${gananciaNeta.toFixed(2)}</div>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#374151' }}>Desglose por Cliente (Ingresos)</h4>
                    {carga.length === 0 ? <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Sin carga asignada.</p> : (
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                            <th style={{ padding: '8px' }}>Cliente</th>
                            <th style={{ padding: '8px' }}>Pieza</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Total Venta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carga.map(c => (
                            <tr key={c.id_detalle} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px', fontWeight: '500' }}>{c.clientes?.nombre}</td>
                              <td style={{ padding: '8px' }}>{c.catalogo_piezas?.nombre} (x{c.cantidad})</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>${(c.precio_venta * c.cantidad).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
