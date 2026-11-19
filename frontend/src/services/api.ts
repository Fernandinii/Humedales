import type {
  Alerta,
  Contenedor,
  ContenedorInput,
  ContenedorPatch,
  DashboardResumen,
  DetalleLectura,
  EntrenarMLInput,
  EntrenarMLResponse,
  HealthResponse,
  Humedal,
  HumedalInput,
  HumedalPatch,
  Lectura,
  LoginResponse,
  ModeloML,
  Nodo,
  NodoInput,
  NodoPatch,
  Parametro,
  ParametroPatch,
  PrediccionLectura,
  Rol,
  Sensor,
  SensorInput,
  SensorParametro,
  SensorParametroInput,
  SensorParametroPatch,
  SensorPatch,
  Usuario,
  UsuarioCreateInput,
  UsuarioPatch,
} from '../types'

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000/api/v1'

export const AUTH_TOKEN_KEY = 'humedales_token'
export const AUTH_USER_KEY = 'humedales_user'

function getStoredToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') {
      return data.detail
    }
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item: { msg?: string }) => item.msg || 'Dato inválido')
        .join(', ')
    }
  } catch {
    // Ignore JSON parsing errors and fall back to a generic message.
  }
  return `Error ${response.status} al comunicarse con la API`
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getStoredToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    throw new Error(await parseError(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

function jsonBody(payload: unknown): string {
  return JSON.stringify(payload)
}

// --------------------------------------------------------------------------- //
// Autenticación
// --------------------------------------------------------------------------- //
export async function login(correo: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: jsonBody({ correo, password }),
  })
}

export async function fetchMe(): Promise<Usuario> {
  return apiFetch<Usuario>('/auth/me')
}

// --------------------------------------------------------------------------- //
// Consultas
// --------------------------------------------------------------------------- //
export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health')
}

export async function fetchDashboardResumen(): Promise<DashboardResumen> {
  return apiFetch<DashboardResumen>('/dashboard/resumen')
}

export async function fetchHumedales(): Promise<Humedal[]> {
  return apiFetch<Humedal[]>('/humedales')
}

export async function fetchContenedores(humId?: number): Promise<Contenedor[]> {
  const query = humId ? `?hum_id=${humId}` : ''
  return apiFetch<Contenedor[]>(`/contenedores${query}`)
}

export async function fetchNodos(humId?: number, conId?: number): Promise<Nodo[]> {
  const params = new URLSearchParams()
  if (humId) params.append('hum_id', humId.toString())
  if (conId) params.append('con_id', conId.toString())
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<Nodo[]>(`/nodos${query}`)
}

export async function fetchMediciones(limit = 50, nodId?: number): Promise<Lectura[]> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (nodId) params.append('nod_id', nodId.toString())
  return apiFetch<Lectura[]>(`/mediciones?${params.toString()}`)
}

export async function fetchMedicionesGraficas(
  nodId?: number,
  limit = 100,
): Promise<Lectura[]> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (nodId) params.append('nod_id', nodId.toString())
  return apiFetch<Lectura[]>(`/mediciones/graficas?${params.toString()}`)
}

export async function fetchParametros(): Promise<Parametro[]> {
  return apiFetch<Parametro[]>('/parametros')
}

export async function fetchMedicionesDetalle(
  limit = 100,
  parId?: number,
  nodId?: number,
): Promise<DetalleLectura[]> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (parId) params.append('par_id', parId.toString())
  if (nodId) params.append('nod_id', nodId.toString())
  return apiFetch<DetalleLectura[]>(`/mediciones/detalle?${params.toString()}`)
}

export async function fetchAlertas(estado?: string): Promise<Alerta[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''
  return apiFetch<Alerta[]>(`/alertas${query}`)
}

export async function atenderAlerta(aleId: number): Promise<Alerta> {
  return apiFetch<Alerta>(`/alertas/${aleId}/atender`, { method: 'PATCH' })
}

// --------------------------------------------------------------------------- //
// Humedales
// --------------------------------------------------------------------------- //
export async function createHumedal(payload: HumedalInput): Promise<Humedal> {
  return apiFetch<Humedal>('/humedales', { method: 'POST', body: jsonBody(payload) })
}

