import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Download, FileText, Calendar, Filter, 
  Users, DollarSign, Package, Truck, CheckCircle, Database,
  TrendingUp, Award, Target
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function ReportesUsuarios({ addToast, userProfile }) {
  const [reportType, setReportType] = useState('ingresos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Set default dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setFechaInicio(firstDay);
    setFechaFin(lastDay);
  }, []);

  const generarReporte = async () => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      if (reportType === 'ingresos') {
        let query = supabase
          .from('notas_entrega')
          .select(`*, clientes(nombre)`)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
          .order('fecha', { ascending: false });
        
        if (estadoFilter !== 'TODOS') {
          query = query.eq('estado', estadoFilter);
        }

        const { data: result, error } = await query;
        if (error) throw error;

        let totalBs = 0;
        let totalUsd = 0;
        let totalBultos = 0;
        let totalPeso = 0;

        result.forEach(row => {
          totalBs += parseFloat(row.total_bs || 0);
          totalUsd += parseFloat(row.total_usd || 0);
          totalBultos += parseInt(row.total_bultos || 0);
          totalPeso += parseFloat(row.total_peso_kg || 0);
        });

        setData(result);
        setSummary({
          cantidad: result.length,
          totalBs,
          totalUsd,
          totalBultos,
          totalPeso
        });
        
        addToast('Éxito', `Reporte generado: ${result.length} registros encontrados`, 'success');
      } 
      else if (reportType === 'rendimiento') {
        const { data: users, error: errUsers } = await supabase.from('usuarios').select('id, nombre');
        if (errUsers) throw errUsers;

        const results = [];
        let totalActividad = 0;

        for (const u of users) {
          const [clientes, prov, cot, imp, notas] = await Promise.all([
            supabase.from('clientes').select('id_cliente', { count: 'exact', head: true }).eq('usuario_id', u.id),
            supabase.from('proveedores').select('id_proveedor', { count: 'exact', head: true }).eq('usuario_id', u.id),
            supabase.from('cotizaciones').select('id_cotizacion', { count: 'exact', head: true }).eq('usuario_id', u.id),
            supabase.from('importaciones').select('id_importacion', { count: 'exact', head: true }).eq('usuario_id', u.id),
            supabase.from('notas_entrega').select('id_nota', { count: 'exact', head: true }).eq('usuario_id', u.id)
          ]);
          
          const userTotal = (clientes.count||0) + (prov.count||0) + (cot.count||0) + (imp.count||0) + (notas.count||0);
          totalActividad += userTotal;
          
          results.push({
            usuario: u.nombre,
            clientes: clientes.count || 0,
            proveedores: prov.count || 0,
            cotizaciones: cot.count || 0,
            importaciones: imp.count || 0,
            notas: notas.count || 0,
            total: userTotal
          });
        }
        
        setData(results.sort((a,b) => b.total - a.total));
        setSummary({ totalActividad, cantidadUsuarios: results.length });
        addToast('Éxito', `Reporte de rendimiento generado`, 'success');
      }
      else if (reportType === 'top_clientes') {
        const { data: result, error } = await supabase
          .from('notas_entrega')
          .select(`id_cliente, total_usd, total_bs, total_bultos, clientes(nombre, empresa, telefono)`)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
          .eq('estado', 'EMITIDA');

        if (error) throw error;

        // Agrupar por cliente
        const clientMap = {};
        let grandTotalUsd = 0;

        result.forEach(row => {
          const cid = row.id_cliente;
          if (!cid || !row.clientes) return;
          
          if (!clientMap[cid]) {
            clientMap[cid] = {
              nombre: row.clientes.nombre,
              empresa: row.clientes.empresa,
              telefono: row.clientes.telefono,
              compras: 0,
              total_usd: 0,
              total_bs: 0,
              bultos: 0
            };
          }
          clientMap[cid].compras += 1;
          clientMap[cid].total_usd += parseFloat(row.total_usd || 0);
          clientMap[cid].total_bs += parseFloat(row.total_bs || 0);
          clientMap[cid].bultos += parseInt(row.total_bultos || 0);
          grandTotalUsd += parseFloat(row.total_usd || 0);
        });

        const sortedClients = Object.values(clientMap).sort((a, b) => b.total_usd - a.total_usd);
        setData(sortedClients);
        setSummary({ totalClientes: sortedClients.length, grandTotalUsd });
        addToast('Éxito', 'Ranking generado exitosamente', 'success');
      }
      else if (reportType === 'conversion') {
        const [cotData, notasData] = await Promise.all([
          supabase.from('cotizaciones').select('id_cotizacion, total_usd').gte('fecha', fechaInicio).lte('fecha', fechaFin),
          supabase.from('notas_entrega').select('id_nota, total_usd').gte('fecha', fechaInicio).lte('fecha', fechaFin).eq('estado', 'EMITIDA')
        ]);
        
        const cotCount = cotData.data ? cotData.data.length : 0;
        const notasCount = notasData.data ? notasData.data.length : 0;
        
        const cotValue = cotData.data ? cotData.data.reduce((sum, item) => sum + parseFloat(item.total_usd || 0), 0) : 0;
        const notasValue = notasData.data ? notasData.data.reduce((sum, item) => sum + parseFloat(item.total_usd || 0), 0) : 0;

        const conversionRate = cotCount > 0 ? ((notasCount / cotCount) * 100).toFixed(1) : 0;

        setData([{
          periodo: `${fechaInicio} al ${fechaFin}`,
          cotizaciones_emitidas: cotCount,
          notas_generadas: notasCount,
          valor_cotizado: cotValue,
          valor_cerrado: notasValue,
          tasa_conversion: conversionRate
        }]);
        setSummary({ cotCount, notasCount, conversionRate });
        addToast('Éxito', 'Reporte de conversión generado', 'success');
      }
    } catch (error) {
      console.error(error);
      addToast('Error', 'No se pudo generar el reporte. ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (data.length === 0) return;
    
    let csv = '';
    if (reportType === 'ingresos') {
      csv = 'Numero Nota,Fecha,Cliente,Estado,Bultos,Peso Kg,Total USD,Total Bs\n';
      data.forEach(row => {
        csv += `${row.numero_nota},${row.fecha},"${row.clientes?.nombre || ''}",${row.estado},${row.total_bultos},${row.total_peso_kg},${row.total_usd},${row.total_bs}\n`;
      });
      csv += `\nTOTALES,,,,${summary.totalBultos},${summary.totalPeso},${summary.totalUsd},${summary.totalBs}`;
    } else if (reportType === 'rendimiento') {
      csv = 'Usuario,Clientes,Proveedores,Cotizaciones,Importaciones,Notas de Entrega,Total Actividad\n';
      data.forEach(row => {
        csv += `"${row.usuario}",${row.clientes},${row.proveedores},${row.cotizaciones},${row.importaciones},${row.notas},${row.total}\n`;
      });
    } else if (reportType === 'top_clientes') {
      csv = 'Ranking,Cliente,Empresa,Telefono,Cant. Compras,Total Bultos,Total Invertido USD,Total Invertido Bs\n';
      data.forEach((row, idx) => {
        csv += `${idx + 1},"${row.nombre}","${row.empresa || ''}","${row.telefono || ''}",${row.compras},${row.bultos},${row.total_usd},${row.total_bs}\n`;
      });
    } else if (reportType === 'conversion') {
      csv = 'Periodo,Cotizaciones Emitidas,Ventas Cerradas (Notas),Valor Cotizado USD,Valor Cerrado USD,Tasa de Conversion %\n';
      data.forEach(row => {
        csv += `"${row.periodo}",${row.cotizaciones_emitidas},${row.notas_generadas},${row.valor_cotizado},${row.valor_cerrado},${row.tasa_conversion}%\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${reportType}_${fechaInicio}_al_${fechaFin}.csv`;
    link.click();
  };

  const exportarPDF = () => {
    if (data.length === 0) return;
    const element = document.getElementById('reporte-imprimible');
    
    // Mejorar márgenes y calidad
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `Reporte_${reportType}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save();
      };
      document.body.appendChild(script);
    } else {
      window.html2pdf().set(opt).from(element).save();
    }
  };

  return (
    <div className="content-area" style={{ padding: '24px', background: '#F3F4F6', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={28} color="#1D4ED8" />
              Centro de Análisis y Agilización Estratégica
            </h1>
            <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
              Reportes inteligentes para la toma de decisiones gerenciales en la Importadora.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={exportarCSV} 
              disabled={data.length === 0}
              style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: data.length > 0 ? '#10B981' : '#D1D5DB', color: '#FFF', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: data.length > 0 ? 'pointer' : 'not-allowed' }}
            >
              <Download size={16} /> EXCEL (CSV)
            </button>
            <button 
              onClick={exportarPDF} 
              disabled={data.length === 0}
              style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: data.length > 0 ? '#EF4444' : '#D1D5DB', color: '#FFF', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: data.length > 0 ? 'pointer' : 'not-allowed' }}
            >
              <FileText size={16} /> EXPORTAR PDF
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>Reporte Estratégico</label>
              <select 
                value={reportType} 
                onChange={(e) => { setReportType(e.target.value); setData([]); setHasSearched(false); }}
                style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
              >
                <optgroup label="Finanzas y Logística">
                  <option value="ingresos">Ingresos de Ventas / Liquidaciones</option>
                  <option value="top_clientes">Ranking VIP de Clientes (Top Compradores)</option>
                  <option value="conversion">Embudo de Ventas (Cotizaciones vs Entregas)</option>
                </optgroup>
                <optgroup label="Administrativo">
                  <option value="rendimiento">Rendimiento de Integrantes</option>
                </optgroup>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}><Calendar size={12} style={{display:'inline'}}/> FECHA INICIO</label>
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)}
                style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}><Calendar size={12} style={{display:'inline'}}/> FECHA FIN</label>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)}
                style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            
            {reportType === 'ingresos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}><Filter size={12} style={{display:'inline'}}/> ESTADO</label>
                <select 
                  value={estadoFilter} 
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="EMITIDA">Emitidas</option>
                  <option value="PAGADA">Pagadas</option>
                  <option value="ANULADA">Anuladas</option>
                </select>
              </div>
            )}

            <button 
              onClick={generarReporte}
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#1D4ED8', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', height: '42px' }}
            >
              {loading ? 'PROCESANDO...' : 'GENERAR REPORTE'}
            </button>
          </div>
        </div>

        {/* Zona de Renderizado del Reporte */}
        <div id="reporte-imprimible" style={{ background: '#FFF', padding: '32px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minHeight: '500px' }}>
          
          {/* Header del Documento */}
          {hasSearched && (
            <div style={{ borderBottom: '2px solid #134B82', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, color: '#134B82', fontSize: '24px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {reportType === 'ingresos' && 'Reporte de Ingresos Económicos'}
                  {reportType === 'rendimiento' && 'Reporte de Rendimiento de Integrantes'}
                  {reportType === 'top_clientes' && 'Ranking de Clientes VIP'}
                  {reportType === 'conversion' && 'Reporte de Conversión Comercial'}
                </h2>
                <p style={{ margin: '8px 0 0', color: '#4B5563', fontSize: '13px' }}>
                  Generado por: {userProfile?.nombre || 'Administrador'} <br/>
                  Fecha de Impresión: {new Date().toLocaleString('es-BO')}
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px', color: '#4B5563', background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <strong>PERIODO EVALUADO</strong><br/>
                Desde: {fechaInicio.split('-').reverse().join('/')}<br/>
                Hasta: {fechaFin.split('-').reverse().join('/')}
              </div>
            </div>
          )}

          {!hasSearched ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#9CA3AF' }}>
              <Filter size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: '500' }}>Seleccione los filtros y presione Generar Reporte</p>
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280', fontSize: '15px' }}>
              No se encontraron registros para los criterios seleccionados.
            </div>
          ) : (
            <>
              {/* ----------------- INGRESOS ----------------- */}
              {reportType === 'ingresos' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
                    <div style={{ background: '#F0F9FF', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0EA5E9' }}>
                      <div style={{ color: '#0284C7', fontSize: '12px', fontWeight: 'bold' }}>CANTIDAD TRANSACCIONES</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>{summary.cantidad}</div>
                    </div>
                    <div style={{ background: '#ECFDF5', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
                      <div style={{ color: '#047857', fontSize: '12px', fontWeight: 'bold' }}>TOTAL RECAUDADO (BS)</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>Bs {summary.totalBs.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                    <div style={{ background: '#FFFBEB', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                      <div style={{ color: '#B45309', fontSize: '12px', fontWeight: 'bold' }}>EQUIVALENTE EN USD</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>$ {summary.totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                    <div style={{ background: '#F3F4F6', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #6B7280' }}>
                      <div style={{ color: '#374151', fontSize: '12px', fontWeight: 'bold' }}>VOLUMEN (Bultos / Kg)</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>{summary.totalBultos} / {summary.totalPeso.toFixed(2)}</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#134B82', color: '#FFF' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>Nº NOTA</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>FECHA</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>CLIENTE</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>ESTADO</th>
                        <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>BULTOS</th>
                        <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>PESO KG</th>
                        <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>TOTAL $USD</th>
                        <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>TOTAL BS.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#FFF' : '#F9FAFB' }}>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>{row.numero_nota}</td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB' }}>{row.fecha}</td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB' }}>{row.clientes?.nombre || '-'}</td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: row.estado === 'EMITIDA' ? '#D1FAE5' : '#F3F4F6', color: row.estado === 'EMITIDA' ? '#065F46' : '#374151', fontWeight: 'bold' }}>
                              {row.estado}
                            </span>
                          </td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB', textAlign: 'right' }}>{row.total_bultos}</td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB', textAlign: 'right' }}>{parseFloat(row.total_peso_kg || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB', textAlign: 'right' }}>{parseFloat(row.total_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px', border: '1px solid #E5E7EB', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>{parseFloat(row.total_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F1F5F9', fontWeight: 'bold', color: '#0F172A' }}>
                        <td colSpan="4" style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>GRAN TOTAL:</td>
                        <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>{summary.totalBultos}</td>
                        <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>{summary.totalPeso.toFixed(2)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB', color: '#B45309' }}>$ {summary.totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB', color: '#047857', fontSize: '14px' }}>Bs {summary.totalBs.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}

              {/* ----------------- TOP CLIENTES VIP ----------------- */}
              {reportType === 'top_clientes' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '30px' }}>
                    <div style={{ background: '#FFFBEB', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                      <div style={{ color: '#B45309', fontSize: '12px', fontWeight: 'bold' }}>CLIENTES CON COMPRAS EN EL PERIODO</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px', display:'flex', alignItems:'center', gap:'8px' }}><Award color="#F59E0B"/> {summary.totalClientes} Clientes</div>
                    </div>
                    <div style={{ background: '#ECFDF5', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
                      <div style={{ color: '#047857', fontSize: '12px', fontWeight: 'bold' }}>INGRESOS TOTALES DEL RANKING (USD)</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>$ {summary.grandTotalUsd.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#1E293B', color: '#FFF' }}>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB', width: '50px' }}>#</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>CLIENTE</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>CANTIDAD COMPRAS</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>VOLUMEN (Bultos)</th>
                        <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>INVERSIÓN TOTAL $USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#FFF' : '#F9FAFB' }}>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 'bold', color: i < 3 ? '#F59E0B' : '#6B7280', fontSize: i < 3 ? '16px' : '14px' }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB' }}>
                            <div style={{ fontWeight: 'bold' }}>{row.nombre}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{row.empresa || 'Sin empresa'} • {row.telefono || 'Sin teléfono'}</div>
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 'bold' }}>{row.compras}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{row.bultos}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'right', fontWeight: 'bold', color: '#047857', fontSize: '15px' }}>
                            $ {row.total_usd.toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* ----------------- CONVERSIÓN (EMBUDO) ----------------- */}
              {reportType === 'conversion' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', marginBottom: '40px', width: '100%', maxWidth: '800px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      
                      {/* Step 1: Cotizaciones */}
                      <div style={{ flex: 1, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                        <Target size={40} color="#3B82F6" style={{ margin: '0 auto 12px' }} />
                        <div style={{ fontSize: '14px', color: '#1D4ED8', fontWeight: 'bold' }}>COTIZACIONES EMITIDAS</div>
                        <div style={{ fontSize: '36px', fontWeight: '900', color: '#1E3A8A', margin: '10px 0' }}>{summary.cotCount}</div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>Interés Inicial</div>
                      </div>

                      {/* Arrow / Percentage */}
                      <div style={{ padding: '0 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: summary.conversionRate > 30 ? '#10B981' : '#F59E0B' }}>
                          {summary.conversionRate}%
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase' }}>Tasa de Conversión</div>
                        <div style={{ margin: '10px 0', height: '2px', background: '#E5E7EB', position: 'relative' }}>
                          <div style={{ position: 'absolute', right: -5, top: -4, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '5px solid #E5E7EB' }}></div>
                        </div>
                      </div>

                      {/* Step 2: Ventas */}
                      <div style={{ flex: 1, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                        <CheckCircle size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
                        <div style={{ fontSize: '14px', color: '#047857', fontWeight: 'bold' }}>VENTAS CERRADAS (NOTAS)</div>
                        <div style={{ fontSize: '36px', fontWeight: '900', color: '#064E3B', margin: '10px 0' }}>{summary.notasCount}</div>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>Ingreso Real</div>
                      </div>
                    </div>

                    {/* Monetary Breakdown */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: '20px' }}>
                      <thead>
                        <tr style={{ background: '#1E293B', color: '#FFF' }}>
                          <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>CONCEPTO</th>
                          <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #E5E7EB' }}>VALOR EN $USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: '#FFF' }}>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Valor Total Cotizado (Oportunidad)</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'right', color: '#1D4ED8', fontWeight: 'bold' }}>$ {parseFloat(data[0].valor_cotizado || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr style={{ background: '#F9FAFB' }}>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Valor Total Vendido (Ganancia Real)</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'right', color: '#047857', fontWeight: 'bold' }}>$ {parseFloat(data[0].valor_cerrado || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ background: '#FFFBEB', padding: '16px', borderRadius: '8px', border: '1px dashed #F59E0B', marginTop: '20px', textAlign: 'left', fontSize: '13px', color: '#92400E' }}>
                      <strong>Interpretación Estratégica:</strong> Si la tasa de conversión es baja (menos del 20%) o hay una gran diferencia entre el valor cotizado y el vendido, significa que el catálogo atrae interés pero los precios, el flete o el seguimiento a los clientes están provocando pérdida de ventas.
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- RENDIMIENTO INTEGRANTES ----------------- */}
              {reportType === 'rendimiento' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '30px' }}>
                    <div style={{ background: '#F0F9FF', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0EA5E9' }}>
                      <div style={{ color: '#0284C7', fontSize: '12px', fontWeight: 'bold' }}>INTEGRANTES EVALUADOS</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>{summary.cantidadUsuarios}</div>
                    </div>
                    <div style={{ background: '#F5F3FF', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #8B5CF6' }}>
                      <div style={{ color: '#6D28D9', fontSize: '12px', fontWeight: 'bold' }}>TOTAL ACTIVIDAD EN SISTEMA</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>{summary.totalActividad} registros</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#1E293B', color: '#FFF' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #E5E7EB' }}>INTEGRANTE / USUARIO</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>CLIENTES</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>PROVEEDORES</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>COTIZACIONES</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>IMPORTACIONES</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB' }}>NOTAS ENTREGA</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #E5E7EB', background: '#334155' }}>TOTAL ACTIVIDAD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#FFF' : '#F9FAFB' }}>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} color="#6B7280"/> {row.usuario}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{row.clientes}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{row.proveedores}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{row.cotizaciones}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{row.importaciones}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{row.notas}</td>
                          <td style={{ padding: '12px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 'bold', color: '#4338CA', background: '#EEF2FF' }}>
                            {row.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
