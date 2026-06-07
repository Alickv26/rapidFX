import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { createStrategy } from '../lib/firestore'
import { StrategyForm } from '../components/StrategyForm'
import type { StrategyInput } from '../types/strategy'

export function StrategyCreatePage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (data: StrategyInput) => {
    if (!user) return
    const accountId = activeAccount?.id
    if (!accountId) {
      setError('No account selected. Create an account first.')
      return
    }
    try {
      setSaving(true)
      setError('')
      await createStrategy(user.uid, accountId, data)
      navigate('/strategies')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create strategy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Strategy</h1>
        <p className="text-surface-400 text-sm mt-1">
          {activeAccount
            ? `Assigning to account: ${activeAccount.label}`
            : 'Configure your trading strategy'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
      )}

      <StrategyForm onSave={handleSave} isSaving={saving} />
    </div>
  )
}
