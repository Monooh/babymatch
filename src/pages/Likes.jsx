import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Likes({ session, coupleId }) {
  const [likes, setLikes]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLikes() }, [coupleId])

  async function loadLikes() {
    setLoading(true)
    const { data } = await supabase
      .from('swipes')
      .select('id, name_id, names(*)')
      .eq('user_id', session.user.id)
      .eq('couple_id', coupleId)
      .eq('direction', 'like')
      .order('swiped_at', { ascending: false })
    setLikes(data || [])
    setLoading(false)
  }

  async function removeLike(swipe) {
    await supabase.from('swipes').delete().eq('id', swipe.id)
    // Also remove match if exists
    await supabase.from('matches')
      .delete()
      .eq('couple_id', coupleId)
      .eq('name_id', swipe.name_id)
    setLikes(ls => ls.filter(l => l.id !== swipe.id))
  }

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:48 }}>👍</div>
      <div style={{ fontFamily:"'Inter',system-ui", color:'#9A8080', fontSize:14 }}>Cargando likes...</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%', background:'#FFF4F1' }}>
      <div className="screen-header">
        <div>
          <h2>Mis likes</h2>
          <p>{likes.length} nombres que te gustan</p>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        {likes.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>💫</div>
            <div style={{ fontFamily:"'Poppins',system-ui", fontSize:18, fontWeight:700, color:'#1A0E0E', marginBottom:8 }}>
              Aún no has dado likes
            </div>
            <div style={{ fontFamily:"'Inter',system-ui", fontSize:14, color:'#9A8080' }}>
              Desliza nombres a la derecha para añadirlos aquí
            </div>
          </div>
        )}

        {likes.map(like => (
          <LikeItem key={like.id} like={like} onRemove={removeLike} />
        ))}
      </div>
    </div>
  )
}

function LikeItem({ like, onRemove }) {
  const name = like.names
  const [confirm, setConfirm] = useState(false)

  const genderLabel = name?.gender === 'f' ? 'Femenino' : name?.gender === 'm' ? 'Masculino' : 'Unisex'
  const genderColor = name?.gender === 'f' ? '#7C2020' : name?.gender === 'm' ? '#1A3E80' : '#145030'
  const genderBg    = name?.gender === 'f' ? '#FDEAEA' : name?.gender === 'm' ? '#DCEEFF' : '#DFF2E8'

  return (
    <div style={{
      background:'#fff', borderRadius:16, padding:'14px 18px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      border:'1px solid #EDEBE9',
    }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ fontFamily:"'Poppins',system-ui", fontSize:20, fontWeight:700, color:'#1A0E0E' }}>
            {name?.name}
          </div>
          <span style={{ background:genderBg, color:genderColor, fontFamily:"'Inter',system-ui", fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
            {genderLabel}
          </span>
        </div>
        <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, color:'#9A8080' }}>
          {name?.origin} · {name?.syllables} {name?.syllables === 1 ? 'sílaba' : 'sílabas'}
        </div>
      </div>
      <div>
        {confirm ? (
          <div style={{ display:'flex', gap:6 }}>
            <button
              onClick={() => onRemove(like)}
              style={{ background:'#FDEAEA', border:'1px solid #E09090', borderRadius:8, cursor:'pointer', fontSize:11, padding:'6px 10px', color:'#7C2020', fontFamily:"'Inter',system-ui", fontWeight:700 }}
            >
              Quitar
            </button>
            <button
              onClick={() => setConfirm(false)}
              style={{ background:'#F2F2F2', border:'1px solid #C8C4C2', borderRadius:8, cursor:'pointer', fontSize:11, padding:'6px 10px', color:'#5A4040', fontFamily:"'Inter',system-ui" }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:4, color:'#C8C4C2' }}
            title="Quitar like"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
