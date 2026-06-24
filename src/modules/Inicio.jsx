import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart as BarChartIcon, Package, AlertTriangle, TrendingUp } from 'lucide-react';

export default function Inicio({ addToast }) {
  const [stats, setStats] = useState({
    totalStock: 0,
    lowStockItems: 0,
    totalCategories: 0,
    chartData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: piezas, error: piezasError } = await supabase
        .from('catalogo_piezas')
        .select(`
          id_pieza,
          stock,
          id_categoria,
          categorias (
            nombre
          )
        `);

      if (piezasError) throw piezasError;

      let totalStock = 0;
      let lowStockItems = 0;
      const categoryMap = {};

      piezas.forEach(pieza => {
        const stock = pieza.stock || 0;
        totalStock += stock;
        
        if (stock < 5) {
          lowStockItems++;
        }

        const categoryName = pieza.categorias?.nombre || 'Sin Categoría';
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = 0;
        }
        categoryMap[categoryName] += stock;
      });

      const chartData = Object.keys(categoryMap).map(key => ({
        name: key,
        value: categoryMap[key]
      })).sort((a, b) => b.value - a.value);

      setStats({
        totalStock,
        lowStockItems,
        totalCategories: Object.keys(categoryMap).length,
        chartData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (addToast) addToast('Error', 'No se pudieron cargar los datos del dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const maxChartValue = Math.max(...stats.chartData.map(d => d.value), 1);

  return (
    <div className="content-area" style={{ flexDirection: 'column', overflowY: 'auto', background: '#F3F4F6' }}>
      <div style={{ padding: '0 0 24px 0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Dashboard Gerencial</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Resumen en tiempo real del inventario y operaciones.</p>
      </div>

      {/* KPI Cards Premium */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Card 1: Stock Total */}
        <div style={{ 
          background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: '0.1' }}>
            <Package size={120} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '14px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
              <Package size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Stock Total</div>
              <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '4px' }}>
                {loading ? '...' : stats.totalStock.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Alertas */}
        <div style={{ 
          background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: '0.1' }}>
            <AlertTriangle size={120} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '14px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
              <AlertTriangle size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Alerta de Stock (&lt;5)</div>
              <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '4px' }}>
                {loading ? '...' : stats.lowStockItems}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Categorías */}
        <div style={{ 
          background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)', 
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: '0.1' }}>
            <TrendingUp size={120} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '14px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
              <TrendingUp size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Cat. Activas</div>
              <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '4px' }}>
                {loading ? '...' : stats.totalCategories}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area Premium */}
      <div style={{ background: '#FFF', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', flex: 1, minHeight: '350px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #F3F4F6', paddingBottom: '16px' }}>
          <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '8px' }}>
            <BarChartIcon size={20} color="#374151" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Distribución de Stock por Categoría</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#6B7280', fontWeight: '500' }}>
            Cargando gráfico gerencial...
          </div>
        ) : stats.chartData.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#6B7280', fontWeight: '500' }}>
            No hay datos suficientes para mostrar el gráfico.
          </div>
        ) : (
          <div className="custom-bar-chart" style={{ padding: '10px 0' }}>
            {stats.chartData.map((data, index) => {
              const percentage = Math.max((data.value / maxChartValue) * 100, 1);
              return (
                <div key={index} className="chart-row" style={{ marginBottom: '16px' }}>
                  <div className="chart-label" title={data.name} style={{ width: '140px', fontWeight: '600', color: '#4B5563', fontSize: '13px' }}>
                    {data.name}
                  </div>
                  <div className="chart-bar-container" style={{ flex: 1, background: '#F3F4F6', height: '28px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      className="chart-bar" 
                      style={{ 
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, hsl(211, 74%, ${50 + (index * 4)}%) 0%, hsl(211, 74%, ${40 + (index * 4)}%) 100%)`,
                        height: '100%',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '12px',
                        transition: 'width 1s ease-out'
                      }}
                    >
                      <span className="chart-value" style={{ color: 'white', fontWeight: '700', fontSize: '12px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{data.value}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
