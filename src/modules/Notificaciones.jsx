import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Search, Send, User, MessageSquare, Check, Clock, ShieldAlert } from 'lucide-react';

export default function Notificaciones({ userProfile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // For presentation purposes, we simulate a team chat since there might not be a 'notificaciones' table yet
  useEffect(() => {
    // Load some mock data that looks professional for the presentation
    setTimeout(() => {
      setMessages([
        { id: 1, sender: 'Gerencia General', text: 'Se ha aprobado la liquidación aduanera del contenedor MSCU8273645. Proceder con el traslado al almacén central.', time: '10:30 AM', type: 'system' },
        { id: 2, sender: 'Almacén', text: 'El stock de "Filtros de Aceite" está por debajo del mínimo (3 unidades). Favor agilizar próxima importación.', time: '11:15 AM', type: 'alert' },
        { id: 3, sender: 'Juan Pérez (Ventas)', text: 'Acabo de confirmar el pago de la Nota de Entrega #45. Pueden liberar la mercadería.', time: '14:20 PM', type: 'user' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const newMsg = {
      id: Date.now(),
      sender: userProfile?.nombre || 'Yo',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'me'
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  return (
    <div className="content-area" style={{ background: '#F8FAFC', padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      
      {/* Header */}
      <div style={{ background: '#FFF', padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={28} color="#3B82F6" />
            Canal de Comunicación Interna
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>
            Reportes, alertas del sistema y coordinación de equipo.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', marginTop: '40px' }}>Cargando canal seguro...</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '16px', flexDirection: msg.type === 'me' ? 'row-reverse' : 'row' }}>
              
              {/* Avatar */}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: msg.type === 'system' ? '#1E293B' : msg.type === 'alert' ? '#FEF2F2' : msg.type === 'me' ? '#EFF6FF' : '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: msg.type === 'system' ? '#FFF' : msg.type === 'alert' ? '#EF4444' : msg.type === 'me' ? '#3B82F6' : '#64748B' }}>
                {msg.type === 'system' ? <ShieldAlert size={20} /> : msg.type === 'alert' ? <Bell size={20} /> : <User size={20} />}
              </div>

              {/* Message Box */}
              <div style={{ maxWidth: '60%', background: msg.type === 'me' ? '#3B82F6' : '#FFF', padding: '16px 20px', borderRadius: '16px', borderTopLeftRadius: msg.type === 'me' ? '16px' : '0', borderTopRightRadius: msg.type === 'me' ? '0' : '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', color: msg.type === 'me' ? '#FFF' : '#1E293B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                  <span style={{ fontWeight: '700', color: msg.type === 'me' ? '#E0E7FF' : '#3B82F6' }}>{msg.sender}</span>
                  <span style={{ color: msg.type === 'me' ? '#93C5FD' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {msg.time}
                  </span>
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                  {msg.text}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div style={{ background: '#FFF', padding: '24px 32px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '16px' }}>
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un reporte o mensaje para el equipo..."
          style={{ flex: 1, padding: '16px 20px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '14px', outline: 'none' }}
        />
        <button 
          onClick={handleSend}
          style={{ background: '#3B82F6', color: '#FFF', padding: '0 24px', borderRadius: '12px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <Send size={18} /> ENVIAR
        </button>
      </div>

    </div>
  );
}
