import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function Matches({ session, coupleId }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const loadMatches = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select('*, names(*)')
      .eq('couple_id', coupleId)
      .order('matched_at', { ascending: false })

    // For each match, check if current user favorited it in swipes
    const uid = session.user.id
    const nameIds = (data||[]).map(m => m.name_id)
    let favSet = new Set()
    if (nameIds.length) {
      const { data: favSwipes } = await supabase
        .from('swipes')
        .select('name_id')
        .eq('user_id', uid)
        .eq('couple_id', coupleId)
        .eq('is_favorite', true)
        .in('name_id', nameIds)
      favSwipes?.forEach(s => favSet.add(s.name_id))
    }

    setMatches((data||[]).map(m => ({ ...m, my_favorite: favSet.has(m.name_id) })))
    setLoading(false)
  }, [session, coupleId])

  useEffect(() => { loadMatches() }, [loadMatches])

  async function toggleFavorite(match) {
    const newVal = !match.is_favorite
    await supabase.from('matches').update({ is_favorite: newVal }).eq('id', match.id)
    // Also update in swipes
    await supabase.from('swipes')
      .update({ is_favorite: newVal })
      .eq('user_id', session.user.id)
      .eq('couple_id', coupleId)
      .eq('name_id', match.name_id)
    setMatches(ms => ms.map(m => m.id===match.id ? {...m, is_favorite: newVal, my_favorite: newVal} : m))
  }

  async function removeMatch(match) {
    await supabase.from('matches').delete().eq('id', match.id)
    setMatches(ms => ms.filter(m => m.id !== match.id))
  }

  const favorites = matches.filter(m => m.is_favorite)
  const rest      = matches.filter(m => !m.is_favorite)

  if (loading) return (
    <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,minHeight:300 }}>
      <div style={{ fontSize:48 }}>💖</div>
      <div style={{ fontFamily:"'Inter',system-ui", color:'#9A8080', fontSize:14 }}>Cargando matches...</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', background:'#FFF4F1', flex:1 }}>
      <div className="screen-header">
        <div>
          <h2>Vuestros Matches</h2>
          <p>{matches.length} nombres en común</p>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        {matches.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>💫</div>
            <div style={{ fontFamily:"'Poppins',system-ui", fontSize:18, fontWeight:700, color:'#1A0E0E', marginBottom:8 }}>Aún no hay matches</div>
            <div style={{ fontFamily:"'Inter',system-ui", fontSize:14, color:'#9A8080' }}>Cuando los dos deis like al mismo nombre aparecerá aquí</div>
          </div>
        )}

        {favorites.length > 0 && (
          <>
            <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, fontWeight:700, color:'#5A4040', textTransform:'uppercase', letterSpacing:1, marginTop:4, marginBottom:2 }}>⭐ Favoritos</div>
            {favorites.map(m => <MatchItem key={m.id} match={m} onFavorite={toggleFavorite} onRemove={removeMatch} />)}
            {rest.length > 0 && <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, fontWeight:700, color:'#5A4040', textTransform:'uppercase', letterSpacing:1, marginTop:8, marginBottom:2 }}>Todos los matches</div>}
          </>
        )}
        {rest.map(m => <MatchItem key={m.id} match={m} onFavorite={toggleFavorite} onRemove={removeMatch} />)}
      </div>
    </div>
  )
}

function MatchItem({ match, onFavorite, onRemove }) {
  const name = match.names
  const [confirm, setConfirm] = useState(false)

  return (
    <div style={{
      background:'#fff', borderRadius:16, padding:'14px 18px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      border:'1px solid #EDEBE9',
      borderLeft: match.is_favorite ? '4px solid #8B2020' : '1px solid #EDEBE9',
    }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ fontFamily:"'Poppins',system-ui", fontSize:20, fontWeight:700, color:'#1A0E0E' }}>{name?.name}</div>
          {match.my_favorite && <span style={{ fontSize:14 }}>⭐</span>}
        </div>
        <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, color:'#9A8080', marginTop:2 }}>
          {name?.origin} · {name?.gender==='f'?'Femenino':name?.gender==='m'?'Masculino':'Unisex'}
        </div>
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <button onClick={() => onFavorite(match)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, padding:4 }} title={match.is_favorite?'Quitar favorito':'Marcar favorito'}>
          {match.is_favorite ? '⭐' : '☆'}
        </button>
        {confirm ? (
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>onRemove(match)} style={{ background:'#FDEAEA', border:'1px solid #E09090', borderRadius:8, cursor:'pointer', fontSize:11, padding:'6px 10px', color:'#7C2020', fontFamily:"'Inter',system-ui", fontWeight:700 }}>Eliminar</button>
            <button onClick={()=>setConfirm(false)} style={{ background:'#F2F2F2', border:'1px solid #C8C4C2', borderRadius:8, cursor:'pointer', fontSize:11, padding:'6px 10px', color:'#5A4040', fontFamily:"'Inter',system-ui" }}>No</button>
          </div>
        ) : (
          <button onClick={()=>setConfirm(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:4, color:'#C8C4C2' }}>✕</button>
        )}
      </div>
    </div>
  )
}
