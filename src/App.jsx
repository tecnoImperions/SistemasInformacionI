import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import './index.css';
import { 
  Home, Calendar, Settings, Bell, Search,
  Globe, BarChart, Users, FileText, Briefcase, Shield, LogOut,
  CheckCircle, AlertCircle, Info, X, Store
} from 'lucide-react';

import Clientes from './modules/Clientes';
import Proveedores from './modules/Proveedores';
import Contenedores from './modules/Contenedores';
import Inicio from './modules/Inicio';
import Catalogo from './modules/Catalogo';
import Importaciones from './modules/Importaciones';
import NotasEntrega from './modules/NotasEntrega';
import PaginaWeb from './modules/PaginaWeb';
import ReportesUsuarios from './modules/ReportesUsuarios';
import Notificaciones from './modules/Notificaciones';
import CentroAyuda from './modules/CentroAyuda';
import PerfilUsuario from './modules/PerfilUsuario';
import { useStore } from './lib/store';
import Swal from 'sweetalert2';

// Toast Component
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type} ${toast.hiding ? 'toast-hiding' : ''}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={20} color="#10B981" />}
            {toast.type === 'error' && <AlertCircle size={20} color="#EF4444" />}
            {toast.type === 'info' && <Info size={20} color="#3B82F6" />}
          </div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

