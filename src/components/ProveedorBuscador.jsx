import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Building2, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProveedorForm from '../pages/proveedores/components/ProveedorForm';

export default function ProveedorBuscador({ value, onChange, error }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [selectedProv, setSelectedProv] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const wrapperRef = useRef(null);

  // Cargar proveedor si hay value inicial
  useEffect(() => {
    if (value && (!selectedProv || selectedProv.id !== value)) {
      fetchProveedor(value);
    } else if (!value) {
      setSelectedProv(null);
    }
  }, [value]);

  async function fetchProveedor(id) {
    try {
      const { data } = await supabase.from('proveedores').select('*').eq('id', id).single();
      if (data) setSelectedProv(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Buscar proveedores
  useEffect(() => {
    if (isOpen) {
      buscarProveedores();
    }
  }, [debouncedSearch, isOpen]);

  async function buscarProveedores() {
    setLoading(true);
    try {
      let query = supabase.from('proveedores').select('*').eq('activo', true).is('deleted_at', null).order('empresa').limit(10);
      if (debouncedSearch) {
        query = query.ilike('empresa', `%${debouncedSearch}%`);
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

  const handleSelect = (prov) => {
    setSelectedProv(prov);
    onChange(prov.id, prov);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedProv(null);
    onChange('', null);
    setSearchTerm('');
    setIsOpen(true);
  };

  const handleFormSuccess = async () => {
    buscarProveedores();
  };

  // Render compacto si hay seleccionado
  if (selectedProv) {
    return (
      <div style={{
        padding: '12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9F9F7'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px' }}>
            {selectedProv.empresa?.substring(0,2).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#2C2C2A' }}>{selectedProv.empresa}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#888780', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={10} /> {selectedProv.pais || 'Sin país'}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={handleClear}
          style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#5C5B57', cursor: 'pointer' }}
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} color="#888780" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar proveedor..."
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
              {options.map(prov => (
                <div 
                  key={prov.id}
                  onClick={() => handleSelect(prov)}
                  style={{ padding: '10px 12px', borderBottom: '1px solid #F1EFE8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9F9F7'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <Building2 size={16} color="#888780" />
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#2C2C2A' }}>{prov.empresa}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#888780' }}>{prov.contacto_nombre || 'Sin contacto'} • {prov.pais || 'Sin país'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#888780', fontSize: '13px' }}>
              No se encontraron proveedores.
            </div>
          )}

          <div style={{ padding: '8px', borderTop: '1px solid #E5E7EB', background: '#F9F9F7', position: 'sticky', bottom: 0 }}>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowForm(true); setIsOpen(false); }}
              style={{ width: '100%', background: 'white', border: '1px dashed #0F6E56', borderRadius: '6px', padding: '8px', fontSize: '13px', fontWeight: 500, color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Plus size={14} /> Crear nuevo proveedor
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#EF4444' }}>{error.message || 'Requerido'}</p>}

      <ProveedorForm 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        onSuccess={handleFormSuccess}
        proveedorId={null}
      />
    </div>
  );
}
