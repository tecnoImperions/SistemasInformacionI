import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { alertError } from '../../lib/alerts'
import { Loader2, Plus } from 'lucide-react'
import SugerenciasPanel from './components/SugerenciasPanel'

export default function ComprasPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('ORDENES') // 'ORDENES' | 'SUGERENCIAS'
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtro
  const [estadoFilter, setEstadoFilter] = useState('TODOS')

  useEffect(() => {
    if (activeTab === 'ORDENES') {
      fetchOrdenes()
    }
  }, [activeTab, estadoFilter])

  async function fetchOrdenes() {
    setLoading(true)
    try {
      let query = supabase
        .from('ordenes_compra')
        .select(`
          *,
          proveedores(empresa, pais, email, whatsapp, canal_preferido)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (estadoFilter !== 'TODOS') {
        query = query.eq('estado', estadoFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setOrdenes(data || [])
    } catch (error) {
      console.error(error)
      alertError('Error al cargar órdenes', 'No se pudieron cargar las órdenes de compra.')
    } finally {
      setLoading(false)
    }
  }

  const badgeStyles = {
    BORRADOR: { bg: '#F1EFE8', text: '#888780' },
    ENVIADA: { bg: '#E6F1FB', text: '#185FA5' },
    RECIBIDA: { bg: '#EAF3DE', text: '#3B6D11' },
    CANCELADA: { bg: '#FCEBEB', text: '#A32D2D' },
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-[#2C2C2A]">Compras</h1>
          <p className="text-sm text-[#888780] mt-0.5">Órdenes de compra y sugerencias</p>
        </div>
        <Link
          to="/compras/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#0F6E56' }}
        >
          <Plus size={18} />
          Nueva Orden
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] mb-6">
        <button
          onClick={() => setActiveTab('ORDENES')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ORDENES'
              ? 'border-[#0F6E56] text-[#0F6E56]'
              : 'border-transparent text-[#888780] hover:text-[#2C2C2A]'
          }`}
        >
          Órdenes de Compra
        </button>
        <button
          onClick={() => setActiveTab('SUGERENCIAS')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'SUGERENCIAS'
              ? 'border-[#0F6E56] text-[#0F6E56]'
              : 'border-transparent text-[#888780] hover:text-[#2C2C2A]'
          }`}
        >
          Sugerencias de Compra
        </button>
      </div>

      {activeTab === 'ORDENES' && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {['TODOS', 'BORRADOR', 'ENVIADA', 'RECIBIDA', 'CANCELADA'].map(estado => (
              <button
                key={estado}
                onClick={() => setEstadoFilter(estado)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  estadoFilter === estado
                    ? 'bg-[#2C2C2A] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#888780] hover:bg-[#F9F9F7]'
                }`}
              >
                {estado === 'TODOS' ? 'Todas' : estado}
              </button>
            ))}
          </div>

          {/* Tabla de Órdenes */}
          <div className="rounded-xl overflow-hidden bg-white border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9F9F7] border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Número</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Fechas</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#888780] mx-auto mb-2" />
                        <p className="text-sm text-[#888780]">Cargando órdenes...</p>
                      </td>
                    </tr>
                  ) : ordenes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-sm text-[#888780]">No hay órdenes de compra en este estado.</p>
                      </td>
                    </tr>
                  ) : (
                    ordenes.map(oc => {
                      const badge = badgeStyles[oc.estado] || badgeStyles.BORRADOR
                      const fechaEmision = new Date(oc.fecha_emision).toLocaleDateString('es-ES')
                      const fechaEsperada = oc.fecha_esperada ? new Date(oc.fecha_esperada).toLocaleDateString('es-ES') : '—'

                      return (
                        <tr key={oc.id} className="hover:bg-[#F9F9F7] transition-colors group">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-[#F1EFE8] text-[#888780] text-xs font-medium">
                              {oc.numero}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[#2C2C2A]">{oc.proveedores?.empresa}</p>
                            <p className="text-xs text-[#888780]">{oc.proveedores?.pais}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[#2C2C2A]">{fechaEmision}</p>
                            <p className="text-xs text-[#888780]">Exp: {fechaEsperada}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[#2C2C2A]">
                              {Number(oc.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {oc.moneda}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                              style={{ backgroundColor: badge.bg, color: badge.text }}
                            >
                              {oc.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                to={`/compras/${oc.id}`}
                                className="text-sm font-medium text-[#185FA5] hover:underline"
                              >
                                Ver
                              </Link>
                              {oc.estado === 'BORRADOR' && (
                                <Link
                                  to={`/compras/${oc.id}/editar`}
                                  className="text-sm font-medium text-[#888780] hover:text-[#2C2C2A] hover:underline"
                                >
                                  Editar
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'SUGERENCIAS' && (
        <SugerenciasPanel />
      )}
    </div>
  )
}
