import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Database,
  Gauge,
  Layers,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  entrenarML,
  fetchMedicionesGraficas,
  fetchModelosML,
  fetchNodos,
  fetchParametros,
  fetchPrediccionesML,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import type {
  EntrenarMLResponse,
  Lectura,
  ModeloML,
  Nodo,
  Parametro,
  PrediccionLectura,
} from '../types'

type ParamKey =
  | 'lec_ph'
  | 'lec_temperatura'
  | 'lec_turbidez'
  | 'lec_tds_ppm'
  | 'lec_conductividad_us_cm'

const PARAM_CONFIG: Record<
  string,
  { key: ParamKey; label: string; unit: string; color: string }
> = {
  PH: { key: 'lec_ph', label: 'pH', unit: 'pH', color: '#06b6d4' },
  TEMPERATURA: { key: 'lec_temperatura', label: 'Temperatura', unit: '°C', color: '#f59e0b' },
  TURBIDEZ: { key: 'lec_turbidez', label: 'Turbidez', unit: 'NTU', color: '#8b5cf6' },
  TDS: { key: 'lec_tds_ppm', label: 'TDS', unit: 'ppm', color: '#10b981' },
  CONDUCTIVIDAD: {
    key: 'lec_conductividad_us_cm',
    label: 'Conductividad',
    unit: 'µS/cm',
    color: '#ec4899',
  },
}

const CARD_CLASS = 'bg-slate-800/40 border border-slate-800 rounded-2xl backdrop-blur'

