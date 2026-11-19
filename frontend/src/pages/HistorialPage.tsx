import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Download, Filter, RefreshCw, Search, Calendar, Database } from 'lucide-react'
import { fetchMedicionesDetalle, fetchParametros } from '../services/api'
import type { DetalleLectura, Parametro } from '../types'

export function HistorialPage() {
  const [selectedParId, setSelectedParId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [limit, setLimit] = useState<number>(100)

  const parametrosQuery = useQuery<Parametro[]>({
    queryKey: ['parametros'],
    queryFn: fetchParametros,
    refetchInterval: 10000,
  })
  const detallesQuery = useQuery<DetalleLectura[]>({
    queryKey: ['mediciones-detalle', limit, selectedParId],
    queryFn: () =>
      fetchMedicionesDetalle(limit, selectedParId ? Number(selectedParId) : undefined),
    refetchInterval: 10000,
  })

  const parametros = parametrosQuery.data ?? []
  const detalles = detallesQuery.data ?? []
  const loading = parametrosQuery.isLoading || detallesQuery.isLoading
  const isFetching = parametrosQuery.isFetching || detallesQuery.isFetching

  const loadData = () => {
    void parametrosQuery.refetch()
    void detallesQuery.refetch()
  }

  const filteredDetalles = detalles.filter((d) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const pName = (d.parametro_nombre || '').toLowerCase()
    const pCode = (d.parametro_codigo || '').toLowerCase()
    const val = String(d.det_valor_num ?? d.det_valor_texto ?? '')
    return pName.includes(term) || pCode.includes(term) || val.includes(term)
  })

  const exportarCsv = () => {
    if (filteredDetalles.length === 0) return

    const escapeCell = (value: unknown): string => {
      const text = value === null || value === undefined ? '' : String(value)
      return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }

    const headers = [
      'ID Detalle',
      'Parámetro',
      'Código',
      'Valor',
      'Unidad',
      'Estado',
      'Fecha / Hora',
    ]
    const rows = filteredDetalles.map((det) => [
      det.det_id,
      det.parametro_nombre || `Parámetro #${det.det_par_id}`,
      det.parametro_codigo || '',
      det.det_valor_num ??
        det.det_valor_texto ??
        (det.det_valor_booleano ? 'Sí' : ''),
      det.det_unidad || '',
      det.det_estado || 'normal',
      det.det_creado_at ? new Date(det.det_creado_at).toLocaleString() : '',
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(','))
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reporte_mediciones_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Historial de Mediciones</h1>
          <p className="text-sm text-slate-400">Consulta dinámica de lecturas físico-químicas por parámetro y sensor</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Parameter Filter */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedParId}
              onChange={(e) => setSelectedParId(e.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-800">Todos los parámetros</option>
              {parametros.map((p) => (
                <option key={p.par_id} value={p.par_id} className="bg-slate-800">
                  {p.par_nombre} ({p.par_unidad_ref || p.par_codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Limit Filter */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              <option value={50} className="bg-slate-800">50 registros</option>
              <option value={100} className="bg-slate-800">100 registros</option>
              <option value={200} className="bg-slate-800">200 registros</option>
              <option value={500} className="bg-slate-800">500 registros</option>
            </select>
          </div>

          <button
            onClick={exportarCsv}
            disabled={filteredDetalles.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar Reporte (CSV)
          </button>

          <button
            onClick={loadData}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por parámetro, código o valor numérico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-all"
        />
      </div>

      {/* Table Section */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Registros de Detalle de Lectura
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {filteredDetalles.length} resultados mostrados
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Cargando historial de mediciones...
          </div>
        ) : filteredDetalles.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="font-medium text-slate-300">No se encontraron registros de mediciones.</p>
            <p className="text-xs text-slate-500 mt-1">Verifica los filtros o asegúrate de que existan datos en la tabla <code className="text-cyan-400">detalle_lectura</code>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-6 py-3.5">ID Detalle</th>
                  <th className="px-6 py-3.5">Parámetro</th>
                  <th className="px-6 py-3.5">Valor</th>
                  <th className="px-6 py-3.5">Unidad</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5">Fecha / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDetalles.map((det) => (
                  <tr key={det.det_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">#{det.det_id}</td>
                    <td className="px-6 py-4 font-medium text-cyan-300">
                      {det.parametro_nombre || `Parámetro #${det.det_par_id}`}
                      {det.parametro_codigo && <span className="text-xs text-slate-500 ml-1.5">({det.parametro_codigo})</span>}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {det.det_valor_num !== null && det.det_valor_num !== undefined
                        ? Number(det.det_valor_num).toFixed(2)
                        : det.det_valor_texto || (det.det_valor_booleano ? 'Sí' : 'No')}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{det.det_unidad || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${!det.det_estado || det.det_estado === 'ok' || det.det_estado === 'valido' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {det.det_estado || 'normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {det.det_creado_at ? new Date(det.det_creado_at).toLocaleString() : 'N/D'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default HistorialPage
