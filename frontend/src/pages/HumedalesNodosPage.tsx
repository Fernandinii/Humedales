import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Droplets,
  Layers,
  MapPin,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  createContenedor,
  createHumedal,
  createNodo,
  createSensor,
  createSensorParametro,
  fetchContenedores,
  fetchHumedales,
  fetchNodos,
  fetchParametros,
  fetchSensorParametros,
  fetchSensores,
  updateContenedor,
  updateHumedal,
  updateNodo,
  updateSensor,
  updateSensorParametro,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import type {
  Contenedor,
  ContenedorInput,
  Humedal,
  HumedalInput,
  Nodo,
  NodoInput,
  Parametro,
  Sensor,
  SensorInput,
  SensorParametro,
} from '../types'

const inputClass =
  'w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 transition-colors'
const labelClass = 'block text-xs font-medium text-slate-400 mb-1'
const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50'
const secondaryButton =
  'inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-50'
const tinyButton =
  'inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] font-medium text-slate-300 transition-colors cursor-pointer'

type ModalState =
  | { kind: 'humedal'; humedal?: Humedal }
  | { kind: 'contenedor'; humedalId: number; contenedor?: Contenedor }
  | { kind: 'nodo'; humedalId: number; nodo?: Nodo }
  | { kind: 'sensor'; nodoId: number; sensor?: Sensor }
  | { kind: 'sensor-params'; sensor: Sensor }
  | null

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorMessage({ error }: { error: Error | null }) {
  if (!error) return null
  return (
    <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {error.message}
    </div>
  )
}

function ActiveCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 accent-cyan-500"
      />
      Activo
    </label>
  )
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// --------------------------------------------------------------------------- //
// Formularios
// --------------------------------------------------------------------------- //
function HumedalModal({ humedal, onClose }: { humedal?: Humedal; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState(humedal?.hum_nombre ?? '')
  const [descripcion, setDescripcion] = useState(humedal?.hum_descripcion ?? '')
  const [ubicacion, setUbicacion] = useState(humedal?.hum_ubicacion ?? '')
  const [latitud, setLatitud] = useState(humedal?.hum_latitud?.toString() ?? '')
  const [longitud, setLongitud] = useState(humedal?.hum_longitud?.toString() ?? '')
  const [activo, setActivo] = useState(humedal?.hum_activo ?? true)

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: HumedalInput = {
        hum_nombre: nombre.trim(),
        hum_descripcion: descripcion.trim() || undefined,
        hum_ubicacion: ubicacion.trim() || undefined,
        hum_latitud: latitud.trim() ? Number(latitud) : undefined,
        hum_longitud: longitud.trim() ? Number(longitud) : undefined,
        hum_activo: activo,
      }
      return humedal ? updateHumedal(humedal.hum_id, payload) : createHumedal(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onClose()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal title={humedal ? 'Editar humedal' : 'Nuevo humedal'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            className={inputClass}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Ubicación</label>
          <input className={inputClass} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Latitud</label>
            <input
              className={inputClass}
              type="number"
              step="0.000001"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Longitud</label>
            <input
              className={inputClass}
              type="number"
              step="0.000001"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
            />
          </div>
        </div>
        <ActiveCheckbox checked={activo} onChange={setActivo} />
        <ErrorMessage error={mutation.error} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={primaryButton} disabled={mutation.isPending || !nombre.trim()}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ContenedorModal({
  humedalId,
  contenedor,
  humedales,
  onClose,
}: {
  humedalId: number
  contenedor?: Contenedor
  humedales: Humedal[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selHumedal, setSelHumedal] = useState(String(contenedor?.con_hum_id ?? humedalId))
  const [codigo, setCodigo] = useState(contenedor?.con_codigo ?? '')
  const [nombre, setNombre] = useState(contenedor?.con_nombre ?? '')
  const [descripcion, setDescripcion] = useState(contenedor?.con_descripcion ?? '')
  const [orden, setOrden] = useState(contenedor?.con_orden?.toString() ?? '')
  const [activo, setActivo] = useState(contenedor?.con_activo ?? true)

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: ContenedorInput = {
        con_hum_id: Number(selHumedal),
        con_codigo: codigo.trim(),
        con_nombre: nombre.trim(),
        con_descripcion: descripcion.trim() || undefined,
        con_orden: orden.trim() ? Number(orden) : undefined,
        con_activo: activo,
      }
      return contenedor
        ? updateContenedor(contenedor.con_id, payload)
        : createContenedor(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onClose()
    },
  })

  return (
    <Modal title={contenedor ? 'Editar contenedor' : 'Nuevo contenedor'} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <div>
          <label className={labelClass}>Humedal</label>
          <select className={inputClass} value={selHumedal} onChange={(e) => setSelHumedal(e.target.value)}>
            {humedales.map((hum) => (
              <option key={hum.hum_id} value={hum.hum_id}>
                {hum.hum_nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Código</label>
            <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Orden</label>
            <input className={inputClass} type="number" min={1} value={orden} onChange={(e) => setOrden(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            className={inputClass}
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <ActiveCheckbox checked={activo} onChange={setActivo} />
        <ErrorMessage error={mutation.error} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className={primaryButton}
            disabled={mutation.isPending || !codigo.trim() || !nombre.trim()}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NodoModal({
  humedalId,
  nodo,
  humedales,
  contenedores,
  onClose,
}: {
  humedalId: number
  nodo?: Nodo
  humedales: Humedal[]
  contenedores: Contenedor[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selHumedal, setSelHumedal] = useState(String(nodo?.nod_hum_id ?? humedalId))
  const [selContenedor, setSelContenedor] = useState(nodo?.nod_con_id ? String(nodo.nod_con_id) : '')
  const [nombre, setNombre] = useState(nodo?.nod_nombre ?? '')
  const [codigo, setCodigo] = useState(nodo?.nod_codigo ?? '')
  const [ubicacion, setUbicacion] = useState(nodo?.nod_ubicacion ?? '')
  const [activo, setActivo] = useState(nodo?.nod_activo ?? true)

  const contenedoresFiltrados = contenedores.filter(
    (contenedor) => contenedor.con_hum_id === Number(selHumedal),
  )

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: NodoInput = {
        nod_hum_id: Number(selHumedal),
        nod_nombre: nombre.trim(),
        nod_codigo: codigo.trim(),
        nod_ubicacion: ubicacion.trim() || undefined,
        nod_con_id: selContenedor ? Number(selContenedor) : undefined,
        nod_activo: activo,
      }
      return nodo ? updateNodo(nodo.nod_id, payload) : createNodo(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onClose()
    },
  })

  return (
    <Modal title={nodo ? 'Editar nodo' : 'Nuevo nodo'} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Humedal</label>
            <select
              className={inputClass}
              value={selHumedal}
              onChange={(e) => {
                setSelHumedal(e.target.value)
                setSelContenedor('')
              }}
            >
              {humedales.map((hum) => (
                <option key={hum.hum_id} value={hum.hum_id}>
                  {hum.hum_nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Contenedor (opcional)</label>
            <select
              className={inputClass}
              value={selContenedor}
              onChange={(e) => setSelContenedor(e.target.value)}
            >
              <option value="">Sin contenedor</option>
              {contenedoresFiltrados.map((contenedor) => (
                <option key={contenedor.con_id} value={contenedor.con_id}>
                  {contenedor.con_nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Código</label>
            <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={labelClass}>Ubicación</label>
          <input className={inputClass} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
        </div>
        <ActiveCheckbox checked={activo} onChange={setActivo} />
        <ErrorMessage error={mutation.error} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className={primaryButton}
            disabled={mutation.isPending || !nombre.trim() || !codigo.trim()}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SensorModal({
  nodoId,
  sensor,
  nodos,
  onClose,
}: {
  nodoId: number
  sensor?: Sensor
  nodos: Nodo[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selNodo, setSelNodo] = useState(String(sensor?.sen_nod_id ?? nodoId))
  const [tipo, setTipo] = useState(sensor?.sen_tipo ?? '')
  const [modelo, setModelo] = useState(sensor?.sen_modelo ?? '')
  const [unidad, setUnidad] = useState(sensor?.sen_unidad ?? '')
  const [fabricante, setFabricante] = useState(sensor?.sen_fabricante ?? '')
  const [numeroSerie, setNumeroSerie] = useState(sensor?.sen_numero_serie ?? '')
  const [fechaInstalacion, setFechaInstalacion] = useState(sensor?.sen_fecha_instalacion ?? '')
  const [activo, setActivo] = useState(sensor?.sen_activo ?? true)

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: SensorInput = {
        sen_nod_id: Number(selNodo),
        sen_tipo: tipo.trim(),
        sen_modelo: modelo.trim() || undefined,
        sen_unidad: unidad.trim() || undefined,
        sen_fabricante: fabricante.trim() || undefined,
        sen_numero_serie: numeroSerie.trim() || undefined,
        sen_fecha_instalacion: fechaInstalacion || undefined,
        sen_activo: activo,
      }
      return sensor ? updateSensor(sensor.sen_id, payload) : createSensor(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onClose()
    },
  })

  return (
    <Modal title={sensor ? 'Editar sensor' : 'Nuevo sensor'} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nodo</label>
            <select className={inputClass} value={selNodo} onChange={(e) => setSelNodo(e.target.value)}>
              {nodos.map((nodo) => (
                <option key={nodo.nod_id} value={nodo.nod_id}>
                  {nodo.nod_nombre} ({nodo.nod_codigo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <input className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Modelo</label>
            <input className={inputClass} value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Unidad</label>
            <input className={inputClass} value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Fabricante</label>
            <input className={inputClass} value={fabricante} onChange={(e) => setFabricante(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Número de serie</label>
            <input className={inputClass} value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Fecha de instalación</label>
          <input
            className={inputClass}
            type="date"
            value={fechaInstalacion}
            onChange={(e) => setFechaInstalacion(e.target.value)}
          />
        </div>
        <ActiveCheckbox checked={activo} onChange={setActivo} />
        <ErrorMessage error={mutation.error} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={primaryButton} disabled={mutation.isPending || !tipo.trim()}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SensorParametroRow({
  sensorId,
  link,
  parametro,
  onSaved,
}: {
  sensorId: number
  link: SensorParametro
  parametro?: Parametro
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [unidad, setUnidad] = useState(link.senpar_unidad)
  const [resolucion, setResolucion] = useState(link.senpar_resolucion?.toString() ?? '')
  const [minimo, setMinimo] = useState(link.senpar_minimo?.toString() ?? '')
  const [maximo, setMaximo] = useState(link.senpar_maximo?.toString() ?? '')
  const [activo, setActivo] = useState(link.senpar_activo ?? true)

  const mutation = useMutation({
    mutationFn: () =>
      updateSensorParametro(sensorId, link.senpar_id, {
        senpar_unidad: unidad.trim(),
        senpar_resolucion: toNumberOrNull(resolucion),
        senpar_minimo: toNumberOrNull(minimo),
        senpar_maximo: toNumberOrNull(maximo),
        senpar_activo: activo,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sensor-parametros', sensorId] })
      onSaved()
    },
  })

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {parametro?.par_nombre ?? `Parámetro #${link.senpar_par_id}`}
          </p>
          <p className="text-[11px] text-slate-400">
            {parametro?.par_codigo ?? ''} · {parametro?.par_unidad_ref ?? 'sin unidad de referencia'}
          </p>
        </div>
        <ActiveCheckbox checked={activo} onChange={setActivo} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Unidad</label>
          <input className={inputClass} value={unidad} onChange={(e) => setUnidad(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Resolución</label>
          <input className={inputClass} type="number" step="any" value={resolucion} onChange={(e) => setResolucion(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Mínimo</label>
          <input className={inputClass} type="number" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Máximo</label>
          <input className={inputClass} type="number" step="any" value={maximo} onChange={(e) => setMaximo(e.target.value)} />
        </div>
      </div>
      <ErrorMessage error={mutation.error} />
      <div className="flex justify-end">
        <button
          className={secondaryButton}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !unidad.trim()}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar umbrales'}
        </button>
      </div>
    </div>
  )
}

function SensorParametrosModal({
  sensor,
  parametros,
  onClose,
}: {
  sensor: Sensor
  parametros: Parametro[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [nuevoParId, setNuevoParId] = useState('')
  const [nuevaUnidad, setNuevaUnidad] = useState('')
  const [nuevaResolucion, setNuevaResolucion] = useState('')
  const [nuevoMinimo, setNuevoMinimo] = useState('')
  const [nuevoMaximo, setNuevoMaximo] = useState('')

  const linksQuery = useQuery<SensorParametro[]>({
    queryKey: ['sensor-parametros', sensor.sen_id],
    queryFn: () => fetchSensorParametros(sensor.sen_id),
    refetchInterval: 15000,
  })

  const links = linksQuery.data ?? []
  const yaVinculados = new Set(links.map((link) => link.senpar_par_id))
  const disponibles = parametros.filter((parametro) => !yaVinculados.has(parametro.par_id))

  const createMutation = useMutation({
    mutationFn: () =>
      createSensorParametro(sensor.sen_id, {
        senpar_par_id: Number(nuevoParId),
        senpar_unidad: nuevaUnidad.trim() || 'sin unidad',
        senpar_resolucion: toNumberOrNull(nuevaResolucion) ?? undefined,
        senpar_minimo: toNumberOrNull(nuevoMinimo) ?? undefined,
        senpar_maximo: toNumberOrNull(nuevoMaximo) ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sensor-parametros', sensor.sen_id] })
      setNuevoParId('')
      setNuevaUnidad('')
      setNuevaResolucion('')
      setNuevoMinimo('')
      setNuevoMaximo('')
    },
  })

  const seleccionarParametro = (value: string) => {
    setNuevoParId(value)
    const parametro = parametros.find((item) => item.par_id === Number(value))
    if (parametro) {
      setNuevaUnidad(parametro.par_unidad_ref ?? '')
      setNuevoMinimo(parametro.par_minimo?.toString() ?? '')
      setNuevoMaximo(parametro.par_maximo?.toString() ?? '')
    }
  }

  return (
    <Modal title={`Parámetros del sensor #${sensor.sen_id}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Configure la unidad, resolución y umbrales específicos del sensor. Estos rangos tienen
          prioridad sobre los rangos generales del parámetro al generar alertas.
        </p>

        {linksQuery.isLoading ? (
          <p className="text-sm text-slate-400">Cargando vínculos...</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-slate-500">Este sensor aún no tiene parámetros vinculados.</p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <SensorParametroRow
                key={link.senpar_id}
                sensorId={sensor.sen_id}
                link={link}
                parametro={parametros.find((parametro) => parametro.par_id === link.senpar_par_id)}
                onSaved={() => undefined}
              />
            ))}
          </div>
        )}

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-white">Vincular nuevo parámetro</h4>
          {parametros.length === 0 ? (
            <p className="text-xs text-slate-500">Cargando catálogo de parámetros...</p>
          ) : disponibles.length === 0 ? (
            <p className="text-xs text-slate-500">Todos los parámetros ya están vinculados.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Parámetro</label>
                  <select
                    className={inputClass}
                    value={nuevoParId}
                    onChange={(e) => seleccionarParametro(e.target.value)}
                  >
                    <option value="">Seleccionar parámetro</option>
                    {disponibles.map((parametro) => (
                      <option key={parametro.par_id} value={parametro.par_id}>
                        {parametro.par_nombre} ({parametro.par_codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Unidad</label>
                  <input className={inputClass} value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Resolución</label>
                  <input className={inputClass} type="number" step="any" value={nuevaResolucion} onChange={(e) => setNuevaResolucion(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Mínimo</label>
                  <input className={inputClass} type="number" step="any" value={nuevoMinimo} onChange={(e) => setNuevoMinimo(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Máximo</label>
                  <input className={inputClass} type="number" step="any" value={nuevoMaximo} onChange={(e) => setNuevoMaximo(e.target.value)} />
                </div>
              </div>
              <ErrorMessage error={createMutation.error} />
              <div className="flex justify-end">
                <button
                  className={primaryButton}
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !nuevoParId || !nuevaUnidad.trim()}
                >
                  <Plus className="w-4 h-4" />
                  {createMutation.isPending ? 'Vinculando...' : 'Vincular parámetro'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

// --------------------------------------------------------------------------- //
// Página principal
// --------------------------------------------------------------------------- //
export function HumedalesNodosPage() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canWrite = hasRole('Administrador', 'Investigador')
  const [modal, setModal] = useState<ModalState>(null)

  const humedalesQuery = useQuery<Humedal[]>({
    queryKey: ['estructura-humedales'],
    queryFn: fetchHumedales,
    refetchInterval: 15000,
  })
  const contenedoresQuery = useQuery<Contenedor[]>({
    queryKey: ['estructura-contenedores'],
    queryFn: () => fetchContenedores(),
    refetchInterval: 15000,
  })
  const nodosQuery = useQuery<Nodo[]>({
    queryKey: ['estructura-nodos'],
    queryFn: () => fetchNodos(),
    refetchInterval: 15000,
  })
  const sensoresQuery = useQuery<Sensor[]>({
    queryKey: ['sensores'],
    queryFn: () => fetchSensores(),
    refetchInterval: 15000,
  })
  const parametrosQuery = useQuery<Parametro[]>({
    queryKey: ['parametros'],
    queryFn: fetchParametros,
    refetchInterval: 30000,
  })

  const humedales = humedalesQuery.data ?? []
  const contenedores = contenedoresQuery.data ?? []
  const nodos = nodosQuery.data ?? []
  const sensores = sensoresQuery.data ?? []
  const parametros = parametrosQuery.data ?? []

  const queries = [humedalesQuery, contenedoresQuery, nodosQuery, sensoresQuery]
  const loading = queries.some((query) => query.isLoading)
  const isFetching = queries.some((query) => query.isFetching)
  const firstError = queries.map((query) => query.error).find(Boolean)

  const recargar = () => {
    void queryClient.invalidateQueries()
  }

  const nombreContenedor = (conId?: number) =>
    contenedores.find((contenedor) => contenedor.con_id === conId)?.con_nombre || 'Sin contenedor'

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Humedales y Nodos</h1>
          <p className="text-sm text-slate-400">
            Estructura física registrada, sensores y estado de los dispositivos de monitoreo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canWrite && (
            <button className={primaryButton} onClick={() => setModal({ kind: 'humedal' })}>
              <Plus className="w-4 h-4" />
              Nuevo Humedal
            </button>
          )}
          <button className={secondaryButton} onClick={recargar} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {firstError && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm">{firstError.message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-slate-400">Humedales</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{humedales.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-slate-400">Contenedores</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{contenedores.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-slate-400">Nodos</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{nodos.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-slate-400">Sensores</span>
            <SlidersHorizontal className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-pink-400">{sensores.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 bg-slate-800/40 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          Cargando estructura física...
        </div>
      ) : humedales.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl">
          <Network className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="font-medium text-slate-300">No hay humedales registrados.</p>
          <p className="text-xs text-slate-500 mt-1">
            {canWrite
              ? 'Crea el primer humedal para comenzar a registrar contenedores y nodos.'
              : 'Solicita a un administrador o investigador que registre la estructura.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {humedales.map((humedal) => {
            const contenedoresHumedal = contenedores.filter((c) => c.con_hum_id === humedal.hum_id)
            const nodosHumedal = nodos.filter((n) => n.nod_hum_id === humedal.hum_id)
            return (
              <section key={humedal.hum_id} className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Droplets className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-white">{humedal.hum_nombre}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${humedal.hum_activo !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {humedal.hum_activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{humedal.hum_descripcion || 'Sin descripción.'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {humedal.hum_ubicacion && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        {humedal.hum_ubicacion}
                      </div>
                    )}
                    {canWrite && (
                      <>
                        <button className={tinyButton} onClick={() => setModal({ kind: 'humedal', humedal })}>
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button
                          className={tinyButton}
                          onClick={() => setModal({ kind: 'contenedor', humedalId: humedal.hum_id })}
                        >
                          <Plus className="w-3 h-3" /> Contenedor
                        </button>
                        <button
                          className={tinyButton}
                          onClick={() => setModal({ kind: 'nodo', humedalId: humedal.hum_id })}
                        >
                          <Plus className="w-3 h-3" /> Nodo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Contenedores ({contenedoresHumedal.length})
                    </h3>
                    {contenedoresHumedal.length === 0 ? (
                      <p className="text-xs text-slate-500">Sin contenedores registrados.</p>
                    ) : (
                      <div className="space-y-2">
                        {contenedoresHumedal.map((contenedor) => (
                          <div key={contenedor.con_id} className="bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-sm text-white font-medium">{contenedor.con_nombre}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded ${contenedor.con_activo !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                                  {contenedor.con_activo !== false ? 'Activo' : 'Inactivo'}
                                </span>
                                {canWrite && (
                                  <button
                                    className={tinyButton}
                                    onClick={() =>
                                      setModal({
                                        kind: 'contenedor',
                                        humedalId: humedal.hum_id,
                                        contenedor,
                                      })
                                    }
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {contenedor.con_codigo || `ID #${contenedor.con_id}`} · Orden {contenedor.con_orden ?? '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      Nodos ({nodosHumedal.length})
                    </h3>
                    {nodosHumedal.length === 0 ? (
                      <p className="text-xs text-slate-500">Sin nodos registrados.</p>
                    ) : (
                      <div className="space-y-3">
                        {nodosHumedal.map((nodo) => {
                          const sensoresNodo = sensores.filter((sensor) => sensor.sen_nod_id === nodo.nod_id)
                          return (
                            <div key={nodo.nod_id} className="bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-sm text-white font-medium">{nodo.nod_nombre}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${nodo.nod_activo !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                                    {nodo.nod_activo !== false ? <CheckCircle2 className="w-3 h-3" /> : null}
                                    {nodo.nod_activo !== false ? 'Activo' : 'Inactivo'}
                                  </span>
                                  {canWrite && (
                                    <>
                                      <button
                                        className={tinyButton}
                                        onClick={() =>
                                          setModal({
                                            kind: 'nodo',
                                            humedalId: humedal.hum_id,
                                            nodo,
                                          })
                                        }
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        className={tinyButton}
                                        onClick={() => setModal({ kind: 'sensor', nodoId: nodo.nod_id })}
                                      >
                                        <Plus className="w-3 h-3" /> Sensor
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {nodo.nod_codigo || `Nodo #${nodo.nod_id}`} · {nombreContenedor(nodo.nod_con_id)}
                              </p>
                              {nodo.nod_ubicacion && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" /> {nodo.nod_ubicacion}
                                </p>
                              )}

                              <div className="mt-2 space-y-1.5">
                                {sensoresNodo.length === 0 ? (
                                  <p className="text-[11px] text-slate-600">Sin sensores registrados.</p>
                                ) : (
                                  sensoresNodo.map((sensor) => (
                                    <div
                                      key={sensor.sen_id}
                                      className="flex items-center justify-between gap-2 bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-slate-200 truncate">
                                          {sensor.sen_tipo}
                                          {sensor.sen_modelo ? ` · ${sensor.sen_modelo}` : ''}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                          {sensor.sen_unidad || 'sin unidad'} ·{' '}
                                          {sensor.sen_activo !== false ? 'activo' : 'inactivo'}
                                        </p>
                                      </div>
                                      {canWrite && (
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            className={tinyButton}
                                            onClick={() =>
                                              setModal({
                                                kind: 'sensor',
                                                nodoId: nodo.nod_id,
                                                sensor,
                                              })
                                            }
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                            className={tinyButton}
                                            onClick={() => setModal({ kind: 'sensor-params', sensor })}
                                          >
                                            <SlidersHorizontal className="w-3 h-3" /> Parámetros
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {modal?.kind === 'humedal' && (
        <HumedalModal humedal={modal.humedal} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'contenedor' && (
        <ContenedorModal
          humedalId={modal.humedalId}
          contenedor={modal.contenedor}
          humedales={humedales}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'nodo' && (
        <NodoModal
          humedalId={modal.humedalId}
          nodo={modal.nodo}
          humedales={humedales}
          contenedores={contenedores}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'sensor' && (
        <SensorModal
          nodoId={modal.nodoId}
          sensor={modal.sensor}
          nodos={nodos}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'sensor-params' && (
        <SensorParametrosModal
          sensor={modal.sensor}
          parametros={parametros}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default HumedalesNodosPage
