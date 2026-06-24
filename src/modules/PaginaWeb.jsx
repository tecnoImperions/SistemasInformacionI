import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getOptimizedUrl } from '../lib/cloudinary';
import { useStore } from '../lib/store';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PaginaWeb({ addToast }) {
  const { tipoCambio } = useStore();
  const [piezas, setPiezas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  // Carrito de compras
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: catData, error: catError } = await supabase.from('categorias').select('*').order('nombre');
      if (catError) throw catError;
      setCategorias(catData || []);

      const { data: piezasData, error: piezasError } = await supabase
        .from('catalogo_piezas')
        .select('*')
        .eq('disponible', true)
        .gt('stock', 0)
        .order('id_pieza', { ascending: false });

      if (piezasError) throw piezasError;
      setPiezas(piezasData || []);
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudo cargar el catálogo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const parseOffer = (descripcion) => {
    if (!descripcion) return { isOferta: false, pct: 0 };
    const match = descripcion.match(/^\[OFERTA:(\d+)\]/);
    if (match) return { isOferta: true, pct: parseInt(match[1]) };
    if (descripcion.includes('[OFERTA]')) return { isOferta: true, pct: 0 };
    return { isOferta: false, pct: 0 };
  };

  const calculatePrice = (pieza) => {
    const usd = parseFloat(pieza.precio_referencial) || 0;
    let bob = usd * tipoCambio;
    const { isOferta, pct } = parseOffer(pieza.descripcion);
    let originalBob = null;
    if (isOferta && pct > 0) {
      originalBob = bob;
      bob = bob * (1 - (pct / 100));
    }
    return { bob, originalBob, isOferta, pct, usd };
  };

  const filteredPiezas = piezas.filter(p => {
    const s = search.toLowerCase();
    const matchText = (p.nombre?.toLowerCase().includes(s) || p.marca?.toLowerCase().includes(s) || p.modelo_auto?.toLowerCase().includes(s));
    const matchCat = filterCategoria ? p.id_categoria.toString() === filterCategoria : true;
    return matchText && matchCat;
  });

  const addToCart = (pieza) => {
    setCart(prev => {
      const existing = prev.find(item => item.pieza.id_pieza === pieza.id_pieza);
      if (existing) {
        if (existing.cantidad >= pieza.stock) {
          if (addToast) addToast('Límite', 'No hay más stock disponible de este producto', 'warning');
          return prev;
        }
        return prev.map(item => item.pieza.id_pieza === pieza.id_pieza ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { pieza, cantidad: 1 }];
    });
    if (addToast) addToast('Agregado', `${pieza.nombre} añadido al carrito`, 'success');
  };

  const updateCartQty = (id_pieza, qty) => {
    setCart(prev => prev.map(item => {
      if (item.pieza.id_pieza === id_pieza) {
        const newQty = Math.max(1, Math.min(qty, item.pieza.stock));
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id_pieza) => {
    setCart(prev => prev.filter(item => item.pieza.id_pieza !== id_pieza));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (calculatePrice(item.pieza).bob * item.cantidad), 0);
  };

  const handlePrint = () => {
    if (cart.length === 0) return;
    window.print();
  };

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="pagina-web-container" style={{ background: '#F9FAFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER PÚBLICO */}
      <header className="no-print pagina-web-header" style={{ background: 'white', padding: '16px 5%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="pagina-web-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#1E3A8A', letterSpacing: '-0.5px' }}>IPBC <span style={{ color: '#F59E0B' }}>Store</span></div>
        </div>
        
        <div className="pagina-web-header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="search-box pagina-web-search" style={{ background: '#F3F4F6', borderRadius: '20px', padding: '8px 16px', display: 'flex', gap: '8px', width: '300px' }}>
            <Search size={18} color="#9CA3AF" />
            <input type="text" placeholder="¿Qué estás buscando?" value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px' }} />
          </div>
          
          <button onClick={() => setIsCartOpen(true)} style={{ position: 'relative', background: '#1E3A8A', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="no-print pagina-web-main" style={{ flex: 1, padding: '40px 5%' }}>
        <div className="pagina-web-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h1 className="pagina-web-title" style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-1px' }}>Catálogo en Línea</h1>
            <p className="pagina-web-subtitle" style={{ color: '#6B7280', marginTop: '8px' }}>Encuentra los mejores repuestos al mejor precio.</p>
          </div>
          <select 
            value={filterCategoria} 
            onChange={e => setFilterCategoria(e.target.value)}
            style={{ padding: '10px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', background: '#FFF', fontSize: '14px', outline: 'none', fontWeight: '500' }}
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280', fontSize: '18px' }}>Cargando catálogo...</div>
        ) : (
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {filteredPiezas.map(pieza => {
              const { bob, originalBob, isOferta, pct } = calculatePrice(pieza);
              
              return (
                <div key={pieza.id_pieza} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', border: '1px solid #F3F4F6' }} className="product-card-hover">
                  <div style={{ position: 'relative', height: '180px', backgroundColor: '#F9FAFB' }}>
                    {isOferta && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#EF4444', color: 'white', fontSize: '12px', fontWeight: '800', padding: '4px 8px', borderRadius: '4px', zIndex: 10 }}>
                        {pct > 0 ? `-${pct}% OFERTA` : 'OFERTA'}
                      </div>
                    )}
                    {pieza.imagen_url ? (
                      <img src={getOptimizedUrl(pieza.imagen_url, { width: 300, crop: 'fill' })} alt={pieza.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB' }}><ImageIcon size={48} /></div>
                    )}
                  </div>
                  
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>{pieza.marca}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '4px 0', lineHeight: '1.3' }}>{pieza.nombre}</div>
                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>{pieza.modelo_auto} {pieza.anio ? `(${pieza.anio})` : ''}</div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        {originalBob && <div style={{ fontSize: '12px', color: '#9CA3AF', textDecoration: 'line-through' }}>Bs. {originalBob.toFixed(2)}</div>}
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E3A8A' }}>Bs. {bob.toFixed(2)}</div>
                      </div>
                      <button 
                        onClick={() => addToCart(pieza)}
                        style={{ background: '#10B981', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
                        title="Añadir al carrito"
                      >
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PANEL DEL CARRITO LATERAL */}
      {isCartOpen && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={20} /> Mi Pedido</h2>
              <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={24} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', marginTop: '40px' }}>
                  <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p>Tu carrito está vacío.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cart.map(item => {
                    const price = calculatePrice(item.pieza).bob;
                    return (
                      <div key={item.pieza.id_pieza} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ width: '60px', height: '60px', background: '#F9FAFB', borderRadius: '8px', overflow: 'hidden' }}>
                          {item.pieza.imagen_url ? <img src={getOptimizedUrl(item.pieza.imagen_url, { width: 100 })} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} color="#D1D5DB" style={{ margin: '18px' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', lineHeight: '1.2', marginBottom: '4px' }}>{item.pieza.nombre}</div>
                          <div style={{ fontSize: '13px', color: '#2563EB', fontWeight: '700' }}>Bs. {price.toFixed(2)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                              <button onClick={() => updateCartQty(item.pieza.id_pieza, item.cantidad - 1)} style={{ padding: '4px 8px', background: '#F9FAFB', border: 'none', cursor: 'pointer' }}><Minus size={12} /></button>
                              <span style={{ padding: '0 12px', fontSize: '13px', fontWeight: '600' }}>{item.cantidad}</span>
                              <button onClick={() => updateCartQty(item.pieza.id_pieza, item.cantidad + 1)} style={{ padding: '4px 8px', background: '#F9FAFB', border: 'none', cursor: 'pointer' }}><Plus size={12} /></button>
                            </div>
                            <button onClick={() => removeFromCart(item.pieza.id_pieza)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }} title="Eliminar"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '18px', fontWeight: '800', color: '#111827' }}>
                  <span>Total Pedido:</span>
                  <span>Bs. {getTotal().toFixed(2)}</span>
                </div>
                <button 
                  onClick={handlePrint}
                  style={{ width: '100%', padding: '14px', background: '#1E3A8A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <FileText size={20} /> GENERAR PEDIDO
                </button>
                <p style={{ textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px' }}>Al generar el pedido podrás imprimirlo o guardarlo como PDF para enviarlo a un asesor.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA DE IMPRESIÓN (OCULTA HASTA Ctrl+P) */}
      <div className="print-only">
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '28px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>IPBC IMPORT</h1>
            <h2 style={{ fontSize: '18px', color: '#555', margin: 0 }}>SOLICITUD DE PEDIDO WEB</h2>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>Fecha: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left', width: '50%' }}>Producto</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Cant.</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>P. Unit (Bs.)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Subtotal (Bs.)</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => {
                const p = calculatePrice(item.pieza).bob;
                const sub = p * item.cantidad;
                return (
                  <tr key={index}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <strong>{item.pieza.nombre}</strong>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Ref: {item.pieza.marca} {item.pieza.modelo_auto}</div>
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{item.cantidad}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{p.toFixed(2)}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{sub.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', borderTop: '2px solid #000' }}>TOTAL A PAGAR:</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', borderTop: '2px solid #000' }}>Bs. {getTotal().toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '12px', color: '#666' }}>
            <p>Este documento es una solicitud de pedido generada desde el catálogo web.</p>
            <p>Por favor, envíe este documento (PDF) a su asesor comercial para procesar la compra.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
