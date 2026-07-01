import { useState } from 'react'
import { getGreeting, formatDateSpanish } from '@/lib/dates'
import { getDisplayName, setDisplayName } from '@/lib/storage'
import { useXP } from '@/contexts/XPContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/stores/toast'
import { getGlobalLevel, calcCombinedStreak } from '@/lib/xp-engine'

export function TopBar() {
  const { xp } = useXP()
  const { toggle: toggleTheme } = useTheme()
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [name, setName] = useState(getDisplayName())
  const greeting = getGreeting()
  const now = new Date()
  const dateStr = formatDateSpanish(now)
  const streak = calcCombinedStreak(xp)
  const lv = getGlobalLevel(xp)
  const grandTotal = Object.values(xp).reduce((s, a) => s + a.total, 0)

  function handleSaveName() {
    setDisplayName(name)
    toast.show('✓ Nombre actualizado')
    setSettingsOpen(false)
  }

  return (
    <>
      <div className="page-header">
        <div className="greeting">{greeting}</div>
        <div className="greeting-name">
          <em>{getDisplayName()}</em>
        </div>

        <div className="streak-row">
          <span style={{fontSize:16}}>🔥</span>
          <span style={{fontFamily:'DM Serif Display,serif',fontSize:16,color:'#c9a84c'}}>{streak}</span>
          <span style={{fontSize:11,color:'var(--color-dim)',fontWeight:600}}>días de racha</span>
        </div>

        <div className="top-meta" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12,marginBottom:14}}>
          <div className="date-chip" style={{fontSize:12,fontWeight:500,color:'var(--color-sub)'}}>{dateStr}</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={() => setSettingsOpen(true)} className="gear-btn" style={{width:34,height:34,borderRadius:10,background:'var(--color-s1)',border:'1px solid var(--color-border)',color:'var(--color-dim)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="level-pill" style={{display:'flex',alignItems:'center',gap:8,background:'rgba(91,138,240,0.08)',border:'1px solid rgba(91,138,240,0.2)',borderRadius:99,padding:'5px 12px 5px 8px'}}>
              <div className="level-dot" style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,var(--color-acc-blue),#3a6bd4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>{lv.level}</div>
              <div>
                <div className="level-text" style={{fontSize:12,fontWeight:600,color:'var(--color-text)'}}>Nivel {lv.level}</div>
                <div className="level-xp" style={{fontSize:11,color:'var(--color-sub)'}}>{grandTotal} XP totales</div>
              </div>
            </div>
          </div>
        </div>

        <div className="xp-strip">
          <div className="xp-strip-fill" style={{width:`${lv.pct}%`}} />
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSettingsOpen(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--color-dim)',letterSpacing:'0.8px',textTransform:'uppercase'}}>Configuración</div>
                <div style={{fontFamily:'DM Serif Display,serif',fontSize:22,marginTop:2}}>Ajustes</div>
              </div>
              <button onClick={() => setSettingsOpen(false)} style={{width:34,height:34,borderRadius:10,background:'var(--color-s2)',border:'1px solid var(--color-border)',color:'var(--color-dim)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>

            <div style={{margin:'16px 20px 0'}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--color-dim)',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:10}}>Perfil</div>
              <div style={{background:'var(--color-s2)',border:'1px solid var(--color-border)',borderRadius:14,padding:14}}>
                <div style={{fontSize:13,color:'var(--color-sub)',marginBottom:8}}>Tu nombre en la app</div>
                <div style={{display:'flex',gap:8}}>
                  <input value={name} onChange={e => setName(e.target.value)} type="text" className="inp" style={{flex:1,marginBottom:0,fontSize:15,fontWeight:600}} placeholder="Tu nombre..." />
                  <button onClick={handleSaveName} style={{padding:'0 16px',borderRadius:10,background:'rgba(91,138,240,0.12)',color:'var(--color-acc-blue)',border:'1px solid rgba(91,138,240,0.2)',fontSize:13,fontWeight:600,fontFamily:'DM Sans,sans-serif',cursor:'pointer',whiteSpace:'nowrap'}}>Guardar</button>
                </div>
              </div>
            </div>

            <div style={{margin:'16px 20px 0'}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--color-dim)',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:10}}>Apariencia</div>
              <div style={{background:'var(--color-s2)',border:'1px solid var(--color-border)',borderRadius:14,padding:14}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'var(--color-text)'}}>Tema oscuro</div>
                    <div style={{fontSize:12,color:'var(--color-sub)'}}>Alternar entre tema oscuro y claro</div>
                  </div>
                  <button onClick={toggleTheme} style={{width:56,height:28,borderRadius:99,position:'relative',transition:'background 0.2s',background:'var(--color-acc-blue)',border:'none',cursor:'pointer'}}>
                    <div style={{position:'absolute',top:2,width:24,height:24,borderRadius:'50%',background:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'transform 0.2s',transform:'translateX(28px)'}} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
