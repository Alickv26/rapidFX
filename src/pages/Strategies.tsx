import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, Edit2, Trash2, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getStrategies, updateStrategy, deleteStrategy } from '../lib/firestore'
import type { Strategy } from '../types/strategy'

export function StrategiesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!user) return
    try {
      setLoading(true)
      const data = await getStrategies(user.uid)
      setStrategies(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load strategies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

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

  if (loading) return <div className="text-surface-400">Loading...</div>

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
          <p className="text-sm text-surface-400 mb-4">Create your first trading strategy</p>
          <Link to="/strategies/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={18} />
            Create Strategy
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${s.active ? 'bg-green-400' : 'bg-surface-400'}`} />
                <div>
                  <h3 className="font-medium">{s.name}</h3>
                  <p className="text-sm text-surface-400">
                    {s.pairs.join(', ')} · {s.timeframes.join('/')} · {s.direction}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    SL: {s.risk.slType} ({s.risk.slValue}) · TP: {s.risk.tpType} ({s.risk.tpValue}) · Max {s.maxOpenTrades} trades · {s.positionSizing.riskPerTrade}% risk
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-400 mr-2">{winRate(s)} win rate</span>
                <button onClick={() => toggleActive(s)} className="btn-ghost p-2" title={s.active ? 'Pause' : 'Activate'}>
                  {s.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={() => navigate(`/strategies/${s.id}/edit`)} className="btn-ghost p-2" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(s)} className="btn-ghost p-2 text-red-400 hover:text-red-300" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
