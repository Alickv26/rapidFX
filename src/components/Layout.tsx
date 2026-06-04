import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  LogOut,
  FlaskConical,
  Activity,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePaperMode } from '../contexts/PaperModeContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/strategies', icon: Settings, label: 'Strategies' },
  { to: '/trades', icon: Activity, label: 'Trades' },
  { to: '/backtest', icon: FlaskConical, label: 'Backtest' },
  { to: '/audit', icon: ScrollText, label: 'Audit Log' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const { paperMode, togglePaperMode } = usePaperMode()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 bg-surface-100 border-r border-surface-200 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-surface-200">
          <h1 className="text-xl font-bold text-brand-400">RapidFX</h1>
          <p className="text-xs text-surface-400 mt-1">Trading Bot</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-surface-400 hover:bg-surface-200 hover:text-surface-600'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-surface-200 space-y-3">
          <button
            onClick={togglePaperMode}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              paperMode
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-surface-200 text-surface-400'
            }`}
          >
            <FlaskConical size={16} />
            {paperMode ? 'Paper Trading' : 'Live Trading'}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-surface-400 hover:bg-surface-200 hover:text-surface-600 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
