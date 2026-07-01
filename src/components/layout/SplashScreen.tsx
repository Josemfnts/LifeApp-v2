import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const shown = sessionStorage.getItem('lifeos_splash_v2')
    if (shown) {
      setVisible(false)
      return
    }
    const timer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('lifeos_splash_v2', '1')
    }, 1600)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0e1014] flex flex-col items-center justify-center gap-4">
      <div className="w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br from-[#1e2430] to-[#252b38] border border-white/[0.1] flex items-center justify-center text-[32px] shadow-2xl"
        style={{ animation: 'sPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        ⚡
      </div>
      <div className="font-serif text-[28px] text-[#e8e9ee]" style={{ animation: 'sFade 0.5s 0.15s ease both' }}>
        Life OS
      </div>
      <div className="text-xs text-[var(--color-dim)] uppercase tracking-[2px] font-medium" style={{ animation: 'sFade 0.5s 0.25s ease both' }}>
        Tu sistema de vida
      </div>
      <div className="w-[120px] h-0.5 bg-white/[0.04] rounded-full overflow-hidden mt-2" style={{ animation: 'sFade 0.5s 0.3s ease both' }}>
        <div className="h-full bg-gradient-to-r from-[#5b8af0] to-[#52b788] rounded-full"
          style={{ animation: 'sLoad 1.2s 0.4s ease forwards', width: '0%' }} />
      </div>
      <style>{`
        @keyframes sPop { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
        @keyframes sFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sLoad { from{width:0%} to{width:100%} }
      `}</style>
    </div>
  )
}
