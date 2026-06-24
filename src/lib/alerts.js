import Swal from 'sweetalert2'

// Sonidos usando Web Audio API (sin archivos externos)
const playSound = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  if (type === 'success') {
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  }

  if (type === 'error') {
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  }

  if (type === 'warning') {
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  }

  if (type === 'confirm') {
    osc.frequency.setValueAtTime(330, ctx.currentTime)
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  }
}

// Configuración base de SweetAlert2
const baseConfig = {
  confirmButtonColor: '#0F6E56',
  cancelButtonColor: '#E5E7EB',
  customClass: {
    confirmButton: 'swal-btn-confirm',
    cancelButton: 'swal-btn-cancel',
    popup: 'swal-popup-ipcb',
    title: 'swal-title-ipcb',
  },
  buttonsStyling: false,
}

export const alertSuccess = (titulo, mensaje) => {
  playSound('success')
  return Swal.fire({
    ...baseConfig,
    icon: 'success',
    title: titulo,
    text: mensaje,
    timer: 2500,
    timerProgressBar: true,
    showConfirmButton: false,
  })
}

export const alertError = (titulo, mensaje) => {
  playSound('error')
  return Swal.fire({
    ...baseConfig,
    icon: 'error',
    title: titulo,
    text: mensaje,
    confirmButtonText: 'Entendido',
  })
}

export const alertWarning = (titulo, mensaje) => {
  playSound('warning')
  return Swal.fire({
    ...baseConfig,
    icon: 'warning',
    title: titulo,
    text: mensaje,
    confirmButtonText: 'Aceptar',
  })
}

export const alertConfirm = (titulo, mensaje, textoConfirmar = 'Sí, confirmar', textoCancelar = 'Cancelar') => {
  playSound('confirm')
  return Swal.fire({
    ...baseConfig,
    icon: 'question',
    title: titulo,
    text: mensaje,
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: textoCancelar,
    reverseButtons: true,
  })
}

export const alertConfirmDanger = (titulo, mensaje, textoConfirmar = 'Sí, eliminar', textoCancelar = 'Cancelar') => {
  playSound('warning')
  return Swal.fire({
    ...baseConfig,
    icon: 'warning',
    title: titulo,
    text: mensaje,
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: textoCancelar,
    confirmButtonColor: '#A32D2D',
    reverseButtons: true,
  })
}

export const alertLoading = (titulo, mensaje) => {
  Swal.fire({
    title: titulo,
    text: mensaje,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  })
}

export const alertClose = () => Swal.close()
