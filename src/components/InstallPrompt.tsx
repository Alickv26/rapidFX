import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Also show if already installed (check display mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setVisible(false)
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
  }

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-surface-200 border border-surface-200 rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
          <Download size={18} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-500">Install RapidFX</p>
          <p className="text-xs text-surface-400 mt-0.5">Add to your home screen for a better experience</p>
          <button
            onClick={handleInstall}
            className="mt-2 px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-400 transition-colors"
          >
            Install
          </button>
        </div>
        <button onClick={handleDismiss} className="p-1 shrink-0 text-surface-400 hover:text-surface-200 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
