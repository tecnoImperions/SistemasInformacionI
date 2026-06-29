import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Search, Plus, X, Printer, FileText, Trash2, User, Calendar } from 'lucide-react';

export default function Cotizaciones({ addToast }) {
  const { tipoCambio } = useStore();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [search, setSearch] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Print state
  const [printData, setPrintData] = useState(null);

  // Master-Detail Form State
  const [clientes, setClientes] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  const [formData, setFormData] = useState({
    observaciones: '',
    fecha: new Date().toISOString().split('T')[0]
  });
  
  const [detalles, setDetalles] = useState([]); // { pieza: obj, cantidad: 1, precio_unitario: 0, subtotal: 0 }

  // Autocomplete states
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [showPiezaSearch, setShowPiezaSearch] = useState(false);
  const [piezaSearchTerm, setPiezaSearchTerm] = useState('');
  
  const clienteSearchRef = useRef(null);
  const piezaSearchRef = useRef(null);

  useEffect(() => {
    fetchCotizaciones();
    fetchClientesYPiezas();

    function handleClickOutside(event) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(event.target)) {
        setShowClienteSearch(false);
      }
      if (piezaSearchRef.current && !piezaSearchRef.current.contains(event.target)) {
        setShowPiezaSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Print logic when printData changes
    if (printData) {
      window.print();
    }
  }, [printData]);

  const fetchCotizaciones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes ( nombre )
        `)
        .order('id_cotizacion', { ascending: false });
      
      if (error) throw error;
      setCotizaciones(data || []);
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudieron cargar las cotizaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientesYPiezas = async () => {
    try {
      const { data: cData } = await supabase.from('clientes').select('*').eq('estado', true);
      const { data: pData } = await supabase.from('catalogo_piezas').select('*').eq('disponible', true);
      setClientes(cData || []);
      setPiezas(pData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openPanel = () => {
    setSelectedCliente(null);
    setDetalles([]);
    setFormData({
      observaciones: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setClienteSearchTerm('');
    setPiezaSearchTerm('');
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const agregarPieza = (pieza) => {
    if (detalles.some(d => d.pieza.id_pieza === pieza.id_pieza)) {
      if (addToast) addToast('Info', 'La pieza ya está en la cotización', 'info');
      return;
    }
    
    // Calcular el precio unitario en Bolivianos en el momento de agregar a la cotización
    const precioBaseUsd = parseFloat(pieza.precio_referencial) || 0;
    const precioUnitarioBs = parseFloat((precioBaseUsd * tipoCambio).toFixed(2));
    
    setDetalles([...detalles, {
      pieza,
      cantidad: 1,
      precio_unitario: precioUnitarioBs,
      subtotal: precioUnitarioBs
    }]);
    setShowPiezaSearch(false);
    setPiezaSearchTerm('');
  };

  const removerDetalle = (index) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const actualizarDetalle = (index, field, value) => {
    const newDetalles = [...detalles];
    const val = parseFloat(value) || 0;
    newDetalles[index][field] = val;
    newDetalles[index].subtotal = parseFloat((newDetalles[index].cantidad * newDetalles[index].precio_unitario).toFixed(2));
    setDetalles(newDetalles);
  };

  const calcularTotal = () => {
    return detalles.reduce((acc, curr) => acc + curr.subtotal, 0);
  };

  const handleSave = async () => {
    if (!selectedCliente) {
      if (addToast) addToast('Error', 'Debe seleccionar un cliente', 'error');
      return;
    }
    if (detalles.length === 0) {
      if (addToast) addToast('Error', 'Debe agregar al menos una pieza', 'error');
      return;
    }

    try {
      // 1. Insert Cotizacion
      const total = calcularTotal();
      const numCot = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: cotData, error: cotError } = await supabase
        .from('cotizaciones')
        .insert([{
          numero_cotizacion: numCot,
          id_cliente: selectedCliente.id_cliente,
          fecha: formData.fecha,
          total: total,
          estado: 'PENDIENTE',
          usuario_id: userProfile?.id || null
          observaciones: formData.observaciones ? `${formData.observaciones}\n(TC aplicado: ${tipoCambio} Bs/$)` : `(TC aplicado: ${tipoCambio} Bs/$)`
        }])
        .select()
        .single();

      if (cotError) throw cotError;

      // 2. Insert Detalles
      const detallesAInsertar = detalles.map(d => ({
        id_cotizacion: cotData.id_cotizacion,
        id_pieza: d.pieza.id_pieza,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal
      }));

      const { error: detError } = await supabase
        .from('detalle_cotizacion')
        .insert(detallesAInsertar);

      if (detError) throw detError;

      if (addToast) addToast('Éxito', 'Cotización generada correctamente', 'success');
      fetchCotizaciones();
      closePanel();
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'Error al guardar la cotización', 'error');
    }
  };

  const handlePrintRequest = async (cotizacion) => {
    try {
      const { data: detallesData, error } = await supabase
        .from('detalle_cotizacion')
        .select(`
          cantidad,
          precio_unitario,
          subtotal,
          catalogo_piezas ( nombre, marca, modelo_auto )
        `)
        .eq('id_cotizacion', cotizacion.id_cotizacion);
        
      if (error) throw error;
      
      setPrintData({
        ...cotizacion,
        detalles: detallesData || []
      });
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudieron cargar los detalles para imprimir', 'error');
    }
  };

  const filteredCotizaciones = cotizaciones.filter(c => 
    c.clientes?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.id_cotizacion.toString().includes(search)
  );

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase()))
  ).slice(0, 5);

  const filteredPiezasBusqueda = piezas.filter(p => 
    p.nombre.toLowerCase().includes(piezaSearchTerm.toLowerCase()) ||
    (p.modelo_auto && p.modelo_auto.toLowerCase().includes(piezaSearchTerm.toLowerCase())) ||
    (p.marca && p.marca.toLowerCase().includes(piezaSearchTerm.toLowerCase()))
  ).slice(0, 5);

  return (
    <>
      {/* VISTA NORMAL APP */}
      <div className="content-area no-print">
        <div className="clients-section">
          <h1 className="page-title">RF07/RF10: Cotizaciones</h1>
          
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} color="#9CA3AF" />
              <input 
                type="text" 
                placeholder="Buscar por cliente o ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => openPanel()}>
              <Plus size={18} /> NUEVA COTIZACIÓN
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>NRO.</th>
                  <th>CLIENTE</th>
                  <th>FECHA</th>
                  <th>TOTAL (Bs.)</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
                ) : filteredCotizaciones.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No hay cotizaciones registradas.</td></tr>
                ) : (
                  filteredCotizaciones.map((cot) => (
                    <tr key={cot.id_cotizacion}>
                      <td style={{ fontWeight: '600' }}>{cot.numero_cotizacion || `COT-${cot.id_cotizacion.toString().padStart(4, '0')}`}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#6B7280" /> {cot.clientes?.nombre || 'Desconocido'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="#6B7280" /> {cot.fecha}
                        </div>
                      </td>
                      <td style={{ fontWeight: '700', color: '#134B82' }}>
                        Bs. {parseFloat(cot.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          background: cot.estado === 'FACTURADA' ? '#D1FAE5' : cot.estado === 'RECHAZADA' ? '#FEE2E2' : '#FEF3C7',
                          color: cot.estado === 'FACTURADA' ? '#065F46' : cot.estado === 'RECHAZADA' ? '#991B1B' : '#92400E'
                        }}>
                          {cot.estado || 'PENDIENTE'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-action" style={{ background: '#F3F4F6', color: '#374151' }} onClick={() => handlePrintRequest(cot)}>
                          <Printer size={12} /> IMPRIMIR
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
          <div className="action-panel" style={{ width: '480px' }}>
            <div className="panel-header">
              <span>Crear Cotización</span>
              <button className="panel-close" onClick={closePanel}>
                <X size={18} />
              </button>
            </div>
            
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Cliente Select */}
              <div className="detail-group" ref={clienteSearchRef}>
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

              {/* Piezas Search & Add */}
              <div className="detail-group" ref={piezaSearchRef} style={{ zIndex: 40 }}>
                <div className="detail-label">Agregar Pieza al detalle</div>
                <div className="autocomplete-container">
                  <input 
                    type="text" 
                    placeholder="Buscar pieza por nombre, modelo..." 
                    value={piezaSearchTerm}
                    onChange={(e) => { setPiezaSearchTerm(e.target.value); setShowPiezaSearch(true); }}
                    onFocus={() => setShowPiezaSearch(true)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px' }}
                  />
                  {showPiezaSearch && (
                    <div className="autocomplete-dropdown">
                      {filteredPiezasBusqueda.map(p => {
                        const isOferta = p.descripcion?.includes('[OFERTA]');
                        const precioBaseUsd = parseFloat(p.precio_referencial) || 0;
                        const precioBs = (precioBaseUsd * tipoCambio).toFixed(2);
                        
                        return (
                          <div key={p.id_pieza} className="autocomplete-item" onClick={() => agregarPieza(p)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="autocomplete-item-title">
                                {p.nombre} {isOferta && <span style={{color:'#F59E0B', fontSize:'10px', marginLeft:'4px', fontWeight:'bold'}}>OFERTA</span>}
                              </span>
                              <span style={{ fontWeight: '700', color: '#134B82', fontSize: '13px' }}>Bs. {precioBs}</span>
                            </div>
                            <span className="autocomplete-item-subtitle">{p.marca} {p.modelo_auto} | Ref: ${precioBaseUsd.toFixed(2)} | Stock: {p.stock}</span>
                          </div>
                        );
                      })}
                      {filteredPiezasBusqueda.length === 0 && <div style={{ padding: '10px', fontSize: '12px', color: '#6B7280' }}>No se encontraron piezas disponibles</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Detalles Grid */}
              <div className="section-title">Detalle de Cotización</div>
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '4px', minHeight: '150px', marginBottom: '16px' }}>
                <table style={{ width: '100%' }}>
                  <thead style={{ background: '#F9FAFB' }}>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Pieza</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'center', borderBottom: '1px solid #E5E7EB', width: '50px' }}>Cant.</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #E5E7EB', width: '80px' }}>P.U. (Bs)</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #E5E7EB', width: '80px' }}>Sub. (Bs)</th>
                      <th style={{ padding: '8px', fontSize: '11px', textAlign: 'center', borderBottom: '1px solid #E5E7EB', width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px', fontSize: '12px', borderBottom: '1px solid #F3F4F6' }}>
                          <div style={{ fontWeight: '500' }}>{d.pieza.nombre}</div>
                          <div style={{ fontSize: '10px', color: '#6B7280' }}>{d.pieza.marca}</div>
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>
                          <input type="number" min="1" value={d.cantidad} onChange={(e) => actualizarDetalle(i, 'cantidad', e.target.value)} style={{ width: '40px', padding: '2px', textAlign: 'center', border: '1px solid #D1D5DB', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>
                          <input type="number" step="0.01" value={d.precio_unitario} onChange={(e) => actualizarDetalle(i, 'precio_unitario', e.target.value)} style={{ width: '60px', padding: '2px', textAlign: 'right', border: '1px solid #D1D5DB', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '8px', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid #F3F4F6', textAlign: 'right', color: '#134B82' }}>
                          {d.subtotal.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>
                          <button onClick={() => removerDetalle(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    ))}
                    {detalles.length === 0 && (
                      <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>Agregue ítems a la cotización</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                  TOTAL: Bs. {calcularTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="detail-group">
                <div className="detail-label">Observaciones</div>
                <div className="detail-value">
                  <textarea 
                    value={formData.observaciones} 
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    style={{ width: '100%', minHeight: '60px', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                    placeholder="Notas o condiciones de la cotización..."
                  />
                </div>
              </div>

              <div className="panel-actions">
                <button className="btn-save" onClick={handleSave}>GENERAR COTIZACIÓN</button>
                <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VISTA PARA IMPRESIÓN (CU10) */}
      {printData && (
        <div className="print-only cotizacion-print-container">
          <div className="cotizacion-print-header">
            <div>
              <h1 style={{ fontSize: '28px', color: '#134B82', marginBottom: '4px' }}>IPCB Import</h1>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Sistema Central de Logística</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Santa Cruz, Bolivia</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '24px', color: '#374151', textTransform: 'uppercase', marginBottom: '8px' }}>Cotización</h2>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Nro: {printData.numero_cotizacion || `COT-${printData.id_cotizacion.toString().padStart(4, '0')}`}</div>
              <div style={{ fontSize: '14px' }}>Fecha: {printData.fecha}</div>
            </div>
          </div>

          <div style={{ marginBottom: '30px', padding: '16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', color: '#374151', marginBottom: '8px', borderBottom: '1px solid #D1D5DB', paddingBottom: '4px' }}>Datos del Cliente</h3>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{printData.clientes?.nombre}</div>
          </div>

          <table className="cotizacion-print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '2px solid #D1D5DB', padding: '10px', textAlign: 'left', fontSize: '13px' }}>Cant.</th>
                <th style={{ borderBottom: '2px solid #D1D5DB', padding: '10px', textAlign: 'left', fontSize: '13px' }}>Descripción</th>
                <th style={{ borderBottom: '2px solid #D1D5DB', padding: '10px', textAlign: 'right', fontSize: '13px' }}>Precio Unit. (Bs)</th>
                <th style={{ borderBottom: '2px solid #D1D5DB', padding: '10px', textAlign: 'right', fontSize: '13px' }}>Subtotal (Bs)</th>
              </tr>
            </thead>
            <tbody>
              {printData.detalles?.map((d, i) => (
                <tr key={i}>
                  <td style={{ borderBottom: '1px solid #E5E7EB', padding: '12px 10px', textAlign: 'left', fontSize: '14px' }}>{d.cantidad}</td>
                  <td style={{ borderBottom: '1px solid #E5E7EB', padding: '12px 10px', textAlign: 'left', fontSize: '14px' }}>
                    <div style={{ fontWeight: '500' }}>{d.catalogo_piezas?.nombre}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{d.catalogo_piezas?.marca} {d.catalogo_piezas?.modelo_auto}</div>
                  </td>
                  <td style={{ borderBottom: '1px solid #E5E7EB', padding: '12px 10px', textAlign: 'right', fontSize: '14px' }}>{parseFloat(d.precio_unitario).toFixed(2)}</td>
                  <td style={{ borderBottom: '1px solid #E5E7EB', padding: '12px 10px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>{parseFloat(d.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: '60%', fontSize: '12px', color: '#6B7280' }}>
              <strong>Observaciones:</strong><br/>
              {printData.observaciones || 'Ninguna observación particular.'}
            </div>
            <div style={{ width: '30%', padding: '16px', border: '2px solid #134B82', borderRadius: '8px', textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>Total a Pagar</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#134B82' }}>Bs. {parseFloat(printData.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '11px', color: '#9CA3AF', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
            Documento generado por IPCB Import Central Logistics System. Este documento no es una factura fiscal válida a menos que se indique lo contrario.
          </div>
        </div>
      )}
    </>
  );
}
