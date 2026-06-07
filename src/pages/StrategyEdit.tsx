import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStrategy, updateStrategy } from '../lib/firestore'
import { useAccount } from '../contexts/AccountContext'
import { StrategyForm } from '../components/StrategyForm'
import { Wallet } from 'lucide-react'
import type { StrategyInput } from '../types/strategy'

export function StrategyEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accounts } = useAccount()
  const [initial, setInitial] = useState<StrategyInput | null>(null)
  const [strategyAccountLabel, setStrategyAccountLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getStrategy(id)
      .then((s) => {
        if (!s) { navigate('/strategies'); return }
        const { id: _id, uid: _uid, createdAt: _c, updatedAt: _u, accountId: _a, ...rest } = s
        setInitial({ ...rest, active: rest.active })
        const bound = accounts.find((a) => a.id === s.accountId)
        setStrategyAccountLabel(bound ? bound.label : 'Unknown')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, navigate, accounts])

  const handleSave = async (data: StrategyInput) => {
    if (!id) return
    try {
      setSaving(true)
      setError('')
      await updateStrategy(id, data)
      navigate('/strategies')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update strategy')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-surface-400">Loading...</div>
  if (!initial) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Strategy</h1>
        <p className="text-surface-400 text-sm mt-1">
          {initial.name}
          {strategyAccountLabel && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-surface-400 bg-surface-800 px-2 py-0.5 rounded">
              <Wallet size={10} />
              {strategyAccountLabel}
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
      )}

      <StrategyForm initialData={initial} onSave={handleSave} isSaving={saving} />
    </div>
  )
}
