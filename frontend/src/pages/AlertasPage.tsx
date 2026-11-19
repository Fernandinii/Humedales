import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ShieldAlert, Info, Clock, RefreshCw } from 'lucide-react'
import { fetchAlertas, atenderAlerta } from '../services/api'
import type { Alerta } from '../types'

export function AlertasPage() {
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const alertasQuery = useQuery<Alerta[]>({
    queryKey: ['alertas', filtroEstado],
    queryFn: () => fetchAlertas(filtroEstado || undefined),
    refetchInterval: 10000,
  })

  const alertas = alertasQuery.data ?? []
  const loading = alertasQuery.isLoading
  const isFetching = alertasQuery.isFetching

  const loadAlertas = () => {
    void alertasQuery.refetch()
  }

  const handleAtender = async (aleId: number) => {
    setActionLoading(aleId)
    try {
      await atenderAlerta(aleId)
      await alertasQuery.refetch()
    } catch (err) {
      console.error('Error al atender alerta:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getSeveridadBadge = (severidad?: string) => {
    const sev = (severidad || '').toLowerCase()
    if (sev === 'crítico' || sev === 'critico' || sev === 'critica' || sev === 'alta' || sev === 'danger' || sev === 'high') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium rounded-full">
          <ShieldAlert className="w-3.5 h-3.5" />
          Crítico
        </span>
      )
    }
    if (sev === 'advertencia' || sev === 'warning' || sev === 'medio') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-full">
          <AlertTriangle className="w-3.5 h-3.5" />
          Advertencia
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium rounded-full">
        <Info className="w-3.5 h-3.5" />
        Informativo
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Módulo de Alertas</h1>
          <p className="text-sm text-slate-400">Gestión y notificación de anomalías en la calidad del agua</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none cursor-pointer"
          >
            <option value="">Todas las alertas</option>
            <option value="pendiente">Pendientes</option>
            <option value="atendida">Atendidas</option>
          </select>

          <button
            onClick={loadAlertas}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          Cargando alertas del sistema...
        </div>
      ) : alertas.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Sin alertas registradas</h3>
          <p className="text-xs text-slate-500 mt-1">No se encontraron alertas para el filtro seleccionado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alertas.map((ale) => {
            const isAtendida = (ale.ale_estado || '').toLowerCase() === 'atendida'
            return (
              <div
                key={ale.ale_id}
                className={`bg-slate-800/60 border rounded-xl p-5 backdrop-blur transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  isAtendida ? 'border-slate-800 opacity-75' : 'border-slate-700/80 hover:border-cyan-500/40'
                }`}
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{ale.ale_titulo}</h3>
                    {getSeveridadBadge(ale.ale_severidad)}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${isAtendida ? 'bg-slate-700 text-slate-300' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {ale.ale_estado || 'pendiente'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{ale.ale_descripcion || 'Sin descripción adicional.'}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    {ale.ale_generada_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Generada: {new Date(ale.ale_generada_at).toLocaleString()}
                      </span>
                    )}
                    {ale.ale_atendida_at && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Atendida: {new Date(ale.ale_atendida_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {!isAtendida ? (
                    <button
                      onClick={() => handleAtender(ale.ale_id)}
                      disabled={actionLoading === ale.ale_id}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {actionLoading === ale.ale_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Marcar Atendida
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Atendida
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default AlertasPage
