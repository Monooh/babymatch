import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const COLLECTION_TAG_MAP = {
  'bíblico':'bíblico','tendencia2026':'popular','influencer':'moderno',
  'realeza':'noble','naturaleza':'naturaleza','mitológico':'mitológico',
  'cortisimos':'minimalista','espiritual':'espiritual','literario':'literario','internacional':'internacional',
}
const GENDER_MAP = { 'Niña':'f','Niño':'m','Unisex':'u' }
const POP_MAP    = { 'Muy común':[70,100],'Moderado':[40,70],'Poco común':[15,40],'Raro':[0,15] }

function GenderBadge({ gender }) {
  const cfg = {
    f:{ bg:'rgba(253,220,220,0.9)', color:'#7C2020', label:'Femenino' },
    m:{ bg:'rgba(220,238,255,0.9)', color:'#1A3E80', label:'Masculino' },
    u:{ bg:'rgba(223,242,232,0.9)', color:'#145030', label:'Unisex' },
  }[gender] || { bg:'rgba(240,240,240,0.9)', color:'#555', label:gender }
  return (
    <span style={{ display:'inline-block', padding:'4px 14px', borderRadius:20, background:cfg.bg, color:cfg.color, fontFamily:"'Inter',system-ui", fontSize:12, fontWeight:700, lineHeight:'18px' }}>
      {cfg.label}
    </span>
  )
}

