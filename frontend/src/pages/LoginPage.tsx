import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Droplets, Lock, LogIn, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(correo.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 mb-4">
            <Droplets className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white">Humedales Web</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistema de Gestión e Interpretación de Calidad del Agua
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="correo">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="usuario@itvh.edu.mx"
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500 mt-6">
          Acceso inicial: <span className="text-slate-400">admin@itvh.edu.mx</span> /{' '}
          <span className="text-slate-400">Admin1234!</span>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
