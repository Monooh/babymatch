import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState('login')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('¡Cuenta creada! Ya puedes entrar.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage('Email o contraseña incorrectos')
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: 'linear-gradient(160deg, #FFF4F1 0%, #FDDCDC 45%, #DFF2E8 100%)',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, background: '#fff', borderRadius: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
        boxShadow: '0 4px 18px rgba(124,45,43,.22)',
      }}>
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
          <rect x="5" y="11" width="20" height="25" rx="6" fill="#FDDCDC"/>
          <rect x="17" y="7" width="20" height="25" rx="6" fill="#F7A9A8"/>
          <path d="M21 20.8c0 0-3.2-2.2-3.2-4.2 0-1.3 1-2.3 2.2-2.3.6 0 1 .4 1 .4s.4-.4 1-.4c1.2 0 2.2 1 2.2 2.3 0 2-3.2 4.2-3.2 4.2z" fill="white"/>
        </svg>
      </div>
      <div style={{ fontFamily:"'Poppins',system-ui", fontSize:28, fontWeight:700, color:'#1A0E0E', letterSpacing:-.5, marginBottom:6 }}>
        Baby<span style={{ color:'#8B2020' }}>Match</span>
      </div>
      <div style={{ fontFamily:"'Inter',system-ui", fontSize:13, color:'#5A4040', marginBottom:36 }}>
        Encontrad el nombre perfecto juntos
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <input className="input-field" type="email" placeholder="Tu email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input-field" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <button className="btn-secondary" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
        {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
      </button>

      {message && (
        <div style={{ marginTop:16, padding:'12px 16px', background:'#fff', borderRadius:12, border:'1px solid #C8C4C2', fontFamily:"'Inter',system-ui", fontSize:13, color:'#5A4040', width:'100%' }}>
          {message}
        </div>
      )}
    </div>
  )
}
