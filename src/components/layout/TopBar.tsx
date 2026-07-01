import { useState } from 'react'
import { getGreeting, formatDateSpanish } from '@/lib/dates'
import { getDisplayName, setDisplayName } from '@/lib/storage'
import { Modal } from '@/components/ui'
import { useXP } from '@/contexts/XPContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/stores/toast'
import { getGlobalLevel, calcCombinedStreak } from '@/lib/xp-engine'

export function TopBar() {
  const { xp } = useXP()
  const { theme, toggle: toggleTheme } = useTheme()
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [name, setName] = useState(getDisplayName())
  const greeting = getGreeting()
  const now = new Date()
  const dateStr = formatDateSpanish(now)
  const streak = calcCombinedStreak(xp)
  const lv = getGlobalLevel(xp)

  function handleSaveName() {
    setDisplayName(name)
    toast.show('✓ Nombre actualizado')
    setSettingsOpen(false)
  }

  const grandTotal = Object.values(xp).reduce((s, a) => s + a.total, 0)

  return (
    <>
      <div className="pt-[52px] px-5 pb-0 border-b border-[var(--color-border)] bg-gradient-to-b from-[#0d0f13] to-[var(--color-bg)]">
        <div className="text-xs font-medium text-[var(--color-sub)] tracking-wide mb-1">{greeting}</div>
        <div className="font-serif text-[30px] text-[var(--color-text)] leading-tight">
          <em className="not-italic bg-gradient-to-br from-[#6b9af5] to-[#52b788] bg-clip-text text-transparent">
            {getDisplayName()}
          </em>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-base">🔥</span>
          <span className="font-serif text-base text-[var(--color-yellow)]">{streak}</span>
          <span className="text-[11px] text-[var(--color-dim)] font-semibold">días de racha</span>
        </div>

        <div className="flex items-center justify-between mt-3 mb-3.5">
          <div className="text-xs font-medium text-[var(--color-sub)]">{dateStr}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-[34px] h-[34px] rounded-xl bg-[var(--color-s1)] border border-[var(--color-border)] text-[var(--color-dim)] flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="flex items-center gap-2 bg-[#5b8af0]/[0.08] border border-[#5b8af0]/[0.2] rounded-full pl-2 pr-3 py-1">
              <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#5b8af0] to-[#3a6bd4] flex items-center justify-center text-[10px] font-bold text-white">
                {lv.level}
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--color-text)]">Nivel {lv.level}</div>
                <div className="text-[11px] text-[var(--color-sub)]">{grandTotal} XP totales</div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[3px] relative">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#5b8af0] via-[#52b788] to-[#c9a84c] rounded-full transition-all duration-1000"
            style={{ width: `${lv.pct}%` }}
          />
        </div>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Ajustes">
        <div className="px-5 mt-4">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-2.5">Perfil</div>
          <div className="bg-[var(--color-s2)] border border-[var(--color-border)] rounded-2xl p-3.5">
            <div className="text-[13px] text-[var(--color-sub)] mb-2">Tu nombre en la app</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-[15px] font-semibold font-sans outline-none"
                placeholder="Tu nombre..."
              />
              <button
                onClick={handleSaveName}
                className="px-4 rounded-xl bg-[#5b8af0]/[0.12] text-[var(--color-acc-blue)] border border-[#5b8af0]/[0.2] text-[13px] font-semibold font-sans cursor-pointer whitespace-nowrap"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 mt-4">
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wider mb-2.5">Apariencia</div>
          <div className="bg-[var(--color-s2)] border border-[var(--color-border)] rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold text-[var(--color-text)]">Tema oscuro</div>
                <div className="text-[12px] text-[var(--color-sub)]">Alternar entre tema oscuro y claro</div>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-14 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-[#5b8af0]' : 'bg-[var(--color-border2)]'}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
