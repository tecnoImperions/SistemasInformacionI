import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import { User, Mail, Camera, Save, Shield, Key, Loader, MapPin, Phone } from 'lucide-react';
import Swal from 'sweetalert2';

export default function PerfilUsuario({ userProfile, addToast }) {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    nombre: userProfile?.nombre || 'Usuario',
    email: userProfile?.email || 'email@dominio.com',
    telefono: userProfile?.telefono || '',
    direccion: userProfile?.direccion || '',
    rol: userProfile?.rol || 'Usuario',
    avatar_url: userProfile?.avatar_url || null
  });

  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleInputChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      addToast('Subiendo', 'Optimizando imagen de perfil...', 'info');
      
      // Sube a Cloudinary usando tu librería pre-configurada
      const result = await uploadImage(file, 'ipcb/usuarios');
      
      // Actualiza en base de datos
      const { error } = await supabase
        .from('usuarios')
        .update({ avatar_url: result.url })
        .eq('id', userProfile.id);

      if (error) throw error;

      setProfileData({ ...profileData, avatar_url: result.url });
      
      Swal.fire({
        title: '¡Excelente!',
        text: 'Tu foto de perfil se actualizó correctamente.',
        icon: 'success',
        confirmButtonColor: '#3B82F6'
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo subir la imagen. ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: profileData.nombre,
          telefono: profileData.telefono,
          direccion: profileData.direccion
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      
      addToast('Guardado', 'Configuración de perfil actualizada exitosamente.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Error', 'Fallo al guardar perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast('Error', 'La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      Swal.fire('Éxito', 'Contraseña actualizada correctamente por seguridad.', 'success');
      setPassword('');
      setNewPassword('');
    } catch (error) {
      Swal.fire('Error', 'No se pudo actualizar la contraseña. ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area" style={{ background: '#F8FAFC', padding: '32px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Configuración de Cuenta
        </h1>
        <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '32px' }}>
          Gestiona tu información personal, foto de perfil (Cloudinary) y opciones de seguridad.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
          
          {/* Left Column: Avatar & Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ background: '#FFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 24px' }}>
                <div style={{ 
                  width: '100%', height: '100%', borderRadius: '50%', background: '#F1F5F9', overflow: 'hidden', border: '4px solid #FFF', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={64} color="#94A3B8" />
                  )}
                </div>
                
                {/* Upload Button */}
                <label style={{ position: 'absolute', bottom: '0', right: '10px', background: '#3B82F6', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '3px solid #FFF', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  {loading ? <Loader size={20} color="#FFF" className="spin" /> : <Camera size={20} color="#FFF" />}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={loading} />
                </label>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', margin: '0 0 4px 0' }}>{profileData.nombre}</h2>
              <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4F46E5', fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {profileData.rol}
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', padding: '24px', borderRadius: '16px', color: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Shield size={24} color="#38BDF8" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Privilegios de Acceso</h3>
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', margin: 0 }}>
                Tu cuenta tiene permisos de nivel <strong style={{color:'#FFF'}}>{profileData.rol.toUpperCase()}</strong>. Puedes gestionar módulos de inventario, clientes y reportes estratégicos dentro de IPCB Import.
              </p>
            </div>

          </div>

          {/* Right Column: Forms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Información Personal */}
            <div style={{ background: '#FFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                <User size={20} color="#3B82F6"/> Datos Personales
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Nombre Completo</label>
                  <input type="text" name="nombre" value={profileData.nombre} onChange={handleInputChange} style={{ width: '100%', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}><Mail size={14} style={{display:'inline', marginRight:'4px'}}/> Correo Electrónico (Solo lectura)</label>
                  <input type="email" value={profileData.email} disabled style={{ width: '100%', padding: '12px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#94A3B8', cursor: 'not-allowed' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}><Phone size={14} style={{display:'inline', marginRight:'4px'}}/> Teléfono</label>
                  <input type="text" name="telefono" value={profileData.telefono} onChange={handleInputChange} placeholder="+591 70000000" style={{ width: '100%', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}><MapPin size={14} style={{display:'inline', marginRight:'4px'}}/> Ubicación / Sucursal</label>
                  <input type="text" name="direccion" value={profileData.direccion} onChange={handleInputChange} placeholder="Ej. Sucursal Central Santa Cruz" style={{ width: '100%', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSaveProfile} disabled={loading} style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
                  <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>

            {/* Seguridad */}
            <div style={{ background: '#FFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                <Key size={20} color="#EF4444"/> Seguridad y Contraseña
              </h2>

              <form onSubmit={handlePasswordChange}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Nueva Contraseña</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ width: '100%', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" disabled={loading || !newPassword} style={{ background: '#1E293B', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: (loading || !newPassword) ? 'not-allowed' : 'pointer', width: '100%', opacity: (loading || !newPassword) ? 0.5 : 1 }}>
                      Actualizar Contraseña
                    </button>
                  </div>
                </div>
              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
