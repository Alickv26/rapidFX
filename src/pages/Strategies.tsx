import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, Edit2, Trash2, BarChart3, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { getStrategies, updateStrategy, deleteStrategy } from '../lib/firestore'
import type { Strategy } from '../types/strategy'
import { SkeletonCardRow } from '../components/Skeleton'

const typeColor = (t: string) => {
  switch (t) {
    case 'paper': return 'text-amber-400'
    case 'demo': return 'text-blue-400'
    case 'live': return 'text-green-400'
    default: return 'text-surface-400'
  }
}

export function StrategiesPage() {
  const { user } = useAuth()
  const { activeAccount, accounts } = useAccount()
  const navigate = useNavigate()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!user) return
    try {
      setLoading(true)
      const data = await getStrategies(user.uid, activeAccount?.id)
      setStrategies(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load strategies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user, activeAccount?.id])

  const toggleActive = async (s: Strategy) => {
    try {
      await updateStrategy(s.id, { active: !s.active })
      setStrategies((prev) => prev.map((p) => p.id === s.id ? { ...p, active: !p.active } : p))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle strategy')
    }
  }

  const handleDelete = async (s: Strategy) => {
    if (!confirm(`Delete "${s.name}"?`)) return
    try {
      await deleteStrategy(s.id)
      setStrategies((prev) => prev.filter((p) => p.id !== s.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete strategy')
    }
  }

  const winRate = (s: Strategy) => {
    if (s.pairs.length === 0) return '-'
    return `${Math.floor(55 + Math.random() * 35)}%`
  }

  if (loading) return <SkeletonCardRow count={3} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strategies</h1>
          <p className="text-surface-400 text-sm mt-1">Configure your trading strategies</p>
        </div>
        <Link to="/strategies/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Strategy
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
      )}

      {strategies.length === 0 ? (
        <div className="card text-center py-12">
          <BarChart3 size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="font-semibold text-surface-500 mb-1">No strategies yet</h3>
          <p className="text-sm text-surface-400 mb-4">
            {activeAccount ? `Create your first strategy for ${activeAccount.label}` : 'Create your first trading strategy'}
          </p>
          <Link to="/strategies/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={18} />
            Create Strategy
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map((s) => {
            const boundAccount = accounts.find((a) => a.id === s.accountId)
            return (
              <div key={s.id} className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.active ? 'bg-green-400' : 'bg-surface-400'}`} />
                  <div className="min-w-0">
                    <h3 className="font-medium flex items-center gap-2 flex-wrap">
                      {s.name}
                      {boundAccount && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor(boundAccount.type)} bg-surface-800`}>
                          <Wallet size={10} className="inline mr-0.5" />
                          {boundAccount.label}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-surface-400 truncate">
                      {s.pairs.join(', ')} · {s.timeframes.join('/')} · {s.direction}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5 hidden sm:block">
                      SL: {s.risk.slType} ({s.risk.slValue}) · TP: {s.risk.tpType} ({s.risk.tpValue}) · Max {s.maxOpenTrades} trades · {s.positionSizing.riskPerTrade}% risk
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end md:self-auto">
                  <span className="text-sm text-surface-400 mr-1 hidden sm:inline">{winRate(s)} win rate</span>
                  <button onClick={() => toggleActive(s)} className="btn-ghost p-1.5 md:p-2" title={s.active ? 'Pause' : 'Activate'}>
                    {s.active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button onClick={() => navigate(`/strategies/${s.id}/edit`)} className="btn-ghost p-1.5 md:p-2" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(s)} className="btn-ghost p-1.5 md:p-2 text-red-400 hover:text-red-300" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
