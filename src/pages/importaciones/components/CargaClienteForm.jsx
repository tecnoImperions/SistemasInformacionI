import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/ProtectedRoute'
import { alertSuccess, alertError } from '../../../lib/alerts'
import { X, Save, Loader2, Search, User } from 'lucide-react'

export default function CargaClienteForm({ isOpen, onClose, onSuccess, importacionId, cargaEdit }) {
  const { user } = useAuth()
  const isEdit = !!cargaEdit
  const [loading, setLoading] = useState(false)

  // Autocomplete state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState(null)
  const dropdownRef = useRef(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      descripcion: '',
      cantidad_bultos: 1,
      peso_kg: 0,
      volumen_m3: 0,
      ref_cliente: '',
      monto_ref: 0,
      moneda: 'USD',
      estado_entrega: 'PENDIENTE',
      fecha_entrega: '',
      observaciones: ''
    }
  })

  const watchEstado = watch('estado_entrega')

  // Debounce para buscador de cliente
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    if (debouncedTerm && !selectedCliente) {
      searchClientes()
    } else {
      setSearchResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm])

  async function searchClientes() {
    setIsSearching(true)
    try {
      const cleanTerm = debouncedTerm.replace(/,/g, ' ')
      const t = `%${cleanTerm}%`
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, empresa, nit_ci')
        .is('deleted_at', null)
        .or(`nombre.ilike.${t},empresa.ilike.${t},nit_ci.ilike.${t}`)
        .limit(5)
      
      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (isEdit && cargaEdit) {
        reset({
          descripcion: cargaEdit.descripcion || '',
          cantidad_bultos: cargaEdit.cantidad_bultos || 1,
          peso_kg: cargaEdit.peso_kg || 0,
          volumen_m3: cargaEdit.volumen_m3 || 0,
          ref_cliente: cargaEdit.ref_cliente || '',
          monto_ref: cargaEdit.monto_ref || 0,
          moneda: cargaEdit.moneda || 'USD',
          estado_entrega: cargaEdit.estado_entrega || 'PENDIENTE',
          fecha_entrega: cargaEdit.fecha_entrega || '',
          observaciones: cargaEdit.observaciones || ''
        })
        setSelectedCliente({
          id: cargaEdit.cliente_id,
          nombre: cargaEdit.clientes?.nombre,
          empresa: cargaEdit.clientes?.empresa
        })
        setSearchTerm(cargaEdit.clientes?.nombre || '')
      } else {
        reset({
          descripcion: '',
          cantidad_bultos: 1,
          peso_kg: 0,
          volumen_m3: 0,
          ref_cliente: '',
          monto_ref: 0,
          moneda: 'USD',
          estado_entrega: 'PENDIENTE',
          fecha_entrega: '',
          observaciones: ''
        })
        setSelectedCliente(null)
        setSearchTerm('')
      }
    }
  }, [isOpen, isEdit, cargaEdit, reset])

  function selectCliente(cli) {
    setSelectedCliente(cli)
    setSearchTerm(cli.empresa ? `${cli.nombre} - ${cli.empresa}` : cli.nombre)
    setSearchResults([])
  }

  function handleSearchChange(e) {
    setSearchTerm(e.target.value)
    if (selectedCliente) {
      setSelectedCliente(null)
    }
  }

  async function onSubmit(data) {
    if (!selectedCliente) {
      alertError('Error de validación', 'El cliente ya se encuentra en esta importación')
      return
    }

    setLoading(true)
    try {
      const payload = {
        importacion_id: importacionId,
        cliente_id: selectedCliente.id,
        descripcion: data.descripcion,
        cantidad_bultos: data.cantidad_bultos || null,
        peso_kg: data.peso_kg || null,
        volumen_m3: data.volumen_m3 || null,
        ref_cliente: data.ref_cliente || null,
        monto_ref: data.monto_ref || 0,
        moneda: data.moneda,
        estado_entrega: data.estado_entrega,
        fecha_entrega: data.estado_entrega === 'ENTREGADO' ? (data.fecha_entrega || new Date().toISOString().split('T')[0]) : null,
        observaciones: data.observaciones || null
      }

      if (isEdit) {
        const { error } = await supabase.from('cargas_cliente').update(payload).eq('id', cargaEdit.id)
        if (error) throw error
        alertSuccess('Carga actualizada', 'La carga del cliente fue actualizada.')
      } else {
        payload.created_by = user.id
        const { error } = await supabase.from('cargas_cliente').insert([payload])
        if (error) throw error
        alertSuccess('Carga agregada', 'La carga del cliente fue agregada a la importación.')
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alertError('Error al guardar', error.message || 'Verifica los datos e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Slide-over Modal */}
      <div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300">
        <div className="flex items-center justify-between border-b border-[#e8e6df] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#2C2C2A]">
            {isEdit ? 'Editar Carga de Cliente' : 'Agregar Carga'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-2 text-[#888780] transition-colors hover:bg-[#F1EFE8] hover:text-[#2C2C2A]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="cc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Buscador de Cliente */}
            <div className="space-y-1 relative" ref={dropdownRef}>
              <label className="text-sm font-medium text-[#2C2C2A]">Cliente *</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={loading}
                  placeholder="Buscar cliente..."
                  className={`w-full rounded-lg border border-[#e8e6df] bg-white py-2 pl-9 pr-3 text-[14px] text-[#2C2C2A] outline-none transition-colors focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] disabled:bg-gray-50 ${selectedCliente ? 'bg-[#E1F5EE]/30 border-[#0F6E56]/30' : ''}`}
                />
                {isSearching && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#888780]" />
                )}
              </div>
              
              {/* Dropdown de resultados */}
              {searchResults.length > 0 && !selectedCliente && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 overflow-hidden rounded-lg border border-[#e8e6df] bg-white shadow-lg">
                  {searchResults.map(cli => (
                    <button
                      key={cli.id}
                      type="button"
                      onClick={() => selectCliente(cli)}
                      className="flex w-full flex-col px-4 py-2 text-left hover:bg-[#F1EFE8]"
                    >
                      <span className="font-medium text-[#2C2C2A]">{cli.nombre}</span>
                      {cli.empresa && <span className="text-xs text-[#888780]">{cli.empresa}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#2C2C2A]">Descripción Mercadería *</label>
              <textarea
                {...register('descripcion', { required: true })}
                disabled={loading}
                rows={2}
                className="w-full resize-none rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                placeholder="Ej: Repuestos automotrices (filtros y bujías)"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#2C2C2A]">Bultos</label>
                <input
                  type="number"
                  {...register('cantidad_bultos', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#2C2C2A]">Peso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('peso_kg', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#2C2C2A]">Volumen (m³)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('volumen_m3', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#2C2C2A]">Monto Ref.</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('monto_ref', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#2C2C2A]">Moneda</label>
                <select
                  {...register('moneda')}
                  className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
                >
                  <option value="USD">USD</option>
                  <option value="BOB">BOB</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#2C2C2A]">Referencia del Cliente</label>
              <input
                type="text"
                {...register('ref_cliente')}
                placeholder="OC-2023-01"
                className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#2C2C2A]">Estado de Entrega</label>
              <select
                {...register('estado_entrega')}
                className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN_ALMACEN">EN ALMACÉN</option>
                <option value="ENTREGADO">ENTREGADO</option>
                <option value="DEVUELTO">DEVUELTO</option>
              </select>
            </div>

            {watchEstado === 'ENTREGADO' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium text-[#2C2C2A]">Fecha de Entrega</label>
                <input
                  type="date"
                  {...register('fecha_entrega')}
                  className="w-full rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#2C2C2A]">Observaciones</label>
              <textarea
                {...register('observaciones')}
                rows={2}
                className="w-full resize-none rounded-lg border border-[#e8e6df] px-3 py-2 text-[14px] outline-none focus:border-[#0F6E56]"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e8e6df] bg-[#F1EFE8] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-[14px] font-medium text-[#2C2C2A] transition-colors hover:bg-[#e8e6df] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="cc-form"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#0F6E56] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#0b5a46] disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isEdit ? 'Guardar Cambios' : 'Registrar Carga'}</span>
          </button>
        </div>
      </div>
    </>
  )
}
