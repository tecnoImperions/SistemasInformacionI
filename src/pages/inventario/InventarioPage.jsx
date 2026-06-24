import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { alertSuccess, alertError } from '../../lib/alerts'
import { Search, Plus, Settings, Package, AlertCircle, AlertTriangle, Warehouse, History, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react'

// Componentes (a crear luego)
import MovimientoForm from './components/MovimientoForm'
import AjusteStockForm from './components/AjusteStockForm'
import HistorialMovimientos from './components/HistorialMovimientos'

export default function InventarioPage() {
  const navigate = useNavigate()
  const [inventario, setInventario] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [estadoStock, setEstadoStock] = useState('')
  const [categoriaId, setCategoriaId] = useState('')

  // Listas para filtros
  const [almacenes, setAlmacenes] = useState([])
  const [categorias, setCategorias] = useState([])

  // Métricas
  const [metrics, setMetrics] = useState({
    totalActivos: 0,
    sinStock: 0,
    stockBajo: 0,
    totalUnidades: 0
  })

  // Modales
  const [formMovimiento, setFormMovimiento] = useState({ isOpen: false, tipo: '', productoId: null })
  const [formAjuste, setFormAjuste] = useState({ isOpen: false, productoId: null })
  const [historialPanel, setHistorialPanel] = useState({ isOpen: false, productoId: null, productoNombre: '' })

  useEffect(() => {
    fetchFiltros()
    fetchMetrics()
    fetchInventario()
  }, [])

  useEffect(() => {
    fetchInventario()
  }, [searchTerm, almacenId, estadoStock, categoriaId])

  async function fetchFiltros() {
    const { data: dataAlm } = await supabase.from('almacenes').select('id, nombre, codigo').eq('activo', true)
    const { data: dataCat } = await supabase.from('categorias').select('id, nombre').eq('activo', true)
    if (dataAlm) setAlmacenes(dataAlm)
    if (dataCat) setCategorias(dataCat)
  }

  async function fetchMetrics() {
    try {
      // 1. Total productos activos
      const { count: totalActivos } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)
        .is('deleted_at', null)

      // 2. Productos sin stock
      const { count: sinStock } = await supabase
        .from('inventario_stock')
        .select('*', { count: 'exact', head: true })
        .eq('stock_actual', 0)

      // 3. Productos bajo mínimo
      const { count: stockBajo } = await supabase
        .from('vista_stock_bajo')
        .select('*', { count: 'exact', head: true })

      // 4. Total unidades en stock
      const { data: sumData } = await supabase
        .from('inventario_stock')
        .select('stock_actual')
      
      const totalUnidades = sumData?.reduce((acc, curr) => acc + (curr.stock_actual || 0), 0) || 0

      setMetrics({
        totalActivos: totalActivos || 0,
        sinStock: sinStock || 0,
        stockBajo: stockBajo || 0,
        totalUnidades
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  async function fetchInventario() {
    try {
      setLoading(true)
      let query = supabase.from('vista_inventario_resumen').select('*')

      if (searchTerm) {
        query = query.or(`nombre.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`)
      }
      if (almacenId) {
        query = query.eq('almacen_id', almacenId)
      }
      if (categoriaId) {
        query = query.eq('categoria_id', categoriaId)
      }
      if (estadoStock) {
        query = query.eq('estado_stock', estadoStock)
      }

      const { data, error } = await query.order('nombre')
      
      if (error) throw error
      setInventario(data || [])
    } catch (error) {
      alertError('Error al cargar inventario', 'No se pudo cargar la lista de productos.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleMovimientoSuccess = () => {
    fetchMetrics()
    fetchInventario()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#2C2C2A', margin: 0 }}>
            Inventario
          </h1>
          <p style={{ fontSize: '14px', color: '#888780', marginTop: '4px', marginBottom: 0 }}>
            Control de stock y movimientos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/inventario/almacenes')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              backgroundColor: 'white', color: '#2C2C2A', border: '1px solid #E5E7EB'
            }}>
            <Warehouse size={16} />
            Estructura Física
          </button>
          <button
            onClick={() => setFormAjuste({ isOpen: true, productoId: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              backgroundColor: 'white', color: '#2C2C2A', border: '1px solid #E5E7EB'
            }}>
            <Settings size={16} />
            Ajuste de stock
          </button>
          <button
            onClick={() => setFormMovimiento({ isOpen: true, tipo: 'ENTRADA', productoId: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              backgroundColor: '#0F6E56', color: 'white', border: 'none'
            }}>
            <Plus size={16} />
            Entrada de stock
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1 */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '12px', color: '#888780', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total productos activos
            </p>
            <Package size={20} color="#0F6E56" />
          </div>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#2C2C2A', margin: '8px 0 0 0' }}>
            {metrics.totalActivos}
          </p>
        </div>
        {/* Card 2 */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '12px', color: '#888780', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Productos sin stock
            </p>
            <AlertCircle size={20} color="#A32D2D" />
          </div>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#2C2C2A', margin: '8px 0 0 0' }}>
            {metrics.sinStock}
          </p>
        </div>
        {/* Card 3 */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '12px', color: '#888780', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Productos bajo mínimo
            </p>
            <AlertTriangle size={20} color="#854F0B" />
          </div>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#2C2C2A', margin: '8px 0 0 0' }}>
            {metrics.stockBajo}
          </p>
        </div>
        {/* Card 4 */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '12px', color: '#888780', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total unidades en stock
            </p>
            <Warehouse size={20} color="#185FA5" />
          </div>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#2C2C2A', margin: '8px 0 0 0' }}>
            {metrics.totalUnidades}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#888780" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o código de producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #E5E7EB',
              fontSize: '14px', color: '#2C2C2A', outline: 'none'
            }}
          />
        </div>
        <select
          value={almacenId}
          onChange={(e) => setAlmacenId(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
        >
          <option value="">Todos los almacenes</option>
          {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nombre}</option>)}
        </select>
        <select
          value={estadoStock}
          onChange={(e) => setEstadoStock(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
        >
          <option value="">Cualquier estado</option>
          <option value="SIN_STOCK">Sin stock</option>
          <option value="STOCK_BAJO">Stock bajo</option>
          <option value="OK">Stock OK</option>
        </select>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9F9F7', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Producto</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Marca</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Almacén</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stock</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nivel</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={24} color="#888780" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : inventario.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#888780' }}>
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              inventario.map(item => {
                const stockMinimo = item.stock_minimo || 1
                const porcentaje = Math.min(100, Math.max(0, (item.stock_actual / (stockMinimo * 2)) * 100))
                
                let barraColor = '#3B6D11' // Verde OK
                if (item.estado_stock === 'SIN_STOCK') barraColor = '#E24B4A'
                else if (item.estado_stock === 'STOCK_BAJO') barraColor = '#BA7517'

                let badgeBg, badgeColor, badgeText
                if (item.estado_stock === 'SIN_STOCK') { badgeBg = '#FCEBEB'; badgeColor = '#A32D2D'; badgeText = 'Sin stock' }
                else if (item.estado_stock === 'STOCK_BAJO') { badgeBg = '#FAEEDA'; badgeColor = '#854F0B'; badgeText = 'Bajo mínimo' }
                else { badgeBg = '#EAF3DE'; badgeColor = '#3B6D11'; badgeText = 'OK' }

                return (
                  <tr key={`${item.producto_id}-${item.almacen_id}`} className="group" style={{ borderBottom: '1px solid #F1EFE8', backgroundColor: 'white' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9F9F7'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#2C2C2A' }}>{item.nombre}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#888780' }}>{item.codigo}</p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888780' }}>{item.marca || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888780' }}>{item.categoria_nombre || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#2C2C2A' }}>{item.almacen_codigo}</td>
                    
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#2C2C2A' }}>{item.stock_actual}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#888780' }}>Min: {stockMinimo}</p>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ width: '80px', height: '6px', backgroundColor: '#F1EFE8', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${porcentaje}%`, height: '100%', backgroundColor: barraColor, borderRadius: '3px', transition: 'width 0.3s' }} />
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {badgeText}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {/* Acciones invisibles hasta el hover usando la clase group y CSS */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <button
                          onClick={() => setFormMovimiento({ isOpen: true, tipo: 'ENTRADA', productoId: item.producto_id })}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: '#0F6E56', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E1F5EE'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Entrada"
                        >
                          <ArrowDownToLine size={16} />
                        </button>
                        <button
                          onClick={() => setFormMovimiento({ isOpen: true, tipo: 'SALIDA', productoId: item.producto_id })}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: '#A32D2D', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FCEBEB'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Salida"
                        >
                          <ArrowUpFromLine size={16} />
                        </button>
                        <button
                          onClick={() => setHistorialPanel({ isOpen: true, productoId: item.producto_id, productoNombre: item.nombre })}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: '#185FA5', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E6F1FB'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Historial"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <MovimientoForm
        isOpen={formMovimiento.isOpen}
        onClose={() => setFormMovimiento({ isOpen: false, tipo: '', productoId: null })}
        onSuccess={handleMovimientoSuccess}
        tipo={formMovimiento.tipo}
        productoId={formMovimiento.productoId}
      />

      <AjusteStockForm
        isOpen={formAjuste.isOpen}
        onClose={() => setFormAjuste({ isOpen: false, productoId: null })}
        onSuccess={handleMovimientoSuccess}
        productoId={formAjuste.productoId}
      />

      <HistorialMovimientos
        isOpen={historialPanel.isOpen}
        onClose={() => setHistorialPanel({ isOpen: false, productoId: null, productoNombre: '' })}
        productoId={historialPanel.productoId}
        productoNombre={historialPanel.productoNombre}
      />
    </div>
  )
}
