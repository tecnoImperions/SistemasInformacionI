import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, X, ChevronUp, Package, Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function Contenedores({ addToast }) {
  const [contenedores, setContenedores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedContenedor, setSelectedContenedor] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo_serial: '',
    fecha_llegada: '',
    estado_distribucion: 'En Tránsito'
  });

  const ESTADOS_DISPONIBLES = [
    'En Origen',
    'En Tránsito',
    'En Aduana',
    'Recibido',
    'En Almacén'
  ];

  useEffect(() => {
    fetchContenedores();
  }, []);

  const fetchContenedores = async () => {
    const { data, error } = await supabase
      .from('contenedores')
      .select('*')
      .order('id_contenedor', { ascending: false });
      
    if (error) {
      addToast('Error', 'No se pudieron cargar los contenedores.', 'error');
    } else {
      setContenedores(data || []);
    }
  };

  const filteredContenedores = contenedores.filter(c => 
    (c.codigo_serial && c.codigo_serial.toLowerCase().includes(search.toLowerCase())) ||
    (c.estado_distribucion && c.estado_distribucion.toLowerCase().includes(search.toLowerCase()))
  );

  const openPanel = (contenedor = null) => {
    if (contenedor) {
      setSelectedContenedor(contenedor);
      setFormData({
        codigo_serial: contenedor.codigo_serial || '',
        fecha_llegada: contenedor.fecha_llegada || '',
        estado_distribucion: contenedor.estado_distribucion || 'En Tránsito'
      });
    } else {
      setSelectedContenedor(null);
      setFormData({
        codigo_serial: '',
        fecha_llegada: new Date().toISOString().split('T')[0],
        estado_distribucion: 'En Tránsito'
      });
    }
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedContenedor(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.codigo_serial.trim()) {
      addToast('Error', 'El código serial es obligatorio.', 'error');
      return;
    }

    if (selectedContenedor) {
      const { error } = await supabase
        .from('contenedores')
        .update({
          codigo_serial: formData.codigo_serial,
          fecha_llegada: formData.fecha_llegada || null,
          estado_distribucion: formData.estado_distribucion
        })
        .eq('id_contenedor', selectedContenedor.id_contenedor);
        
      if (!error) {
        fetchContenedores();
        closePanel();
        addToast('Éxito', 'Contenedor actualizado correctamente.', 'success');
      } else {
        addToast('Error', error.message.includes('unique') ? 'El código serial ya existe.' : 'No se pudo actualizar.', 'error');
      }
    } else {
      const { error } = await supabase
        .from('contenedores')
        .insert([{
          codigo_serial: formData.codigo_serial,
          fecha_llegada: formData.fecha_llegada || null,
          estado_distribucion: formData.estado_distribucion
        }]);
        
      if (!error) {
        fetchContenedores();
        closePanel();
        addToast('Éxito', 'Contenedor registrado correctamente.', 'success');
      } else {
        addToast('Error', error.message.includes('unique') ? 'El código serial ya existe.' : 'No se pudo registrar.', 'error');
      }
    }
  };

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'En Tránsito': return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'En Aduana': return { bg: '#FEF3C7', text: '#92400E' };
      case 'Recibido': 
      case 'En Almacén': return { bg: '#D1FAE5', text: '#065F46' };
      case 'En Origen': return { bg: '#F3F4F6', text: '#374151' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title">RF02: Gestión de Contenedores</h1>
        
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Buscar por código serial o estado..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openPanel()}>
            <Plus size={18} /> NUEVO CONTENEDOR
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID &uarr;</th>
                <th>CÓDIGO SERIAL</th>
                <th>FECHA DE LLEGADA</th>
                <th>ESTADO DISTRIBUCIÓN</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredContenedores.map((contenedor) => {
                const colors = getStatusColor(contenedor.estado_distribucion);
                return (
                  <tr key={contenedor.id_contenedor}>
                    <td>{contenedor.id_contenedor}</td>
                    <td style={{ fontWeight: '600', color: '#134B82' }}>{contenedor.codigo_serial}</td>
                    <td>{contenedor.fecha_llegada ? new Date(contenedor.fecha_llegada).toLocaleDateString() : 'Por definir'}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: colors.bg,
                        color: colors.text
                      }}>
                        {contenedor.estado_distribucion || 'Desconocido'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-action btn-edit" onClick={() => openPanel(contenedor)}>
                        <Edit2 size={12} /> DETALLES
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredContenedores.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    No hay contenedores registrados o no coinciden con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Panel */}
      {isPanelOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>Gestión de Contenedor</span>
            <button className="panel-close" onClick={closePanel}>
              <X size={18} />
            </button>
          </div>
          
          <div className="panel-content">
            <div className="section-title">
              INFORMACIÓN <ChevronUp size={16} />
            </div>
            
            <div className="detail-group">
              <div className="detail-label">Código Serial</div>
              <div className="detail-value">
                <input 
                  type="text" 
                  name="codigo_serial" 
                  value={formData.codigo_serial} 
                  onChange={handleFormChange}
                  placeholder="Ej. MSCU1234567"
                  autoFocus
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Fecha Estimada/Real de Llegada</div>
              <div className="detail-value">
                <input 
                  type="date" 
                  name="fecha_llegada" 
                  value={formData.fecha_llegada} 
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Estado de Distribución</div>
              <div className="detail-value">
                <select 
                  name="estado_distribucion" 
                  value={formData.estado_distribucion} 
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  {ESTADOS_DISPONIBLES.map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="panel-actions">
              <button className="btn-save" onClick={handleSave}>GUARDAR CAMBIOS</button>
              <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
            </div>

            <div className="section-title" style={{ marginTop: '32px' }}>
              TRAZABILIDAD <ChevronUp size={16} />
            </div>
            
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4B5563', fontSize: '12px' }}>
                <Clock size={14} /> Historial de Movimientos
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', paddingLeft: '22px', borderLeft: '2px solid #E5E7EB', marginLeft: '6px' }}>
                <p style={{ marginBottom: '8px' }}>El contenedor no tiene historial registrado aún.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
