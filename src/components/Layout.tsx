import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  LogOut,
  FlaskConical,
  Activity,
  Newspaper,
  BarChart3,
  Wallet,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { useState, useRef, useEffect } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/strategies', icon: Settings, label: 'Strategies' },
  { to: '/trades', icon: Activity, label: 'Trades' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/backtest', icon: FlaskConical, label: 'Backtest' },
  { to: '/audit', icon: ScrollText, label: 'Audit Log' },
  { to: '/news', icon: Newspaper, label: 'News' },
]

const typeColor = (t: string) => {
  switch (t) {
    case 'paper': return 'text-amber-400'
    case 'demo': return 'text-blue-400'
    case 'live': return 'text-green-400'
    default: return 'text-surface-400'
  }
}

const typeBg = (t: string) => {
  switch (t) {
    case 'paper': return 'bg-amber-500/10'
    case 'demo': return 'bg-blue-500/10'
    case 'live': return 'bg-green-500/10'
    default: return 'bg-surface-800'
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const { accounts, activeAccount, switchAccount } = useAccount()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-full overflow-hidden">
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
          {activeAccount && (
            <div ref={ref} className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm bg-surface-200 hover:bg-surface-300 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Wallet size={14} className={typeColor(activeAccount.type)} />
                  <span className="truncate text-surface-500">{activeAccount.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeBg(activeAccount.type)} ${typeColor(activeAccount.type)}`}>
                    {activeAccount.type.toUpperCase()}
                  </span>
                </div>
                <ChevronDown size={14} className="shrink-0 text-surface-400" />
              </button>

              {open && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-surface-200 border border-surface-200 rounded-lg shadow-xl overflow-hidden z-50">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => { switchAccount(acc.id); setOpen(false) }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                        acc.id === activeAccount.id
                          ? 'bg-brand-500/10 text-brand-400'
                          : 'text-surface-400 hover:bg-surface-300 hover:text-surface-600'
                      }`}
                    >
                      <Wallet size={14} className={typeColor(acc.type)} />
                      <span className="truncate flex-1">{acc.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeBg(acc.type)} ${typeColor(acc.type)}`}>
                        {acc.type.toUpperCase()}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-surface-200">
                    <button
                      onClick={() => { setOpen(false); navigate('/accounts') }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-400 hover:bg-surface-300 hover:text-surface-600 transition-colors"
                    >
                      <Settings size={14} />
                      Manage Accounts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-surface-400 hover:bg-surface-200 hover:text-surface-600 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
