import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const StarIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled?'#F5A623':'none'} stroke={filled?'#F5A623':'#C8C0C0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
)

const GENDER_FILTERS = [
  { key:'all',   label:'Todos' },
  { key:'f',     label:'Niña' },
  { key:'m',     label:'Niño' },
  { key:'u',     label:'Unisex' },
]

export default function Likes({ session, coupleId }) {
  const [likes, setLikes]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [genderFilter, setGenderFilter] = useState('all')

  useEffect(() => { loadLikes() }, [])

  async function loadLikes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('swipes')
      .select('id, name_id, is_favorite, names(*)')
      .eq('user_id', session.user.id)
      .eq('couple_id', coupleId)
      .eq('direction', 'like')
      .order('swiped_at', { ascending: false })
    if (error) console.error('loadLikes error:', error)
    setLikes(data || [])
    setLoading(false)
  }

  async function removeLike(swipe) {
    const { error } = await supabase.from('swipes').delete().eq('id', swipe.id)
    if (error) { console.error('removeLike error:', error); return }
    await supabase.from('matches').delete().eq('couple_id', coupleId).eq('name_id', swipe.name_id)
    setLikes(prev => prev.filter(l => l.id !== swipe.id))
  }

  async function toggleFavorite(swipe) {
    const newVal = !swipe.is_favorite
    const { error } = await supabase.from('swipes').update({ is_favorite: newVal }).eq('id', swipe.id)
    if (error) { console.error('toggleFavorite error:', error); return }
    setLikes(prev => prev.map(l => l.id === swipe.id ? { ...l, is_favorite: newVal } : l))
  }

  // Apply gender filter — unisex shows in all filters
  const filtered = likes.filter(l => {
    if (genderFilter === 'all') return true
    if (l.names?.gender === 'u') return true // unisex always shows
    return l.names?.gender === genderFilter
  })

  const favorites = filtered.filter(l => l.is_favorite)
  const rest      = filtered.filter(l => !l.is_favorite)

  if (loading) return (
    <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12 }}>
      <div style={{ fontSize:48 }}>👍</div>
      <div style={{ fontFamily:"'Inter',system-ui",color:'#9A8080',fontSize:14 }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',flex:1,background:'#FFF4F1',overflow:'hidden' }}>
      <div className="screen-header" style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h2>Mis likes</h2>
          <p>{filtered.length} de {likes.length} nombres</p>
        </div>
        {/* Gender filter pills — subtle */}
        <div style={{ display:'flex', gap:6, marginTop:2 }}>
          {GENDER_FILTERS.map(f => (
            <button key={f.key} onClick={() => setGenderFilter(f.key)}
              style={{
                padding:'4px 10px', borderRadius:14,
                border: genderFilter===f.key ? '1.5px solid #8B2020' : '1.5px solid #D8D4D2',
                background: genderFilter===f.key ? '#8B2020' : '#fff',
                color: genderFilter===f.key ? '#fff' : '#9A8080',
                fontFamily:"'Inter',system-ui", fontSize:11, fontWeight:600,
                cursor:'pointer',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'14px 20px',display:'flex',flexDirection:'column',gap:10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center',padding:'60px 20px' }}>
            <div style={{ fontSize:48,marginBottom:16 }}>💫</div>
            <div style={{ fontFamily:"'Poppins',system-ui",fontSize:18,fontWeight:700,color:'#1A0E0E',marginBottom:8 }}>
              {likes.length === 0 ? 'Aún no has dado likes' : 'Sin resultados con este filtro'}
            </div>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#9A8080' }}>
              {likes.length === 0 ? 'Desliza nombres a la derecha' : 'Prueba con otro filtro de género'}
            </div>
          </div>
        )}
        {favorites.length > 0 && (
          <>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,fontWeight:700,color:'#5A4040',textTransform:'uppercase',letterSpacing:1,marginTop:4,marginBottom:2 }}>⭐ Favoritos</div>
            {favorites.map(l => <LikeItem key={l.id} like={l} onRemove={removeLike} onFavorite={toggleFavorite} />)}
            {rest.length > 0 && <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,fontWeight:700,color:'#5A4040',textTransform:'uppercase',letterSpacing:1,marginTop:8,marginBottom:2 }}>Todos</div>}
          </>
        )}
        {rest.map(l => <LikeItem key={l.id} like={l} onRemove={removeLike} onFavorite={toggleFavorite} />)}
      </div>
    </div>
  )
}

function LikeItem({ like, onRemove, onFavorite }) {
  const name = like.names
  const [confirm, setConfirm] = useState(false)
  const gC = name?.gender==='f'
    ? {bg:'#FDEAEA',color:'#7C2020',label:'Niña'}
    : name?.gender==='m'
    ? {bg:'#DCEEFF',color:'#1A3E80',label:'Niño'}
    : {bg:'#DFF2E8',color:'#145030',label:'Unisex'}

  return (
    <div style={{ background:'#fff',borderRadius:16,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid #EDEBE9',borderLeft:like.is_favorite?'4px solid #F5A623':'1px solid #EDEBE9' }}>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
          <div style={{ fontFamily:"'Poppins',system-ui",fontSize:20,fontWeight:700,color:'#1A0E0E' }}>{name?.name}</div>
          <span style={{ flexShrink:0,background:gC.bg,color:gC.color,fontFamily:"'Inter',system-ui",fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10 }}>{gC.label}</span>
        </div>
        <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,color:'#9A8080' }}>{name?.origin} · {name?.syllables} {name?.syllables===1?'sílaba':'sílabas'}</div>
      </div>
      <div style={{ display:'flex',gap:12,alignItems:'center',marginLeft:12,flexShrink:0 }}>
        <button onClick={()=>onFavorite(like)} style={{ background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center' }}>
          <StarIcon filled={like.is_favorite} />
        </button>
        {confirm ? (
          <div style={{ display:'flex',gap:6 }}>
            <button onClick={()=>onRemove(like)} style={{ background:'#FDEAEA',border:'1px solid #E09090',borderRadius:8,cursor:'pointer',fontSize:11,padding:'6px 10px',color:'#7C2020',fontFamily:"'Inter',system-ui",fontWeight:700 }}>Quitar</button>
            <button onClick={()=>setConfirm(false)} style={{ background:'#F2F2F2',border:'1px solid #C8C4C2',borderRadius:8,cursor:'pointer',fontSize:11,padding:'6px 10px',color:'#5A4040',fontFamily:"'Inter',system-ui" }}>No</button>
          </div>
        ) : (
          <button onClick={()=>setConfirm(true)} style={{ background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8C4C2" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}
