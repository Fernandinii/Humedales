import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Droplets,
  LayoutDashboard,
  History,
  TrendingUp,
  Bell,
  Network,
  Settings,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/historial', label: 'Historial de Mediciones', icon: History },
    { to: '/predictivo', label: 'Análisis Predictivo', icon: TrendingUp },
    { to: '/alertas', label: 'Alertas', icon: Bell },
    { to: '/estructura', label: 'Humedales y Nodos', icon: Network },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Droplets className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-white">Humedales Web</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 cursor-pointer"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6">
          <div className="hidden md:flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Droplets className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Humedales Web</h2>
              <p className="text-[11px] text-slate-400">ITVH / Lab Ambiental</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">
              <UserCircle className="w-5 h-5" />
            </div>
            <div className="text-xs truncate">
              <p className="font-medium text-white truncate">
                {user?.usr_nombre} {user?.usr_apellido ?? ''}
              </p>
              <p className="text-[10px] text-cyan-400 truncate">
                {user?.rol_nombre ?? 'Sin rol'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>

          <div className="flex items-center gap-2 px-3 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            PostgreSQL 18.4 | FastAPI
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  )
}
export default MainLayout
