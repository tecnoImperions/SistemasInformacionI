import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { alertSuccess, alertError } from '../../lib/alerts'
import ClienteForm from './components/ClienteForm'
import ClienteBuscador from './components/ClienteBuscador'
import { Users, Search, UserPlus, Phone, Mail, Package, FileText, CheckCircle, ChevronRight } from 'lucide-react'

export default function ClientesPage() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [indicadores, setIndicadores] = useState({})
  const [loading, setLoading] = useState(true)
  
  // Buscador local inline
  const [localSearch, setLocalSearch] = useState('')
  const [debouncedLocal, setDebouncedLocal] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('Todos')
  
  // Paginación
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [initialNombreForm, setInitialNombreForm] = useState('')
  const [isBuscadorOpen, setIsBuscadorOpen] = useState(false)

  // ⌘K handler
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsBuscadorOpen(true)
      }
      if (e.key === 'Escape') setIsBuscadorOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Debounce inline search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocal(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedLocal, estadoFilter])

  // Fetch data
  useEffect(() => {
    fetchClientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocal, estadoFilter, page])

  async function fetchClientes() {
    setLoading(true)
    try {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false })
      
      if (debouncedLocal) {
        const cleanTerm = debouncedLocal.replace(/,/g, ' ')
        const t = `%${cleanTerm}%`
        query = query.or(`nombre.ilike.${t},empresa.ilike.${t},nit_ci.ilike.${t},telefono.ilike.${t}`)
      }

      if (estadoFilter === 'Activos') query = query.eq('activo', true)
      if (estadoFilter === 'Inactivos') query = query.eq('activo', false)

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) throw error

      setClientes(data || [])
      setTotalCount(count || 0)

      if (data && data.length > 0) {
        await fetchIndicadores(data.map(c => c.id))
      } else {
        setIndicadores({})
      }
    } catch (error) {
      console.error(error)
      alertError('Error al cargar clientes', 'Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchIndicadores(clientIds) {
    try {
      // Intentar cargar cargas (puede fallar si la tabla no existe)
      let cargas = []
      const { data: cData, error: cErr } = await supabase
        .from('cargas_cliente')
        .select('cliente_id, estado_entrega')
        .in('cliente_id', clientIds)
        .in('estado_entrega', ['PENDIENTE', 'EN_ALMACEN'])
      if (!cErr && cData) cargas = cData

      // Intentar cargar cotizaciones
      let cotizaciones = []
      const { data: cotData, error: cotErr } = await supabase
        .from('cotizaciones')
        .select('cliente_id, estado')
        .in('cliente_id', clientIds)
        .eq('estado', 'ENVIADA')
      if (!cotErr && cotData) cotizaciones = cotData

      const ind = {}
      for (const id of clientIds) {
        const pends = cargas.filter(c => c.cliente_id === id)
        const cots = cotizaciones.filter(c => c.cliente_id === id)
        ind[id] = {
          cargasPendientes: pends.length,
          cotizacionActiva: cots.length > 0
        }
      }
      setIndicadores(ind)
    } catch (err) {
      console.error('Error al cargar indicadores:', err)
    }
  }

  const getAvatarColors = (index) => {
    const colors = [
      { bg: '#E1F5EE', text: '#0F6E56' },
      { bg: '#E6F1FB', text: '#185FA5' },
      { bg: '#FAEEDA', text: '#854F0B' },
      { bg: '#EAF3DE', text: '#3B6D11' }
    ]
    return colors[index % colors.length]
  }

  const getIniciales = (nombre, empresa) => {
    const texto = nombre || empresa || 'C'
    const palabras = texto.trim().split(' ')
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase()
    }
    return texto.substring(0, 2).toUpperCase()
  }

  const handleOpenForm = (initialName = '') => {
    setInitialNombreForm(initialName)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setInitialNombreForm('')
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} color="#0F6E56" />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0, color: '#2C2C2A' }}>
              Clientes
            </h1>
            <p style={{ fontSize: '13px', color: '#888780', margin: 0, marginTop: '2px' }}>
              Directorio de empresas y contactos
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsBuscadorOpen(true)}
            style={{
              background: 'white', border: '1.5px solid #E5E7EB', color: '#888780',
              padding: '7px 14px', borderRadius: '8px', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
            }}
          >
            <Search size={14} />
            ⌘K Buscar
          </button>
          <button
            onClick={() => handleOpenForm()}
            style={{
              background: '#0F6E56', color: 'white', border: 'none',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
            }}
          >
            <UserPlus size={15} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Barra de búsqueda inline */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <Search size={14} color="#888780" />
          </div>
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Filtrar lista..."
            style={{
              width: '100%', border: '1.5px solid #E5E7EB', borderRadius: '8px',
              padding: '8px 12px 8px 36px', fontSize: '13px', color: '#2C2C2A',
              outline: 'none', transition: 'border-color 0.15s'
            }}
            onFocus={e => e.target.style.borderColor = '#0F6E56'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          style={{
            border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '8px 12px',
            fontSize: '13px', color: '#2C2C2A', outline: 'none', background: 'white'
          }}
        >
          <option value="Todos">Todos</option>
          <option value="Activos">Activos</option>
          <option value="Inactivos">Inactivos</option>
        </select>
      </div>

      {/* Tabla de clientes */}
      <div style={{
        background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB',
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9F9F7' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#888780', letterSpacing: '0.06em', fontWeight: 500 }}>
                CLIENTE
              </th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#888780', letterSpacing: '0.06em', fontWeight: 500 }}>
                CONTACTO
              </th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#888780', letterSpacing: '0.06em', fontWeight: 500 }}>
                INDICADOR
              </th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#888780', letterSpacing: '0.06em', fontWeight: 500 }}>
                ESTADO
              </th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div style={{ padding: '60px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Users size={48} color="#D1CFC8" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '15px', color: '#2C2C2A', fontWeight: 500 }}>
                      Aún no hay clientes registrados
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#888780' }}>
                      Usa ⌘K o el botón para agregar el primero
                    </p>
                    <button
                      onClick={() => handleOpenForm()}
                      style={{
                        marginTop: '8px', padding: '8px 16px', borderRadius: '8px',
                        backgroundColor: '#0F6E56', color: 'white', border: 'none',
                        fontSize: '13px', cursor: 'pointer'
                      }}
                    >
                      ＋ Agregar primer cliente
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              clientes.map((cliente, i) => {
                const avatar = getAvatarColors(i)
                const ind = indicadores[cliente.id] || { cargasPendientes: 0, cotizacionActiva: false }
                
                return (
                  <tr 
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    style={{ borderBottom: '0.5px solid #F1EFE8', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9F9F7'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* CLIENTE */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          backgroundColor: avatar.bg, color: avatar.text,
                          fontSize: '13px', fontWeight: 500, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {getIniciales(cliente.nombre, cliente.empresa)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#2C2C2A' }}>
                              {cliente.nombre}
                            </p>
                            <span style={{ fontSize: '10px', color: '#888780', background: '#F1EFE8', padding: '1px 6px', borderRadius: '4px' }}>
                              {cliente.codigo}
                            </span>
                          </div>
                          {cliente.empresa && (
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#888780' }}>
                              {cliente.empresa}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CONTACTO */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2C2C2A' }}>
                        <Phone size={12} color="#888780" />
                        <span style={{ fontSize: '13px' }}>{cliente.telefono || '—'}</span>
                      </div>
                      {cliente.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888780', marginTop: '4px' }}>
                          <Mail size={12} />
                          <span style={{ fontSize: '12px' }}>{cliente.email}</span>
                        </div>
                      )}
                    </td>

                    {/* INDICADOR */}
                    <td style={{ padding: '12px 16px' }}>
                      {ind.cargasPendientes > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>
                          <Package size={10} /> {ind.cargasPendientes} pendiente(s)
                        </span>
                      ) : ind.cotizacionActiva ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#E6F1FB', color: '#185FA5', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>
                          <FileText size={10} /> Cotización activa
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F1EFE8', color: '#888780', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>
                          Sin actividad
                        </span>
                      )}
                    </td>

                    {/* ESTADO */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '99px',
                          backgroundColor: cliente.activo ? '#EAF3DE' : '#F1EFE8',
                          color: cliente.activo ? '#3B6D11' : '#888780'
                        }}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        <ChevronRight size={14} color="#D1CFC8" />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {clientes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '0.5px solid #F1EFE8' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#888780' }}>
              Mostrando {totalCount === 0 ? 0 : page * PAGE_SIZE + 1} a {Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount} clientes
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(Math.max(0, page - 1))} 
                disabled={page === 0}
                style={{ 
                  padding: '4px 10px', borderRadius: '6px', fontSize: '13px',
                  border: '1px solid #E5E7EB', cursor: page === 0 ? 'not-allowed' : 'pointer',
                  color: page === 0 ? '#D1CFC8' : '#2C2C2A', background: 'white'
                }}
              >
                Anterior
              </button>
              <button 
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))} 
                disabled={page >= totalPages - 1}
                style={{ 
                  padding: '4px 10px', borderRadius: '6px', fontSize: '13px',
                  border: '1px solid #E5E7EB', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  color: page >= totalPages - 1 ? '#D1CFC8' : '#2C2C2A', background: 'white'
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <ClienteForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSuccess={fetchClientes}
        initialNombre={initialNombreForm}
      />

      <ClienteBuscador
        isOpen={isBuscadorOpen}
        onClose={() => setIsBuscadorOpen(false)}
        onOpenNuevoCliente={handleOpenForm}
      />
    </div>
  )
}
