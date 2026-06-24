import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Edit2, FileText, Loader2, LayoutGrid, List, ArrowRight, Truck, Ship, Building2, PackageCheck } from 'lucide-react'
import { alertError, alertSuccess } from '../../lib/alerts'

const ESTADOS = [
  { id: 'EN_ORIGEN', label: 'En Origen', icon: Building2, color: 'text-[#185FA5]', bg: 'bg-[#185FA5]/10', border: 'border-[#185FA5]/20' },
  { id: 'EN_TRANSITO', label: 'En Tránsito', icon: Ship, color: 'text-[#854F0B]', bg: 'bg-[#854F0B]/10', border: 'border-[#854F0B]/20' },
  { id: 'ADUANA', label: 'En Aduana', icon: Truck, color: 'text-[#BA7517]', bg: 'bg-[#BA7517]/10', border: 'border-[#BA7517]/20' },
  { id: 'RECIBIDO', label: 'Recibido', icon: PackageCheck, color: 'text-[#3B6D11]', bg: 'bg-[#3B6D11]/10', border: 'border-[#3B6D11]/20' }
]

export default function ImportacionesPage() {
  const navigate = useNavigate()
  const [importaciones, setImportaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'lista'

  // Debounce manual
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    fetchImportaciones()
  }, [debouncedSearch])

  async function fetchImportaciones() {
    setLoading(true)
    try {
      let query = supabase
        .from('importaciones')
        .select('*, proveedores(empresa, pais)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (debouncedSearch) {
        const t = `%${debouncedSearch}%`
        query = query.or(`codigo.ilike.${t},numero_contenedor.ilike.${t}`)
      }

      const { data, error } = await query
      if (error) throw error

      setImportaciones(data || [])
    } catch (error) {
      console.error(error)
      alertError('Error al cargar', 'Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  // Avanzar estado rápidamente (Simulación de mover en kanban)
  const avanzarEstado = async (e, impId, estadoActual) => {
    e.preventDefault(); e.stopPropagation();
    const index = ESTADOS.findIndex(x => x.id === estadoActual);
    if (index === -1 || index === ESTADOS.length - 1) return;
    
    const nextEstado = ESTADOS[index + 1].id;
    if (nextEstado === 'RECIBIDO') {
      const confirm = window.confirm('¿Avanzar a Recibido? Se registrará en inventario automáticamente.');
      if (!confirm) return;
    }

    try {
      await supabase.from('importaciones').update({ estado: nextEstado }).eq('id', impId)
      fetchImportaciones(); // Refresh visual
    } catch(err) {}
  }

  // Métricas
  const counts = {
    EN_ORIGEN: importaciones.filter(i => i.estado === 'EN_ORIGEN').length,
    EN_TRANSITO: importaciones.filter(i => i.estado === 'EN_TRANSITO').length,
    ADUANA: importaciones.filter(i => i.estado === 'ADUANA').length,
    RECIBIDO: importaciones.filter(i => i.estado === 'RECIBIDO').length,
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#2C2C2A]">Importaciones</h2>
          <p className="text-sm text-[#888780] mt-1">Gestión logística de contenedores y cargas.</p>
        </div>
        <Link
          to="/importaciones/nuevo"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0C5844] shadow-sm"
        >
          <Plus size={18} />
          <span>Nueva Importación</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ESTADOS.map(est => (
          <div key={est.id} className={`p-4 rounded-xl border ${est.border} bg-white flex items-center justify-between shadow-sm`}>
            <div>
              <p className="text-xs font-medium text-[#888780] uppercase mb-1">{est.label}</p>
              <h3 className={`text-2xl font-bold ${est.color}`}>{counts[est.id] || 0}</h3>
            </div>
            <div className={`w-10 h-10 rounded-full ${est.bg} ${est.color} flex items-center justify-center`}>
              <est.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Controls: Search & Toggle */}
      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#E5E7EB] shadow-sm">
        <div className="relative w-full max-w-sm ml-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
          <input
            type="text"
            placeholder="Buscar contenedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent py-1.5 pl-10 pr-4 text-sm text-[#2C2C2A] outline-none"
          />
        </div>
        <div className="flex bg-[#F1EFE8] rounded-md p-1 mr-1">
          <button 
            onClick={() => setViewMode('kanban')} 
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === 'kanban' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#888780]'}`}
            title="Vista Kanban"
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setViewMode('lista')} 
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === 'lista' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#888780]'}`}
            title="Vista Lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && importaciones.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[#0F6E56] w-8 h-8" />
        </div>
      ) : viewMode === 'kanban' ? (
        // ================= KANBAN VIEW =================
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {ESTADOS.map((estado, idx) => (
            <div key={estado.id} className="flex-shrink-0 w-80 flex flex-col bg-[#F9F9F7] rounded-xl border border-[#E5E7EB] overflow-hidden">
              <div className={`px-4 py-3 border-b border-[#E5E7EB] bg-white flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${estado.bg.replace('/10', '')}`}></div>
                  <h3 className="text-sm font-semibold text-[#2C2C2A]">{estado.label}</h3>
                </div>
                <span className="bg-[#F1EFE8] text-[#888780] text-xs font-bold px-2 py-0.5 rounded-full">{counts[estado.id]}</span>
              </div>
              <div className="p-3 flex flex-col gap-3 min-h-[200px]">
                {importaciones.filter(i => i.estado === estado.id).map(imp => (
                  <div 
                    key={imp.id} 
                    onClick={() => navigate(`/importaciones/${imp.id}`)}
                    className="bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-sm hover:border-[#0F6E56] cursor-pointer transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#888780] bg-[#F1EFE8] px-1.5 py-0.5 rounded">{imp.tipo_contenedor || '20FT'}</span>
                      <span className="text-[11px] text-[#888780] font-medium">{imp.codigo}</span>
                    </div>
                    <h4 className="font-mono font-bold text-[#2C2C2A] text-sm mb-1">{imp.numero_contenedor || 'Sin asignar'}</h4>
                    <p className="text-xs text-[#5C5B57] line-clamp-1 mb-3">{imp.proveedores?.empresa}</p>
                    
                    <div className="flex items-center justify-between border-t border-[#F1EFE8] pt-3 mt-1">
                      <span className="text-[10px] text-[#888780]">Est. {imp.fecha_estimada_llegada || '-'}</span>
                      
                      {idx < ESTADOS.length - 1 && (
                        <button 
                          onClick={(e) => avanzarEstado(e, imp.id, imp.estado)}
                          className="text-[#0F6E56] bg-[#E1F5EE] p-1.5 rounded-full hover:bg-[#0C5844] hover:text-white transition-colors"
                          title="Avanzar estado"
                        >
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ================= LIST VIEW =================
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-[#2C2C2A]">
            <thead className="bg-[#F9F9F7] border-b border-[#E5E7EB] text-xs uppercase text-[#888780] font-medium tracking-wider">
              <tr>
                <th className="px-6 py-4">Contenedor</th>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Llegada Est.</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {importaciones.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-[#888780]">No se encontraron registros.</td>
                </tr>
              ) : (
                importaciones.map((imp) => (
                  <tr key={imp.id} className="hover:bg-[#F9F9F7] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-[#2C2C2A]">{imp.numero_contenedor || <span className="text-[#D1CFC8]">Sin asignar</span>}</div>
                      <div className="mt-1 text-xs text-[#888780]">{imp.codigo} • {imp.tipo_contenedor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#2C2C2A]">{imp.proveedores?.empresa}</div>
                      <div className="mt-1 text-xs text-[#888780]">{imp.proveedores?.pais || 'Internacional'}</div>
                    </td>
                    <td className="px-6 py-4 text-[#888780]">
                      {imp.fecha_estimada_llegada || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTADOS.find(e => e.id === imp.estado)?.bg} ${ESTADOS.find(e => e.id === imp.estado)?.color}`}>
                        {ESTADOS.find(e => e.id === imp.estado)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/importaciones/${imp.id}`)}
                        className="p-2 text-[#888780] hover:text-[#0F6E56] hover:bg-[#E1F5EE] rounded-lg transition-colors inline-flex"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
