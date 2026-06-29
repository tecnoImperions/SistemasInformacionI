import React from 'react';
import { HelpCircle, BookOpen, MessageCircle, Phone, FileText, ChevronRight, PlayCircle } from 'lucide-react';

export default function CentroAyuda() {
  const faqItems = [
    { q: '¿Cómo genero un nuevo ingreso de contenedor?', a: 'Dirígete al módulo "Importaciones", haz clic en "Nuevo Ingreso" y completa los datos del Bill of Lading y el Packing List.' },
    { q: '¿Por qué un producto aparece con stock en negativo?', a: 'Esto ocurre cuando se emite una Nota de Entrega antes de registrar el ingreso de la mercancía al almacén. Verifica los movimientos de inventario.' },
    { q: '¿Cómo exporto los reportes a Excel?', a: 'En el módulo de Reportes, selecciona los filtros deseados y haz clic en el botón verde "EXCEL (CSV)" ubicado en la parte superior derecha.' },
  ];

  return (
    <div className="content-area" style={{ background: '#F8FAFC', padding: '32px', overflowY: 'auto' }}>
      
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #134B82 0%, #1D4ED8 100%)', borderRadius: '24px', padding: '48px', color: '#FFF', textAlign: 'center', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '10%', top: '-20%', opacity: '0.1' }}>
          <HelpCircle size={300} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 16px 0' }}>¿Cómo podemos ayudarte hoy?</h1>
          <p style={{ fontSize: '16px', color: '#E0E7FF', maxWidth: '600px', margin: '0 auto 32px' }}>
            Encuentra respuestas rápidas, manuales de usuario y contacto directo con soporte técnico.
          </p>
          <div style={{ background: '#FFF', borderRadius: '12px', padding: '8px', maxWidth: '500px', margin: '0 auto', display: 'flex' }}>
            <input 
              type="text" 
              placeholder="Ej: Cómo crear una nota de entrega..." 
              style={{ flex: 1, border: 'none', padding: '12px 16px', fontSize: '15px', outline: 'none', borderRadius: '8px' }}
            />
            <button style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Buscar
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        
        {/* Left Column - FAQs & Docs */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={24} color="#3B82F6" /> Preguntas Frecuentes
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            {faqItems.map((faq, i) => (
              <div key={i} style={{ background: '#FFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', margin: '0 0 8px 0', display: 'flex', justifyContent: 'space-between' }}>
                  {faq.q} <ChevronRight size={18} color="#94A3B8" />
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>{faq.a}</p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlayCircle size={24} color="#3B82F6" /> Video Tutoriales
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '16px', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ width: '80px', height: '60px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <PlayCircle size={24} color="#3B82F6" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>Gestión de Inventario</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>5:30 min</p>
              </div>
            </div>
            <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '16px', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ width: '80px', height: '60px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <PlayCircle size={24} color="#3B82F6" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>Flujo de Ventas</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>8:15 min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Support Contact */}
        <div>
          <div style={{ background: '#FFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'sticky', top: '32px' }}>
            <div style={{ width: '48px', height: '48px', background: '#EFF6FF', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
              <MessageCircle size={24} color="#3B82F6" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>Soporte Técnico</h3>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: '1.5' }}>
              ¿No encuentras lo que buscas? Nuestro equipo de ingenieros está listo para ayudarte con tu Sistema de Información.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button style={{ width: '100%', padding: '14px', background: '#1E293B', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <MessageCircle size={18} /> Chat en Vivo
              </button>
              <button style={{ width: '100%', padding: '14px', background: '#FFF', color: '#1E293B', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: '700', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <FileText size={18} /> Abrir Ticket
              </button>
            </div>

            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontSize: '14px', fontWeight: '600' }}>
                <Phone size={18} /> +591 7000-0000
              </div>
              <p style={{ margin: '8px 0 0 30px', fontSize: '12px', color: '#94A3B8' }}>Lunes a Viernes, 8:00 - 18:00</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
