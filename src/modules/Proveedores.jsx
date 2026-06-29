import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, X, ChevronUp, ChevronDown } from 'lucide-react';

const COUNTRIES = [
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+81', name: 'Japón', flag: '🇯🇵' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+82', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: '+49', name: 'Alemania', flag: '🇩🇪' },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '+886', name: 'Taiwán', flag: '🇹🇼' },
  { code: '+52', name: 'México', flag: '🇲🇽' }
];

export default function Proveedores({ addToast }) {
  const [proveedores, setProveedores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [proveedorToDisable, setProveedorToDisable] = useState(null);
  
  // Tabs State
  const [topTab, setTopTab] = useState('DETALLES');

  // Country Search State
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono_numero: '',
    codigo_pais: '+591',
    email: '',
    pais: 'Bolivia',
    estado: true
  });

  useEffect(() => {
    fetchProveedores();

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProveedores = async () => {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('id_proveedor', { ascending: true });
      
    if (error) {
      addToast('Error', 'No se pudieron cargar los proveedores.', 'error');
    } else {
      setProveedores(data || []);
    }
  };

  const filteredProveedores = proveedores.filter(p => 
    (p.nombre && p.nombre.toLowerCase().includes(search.toLowerCase())) ||
    (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
    (p.pais && p.pais.toLowerCase().includes(search.toLowerCase()))
  );

  const openPanel = (proveedor = null) => {
    if (proveedor) {
      setSelectedProveedor(proveedor);

      let codigo = '+591';
      let numero = proveedor.telefono || '';
      
      if (numero.startsWith('+')) {
        const parts = numero.split(' ');
        if (parts.length > 1) {
          codigo = parts[0];
          numero = parts.slice(1).join(' ');
        }
      }

      setFormData({
        nombre: proveedor.nombre || '',
        contacto: proveedor.contacto || '',
        telefono_numero: numero,
        codigo_pais: codigo,
        email: proveedor.email || '',
        pais: proveedor.pais || 'Bolivia',
        estado: proveedor.estado
      });
    } else {
      setSelectedProveedor(null);
      setFormData({
        nombre: '',
        contacto: '',
        telefono_numero: '',
        codigo_pais: '+591',
        email: '',
        pais: 'Bolivia',
        estado: true
      });
    }
    setTopTab('DETALLES');
    setIsPanelOpen(true);
    setShowCountryDropdown(false);
    setCountrySearch('');
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedProveedor(null);
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

    if (selectedProveedor) {
      const { error } = await supabase
        .from('proveedores')
        .update({
          nombre: formData.nombre,
          contacto: formData.contacto,
          telefono: fullPhone,
          email: formData.email,
          pais: formData.pais
        })
        .eq('id_proveedor', selectedProveedor.id_proveedor);
        
      if (!error) {
        fetchProveedores();
        closePanel();
        addToast('Éxito', 'Proveedor actualizado correctamente.', 'success');
      } else {
        addToast('Error', 'No se pudo actualizar el proveedor.', 'error');
      }
    } else {
      const { error } = await supabase
        .from('proveedores')
        .insert([{
          nombre: formData.nombre,
          contacto: formData.contacto,
          telefono: fullPhone,
          email: formData.email,
          pais: formData.pais,
          estado: true,
          usuario_id: userProfile?.id || null
        }]);
        
      if (!error) {
        fetchProveedores();
        closePanel();
        addToast('Éxito', 'Proveedor registrado correctamente.', 'success');
      } else {
        addToast('Error', 'No se pudo registrar el proveedor.', 'error');
      }
    }
  };

  const handleDisable = async () => {
    if (proveedorToDisable) {
      const nuevoEstado = !proveedorToDisable.estado;
      const { error } = await supabase
        .from('proveedores')
        .update({ estado: nuevoEstado })
        .eq('id_proveedor', proveedorToDisable.id_proveedor);
        
      if (!error) {
        fetchProveedores();
        addToast('Éxito', nuevoEstado ? 'Proveedor habilitado correctamente.' : 'Proveedor deshabilitado correctamente.', 'success');
      } else {
        addToast('Error', 'No se pudo cambiar el estado del proveedor.', 'error');
      }
    }
    setDisableModalOpen(false);
    setProveedorToDisable(null);
  };

  const currentCountry = COUNTRIES.find(c => c.name === formData.pais) || { flag: '🌐', code: formData.codigo_pais, name: formData.pais };
  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title">Gestión de Proveedores</h1>
        
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Buscar Proveedor / Email / País" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openPanel()}>
            <Plus size={18} /> REGISTRAR NUEVO PROVEEDOR
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>NOMBRE</th>
                <th>CONTACTO / PAÍS</th>
                <th>TELÉFONO</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map((proveedor) => (
                <tr key={proveedor.id_proveedor}>
                  <td>{proveedor.id_proveedor}</td>
                  <td style={{ fontWeight: 'bold' }}>{proveedor.nombre}</td>
                  <td>
                    <div>{proveedor.contacto || '-'}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{proveedor.pais || '-'}</div>
                  </td>
                  <td>{proveedor.telefono || '-'}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: proveedor.estado ? '#D1FAE5' : '#FEE2E2',
                      color: proveedor.estado ? '#065F46' : '#991B1B'
                    }}>
                      {proveedor.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openPanel(proveedor)}>
                      <Edit2 size={12} /> MODIFICAR
                    </button>
                    <button className="btn-action btn-disable" onClick={() => {
                      setProveedorToDisable(proveedor);
                      setDisableModalOpen(true);
                    }}>
                      {proveedor.estado ? 'DESHABILITAR' : 'HABILITAR'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProveedores.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    No hay proveedores registrados o no coinciden con la búsqueda.
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
              DATOS DEL PROVEEDOR
            </div>
          </div>

          <div className="panel-content">
            {topTab === 'DETALLES' && (
              <>
                <div className="section-title">
                  INFORMACIÓN <ChevronUp size={16} />
                </div>
                
                <div className="detail-group">
                  <div className="detail-label">Nombre del Proveedor *</div>
                  <div className="detail-value">
                    <input 
                      type="text" 
                      name="nombre" 
                      value={formData.nombre} 
                      onChange={handleFormChange}
                      placeholder="Ej. GOLDEN APPLE"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">País del Proveedor</div>
                  
                  <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
                      <div 
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '6px', 
                          cursor: 'pointer', 
                          padding: '8px 12px', 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: '#FFF'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{currentCountry.flag}</span>
                          <span>{currentCountry.name}</span>
                        </div>
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
                          width: '100%', 
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
                                placeholder="Buscar país..." 
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
                                  setFormData(prev => ({ ...prev, pais: c.name, codigo_pais: c.code }));
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
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">Teléfono</div>
                  <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: '#F3F4F6', 
                      border: '1px solid #E5E7EB', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {formData.codigo_pais}
                    </div>
                    <input 
                      type="text" 
                      name="telefono_numero" 
                      value={formData.telefono_numero} 
                      onChange={handleFormChange}
                      placeholder="Número local..."
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-label">Persona de Contacto</div>
                  <div className="detail-value">
                    <input 
                      type="text" 
                      name="contacto" 
                      value={formData.contacto} 
                      onChange={handleFormChange}
                      placeholder="Nombre del contacto..."
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
                      placeholder="correo@proveedor.com"
                    />
                  </div>
                </div>

                <div className="panel-actions" style={{ marginTop: '30px' }}>
                  <button className="btn-save" onClick={handleSave}>GUARDAR CAMBIOS</button>
                  <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
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
              ¿{proveedorToDisable?.estado ? 'Deshabilitar' : 'Habilitar'} Proveedor?
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
              El proveedor pasará a estado {proveedorToDisable?.estado ? 'Inactivo' : 'Activo'}.
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
