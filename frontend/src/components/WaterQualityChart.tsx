import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { Activity, Calendar, Filter, RefreshCw } from 'lucide-react'
import { fetchMedicionesGraficas } from '../services/api'
import type { Lectura } from '../types'

interface WaterQualityChartProps {
  nodId?: number
}

type ParameterKey = 'lec_ph' | 'lec_temperatura' | 'lec_turbidez' | 'lec_tds_ppm' | 'lec_conductividad_us_cm'

const PARAMETER_CONFIG: Record<ParameterKey, { label: string; unit: string; color: string }> = {
  lec_ph: { label: 'pH', unit: '', color: '#06b6d4' },
  lec_temperatura: { label: 'Temperatura', unit: '°C', color: '#f59e0b' },
  lec_turbidez: { label: 'Turbidez', unit: 'NTU', color: '#8b5cf6' },
  lec_tds_ppm: { label: 'TDS', unit: 'ppm', color: '#10b981' },
  lec_conductividad_us_cm: { label: 'Conductividad', unit: 'µS/cm', color: '#ec4899' },
}

export function WaterQualityChart({ nodId }: WaterQualityChartProps) {
  const [selectedParam, setSelectedParam] = useState<ParameterKey>('lec_ph')
  const [limit, setLimit] = useState<number>(50)

  const {
    data = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Lectura[]>({
    queryKey: ['mediciones-graficas', nodId ?? 'todos', limit],
    queryFn: () => fetchMedicionesGraficas(nodId, limit),
    refetchInterval: 5000,
  })

  const currentConfig = PARAMETER_CONFIG[selectedParam]

  const chartOptions = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: {
        color: '#f8fafc',
      },
      formatter: (params: any) => {
        const p = params[0]
        const dateStr = p.axisValue ? new Date(p.axisValue).toLocaleString() : ''
        return `<div class="font-medium text-slate-200 mb-1">${dateStr}</div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${p.color}"></span>
                  <span>${currentConfig.label}: <strong>${p.value ?? 'N/D'} ${currentConfig.unit}</strong></span>
                </div>`
      },
    },
    grid: {
      top: 40,
      bottom: 40,
      left: 50,
      right: 20,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.lec_fecha_hora || item.lec_recibido_at || ''),
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: string) => {
          if (!value) return ''
          const d = new Date(value)
          return isNaN(d.getTime()) ? value : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      },
    },
    yAxis: {
      type: 'value',
      name: currentConfig.unit ? `(${currentConfig.unit})` : '',
      nameTextStyle: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: currentConfig.label,
        type: 'line',
        data: data.map((item) => (item[selectedParam] !== null && item[selectedParam] !== undefined ? Number(item[selectedParam]) : null)),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: currentConfig.color },
        lineStyle: { width: 3, color: currentConfig.color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: currentConfig.color + '40' },
              { offset: 1, color: currentConfig.color + '00' },
            ],
          },
        },
      },
    ],
  }

  return (
    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 backdrop-blur">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Monitoreo Físico-Químico en Tiempo Real</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Parameter Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value as ParameterKey)}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              {Object.entries(PARAMETER_CONFIG).map(([key, config]) => (
                <option key={key} value={key} className="bg-slate-800 text-white">
                  {config.label} {config.unit ? `(${config.unit})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Limit / Range Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              <option value={20} className="bg-slate-800 text-white">Últimas 20</option>
              <option value={50} className="bg-slate-800 text-white">Últimas 50</option>
              <option value={100} className="bg-slate-800 text-white">Últimas 100</option>
              <option value={200} className="bg-slate-800 text-white">Últimas 200</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Recargar gráfica"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-[350px]">
        {isLoading && data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2 text-cyan-400" />
            Cargando lecturas...
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
            <Activity className="w-10 h-10 mb-2 text-slate-600" />
            <p className="font-medium text-slate-300">No hay registros de mediciones disponibles.</p>
            <p className="text-xs text-slate-500 mt-1">La tabla <code className="text-cyan-400">lectura</code> no contiene datos actualmente.</p>
          </div>
        ) : (
          <ReactECharts option={chartOptions} style={{ height: '100%', width: '100%' }} />
        )}
      </div>
    </div>
  )
}
export default WaterQualityChart
