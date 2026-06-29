import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, X, ChevronUp, Map as MapIcon, BarChart, Database, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const COUNTRIES = [
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+34', name: 'España', flag: '🇪🇸' },
  { code: '+1', name: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+1787', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: '+1809', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
];

export default function Clientes({ addToast, userProfile }) {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [clienteToDisable, setClienteToDisable] = useState(null);
  
  // Tabs State
  const [topTab, setTopTab] = useState('DETALLES');
  const [bottomTab, setBottomTab] = useState('DETALLES');

  // Country Dropdown State
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_pais: '+591',
    telefono_numero: '',
    email: '',
    empresa: '',
    direccion: '',
    latitud: '-17.7833',
    longitud: '-63.1821',
    estado: true,
    notas_extras: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('id_cliente', { ascending: true });
      
    if (error) {
      addToast('Error', 'No se pudieron cargar los clientes.', 'error');
    } else {
      setClientes(data || []);
    }
  };

  const filteredClientes = clientes.filter(c => 
    (c.nombre && c.nombre.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.telefono && c.telefono.includes(search))
  );

  const openPanel = (cliente = null) => {
    if (cliente) {
      setSelectedCliente(cliente);
      
      let codigo = '+591';
      let numero = cliente.telefono || '';
      
      if (numero.startsWith('+')) {
        const parts = numero.split(' ');
        if (parts.length > 1) {
          codigo = parts[0];
          numero = parts.slice(1).join(' ');
        }
      }

      setFormData({
        nombre: cliente.nombre || '',
        codigo_pais: codigo,
        telefono_numero: numero,
        email: cliente.email || '',
        empresa: cliente.empresa || '',
        direccion: cliente.direccion || '',
        latitud: cliente.latitud || '-17.7833',
        longitud: cliente.longitud || '-63.1821',
        estado: cliente.estado,
        notas_extras: ''
      });
    } else {
      setSelectedCliente(null);
      setFormData({
        nombre: '',
        codigo_pais: '+591',
        telefono_numero: '',
        email: '',
        empresa: '',
        direccion: '',
        latitud: '-17.7833',
        longitud: '-63.1821',
        estado: true,
        notas_extras: ''
      });
    }
    setTopTab('DETALLES');
    setBottomTab('DETALLES');
    setIsPanelOpen(true);
    setShowCountryDropdown(false);
    setCountrySearch('');
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedCliente(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      addToast('Error', 'El nombre es obligatorio.', 'error');
      return;
    }

    const fullPhone = formData.telefono_numero.trim() 
      ? `${formData.codigo_pais} ${formData.telefono_numero.trim()}` 
      : '';

    if (selectedCliente) {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: formData.nombre,
          telefono: fullPhone,
          email: formData.email,
          empresa: formData.empresa,
          direccion: formData.direccion,
          latitud: formData.latitud,
          longitud: formData.longitud
        })
        .eq('id_cliente', selectedCliente.id_cliente);
        
      if (!error) {
        fetchClientes();
        closePanel();
        addToast('Éxito', 'Cliente actualizado correctamente.', 'success');
      } else {
        addToast('Error', 'No se pudo actualizar el cliente.', 'error');
      }
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert([{
          nombre: formData.nombre,
          telefono: fullPhone,
          email: formData.email,
          empresa: formData.empresa,
          direccion: formData.direccion,
          latitud: formData.latitud,
          longitud: formData.longitud,
          estado: true,
          usuario_id: userProfile?.id || null // Add user id
        }]);
        
      if (!error) {
        fetchClientes();
        closePanel();
        addToast('Éxito', 'Cliente registrado correctamente.', 'success');
      } else {
        addToast('Error', 'No se pudo registrar el cliente.', 'error');
      }
    }
  };

  const handleDisable = async () => {
    if (clienteToDisable) {
      const nuevoEstado = !clienteToDisable.estado;
      const { error } = await supabase
        .from('clientes')
        .update({ estado: nuevoEstado })
        .eq('id_cliente', clienteToDisable.id_cliente);
        
      if (!error) {
        fetchClientes();
        addToast('Éxito', nuevoEstado ? 'Cliente habilitado correctamente.' : 'Cliente deshabilitado correctamente.', 'success');
      } else {
        addToast('Error', 'No se pudo cambiar el estado del cliente.', 'error');
      }
    }
    setDisableModalOpen(false);
    setClienteToDisable(null);
  };

  const currentCountry = COUNTRIES.find(c => c.code === formData.codigo_pais) || { flag: '🌐', code: formData.codigo_pais };
  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title">RF01: Gestión de Clientes</h1>
        
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Nombre / Email / Teléfono" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openPanel()}>
            <Plus size={18} /> REGISTRAR NUEVO CLIENTE
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID &uarr;</th>
                <th>NOMBRE</th>
                <th>TELÉFONO</th>
                <th>EMAIL</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id_cliente}>
                  <td>{cliente.id_cliente}</td>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.telefono || '-'}</td>
                  <td>{cliente.email || '-'}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: cliente.estado ? '#D1FAE5' : '#FEE2E2',
                      color: cliente.estado ? '#065F46' : '#991B1B'
                    }}>
                      {cliente.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openPanel(cliente)}>
                      <Edit2 size={12} /> MODIFICAR
                    </button>
                    <button className="btn-action btn-disable" onClick={() => {
                      setClienteToDisable(cliente);
                      setDisableModalOpen(true);
                    }}>
                      {cliente.estado ? 'DESHABILITAR' : 'HABILITAR'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    No hay clientes registrados o no coinciden con la búsqueda.
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
            <span>Panel de Acción</span>
            <button className="panel-close" onClick={closePanel}>
              <X size={18} />
            </button>
          </div>
          
          <div className="panel-tabs">
            <div 
              className={`panel-tab ${topTab === 'DETALLES' ? 'active' : ''}`}
              onClick={() => setTopTab('DETALLES')}
            >
              DETALLES
            </div>
            <div 
              className={`panel-tab ${topTab === 'FORMULARIO' ? 'active' : ''}`}
              onClick={() => setTopTab('FORMULARIO')}
            >
              FORMULARIO
            </div>
          </div>

          <div className="panel-content">
            {topTab === 'DETALLES' && (
              <>
                <div className="section-title">
                  DETALLES DEL CLIENTE <ChevronUp size={16} />
                </div>
                
                <div className="detail-group">
                  <div className="detail-label">Nombre</div>
                  <div className="detail-value">
                    <input 
                      type="text" 
                      name="nombre" 
                      value={formData.nombre} 
                      onChange={handleFormChange}
                      placeholder="Ingrese nombre"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">Teléfono</div>
                  <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    
                    {/* CUSTOM COUNTRY SEARCH DROPDOWN */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                      <div 
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '6px', 
                          cursor: 'pointer', 
                          padding: '6px 8px', 
                          borderBottom: '1px solid #D1D5DB', 
                          width: '85px', 
                          fontSize: '13px',
                          fontWeight: '500',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '4px 4px 0 0'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{currentCountry.flag}</span>
                        <span>{currentCountry.code}</span>
                        <ChevronDown size={14} color="#6B7280" />
                      </div>
                      
                      {showCountryDropdown && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          zIndex: 50, 
                          background: '#FFF', 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '6px', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                          width: '240px', 
                          maxHeight: '260px', 
                          display: 'flex', 
                          flexDirection: 'column',
                          marginTop: '4px'
                        }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, background: '#FFF', borderRadius: '6px 6px 0 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #D1D5DB', borderRadius: '4px', padding: '4px 8px' }}>
                              <Search size={14} color="#9CA3AF" />
                              <input 
                                type="text" 
                                placeholder="Buscar país o código..." 
                                value={countrySearch}
                                onChange={e => setCountrySearch(e.target.value)}
                                autoFocus
                                style={{ width: '100%', fontSize: '13px', padding: '4px', border: 'none', outline: 'none', marginLeft: '6px' }}
                              />
                            </div>
                          </div>
                          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                            {filteredCountries.map(c => (
                              <div 
                                key={c.code}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, codigo_pais: c.code }));
                                  setShowCountryDropdown(false);
                                  setCountrySearch('');
                                }}
                                style={{ 
                                  padding: '8px 12px', 
                                  fontSize: '13px', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  gap: '12px',
                                  alignItems: 'center',
                                  borderRadius: '4px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <span style={{ fontSize: '16px' }}>{c.flag}</span>
                                <span style={{ flex: 1, fontWeight: '500', color: '#374151' }}>{c.name}</span>
                                <span style={{ color: '#6B7280', fontSize: '12px' }}>{c.code}</span>
                              </div>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div style={{ padding: '12px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
                                No se encontraron resultados
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <input 
                      type="text" 
                      name="telefono_numero" 
                      value={formData.telefono_numero} 
                      onChange={handleFormChange}
                      placeholder="Ej. 12345678"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">Email</div>
                  <div className="detail-value">
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleFormChange}
                      placeholder="Ingrese email"
                    />
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">Empresa</div>
                  <div className="detail-value">
                    <input 
                      type="text" 
                      name="empresa" 
                      value={formData.empresa} 
                      onChange={handleFormChange}
                      placeholder="Ej. CAR B"
                    />
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">Dirección</div>
                  <div className="detail-value">
                    <input 
                      type="text" 
                      name="direccion" 
                      value={formData.direccion} 
                      onChange={handleFormChange}
                      placeholder="Ej. Santa Cruz..."
                    />
                  </div>
                </div>

                <div className="panel-actions">
                  <button className="btn-save" onClick={handleSave}>GUARDAR CAMBIOS</button>
                  <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
                </div>

                {/* Sub-tabs */}
                <div className="panel-tabs" style={{ marginTop: '24px', marginBottom: '16px' }}>
                  <div 
                    className={`panel-tab ${bottomTab === 'DETALLES' ? 'active' : ''}`}
                    onClick={() => setBottomTab('DETALLES')}
                  >
                    DETALLES
                  </div>
                  <div 
                    className={`panel-tab ${bottomTab === 'GRÁFICOS' ? 'active' : ''}`}
                    onClick={() => setBottomTab('GRÁFICOS')}
                  >
                    GRÁFICOS
                  </div>
                  <div 
                    className={`panel-tab ${bottomTab === 'MAPA' ? 'active' : ''}`}
                    onClick={() => setBottomTab('MAPA')}
                  >
                    MAPA
                  </div>
                </div>

                {bottomTab === 'DETALLES' && (
                  <>
                    <div className="section-title">
                      ESTADÍSTICAS <ChevronUp size={16} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Database size={16} /> No hay datos de transacciones recientes.
                    </div>
                  </>
                )}
                
                {bottomTab === 'GRÁFICOS' && (
                  <>
                    <div className="section-title">
                      HISTÓRICO <ChevronUp size={16} />
                    </div>
                    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px dashed #D1D5DB' }}>
                      <BarChart size={32} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '12px', color: '#6B7280' }}>Gráfico de compras no disponible</p>
                    </div>
                  </>
                )}

                {bottomTab === 'MAPA' && (
                  <>
                    <div className="section-title" style={{ marginBottom: '16px' }}>
                      UBICACIÓN LOGÍSTICA <ChevronUp size={16} />
                    </div>
                    
                    <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1E293B', fontWeight: '700', fontSize: '14px' }}>
                        <MapIcon size={18} color="#3B82F6" /> Coordenadas de Entrega
                      </div>
                      
                      <div style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '2px solid #FFF' }}>
                        <MapContainer 
                          center={[parseFloat(formData.latitud) || -17.7833, parseFloat(formData.longitud) || -63.1821]} 
                          zoom={13} 
                          style={{ height: '100%', width: '100%', zIndex: 1 }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          />
                          <Marker position={[parseFloat(formData.latitud) || -17.7833, parseFloat(formData.longitud) || -63.1821]}>
                            <Popup>
                              <div style={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '4px' }}>{formData.nombre || 'Nuevo Cliente'}</div>
                              <div style={{ fontSize: '12px', color: '#475569' }}>{formData.direccion}</div>
                            </Popup>
                          </Marker>
                        </MapContainer>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '6px' }}>Latitud</label>
                          <input 
                            type="text" 
                            name="latitud" 
                            value={formData.latitud} 
                            onChange={handleFormChange} 
                            placeholder="-17.7833" 
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', outline: 'none', background: '#FFF' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', display: 'block', marginBottom: '6px' }}>Longitud</label>
                          <input 
                            type="text" 
                            name="longitud" 
                            value={formData.longitud} 
                            onChange={handleFormChange} 
                            placeholder="-63.1821" 
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', outline: 'none', background: '#FFF' }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {topTab === 'FORMULARIO' && (
              <>
                <div className="section-title">
                  DATOS EXTRAS <ChevronUp size={16} />
                </div>
                
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
                  Aquí puedes agregar información adicional relacionada con los perfiles o configuraciones específicas del cliente.
                </p>

                <div className="detail-group">
                  <div className="detail-label">Notas Adicionales</div>
                  <div className="detail-value">
                    <textarea 
                      name="notas_extras" 
                      value={formData.notas_extras} 
                      onChange={handleFormChange}
                      placeholder="Ingrese notas o direcciones alternativas..."
                      style={{ 
                        width: '100%', 
                        minHeight: '80px', 
                        border: '1px solid #E5E7EB', 
                        borderRadius: '4px',
                        padding: '8px',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                <div className="panel-actions">
                  <button className="btn-save" onClick={handleSave}>GUARDAR EXTRAS</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {disableModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">
              ¿{clienteToDisable?.estado ? 'Deshabilitar' : 'Habilitar'} Cliente?
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
              El cliente pasará a estado {clienteToDisable?.estado ? 'Inactivo' : 'Activo'}.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-yes" onClick={handleDisable}>SÍ</button>
              <button className="modal-btn-no" onClick={() => setDisableModalOpen(false)}>NO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
