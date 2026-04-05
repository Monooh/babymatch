import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Likes({ session, coupleId }) {
  const [likes, setLikes]     = useState([])
  const [loading, setLoading] = useState(true)

  // Always reload fresh from DB on every mount
  useEffect(() => {
    loadLikes()
  }, [])  // intentionally no deps — reload every time tab is shown

  async function loadLikes() {
    setLoading(true)
    const { data } = await supabase
      .from('swipes')
      .select('id, name_id, is_favorite, names(*)')
      .eq('user_id', session.user.id)
      .eq('couple_id', coupleId)
      .eq('direction', 'like')
      .order('swiped_at', { ascending: false })
    setLikes(data || [])
    setLoading(false)
  }

  async function removeLike(swipe) {
    const { error } = await supabase.from('swipes').delete().eq('id', swipe.id)
    if (!error) {
      await supabase.from('matches').delete().eq('couple_id', coupleId).eq('name_id', swipe.name_id)
      // Update local state immediately
      setLikes(prev => prev.filter(l => l.id !== swipe.id))
    }
  }

  // Fix 5: save favorite to DB properly
  async function toggleFavorite(swipe) {
    const newVal = !swipe.is_favorite
    const { error } = await supabase
      .from('swipes')
      .update({ is_favorite: newVal })
      .eq('id', swipe.id)
    if (!error) {
      setLikes(prev => prev.map(l => l.id === swipe.id ? {...l, is_favorite: newVal} : l))
    }
  }

  const favorites = likes.filter(l => l.is_favorite)
  const rest      = likes.filter(l => !l.is_favorite)

  if (loading) return (
    <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12 }}>
      <div style={{ fontSize:48 }}>👍</div>
      <div style={{ fontFamily:"'Inter',system-ui",color:'#9A8080',fontSize:14 }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',flex:1,background:'#FFF4F1',overflow:'hidden' }}>
      <div className="screen-header">
        <div><h2>Mis likes</h2><p>{likes.length} nombres que te gustan</p></div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'14px 20px',display:'flex',flexDirection:'column',gap:10 }}>
        {likes.length===0&&(
          <div style={{ textAlign:'center',padding:'60px 20px' }}>
            <div style={{ fontSize:48,marginBottom:16 }}>💫</div>
            <div style={{ fontFamily:"'Poppins',system-ui",fontSize:18,fontWeight:700,color:'#1A0E0E',marginBottom:8 }}>Aún no has dado likes</div>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#9A8080' }}>Desliza nombres a la derecha</div>
          </div>
        )}
        {favorites.length>0&&(
          <>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,fontWeight:700,color:'#5A4040',textTransform:'uppercase',letterSpacing:1,marginTop:4,marginBottom:2 }}>⭐ Favoritos</div>
            {favorites.map(l=><LikeItem key={l.id} like={l} onRemove={removeLike} onFavorite={toggleFavorite}/>)}
            {rest.length>0&&<div style={{ fontFamily:"'Inter',system-ui",fontSize:11,fontWeight:700,color:'#5A4040',textTransform:'uppercase',letterSpacing:1,marginTop:8,marginBottom:2 }}>Todos</div>}
          </>
        )}
        {rest.map(l=><LikeItem key={l.id} like={l} onRemove={removeLike} onFavorite={toggleFavorite}/>)}
      </div>
    </div>
  )
}

function LikeItem({ like, onRemove, onFavorite }) {
  const name = like.names
  const [confirm, setConfirm] = useState(false)
  const gC = name?.gender==='f'?{bg:'#FDEAEA',color:'#7C2020',label:'Femenino'}:name?.gender==='m'?{bg:'#DCEEFF',color:'#1A3E80',label:'Masculino'}:{bg:'#DFF2E8',color:'#145030',label:'Unisex'}
  return (
    <div style={{ background:'#fff',borderRadius:16,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid #EDEBE9',borderLeft:like.is_favorite?'4px solid #8B2020':'1px solid #EDEBE9' }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
          <div style={{ fontFamily:"'Poppins',system-ui",fontSize:20,fontWeight:700,color:'#1A0E0E' }}>{name?.name}</div>
          <span style={{ background:gC.bg,color:gC.color,fontFamily:"'Inter',system-ui",fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10 }}>{gC.label}</span>
        </div>
        <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,color:'#9A8080' }}>{name?.origin} · {name?.syllables} {name?.syllables===1?'sílaba':'sílabas'}</div>
      </div>
      <div style={{ display:'flex',gap:4,alignItems:'center' }}>
        <button onClick={()=>onFavorite(like)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,padding:4 }}>
          {like.is_favorite?'⭐':'☆'}
        </button>
        {confirm?(
          <div style={{ display:'flex',gap:4 }}>
            <button onClick={()=>onRemove(like)} style={{ background:'#FDEAEA',border:'1px solid #E09090',borderRadius:8,cursor:'pointer',fontSize:11,padding:'6px 10px',color:'#7C2020',fontFamily:"'Inter',system-ui",fontWeight:700 }}>Quitar</button>
            <button onClick={()=>setConfirm(false)} style={{ background:'#F2F2F2',border:'1px solid #C8C4C2',borderRadius:8,cursor:'pointer',fontSize:11,padding:'6px 10px',color:'#5A4040',fontFamily:"'Inter',system-ui" }}>No</button>
          </div>
        ):(
          <button onClick={()=>setConfirm(true)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:16,padding:4,color:'#C8C4C2' }}>✕</button>
        )}
      </div>
    </div>
  )
}
