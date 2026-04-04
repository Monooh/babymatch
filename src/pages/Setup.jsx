import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function generateCode() {
  const words = ['LUNA','NOVA','STAR','ROSE','ALBA','IRIS','EDEN','ARIA',
                 'LUCA','NOEL','MAYA','NICO','VERA','CLEO','FINN','JADE',
                 'RIO','SKY','IVY','ACE','BIEL','NOA','KAI','ZOE','LEO']
  const word = words[Math.floor(Math.random() * words.length)]
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${word}-${suffix}`
}

export default function Setup({ session, onCouple }) {
  const [mode, setMode]         = useState(null)
  const [code, setCode]         = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    async function checkExisting() {
      const { data } = await supabase
        .from('couples')
        .select('id, invite_code, status')
        .eq('user_a_id', session.user.id)
        .single()
      if (data) {
        setCode(data.invite_code)
        if (data.status === 'active') onCouple(data.id)
        else setMode('created')
      }
    }
    checkExisting()
  }, [])

  async function handleCreate() {
    setLoading(true)
    setError('')
    const newCode = generateCode()
    setCode(newCode)
    const { error } = await supabase
      .from('couples')
      .insert({ user_a_id: session.user.id, invite_code: newCode, status: 'pending' })
    if (error) setError('Error creando la pareja.')
    else setMode('created')
    setLoading(false)
  }

  async function handleJoin() {
    setLoading(true)
    setError('')
    const { data: couple, error: findError } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', joinCode.toUpperCase().trim())
      .eq('status', 'pending')
      .neq('user_a_id', session.user.id)
      .single()
    if (findError || !couple) {
      setError('Código no válido o ya utilizado.')
      setLoading(false)
      return
    }
    const { error: joinError } = await supabase
      .from('couples')
      .update({ user_b_id: session.user.id, status: 'active' })
      .eq('id', couple.id)
    if (joinError) setError('Error al unirse.')
    else onCouple(couple.id)
    setLoading(false)
  }

  async function handleContinueSolo() {
    const { data } = await supabase
      .from('couples')
      .select('id')
      .eq('user_a_id', session.user.id)
      .eq('status', 'pending')
      .single()
    if (data) {
      await supabase.from('couples').update({ status: 'active' }).eq('id', data.id)
      onCouple(data.id)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareCode() {
    if (navigator.share) {
      navigator.share({
        title: 'BabyMatch',
        text: `Únete a mi pareja en BabyMatch con el código: ${code}\n\nhttps://babymatch.vercel.app`,
      })
    } else {
      copyCode()
    }
  }

  const wrap = {
    background: 'linear-gradient(160deg, #FFF4F1, #FDDCDC 70%)',
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 28px', textAlign: 'center',
  }

  return (
    <div style={wrap}>
      {!mode && (
        <>
          <div style={{ fontSize: 52, marginBottom: 16 }}>👫</div>
          <div style={{ fontFamily:"'Poppins',system-ui", fontSize:22, fontWeight:700, color:'#1A0E0E', marginBottom:8 }}>Conecta con tu pareja</div>
          <div style={{ fontFamily:"'Inter',system-ui", fontSize:13, color:'#5A4040', lineHeight:1.6, marginBottom:24 }}>
            Crea un código para que tu pareja se una,<br/>o introduce el código que te han compartido.
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? '...' : 'Crear código de pareja'}
          </button>
          <button className="btn-secondary" onClick={() => setMode('join')}>Tengo un código</button>
        </>
      )}

      {mode === 'created' && (
        <>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔗</div>
          <div style={{ fontFamily:"'Poppins',system-ui", fontSize:22, fontWeight:700, color:'#1A0E0E', marginBottom:8 }}>Tu código de pareja</div>
          <div style={{ fontFamily:"'Inter',system-ui", fontSize:13, color:'#5A4040', lineHeight:1.6, marginBottom:20 }}>
            Compártelo con tu pareja para conectaros.<br/>No tiene fecha de expiración.
          </div>
          <div onClick={copyCode} style={{
            background:'#fff', borderRadius:18, padding:'20px 24px',
            border:'1.5px dashed #D08080', width:'100%', cursor:'pointer', marginBottom:16,
          }}>
            <div style={{ fontFamily:"'Inter',system-ui", fontSize:10, fontWeight:700, color:'#9A7070', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:10 }}>
              Tu código
            </div>
            <div style={{ fontFamily:"'Poppins',system-ui", fontSize:32, fontWeight:700, color:'#8B2020', letterSpacing:6 }}>
              {code}
            </div>
            <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, color:'#9A7070', marginTop:8 }}>
              {copied ? '¡Copiado! 👍' : 'Toca para copiar'}
            </div>
          </div>
          <button className="btn-primary" onClick={shareCode}>📤 Compartir con mi pareja</button>
          <button className="btn-secondary" onClick={handleContinueSolo}>Empezar solo por ahora</button>
          <div style={{ fontFamily:"'Inter',system-ui", fontSize:12, color:'#9A7070', marginTop:12 }}>
            Tu pareja puede unirse después con este código
          </div>
        </>
      )}

      {mode === 'join' && (
        <>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔑</div>
          <div style={{ fontFamily:"'Poppins',system-ui", fontSize:22, fontWeight:700, color:'#1A0E0E', marginBottom:8 }}>Introduce el código</div>
          <div style={{ fontFamily:"'Inter',system-ui", fontSize:13, color:'#5A4040', marginBottom:24 }}>
            Pide a tu pareja que te comparta su código
          </div>
          <input
            className="input-field"
            type="text"
            placeholder="Ej: LUNA-K3M"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            style={{ textAlign:'center', fontSize:22, fontFamily:"'Poppins',system-ui", fontWeight:700, letterSpacing:4 }}
          />
          <button className="btn-primary" onClick={handleJoin} disabled={loading || !joinCode}>
            {loading ? '...' : 'Unirme'}
          </button>
          <button className="btn-secondary" onClick={() => setMode(null)}>Volver</button>
        </>
      )}

      {error && (
        <div style={{ marginTop:16, padding:'12px 16px', background:'#FDEAEA', borderRadius:12, border:'1px solid #E09090', fontFamily:"'Inter',system-ui", fontSize:13, color:'#8B2020', width:'100%' }}>
          {error}
        </div>
      )}
    </div>
  )
}
