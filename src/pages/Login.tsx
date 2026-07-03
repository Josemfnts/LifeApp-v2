import { useState } from 'react'
import { signIn, signUp } from '@/lib/supabase'
import { syncAllToCloud, downloadFromCloud } from '@/lib/sync'
import { useToast } from '@/stores/toast'

interface LoginProps { onDone: () => void }

export default function Login({ onDone }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        await downloadFromCloud()
        toast.show('✓ Sesión iniciada y datos sincronizados')
        onDone()
      } else {
        const data = await signUp(email, password)
        if (!data.session) {
          toast.show('✓ Cuenta creada. Confirma tu email antes de entrar.')
          setMode('login')
          setPassword('')
        } else {
          await syncAllToCloud()
          toast.show('✓ Cuenta creada y sincronizada')
          onDone()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.show('❌ ' + (msg.includes('Invalid') ? 'Credenciales incorrectas' : msg))
    }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'var(--color-bg)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: 'var(--color-text)', marginBottom: 4 }}>Life OS</div>
        <div style={{ fontSize: 13, color: 'var(--color-sub)' }}>Tu sistema de vida</div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button type="button" onClick={() => setMode('login')}
            style={{
              flex: 1, padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: mode === 'login' ? 'color-mix(in srgb, var(--color-acc-blue) 12%, transparent)' : 'transparent',
              color: mode === 'login' ? 'var(--color-acc-blue)' : 'var(--color-dim)',
              borderColor: mode === 'login' ? 'color-mix(in srgb, var(--color-acc-blue) 30%, transparent)' : 'var(--color-border)',
            }}>Iniciar sesión</button>
          <button type="button" onClick={() => setMode('register')}
            style={{
              flex: 1, padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: mode === 'register' ? 'color-mix(in srgb, var(--color-acc-blue) 12%, transparent)' : 'transparent',
              color: mode === 'register' ? 'var(--color-acc-blue)' : 'var(--color-dim)',
              borderColor: mode === 'register' ? 'color-mix(in srgb, var(--color-acc-blue) 30%, transparent)' : 'var(--color-border)',
            }}>Crear cuenta</button>
        </div>

        <input
          className="inp"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
        />
        <input
          className="inp"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: 4 }}
        >
          {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <button
        onClick={onDone}
        style={{
          marginTop: 24, background: 'none', border: 'none',
          color: 'var(--color-dim)', fontSize: 13, fontWeight: 500,
          fontFamily: 'DM Sans,sans-serif', cursor: 'pointer',
        }}>
        Continuar sin cuenta
      </button>
    </div>
  )
}
