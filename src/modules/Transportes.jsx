import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, X, Truck, Phone, Settings } from 'lucide-react';
import { useStore } from '../lib/store';

export default function Transportes({ addToast, userProfile }) {
  const [transportistas, setTransportistas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    placa_vehiculo: '',
    telefono: '',
    tipo_vehiculo: 'Camión',
    estado: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transportistas')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (!error && data) {
      setTransportistas(data);
    }
    setLoading(false);
  };

  const filteredData = transportistas.filter(t => 
    t.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (t.placa_vehiculo && t.placa_vehiculo.toLowerCase().includes(search.toLowerCase()))
  );

  const openPanel = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        nombre: item.nombre,
        placa_vehiculo: item.placa_vehiculo || '',
        telefono: item.telefono || '',
        tipo_vehiculo: item.tipo_vehiculo || 'Camión',
        estado: item.estado
      });
    } else {
      setSelectedItem(null);
      setFormData({
        nombre: '',
        placa_vehiculo: '',
        telefono: '',
        tipo_vehiculo: 'Camión',
        estado: true
      });
    }
    setIsPanelOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) return addToast('Error', 'El nombre es obligatorio', 'error');

    const payload = {
      ...formData,
      id_usuario: userProfile?.id || null
    };

    let error = null;

    if (selectedItem) {
      const res = await supabase.from('transportistas').update(payload).eq('id_transportista', selectedItem.id_transportista);
      error = res.error;
    } else {
      const res = await supabase.from('transportistas').insert([payload]);
      error = res.error;
    }

    if (error) {
      addToast('Error', 'No se pudo guardar el registro', 'error');
      console.error(error);
    } else {
      addToast('Éxito', 'Transportista guardado correctamente', 'success');
      setIsPanelOpen(false);
      fetchData();
    }
  };

  const toggleEstado = async (item) => {
    const { error } = await supabase.from('transportistas').update({ estado: !item.estado }).eq('id_transportista', item.id_transportista);
    if (!error) {
      fetchData();
    }
  };

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title"><Truck style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> Logística Nacional (Transportes)</h1>
        
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o placa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openPanel()}>
            <Plus size={18} /> NUEVO CHOFER
          </button>
        </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>NOMBRE / CHOFER</th>
              <th>PLACA</th>
              <th>VEHÍCULO</th>
              <th>CONTACTO</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Cargando...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No se encontraron transportistas.</td></tr>
            ) : (
              filteredData.map(t => (
                <tr key={t.id_transportista}>
                  <td style={{ fontWeight: 'bold' }}>{t.nombre}</td>
                  <td>
                    {t.placa_vehiculo ? (
                      <span style={{ padding: '4px 8px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold', color: '#334155' }}>
                        {t.placa_vehiculo}
                      </span>
                    ) : 'S/P'}
                  </td>
                  <td>{t.tipo_vehiculo}</td>
                  <td>
                    {t.telefono ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12}/> {t.telefono}</span> : 'S/T'}
                  </td>
                  <td>
                    <span 
                      onClick={() => toggleEstado(t)}
                      style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                        background: t.estado ? '#D1FAE5' : '#FEE2E2', 
                        color: t.estado ? '#047857' : '#B91C1C' 
                      }}
                    >
                      {t.estado ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openPanel(t)}><Edit2 size={12}/> EDITAR</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {isPanelOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>{selectedItem ? 'Editar Transportista' : 'Nuevo Transportista'}</span>
            <button className="panel-close" onClick={() => setIsPanelOpen(false)}><X size={18} /></button>
          </div>
          <div className="panel-content">
            <div className="section-title">DETALLES DEL TRANSPORTISTA</div>
            
            <div className="detail-group">
              <div className="detail-label">Nombre del Chofer o Empresa *</div>
              <div className="detail-value">
                <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej. Juan Carlos (Camión Propio)" />
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Placa del Vehículo</div>
              <div className="detail-value">
                <input type="text" value={formData.placa_vehiculo} onChange={e => setFormData({...formData, placa_vehiculo: e.target.value.toUpperCase()})} placeholder="Ej. 1234-ABC" />
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Teléfono de Contacto</div>
              <div className="detail-value">
                <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} placeholder="Ej. 77712345" />
              </div>
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Tipo de Vehículo</div>
              <div className="detail-value">
                <select value={formData.tipo_vehiculo} onChange={e => setFormData({...formData, tipo_vehiculo: e.target.value})} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' }}>
                  <option value="Camión">Camión</option>
                  <option value="Furgoneta">Furgoneta</option>
                  <option value="Motocicleta">Motocicleta</option>
                  <option value="Camioneta">Camioneta</option>
                  <option value="Tercerizado">Servicio Tercerizado</option>
                </select>
              </div>
            </div>
            
            <div className="detail-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input type="checkbox" checked={formData.estado} onChange={e => setFormData({...formData, estado: e.target.checked})} id="est-chk" />
              <label htmlFor="est-chk" style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Chofer Activo (Disponible para entregas)</label>
            </div>
          </div>
          <div className="panel-actions" style={{ padding: '0 20px 20px 20px' }}>
            <button className="btn-cancel" onClick={() => setIsPanelOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSave}>Guardar Transportista</button>
          </div>
        </div>
      )}
    </div>
  );
}
