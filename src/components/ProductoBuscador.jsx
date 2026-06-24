import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProductoBuscador({ onSelect, error, placeholder = "Buscar producto por nombre o código..." }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Buscar productos
  useEffect(() => {
    if (isOpen) {
      buscarProductos();
    }
  }, [debouncedSearch, isOpen]);

  async function buscarProductos() {
    setLoading(true);
    try {
      let query = supabase
        .from('productos')
        .select(`
          id, codigo_interno, nombre, precio_costo_ref,
          marca:marcas(nombre)
        `)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('nombre')
        .limit(10);
        
      if (debouncedSearch) {
        query = query.or(`nombre.ilike.%${debouncedSearch}%,codigo_interno.ilike.%${debouncedSearch}%`);
      }
      
      const { data } = await query;
      if (data) setOptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Cerrar al clickear afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prod) => {
    onSelect(prod);
    setIsOpen(false);
    setSearchTerm(''); // Limpiar para que puedan buscar otro
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} color="#888780" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{ 
            width: '100%', padding: '10px 12px 10px 36px', 
            border: `1.5px solid ${error ? '#EF4444' : '#E5E7EB'}`, 
            borderRadius: '8px', fontSize: '14px', outline: 'none' 
          }}
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white',
          border: '1px solid #E5E7EB', borderRadius: '8px', zIndex: 50, maxHeight: '240px', overflowY: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
        }}>
          {loading ? (
            <div style={{ padding: '12px', textAlign: 'center', color: '#888780', fontSize: '13px' }}>Buscando...</div>
          ) : options.length > 0 ? (
            <div>
              {options.map(prod => (
                <div 
                  key={prod.id}
                  onClick={() => handleSelect(prod)}
                  style={{ padding: '10px 12px', borderBottom: '1px solid #F1EFE8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9F9F7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#F1EFE8', color: '#888780', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#2C2C2A' }}>{prod.nombre}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#888780' }}>
                        {prod.codigo_interno} • {prod.marca?.nombre || 'Sin marca'}
                      </p>
                    </div>
                  </div>
                  <div style={{ color: '#0F6E56', fontSize: '12px', fontWeight: 500 }}>
                    + Agregar
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#888780', fontSize: '13px' }}>
              No se encontraron productos.
            </div>
          )}
        </div>
      )}

      {error && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#EF4444' }}>{error.message || 'Requerido'}</p>}
    </div>
  );
}