function MatchOverlay({ name, onContinue }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,background:'linear-gradient(165deg,#FFF4F1 0%,#FDDCDC 45%,#DFF2E8 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 28px' }}>
      <div style={{ fontSize:64,marginBottom:8 }}>🎉</div>
      <div style={{ fontFamily:"'Poppins',system-ui",fontSize:30,fontWeight:700,color:'#1A0E0E',marginBottom:6 }}>¡Es un Match!</div>
      <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#5A4040',marginBottom:24 }}>Los dos habéis elegido este nombre</div>
      <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:6,marginBottom:20 }}>
        <div style={{ width:48,height:48,borderRadius:'50%',background:'#FDDCDC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:'3px solid #fff' }}>👩</div>
        <span style={{ fontSize:22,margin:'0 8px' }}>💕</span>
        <div style={{ width:48,height:48,borderRadius:'50%',background:'#DFF2E8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:'3px solid #fff' }}>👨</div>
      </div>
      <div style={{ background:'#fff',borderRadius:24,padding:'28px 32px',marginBottom:24,border:'1.5px solid #C8C4C2',width:'100%' }}>
        <div style={{ fontFamily:"'Poppins',system-ui",fontSize:48,fontWeight:700,color:'#1A0E0E',marginBottom:6,letterSpacing:-1 }}>{name?.name}</div>
        <div style={{ fontFamily:"'Inter',system-ui",fontSize:13,color:'#5A4040' }}>{name?.origin}</div>
      </div>
      <button className="btn-primary" onClick={onContinue}>Seguir buscando</button>
    </div>
  )
}

export default function Swipe({ session, coupleId, filters }) {
  const [names, setNames]     = useState([])
  const [index, setIndex]     = useState(0)
  const [history, setHistory] = useState([])
  const [match, setMatch]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [likeOp, setLikeOp]   = useState(0)
  const [nopeOp, setNopeOp]   = useState(0)

  const namesRef   = useRef([])
  const indexRef   = useRef(0)
  const historyRef = useRef([])
  const animating  = useRef(false)
  const cardRef    = useRef(null)
  const isDragging = useRef(false)
  const startX     = useRef(0)

  useEffect(() => { loadNames() }, [JSON.stringify(filters)])

  async function loadNames() {
    setLoading(true)
    setIndex(0); indexRef.current = 0
    setHistory([]); historyRef.current = []

    const { data: swiped } = await supabase
      .from('swipes').select('name_id')
      .eq('user_id', session.user.id).eq('couple_id', coupleId)
    const swipedIds = new Set(swiped?.map(s => s.name_id) || [])

    let q = supabase.from('names').select('*')
    if (filters.gender?.length) { const g=filters.gender.map(x=>GENDER_MAP[x]).filter(Boolean); if(g.length) q=q.in('gender',g) }
    if (filters.origin?.length) q=q.in('origin',filters.origin)
    const { data } = await q.order('popularity',{ascending:false}).limit(1000)
    let f = data || []

    if (filters.popularity?.length) { const r=filters.popularity.map(p=>POP_MAP[p]).filter(Boolean); f=f.filter(n=>r.some(([a,b])=>n.popularity>=a&&n.popularity<=b)) }
    if (filters.style?.length) { const sl=filters.style.map(s=>s.toLowerCase().replace(' / ','/')); f=f.filter(n=>n.style_tags?.some(t=>sl.some(s=>t.includes(s.split('/')[0].trim())))) }
    if (filters.collections?.length) { const ct=filters.collections.map(c=>COLLECTION_TAG_MAP[c]).filter(Boolean); f=f.filter(n=>ct.some(tag=>n.style_tags?.some(t=>t.toLowerCase().includes(tag.toLowerCase())))) }
    if (filters.syllables?.length) { f=f.filter(n=>{ if(filters.syllables.includes('5+')&&n.syllables>=5) return true; return filters.syllables.filter(x=>x!=='5+').includes(String(n.syllables)) }) }
    if (filters.startLetters?.length) { f=f.filter(n=>filters.startLetters.some(l=>n.name.toLowerCase().startsWith(l.toLowerCase()))) }

    f = f.filter(n => !swipedIds.has(n.id))
    f.sort(() => Math.random() - 0.5)
    namesRef.current = f
    setNames(f)
    setLoading(false)
  }

  // Save swipe to DB — returns the new swipe id
  async function saveSwipe(name, direction) {
    // Always delete first to avoid unique constraint issues
    await supabase.from('swipes').delete()
      .eq('user_id', session.user.id)
      .eq('couple_id', coupleId)
      .eq('name_id', name.id)

    const { data: sw, error } = await supabase
      .from('swipes')
      .insert({ user_id: session.user.id, couple_id: coupleId, name_id: name.id, direction })
      .select('id')
      .single()

    if (error) {
      console.error('saveSwipe error:', error)
      return null
    }

    // Check for match after like
    if (direction === 'like') {
      // Small delay to let the trigger run
      await new Promise(r => setTimeout(r, 300))
      const { data: m } = await supabase
        .from('matches').select('id')
        .eq('couple_id', coupleId).eq('name_id', name.id)
        .single()
      if (m) setMatch(name)
    } else {
      await supabase.from('matches').delete()
        .eq('couple_id', coupleId).eq('name_id', name.id)
    }

    return sw?.id
  }

  function animateCard(dir, cb) {
    if (animating.current) return
    animating.current = true
    setLikeOp(0); setNopeOp(0)
    const card = cardRef.current
    if (card) {
      card.style.transition = 'transform .28s ease, opacity .28s ease'
      card.style.transform  = `translateX(${dir==='right'?105:-105}%) rotate(${dir==='right'?10:-10}deg)`
      card.style.opacity    = '0'
    }
    setTimeout(async () => {
      await cb()
      const next = indexRef.current + 1
      indexRef.current = next
      setIndex(next)
      if (card) {
        card.style.transition = 'none'
        card.style.transform  = ''
        card.style.opacity    = '1'
        setTimeout(() => { if(card) card.style.transition='' }, 50)
      }
      animating.current = false
    }, 280)
  }

  function swipeRight() {
    const idx = indexRef.current
    if (idx >= namesRef.current.length || animating.current) return
    const name = namesRef.current[idx]
    animateCard('right', async () => {
      const swipeId = await saveSwipe(name, 'like')
      const entry = { idx, swipeId, nameId: name.id, direction: 'like' }
      historyRef.current = [...historyRef.current, entry]
      setHistory([...historyRef.current])
    })
  }

  function swipeLeft() {
    const idx = indexRef.current
    if (idx >= namesRef.current.length || animating.current) return
    const name = namesRef.current[idx]
    animateCard('left', async () => {
      const swipeId = await saveSwipe(name, 'dislike')
      const entry = { idx, swipeId, nameId: name.id, direction: 'dislike' }
      historyRef.current = [...historyRef.current, entry]
      setHistory([...historyRef.current])
    })
  }

  async function undo() {
    if (!historyRef.current.length || animating.current) return
    const last = historyRef.current[historyRef.current.length - 1]
    if (last.swipeId) {
      await supabase.from('swipes').delete().eq('id', last.swipeId)
      if (last.direction === 'like') {
        await supabase.from('matches').delete()
          .eq('couple_id', coupleId).eq('name_id', last.nameId)
      }
    }
    historyRef.current = historyRef.current.slice(0,-1)
    setHistory([...historyRef.current])
    indexRef.current = last.idx
    setIndex(last.idx)
  }

  function moveDrag(dx) {
    const card = cardRef.current
    if (!card || animating.current) return
    card.style.transform = `translate(${dx}px,0) rotate(${dx*.05}deg)`
    if (dx>40)       { setLikeOp(Math.min(1,(dx-40)/80)); setNopeOp(0) }
    else if (dx<-40) { setNopeOp(Math.min(1,(-dx-40)/80)); setLikeOp(0) }
    else             { setLikeOp(0); setNopeOp(0) }
  }
  function endDrag(dx) {
    if (dx > 80) swipeRight()
    else if (dx < -80) swipeLeft()
    else {
      const card = cardRef.current
      if (card) { card.style.transition='transform .22s'; card.style.transform=''; setTimeout(()=>{ if(card) card.style.transition='' },220) }
      setLikeOp(0); setNopeOp(0)
    }
  }
  function onMD(e) { isDragging.current=true; startX.current=e.clientX; document.addEventListener('mousemove',onMM); document.addEventListener('mouseup',onMU) }
  function onMM(e) { if(isDragging.current) moveDrag(e.clientX-startX.current) }
  function onMU(e) { if(!isDragging.current) return; isDragging.current=false; document.removeEventListener('mousemove',onMM); document.removeEventListener('mouseup',onMU); endDrag(e.clientX-startX.current) }
  function onTS(e) { isDragging.current=true; startX.current=e.touches[0].clientX; document.addEventListener('touchmove',onTM,{passive:false}); document.addEventListener('touchend',onTE) }
  function onTM(e) { if(!isDragging.current) return; e.preventDefault(); moveDrag(e.touches[0].clientX-startX.current) }
  function onTE(e) { if(!isDragging.current) return; isDragging.current=false; document.removeEventListener('touchmove',onTM); document.removeEventListener('touchend',onTE); endDrag(e.changedTouches[0].clientX-startX.current) }

  if (loading) return (
    <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12 }}>
      <div style={{ fontSize:48 }}>🌸</div>
      <div style={{ fontFamily:"'Inter',system-ui",color:'#9A8080',fontSize:14 }}>Cargando nombres...</div>
    </div>
  )

  const current   = names[index]
  const remaining = names.length - index
  const nameLen   = current?.name?.length || 0
  const fontSize  = nameLen > 12 ? 28 : nameLen > 9 ? 36 : nameLen > 6 ? 44 : 54

  return (
    <>
      {match && <MatchOverlay name={match} onContinue={()=>setMatch(null)} />}

      {/* Counter + progress */}
      <div style={{ padding:'10px 20px 8px',display:'flex',alignItems:'center',justifyContent:'flex-end',background:'#fff',borderBottom:'1px solid #EDEBE9',flexShrink:0 }}>
        <span style={{ fontFamily:"'Inter',system-ui",fontSize:13,color:'#9A8080',fontWeight:500 }}>
          {remaining > 0 ? `${remaining} nombres` : 'Sin más nombres'}
        </span>
      </div>
      <div style={{ height:3,background:'#EDEBE9',flexShrink:0 }}>
        <div style={{ height:'100%',background:'#8B2020',width:names.length?`${Math.round((index/names.length)*100)}%`:'0%',transition:'width .3s' }} />
      </div>

      {/* Card area — Tinder-style, card takes most of screen */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',padding:'12px 16px 0',position:'relative',minHeight:0 }}>

        {/* Shadow cards behind */}
        {remaining > 2 && (
          <div style={{ position:'absolute',left:24,right:24,top:20,bottom:8,background:'#fff',borderRadius:20,border:'1px solid #E8E4E2',opacity:.35,transform:'scale(.94) translateY(8px)',zIndex:0 }} />
        )}
        {remaining > 1 && (
          <div style={{ position:'absolute',left:20,right:20,top:16,bottom:6,background:'#fff',borderRadius:20,border:'1px solid #E8E4E2',opacity:.65,transform:'scale(.97) translateY(4px)',zIndex:1 }} />
        )}

        {current ? (
          <div ref={cardRef}
            style={{
              flex:1, position:'relative', zIndex:2,
              background:'#fff', borderRadius:20,
              border:'1px solid #D8D4D2',
              boxShadow:'0 4px 24px rgba(26,14,14,.10)',
              cursor:'grab', userSelect:'none',
              display:'flex', flexDirection:'column',
              padding:'24px 22px 20px',
              overflow:'hidden',
            }}
            onMouseDown={onMD}
            onMouseLeave={e=>{ if(isDragging.current){isDragging.current=false;endDrag(e.clientX-startX.current)} }}
            onTouchStart={onTS}
          >
            {/* LIKE / NOPE labels */}
            <div style={{ position:'absolute',top:20,right:16,padding:'6px 14px',borderRadius:10,fontFamily:"'Poppins',system-ui",fontSize:16,fontWeight:800,border:'3px solid #145030',color:'#145030',transform:'rotate(12deg)',opacity:likeOp,pointerEvents:'none',letterSpacing:1 }}>LIKE</div>
            <div style={{ position:'absolute',top:20,left:16,padding:'6px 14px',borderRadius:10,fontFamily:"'Poppins',system-ui",fontSize:16,fontWeight:800,border:'3px solid #7C2020',color:'#7C2020',transform:'rotate(-12deg)',opacity:nopeOp,pointerEvents:'none',letterSpacing:1 }}>NOPE</div>

            {/* Card content — centered vertically */}
            <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:0 }}>
              <div style={{ marginBottom:16 }}>
                <GenderBadge gender={current.gender} />
              </div>
              <div style={{ fontFamily:"'Poppins',system-ui",fontSize:fontSize,fontWeight:700,color:'#1A0E0E',lineHeight:1.05,marginBottom:8,letterSpacing:fontSize>40?-1.5:-0.5,wordBreak:'break-word',maxWidth:'100%' }}>
                {current.name}
              </div>
              <div style={{ fontFamily:"'Inter',system-ui",fontSize:13,color:'#8B2020',fontWeight:700,letterSpacing:.3,marginBottom:14 }}>
                {current.origin}
              </div>
              <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#5A4040',lineHeight:1.6,padding:'0 8px',maxWidth:280 }}>
                {current.meaning}
              </div>
            </div>

            {/* Bottom stats bar */}
            <div style={{ borderTop:'1px solid #F0EEEC',paddingTop:14,display:'flex',justifyContent:'center',gap:24 }}>
              <div style={{ display:'flex',alignItems:'center',gap:6,fontFamily:"'Inter',system-ui",fontSize:12,color:'#9A8080' }}>
                <span>Popularidad</span>
                <div style={{ width:48,height:3,background:'#EDEBE9',borderRadius:2,overflow:'hidden' }}>
                  <div style={{ height:'100%',background:'#8B2020',borderRadius:2,width:`${current.popularity}%` }} />
                </div>
              </div>
              <div style={{ fontFamily:"'Inter',system-ui",fontSize:12,color:'#9A8080' }}>
                {current.syllables} {current.syllables===1?'sílaba':'sílabas'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,textAlign:'center' }}>
            <div style={{ fontSize:48 }}>🎊</div>
            <div style={{ fontFamily:"'Poppins',system-ui",fontSize:20,fontWeight:700,color:'#1A0E0E' }}>¡Has visto todos!</div>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#9A8080' }}>Cambia los filtros para ver más</div>
          </div>
        )}
      </div>

      {/* Action buttons — with breathing room above nav */}
      {current && (
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:20,padding:'20px 24px 24px',flexShrink:0 }}>
          <button onClick={swipeLeft}
            style={{ width:64,height:64,borderRadius:'50%',border:'2px solid #EFAAAA',cursor:'pointer',background:'#FDEAEA',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(200,80,80,.15)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C84040" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button onClick={undo}
            style={{ width:50,height:50,borderRadius:'50%',border:'2px solid #C8C0C0',cursor:'pointer',background:'#F0EEEE',display:'flex',alignItems:'center',justifyContent:'center',opacity:history.length?1:0.3,boxShadow:'0 2px 8px rgba(0,0,0,.08)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A4040" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>
          </button>
          <button onClick={swipeRight}
            style={{ width:64,height:64,borderRadius:'50%',border:'2px solid #1A7040',cursor:'pointer',background:'#2E9954',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(46,153,84,.3)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      )}
    </>
  )
}
