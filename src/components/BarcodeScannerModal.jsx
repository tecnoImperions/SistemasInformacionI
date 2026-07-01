import React, { useEffect, useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera as CapacitorCamera } from '@capacitor/camera';

export default function BarcodeScannerModal({ isOpen, onClose, onScan }) {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
        scannerRef.current = null;
      }
      return;
    }

    // Request camera permissions via Capacitor if on Android
    const checkPermissions = async () => {
      try {
        const permissions = await CapacitorCamera.checkPermissions();
        if (permissions.camera !== 'granted') {
          await CapacitorCamera.requestPermissions();
        }
      } catch (err) {
        console.log("Capacitor camera permissions not applicable or failed:", err);
      }
    };

    checkPermissions().then(() => {
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const scanner = new Html5QrcodeScanner("reader", config, false);
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          scanner.clear();
          onScan(decodedText);
          onClose();
        },
        (errorMessage) => {
          // Ignorar errores de lectura continua (cuando no hay código enfrente)
        }
      );
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: '500px',
        backgroundColor: '#1E293B', borderRadius: '12px', padding: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#38BDF8" /> Escáner de Códigos
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0F172A' }}></div>

        <div style={{ marginTop: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
          Apunta la cámara al código de barras o QR para escanearlo automáticamente.
        </div>
      </div>
    </div>
  );
}
