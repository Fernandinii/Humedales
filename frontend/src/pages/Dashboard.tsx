import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Droplets, Activity, Server, MapPin, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers } from 'lucide-react'
import { fetchDashboardResumen, fetchHealth, fetchHumedales, fetchContenedores, fetchNodos } from '../services/api'
import type { DashboardResumen, HealthResponse, Humedal, Contenedor, Nodo } from '../types'
import { WaterQualityChart } from '../components/WaterQualityChart'

export function Dashboard() {
  const queryClient = useQueryClient()

  const healthQuery = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  })
  const humedalesQuery = useQuery<Humedal[]>({
    queryKey: ['humedales'],
    queryFn: fetchHumedales,
    refetchInterval: 10000,
  })
  const contenedoresQuery = useQuery<Contenedor[]>({
    queryKey: ['contenedores'],
    queryFn: () => fetchContenedores(),
    refetchInterval: 10000,
  })
  const nodosQuery = useQuery<Nodo[]>({
    queryKey: ['nodos'],
    queryFn: () => fetchNodos(),
    refetchInterval: 10000,
  })
  const resumenQuery = useQuery<DashboardResumen>({
    queryKey: ['dashboard-resumen'],
    queryFn: fetchDashboardResumen,
    refetchInterval: 10000,
  })

  const health = healthQuery.data ?? null
  const humedales = humedalesQuery.data ?? []
  const contenedores = contenedoresQuery.data ?? []
  const nodos = nodosQuery.data ?? []
  const totalMediciones = resumenQuery.data?.total_mediciones ?? 0

  const queries = [healthQuery, humedalesQuery, contenedoresQuery, nodosQuery, resumenQuery]
  const loading = queries.some((query) => query.isLoading)
  const isFetching = queries.some((query) => query.isFetching)
  const firstError = queries.map((query) => query.error).find(Boolean)
  const error = firstError ? firstError.message : null

  const loadData = () => {
    void queryClient.invalidateQueries()
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Droplets className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Humedales Web</h1>
              <p className="text-sm text-slate-400">Sistema de Gestión e Interpretación de Calidad del Agua (ITVH)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          {/* Health status badge */}
          {health ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>API: v{health.api_version} | DB: {health.database_status}</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Desconectado de API</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-xs">
              Verificando sistema...
            </div>
          )}
        </div>
      </header>

      {/* Error banner if any */}
      {error && (
        <div className="mb-8 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-semibold text-sm">No se pudo establecer comunicación con el servidor</p>
            <p className="text-xs text-rose-300 mt-0.5">{error}. Asegúrate de que el backend FastAPI esté ejecutándose en http://localhost:8000.</p>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-slate-400">Humedales</span>
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white">{humedales.length}</div>
          <p className="text-xs text-slate-500 mt-1">Sistemas artificiales</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-slate-400">Contenedores</span>
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">{contenedores.length}</div>
          <p className="text-xs text-slate-500 mt-1">Secciones / estanques</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-slate-400">Nodos de Monitoreo</span>
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-indigo-400">{nodos.length}</div>
          <p className="text-xs text-slate-500 mt-1">Dispositivos IoT activos</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-slate-400">Mediciones Registradas</span>
            <Activity className="w-5 h-5 text-pink-400" />
          </div>
          <div className="text-3xl font-bold text-pink-400">{totalMediciones}</div>
          <p className="text-xs text-slate-500 mt-1">Lecturas físico-químicas</p>
        </div>
      </div>

      {/* Apache ECharts Water Quality Chart Section */}
      <div className="mb-8">
        <WaterQualityChart />
      </div>

      {/* Humedales List Section */}
      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 backdrop-blur">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            Humedales Artificiales Registrados
          </h2>
          <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-full text-slate-400 font-medium">
            {humedales.length} total
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Cargando humedales desde la base de datos...
          </div>
        ) : humedales.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-700 rounded-xl">
            <Droplets className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="font-medium text-slate-300">No hay humedales registrados o la base de datos está vacía.</p>
            <p className="text-xs text-slate-500 mt-1">Los datos se obtienen de la tabla <code className="text-cyan-400">humedal</code> en PostgreSQL.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {humedales.map((hum) => (
              <div
                key={hum.hum_id}
                className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base font-semibold text-white">{hum.hum_nombre}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${hum.hum_activo !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {hum.hum_activo !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {hum.hum_descripcion || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2 text-xs text-slate-400">
                  {hum.hum_ubicacion && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">{hum.hum_ubicacion}</span>
                    </div>
                  )}
                  {hum.hum_latitud != null && hum.hum_longitud != null && (
                    <div className="text-[11px] text-slate-500">
                      Coordenadas: {hum.hum_latitud}, {hum.hum_longitud}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
export default Dashboard
