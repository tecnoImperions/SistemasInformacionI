const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = 'ipcb_unsigned' // Crear este preset en Cloudinary Dashboard

/**
 * Sube una imagen a Cloudinary usando un upload preset sin firma (unsigned)
 * @param {File} file - Archivo a subir
 * @param {string} folder - Carpeta destino en Cloudinary (ej: 'productos', 'documentos')
 * @returns {Promise<{url: string, public_id: string, original_filename: string}>}
 */
export async function uploadImage(file, folder = 'ipcb') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Error al subir imagen a Cloudinary')
  }

  const data = await response.json()
  return {
    url: data.secure_url,
    public_id: data.public_id,
    original_filename: data.original_filename,
  }
}

/**
 * Sube un documento (PDF, Excel, etc.) a Cloudinary
 * @param {File} file - Archivo a subir
 * @param {string} folder - Carpeta destino
 * @returns {Promise<{url: string, public_id: string, original_filename: string}>}
 */
export async function uploadDocument(file, folder = 'ipcb/documentos') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Error al subir documento a Cloudinary')
  }

  const data = await response.json()
  return {
    url: data.secure_url,
    public_id: data.public_id,
    original_filename: data.original_filename,
  }
}

/**
 * Genera URL optimizada de Cloudinary con transformaciones
 * @param {string} publicId - Public ID de la imagen en Cloudinary
 * @param {object} options - Opciones de transformación
 * @returns {string}
 */
export function getOptimizedUrl(publicId, options = {}) {
  const {
    width = 400,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options

  const transforms = [`q_${quality}`, `f_${format}`, `w_${width}`]
  if (height) transforms.push(`h_${height}`)
  if (crop) transforms.push(`c_${crop}`)

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(',')}/${publicId}`
}

export default {
  uploadImage,
  uploadDocument,
  getOptimizedUrl,
  CLOUD_NAME,
}
