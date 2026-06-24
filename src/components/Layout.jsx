import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './ProtectedRoute'
import { signOut } from '../lib/supabase'
import {
  LayoutDashboard,
  Users,
  Truck,
  Ship,
  Package,
  ShoppingCart,
  FileText,
  Map,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Settings,
  Bell,
  Archive,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',      enabled: true },
  { to: '/clientes',      icon: Users,           label: 'Clientes',       enabled: true },
  { to: '/proveedores',   icon: Truck,           label: 'Proveedores',    enabled: true },
  { to: '/importaciones', icon: Ship,            label: 'Importaciones',  enabled: true },
  { to: '/inventario',    icon: Package,         label: 'Inventario',     enabled: true },
  { to: '/productos',     icon: Archive,         label: 'Productos',      enabled: true },
  { to: '/compras',       icon: ShoppingCart,     label: 'Compras',        enabled: true },
  { to: '/cotizaciones',  icon: FileText,        label: 'Cotizaciones',   enabled: true },
  { to: '/mapa',          icon: Map,             label: 'Mapa Logístico', enabled: false },
]

export default function Layout() {
  const { user, profile, rolNombre } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Colapsar sidebar automáticamente en pantallas < 1024px y manejar mobile < 768px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true)
      } else {
        setIsMobile(false)
        if (window.innerWidth < 1024) {
          setCollapsed(true)
        } else {
          setCollapsed(false)
        }
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize() // chequeo inicial
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Cerrar el drawer en móvil cuando cambie la ruta
    setMobileOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = profile?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const initials = displayName.charAt(0).toUpperCase()

  const SidebarContent = () => (
    <>
      {/* Logo/empresa arriba */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed && !mobileOpen ? 'center' : 'space-between'
      }}>
        {(!collapsed || mobileOpen) ? (
          <div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>IPCB IMPORT</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>ERP Operativo</p>
          </div>
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold'
          }}>
            I
          </div>
        )}
        
        {mobileOpen && (
          <button 
            onClick={() => setMobileOpen(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Ítems de navegación */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isItemCollapsed = collapsed && !mobileOpen
          
          if (!item.enabled) {
            return (
              <div
                key={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: isItemCollapsed ? '10px 0' : '10px 12px',
                  justifyContent: isItemCollapsed ? 'center' : 'flex-start',
                  margin: '2px 8px',
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 14,
                  cursor: 'default'
                }}
                title={isItemCollapsed ? item.label : ''}
              >
                <Icon size={18} />
                {!isItemCollapsed && <span>{item.label}</span>}
                {!isItemCollapsed && (
                  <span style={{ 
                    marginLeft: 'auto', 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    padding: '2px 6px', borderRadius: 4, 
                    fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)' 
                  }}>
                    PRÓXIMO
                  </span>
                )}
              </div>
            )
          }

          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: isItemCollapsed ? '10px 0' : '10px 12px',
                  justifyContent: isItemCollapsed ? 'center' : 'flex-start',
                  margin: '2px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  backgroundColor: isActive 
                    ? '#E1F5EE' : 'transparent',
                  color: isActive 
                    ? '#0F6E56' : 'rgba(255,255,255,0.8)',
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 14,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => {
                  if (!isActive) 
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={e => {
                  if (!isActive) 
                    e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title={isItemCollapsed ? item.label : ''}
                >
                  <Icon size={18} />
                  {!isItemCollapsed && <span>{item.label}</span>}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Botón colapsar abajo del sidebar */}
      {!isMobile && (
        <div style={{ 
          marginTop: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          padding: '12px 8px'
        }}>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 13
            }}>
            <ChevronLeft size={16} 
              style={{ 
                transform: collapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s'
              }} />
            {!collapsed && 'Colapsar menú'}
          </button>
        </div>
      )}
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F1EFE8' }}>
      {/* SIDEBAR MÓVIL (DRAWER) */}
      {mobileOpen && isMobile && (
        <>
          {/* Overlay oscuro */}
          <div 
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 50
            }} 
          />
          {/* Sidebar móvil */}
          <aside style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: 240,
            backgroundColor: '#0F6E56',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* SIDEBAR DESKTOP — fijo a la izquierda */}
      {!isMobile && (
        <aside style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: collapsed ? 64 : 208,
          backgroundColor: '#0F6E56',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease'
        }}>
          <SidebarContent />
        </aside>
      )}

      {/* ÁREA PRINCIPAL — respeta el sidebar */}
      <div style={{
        marginLeft: isMobile ? 0 : (collapsed ? 64 : 208),
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.2s ease'
      }}>

        {/* TOPBAR — fijo arriba dentro del área principal */}
        <header style={{
          position: 'sticky',
          top: 0,
          height: 56,
          backgroundColor: 'white',
          borderBottom: '1px solid #E5E7EB',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0
        }}>
          {/* Izquierda: botón hamburguesa solo en móvil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button 
                onClick={() => setMobileOpen(true)}
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: '#2C2C2A', padding: 4, display: 'flex'
                }}>
                <Menu size={22} />
              </button>
            )}
          </div>

          {/* Derecha: notificaciones + usuario */}
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Campana notificaciones */}
            <button style={{ 
              position: 'relative',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888780', padding: 4
            }}>
              <Bell size={20} />
            </button>

            {/* Info usuario */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isMobile && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2A', margin: 0 }}>
                    {displayName}
                  </p>
                  <p style={{ fontSize: 11, color: '#888780', margin: 0, textTransform: 'uppercase' }}>
                    {rolNombre}
                  </p>
                </div>
              )}
              <div 
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: '#0F6E56',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO DE PÁGINAS */}
        <main style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto'
        }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}
