import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImage, getOptimizedUrl } from '../lib/cloudinary';
import { useStore } from '../lib/store';
import { Search, Plus, Edit2, X, Image as ImageIcon, Package, Filter, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Catalogo({ addToast }) {
  const { tipoCambio } = useStore();
  const [piezas, setPiezas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  // Filtros y Orden
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [sortBy, setSortBy] = useState('recientes');
  
  const [selectedPieza, setSelectedPieza] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Stock Modal State
  const [stockModalPiece, setStockModalPiece] = useState(null);
  const [manualStockChange, setManualStockChange] = useState('');

  // Oferta Modal State
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [tempOfertaPct, setTempOfertaPct] = useState('');

  // Image Upload State
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    marca: '',
    modelo_auto: '',
    anio: '',
    descripcion: '',
    precio_referencial: '',
    id_categoria: '',
    imagen_url: '',
    disponible: true,
    enOferta: false,
    porcentajeOferta: ''
  });

  // Autocomplete/search state for Category
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const categoryRef = useRef(null);

  useEffect(() => {
    fetchData();

    // 1. Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('catalogo-admin-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalogo_piezas' },
        (payload) => {
          fetchData(); // Recarga los datos cuando alguien más modifique, añada o elimine una pieza
        }
      )
      .subscribe();

    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // 2. Limpieza al desmontar
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });
      if (catError) throw catError;
      setCategorias(catData || []);

      const { data: piezasData, error: piezasError } = await supabase
        .from('catalogo_piezas')
        .select('*, categorias ( nombre )')
        .order('id_pieza', { ascending: false });

      if (piezasError) throw piezasError;
      setPiezas(piezasData || []);
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudieron cargar los datos del catálogo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const marcasUnicas = [...new Set(piezas.map(p => p.marca).filter(Boolean))].sort();

  const parseOffer = (descripcion) => {
    if (!descripcion) return { isOferta: false, porcentaje: '', cleanDesc: '' };
    const match = descripcion.match(/^\[OFERTA:(\d+)\]/);
    if (match) {
      return { 
        isOferta: true, 
        porcentaje: match[1], 
        cleanDesc: descripcion.replace(match[0], '').trim() 
      };
    }
    if (descripcion.includes('[OFERTA]')) {
      return {
        isOferta: true,
        porcentaje: '',
        cleanDesc: descripcion.replace('[OFERTA]', '').trim()
      };
    }
    return { isOferta: false, porcentaje: '', cleanDesc: descripcion };
  };

  const getFilteredAndSortedPiezas = () => {
    let result = piezas.filter(p => {
      const s = search.toLowerCase();
      const matchText = (
        (p.nombre && p.nombre.toLowerCase().includes(s)) ||
        (p.marca && p.marca.toLowerCase().includes(s)) ||
        (p.modelo_auto && p.modelo_auto.toLowerCase().includes(s))
      );
      const matchCat = filterCategoria ? p.id_categoria.toString() === filterCategoria : true;
      const matchMarca = filterMarca ? p.marca === filterMarca : true;
      return matchText && matchCat && matchMarca;
    });

    if (sortBy === 'nombre_asc') result.sort((a, b) => a.nombre.localeCompare(b.nombre));
    else if (sortBy === 'nombre_desc') result.sort((a, b) => b.nombre.localeCompare(a.nombre));
    else if (sortBy === 'precio_asc') result.sort((a, b) => parseFloat(a.precio_referencial || 0) - parseFloat(b.precio_referencial || 0));
    else if (sortBy === 'precio_desc') result.sort((a, b) => parseFloat(b.precio_referencial || 0) - parseFloat(a.precio_referencial || 0));
    else if (sortBy === 'stock_asc') result.sort((a, b) => a.stock - b.stock);
    else if (sortBy === 'recientes') result.sort((a, b) => b.id_pieza - a.id_pieza);

    return result;
  };

  const openPanel = (pieza = null) => {
    if (pieza) {
      setSelectedPieza(pieza);
      const offerData = parseOffer(pieza.descripcion);
      
      setFormData({
        nombre: pieza.nombre || '',
        marca: pieza.marca || '',
        modelo_auto: pieza.modelo_auto || '',
        anio: pieza.anio || '',
        descripcion: offerData.cleanDesc,
        precio_referencial: pieza.precio_referencial || '',
        id_categoria: pieza.id_categoria || '',
        imagen_url: pieza.imagen_url || '',
        disponible: pieza.disponible,
        enOferta: offerData.isOferta,
        porcentajeOferta: offerData.porcentaje
      });
      setImagePreview(pieza.imagen_url ? getOptimizedUrl(pieza.imagen_url, { width: 300, crop: 'limit' }) : null);
    } else {
      setSelectedPieza(null);
      setFormData({
        nombre: '',
        marca: '',
        modelo_auto: '',
        anio: '',
        descripcion: '',
        precio_referencial: '',
        id_categoria: '',
        imagen_url: '',
        disponible: true,
        enOferta: false,
        porcentajeOferta: ''
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setNewCategoryName('');
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedPieza(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { data, error } = await supabase.from('categorias').insert([{ nombre: newCategoryName.trim(), usuario_id: userProfile?.id || null }]).select().single();
      if (error) throw error;
      setCategorias([...categorias, data]);
      setFormData(prev => ({ ...prev, id_categoria: data.id_categoria }));
      setNewCategoryName('');
      setShowCategoryDropdown(false);
      if (addToast) addToast('Éxito', 'Categoría añadida', 'success');
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudo crear la categoría', 'error');
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.id_categoria) {
      if (addToast) addToast('Error', 'Nombre y Categoría son obligatorios.', 'error');
      return;
    }

    try {
      setUploadingImg(true);
      let publicId = formData.imagen_url;

      if (imageFile) {
        try {
          const result = await uploadImage(imageFile, 'ipcb/catalogo');
          publicId = result.public_id;
        } catch (imgErr) {
          throw new Error('Error al subir la imagen: ' + imgErr.message);
        }
      }

      let finalDescription = formData.descripcion.trim();
      if (formData.enOferta) {
        const pct = formData.porcentajeOferta ? formData.porcentajeOferta : '';
        const tag = pct ? `[OFERTA:${pct}]` : `[OFERTA]`;
        finalDescription = `${tag} ${finalDescription}`.trim();
      }

      const payload = {
        nombre: formData.nombre,
        marca: formData.marca,
        modelo_auto: formData.modelo_auto,
        anio: formData.anio,
        descripcion: finalDescription,
        precio_referencial: formData.precio_referencial ? parseFloat(formData.precio_referencial) : null,
        id_categoria: formData.id_categoria,
        imagen_url: publicId,
        disponible: formData.disponible,
        usuario_id: userProfile?.id || null
      };

      if (selectedPieza) {
        const { error } = await supabase.from('catalogo_piezas').update(payload).eq('id_pieza', selectedPieza.id_pieza);
        if (error) throw error;
        if (addToast) addToast('Éxito', 'Pieza actualizada', 'success');
      } else {
        const { error } = await supabase.from('catalogo_piezas').insert([payload]);
        if (error) throw error;
        if (addToast) addToast('Éxito', 'Pieza registrada', 'success');
      }

      fetchData();
      closePanel();
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', err.message || 'Error al guardar la pieza', 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const updateStock = async (id_pieza, currentStock, change) => {
    const newStock = Math.max(0, currentStock + change);
    try {
      const { error } = await supabase.from('catalogo_piezas').update({ stock: newStock }).eq('id_pieza', id_pieza);
      if (error) throw error;
      setPiezas(piezas.map(p => p.id_pieza === id_pieza ? { ...p, stock: newStock } : p));
      if (addToast) addToast('Éxito', 'Stock actualizado', 'success');
      setStockModalPiece(null);
      setManualStockChange('');
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudo actualizar el stock', 'error');
    }
  };

  const handleManualStock = (isSum) => {
    if (!manualStockChange) {
      if (addToast) addToast('Atención', 'Ingrese una cantidad para sumar o restar.', 'warning');
      return;
    }
    const qty = parseInt(manualStockChange);
    if (isNaN(qty) || qty <= 0 || qty > 100000) {
      if (addToast) addToast('Atención', 'Cantidad no válida (límite 100,000).', 'warning');
      return;
    }
    updateStock(stockModalPiece.id_pieza, stockModalPiece.stock, isSum ? qty : -qty);
  };

  const handleModalClick = (e, closeFunc) => {
    if (e.target.className === 'stock-modal-overlay') {
      closeFunc();
    }
  };

  const handleOfertaCheckbox = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      setTempOfertaPct(formData.porcentajeOferta || '');
      setShowOfertaModal(true);
    } else {
      setFormData(prev => ({ ...prev, enOferta: false, porcentajeOferta: '' }));
    }
  };

  const saveOfertaModal = () => {
    const pct = parseInt(tempOfertaPct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      if (addToast) addToast('Atención', 'El porcentaje debe ser mayor a 0 y máximo 100.', 'warning');
      return;
    }
    setFormData(prev => ({ ...prev, enOferta: true, porcentajeOferta: pct.toString() }));
    setShowOfertaModal(false);
  };

  const cancelOfertaModal = () => {
    setFormData(prev => ({ ...prev, enOferta: false }));
    setShowOfertaModal(false);
  };

  const handleDeletePiece = async (pieza) => {
    Swal.fire({
      title: '¿Eliminar Pieza?',
      html: `Estás a punto de eliminar <strong>"${pieza.nombre}"</strong> del catálogo.<br/>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error } = await supabase.from('catalogo_piezas').delete().eq('id_pieza', pieza.id_pieza);
          if (error) throw error;
          if (addToast) addToast('Éxito', 'Pieza eliminada correctamente', 'success');
          fetchData();
        } catch (err) {
          console.error(err);
          // 23503 is postgres code for foreign_key_violation
          if (err.code === '23503' || err.message?.includes('foreign key')) {
            Swal.fire({
              title: 'No se puede eliminar',
              text: 'Esta pieza ya ha sido utilizada en transacciones (cotizaciones o notas de entrega) previas. Para mantener el historial de la empresa, te recomendamos editarla y desmarcar la opción "Disponible" en su lugar.',
              icon: 'warning',
              confirmButtonColor: '#3B82F6'
            });
          } else {
            if (addToast) addToast('Error', 'No se pudo eliminar la pieza. Detalle: ' + err.message, 'error');
          }
        }
      }
    });
  };

  const processedPiezas = getFilteredAndSortedPiezas();

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title">Catálogo de Piezas</h1>
        
        {/* TOOLBAR LIMPIA ESTILO DRIVE */}
        <div className="toolbar" style={{ gap: '10px', flexWrap: 'wrap', background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center' }}>
          
          <div className="search-box" style={{ flex: '1 1 250px', background: 'white' }}>
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, marca o modelo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={16} color="#6B7280" style={{ marginLeft: '4px' }} />
            <select 
              value={filterCategoria} 
              onChange={e => setFilterCategoria(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', background: '#FFF', fontSize: '13px', color: '#374151', outline: 'none' }}
            >
              <option value="">Todas Categorías</option>
              {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </select>
            
            <select 
              value={filterMarca} 
              onChange={e => setFilterMarca(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', background: '#FFF', fontSize: '13px', color: '#374151', outline: 'none' }}
            >
              <option value="">Todas Marcas</option>
              {marcasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', background: '#FFF', fontSize: '13px', color: '#374151', outline: 'none', fontWeight: '500' }}
            >
              <option value="recientes">Ordenar: Recientes</option>
              <option value="nombre_asc">Ordenar: Nombre (A-Z)</option>
              <option value="nombre_desc">Ordenar: Nombre (Z-A)</option>
              <option value="precio_desc">Ordenar: Precio (Mayor a Menor)</option>
              <option value="precio_asc">Ordenar: Precio (Menor a Mayor)</option>
              <option value="stock_asc">Ordenar: Stock Más Bajo</option>
            </select>

            <button className="btn-primary" onClick={() => openPanel()} style={{ marginLeft: '4px', borderRadius: '6px' }}>
              <Plus size={16} /> NUEVA
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Cargando catálogo...</div>
        ) : (
          <div className="catalogo-grid">
            {processedPiezas.map((pieza) => {
              const offerData = parseOffer(pieza.descripcion);
              const isOferta = offerData.isOferta;
              const pct = parseInt(offerData.porcentaje) || 0;
              
              const precioUsd = parseFloat(pieza.precio_referencial) || 0;
              let precioBob = precioUsd * tipoCambio;
              let precioBobOriginal = null;

              if (isOferta && pct > 0) {
                precioBobOriginal = precioBob;
                precioBob = precioBob * (1 - (pct / 100));
              }

              return (
                <div key={pieza.id_pieza} className="pieza-card" style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }} onClick={() => openPanel(pieza)}>
                  <div className="pieza-img-container">
                    {isOferta && (
                      <div className="pieza-oferta-badge">
                        {pct > 0 ? `OFERTA -${pct}%` : 'OFERTA'}
                      </div>
                    )}
                    <div className={`pieza-stock-badge ${pieza.stock < 5 ? 'low' : ''}`}>
                      Stock: {pieza.stock}
                    </div>
                    {pieza.imagen_url ? (
                      <img 
                        src={getOptimizedUrl(pieza.imagen_url, { width: 400, height: 300, crop: 'fill' })} 
                        alt={pieza.nombre} 
                        className="pieza-img" 
                      />
                    ) : (
                      <div className="pieza-placeholder">
                        <ImageIcon size={48} opacity={0.3} />
                      </div>
                    )}
                  </div>
                  
                  <div className="pieza-info">
                    <div className="pieza-title">{pieza.nombre}</div>
                    <div className="pieza-subtitle">
                      {pieza.marca} {pieza.modelo_auto} {pieza.anio ? `(${pieza.anio})` : ''}
                    </div>
                    
                    <div className="pieza-price-container">
                      {precioBobOriginal && (
                        <div className="pieza-price-original">
                          Bs. {precioBobOriginal.toFixed(2)}
                        </div>
                      )}
                      <div className="pieza-price-bob">
                        <span>Bs.</span> {precioBob.toFixed(2)}
                      </div>
                      <div className="pieza-price-usd">
                        Ref: ${precioUsd.toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                  
                  <div className="pieza-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="pieza-btn" onClick={() => setStockModalPiece(pieza)} title="Gestionar Stock">
                      <Package size={16} color="#10B981" /> STOCK
                    </button>
                    <button className="pieza-btn" onClick={() => openPanel(pieza)} title="Editar Pieza">
                      <Edit2 size={16} color="#3B82F6" /> EDITAR
                    </button>
                    <button className="pieza-btn" onClick={() => handleDeletePiece(pieza)} title="Eliminar Pieza">
                      <Trash2 size={16} color="#EF4444" /> ELIMINAR
                    </button>
                  </div>
                </div>
              );
            })}
            {processedPiezas.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                No se encontraron piezas en el catálogo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* STOCK MANAGEMENT MODAL */}
      {stockModalPiece && (
        <div className="stock-modal-overlay" onClick={(e) => handleModalClick(e, () => { setStockModalPiece(null); setManualStockChange(''); })}>
          <div className="stock-modal-content">
            <div className="stock-modal-header">
              <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Gestionar Stock</h3>
              <button onClick={() => { setStockModalPiece(null); setManualStockChange(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}><X size={20}/></button>
            </div>
            
            <div style={{ marginBottom: '20px', background: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{stockModalPiece.nombre}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                Stock actual en sistema: <strong style={{ color: '#2563EB', fontSize: '15px' }}>{stockModalPiece.stock}</strong>
              </div>
            </div>
            
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>Opciones Rápidas de Volumen:</div>
            <div className="stock-quick-grid">
              <button className="btn-stock-quick" onClick={() => updateStock(stockModalPiece.id_pieza, stockModalPiece.stock, 1)}>+1 Unidad</button>
              <button className="btn-stock-quick" onClick={() => updateStock(stockModalPiece.id_pieza, stockModalPiece.stock, 12)}>+12 (Media Caja)</button>
              <button className="btn-stock-quick" onClick={() => updateStock(stockModalPiece.id_pieza, stockModalPiece.stock, 24)}>+24 (Caja)</button>
              <button className="btn-stock-quick" onClick={() => updateStock(stockModalPiece.id_pieza, stockModalPiece.stock, 50)}>+50 (Pallet)</button>
            </div>

            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#374151', marginTop: '24px' }}>Ingreso Manual Exacto:</div>
            <div className="stock-manual-input" style={{ gap: '8px' }}>
              <input 
                type="number" 
                placeholder="0" 
                min="1"
                max="100000"
                autoFocus
                value={manualStockChange} 
                onChange={e => setManualStockChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualStock(true); }}
                style={{ flex: 1, padding: '10px 12px', border: '2px solid #D1D5DB', borderRadius: '6px', outline: 'none', fontSize: '15px', fontWeight: '600' }}
              />
              <button onClick={() => handleManualStock(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#10B981', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                <ArrowUpCircle size={18} /> Sumar
              </button>
              <button onClick={() => handleManualStock(false)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#EF4444', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                <ArrowDownCircle size={18} /> Restar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFERTA MODAL */}
      {showOfertaModal && (
        <div className="stock-modal-overlay" onClick={(e) => handleModalClick(e, cancelOfertaModal)}>
          <div className="stock-modal-content" style={{ width: '340px' }}>
            <div className="stock-modal-header">
              <h3 style={{ margin: 0, fontSize: '18px', color: '#D97706' }}>Configurar Oferta</h3>
              <button onClick={cancelOfertaModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}><X size={20}/></button>
            </div>
            
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: '1.5' }}>
              Aplica un porcentaje de descuento matemático. Selecciona una opción rápida o escribe uno personalizado.
            </div>
            
            <div className="stock-quick-grid">
              <button className="btn-stock-quick" onClick={() => setTempOfertaPct('10')}>10%</button>
              <button className="btn-stock-quick" onClick={() => setTempOfertaPct('15')}>15%</button>
              <button className="btn-stock-quick" onClick={() => setTempOfertaPct('20')}>20%</button>
              <button className="btn-stock-quick" onClick={() => setTempOfertaPct('50')}>50%</button>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="number" 
                placeholder="Personalizado..." 
                min="1"
                max="100"
                autoFocus
                value={tempOfertaPct} 
                onChange={e => setTempOfertaPct(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveOfertaModal(); }}
                style={{ flex: 1, padding: '10px 12px', border: '2px solid #FCD34D', borderRadius: '6px', outline: 'none', fontSize: '15px', fontWeight: '600' }}
              />
              <span style={{ fontWeight: '800', color: '#D97706', fontSize: '18px' }}>%</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={saveOfertaModal} style={{ flex: 1, background: '#F59E0B', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Aplicar Oferta</button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRY ACTION PANEL */}
      {isPanelOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>{selectedPieza ? 'Editar Pieza' : 'Nueva Pieza'}</span>
            <button className="panel-close" onClick={closePanel}>
              <X size={18} />
            </button>
          </div>
          
          <div className="panel-content">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div 
                style={{ width: '100%', height: '140px', backgroundColor: '#F3F4F6', borderRadius: '8px', border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ImageIcon size={32} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px' }}>Clic para subir imagen</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
            </div>

            <div className="detail-group">
              <div className="detail-label">Nombre *</div>
              <div className="detail-value">
                <input type="text" name="nombre" value={formData.nombre} onChange={handleFormChange} placeholder="Ej. Filtro de Aceite" />
              </div>
            </div>

            <div className="detail-group" ref={categoryRef}>
              <div className="detail-label">Categoría *</div>
              <div className="detail-value" style={{ position: 'relative' }}>
                <div onClick={() => setShowCategoryDropdown(!showCategoryDropdown)} style={{ padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF' }}>
                  {formData.id_categoria ? categorias.find(c => c.id_categoria === formData.id_categoria)?.nombre : 'Seleccione una categoría'}
                  <span style={{ fontSize: '10px' }}>▼</span>
                </div>
                {showCategoryDropdown && (
                  <div className="autocomplete-dropdown">
                    {categorias.map(cat => (
                      <div key={cat.id_categoria} className="autocomplete-item" onClick={() => { setFormData(prev => ({ ...prev, id_categoria: cat.id_categoria })); setShowCategoryDropdown(false); }}>
                        <span className="autocomplete-item-title">{cat.nombre}</span>
                      </div>
                    ))}
                    <div style={{ padding: '8px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '8px' }}>
                      <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nueva categoría" style={{ flex: 1, padding: '4px 8px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '4px' }} />
                      <button onClick={handleAddCategory} style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Marca</div>
              <div className="detail-value">
                <input type="text" name="marca" value={formData.marca} onChange={handleFormChange} placeholder="Ej. Bosch" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="detail-group" style={{ flex: 2 }}>
                <div className="detail-label">Modelo Auto</div>
                <div className="detail-value">
                  <input type="text" name="modelo_auto" value={formData.modelo_auto} onChange={handleFormChange} placeholder="Ej. Corolla" />
                </div>
              </div>
              <div className="detail-group" style={{ flex: 1 }}>
                <div className="detail-label">Año</div>
                <div className="detail-value">
                  <input type="text" name="anio" value={formData.anio} onChange={handleFormChange} placeholder="2020-2023" />
                </div>
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Precio Referencial (USD)</div>
              <div className="detail-value">
                <input type="number" step="0.01" name="precio_referencial" value={formData.precio_referencial} onChange={handleFormChange} placeholder="0.00" />
              </div>
            </div>

            <div className="detail-group" style={{ background: '#FFFBEB', padding: '10px', borderRadius: '6px', border: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="enOferta" 
                  name="enOferta" 
                  checked={formData.enOferta} 
                  onChange={handleOfertaCheckbox} 
                  style={{ width: '16px', height: '16px', accentColor: '#F59E0B', cursor: 'pointer' }} 
                />
                <label htmlFor="enOferta" style={{ fontSize: '13px', fontWeight: '700', color: '#D97706', cursor: 'pointer' }}>
                  Marcar como "En Oferta"
                </label>
              </div>
              {formData.enOferta && formData.porcentajeOferta && (
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#B45309', background: '#FEF3C7', padding: '4px 8px', borderRadius: '4px' }}>
                  -{formData.porcentajeOferta}% Aplicado
                </div>
              )}
            </div>

            <div className="detail-group">
              <div className="detail-label">Descripción</div>
              <div className="detail-value">
                <textarea 
                  name="descripcion" 
                  value={formData.descripcion} 
                  onChange={handleFormChange} 
                  style={{ width: '100%', minHeight: '60px', border: '1px solid #E5E7EB', borderRadius: '4px', outline: 'none', fontSize: '13px', resize: 'vertical', padding: '8px' }}
                  placeholder="Detalles técnicos..."
                />
              </div>
            </div>

            <div className="panel-actions">
              <button className="btn-save" onClick={handleSave} disabled={uploadingImg}>
                {uploadingImg ? 'GUARDANDO...' : 'GUARDAR PIEZA'}
              </button>
              <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
