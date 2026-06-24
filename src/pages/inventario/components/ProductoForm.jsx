import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { alertError, alertSuccess } from '../../../lib/alerts'
import { X, Save, Loader2, Image as ImageIcon } from 'lucide-react'

export default function ProductoForm({ isOpen, onClose, onSuccess, editData }) {
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [marcas, setMarcas] = useState([])
  const [unidades, setUnidades] = useState([])

  const { register, handleSubmit, reset, watch, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      codigo_interno: '',
      nombre: '',
      descripcion: '',
      categoria_id: '',
      marca_id: '',
      unidad_medida_id: 1,
      imagen_url: '',
      stock_minimo_global: 0,
      precio_costo_ref: '',
      precio_venta_ref: '',
      notas: ''
    }
  })

  useEffect(() => {
    if (isOpen) {
      loadDependencies()
      if (editData) {
        reset(editData)
      } else {
        reset({
          codigo_interno: '', nombre: '', descripcion: '', 
          categoria_id: '', marca_id: '', unidad_medida_id: 1, 
          imagen_url: '', stock_minimo_global: 0, 
          precio_costo_ref: '', precio_venta_ref: '', notas: ''
        })
      }
    }
  }, [isOpen, editData, reset])

  async function loadDependencies() {
    setLoadingConfig(true)
    try {
      const [cats, marks, unis] = await Promise.all([
        supabase.from('categorias').select('id, nombre').eq('activo', true),
        supabase.from('marcas').select('id, nombre').eq('activo', true),
        supabase.from('unidades_medida').select('id, nombre')
      ])
      if (cats.data) setCategorias(cats.data)
      if (marks.data) setMarcas(marks.data)
      if (unis.data) setUnidades(unis.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingConfig(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      // Formatear payload
      const payload = {
        codigo_interno: data.codigo_interno.trim().toUpperCase(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion || null,
        categoria_id: data.categoria_id ? parseInt(data.categoria_id) : null,
        marca_id: data.marca_id ? parseInt(data.marca_id) : null,
        unidad_medida_id: parseInt(data.unidad_medida_id),
        imagen_url: data.imagen_url || null,
        stock_minimo_global: parseInt(data.stock_minimo_global || 0),
        precio_costo_ref: data.precio_costo_ref ? parseFloat(data.precio_costo_ref) : null,
        precio_venta_ref: data.precio_venta_ref ? parseFloat(data.precio_venta_ref) : null,
        notas: data.notas || null
      }

      if (editData?.id) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editData.id)
        if (error) throw error
        alertSuccess('Actualizado', 'El producto se ha guardado correctamente.')
      } else {
        const { error } = await supabase.from('productos').insert([payload])
        if (error) {
          if (error.code === '23505') throw new Error('El código interno ya existe.')
          throw error
        }
        alertSuccess('Creado', 'El producto se ha registrado exitosamente.')
      }
      onSuccess()
      onClose()
    } catch (error) {
      alertError('Error', error.message || 'No se pudo guardar el producto.')
    }
  }

  const imgUrl = watch('imagen_url')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[#E5E7EB] bg-[#F9F9F7]">
          <div>
            <h2 className="text-xl font-bold text-[#2C2C2A]">{editData ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <p className="text-sm text-[#888780] m-0 mt-1">Ingresa la información para el catálogo maestro.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#E5E7EB] rounded-full text-[#888780] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {loadingConfig ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-[#0F6E56] w-8 h-8" />
            </div>
          ) : (
            <form id="producto-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Columna Izquierda: Imagen */}
                <div className="md:col-span-1 space-y-4">
                  <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-[#F9F9F7] aspect-square flex flex-col items-center justify-center text-center p-4 relative">
                    {imgUrl ? (
                      <img src={imgUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                    ) : (
                      <ImageIcon size={48} className="text-[#D1CFC8] mb-2" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#888780] mb-1">URL de Imagen</label>
                    <input 
                      {...register('imagen_url')} 
                      className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] text-sm bg-white" 
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Columna Derecha: Datos */}
                <div className="md:col-span-2 space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Código Interno *</label>
                      <input 
                        {...register('codigo_interno', { required: true })} 
                        className={`w-full border ${errors.codigo_interno ? 'border-red-500' : 'border-[#E5E7EB]'} rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] font-mono uppercase`} 
                        placeholder="Ej: FIL-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Unidad de Medida *</label>
                      <select {...register('unidad_medida_id', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] bg-white">
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Nombre del Producto *</label>
                    <input 
                      {...register('nombre', { required: true })} 
                      className={`w-full border ${errors.nombre ? 'border-red-500' : 'border-[#E5E7EB]'} rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]`} 
                      placeholder="Ej: Filtro de Aceite Hilux"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Categoría</label>
                      <select {...register('categoria_id')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] bg-white">
                        <option value="">Seleccione...</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Marca</label>
                      <select {...register('marca_id')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] bg-white">
                        <option value="">Seleccione...</option>
                        {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-[#888780] mb-1">Costo Ref. (USD)</label>
                      <input type="number" step="0.01" {...register('precio_costo_ref')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#888780] mb-1">Venta Ref. (USD)</label>
                      <input type="number" step="0.01" {...register('precio_venta_ref')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#888780] mb-1">Stock Mín. Global</label>
                      <input type="number" {...register('stock_minimo_global')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Descripción / Especificaciones</label>
                    <textarea {...register('descripcion')} rows="2" className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] resize-none" />
                  </div>

                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#E5E7EB] bg-white flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-[#E5E7EB] text-[#5C5B57] font-medium hover:bg-[#F9F9F7] transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" 
            form="producto-form"
            disabled={isSubmitting || loadingConfig} 
            className="px-5 py-2.5 rounded-lg bg-[#0F6E56] text-white font-medium hover:bg-[#0C5844] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
            Guardar Producto
          </button>
        </div>

      </div>
    </div>
  )
}