// Placeholder for other modules
const PlaceholderModule = ({ title }) => (
  <div className="content-area" style={{ alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center', color: '#6B7280' }}>
      <Briefcase size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
      <h2>Módulo de {title}</h2>
      <p>En desarrollo...</p>
    </div>
  </div>
);

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          await supabase.from('usuarios').insert([{ 
            id: data.user.id, 
            nombre: nombre || email.split('@')[0], 
            email: email, 
            rol: 'admin'
          }]);
        }
      }
    } catch (err) {
      setError(err.message || "Ocurrió un error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Globe size={48} color="#134B82" />
          </div>
          <h1 className="auth-title">IPCB Import</h1>
          <p className="auth-subtitle">
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea una cuenta nueva'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleAuth}>
          {!isLogin && (
            <div className="auth-input-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                placeholder="Juan Pérez"
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="auth-input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Cargando...' : (isLogin ? 'INICIAR SESIÓN' : 'CREAR CUENTA')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }}>
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const { tipoCambio, setTipoCambio } = useStore();
  const [activeModule, setActiveModule] = useState('INICIO');
  const [userProfile, setUserProfile] = useState({ nombre: 'Usuario', rol: 'Usuario' });
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, hiding: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, hiding: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!error && data) {
        setUserProfile(data);
      } else {
        setUserProfile({ 
          nombre: session.user.email.split('@')[0], 
          rol: 'Usuario' 
        });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderModule = () => {
    switch(activeModule) {
      case 'CLIENTES': return <Clientes addToast={addToast} userProfile={userProfile} />;
      case 'PROVEEDORES': return <Proveedores addToast={addToast} userProfile={userProfile} />;
      case 'CONTENEDORES': return <Contenedores addToast={addToast} userProfile={userProfile} />;
      case 'INICIO': return <Inicio addToast={addToast} userProfile={userProfile} onNavigate={setActiveModule} />;
      case 'CATALOGO': return <Catalogo addToast={addToast} userProfile={userProfile} />;
      case 'IMPORTACIONES': return <Importaciones addToast={addToast} userProfile={userProfile} />;
      case 'NOTAS_ENTREGA': return <NotasEntrega addToast={addToast} userProfile={userProfile} />;
      case 'REPORTES': return <ReportesUsuarios addToast={addToast} userProfile={userProfile} />;
      case 'NOTIFICACIONES': return <Notificaciones addToast={addToast} userProfile={userProfile} onBack={() => setActiveModule('INICIO')} />;
      case 'CENTRO_AYUDA': return <CentroAyuda addToast={addToast} userProfile={userProfile} onBack={() => setActiveModule('INICIO')} />;
      case 'PERFIL': return <PerfilUsuario addToast={addToast} userProfile={userProfile} onBack={() => setActiveModule('INICIO')} />;
      case 'PAGINA_WEB': return <PaginaWeb onBack={() => setActiveModule('INICIO')} addToast={addToast} userProfile={userProfile} />;
      default: return <Inicio addToast={addToast} userProfile={userProfile} onNavigate={setActiveModule} />;
    }
  };

  if (activeModule === 'PAGINA_WEB') {
    return (
      <div style={{ height: '100vh', width: '100vw', overflow: 'auto' }}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        {renderModule()}
      </div>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Globe size={28} color="#ffffff" />
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">IPCB</span>
              <span className="sidebar-logo-subtitle">Import Central Logistics System</span>
            </div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className={`nav-item ${activeModule === 'INICIO' ? 'active' : ''}`} onClick={() => setActiveModule('INICIO')}>
            <BarChart size={18} /> INICIO
          </div>
          <div className={`nav-item ${activeModule === 'CLIENTES' ? 'active' : ''}`} onClick={() => setActiveModule('CLIENTES')}>
            <Users size={18} /> CLIENTES
          </div>
          <div className={`nav-item ${activeModule === 'PROVEEDORES' ? 'active' : ''}`} onClick={() => setActiveModule('PROVEEDORES')}>
            <Globe size={18} /> PROVEEDORES
          </div>
          <div className={`nav-item ${activeModule === 'CONTENEDORES' ? 'active' : ''}`} onClick={() => setActiveModule('CONTENEDORES')}>
            <Shield size={18} /> CONTENEDORES
          </div>
          <div className={`nav-item ${activeModule === 'CATALOGO' ? 'active' : ''}`} onClick={() => setActiveModule('CATALOGO')}>
            <Briefcase size={18} /> CATÁLOGO
          </div>
          <div className={`nav-item ${activeModule === 'IMPORTACIONES' ? 'active' : ''}`} onClick={() => setActiveModule('IMPORTACIONES')}>
            <Globe size={18} /> IMPORTACIONES
          </div>
          <div style={{ padding: '16px 24px 8px', fontSize: '11px', fontWeight: 'bold', color: '#9CA3AF', letterSpacing: '1px' }}>NEGOCIO</div>
          <div className={`nav-item ${activeModule === 'NOTAS_ENTREGA' ? 'active' : ''}`} onClick={() => setActiveModule('NOTAS_ENTREGA')}>
            <Briefcase size={18} /> NOTAS DE ENTREGA
          </div>
          <div className={`nav-item ${activeModule === 'REPORTES' ? 'active' : ''}`} onClick={() => setActiveModule('REPORTES')}>
            <BarChart size={18} /> REPORTES INTEGRANTES
          </div>
          <div className="nav-item" onClick={() => window.open(window.location.origin + window.location.pathname + '#/tienda', '_blank')} style={{ color: '#10B981' }}>
            <Store size={18} /> PÁGINA WEB (PÚBLICO)
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <main className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-nav">
            <button className="header-icon-btn active" onClick={() => setActiveModule('INICIO')}>
              <Home size={18} /> INICIO
            </button>
            <button className="header-icon-btn" onClick={() => addToast('Búsqueda', 'Búsqueda global próximamente', 'info')}>
              <Search size={18} /> BUSCAR
            </button>
            <button className="header-icon-btn" onClick={() => addToast('Opciones', 'Configuraciones próximamente', 'info')}>
              <Settings size={18} /> OPCIONES
            </button>
          </div>
          
          <div className="header-right">
            <div className="header-controls">
              {/* EXCHANGE RATE CONTROLLER */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', marginRight: '6px' }}>TC (Bs/$):</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={tipoCambio}
                  onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
                  style={{ width: '50px', background: 'transparent', border: 'none', color: '#FFF', fontSize: '13px', fontWeight: '600', outline: 'none' }}
                />
              </div>

              <button className={`header-icon-btn ${activeModule === 'CENTRO_AYUDA' ? 'active' : ''}`} onClick={() => setActiveModule('CENTRO_AYUDA')} title="Centro de Ayuda">
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>?</span>
              </button>
              <button className={`header-icon-btn ${activeModule === 'NOTIFICACIONES' ? 'active' : ''}`} onClick={() => setActiveModule('NOTIFICACIONES')} title="Notificaciones">
                <div style={{ position: 'relative' }}>
                  <Bell size={18} />
                  <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', width: 8, height: 8, borderRadius: '50%' }}></span>
                </div>
              </button>
            </div>
            <div className="user-profile" style={{ cursor: 'pointer', border: activeModule === 'PERFIL' ? '1px solid #38BDF8' : '1px solid transparent' }} onClick={() => setActiveModule('PERFIL')} title="Mi Perfil">
              <div className="user-avatar">
                <Users size={20} />
              </div>
              <div className="user-info">
                <span className="user-name">{userProfile.nombre}</span>
                <span className="user-role">{userProfile.rol.toUpperCase()}</span>
              </div>
              <button 
                onClick={handleLogout} 
                style={{ background: 'none', border: 'none', color: '#FFF', marginLeft: '12px', cursor: 'pointer' }}
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area - Render Active Module */}
        {renderModule()}
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificación de vista pública en nueva pestaña
  if (window.location.hash === '#/tienda') {
    return (
      <div style={{ height: '100vh', width: '100vw', overflowY: 'auto' }}>
        <PaginaWeb addToast={(title, msg, type) => {
          Swal.fire({
            title: title,
            text: msg,
            icon: type || 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: '#111827',
            color: '#fff'
          });
        }} />
      </div>
    );
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F3F4F6' }}>
        <p style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>Cargando sistema...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <Dashboard session={session} />;
}
