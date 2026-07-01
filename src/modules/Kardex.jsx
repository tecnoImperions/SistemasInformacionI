import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, History, ArrowRight, ArrowLeft, Archive, Plus, X } from 'lucide-react';
import { useStore } from '../lib/store';

export default function Kardex({ addToast, userProfile }) {
  const [movimientos, setMovimientos] = useState([]);
  const [piezas, setPiezas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formAjuste, setFormAjuste] = useState({
    id_pieza: '',
    tipo_movimiento: 'AJUSTE',
    cantidad: 1,
    motivo: 'Ajuste manual de inventario'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: mData } = await supabase.from('kardex_inventario')
      .select('*, catalogo_piezas(nombre, stock)')
      .order('fecha', { ascending: false })
      .limit(200);
      
    const { data: pData } = await supabase.from('catalogo_piezas').select('id_pieza, nombre, stock').eq('disponible', true);
    
    setMovimientos(mData || []);
    setPiezas(pData || []);
    setLoading(false);
  };

  const filteredMovimientos = movimientos.filter(m => 
    m.catalogo_piezas?.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    m.motivo.toLowerCase().includes(search.toLowerCase())
  );

  const handleGuardarAjuste = async () => {
    if (!formAjuste.id_pieza || formAjuste.cantidad <= 0) return addToast('Error', 'Pieza y cantidad son requeridos', 'error');

    // Obtener stock actual real
    const piezaActual = piezas.find(p => p.id_pieza == formAjuste.id_pieza);
    if (!piezaActual) return addToast('Error', 'Pieza no encontrada', 'error');

    let nuevoStock = piezaActual.stock;
    if (formAjuste.tipo_movimiento === 'ENTRADA' || formAjuste.tipo_movimiento === 'AJUSTE') {
      nuevoStock += parseInt(formAjuste.cantidad);
    } else {
      nuevoStock -= parseInt(formAjuste.cantidad);
    }

    // 1. Insertar Kardex
    const payload = {
      id_pieza: formAjuste.id_pieza,
      tipo_movimiento: formAjuste.tipo_movimiento,
      cantidad: formAjuste.cantidad,
      motivo: formAjuste.motivo,
      saldo_actual: nuevoStock,
      id_usuario: userProfile.id
    };

    const resKardex = await supabase.from('kardex_inventario').insert([payload]);
    if (resKardex.error) return addToast('Error', 'No se pudo guardar el Kardex', 'error');

    // 2. Actualizar Stock Maestro
    await supabase.from('catalogo_piezas').update({ stock: nuevoStock }).eq('id_pieza', formAjuste.id_pieza);

    addToast('Éxito', 'Movimiento registrado y stock actualizado', 'success');
    setIsModalOpen(false);
    fetchData();
  };

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title"><History style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> Kardex de Inventario</h1>
        
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#9CA3AF" />
            <input type="text" placeholder="Buscar por pieza, motivo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> AJUSTE MANUAL
          </button>
        </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>FECHA Y HORA</th>
              <th>CÓDIGO / PIEZA</th>
              <th>MOVIMIENTO</th>
              <th>CANTIDAD</th>
              <th>MOTIVO</th>
              <th>SALDO (STOCK)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Cargando Kardex...</td></tr>
            ) : filteredMovimientos.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No hay movimientos recientes.</td></tr>
            ) : (
              filteredMovimientos.map(m => (
                <tr key={m.id_kardex}>
                  <td style={{ fontSize: '12px', color: '#4B5563' }}>{new Date(m.fecha).toLocaleString()}</td>
                  <td style={{ fontWeight: 'bold' }}>{m.catalogo_piezas?.nombre}</td>
                  <td>
                    {m.tipo_movimiento === 'ENTRADA' && <span style={{ padding: '4px 8px', background: '#D1FAE5', color: '#047857', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', width: 'fit-content', gap: '4px' }}><ArrowRight size={12}/> ENTRADA</span>}
                    {m.tipo_movimiento === 'SALIDA' && <span style={{ padding: '4px 8px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', width: 'fit-content', gap: '4px' }}><ArrowLeft size={12}/> SALIDA</span>}
                    {m.tipo_movimiento === 'AJUSTE' && <span style={{ padding: '4px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', width: 'fit-content', gap: '4px' }}><Archive size={12}/> AJUSTE</span>}
                  </td>
                  <td style={{ fontWeight: 'bold', color: m.tipo_movimiento === 'SALIDA' ? '#EF4444' : '#10B981' }}>
                    {m.tipo_movimiento === 'SALIDA' ? '-' : '+'}{m.cantidad}
                  </td>
                  <td style={{ fontSize: '12px', color: '#6B7280' }}>{m.motivo}</td>
                  <td style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.saldo_actual}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {isModalOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>Ajuste Manual de Inventario</span>
            <button className="panel-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
          </div>
          
          <div className="panel-content">
            <div className="section-title">DETALLES DEL AJUSTE</div>
            
            <div className="detail-group">
              <div className="detail-label">Seleccione la Pieza *</div>
              <div className="detail-value">
                <select value={formAjuste.id_pieza} onChange={e => setFormAjuste({...formAjuste, id_pieza: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' }}>
                  <option value="">Buscar pieza...</option>
                  {piezas.map(p => <option key={p.id_pieza} value={p.id_pieza}>{p.nombre} (Stock: {p.stock})</option>)}
                </select>
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Tipo de Ajuste</div>
              <div className="detail-value">
                <select value={formAjuste.tipo_movimiento} onChange={e => setFormAjuste({...formAjuste, tipo_movimiento: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' }}>
                  <option value="AJUSTE">AJUSTE POSITIVO (+)</option>
                  <option value="SALIDA">BAJA POR DAÑO/PÉRDIDA (-)</option>
                </select>
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Cantidad *</div>
              <div className="detail-value">
                <input type="number" value={formAjuste.cantidad} onChange={e => setFormAjuste({...formAjuste, cantidad: e.target.value})} min="1" />
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Motivo *</div>
              <div className="detail-value">
                <input type="text" value={formAjuste.motivo} onChange={e => setFormAjuste({...formAjuste, motivo: e.target.value})} placeholder="Ej. Inventario inicial / Producto dañado" />
              </div>
            </div>
          </div>

          <div className="panel-actions" style={{ padding: '0 20px 20px 20px' }}>
            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleGuardarAjuste}>Procesar Ajuste</button>
          </div>
        </div>
      )}
    </div>
  );
}
