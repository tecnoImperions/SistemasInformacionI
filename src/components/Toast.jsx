import { useState, useEffect } from 'react'

export const toast = {
  success: (msg) => document.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: msg } })),
  error: (msg) => document.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: msg } })),
  info: (msg) => document.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'info', message: msg } }))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (e) => {
      const newToast = { id: Date.now(), ...e.detail }
      setToasts((prev) => [...prev, newToast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 3000)
    }
    document.addEventListener('app-toast', handleToast)
    return () => document.removeEventListener('app-toast', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    }}>
      {toasts.map((t) => {
        let bg, border, icon
        if (t.type === 'success') {
          bg = '#EAF3DE'
          border = '#3B6D11'
          icon = '✓'
        } else if (t.type === 'error') {
          bg = '#FCEBEB'
          border = '#A32D2D'
          icon = '✕'
        } else {
          bg = '#E6F1FB'
          border = '#185FA5'
          icon = 'i'
        }

        return (
          <div key={t.id} style={{
            backgroundColor: bg,
            borderLeft: `3px solid ${border}`,
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#2C2C2A',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'toast-enter 0.3s ease-out forwards',
            minWidth: '280px'
          }}>
            <span style={{ color: border, fontWeight: 'bold' }}>{icon}</span>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
