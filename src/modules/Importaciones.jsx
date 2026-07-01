import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, Globe, DollarSign, Calendar, Package } from 'lucide-react';

export default function Importaciones({ addToast }) {
  const [importaciones, setImportaciones] = useState([]);
  const [contenedores, setContenedores] = useState([]);
  const [search, setSearch] = useState('');
  const [containerFilter, setContainerFilter] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    pais_origen: '',
    fecha_importacion: new Date().toISOString().split('T')[0],
    costo_total: '',
    estado: 'Programada',
    id_contenedor: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Contenedores
      const { data: contData, error: contError } = await supabase
        .from('contenedores')
        .select('*')
        .order('id_contenedor', { ascending: false });
      
      if (contError) throw contError;
      setContenedores(contData || []);

      // Fetch Importaciones with related Contenedor
      const { data: impData, error: impError } = await supabase
        .from('importaciones')
        .select(`
          *,
          contenedores ( codigo_serial )
        `)
        .order('id_importacion', { ascending: false });

      if (impError) throw impError;
      setImportaciones(impData || []);
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudieron cargar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtros combinados: Texto genérico (país/estado) + Filtro específico de contenedor (CU06)
  const filteredImportaciones = importaciones.filter(imp => {
    const s = search.toLowerCase();
    const matchText = (
      (imp.pais_origen && imp.pais_origen.toLowerCase().includes(s)) ||
      (imp.estado && imp.estado.toLowerCase().includes(s)) ||
      (imp.contenedores?.codigo_serial && imp.contenedores.codigo_serial.toLowerCase().includes(s))
    );

    const matchContainer = containerFilter 
      ? imp.id_contenedor.toString() === containerFilter 
      : true;

    return matchText && matchContainer;
  });

  const openPanel = () => {
    setFormData({
      pais_origen: '',
      fecha_importacion: new Date().toISOString().split('T')[0],
      costo_total: '',
      estado: 'Programada',
      id_contenedor: ''
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleFormChange = async (e) => {
    const { name, value } = e.target;
    if (name === 'id_contenedor' && value) {
      const cont = contenedores.find(c => c.id_contenedor.toString() === value);
      let autoPais = formData.pais_origen;
      if (cont && cont.puerto_origen) {
        const paisMap = {
          'China': 'China',
          'Brasil': 'Brasil',
          'Estados': 'Estados Unidos',
          'Argentina': 'Argentina',
          'Perú': 'Perú',
          'Peru': 'Perú',
          'Corea': 'Corea del Sur',
          'Japón': 'Japón',
          'Japon': 'Japón'
        };
        Object.keys(paisMap).forEach(key => {
          if (cont.puerto_origen.includes(key)) autoPais = paisMap[key];
        });
      }
      
      // Calculate estimated cost from container cargo + flete
      const { data: detalles } = await supabase
        .from('contenedor_detalles')
        .select('costo_compra, precio_venta, cantidad')
        .eq('id_contenedor', value);
        
      let sumMercancia = 0;
      if (detalles) {
        detalles.forEach(d => {
          sumMercancia += (parseFloat(d.precio_venta || 0) * parseInt(d.cantidad || 0));
        });
      }
      const totalEstimated = sumMercancia + (parseFloat(cont?.costo_flete_total || 0));
      
      setFormData(prev => ({ 
        ...prev, 
        id_contenedor: value,
        pais_origen: autoPais || prev.pais_origen,
        costo_total: totalEstimated > 0 ? totalEstimated.toFixed(2) : prev.costo_total,
        estado: 'En Aduana'
      }));
      if (addToast) addToast('⚡ Autocompletado', `Datos importados del contenedor ${cont?.codigo_serial}. Estado cambiado a En Aduana.`, 'info');
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.pais_origen || !formData.id_contenedor || !formData.costo_total) {
      if (addToast) addToast('Error', 'Complete los campos obligatorios (*).', 'error');
      return;
    }

    try {
      const payload = {
        pais_origen: formData.pais_origen,
        fecha_importacion: formData.fecha_importacion || null,
        costo_total: parseFloat(formData.costo_total),
        estado: formData.estado,
        id_contenedor: parseInt(formData.id_contenedor)
      };

      const { error } = await supabase
        .from('importaciones')
        .insert([payload]);

      if (error) throw error;
      
      if (addToast) addToast('Éxito', 'Importación registrada correctamente', 'success');
      fetchData();
      closePanel();
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'No se pudo guardar la importación', 'error');
    }
  };

  const handleSyncAduanas = async () => {
    setLoading(true);
    try {
      const { data: conts } = await supabase.from('contenedores').select('*').eq('estado_distribucion', 'En Aduana');
      if (!conts || conts.length === 0) {
        if (addToast) addToast('Info', 'No hay contenedores en estado "En Aduana".', 'info');
        setLoading(false);
        return;
      }

      const { data: exImps } = await supabase.from('importaciones').select('id_contenedor');
      const exIds = new Set(exImps?.map(i => i.id_contenedor?.toString()) || []);

      let createdCount = 0;
      for (const c of conts) {
        if (!exIds.has(c.id_contenedor?.toString())) {
          const { data: det } = await supabase.from('contenedor_detalles').select('precio_venta, cantidad').eq('id_contenedor', c.id_contenedor);
          let sumM = 0;
          if (det) det.forEach(d => sumM += (parseFloat(d.precio_venta || 0) * parseInt(d.cantidad || 0)));
          const totalEst = sumM + parseFloat(c.costo_flete_total || 0);

          let autoP = 'Otro';
          if (c.puerto_origen) {
            const pMap = { 'China': 'China', 'Brasil': 'Brasil', 'Estados': 'Estados Unidos', 'Argentina': 'Argentina', 'Perú': 'Perú', 'Peru': 'Perú', 'Corea': 'Corea del Sur', 'Japón': 'Japón', 'Japon': 'Japón' };
            Object.keys(pMap).forEach(k => { if (c.puerto_origen.includes(k)) autoP = pMap[k]; });
          }

          await supabase.from('importaciones').insert([{
            id_contenedor: c.id_contenedor,
            pais_origen: autoP,
            fecha_importacion: new Date().toISOString().split('T')[0],
            costo_total: totalEst > 0 ? totalEst.toFixed(2) : 0,
            estado: 'En Aduana'
          }]);
          createdCount++;
        }
      }

      fetchData();
      if (createdCount > 0) {
        if (addToast) addToast('⚡ Éxito', `Se importaron ${createdCount} contenedores nuevos a Aduanas.`, 'success');
      } else {
        if (addToast) addToast('Info', 'Todos los contenedores "En Aduana" ya están sincronizados aquí.', 'info');
      }
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Error', 'Fallo al sincronizar con aduanas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area">
      <div className="clients-section">
        <h1 className="page-title">RF05/RF06: Gestión de Importaciones</h1>
        
        <div className="toolbar" style={{ gap: '12px' }}>
          <div className="search-box" style={{ width: '250px' }}>
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Buscar por país, código..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '0 12px' }}>
            <Package size={16} color="#6B7280" />
            <select 
              value={containerFilter} 
              onChange={(e) => setContainerFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '8px 0', fontSize: '13px', color: '#374151', background: 'transparent' }}
            >
              <option value="">Todos los contenedores</option>
              {contenedores.map(c => (
                <option key={c.id_contenedor} value={c.id_contenedor}>
                  Contenedor: {c.codigo_serial}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}></div>

          <button 
            onClick={handleSyncAduanas}
            style={{ 
              background: '#FEF3C7', 
              color: '#92400E', 
              border: '1px solid #F59E0B', 
              padding: '8px 14px', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '13px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            ⚡ SINCRONIZAR ADUANAS
          </button>

          <button className="btn-primary" onClick={() => openPanel()}>
            <Plus size={18} /> REGISTRAR IMPORTACIÓN
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>CONTENEDOR</th>
                <th>PAÍS ORIGEN</th>
                <th>FECHA</th>
                <th>COSTO TOTAL</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Cargando importaciones...</td></tr>
              ) : filteredImportaciones.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No se encontraron registros.</td></tr>
              ) : (
                filteredImportaciones.map((imp) => (
                  <tr key={imp.id_importacion}>
                    <td>#{imp.id_importacion}</td>
                    <td style={{ fontWeight: '500' }}>{imp.contenedores?.codigo_serial || 'Sin contenedor'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={14} color="#6B7280" /> {imp.pais_origen}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#6B7280" /> {imp.fecha_importacion || '-'}
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: '#10B981' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={14} /> {imp.costo_total ? parseFloat(imp.costo_total).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: imp.estado === 'Entregada' ? '#D1FAE5' : imp.estado === 'En Tránsito' ? '#FEF3C7' : '#E5E7EB',
                        color: imp.estado === 'Entregada' ? '#065F46' : imp.estado === 'En Tránsito' ? '#92400E' : '#374151'
                      }}>
                        {imp.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPanelOpen && (
        <div className="action-panel">
          <div className="panel-header">
            <span>Nueva Importación</span>
            <button className="panel-close" onClick={closePanel}>
              <X size={18} />
            </button>
          </div>
          
          <div className="panel-content">
            <div className="detail-group">
              <div className="detail-label">Contenedor Asociado *</div>
              <div className="detail-value">
                <select 
                  name="id_contenedor" 
                  value={formData.id_contenedor} 
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="">Seleccione un contenedor</option>
                  {contenedores.map(c => (
                    <option key={c.id_contenedor} value={c.id_contenedor}>{c.codigo_serial} ({c.estado_distribucion || 'Sin estado'})</option>
                  ))}
                </select>
                <small style={{ color: '#0369A1', display: 'block', marginTop: '6px', fontSize: '11px', background: '#E0F2FE', padding: '6px', borderRadius: '4px', border: '1px solid #BAE6FD' }}>
                  ⚡ <strong>Conectividad Automática:</strong> Al elegir un contenedor se autocompletará el País de Origen, se sumará el Costo Total (Mercancía + Flete) y pasará el Estado a <em>"En Aduana"</em>.
                </small>
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">País de Origen *</div>
              <div className="detail-value">
                <select 
                  name="pais_origen" 
                  value={formData.pais_origen} 
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="">Seleccione un país...</option>
                  <option value="Alemania">Alemania</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Bolivia">Bolivia</option>
                  <option value="Brasil">Brasil</option>
                  <option value="Canadá">Canadá</option>
                  <option value="Chile">Chile</option>
                  <option value="China">China</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Corea del Sur">Corea del Sur</option>
                  <option value="España">España</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                  <option value="Francia">Francia</option>
                  <option value="India">India</option>
                  <option value="Italia">Italia</option>
                  <option value="Japón">Japón</option>
                  <option value="México">México</option>
                  <option value="Panamá">Panamá</option>
                  <option value="Paraguay">Paraguay</option>
                  <option value="Perú">Perú</option>
                  <option value="Reino Unido">Reino Unido</option>
                  <option value="Taiwán">Taiwán</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Fecha de Importación</div>
              <div className="detail-value">
                <input type="date" name="fecha_importacion" value={formData.fecha_importacion} onChange={handleFormChange} />
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Costo Total (USD) *</div>
              <div className="detail-value">
                <input type="number" step="0.01" name="costo_total" value={formData.costo_total} onChange={handleFormChange} placeholder="0.00" />
              </div>
            </div>

            <div className="detail-group">
              <div className="detail-label">Estado de la Importación</div>
              <div className="detail-value">
                <select 
                  name="estado" 
                  value={formData.estado} 
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="Programada">Programada</option>
                  <option value="En Tránsito">En Tránsito</option>
                  <option value="En Aduana">En Aduana</option>
                  <option value="Entregada">Entregada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="panel-actions">
              <button className="btn-save" onClick={handleSave}>GUARDAR</button>
              <button className="btn-cancel" onClick={closePanel}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