function formatDate(value?: string): string {
  if (!value) return 'N/D'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function confidenceColor(confianza?: number): string {
  const value = confianza ?? 0
  if (value >= 0.7) return 'bg-emerald-500'
  if (value >= 0.4) return 'bg-amber-500'
  return 'bg-rose-500'
}

export function PredictivoPage() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canTrain = hasRole('Administrador', 'Investigador')

  const [nodoId, setNodoId] = useState<string>('')
  const [parametro, setParametro] = useState<string>('PH')

  const nodosQuery = useQuery<Nodo[]>({
    queryKey: ['nodos'],
    queryFn: () => fetchNodos(),
  })
  const parametrosQuery = useQuery<Parametro[]>({
    queryKey: ['parametros'],
    queryFn: fetchParametros,
  })
  const modelosQuery = useQuery<ModeloML[]>({
    queryKey: ['ml-modelos'],
    queryFn: fetchModelosML,
    refetchInterval: 30000,
  })
  const nodos = nodosQuery.data ?? []
  const nodoSeleccionado = nodoId || (nodos.length > 0 ? String(nodos[0].nod_id) : '')

  const prediccionesQuery = useQuery<PrediccionLectura[]>({
    queryKey: ['ml-predicciones', nodoSeleccionado, parametro],
    queryFn: () => fetchPrediccionesML(Number(nodoSeleccionado), parametro),
    enabled: Boolean(nodoSeleccionado),
    refetchInterval: 30000,
  })
  const historialQuery = useQuery<Lectura[]>({
    queryKey: ['mediciones-graficas', nodoSeleccionado],
    queryFn: () => fetchMedicionesGraficas(Number(nodoSeleccionado), 200),
    enabled: Boolean(nodoSeleccionado),
    refetchInterval: 15000,
  })

  const entrenarMutation = useMutation<EntrenarMLResponse, Error, void>({
    mutationFn: () =>
      entrenarML({ nod_id: Number(nodoSeleccionado), horizonte: 12 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ml-modelos'] })
      void queryClient.invalidateQueries({ queryKey: ['ml-predicciones'] })
      void queryClient.invalidateQueries({ queryKey: ['alertas'] })
    },
  })

  const parametros = parametrosQuery.data ?? []
  const modelos = modelosQuery.data ?? []
  const predicciones = prediccionesQuery.data ?? []
  const historial = historialQuery.data ?? []

  const config = PARAM_CONFIG[parametro] ?? PARAM_CONFIG.PH
  const parametroInfo = parametros.find(
    (item) => item.par_codigo?.toUpperCase() === parametro,
  )

  const minimo =
    parametroInfo?.par_minimo !== null && parametroInfo?.par_minimo !== undefined
      ? Number(parametroInfo.par_minimo)
      : null
  const maximo =
    parametroInfo?.par_maximo !== null && parametroInfo?.par_maximo !== undefined
      ? Number(parametroInfo.par_maximo)
      : null

  const puntosHistoricos = historial
    .map((lectura) => {
      const valor = lectura[config.key]
      const fecha = lectura.lec_fecha_hora || lectura.lec_recibido_at
      if (!fecha || valor === null || valor === undefined) return null
      return [fecha, Number(valor)] as [string, number]
    })
    .filter((punto): punto is [string, number] => punto !== null)

  const futuros = predicciones.map((prediccion) => {
    const fecha = prediccion.pre_fecha_objetivo || prediccion.pre_generado_at
    return [fecha, Number(prediccion.pre_valor_predicho)] as [string, number]
  })
  const puntosProyeccion =
    puntosHistoricos.length === 0
      ? futuros
      : [puntosHistoricos[puntosHistoricos.length - 1], ...futuros]

  const confianzaPromedio = predicciones.length
    ? predicciones.reduce((acc, item) => acc + Number(item.pre_confianza ?? 0), 0) /
      predicciones.length
    : 0

  const fueraDeRango = predicciones.filter((prediccion) => {
    const valor = Number(prediccion.pre_valor_predicho)
    if (minimo !== null && valor < minimo) return true
    if (maximo !== null && valor > maximo) return true
    return false
  }).length

  const thresholdData = [
    ...(minimo !== null ? [{ yAxis: minimo, name: 'Mín' }] : []),
    ...(maximo !== null ? [{ yAxis: maximo, name: 'Máx' }] : []),
  ]

  const chartOption = {
    backgroundColor: 'transparent',
    legend: {
      data: ['Histórico', 'Proyección'],
      textStyle: { color: '#cbd5e1' },
      top: 0,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: (
        params: Array<{
          marker?: string
          seriesName?: string
          value?: [string | number, number]
        }>,
      ) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const rows = params
          .filter((item) => Array.isArray(item.value))
          .map((item) => {
            const [fecha, valor] = item.value as [string | number, number]
            return `<div>${item.marker ?? ''} ${item.seriesName ?? ''}: <strong>${valor} ${config.unit}</strong><br/><span style="color:#94a3b8;font-size:11px">${formatDate(String(fecha))}</span></div>`
          })
        return rows.join('')
      },
    },
    grid: { top: 45, bottom: 45, left: 55, right: 25, containLabel: true },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: number) =>
          new Date(value).toLocaleString([], {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
    },
    yAxis: {
      type: 'value',
      name: config.unit ? `(${config.unit})` : '',
      nameTextStyle: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'Histórico',
        type: 'line',
        data: puntosHistoricos,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: config.color },
        lineStyle: { width: 3, color: config.color },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#f43f5e', type: 'dashed', width: 1 },
          label: { color: '#fda4af', formatter: '{b} {c}' },
          data: thresholdData,
        },
      },
      {
        name: 'Proyección',
        type: 'line',
        data: puntosProyeccion,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2, type: 'dashed', color: '#f59e0b' },
      },
    ],
  }

  const handleEntrenar = () => {
    if (!nodoSeleccionado) return
    entrenarMutation.mutate()
  }

  const recargar = () => {
    void modelosQuery.refetch()
    void prediccionesQuery.refetch()
    void historialQuery.refetch()
  }

  const sinDatos = puntosHistoricos.length === 0 && puntosProyeccion.length === 0
  const resultado = entrenarMutation.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Análisis Predictivo
          </h1>
          <p className="text-sm text-slate-400">
            Proyecciones de calidad del agua con modelos de regresión temporal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={nodoSeleccionado}
              onChange={(event) => setNodoId(event.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              {nodos.length === 0 && <option value="">Sin nodos</option>}
              {nodos.map((nodo) => (
                <option key={nodo.nod_id} value={nodo.nod_id} className="bg-slate-800">
                  {nodo.nod_codigo ? `${nodo.nod_codigo} · ` : ''}
                  {nodo.nod_nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Gauge className="w-4 h-4 text-slate-400" />
            <select
              value={parametro}
              onChange={(event) => setParametro(event.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              {Object.entries(PARAM_CONFIG).map(([code, item]) => (
                <option key={code} value={code} className="bg-slate-800">
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={recargar}
            disabled={modelosQuery.isFetching || prediccionesQuery.isFetching}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                modelosQuery.isFetching || prediccionesQuery.isFetching ? 'animate-spin' : ''
              }`}
            />
          </button>

          {canTrain && (
            <button
              onClick={handleEntrenar}
              disabled={entrenarMutation.isPending || !nodoSeleccionado}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${entrenarMutation.isPending ? 'animate-pulse' : ''}`} />
              {entrenarMutation.isPending
                ? 'Entrenando...'
                : 'Entrenar y Generar Proyecciones'}
            </button>
          )}
        </div>
      </div>

      {!canTrain && (
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          El entrenamiento está disponible para roles Administrador e Investigador.
          Puede consultar los modelos y proyecciones existentes.
        </div>
      )}

      {entrenarMutation.error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {entrenarMutation.error.message}
        </div>
      )}

      {resultado && (
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Entrenamiento completado
            </span>
            <span className="text-slate-300">
              {resultado.modelos_entrenados} modelos · {resultado.predicciones_generadas}{' '}
              proyecciones · {resultado.alertas_generadas} alertas
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {resultado.resultados.map((item) => (
              <div
                key={`${item.parametro}-${item.estado}`}
                className="p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs"
              >
                <p className="font-semibold text-slate-200">
                  {item.parametro_nombre ?? item.parametro}
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                      item.estado === 'entrenado'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {item.estado}
                  </span>
                </p>
                <p className="text-slate-500 mt-1">{item.mensaje}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${CARD_CLASS} p-4`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="w-4 h-4 text-cyan-400" />
            Modelos registrados
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{modelos.length}</p>
        </div>
        <div className={`${CARD_CLASS} p-4`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Proyecciones
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{predicciones.length}</p>
        </div>
        <div className={`${CARD_CLASS} p-4`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Gauge className="w-4 h-4 text-emerald-400" />
            Confianza promedio
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {(confianzaPromedio * 100).toFixed(1)}%
          </p>
        </div>
        <div className={`${CARD_CLASS} p-4`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Fuera de rango
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{fueraDeRango}</p>
        </div>
      </div>

      <div className={`${CARD_CLASS} p-6`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">
              {config.label} · Curva histórica y proyección
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400" /> Histórico real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400" style={{ borderTop: '1px dashed' }} />{' '}
              Proyección
            </span>
            {minimo !== null && (
              <span className="text-rose-300">Mín: {minimo}</span>
            )}
            {maximo !== null && (
              <span className="text-rose-300">Máx: {maximo}</span>
            )}
          </div>
        </div>

        <div className="w-full h-[360px]">
          {sinDatos ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
              <Activity className="w-10 h-10 mb-2 text-slate-600" />
              <p className="font-medium text-slate-300">
                No hay datos históricos ni proyecciones para este nodo/parámetro.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {canTrain
                  ? 'Use "Entrenar y Generar Proyecciones" para crear un modelo.'
                  : 'Solicite a un Administrador o Investigador generar el modelo.'}
              </p>
            </div>
          ) : (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge
            />
          )}
        </div>
      </div>

      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Modelos de Machine Learning
          </h2>
          <span className="text-xs text-slate-400">{modelos.length} registrados</span>
        </div>
        {modelosQuery.isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
            Cargando modelos...
          </div>
        ) : modelos.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Aún no hay modelos entrenados en la tabla modelo_ml.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-5 py-3">Modelo</th>
                  <th className="px-5 py-3">Versión</th>
                  <th className="px-5 py-3">Algoritmo</th>
                  <th className="px-5 py-3">Entrenado</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Artefacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {modelos.map((modelo) => (
                  <tr key={modelo.mod_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{modelo.mod_nombre}</p>
                      <p className="text-[11px] text-slate-500">{modelo.mod_descripcion}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-cyan-300">
                      {modelo.mod_version}
                    </td>
                    <td className="px-5 py-3 text-slate-400">{modelo.mod_algoritmo ?? '-'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {formatDate(modelo.mod_entrenado_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          modelo.mod_activo
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-700/40 text-slate-400 border-slate-600'
                        }`}
                      >
                        {modelo.mod_activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[11px] font-mono text-slate-500">
                      {modelo.mod_ruta_archivo ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Proyecciones generadas
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Valores futuros almacenados en prediccion_lectura con su nivel de confianza.
            </p>
          </div>
          <span className="text-xs text-slate-400">{predicciones.length} intervalos</span>
        </div>

        {prediccionesQuery.isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
            Cargando predicciones...
          </div>
        ) : predicciones.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No hay proyecciones para el nodo y parámetro seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-5 py-3">Fecha objetivo</th>
                  <th className="px-5 py-3">Valor predicho</th>
                  <th className="px-5 py-3">Unidad</th>
                  <th className="px-5 py-3 w-56">Confianza</th>
                  <th className="px-5 py-3">Modelo</th>
                  <th className="px-5 py-3">Generado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {predicciones.map((prediccion) => {
                  const valor = Number(prediccion.pre_valor_predicho)
                  const excede =
                    (minimo !== null && valor < minimo) || (maximo !== null && valor > maximo)
                  const confianza = Number(prediccion.pre_confianza ?? 0)
                  return (
                    <tr
                      key={prediccion.pre_id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-slate-300">
                        {formatDate(prediccion.pre_fecha_objetivo)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-bold ${excede ? 'text-rose-400' : 'text-white'}`}
                        >
                          {valor.toFixed(3)}
                        </span>
                        {excede && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded">
                            fuera de rango
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {prediccion.pre_unidad || '-'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${confidenceColor(confianza)}`}
                              style={{ width: `${Math.min(100, confianza * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-12 text-right">
                            {(confianza * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-cyan-300 font-mono">
                        #{prediccion.pre_mod_id}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {formatDate(prediccion.pre_generado_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PredictivoPage
