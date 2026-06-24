import React from 'react';
import { Globe, MessageCircle, Mail, Check, User, Phone, Package, Edit2, Eye } from 'lucide-react';

const AVATAR_COLORS = [
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#FCEBEB', color: '#791F1F' },
];

export default function ProveedorCard({ proveedor, onClickDetalle, onClickEditar }) {
  const getInitials = (name) => {
    if (!name) return 'PR';
    return name.substring(0, 2).toUpperCase();
  };

  const colorScheme = AVATAR_COLORS[proveedor.id % AVATAR_COLORS.length] || AVATAR_COLORS[0];

  const renderBadgeCanal = () => {
    const canal = (proveedor.canal_preferido || '').toUpperCase();
    switch (canal) {
      case 'WHATSAPP':
        return (
          <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <MessageCircle size={10} /> WhatsApp
          </span>
        );
      case 'EMAIL':
        return (
          <span style={{ background: '#E6F1FB', color: '#0C447C', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <Mail size={10} /> Email
          </span>
        );
      case 'AMBOS':
        return (
          <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <Check size={10} /> WA + Email
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="proveedor-card group"
      style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      onClick={() => onClickDetalle && onClickDetalle(proveedor)}
    >
      {/* Fila superior */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: colorScheme.bg, color: colorScheme.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 600, flexShrink: 0
        }}>
          {getInitials(proveedor.empresa)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#2C2C2A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {proveedor.empresa}
            </h3>
            {renderBadgeCanal()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            <Globe size={11} /> {proveedor.pais || 'Sin país'}
          </div>
        </div>
      </div>

      <div style={{ height: '0.5px', background: '#F1EFE8', margin: '0 -20px 16px -20px' }} />

      {/* Fila contacto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2C2C2A' }}>
          <User size={13} color="#888780" /> 
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proveedor.contacto_nombre || <span style={{ color: '#888780' }}>Sin contacto</span>}
          </span>
        </div>
        
        {(proveedor.telefono || proveedor.whatsapp) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2C2C2A' }}>
            <Phone size={13} color="#888780" /> 
            {proveedor.whatsapp || proveedor.telefono}
          </div>
        )}
        
        {proveedor.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2C2C2A', overflow: 'hidden' }}>
            <Mail size={13} color="#888780" flexShrink={0} /> 
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {proveedor.email}
            </span>
          </div>
        )}
      </div>

      {/* Fila inferior */}
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888780' }}>
          <Package size={12} /> {proveedor.cantidad_productos || 0} productos asociados
        </div>
      </div>

      {/* Botones hover */}
      <div className="hover-actions" style={{
        position: 'absolute', bottom: '16px', right: '16px',
        display: 'flex', gap: '8px', opacity: 0, transition: 'opacity 0.2s',
        background: 'white', paddingLeft: '8px'
      }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onClickEditar && onClickEditar(proveedor); }}
          style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#2C2C2A' }}
        >
          <Edit2 size={12} /> Editar
        </button>
      </div>

      <style>{`
        .proveedor-card:hover {
          border-color: #0F6E56 !important;
          box-shadow: 0 0 0 3px rgba(15,110,86,0.08) !important;
        }
        .proveedor-card:hover .hover-actions {
          opacity: 1 !important;
        }
        .hover-actions button:hover {
          background: #F9F9F7 !important;
        }
      `}</style>
    </div>
  );
}
