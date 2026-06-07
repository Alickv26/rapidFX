import { useState } from 'react'
import { useAccount } from '../contexts/AccountContext'
import { Plus, Trash2, Copy, Check, Shield, Wallet, Server, AlertTriangle } from 'lucide-react'

type Tab = 'paper' | 'demo' | 'live'

export function AccountsPage() {
  const { accounts, addAccount, removeAccount } = useAccount()
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<Tab>('paper')
  const [initialBalance, setInitialBalance] = useState('100000')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!label.trim()) return
    setSaving(true)
    setError('')
    try {
      const apiKey = `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      await addAccount({
        label: label.trim(),
        type,
        balance: type === 'paper' ? parseFloat(initialBalance) || 100000 : 0,
        equity: type === 'paper' ? parseFloat(initialBalance) || 100000 : 0,
        apiKey,
        active: true,
      })
      setLabel('')
      setType('paper')
      setInitialBalance('100000')
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete account "${label}"? This cannot be undone.`)) return
    try {
      await removeAccount(id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    }
  }

  const copyKey = async (key: string, id: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const typeIcon = (t: string) => {
    switch (t) {
      case 'paper': return <Shield className="w-4 h-4" />
      case 'demo': return <Server className="w-4 h-4" />
      case 'live': return <Wallet className="w-4 h-4" />
      default: return null
    }
  }

  const typeColor = (t: string) => {
    switch (t) {
      case 'paper': return 'bg-amber-900/30 text-amber-400'
      case 'demo': return 'bg-blue-900/30 text-blue-400'
      case 'live': return 'bg-green-900/30 text-green-400'
      default: return 'bg-surface-700 text-surface-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-surface-400 text-sm mt-1">Manage your trading accounts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          {showForm ? 'Cancel' : 'Add Account'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>
      )}

      {showForm && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold">New Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="acc-label">Account Label</label>
              <input
                id="acc-label"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. IC Markets Live"
              />
            </div>
            <div>
              <label className="label" htmlFor="acc-type">Account Type</label>
              <select
                id="acc-type"
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as Tab)}
              >
                <option value="paper">Paper Trading</option>
                <option value="demo">Demo (MT5)</option>
                <option value="live">Live (MT5)</option>
              </select>
            </div>
          </div>
          {type === 'paper' && (
            <div className="max-w-xs">
              <label className="label" htmlFor="acc-balance">Initial Balance</label>
              <input
                id="acc-balance"
                type="number"
                className="input"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                min={0}
              />
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={saving || !label.trim()} className="btn-primary">
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No accounts yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColor(acc.type)}`}>
                    {typeIcon(acc.type)}
                  </div>
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {acc.label}
                      <span className={`text-xs px-2 py-0.5 rounded ${typeColor(acc.type)}`}>
                        {acc.type.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-sm text-surface-400">
                      Balance: ${acc.balance.toFixed(2)} · Equity: ${acc.equity.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-surface-400 bg-surface-800 px-3 py-1.5 rounded-lg max-w-[160px] sm:max-w-none">
                    <code className="text-surface-200 truncate">{acc.apiKey}</code>
                    <button
                      onClick={() => copyKey(acc.apiKey, acc.id)}
                      className="p-0.5 hover:text-surface-200 transition-colors"
                      title="Copy API Key"
                    >
                      {copiedId === acc.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(acc.id, acc.label)}
                    className="btn-ghost p-2 text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {acc.type !== 'paper' && (
                <div className="mt-3 pt-3 border-t border-surface-700/50">
                  <p className="text-xs text-surface-400 flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    Run bot-engine with: <code className="bg-surface-800 px-2 py-0.5 rounded">ACCOUNT_ID={acc.id} PORT=3001 npx tsx src/index.ts</code>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
