import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, DollarSign, CreditCard, User, FileText, Briefcase, Calendar } from 'lucide-react';
import { useStore } from '../lib/store';

export default function Finanzas({ addToast, userProfile }) {
  const [activeTab, setActiveTab] = useState('COBRANZAS');
  
  // Data States
  const [pagos, setPagos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchPagos, setSearchPagos] = useState('');
  const [searchGastos, setSearchGastos] = useState('');

  // Modals
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);

  // Form states
  const [formPago, setFormPago] = useState({
    numero_recibo: '',
    id_cliente: '',
    id_nota: '',
    monto: 0,
    metodo_pago: 'Efectivo',
    referencia: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  const [formGasto, setFormGasto] = useState({
    concepto: '',
    monto: 0,
    categoria: 'Estibadores',
    fecha: new Date().toISOString().split('T')[0],
    comprobante: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'COBRANZAS') {
      const { data: pData } = await supabase.from('finanzas_pagos').select('*, clientes(nombre)').order('fecha', { ascending: false });
      const { data: cData } = await supabase.from('clientes').select('id_cliente, nombre').eq('estado', true);
      setPagos(pData || []);
      setClientes(cData || []);
    } else {
      const { data: gData } = await supabase.from('gastos_operativos').select('*').order('fecha', { ascending: false });
      setGastos(gData || []);
    }
    setLoading(false);
  };

  const handleSavePago = async () => {
    if (!formPago.id_cliente || formPago.monto <= 0) return addToast('Error', 'Cliente y Monto son obligatorios', 'error');
    if (!formPago.numero_recibo) formPago.numero_recibo = 'REC-' + Date.now();

    const payload = { ...formPago, id_usuario: userProfile.id };
    if(!payload.id_nota) delete payload.id_nota;

    const { error } = await supabase.from('finanzas_pagos').insert([payload]);
    
    if (error) {
      addToast('Error', 'No se pudo guardar el pago', 'error');
    } else {
      addToast('Éxito', 'Pago registrado correctamente', 'success');
      setIsPagoModalOpen(false);
      fetchData();
    }
  };

  const handleSaveGasto = async () => {
    if (!formGasto.concepto || formGasto.monto <= 0) return addToast('Error', 'Concepto y Monto son obligatorios', 'error');

    const payload = { ...formGasto, id_usuario: userProfile.id };
    const { error } = await supabase.from('gastos_operativos').insert([payload]);
    
    if (error) {
      addToast('Error', 'No se pudo registrar el gasto', 'error');
    } else {
      addToast('Éxito', 'Gasto registrado correctamente', 'success');
      setIsGastoModalOpen(false);
      fetchData();
    }
  };

  // Resumen Finanzas
  const totalIngresos = pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title"><DollarSign style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> Caja y Finanzas</h1>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('COBRANZAS')}
            style={{ flex: 1, padding: '12px', background: activeTab === 'COBRANZAS' ? '#10B981' : '#F1F5F9', color: activeTab === 'COBRANZAS' ? 'white' : '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <CreditCard size={18} /> COBRANZAS (INGRESOS)
          </button>
          <button 
            onClick={() => setActiveTab('GASTOS')}
            style={{ flex: 1, padding: '12px', background: activeTab === 'GASTOS' ? '#EF4444' : '#F1F5F9', color: activeTab === 'GASTOS' ? 'white' : '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Briefcase size={18} /> GASTOS OPERATIVOS (CAJA CHICA)
          </button>
        </div>

      {activeTab === 'COBRANZAS' && (
        <>
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} color="#9CA3AF" />
              <input type="text" placeholder="Buscar pago o cliente..." value={searchPagos} onChange={e => setSearchPagos(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ background: '#10B981', border: 'none' }} onClick={() => setIsPagoModalOpen(true)}>
              <Plus size={18} /> NUEVO INGRESO
            </button>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>RECIBO</th>
                  <th>CLIENTE</th>
                  <th>FECHA</th>
                  <th>MÉTODO</th>
                  <th>MONTO</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                ) : pagos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No hay pagos registrados.</td></tr>
                ) : pagos.filter(p => p.numero_recibo.includes(searchPagos) || p.clientes?.nombre?.toLowerCase().includes(searchPagos.toLowerCase())).map(p => (
                  <tr key={p.id_pago}>
                    <td style={{ fontWeight: 'bold' }}>{p.numero_recibo}</td>
                    <td>{p.clientes?.nombre}</td>
                    <td>{p.fecha}</td>
                    <td><span style={{ padding: '4px 8px', background: '#F1F5F9', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{p.metodo_pago}</span></td>
                    <td style={{ fontWeight: 'bold', color: '#10B981' }}>+ Bs. {parseFloat(p.monto).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'GASTOS' && (
        <>
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} color="#9CA3AF" />
              <input type="text" placeholder="Buscar gasto..." value={searchGastos} onChange={e => setSearchGastos(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ background: '#EF4444', border: 'none' }} onClick={() => setIsGastoModalOpen(true)}>
              <Plus size={18} /> REGISTRAR GASTO
            </button>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>CATEGORÍA</th>
                  <th>CONCEPTO</th>
                  <th>COMPROBANTE</th>
                  <th>MONTO</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                ) : gastos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No hay gastos registrados.</td></tr>
                ) : gastos.filter(g => g.concepto.toLowerCase().includes(searchGastos.toLowerCase())).map(g => (
                  <tr key={g.id_gasto}>
                    <td>{g.fecha}</td>
                    <td><span style={{ padding: '4px 8px', background: '#FEF2F2', color: '#991B1B', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{g.categoria}</span></td>
                    <td>{g.concepto}</td>
                    <td>{g.comprobante || 'N/A'}</td>
                    <td style={{ fontWeight: 'bold', color: '#EF4444' }}>- Bs. {parseFloat(g.monto).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* Modal Nuevo Pago */}
      {isPagoModalOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>Registrar Pago (Ingreso)</span>
            <button className="panel-close" onClick={() => setIsPagoModalOpen(false)}><X size={18} /></button>
          </div>
          
          <div className="panel-content">
            <div className="section-title">DETALLES DEL INGRESO</div>
            
            <div className="detail-group">
              <div className="detail-label">Cliente *</div>
              <div className="detail-value">
                <select value={formPago.id_cliente} onChange={e => setFormPago({...formPago, id_cliente: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' }}>
                  <option value="">Selecciona Cliente...</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Monto (Bs) *</div>
              <div className="detail-value">
                <input type="number" value={formPago.monto} onChange={e => setFormPago({...formPago, monto: e.target.value})} />
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Método *</div>
              <div className="detail-value">
                <select value={formPago.metodo_pago} onChange={e => setFormPago({...formPago, metodo_pago: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' }}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Referencia (Nro Banco/Cheque)</div>
              <div className="detail-value">
                <input type="text" value={formPago.referencia} onChange={e => setFormPago({...formPago, referencia: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="panel-actions" style={{ padding: '0 20px 20px 20px' }}>
            <button className="btn-cancel" onClick={() => setIsPagoModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSavePago}>Guardar Pago</button>
          </div>
        </div>
      )}

      {/* Modal Nuevo Gasto */}
      {isGastoModalOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>Registrar Gasto Operativo</span>
            <button className="panel-close" onClick={() => setIsGastoModalOpen(false)}><X size={18} /></button>
          </div>
          
          <div className="panel-content">
            <div className="section-title">DETALLES DEL GASTO</div>
            
            <div className="detail-group">
              <div className="detail-label">Categoría *</div>
              <div className="detail-value">
                <select value={formGasto.categoria} onChange={e => setFormGasto({...formGasto, categoria: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' }}>
                  <option value="Estibadores">Pago a Estibadores/Cargadores</option>
                  <option value="Transporte Local">Transporte Local</option>
                  <option value="Servicios Básicos">Servicios (Luz, Agua, Internet)</option>
                  <option value="Alquiler">Alquiler de Galpón/Oficina</option>
                  <option value="Mantenimiento">Mantenimiento de Vehículos</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Concepto Detallado *</div>
              <div className="detail-value">
                <input type="text" placeholder="Ej. Descarga contenedor 2456" value={formGasto.concepto} onChange={e => setFormGasto({...formGasto, concepto: e.target.value})} />
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Monto (Bs) *</div>
              <div className="detail-value">
                <input type="number" value={formGasto.monto} onChange={e => setFormGasto({...formGasto, monto: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="panel-actions" style={{ padding: '0 20px 20px 20px' }}>
            <button className="btn-cancel" onClick={() => setIsGastoModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSaveGasto}>Guardar Gasto</button>
          </div>
        </div>
      )}
    </div>
  );
}
