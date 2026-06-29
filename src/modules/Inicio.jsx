import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart as BarChartIcon, Package, AlertTriangle, TrendingUp, 
  DollarSign, Users, ShoppingCart, Activity, Clock, ChevronRight,
  ArrowUpRight, Target
} from 'lucide-react';

export default function Inicio({ addToast, userProfile, onNavigate }) {
  const [stats, setStats] = useState({
    totalStock: 0,
    lowStockItems: 0,
    totalCategories: 0,
    ingresosMes: 0,
    clientesActivos: 0,
    cotizacionesMes: 0,
    chartData: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Stock Data
      const { data: piezas } = await supabase
        .from('catalogo_piezas')
        .select(`stock, categorias(nombre)`);

      let totalStock = 0;
      let lowStockItems = 0;
      const categoryMap = {};

      if (piezas) {
        piezas.forEach(pieza => {
          const stock = pieza.stock || 0;
          totalStock += stock;
          if (stock > 0 && stock <= 5) lowStockItems++;
          
          const catName = pieza.categorias?.nombre || 'General';
          categoryMap[catName] = (categoryMap[catName] || 0) + stock;
        });
      }

      const chartData = Object.keys(categoryMap)
        .map(key => ({ name: key, value: categoryMap[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 categories

      // 2. Ingresos del Mes Actual (Notas de Entrega)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      const { data: notas } = await supabase
        .from('notas_entrega')
        .select('total_usd, fecha, numero_nota, clientes(nombre), estado')
        .gte('fecha', firstDay)
        .order('fecha', { ascending: false });

      let ingresosMes = 0;
      let recentSales = [];
      if (notas) {
        ingresosMes = notas.reduce((sum, n) => sum + parseFloat(n.total_usd || 0), 0);
        recentSales = notas.slice(0, 5); // top 5 recent
      }

      // 3. Clientes Activos
      const { count: clientesActivos } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', true);

      // 4. Cotizaciones del Mes
      const { count: cotizacionesMes } = await supabase
        .from('cotizaciones')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', firstDay);

      setStats({
        totalStock,
        lowStockItems,
        totalCategories: Object.keys(categoryMap).length,
        ingresosMes,
        clientesActivos: clientesActivos || 0,
        cotizacionesMes: cotizacionesMes || 0,
        chartData,
        recentSales
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (addToast) addToast('Error', 'No se pudieron cargar todos los datos del dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const maxChartValue = Math.max(...stats.chartData.map(d => d.value), 1);

  return (
    <div className="content-area" style={{ flexDirection: 'column', overflowY: 'auto', background: '#F8FAFC', padding: '32px' }}>
      
      {/* Header Profile & Welcome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            Hola, {userProfile?.nombre || 'Administrador'} 👋
          </h1>
          <p style={{ color: '#64748B', fontSize: '15px', marginTop: '6px' }}>
            Aquí tienes el resumen ejecutivo de la importadora.
          </p>
        </div>
        <div style={{ background: '#FFF', padding: '10px 20px', borderRadius: '50px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
          <Clock size={16} color="#3B82F6" />
          {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards Premium Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Card: Ingresos */}
        <div className="kpi-card" style={{ background: '#FFF', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: '0.04' }}><DollarSign size={120} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#ECFDF5', padding: '12px', borderRadius: '14px', color: '#10B981' }}>
              <DollarSign size={24} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '12px', fontWeight: 'bold', background: '#D1FAE5', padding: '4px 8px', borderRadius: '20px' }}>
              <ArrowUpRight size={14} /> Mes actual
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos (USD)</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
            {loading ? '...' : `$${stats.ingresosMes.toLocaleString('en-US', {minimumFractionDigits:2})}`}
          </div>
        </div>

        {/* Card: Cotizaciones */}
        <div className="kpi-card" style={{ background: '#FFF', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: '0.04' }}><Target size={120} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '14px', color: '#3B82F6' }}>
              <Target size={24} />
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cotizaciones (Mes)</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
            {loading ? '...' : stats.cotizacionesMes}
          </div>
        </div>

        {/* Card: Clientes */}
        <div className="kpi-card" style={{ background: '#FFF', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: '0.04' }}><Users size={120} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#F5F3FF', padding: '12px', borderRadius: '14px', color: '#8B5CF6' }}>
              <Users size={24} />
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clientes Activos</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
            {loading ? '...' : stats.clientesActivos}
          </div>
        </div>

        {/* Card: Stock Alert */}
        <div className="kpi-card" style={{ background: '#FFF', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: '0.04' }}><AlertTriangle size={120} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '14px', color: '#EF4444' }}>
              <AlertTriangle size={24} />
            </div>
            {stats.lowStockItems > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontSize: '12px', fontWeight: 'bold', background: '#FEE2E2', padding: '4px 8px', borderRadius: '20px' }}>
                Revisar
              </div>
            )}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alertas Stock Crítico</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
            {loading ? '...' : stats.lowStockItems}
          </div>
        </div>
      </div>

      {/* Main Content Area: Chart & List */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Left: Glassmorphism Chart */}
        <div style={{ background: 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)', color: '#FFF', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BarChartIcon size={22} color="#38BDF8" /> Top Categorías en Almacén
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>Volumen de bultos por categoría principal</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#38BDF8' }}>
              Volumen Total: {stats.totalStock}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#64748B' }}>Cargando inteligencia de negocio...</div>
            ) : stats.chartData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748B' }}>No hay inventario registrado.</div>
            ) : (
              <div style={{ paddingRight: '20px' }}>
                {stats.chartData.map((data, index) => {
                  const percentage = Math.max((data.value / maxChartValue) * 100, 2);
                  return (
                    <div key={index} style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                        <span style={{ color: '#E2E8F0' }}>{data.name}</span>
                        <span style={{ color: '#38BDF8' }}>{data.value} und.</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                        <div 
                          style={{ 
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, #38BDF8 0%, #3B82F6 100%)`,
                            height: '100%',
                            borderRadius: '10px',
                            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity / Ventas */}
        <div style={{ background: '#FFF', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#10B981" /> Actividad Reciente
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', marginTop: '40px' }}>Cargando...</div>
            ) : stats.recentSales.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', marginTop: '40px' }}>No hay ventas este mes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stats.recentSales.map((sale, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '12px', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'} onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}>
                    <div style={{ background: '#E0E7FF', padding: '10px', borderRadius: '10px', color: '#4F46E5' }}>
                      <ShoppingCart size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>{sale.clientes?.nombre || 'Cliente Final'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px' }}>
                        <span>Nota #{sale.numero_nota}</span> • <span>{sale.fecha}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                        ${parseFloat(sale.total_usd || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: '#10B981', background: '#D1FAE5', padding: '2px 6px', borderRadius: '10px', display: 'inline-block', marginTop: '4px' }}>
                        {sale.estado}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={() => onNavigate && onNavigate('NOTAS_ENTREGA')} style={{ width: '100%', padding: '14px', marginTop: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#475569', fontSize: '13px', fontWeight: '700', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            Ver Todas Las Ventas <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
