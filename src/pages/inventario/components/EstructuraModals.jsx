import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { alertError, alertSuccess } from '../../../lib/alerts'
import { X, Save, Loader2 } from 'lucide-react'

// Modal Base
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#2C2C2A]">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F1EFE8] rounded-md text-[#888780]">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export function SucursalModal({ isOpen, onClose, onSuccess, editData }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (isOpen) reset(editData || { codigo: '', nombre: '', ciudad: '', direccion: '' })
  }, [isOpen, editData, reset])

  const onSubmit = async (data) => {
    try {
      if (editData?.id) {
        const { error } = await supabase.from('sucursales').update(data).eq('id', editData.id)
        if (error) throw error
        alertSuccess('Actualizado', 'Sucursal actualizada correctamente.')
      } else {
        const { error } = await supabase.from('sucursales').insert([data])
        if (error) throw error
        alertSuccess('Creado', 'Sucursal creada correctamente.')
      }
      onSuccess()
      onClose()
    } catch (error) {
      alertError('Error', error.message || 'No se pudo guardar la sucursal.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Editar Sucursal" : "Nueva Sucursal"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Código *</label>
          <input {...register('codigo', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] uppercase" placeholder="Ej: SUC-SCZ" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Nombre *</label>
          <input {...register('nombre', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" placeholder="Ej: Sucursal Central" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Ciudad</label>
            <input {...register('ciudad')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Dirección</label>
            <input {...register('direccion')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#5C5B57] font-medium hover:bg-[#F9F9F7]">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white font-medium hover:bg-[#0C5844] flex items-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function AlmacenModal({ isOpen, onClose, onSuccess, sucursalId, editData }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (isOpen) reset(editData || { codigo: '', nombre: '', descripcion: '' })
  }, [isOpen, editData, reset])

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, sucursal_id: sucursalId }
      if (editData?.id) {
        const { error } = await supabase.from('almacenes').update(payload).eq('id', editData.id)
        if (error) throw error
        alertSuccess('Actualizado', 'Almacén actualizado.')
      } else {
        const { error } = await supabase.from('almacenes').insert([payload])
        if (error) throw error
        alertSuccess('Creado', 'Almacén creado.')
      }
      onSuccess()
      onClose()
    } catch (error) {
      alertError('Error', error.message || 'No se pudo guardar el almacén.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Editar Almacén" : "Nuevo Almacén"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Código *</label>
          <input {...register('codigo', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] uppercase" placeholder="Ej: ALM-02" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Nombre *</label>
          <input {...register('nombre', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" placeholder="Ej: Bodega Aduana" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Descripción</label>
          <textarea {...register('descripcion')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] resize-none" rows="2" />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#5C5B57] font-medium hover:bg-[#F9F9F7]">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white font-medium hover:bg-[#0C5844] flex items-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function UbicacionModal({ isOpen, onClose, onSuccess, almacenId, editData }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (isOpen) reset(editData || { codigo: '', descripcion: '' })
  }, [isOpen, editData, reset])

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, almacen_id: almacenId }
      if (editData?.id) {
        const { error } = await supabase.from('ubicaciones').update(payload).eq('id', editData.id)
        if (error) throw error
        alertSuccess('Actualizado', 'Ubicación actualizada.')
      } else {
        const { error } = await supabase.from('ubicaciones').insert([payload])
        if (error) throw error
        alertSuccess('Creado', 'Ubicación creada.')
      }
      onSuccess()
      onClose()
    } catch (error) {
      alertError('Error', error.message || 'No se pudo guardar la ubicación.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Editar Ubicación" : "Nueva Ubicación"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Código de Estante/Posición *</label>
          <input {...register('codigo', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] uppercase font-mono" placeholder="Ej: A-10-B" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Descripción</label>
          <input {...register('descripcion')} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]" placeholder="Ej: Pasillo 1, Estante Superior" />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#5C5B57] font-medium hover:bg-[#F9F9F7]">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white font-medium hover:bg-[#0C5844] flex items-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}
