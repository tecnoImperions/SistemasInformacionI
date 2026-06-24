import { useAuth } from '../../components/ProtectedRoute'
import {
  Package,
  Users,
  Ship,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Clock,
} from 'lucide-react'

// Datos simulados para el dashboard inicial
const STATS = [
  {
    label: 'Productos Activos',
    value: '1,248',
    change: '+12%',
    trend: 'up',
    icon: Package,
    color: '#0F6E56',
  },
  {
    label: 'Clientes',
    value: '86',
    change: '+3',
    trend: 'up',
    icon: Users,
    color: '#1D9E75',
  },
  {
    label: 'Importaciones Activas',
    value: '4',
    change: '2 en tránsito',
    trend: 'neutral',
    icon: Ship,
    color: '#2563eb',
  },
  {
    label: 'Stock Bajo Mínimo',
    value: '17',
    change: '-5 vs. mes anterior',
    trend: 'down',
    icon: AlertTriangle,
    color: '#dc2626',
  },
]

const RECENT_ACTIVITY = [
  { id: 1, action: 'Nueva cotización COT-2026-00042', time: 'Hace 2 horas', type: 'cotizacion' },
  { id: 2, action: 'Importación IMP-2026-00008 llegó a aduana', time: 'Hace 5 horas', type: 'importacion' },
  { id: 3, action: 'Stock actualizado: Filtro Toyota 04152', time: 'Ayer 16:30', type: 'inventario' },
  { id: 4, action: 'Nuevo cliente: Repuestos Santa Cruz SRL', time: 'Ayer 10:15', type: 'cliente' },
  { id: 5, action: 'OC-2026-00015 enviada a proveedor NGK', time: 'Hace 2 días', type: 'compra' },
]

const QUICK_ACTIONS = [
  { label: 'Nuevo Cliente', icon: Users, color: '#0F6E56' },
  { label: 'Nueva Cotización', icon: ShoppingCart, color: '#1D9E75' },
  { label: 'Registrar Importación', icon: Ship, color: '#2563eb' },
  { label: 'Ver Stock Bajo', icon: AlertTriangle, color: '#dc2626' },
]

export default function Dashboard() {
  const { profile, rolNombre } = useAuth()
  const greeting = getGreeting()

  return (
    <div className="dashboard">
      {/* Welcome header */}
      <div className="dashboard-welcome">
        <div>
          <h2 className="dashboard-welcome-title">
            {greeting}, {profile?.nombre || 'Usuario'} 👋
          </h2>
          <p className="dashboard-welcome-subtitle">
            Aquí tienes el resumen de hoy — {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="dashboard-stats">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card">
              <div className="stat-card-header">
                <div
                  className="stat-card-icon"
                  style={{ backgroundColor: stat.color + '14', color: stat.color }}
                >
                  <Icon size={22} />
                </div>
                {stat.trend === 'up' && (
                  <span className="stat-trend stat-trend--up">
                    <ArrowUpRight size={14} /> {stat.change}
                  </span>
                )}
                {stat.trend === 'down' && (
                  <span className="stat-trend stat-trend--down">
                    <ArrowDownRight size={14} /> {stat.change}
                  </span>
                )}
                {stat.trend === 'neutral' && (
                  <span className="stat-trend stat-trend--neutral">
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="stat-card-value">{stat.value}</p>
              <p className="stat-card-label">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Two column layout */}
      <div className="dashboard-grid">
        {/* Recent activity */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <Clock size={18} />
            <h3>Actividad Reciente</h3>
          </div>
          <div className="dashboard-card-body">
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className="activity-item">
                <div className={`activity-dot activity-dot--${item.type}`} />
                <div className="activity-content">
                  <p className="activity-action">{item.action}</p>
                  <span className="activity-time">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <TrendingUp size={18} />
            <h3>Acciones Rápidas</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    className="quick-action-btn"
                    title="Disponible próximamente"
                  >
                    <div
                      className="quick-action-icon"
                      style={{ backgroundColor: action.color + '14', color: action.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mini chart placeholder */}
          <div className="dashboard-card-header" style={{ marginTop: '1.5rem' }}>
            <BarChart3 size={18} />
            <h3>Resumen Mensual</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-placeholder">
              <div className="chart-bars">
                {[65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50, 88].map((h, i) => (
                  <div key={i} className="chart-bar-wrapper">
                    <div
                      className="chart-bar"
                      style={{ height: `${h}%` }}
                    />
                    <span className="chart-bar-label">
                      {['E','F','M','A','M','J','J','A','S','O','N','D'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="chart-note">
                Datos simulados — se conectarán con <code>vista_estadisticas_mensuales</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate(date) {
  return date.toLocaleDateString('es-BO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
