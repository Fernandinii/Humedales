import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  Plus,
  RefreshCw,
  Save,
  Server,
  Shield,
  Users,
} from 'lucide-react'
import {
  createUsuario,
  fetchParametros,
  fetchRoles,
  fetchUsuarios,
  updateParametro,
  updateUsuario,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Parametro, Rol, Usuario, UsuarioCreateInput } from '../types'

const inputClass =
  'w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 transition-colors disabled:opacity-60'
const labelClass = 'block text-xs font-medium text-slate-400 mb-1'
const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50'
const secondaryButton =
  'inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-50'

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function ErrorMessage({ error }: { error: Error | null }) {
  if (!error) return null
  return (
    <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {error.message}
    </div>
  )
}

function ParametroRow({
  parametro,
  canEdit,
}: {
  parametro: Parametro
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [unidad, setUnidad] = useState(parametro.par_unidad_ref ?? '')
  const [minimo, setMinimo] = useState(parametro.par_minimo?.toString() ?? '')
  const [maximo, setMaximo] = useState(parametro.par_maximo?.toString() ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      updateParametro(parametro.par_id, {
        par_unidad_ref: unidad.trim() || null,
        par_minimo: toNumberOrNull(minimo),
        par_maximo: toNumberOrNull(maximo),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parametros'] })
    },
  })

  return (
    <tr className="border-b border-slate-800/60 last:border-0">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white">{parametro.par_nombre}</p>
        <p className="text-[11px] text-slate-500">{parametro.par_codigo}</p>
        {mutation.error && (
          <div className="mt-2">
            <ErrorMessage error={mutation.error} />
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <input
          className={inputClass}
          value={unidad}
          disabled={!canEdit}
          onChange={(event) => setUnidad(event.target.value)}
          placeholder="sin unidad"
        />
      </td>
      <td className="px-4 py-3">
        <input
          className={inputClass}
          type="number"
          step="any"
          value={minimo}
          disabled={!canEdit}
          onChange={(event) => setMinimo(event.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <input
          className={inputClass}
          type="number"
          step="any"
          value={maximo}
          disabled={!canEdit}
          onChange={(event) => setMaximo(event.target.value)}
        />
      </td>
      <td className="px-4 py-3 text-right">
        {canEdit ? (
          <button
            className={secondaryButton}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        ) : (
          <span className="text-[11px] text-slate-500">Solo lectura</span>
        )}
      </td>
    </tr>
  )
}

function UsuarioRow({ usuario, roles }: { usuario: Usuario; roles: Rol[] }) {
  const queryClient = useQueryClient()
  const [rolId, setRolId] = useState(String(usuario.usr_rol_id ?? ''))
  const [activo, setActivo] = useState(usuario.usr_activo ?? true)

  const mutation = useMutation({
    mutationFn: () =>
      updateUsuario(usuario.usr_id, {
        usr_rol_id: Number(rolId),
        usr_activo: activo,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  return (
    <tr className="border-b border-slate-800/60 last:border-0">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white">
          {usuario.usr_nombre} {usuario.usr_apellido ?? ''}
        </p>
        <p className="text-[11px] text-slate-500">{usuario.usr_correo}</p>
        {mutation.error && (
          <div className="mt-2">
            <ErrorMessage error={mutation.error} />
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <select className={inputClass} value={rolId} onChange={(event) => setRolId(event.target.value)}>
          {roles.map((rol) => (
            <option key={rol.rol_id} value={rol.rol_id}>
              {rol.rol_nombre}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={activo}
            onChange={(event) => setActivo(event.target.checked)}
            className="w-4 h-4 accent-cyan-500"
          />
          {activo ? 'Activo' : 'Inactivo'}
        </label>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          className={secondaryButton}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !rolId}
        >
          <Save className="w-3.5 h-3.5" />
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </td>
    </tr>
  )
}

function NuevoUsuarioForm({ roles }: { roles: Rol[] }) {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState(roles[0] ? String(roles[0].rol_id) : '')

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UsuarioCreateInput = {
        usr_rol_id: Number(rolId),
        usr_nombre: nombre.trim(),
        usr_apellido: apellido.trim() || undefined,
        usr_correo: correo.trim(),
        usr_password: password,
        usr_activo: true,
      }
      return createUsuario(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setNombre('')
      setApellido('')
      setCorreo('')
      setPassword('')
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form onSubmit={submit} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Plus className="w-4 h-4 text-cyan-400" />
        Nuevo usuario
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Apellido</label>
          <input className={inputClass} value={apellido} onChange={(e) => setApellido(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Correo</label>
          <input
            className={inputClass}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Contraseña (mín. 8 caracteres)</label>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Rol</label>
          <select className={inputClass} value={rolId} onChange={(e) => setRolId(e.target.value)}>
            {roles.map((rol) => (
              <option key={rol.rol_id} value={rol.rol_id}>
                {rol.rol_nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ErrorMessage error={mutation.error} />
      {mutation.isSuccess && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Usuario creado correctamente.
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className={primaryButton}
          disabled={mutation.isPending || !nombre.trim() || !correo.trim() || password.length < 8 || !rolId}
        >
          <Plus className="w-4 h-4" />
          {mutation.isPending ? 'Creando...' : 'Crear usuario'}
        </button>
      </div>
    </form>
  )
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('Administrador')
  const canEditParams = hasRole('Administrador', 'Investigador')

  const parametrosQuery = useQuery<Parametro[]>({
    queryKey: ['parametros'],
    queryFn: fetchParametros,
    refetchInterval: 15000,
  })
  const rolesQuery = useQuery<Rol[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: isAdmin,
  })
  const usuariosQuery = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios,
    enabled: isAdmin,
    refetchInterval: 15000,
  })

  const parametros = parametrosQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const usuarios = usuariosQuery.data ?? []

  const recargar = () => {
    void queryClient.invalidateQueries()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Configuración del Sistema</h1>
          <p className="text-sm text-slate-400">
            Rangos de alerta, administración de usuarios y parámetros generales de la plataforma
          </p>
        </div>
        <button className={secondaryButton} onClick={recargar}>
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Servidor Backend FastAPI</h3>
              <p className="text-xs text-slate-400">Estado de la API REST</p>
            </div>
          </div>
          <div className="space-y-2 text-sm pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Endpoint Base:</span>
              <span className="text-cyan-400 font-mono">http://localhost:8000/api/v1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Autenticación:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <Shield className="w-4 h-4" /> JWT + RBAC
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Versión API:</span>
              <span className="text-slate-200">1.0.0</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Base de Datos PostgreSQL</h3>
              <p className="text-xs text-slate-400">Instancia humedales_db</p>
            </div>
          </div>
          <div className="space-y-2 text-sm pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Host / Puerto:</span>
              <span className="text-emerald-400 font-mono">localhost:5433</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Parámetros:</span>
              <span className="text-slate-200">{parametros.length} registrados</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Esquema:</span>
              <span className="text-slate-200">Sin alteraciones estructurales</span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Rangos de alerta por parámetro
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estos rangos se usan cuando el nodo no tiene un sensor específico configurado.
            </p>
          </div>
          {!canEditParams && (
            <span className="text-[11px] text-slate-500 self-start">Solo lectura para su rol</span>
          )}
        </div>

        {parametrosQuery.isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
            Cargando parámetros...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800/80 text-[11px] uppercase text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3">Parámetro</th>
                  <th className="px-4 py-3 w-36">Unidad</th>
                  <th className="px-4 py-3 w-36">Mínimo</th>
                  <th className="px-4 py-3 w-36">Máximo</th>
                  <th className="px-4 py-3 w-28 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {parametros.map((parametro) => (
                  <ParametroRow key={parametro.par_id} parametro={parametro} canEdit={canEditParams} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Administración de usuarios
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cree usuarios y asigne perfiles de acceso. Solo visible para Administrador.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {roles.map((rol) => (
                  <span
                    key={rol.rol_id}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300"
                  >
                    {rol.rol_nombre}
                    {rol.rol_descripcion ? ` · ${rol.rol_descripcion}` : ''}
                  </span>
                ))}
              </div>
            )}

            {roles.length > 0 ? (
              <NuevoUsuarioForm roles={roles} />
            ) : (
              <p className="text-sm text-slate-500">Cargando roles disponibles...</p>
            )}

            {usuariosQuery.isLoading ? (
              <p className="text-sm text-slate-400">Cargando usuarios...</p>
            ) : usuarios.length === 0 ? (
              <p className="text-sm text-slate-500">No hay usuarios registrados.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/80 text-[11px] uppercase text-slate-400 border-b border-slate-700/60">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3 w-48">Rol</th>
                      <th className="px-4 py-3 w-28">Estado</th>
                      <th className="px-4 py-3 w-28 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario) => (
                      <UsuarioRow key={usuario.usr_id} usuario={usuario} roles={roles} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default ConfiguracionPage
