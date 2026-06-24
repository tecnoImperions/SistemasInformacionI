import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Plus, Building2, Warehouse, MapPin, Loader2, Edit2, ShieldCheck } from 'lucide-react'
import { SucursalModal, AlmacenModal, UbicacionModal } from './components/EstructuraModals'

export default function AlmacenesPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados para modales
  const [modalSucursal, setModalSucursal] = useState({ isOpen: false, editData: null })
  const [modalAlmacen, setModalAlmacen] = useState({ isOpen: false, sucursalId: null, editData: null })
  const [modalUbicacion, setModalUbicacion] = useState({ isOpen: false, almacenId: null, editData: null })

  useEffect(() => {
    fetchEstructura()
  }, [])

  async function fetchEstructura() {
    setLoading(true)
    try {
      const { data: sucursales, error } = await supabase
        .from('sucursales')
        .select(`
          id, codigo, nombre, ciudad, direccion, es_principal, activo, deleted_at,
          almacenes (
            id, codigo, nombre, descripcion, activo, deleted_at,
            ubicaciones (
              id, codigo, descripcion, activo
            )
          )
        `)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('es_principal', { ascending: false })
        .order('id')

      if (error) throw error

      // Filtrar hijos inactivos o eliminados en memoria
      const filteredData = sucursales.map(s => ({
        ...s,
        almacenes: s.almacenes
          .filter(a => a.activo && !a.deleted_at)
          .map(a => ({
            ...a,
            ubicaciones: a.ubicaciones.filter(u => u.activo).sort((x, y) => x.id - y.id)
          }))
          .sort((x, y) => x.id - y.id)
      }))

      setData(filteredData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inventario')}
            className="p-2 rounded-lg hover:bg-[#E5E7EB] text-[#888780] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#2C2C2A] m-0 flex items-center gap-2">
              <Building2 size={24} color="#0F6E56" />
              Estructura Física
            </h1>
            <p className="text-sm text-[#888780] m-0 mt-1">Gestiona sucursales, almacenes y ubicaciones (estantes)</p>
          </div>
        </div>
        <button
          onClick={() => setModalSucursal({ isOpen: true, editData: null })}
          className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white font-medium hover:bg-[#0C5844] transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus size={16} /> Nueva Sucursal
        </button>
      </div>

      <div className="space-y-6">
        {data.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#D1CFC8]">
            <Building2 size={32} color="#D1CFC8" className="mx-auto mb-3" />
            <p className="text-[#888780] text-sm">No hay sucursales registradas.</p>
          </div>
        ) : (
          data.map(sucursal => (
            <div key={sucursal.id} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
              {/* Header Sucursal */}
              <div className="bg-[#F9F9F7] px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#2C2C2A] m-0">{sucursal.nombre}</h2>
                    {sucursal.es_principal && (
                      <span className="bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <ShieldCheck size={10} /> PRINCIPAL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888780] m-0 mt-1 flex items-center gap-1">
                    {sucursal.codigo} • {sucursal.ciudad || 'Sin ciudad'} {sucursal.direccion ? `• ${sucursal.direccion}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setModalSucursal({ isOpen: true, editData: sucursal })}
                    className="p-1.5 text-[#888780] hover:bg-[#E5E7EB] rounded-md transition-colors" title="Editar Sucursal"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setModalAlmacen({ isOpen: true, sucursalId: sucursal.id, editData: null })}
                    className="px-3 py-1.5 rounded-lg border border-[#0F6E56] text-[#0F6E56] text-xs font-medium hover:bg-[#E1F5EE] transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Añadir Almacén
                  </button>
                </div>
              </div>

              {/* Contenido Almacenes */}
              <div className="p-6">
                {sucursal.almacenes.length === 0 ? (
                  <p className="text-sm text-[#888780] italic">Esta sucursal no tiene almacenes registrados.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sucursal.almacenes.map(almacen => (
                      <div key={almacen.id} className="border border-[#F1EFE8] rounded-lg bg-white overflow-hidden">
                        {/* Header Almacén */}
                        <div className="px-4 py-3 border-b border-[#F1EFE8] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Warehouse size={16} color="#185FA5" />
                            <div>
                              <h3 className="text-sm font-semibold text-[#2C2C2A] m-0">{almacen.nombre}</h3>
                              <p className="text-[11px] text-[#888780] m-0">{almacen.codigo}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setModalAlmacen({ isOpen: true, sucursalId: sucursal.id, editData: almacen })}
                              className="p-1 text-[#888780] hover:bg-[#F9F9F7] rounded" title="Editar Almacén"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setModalUbicacion({ isOpen: true, almacenId: almacen.id, editData: null })}
                              className="p-1 text-[#185FA5] hover:bg-[#E6F1FB] rounded" title="Añadir Estante"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        {/* Ubicaciones */}
                        <div className="p-3 bg-[#F9F9F7]">
                          {almacen.ubicaciones.length === 0 ? (
                            <p className="text-xs text-[#888780] pl-6 py-1">Sin ubicaciones (estantes).</p>
                          ) : (
                            <div className="flex flex-wrap gap-2 pl-6">
                              {almacen.ubicaciones.map(ubicacion => (
                                <div 
                                  key={ubicacion.id} 
                                  className="group flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2 py-1 rounded text-xs text-[#5C5B57] shadow-sm hover:border-[#185FA5] cursor-default"
                                >
                                  <MapPin size={12} color="#888780" className="group-hover:text-[#185FA5]" />
                                  <span className="font-medium">{ubicacion.codigo}</span>
                                  <button 
                                    onClick={() => setModalUbicacion({ isOpen: true, almacenId: almacen.id, editData: ubicacion })}
                                    className="ml-1 text-[#D1CFC8] hover:text-[#2C2C2A]"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modales */}
      <SucursalModal 
        isOpen={modalSucursal.isOpen} 
        editData={modalSucursal.editData}
        onClose={() => setModalSucursal({ isOpen: false, editData: null })} 
        onSuccess={fetchEstructura} 
      />
      <AlmacenModal 
        isOpen={modalAlmacen.isOpen} 
        sucursalId={modalAlmacen.sucursalId}
        editData={modalAlmacen.editData}
        onClose={() => setModalAlmacen({ isOpen: false, sucursalId: null, editData: null })} 
        onSuccess={fetchEstructura} 
      />
      <UbicacionModal 
        isOpen={modalUbicacion.isOpen} 
        almacenId={modalUbicacion.almacenId}
        editData={modalUbicacion.editData}
        onClose={() => setModalUbicacion({ isOpen: false, almacenId: null, editData: null })} 
        onSuccess={fetchEstructura} 
      />
    </div>
  )
}
