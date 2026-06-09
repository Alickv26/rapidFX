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
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { InstallPrompt } from './InstallPrompt'
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

const primaryNav = navItems.slice(0, 4)

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const NavLinkItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-brand-500/10 text-brand-400'
            : 'text-surface-400 hover:bg-surface-200 hover:text-surface-600'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden md:flex w-64 shrink-0 bg-surface-100 border-r border-surface-200 flex-col overflow-y-auto">
        <div className="p-6 border-b border-surface-200">
          <h1 className="text-xl font-bold text-brand-400">RapidFX</h1>
          <p className="text-xs text-surface-400 mt-1">Trading Bot</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLinkItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-4 border-t border-surface-200 space-y-3">
          {activeAccount && (
            <div ref={accountRef} className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
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

              {accountOpen && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-surface-200 border border-surface-200 rounded-lg shadow-xl overflow-hidden z-50">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => { switchAccount(acc.id); setAccountOpen(false) }}
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
                      onClick={() => { setAccountOpen(false); navigate('/accounts') }}
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

      {/* ─── Mobile Layout ─── */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        {/* Mobile Top Bar */}
        <header className="h-14 shrink-0 bg-surface-100 border-b border-surface-200 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
          <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2 text-surface-400 hover:text-surface-200">
            <Menu size={20} />
          </button>
          <h1 className="text-base font-bold text-brand-400">RapidFX</h1>
          {activeAccount && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeBg(activeAccount.type)} ${typeColor(activeAccount.type)}`}>
              {activeAccount.type.toUpperCase()}
            </span>
          )}
        </header>

        {/* Mobile Slide-up Drawer (Bottom Sheet) */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <aside className="relative w-full max-h-[70vh] bg-surface-100 rounded-t-2xl flex flex-col overflow-y-auto animate-slide-up">
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-surface-400/50" />
              </div>

              <div className="px-4 pb-2 flex items-center justify-between">
                <h1 className="text-lg font-bold text-brand-400">RapidFX</h1>
                <button onClick={() => setDrawerOpen(false)} className="p-1 text-surface-400 hover:text-surface-200">
                  <X size={20} />
                </button>
              </div>

              <nav className="px-4 space-y-1">
                {navItems.map((item) => (
                  <NavLinkItem key={item.to} {...item} onClick={() => setDrawerOpen(false)} />
                ))}
              </nav>

              <div className="p-4 mt-2 border-t border-surface-200 space-y-3">
                {activeAccount && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setMobileAccountOpen(!mobileAccountOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm bg-surface-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Wallet size={14} className={typeColor(activeAccount.type)} />
                        <span className="truncate text-surface-500">{activeAccount.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeBg(activeAccount.type)} ${typeColor(activeAccount.type)}`}>
                          {activeAccount.type.toUpperCase()}
                        </span>
                      </div>
                    </button>
                    {mobileAccountOpen && accounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => { switchAccount(acc.id); setMobileAccountOpen(false) }}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                          acc.id === activeAccount.id
                            ? 'bg-brand-500/10 text-brand-400'
                            : 'text-surface-400 hover:bg-surface-300'
                        }`}
                      >
                        <Wallet size={14} className={typeColor(acc.type)} />
                        <span className="truncate flex-1">{acc.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeBg(acc.type)} ${typeColor(acc.type)}`}>
                          {acc.type.toUpperCase()}
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setDrawerOpen(false); navigate('/accounts') }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-400 hover:bg-surface-300 rounded-lg"
                    >
                      <Settings size={14} />
                      Manage Accounts
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-surface-400 hover:bg-surface-200 transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>

              <div className="h-4 shrink-0" />
            </aside>
          </div>
        )}

        {/* Mobile Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="h-16 shrink-0 bg-surface-100 border-t border-surface-200 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 ${
                  isActive ? 'text-brand-400' : 'text-surface-400'
                }`
              }
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          {/* "More" button opens drawer */}
          <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1 text-surface-400 min-w-0">
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </nav>
      </div>

      {/* ─── Desktop Content (hidden on mobile) ─── */}
      <main className="hidden md:block flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>

      <InstallPrompt />
    </div>
  )
}
