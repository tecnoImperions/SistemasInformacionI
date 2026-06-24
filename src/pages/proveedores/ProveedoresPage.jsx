import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Truck, Search, Plus } from 'lucide-react';
import ProveedorCard from './components/ProveedorCard';
import ProveedorForm from './components/ProveedorForm';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('Todos');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProveedores();
  }, [debouncedSearch, filtroCanal]);

  async function fetchProveedores() {
    setLoading(true);
    try {
      let query = supabase
        .from('proveedores')
        .select(`
          *,
          productos_count:producto_proveedor(count)
        `)
        .eq('activo', true)
        .is('deleted_at', null)
        .order('empresa', { ascending: true });

      if (debouncedSearch) {
        query = query.or(`empresa.ilike.%${debouncedSearch}%,pais.ilike.%${debouncedSearch}%,contacto_nombre.ilike.%${debouncedSearch}%`);
      }

      if (filtroCanal !== 'Todos') {
        query = query.eq('canal_preferido', filtroCanal.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const formatedData = data.map(d => ({
        ...d,
        cantidad_productos: d.productos_count[0]?.count || 0
      }));

      setProveedores(formatedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setSelectedProveedorId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (prov) => {
    setSelectedProveedorId(prov.id);
    setIsFormOpen(true);
  };

  const handleDetalle = (prov) => {
    // For now, it will act the same as edit, or navigate to a detail page if it existed.
    // The prompt says "Editar" y "Ver detalle" aparecen en hover. I'll open edit for both until a detail page is specified.
    handleEdit(prov);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#2C2C2A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={24} color="#0F6E56" /> Proveedores
          </h1>
          <p style={{ margin: 0, color: '#888780', fontSize: '14px' }}>
            Empresas y contactos internacionales
          </p>
        </div>
        
        <button 
          onClick={handleCreate}
          style={{ background: '#0F6E56', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
        >
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888780', pointerEvents: 'none' }}>
            <Search size={16} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por empresa, país o contacto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['Todos', 'WhatsApp', 'Email', 'Ambos'].map(f => (
            <button
              key={f}
              onClick={() => setFiltroCanal(f)}
              style={{
                background: filtroCanal === f ? '#2C2C2A' : 'white',
                color: filtroCanal === f ? 'white' : '#5C5B57',
                border: `1.5px solid ${filtroCanal === f ? '#2C2C2A' : '#E5E7EB'}`,
                borderRadius: '99px',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Proveedores */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height: '180px', background: '#F1EFE8', borderRadius: '12px', animation: 'skeleton 1.5s ease infinite' }} />
          ))}
        </div>
      ) : proveedores.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px dashed #D1CFC8', borderRadius: '16px', padding: '64px 24px', textAlign: 'center' }}>
          <Truck size={48} color="#D1CFC8" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 500, color: '#2C2C2A' }}>Aún no hay proveedores registrados</h3>
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#888780' }}>
            {searchTerm || filtroCanal !== 'Todos' 
              ? 'No hay resultados para los filtros actuales.'
              : 'Empieza agregando tu primer proveedor internacional.'}
          </p>
          <button 
            onClick={handleCreate}
            style={{ background: 'white', color: '#0F6E56', border: '1.5px solid #0F6E56', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Plus size={16} /> Agregar primer proveedor
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {proveedores.map(prov => (
            <ProveedorCard 
              key={prov.id} 
              proveedor={prov} 
              onClickEditar={handleEdit}
              onClickDetalle={handleDetalle}
            />
          ))}
        </div>
      )}

      <ProveedorForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={fetchProveedores}
        proveedorId={selectedProveedorId}
      />
      
      <style>{`
        @keyframes skeleton {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
