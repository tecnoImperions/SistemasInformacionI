import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { alertError, alertSuccess } from '../../../lib/alerts';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

const PAISES = [
  'China', 'Brasil', 'Argentina', 'Japón',
  'Corea del Sur', 'Estados Unidos', 'Alemania',
  'Italia', 'España', 'Chile', 'Perú', 'Colombia',
  'México', 'India', 'Taiwán', 'Vietnam',
  'Tailandia', 'Indonesia', 'Bolivia'
];

export default function ProveedorForm({ isOpen, onClose, onSuccess, proveedorId }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empresa: '',
    pais: '',
    canal_preferido: 'WhatsApp',
    contacto_nombre: '',
    telefono: '',
    whatsapp: '',
    email: '',
    sitio_web: '',
    notas: ''
  });
  
  const [showMasDatos, setShowMasDatos] = useState(false);
  const [paisBuscador, setPaisBuscador] = useState('');
  const [showPaises, setShowPaises] = useState(false);
  const paisRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (proveedorId) {
        fetchProveedor(proveedorId);
      } else {
        setFormData({
          empresa: '', pais: '', canal_preferido: 'WhatsApp',
          contacto_nombre: '', telefono: '', whatsapp: '',
          email: '', sitio_web: '', notas: ''
        });
        setPaisBuscador('');
        setShowMasDatos(false);
      }
    }
  }, [isOpen, proveedorId]);

  // Click outside to close pais dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (paisRef.current && !paisRef.current.contains(event.target)) {
        setShowPaises(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchProveedor(id) {
    try {
      const { data, error } = await supabase.from('proveedores').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        let canalDisplay = 'Email';
        if (data.canal_preferido === 'WHATSAPP') canalDisplay = 'WhatsApp';
        if (data.canal_preferido === 'AMBOS') canalDisplay = 'Ambos';

        setFormData({ ...data, canal_preferido: canalDisplay });
        setPaisBuscador(data.pais || '');
      }
    } catch (err) {
      console.error(err);
      alertError('Error', 'No se pudo cargar el proveedor');
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaisChange = (e) => {
    const val = e.target.value;
    setPaisBuscador(val);
    setFormData(prev => ({ ...prev, pais: val }));
    setShowPaises(true);
  };

  const selectPais = (p) => {
    setPaisBuscador(p);
    setFormData(prev => ({ ...prev, pais: p }));
    setShowPaises(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.empresa.trim()) {
      alertError('Error', 'El nombre de la empresa es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      let finalData = { 
        ...formData, 
        activo: true,
        canal_preferido: formData.canal_preferido.toUpperCase()
      };

      if (!proveedorId) {
        // Generar codigo: 3 letras de empresa + numero
        const prefijo = formData.empresa.substring(0, 3).toUpperCase().padEnd(3, 'X');
        const { count } = await supabase.from('proveedores').select('*', { count: 'exact', head: true });
        const numStr = String((count || 0) + 1).padStart(3, '0');
        finalData.codigo = `${prefijo}-${numStr}`;

        const { error } = await supabase.from('proveedores').insert([finalData]);
        if (error) throw error;
        alertSuccess('Guardado', 'Proveedor creado correctamente.');
      } else {
        const { error } = await supabase.from('proveedores').update(finalData).eq('id', proveedorId);
        if (error) throw error;
        alertSuccess('Actualizado', 'Proveedor actualizado correctamente.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alertError('Error', 'No se pudo guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredPaises = PAISES.filter(p => p.toLowerCase().includes(paisBuscador.toLowerCase()));
  const showWhatsapp = ['WhatsApp', 'Ambos'].includes(formData.canal_preferido);
  const showEmail = ['Email', 'Ambos'].includes(formData.canal_preferido);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)'
    }}>
      <style>{`
        .prov-form-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #E5E7EB; border-radius: 8px; font-size: 14px; outline: none;
        }
        .prov-form-input:focus { border-color: #0F6E56; }
        .prov-form-label {
          display: block; font-size: 13px; font-weight: 500; color: #2C2C2A; margin-bottom: 6px;
        }
        .canal-btn {
          flex: 1; padding: 8px 0; border: 1.5px solid #E5E7EB; background: white; font-size: 13px; cursor: pointer; color: #2C2C2A; text-align: center;
        }
        .canal-btn.active {
          background: #0F6E56; color: white; border-color: #0F6E56; font-weight: 500;
        }
        .canal-btn:first-child { border-radius: 8px 0 0 8px; }
        .canal-btn:last-child { border-radius: 0 8px 8px 0; }
        .canal-btn:not(:first-child) { border-left: none; }
      `}</style>

      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2A' }}>
            {proveedorId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sección Empresa */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px', borderBottom: '1px solid #F1EFE8', paddingBottom: '8px' }}>
              Empresa
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="prov-form-label">Nombre de empresa *</label>
                <input 
                  type="text" name="empresa" value={formData.empresa} onChange={handleChange} 
                  className="prov-form-input" placeholder="Ej: Alibaba Trading Co."
                />
              </div>

              <div ref={paisRef} style={{ position: 'relative' }}>
                <label className="prov-form-label">País</label>
                <input 
                  type="text" value={paisBuscador} onChange={handlePaisChange} onFocus={() => setShowPaises(true)}
                  className="prov-form-input" placeholder="Ej: China"
                />
                {showPaises && filteredPaises.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white',
                    border: '1px solid #E5E7EB', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    {filteredPaises.map(p => (
                      <div key={p} onClick={() => selectPais(p)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #F1EFE8' }}>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="prov-form-label">Canal de comunicación preferido</label>
                <div style={{ display: 'flex' }}>
                  {['WhatsApp', 'Email', 'Ambos'].map(c => (
                    <button 
                      key={c} type="button"
                      className={`canal-btn ${formData.canal_preferido === c ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, canal_preferido: c }))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sección Contacto */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px', borderBottom: '1px solid #F1EFE8', paddingBottom: '8px' }}>
              Contacto
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="prov-form-label">Nombre del contacto</label>
                <input 
                  type="text" name="contacto_nombre" value={formData.contacto_nombre} onChange={handleChange} 
                  className="prov-form-input" placeholder="Ej: Juan Pérez"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="prov-form-label">Teléfono (General)</label>
                  <input 
                    type="tel" name="telefono" value={formData.telefono} onChange={handleChange} 
                    className="prov-form-input" placeholder="+86 123 456"
                  />
                </div>
                {showWhatsapp && (
                  <div>
                    <label className="prov-form-label">WhatsApp *</label>
                    <input 
                      type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} 
                      className="prov-form-input" placeholder="+86 123 456"
                    />
                  </div>
                )}
              </div>

              {showEmail && (
                <div>
                  <label className="prov-form-label">Email *</label>
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleChange} 
                    className="prov-form-input" placeholder="contacto@empresa.com"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sección Adicional */}
          <div>
            <button 
              type="button" onClick={() => setShowMasDatos(!showMasDatos)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#185FA5', fontSize: '14px', fontWeight: 500, cursor: 'pointer', padding: 0 }}
            >
              {showMasDatos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showMasDatos ? 'Ocultar datos adicionales' : '＋ Más datos'}
            </button>
            
            {showMasDatos && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="prov-form-label">Sitio Web</label>
                  <input 
                    type="url" name="sitio_web" value={formData.sitio_web} onChange={handleChange} 
                    className="prov-form-input" placeholder="https://www.empresa.com"
                  />
                </div>
                <div>
                  <label className="prov-form-label">Notas</label>
                  <textarea 
                    name="notas" value={formData.notas} onChange={handleChange} rows={3}
                    className="prov-form-input" placeholder="Información adicional del proveedor..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button" onClick={onClose} disabled={loading}
            style={{ padding: '10px 16px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#2C2C2A', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button 
            type="button" onClick={handleSave} disabled={loading}
            style={{ padding: '10px 16px', background: '#0F6E56', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: 'white', cursor: 'pointer' }}
          >
            {loading ? 'Guardando...' : 'Guardar proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}
