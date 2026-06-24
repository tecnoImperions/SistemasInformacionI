import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { alertSuccess, alertError, alertConfirmDanger } from '../../lib/alerts';
import ClienteForm from './components/ClienteForm';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar,
  CreditCard, Building, Package, FileText,
  CheckCircle, Clock, History, Edit2,
  Pencil, Check, X, Info, ChevronRight,
  UserX, AlertTriangle, Loader2
} from 'lucide-react';

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [metricas, setMetricas] = useState({
    totalCargas: 0,
    pendientes: 0,
    totalCot: 0,
    entregadas: 0
  });

  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    setNotFound(false);
    try {
      const { data: cliData, error: cliErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (cliErr) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCliente(cliData);

      // Metricas
      const p1 = supabase.from('cargas_cliente').select('*', { count: 'exact', head: true }).eq('cliente_id', id);
      const p2 = supabase.from('cargas_cliente').select('*', { count: 'exact', head: true }).eq('cliente_id', id).in('estado_entrega', ['PENDIENTE','EN_ALMACEN']);
      const p3 = supabase.from('cotizaciones').select('*', { count: 'exact', head: true }).eq('cliente_id', id).is('deleted_at', null);
      const p4 = supabase.from('cargas_cliente').select('*', { count: 'exact', head: true }).eq('cliente_id', id).eq('estado_entrega', 'ENTREGADO');

      const [resCargas, resPendientes, resCot, resEntregadas] = await Promise.all([p1, p2, p3, p4]);

      setMetricas({
        totalCargas: resCargas.count || 0,
        pendientes: resPendientes.count || 0,
        totalCot: resCot.count || 0,
        entregadas: resEntregadas.count || 0
      });

      fetchHistorial();

    } catch (error) {
      console.error(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistorial() {
    setLoadingHistorial(true);
    try {
      const { data, error } = await supabase.rpc('fn_historial_cliente', { p_cliente_id: parseInt(id) });
      if (!error && data) {
        setHistorial(data);
      } else {
        setHistorial([]);
      }
    } catch (err) {
      console.error(err);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }

  const getInitialsColors = (name) => {
    if (!name) return { bg: '#E1F5EE', color: '#0F6E56' };
    const firstLetter = name.trim().charAt(0).toUpperCase();
    if (/[A-F]/.test(firstLetter)) return { bg: '#E1F5EE', color: '#0F6E56' };
    if (/[G-M]/.test(firstLetter)) return { bg: '#E6F1FB', color: '#185FA5' };
    if (/[N-S]/.test(firstLetter)) return { bg: '#FAEEDA', color: '#854F0B' };
    if (/[T-Z]/.test(firstLetter)) return { bg: '#EAF3DE', color: '#3B6D11' };
    return { bg: '#E1F5EE', color: '#0F6E56' };
  };

  const getInitials = (nombre) => {
    if (!nombre) return 'C';
    const parts = nombre.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return nombre.substring(0, 2).toUpperCase();
  };

  const handleSaveField = async (campo) => {
    if (!cliente) return;
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ [campo]: editValue })
        .eq('id', id);

      if (error) throw error;
      setCliente({ ...cliente, [campo]: editValue });
      alertSuccess('Guardado', `${campo} actualizado.`);
      setEditingField(null);
    } catch (err) {
      console.error(err);
      alertError('Error', `No se pudo actualizar ${campo}.`);
    }
  };

  const handleKeyDown = (e, campo) => {
    if (e.key === 'Enter' && campo !== 'observaciones') {
      handleSaveField(campo);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const deshabilitarCliente = async () => {
    const result = await alertConfirmDanger(
      `¿Deshabilitar a ${cliente.nombre}?`,
      'No aparecerá en búsquedas ni podrá asignarse a nuevas operaciones.',
      'Sí, deshabilitar'
    );
    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('clientes').update({ activo: false }).eq('id', id);
        if (error) throw error;
        alertSuccess('Éxito', 'Cliente deshabilitado.');
        navigate('/clientes');
      } catch (err) {
        console.error(err);
        alertError('Error', 'No se pudo deshabilitar.');
      }
    }
  };

  const timeAgo = (fecha) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 60)   return `Hace ${mins} min`;
    if (hours < 24)  return `Hace ${hours}h`;
    if (days < 7)    return `Hace ${days} días`;
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const renderBadgeEstadoImportacion = (estado) => {
    switch(estado) {
      case 'EN_ORIGEN': return { bg: '#E6F1FB', color: '#0C447C' };
      case 'EN_TRANSITO': return { bg: '#FAEEDA', color: '#633806' };
      case 'ADUANA': return { bg: '#FEF3C7', color: '#92400E' };
      case 'RECIBIDO': return { bg: '#EAF3DE', color: '#27500A' };
      default: return { bg: '#F1EFE8', color: '#5F5E5A' };
    }
  };

  const renderBadgeEstadoCarga = (estado) => {
    switch(estado) {
      case 'PENDIENTE': return { bg: '#FAEEDA', color: '#633806' };
      case 'EN_ALMACEN': return { bg: '#E6F1FB', color: '#0C447C' };
      case 'ENTREGADO': return { bg: '#EAF3DE', color: '#27500A' };
      case 'DEVUELTO': return { bg: '#FCEBEB', color: '#791F1F' };
      default: return { bg: '#F1EFE8', color: '#5F5E5A' };
    }
  };

  const renderBadgeEstadoCotizacion = (estado) => {
    switch(estado) {
      case 'BORRADOR': return { bg: '#F1EFE8', color: '#5F5E5A' };
      case 'ENVIADA': return { bg: '#E6F1FB', color: '#0C447C' };
      case 'APROBADA': return { bg: '#EAF3DE', color: '#27500A' };
      case 'RECHAZADA': return { bg: '#FCEBEB', color: '#791F1F' };
      default: return { bg: '#F1EFE8', color: '#5F5E5A' };
    }
  };

  const getBadgeStyle = (item) => {
    const tipo = item.tipo?.toLowerCase();
    let style = { bg: '#F1EFE8', color: '#5F5E5A' };
    
    if (tipo === 'importacion') {
      if (['EN_ORIGEN', 'EN_TRANSITO', 'ADUANA', 'RECIBIDO'].includes(item.estado)) {
        style = renderBadgeEstadoImportacion(item.estado);
      } else {
        style = renderBadgeEstadoCarga(item.estado);
      }
    } else if (tipo === 'cotizacion') {
      style = renderBadgeEstadoCotizacion(item.estado);
    }
    return style;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <style>{`
          @keyframes skeleton {
            0% { opacity: 1 }
            50% { opacity: 0.4 }
            100% { opacity: 1 }
          }
          .skel { animation: skeleton 1.5s ease infinite; background: #F1EFE8; }
        `}</style>
        <div className="skel" style={{ height: '56px', width: '100%', marginBottom: '16px', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div className="skel" style={{ height: '80px', borderRadius: '10px' }} />
          <div className="skel" style={{ height: '80px', borderRadius: '10px' }} />
          <div className="skel" style={{ height: '80px', borderRadius: '10px' }} />
          <div className="skel" style={{ height: '80px', borderRadius: '10px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>
          <div className="skel" style={{ height: '300px', borderRadius: '12px' }} />
          <div className="skel" style={{ height: '300px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (notFound || !cliente) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
        <UserX size={48} color="#D1CFC8" />
        <h2 style={{ fontSize: '18px', color: '#888780', margin: 0, fontWeight: 400 }}>Cliente no encontrado</h2>
        <button 
          onClick={() => navigate('/clientes')}
          style={{ background: 'none', border: 'none', color: '#888780', cursor: 'pointer', fontSize: '14px', marginTop: '12px' }}
        >
          ← Volver a clientes
        </button>
      </div>
    );
  }

  const avatarColors = getInitialsColors(cliente.nombre);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <style>{`
        @keyframes skeleton {
          0%   { opacity: 1 }
          50%  { opacity: 0.4 }
          100% { opacity: 1 }
        }
        .skeleton-row {
          height: 64px;
          background: #F1EFE8;
          border-radius: 8px;
          margin: 8px 16px;
          animation: skeleton 1.5s ease infinite;
        }
        .main-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 16px;
          align-items: flex-start;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (min-width: 1024px) and (max-width: 1280px) {
          .main-grid {
            grid-template-columns: 300px 1fr;
          }
        }
        @media (max-width: 1023px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 639px) {
          .header-profile {
            flex-direction: column !important;
          }
          .header-actions {
            width: 100% !important;
            align-self: stretch !important;
          }
          .header-actions button {
            flex: 1;
            justify-content: center;
          }
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .nav-btn {
          background: transparent;
          border: none;
          color: #888780;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0;
        }
        .nav-btn:hover { color: #2C2C2A; }
        
        .btn-edit {
          background: white; border: 1.5px solid #E5E7EB; color: #2C2C2A;
          padding: 7px 14px; border-radius: 8px; font-size: 13px;
          display: flex; align-items: center; gap: 6px; cursor: pointer;
        }
        .btn-edit:hover { background: #F9F9F7; }
        
        .btn-assign {
          background: #0F6E56; color: white; border: none;
          padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
          display: flex; align-items: center; gap: 6px; cursor: pointer;
        }
        .btn-assign:hover { background: #085041; }
        
        .editable-row {
          padding: 12px 18px; border-bottom: 0.5px solid #F1EFE8;
          display: flex; justify-content: space-between; align-items: center;
        }
        .editable-row:last-child { border-bottom: none; }
        .edit-icon { opacity: 0; cursor: pointer; background: none; border: none; padding: 0; display: flex; }
        .editable-row:hover .edit-icon { opacity: 1; }
        
        .quick-action-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px; border: 1px solid #E5E7EB;
          cursor: pointer; font-size: 13px; margin-bottom: 8px; background: white;
          text-align: left;
        }
        .quick-action-btn:hover { background: #F9F9F7; }
        
        .timeline-item {
          display: flex; gap: 14px; padding: 14px 18px;
          border-bottom: 0.5px solid #F1EFE8; cursor: pointer;
        }
        .timeline-item:hover { background: #F9F9F7; }
      `}</style>

      {/* Barra de navegación interna */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button className="nav-btn" onClick={() => navigate('/clientes')}>
          <ArrowLeft size={16} /> Clientes
        </button>
        <span style={{ color: '#D1CFC8', fontSize: '13px' }}>/</span>
        <span style={{ fontSize: '13px', color: '#2C2C2A' }}>{cliente.nombre}</span>
      </div>

      {/* CARD 1 — Header del perfil */}
      <div className="header-profile" style={{
        background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px',
        padding: '24px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '20px'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: avatarColors.bg, color: avatarColors.color,
          fontSize: '18px', fontWeight: 500, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {getInitials(cliente.nombre)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#2C2C2A', margin: 0 }}>
              {cliente.nombre}
            </h1>
            <span style={{ background: '#F1EFE8', color: '#888780', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
              {cliente.codigo}
            </span>
            {cliente.activo && (
              <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '3px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={10} /> Activo
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#888780' }}>
              <Phone size={13} /> 
              {cliente.telefono ? (
                <span style={{ color: '#2C2C2A', cursor: 'pointer' }} onClick={() => window.open(`tel:${cliente.telefono}`)}>
                  {cliente.telefono}
                </span>
              ) : '—'}
            </div>
            {cliente.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#888780' }}>
                <Mail size={13} />
                <a href={`mailto:${cliente.email}`} style={{ color: '#888780', textDecoration: 'none' }}>{cliente.email}</a>
              </div>
            )}
            {cliente.ciudad && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#888780' }}>
                <MapPin size={13} /> {cliente.ciudad}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#888780' }}>
              <Calendar size={13} /> Cliente desde {new Date(cliente.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            {cliente.nit_ci && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#888780' }}>
                <CreditCard size={13} /> {cliente.nit_ci}
              </div>
            )}
          </div>

          {cliente.empresa && (
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#888780' }}>
              <Building size={13} color="#888780" /> {cliente.empresa}
            </div>
          )}
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
          <button className="btn-edit" onClick={() => setIsFormOpen(true)}>
            <Edit2 size={14} /> Editar
          </button>
          <button className="btn-assign" onClick={() => navigate(`/importaciones?asignar=${cliente.id}`)}>
            <Package size={14} /> Asignar carga
          </button>
        </div>
      </div>

      {/* FILA DE 4 MÉTRICAS */}
      <div className="metrics-grid">
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#888780', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <Package size={14} color="#888780" /> Cargas totales
          </div>
          <div style={{ fontSize: '28px', fontWeight: 500, color: '#2C2C2A' }}>{metricas.totalCargas}</div>
          <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>todas las importaciones</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#888780', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <Clock size={14} color="#854F0B" /> Pendientes
          </div>
          <div style={{ fontSize: '28px', fontWeight: 500, color: metricas.pendientes > 0 ? '#854F0B' : '#2C2C2A' }}>{metricas.pendientes}</div>
          <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>por entregar</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#888780', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <FileText size={14} color="#185FA5" /> Cotizaciones
          </div>
          <div style={{ fontSize: '28px', fontWeight: 500, color: '#2C2C2A' }}>{metricas.totalCot}</div>
          <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>generadas en total</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#888780', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <CheckCircle size={14} color="#3B6D11" /> Entregadas
          </div>
          <div style={{ fontSize: '28px', fontWeight: 500, color: '#3B6D11' }}>{metricas.entregadas}</div>
          <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>cargas completadas</div>
        </div>
      </div>

      {/* CUERPO PRINCIPAL — 2 columnas */}
      <div className="main-grid">
        
        {/* COLUMNA IZQUIERDA */}
        <div>
          {/* Card — Datos adicionales */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #F1EFE8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2C2C2A' }}>
                <Info size={15} color="#888780" /> Información adicional
              </div>
            </div>

            {[
              { key: 'email', icon: <Mail size={13} />, label: 'Email' },
              { key: 'direccion', icon: <MapPin size={13} />, label: 'Dirección' },
              { key: 'ciudad', icon: <MapPin size={13} />, label: 'Ciudad', default: 'Santa Cruz de la Sierra' },
              { key: 'observaciones', icon: <FileText size={13} />, label: 'Observaciones', isTextArea: true }
            ].map(f => {
              const isEditing = editingField === f.key;
              const val = cliente[f.key] || '';
              const displayVal = cliente[f.key] ? cliente[f.key] : (f.default ? f.default : '—');
              const displayColor = cliente[f.key] || f.default ? '#2C2C2A' : '#D1CFC8';

              return (
                <div key={f.key} className="editable-row">
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      {f.isTextArea ? (
                        <textarea 
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, f.key)}
                          style={{ flex: 1, border: 'none', borderBottom: '1.5px solid #0F6E56', outline: 'none', fontSize: '13px', fontFamily: 'inherit', padding: '4px 0', resize: 'vertical' }}
                          rows={2}
                        />
                      ) : (
                        <input 
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, f.key)}
                          style={{ flex: 1, border: 'none', borderBottom: '1.5px solid #0F6E56', outline: 'none', fontSize: '13px', padding: '4px 0' }}
                        />
                      )}
                      <button onClick={() => handleSaveField(f.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Check size={14} color="#0F6E56" />
                      </button>
                      <button onClick={() => setEditingField(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={14} color="#A32D2D" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888780' }}>
                        {f.icon} {f.label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: displayColor, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayVal}
                        </span>
                        <button className="edit-icon" onClick={() => { setEditingField(f.key); setEditValue(val || (f.default || '')); }}>
                          <Pencil size={12} color="#888780" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Card — Acciones rápidas */}
          <div style={{ marginTop: '12px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px', color: '#2C2C2A' }}>Acciones rápidas</div>
            
            <button className="quick-action-btn" onClick={() => navigate(`/cotizaciones/nueva?cliente=${id}`)}>
              <FileText size={16} color="#185FA5" /> <span style={{ color: '#2C2C2A' }}>Nueva cotización para este cliente</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate(`/importaciones?asignar=${id}`)}>
              <Package size={16} color="#0F6E56" /> <span style={{ color: '#2C2C2A' }}>Asignar a importación existente</span>
            </button>
            
            {cliente.activo && (
              <button className="quick-action-btn" onClick={deshabilitarCliente}>
                <UserX size={16} color="#A32D2D" /> <span style={{ color: '#A32D2D' }}>Deshabilitar cliente</span>
              </button>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #F1EFE8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#2C2C2A' }}>
              <History size={15} color="#888780" /> Historial de operaciones
            </div>
            {!loadingHistorial && historial.length > 0 && (
              <span style={{ background: '#F1EFE8', color: '#888780', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                {historial.length} operaciones
              </span>
            )}
          </div>

          {loadingHistorial ? (
            <div style={{ padding: '8px 0' }}>
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : historial.length === 0 ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Clock size={40} color="#D1CFC8" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', color: '#888780' }}>Sin operaciones registradas</div>
              <div style={{ fontSize: '13px', color: '#B0ADA6', marginTop: '6px', maxWidth: '280px' }}>
                Las importaciones y cotizaciones de este cliente aparecerán aquí automáticamente.
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {historial.map((item, i) => {
                const isImportacion = item.tipo?.toLowerCase() === 'importacion';
                const isCotizacion = item.tipo?.toLowerCase() === 'cotizacion';
                
                const dotBg = isImportacion ? '#0F6E56' : isCotizacion ? '#185FA5' : '#888780';
                const iconColor = isImportacion ? '#0F6E56' : isCotizacion ? '#185FA5' : '#888780';
                const badgeStyle = getBadgeStyle(item);
                
                const isLast = i === historial.length - 1;

                let extraData = '';
                if (isImportacion) {
                  const bultos = item.cantidad_bultos ? `${item.cantidad_bultos} bultos` : '';
                  const peso = item.peso_kg ? `${item.peso_kg} kg` : '';
                  let joined = [bultos, peso].filter(Boolean).join(' · ');
                  if (item.monto_ref) joined += (joined ? ' · ' : '') + `$${item.monto_ref} ${item.moneda || 'USD'}`;
                  extraData = joined;
                }

                let desc = item.descripcion_carga;
                if (!desc && isImportacion && item.numero_contenedor) desc = `Contenedor ${item.numero_contenedor}`;
                if (!desc && isCotizacion) desc = `Cotización ${item.numero || item.codigo}`;

                return (
                  <div key={i} className="timeline-item" onClick={() => {
                    if (isImportacion) navigate(`/importaciones/${item.id}`);
                    if (isCotizacion) navigate(`/cotizaciones/${item.id}`);
                  }}>
                    {/* Parte izquierda */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '20px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotBg, flexShrink: 0 }} />
                      {!isLast && (
                        <div style={{ width: '1px', flex: 1, minHeight: '20px', background: '#F1EFE8', marginTop: '4px' }} />
                      )}
                    </div>

                    {/* Parte central */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isImportacion && <Package size={14} color={iconColor} />}
                        {isCotizacion && <FileText size={14} color={iconColor} />}
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#2C2C2A' }}>{item.codigo}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: badgeStyle.bg, color: badgeStyle.color }}>
                          {item.estado}
                        </span>
                      </div>
                      
                      {desc && (
                        <div style={{ fontSize: '13px', color: '#888780', marginTop: '2px' }}>{desc}</div>
                      )}
                      
                      {extraData && (
                        <div style={{ fontSize: '12px', color: '#B0ADA6', marginTop: '2px' }}>{extraData}</div>
                      )}
                    </div>

                    {/* Parte derecha */}
                    <div style={{ fontSize: '12px', color: '#B0ADA6', textAlign: 'right', minWidth: '80px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <div>{timeAgo(item.fecha)}</div>
                      <ChevronRight size={14} color="#D1CFC8" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ClienteForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        clienteId={cliente.id}
      />
    </div>
  );
}
