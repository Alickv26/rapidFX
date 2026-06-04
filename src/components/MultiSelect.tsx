import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
  group: string
}

const FOREX_PAIRS: Option[] = [
  { value: 'EUR/USD', label: 'EUR/USD', group: 'Major' },
  { value: 'GBP/USD', label: 'GBP/USD', group: 'Major' },
  { value: 'USD/JPY', label: 'USD/JPY', group: 'Major' },
  { value: 'USD/CHF', label: 'USD/CHF', group: 'Major' },
  { value: 'AUD/USD', label: 'AUD/USD', group: 'Major' },
  { value: 'USD/CAD', label: 'USD/CAD', group: 'Major' },
  { value: 'NZD/USD', label: 'NZD/USD', group: 'Major' },
  { value: 'EUR/JPY', label: 'EUR/JPY', group: 'Cross' },
  { value: 'GBP/JPY', label: 'GBP/JPY', group: 'Cross' },
  { value: 'EUR/GBP', label: 'EUR/GBP', group: 'Cross' },
  { value: 'EUR/CHF', label: 'EUR/CHF', group: 'Cross' },
  { value: 'GBP/CHF', label: 'GBP/CHF', group: 'Cross' },
  { value: 'AUD/JPY', label: 'AUD/JPY', group: 'Cross' },
  { value: 'NZD/JPY', label: 'NZD/JPY', group: 'Cross' },
  { value: 'CHF/JPY', label: 'CHF/JPY', group: 'Cross' },
  { value: 'EUR/AUD', label: 'EUR/AUD', group: 'Cross' },
  { value: 'GBP/AUD', label: 'GBP/AUD', group: 'Cross' },
  { value: 'AUD/CAD', label: 'AUD/CAD', group: 'Cross' },
  { value: 'AUD/CHF', label: 'AUD/CHF', group: 'Cross' },
  { value: 'USD/MXN', label: 'USD/MXN', group: 'Exotic' },
  { value: 'USD/TRY', label: 'USD/TRY', group: 'Exotic' },
  { value: 'USD/ZAR', label: 'USD/ZAR', group: 'Exotic' },
  { value: 'USD/NOK', label: 'USD/NOK', group: 'Exotic' },
  { value: 'USD/SEK', label: 'USD/SEK', group: 'Exotic' },
  { value: 'USD/SGD', label: 'USD/SGD', group: 'Exotic' },
  { value: 'USD/HKD', label: 'USD/HKD', group: 'Exotic' },
  { value: 'EUR/TRY', label: 'EUR/TRY', group: 'Exotic' },
  { value: 'EUR/MXN', label: 'EUR/MXN', group: 'Exotic' },
  { value: 'GBP/MXN', label: 'GBP/MXN', group: 'Exotic' },
  { value: 'JPY/MXN', label: 'JPY/MXN', group: 'Exotic' },
]

interface MultiSelectProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function MultiSelect({ selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }

  const groups = [...new Set(FOREX_PAIRS.map((o) => o.group))]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input flex items-center justify-between text-left"
      >
        <span className={selected.length === 0 ? 'text-surface-400' : 'text-surface-700'}>
          {selected.length === 0
            ? 'Select pairs...'
            : `${selected.length} pair${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown size={16} className={`text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface-100 border border-surface-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {groups.map((group) => {
            const groupOptions = FOREX_PAIRS.filter((o) => o.group === group)
            const allSelected = groupOptions.every((o) => selected.includes(o.value))
            return (
              <div key={group}>
                <div className="px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider bg-surface-200/50 flex items-center justify-between">
                  <span>{group}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (allSelected) {
                        onChange(selected.filter((v) => !groupOptions.some((o) => o.value === v)))
                      } else {
                        onChange([...selected, ...groupOptions.map((o) => o.value).filter((v) => !selected.includes(v))])
                      }
                    }}
                    className="text-brand-400 hover:text-brand-300 text-xs"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                {groupOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-surface-200 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                      checked={selected.includes(opt.value)}
                      onChange={() => toggle(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
