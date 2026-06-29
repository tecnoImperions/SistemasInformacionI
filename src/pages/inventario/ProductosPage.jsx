import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { alertError } from '../../lib/alerts'
import { Search, Plus, Edit2, Loader2, LayoutGrid, List, Package, Image as ImageIcon, Tag, Hash, Archive } from 'lucide-react'
import ProductoForm from './components/ProductoForm'

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'lista'

  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  // Debounce manual
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    fetchProductos()

    const channel = supabase
      .channel('productos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {
          fetchProductos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [debouncedSearch])

  async function fetchProductos() {
    setLoading(true)
    try {
      let query = supabase
        .from('productos')
        .select(`
          *,
          categorias(nombre),
          marcas(nombre),
          unidades_medida(codigo, nombre)
        `)
        .is('deleted_at', null)
        .order('id', { ascending: false })

      if (debouncedSearch) {
        const t = `%${debouncedSearch}%`
        query = query.or(`codigo_interno.ilike.${t},nombre.ilike.${t},descripcion.ilike.${t}`)
      }

      const { data, error } = await query
      if (error) throw error

      setProductos(data || [])
    } catch (error) {
      console.error(error)
      alertError('Error al cargar', 'No se pudieron cargar los productos.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (prod) => {
    setEditData(prod)
    setModalOpen(true)
  }

  const handleNew = () => {
    setEditData(null)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#2C2C2A] flex items-center gap-2">
            <Package size={24} color="#0F6E56" /> Catálogo de Productos
          </h2>
          <p className="text-sm text-[#888780] mt-1">Administra el maestro de artículos, descripciones y precios referenciales.</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0C5844] shadow-sm"
        >
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Controls: Search & Toggle */}
      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#E5E7EB] shadow-sm">
        <div className="relative w-full max-w-md ml-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent py-1.5 pl-10 pr-4 text-sm text-[#2C2C2A] outline-none"
          />
        </div>
        <div className="flex bg-[#F1EFE8] rounded-md p-1 mr-1">
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#888780]'}`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setViewMode('lista')} 
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${viewMode === 'lista' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#888780]'}`}
            title="Vista Tabla"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && productos.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[#0F6E56] w-8 h-8" />
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#D1CFC8]">
          <Package size={48} color="#D1CFC8" className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#2C2C2A] mb-1">Catálogo Vacío</h3>
          <p className="text-sm text-[#888780] mb-4">No se encontraron productos registrados.</p>
          <button onClick={handleNew} className="text-[#0F6E56] font-medium hover:underline">
            Crear el primer producto
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        // ================= GRID VIEW =================
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map(prod => (
            <div key={prod.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md hover:border-[#0F6E56] transition-all group overflow-hidden flex flex-col">
              {/* Imagen Superior */}
              <div className="aspect-video bg-[#F9F9F7] border-b border-[#E5E7EB] flex items-center justify-center overflow-hidden relative">
                {prod.imagen_url ? (
                  <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  <ImageIcon size={32} className="text-[#D1CFC8]" />
                )}
                {/* Overlay Hover Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleEdit(prod)} className="bg-white text-[#2C2C2A] p-2 rounded-full hover:bg-[#F9F9F7] shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido Card */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-[#185FA5] bg-[#E6F1FB] px-1.5 py-0.5 rounded">{prod.codigo_interno}</span>
                  {prod.precio_venta_ref > 0 && <span className="text-xs font-bold text-[#0F6E56]">${prod.precio_venta_ref}</span>}
                </div>
                <h3 className="font-semibold text-[#2C2C2A] text-sm leading-tight mb-1 line-clamp-2">{prod.nombre}</h3>
                
                <div className="mt-auto pt-3 flex items-center justify-between text-xs text-[#888780]">
                  <span className="flex items-center gap-1"><Tag size={12} /> {prod.categorias?.nombre || 'S/C'}</span>
                  <span className="flex items-center gap-1"><Hash size={12} /> {prod.marcas?.nombre || 'Gral'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ================= LIST VIEW =================
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#2C2C2A]">
              <thead className="bg-[#F9F9F7] border-b border-[#E5E7EB] text-xs uppercase text-[#888780] font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">Img</th>
                  <th className="px-6 py-4">Código & Nombre</th>
                  <th className="px-6 py-4">Clasificación</th>
                  <th className="px-6 py-4 text-right">Costo / Venta</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#F9F9F7] transition-colors">
                    <td className="px-6 py-4 text-center">
                      <div className="w-10 h-10 rounded border border-[#E5E7EB] bg-[#F1EFE8] flex items-center justify-center overflow-hidden mx-auto">
                        {prod.imagen_url ? (
                          <img src={prod.imagen_url} alt="img" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                        ) : (
                          <ImageIcon size={16} className="text-[#D1CFC8]" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-[#185FA5] mb-0.5">{prod.codigo_interno}</div>
                      <div className="font-medium text-[#2C2C2A]">{prod.nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#2C2C2A]">{prod.categorias?.nombre || 'Sin categoría'}</div>
                      <div className="text-xs text-[#888780] mt-0.5">{prod.marcas?.nombre || 'Sin marca'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-[#888780] text-xs">C: ${prod.precio_costo_ref || '0.00'}</div>
                      <div className="font-medium text-[#0F6E56]">V: ${prod.precio_venta_ref || '0.00'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(prod)}
                        className="p-2 text-[#888780] hover:text-[#0F6E56] hover:bg-[#E1F5EE] rounded-lg transition-colors inline-flex"
                        title="Editar Producto"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal CRUD */}
      <ProductoForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchProductos}
        editData={editData}
      />
    </div>
  )
}
