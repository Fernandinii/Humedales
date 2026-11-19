export interface HealthResponse {
  status: string
  api_version: string
  database_status: string
}

export interface Humedal {
  hum_id: number
  hum_nombre: string
  hum_descripcion?: string
  hum_ubicacion?: string
  hum_latitud?: number
  hum_longitud?: number
  hum_activo?: boolean
  hum_creado_at?: string
}

export interface Contenedor {
  con_id: number
  con_hum_id?: number
  con_codigo?: string
  con_nombre: string
  con_descripcion?: string
  con_orden?: number
  con_activo?: boolean
  con_creado_at?: string
}

export interface Nodo {
  nod_id: number
  nod_hum_id?: number
  nod_nombre: string
  nod_codigo?: string
  nod_ubicacion?: string
  nod_activo?: boolean
  nod_creado_at?: string
  nod_con_id?: number
}

export interface Lectura {
  lec_id: number
  lec_nod_id?: number
  lec_ph?: number
  lec_temperatura?: number
  lec_turbidez?: number
  lec_tds_ppm?: number
  lec_conductividad_us_cm?: number
  lec_fecha_hora?: string
  lec_recibido_at?: string
  lec_id_paquete?: string
  lec_payload_original?: Record<string, unknown> | null
  lec_rssi?: number
  lec_secuencia?: number
}

export interface DashboardResumen {
  total_mediciones: number
}

export interface Parametro {
  par_id: number
  par_codigo: string
  par_nombre: string
  par_descripcion?: string
  par_tipo_valor?: string
  par_unidad_ref?: string
  par_origen?: string
  par_minimo?: number
  par_maximo?: number
  par_activo?: boolean
}

export interface DetalleLectura {
  det_id: number
  det_lec_id: number
  det_par_id: number
  det_valor_num?: number
  det_valor_texto?: string
  det_valor_booleano?: boolean
  det_unidad?: string
  det_estado?: string
  det_creado_at?: string
  parametro_nombre?: string
  parametro_codigo?: string
}

export interface Alerta {
  ale_id: number
  ale_nod_id?: number
  ale_lectura_id?: number
  ale_tipo?: string
  ale_severidad?: string
  ale_titulo: string
  ale_descripcion?: string
  ale_generada_at?: string
  ale_atendida_at?: string
  ale_estado?: string
}

export interface Rol {
  rol_id: number
  rol_nombre: string
  rol_descripcion?: string
  rol_activo?: boolean
}

export interface Usuario {
  usr_id: number
  usr_rol_id?: number
  usr_nombre: string
  usr_apellido?: string
  usr_correo: string
  usr_activo?: boolean
  usr_creado_at?: string
  rol_nombre?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  usuario: Usuario
}

export interface Sensor {
  sen_id: number
  sen_nod_id: number
  sen_tipo: string
  sen_modelo?: string
  sen_unidad?: string
  sen_fecha_instalacion?: string
  sen_activo?: boolean
  sen_fabricante?: string
  sen_numero_serie?: string
  sen_configuracion?: Record<string, unknown>
}

export interface SensorParametro {
  senpar_id: number
  senpar_sen_id: number
  senpar_par_id: number
  senpar_unidad: string
  senpar_resolucion?: number
  senpar_minimo?: number
  senpar_maximo?: number
  senpar_config?: Record<string, unknown>
  senpar_activo?: boolean
}

export interface HumedalInput {
  hum_nombre: string
  hum_descripcion?: string
  hum_ubicacion?: string
  hum_latitud?: number
  hum_longitud?: number
  hum_activo?: boolean
}

export type HumedalPatch = Partial<HumedalInput>

export interface ContenedorInput {
  con_hum_id: number
  con_codigo: string
  con_nombre: string
  con_descripcion?: string
  con_orden?: number
  con_activo?: boolean
}

export type ContenedorPatch = Partial<ContenedorInput>

export interface NodoInput {
  nod_hum_id: number
  nod_nombre: string
  nod_codigo: string
  nod_ubicacion?: string
  nod_con_id?: number
  nod_activo?: boolean
}

export type NodoPatch = Partial<NodoInput>

export interface SensorInput {
  sen_nod_id: number
  sen_tipo: string
  sen_modelo?: string
  sen_unidad?: string
  sen_fecha_instalacion?: string
  sen_activo?: boolean
  sen_fabricante?: string
  sen_numero_serie?: string
  sen_configuracion?: Record<string, unknown>
}

export type SensorPatch = Partial<SensorInput>

export interface SensorParametroInput {
  senpar_par_id: number
  senpar_unidad: string
  senpar_resolucion?: number
  senpar_minimo?: number
  senpar_maximo?: number
  senpar_config?: Record<string, unknown>
  senpar_activo?: boolean
}

export interface SensorParametroPatch {
  senpar_unidad?: string
  senpar_resolucion?: number | null
  senpar_minimo?: number | null
  senpar_maximo?: number | null
  senpar_config?: Record<string, unknown>
  senpar_activo?: boolean
}

export interface UsuarioCreateInput {
  usr_rol_id: number
  usr_nombre: string
  usr_apellido?: string
  usr_correo: string
  usr_password: string
  usr_activo?: boolean
}

export interface UsuarioPatch {
  usr_rol_id?: number
  usr_nombre?: string
  usr_apellido?: string
  usr_password?: string
  usr_activo?: boolean
}

export interface ParametroPatch {
  par_minimo?: number | null
  par_maximo?: number | null
  par_unidad_ref?: string | null
}

export interface ModeloML {
  mod_id: number
  mod_nombre: string
  mod_version: string
  mod_descripcion?: string
  mod_algoritmo?: string
  mod_ruta_archivo?: string
  mod_entrenado_at?: string
  mod_activo: boolean
  mod_creado_at: string
}

export interface PrediccionLectura {
  pre_id: number
  pre_nod_id: number
  pre_mod_id: number
  pre_lectura_ref_id?: number
  pre_parametro: string
  pre_valor_predicho: number
  pre_unidad?: string
  pre_fecha_objetivo?: string
  pre_generado_at: string
  pre_confianza?: number
}

export interface EntrenamientoResultado {
  parametro: string
  parametro_nombre?: string
  estado: string
  mensaje?: string
  modelo_id?: number
  modelo_nombre?: string
  modelo_version?: string
  algoritmo?: string
  r2?: number
  intervalo_segundos?: number
  predicciones: number
  alertas: number
  confianza_promedio?: number
}

export interface EntrenarMLInput {
  nod_id: number
  parametros?: string[]
  horizonte?: number
}

export interface EntrenarMLResponse {
  nodo_id: number
  nodo_codigo?: string
  modelos_entrenados: number
  predicciones_generadas: number
  alertas_generadas: number
  resultados: EntrenamientoResultado[]
}