export async function updateHumedal(humId: number, payload: HumedalPatch): Promise<Humedal> {
  return apiFetch<Humedal>(`/humedales/${humId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

// --------------------------------------------------------------------------- //
// Contenedores
// --------------------------------------------------------------------------- //
export async function createContenedor(payload: ContenedorInput): Promise<Contenedor> {
  return apiFetch<Contenedor>('/contenedores', {
    method: 'POST',
    body: jsonBody(payload),
  })
}

export async function updateContenedor(
  conId: number,
  payload: ContenedorPatch,
): Promise<Contenedor> {
  return apiFetch<Contenedor>(`/contenedores/${conId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

// --------------------------------------------------------------------------- //
// Nodos
// --------------------------------------------------------------------------- //
export async function createNodo(payload: NodoInput): Promise<Nodo> {
  return apiFetch<Nodo>('/nodos', { method: 'POST', body: jsonBody(payload) })
}

export async function updateNodo(nodId: number, payload: NodoPatch): Promise<Nodo> {
  return apiFetch<Nodo>(`/nodos/${nodId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

// --------------------------------------------------------------------------- //
// Sensores
// --------------------------------------------------------------------------- //
export async function fetchSensores(nodId?: number): Promise<Sensor[]> {
  const query = nodId ? `?nod_id=${nodId}` : ''
  return apiFetch<Sensor[]>(`/sensores${query}`)
}

export async function createSensor(payload: SensorInput): Promise<Sensor> {
  return apiFetch<Sensor>('/sensores', { method: 'POST', body: jsonBody(payload) })
}

export async function updateSensor(senId: number, payload: SensorPatch): Promise<Sensor> {
  return apiFetch<Sensor>(`/sensores/${senId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

export async function fetchSensorParametros(senId: number): Promise<SensorParametro[]> {
  return apiFetch<SensorParametro[]>(`/sensores/${senId}/parametros`)
}

export async function createSensorParametro(
  senId: number,
  payload: SensorParametroInput,
): Promise<SensorParametro> {
  return apiFetch<SensorParametro>(`/sensores/${senId}/parametros`, {
    method: 'POST',
    body: jsonBody(payload),
  })
}

export async function updateSensorParametro(
  senId: number,
  senparId: number,
  payload: SensorParametroPatch,
): Promise<SensorParametro> {
  return apiFetch<SensorParametro>(`/sensores/${senId}/parametros/${senparId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

// --------------------------------------------------------------------------- //
// Parámetros
// --------------------------------------------------------------------------- //
export async function updateParametro(
  parId: number,
  payload: ParametroPatch,
): Promise<Parametro> {
  return apiFetch<Parametro>(`/parametros/${parId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

// --------------------------------------------------------------------------- //
// Usuarios y roles
// --------------------------------------------------------------------------- //
export async function fetchRoles(): Promise<Rol[]> {
  return apiFetch<Rol[]>('/roles')
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  return apiFetch<Usuario[]>('/usuarios')
}

export async function createUsuario(payload: UsuarioCreateInput): Promise<Usuario> {
  return apiFetch<Usuario>('/usuarios', { method: 'POST', body: jsonBody(payload) })
}

export async function updateUsuario(usrId: number, payload: UsuarioPatch): Promise<Usuario> {
  return apiFetch<Usuario>(`/usuarios/${usrId}`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

// --------------------------------------------------------------------------- //
// Análisis predictivo (Machine Learning)
// --------------------------------------------------------------------------- //
export async function fetchModelosML(): Promise<ModeloML[]> {
  return apiFetch<ModeloML[]>('/ml/modelos')
}

export async function entrenarML(payload: EntrenarMLInput): Promise<EntrenarMLResponse> {
  return apiFetch<EntrenarMLResponse>('/ml/entrenar', {
    method: 'POST',
    body: jsonBody(payload),
  })
}

export async function fetchPrediccionesML(
  nodId?: number,
  parametro?: string,
  limit = 100,
): Promise<PrediccionLectura[]> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (nodId) params.append('nod_id', nodId.toString())
  if (parametro) params.append('parametro', parametro)
  return apiFetch<PrediccionLectura[]>(`/ml/predicciones?${params.toString()}`)
}
