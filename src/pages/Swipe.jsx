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
    f: { bg:'#FDEAEA', color:'#7C2020', label:'Femenino' },
    m: { bg:'#DCEEFF', color:'#1A3E80', label:'Masculino' },
    u: { bg:'#DFF2E8', color:'#145030', label:'Unisex' },
  }[gender] || { bg:'#F2F2F2', color:'#555', label: gender }
  return (
    <div style={{ textAlign:'center', marginBottom:14 }}>
      <span style={{
        display:'inline-block',
        padding:'4px 14px', borderRadius:20,
        background:cfg.bg, color:cfg.color,
        fontFamily:"'Inter',system-ui",
        fontSize:11, fontWeight:700,
        lineHeight:'20px',
        verticalAlign:'middle',
      }}>
        {cfg.label}
      </span>
    </div>
  )
}

function MatchOverlay({ name, onContinue }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,background:'linear-gradient(165deg,#FFF4F1 0%,#FDDCDC 45%,#DFF2E8 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 28px' }}>
      <div style={{ fontSize:64,marginBottom:8 }}>🎉</div>
      <div style={{ fontFamily:"'Poppins',system-ui",fontSize:30,fontWeight:700,color:'#1A0E0E',marginBottom:6 }}>¡Es un Match!</div>
      <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#5A4040',marginBottom:24 }}>Los dos habéis elegido este nombre</div>
      <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:6,marginBottom:20 }}>
        <div style={{ width:42,height:42,borderRadius:'50%',background:'#FDDCDC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,border:'3px solid #fff' }}>👩</div>
        <span style={{ fontSize:18,margin:'0 6px' }}>💕</span>
        <div style={{ width:42,height:42,borderRadius:'50%',background:'#DFF2E8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,border:'3px solid #fff' }}>👨</div>
      </div>
      <div style={{ background:'#fff',borderRadius:22,padding:'26px 28px',marginBottom:22,border:'1.5px solid #C8C4C2',width:'100%' }}>
        <div style={{ fontFamily:"'Poppins',system-ui",fontSize:46,fontWeight:700,color:'#1A0E0E',marginBottom:6,letterSpacing:-1 }}>{name?.name}</div>
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
  const [animating, setAnimating] = useState(false)  // blocks swipe during animation
  const [likeOp, setLikeOp]   = useState(0)
  const [nopeOp, setNopeOp]   = useState(0)
  const cardRef    = useRef(null)
  const isDragging = useRef(false)
  const startX     = useRef(0)
  const startY     = useRef(0)
  // Keep a ref to current index to avoid stale closures
  const indexRef   = useRef(0)

  useEffect(() => { loadNames() }, [JSON.stringify(filters)])

  async function loadNames() {
    setLoading(true)
    setIndex(0); indexRef.current = 0
    setHistory([])

    const { data: swiped } = await supabase
      .from('swipes').select('name_id')
      .eq('user_id', session.user.id).eq('couple_id', coupleId)
    const swipedIds = new Set(swiped?.map(s => s.name_id) || [])

    let q = supabase.from('names').select('*')
    if (filters.gender?.length) {
      const g = filters.gender.map(x => GENDER_MAP[x]).filter(Boolean)
      if (g.length) q = q.in('gender', g)
    }
    if (filters.origin?.length) q = q.in('origin', filters.origin)

    const { data } = await q.order('popularity', { ascending: false }).limit(1000)
    let filtered = data || []

    if (filters.popularity?.length) {
      const ranges = filters.popularity.map(p => POP_MAP[p]).filter(Boolean)
      filtered = filtered.filter(n => ranges.some(([min,max]) => n.popularity>=min && n.popularity<=max))
    }
    if (filters.style?.length) {
      const sl = filters.style.map(s => s.toLowerCase().replace(' / ','/'))
      filtered = filtered.filter(n => n.style_tags?.some(t => sl.some(s => t.includes(s.split('/')[0].trim()))))
    }
    if (filters.collections?.length) {
      const ct = filters.collections.map(c => COLLECTION_TAG_MAP[c]).filter(Boolean)
      filtered = filtered.filter(n => ct.some(tag => n.style_tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))))
    }
    // Fix 10: 5+ syllables
    if (filters.syllables?.length) {
      filtered = filtered.filter(n => {
        const s = String(n.syllables)
        if (filters.syllables.includes('5+') && n.syllables >= 5) return true
        return filters.syllables.filter(x => x !== '5+').includes(s)
      })
    }
    // Fix 9: multiple letters
    if (filters.startLetters?.length) {
      filtered = filtered.filter(n =>
        filters.startLetters.some(l => n.name.toLowerCase().startsWith(l.toLowerCase()))
      )
    }

    // Remove already swiped
    filtered = filtered.filter(n => !swipedIds.has(n.id))
    filtered.sort(() => Math.random() - 0.5)
    setNames(filtered)
    setLoading(false)
  }

  async function registerSwipe(name, direction) {
    // Upsert: delete existing then insert fresh
    await supabase.from('swipes').delete()
      .eq('user_id', session.user.id).eq('couple_id', coupleId).eq('name_id', name.id)

    const { data: sw } = await supabase.from('swipes').insert({
      user_id: session.user.id, couple_id: coupleId, name_id: name.id, direction
    }).select('id').single()

    if (direction === 'like') {
      const { data: m } = await supabase.from('matches').select('*')
        .eq('couple_id', coupleId).eq('name_id', name.id).single()
      if (m) setMatch(name)
    } else {
      await supabase.from('matches').delete().eq('couple_id', coupleId).eq('name_id', name.id)
    }
    return sw?.id
  }

  // Fix 3: animate card OUT, then update index, then reset card
  function doSwipe(dir, afterFn) {
    if (animating) return
    setAnimating(true)
    const card = cardRef.current
    if (card) {
      card.style.transition = 'transform .32s ease, opacity .32s ease'
      card.style.transform  = `translateX(${dir==='right'?120:-120}%) rotate(${dir==='right'?14:-14}deg)`
      card.style.opacity    = '0'
    }
    setTimeout(async () => {
      // Run the DB operation
      await afterFn()
      // Advance index
      const nextIdx = indexRef.current + 1
      indexRef.current = nextIdx
      setIndex(nextIdx)
      setLikeOp(0); setNopeOp(0)
      // Reset card instantly (no transition) then make visible
      if (card) {
        card.style.transition = 'none'
        card.style.transform  = ''
        card.style.opacity    = '1'
      }
      setAnimating(false)
    }, 320)
  }

  async function swipeRight() {
    if (indexRef.current >= names.length || animating) return
    const name = names[indexRef.current]
    doSwipe('right', async () => {
      const swipeId = await registerSwipe(name, 'like')
      setHistory(h => [...h, { idx: indexRef.current, swipeId, direction:'like', nameId: name.id }])
    })
  }

  async function swipeLeft() {
    if (indexRef.current >= names.length || animating) return
    const name = names[indexRef.current]
    doSwipe('left', async () => {
      const swipeId = await registerSwipe(name, 'dislike')
      setHistory(h => [...h, { idx: indexRef.current, swipeId, direction:'dislike', nameId: name.id }])
    })
  }

  // Fix 4: undo deletes swipe from DB correctly
  async function undo() {
    if (!history.length || animating) return
    const last = history[history.length - 1]
    if (last.swipeId) {
      await supabase.from('swipes').delete().eq('id', last.swipeId)
      if (last.direction === 'like') {
        await supabase.from('matches').delete().eq('couple_id', coupleId).eq('name_id', last.nameId)
      }
    }
    setHistory(h => h.slice(0,-1))
    const prevIdx = last.idx
    indexRef.current = prevIdx
    setIndex(prevIdx)
    const card = cardRef.current
    if (card) {
      card.style.transition = 'transform .25s cubic-bezier(.34,1.56,.64,1)'
      card.style.transform  = 'scale(1.05)'
      setTimeout(() => {
        if (card) { card.style.transform='scale(1)'; setTimeout(()=>card.style.transition='',260) }
      }, 260)
    }
  }

  function moveDrag(dx, dy) {
    const card = cardRef.current
    if (!card || animating) return
    card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx*.07}deg)`
    if (dx>40)       { setLikeOp(Math.min(1,(dx-40)/80)); setNopeOp(0) }
    else if (dx<-40) { setNopeOp(Math.min(1,(-dx-40)/80)); setLikeOp(0) }
    else             { setLikeOp(0); setNopeOp(0) }
  }
  function endDrag(dx) {
    if (dx>80) swipeRight()
    else if (dx<-80) swipeLeft()
    else {
      const card = cardRef.current
      if (card) { card.style.transition='transform .28s'; card.style.transform=''; setTimeout(()=>{ if(card) card.style.transition='' },280) }
      setLikeOp(0); setNopeOp(0)
    }
  }

  function onMouseDown(e) { isDragging.current=true; startX.current=e.clientX; document.addEventListener('mousemove',onMM); document.addEventListener('mouseup',onMU) }
  function onMM(e) { if(isDragging.current) moveDrag(e.clientX-startX.current,0) }
  function onMU(e) { if(!isDragging.current) return; isDragging.current=false; document.removeEventListener('mousemove',onMM); document.removeEventListener('mouseup',onMU); endDrag(e.clientX-startX.current) }
  function onTouchStart(e) { isDragging.current=true; startX.current=e.touches[0].clientX; document.addEventListener('touchmove',onTM,{passive:false}); document.addEventListener('touchend',onTE) }
  function onTM(e) { if(!isDragging.current) return; e.preventDefault(); moveDrag(e.touches[0].clientX-startX.current,0) }
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
  const nameFontSize = nameLen > 10 ? 30 : nameLen > 7 ? 40 : 52

  return (
    <>
      {match && <MatchOverlay name={match} onContinue={() => setMatch(null)} />}

      <div style={{ padding:'12px 22px 10px',display:'flex',alignItems:'center',justifyContent:'flex-end',background:'#fff',borderBottom:'1px solid #EDEBE9' }}>
        <div style={{ fontFamily:"'Inter',system-ui",fontSize:13,color:'#9A8080',fontWeight:500 }}>
          {remaining > 0 ? `${remaining} nombres` : 'Sin más nombres'}
        </div>
      </div>
      <div style={{ height:3,background:'#EDEBE9',overflow:'hidden' }}>
        <div style={{ height:'100%',background:'#8B2020',width:names.length?`${Math.round((index/names.length)*100)}%`:'0%',transition:'width .3s' }} />
      </div>

      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 24px',position:'relative' }}>
        {remaining > 2 && <div style={{ position:'absolute',width:'calc(100% - 80px)',height:'72%',background:'#fff',borderRadius:26,border:'1px solid #EDEBE9',top:36,zIndex:0,opacity:.3,transform:'scale(.88)' }} />}
        {remaining > 1 && <div style={{ position:'absolute',width:'calc(100% - 56px)',height:'74%',background:'#fff',borderRadius:26,border:'1px solid #EDEBE9',top:26,zIndex:1,opacity:.6,transform:'scale(.94)' }} />}

        {current ? (
          <div ref={cardRef}
            style={{ width:'100%',maxWidth:320,background:'#fff',borderRadius:26,padding:'24px 22px 22px',textAlign:'center',border:'1.5px solid #C8C4C2',position:'relative',zIndex:2,cursor:'grab',userSelect:'none',boxShadow:'0 6px 28px rgba(26,14,14,.09)' }}
            onMouseDown={onMouseDown} onMouseLeave={e=>{ if(isDragging.current){isDragging.current=false;endDrag(e.clientX-startX.current)} }}
            onTouchStart={onTouchStart}
          >
            <div style={{ position:'absolute',top:18,right:14,padding:'5px 12px',borderRadius:10,fontFamily:"'Poppins',system-ui",fontSize:14,fontWeight:700,border:'2.5px solid #145030',color:'#145030',transform:'rotate(15deg)',opacity:likeOp,pointerEvents:'none' }}>LIKE</div>
            <div style={{ position:'absolute',top:18,left:14,padding:'5px 12px',borderRadius:10,fontFamily:"'Poppins',system-ui",fontSize:14,fontWeight:700,border:'2.5px solid #7C2020',color:'#7C2020',transform:'rotate(-15deg)',opacity:nopeOp,pointerEvents:'none' }}>NOPE</div>
            <GenderBadge gender={current.gender} />
            <div style={{ fontFamily:"'Poppins',system-ui",fontSize:nameFontSize,fontWeight:700,color:'#1A0E0E',lineHeight:1.1,marginBottom:8,letterSpacing: nameFontSize>40?-1.5:-0.5,wordBreak:'break-word' }}>
              {current.name}
            </div>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:12,color:'#8B2020',fontWeight:700,letterSpacing:.3,marginBottom:10 }}>{current.origin}</div>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:13,color:'#5A4040',lineHeight:1.55,marginBottom:16,padding:'0 4px' }}>{current.meaning}</div>
            <div style={{ display:'flex',justifyContent:'center',gap:18 }}>
              <div style={{ display:'flex',alignItems:'center',gap:5,fontFamily:"'Inter',system-ui",fontSize:11,color:'#9A8080' }}>
                <span>Popularidad</span>
                <div style={{ width:44,height:3,background:'#EDEBE9',borderRadius:2,overflow:'hidden' }}>
                  <div style={{ height:'100%',background:'#8B2020',width:`${current.popularity}%` }} />
                </div>
              </div>
              <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,color:'#9A8080' }}>{current.syllables} {current.syllables===1?'sílaba':'sílabas'}</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign:'center',padding:40 }}>
            <div style={{ fontSize:48,marginBottom:16 }}>🎊</div>
            <div style={{ fontFamily:"'Poppins',system-ui",fontSize:20,fontWeight:700,color:'#1A0E0E',marginBottom:8 }}>¡Has visto todos los nombres!</div>
            <div style={{ fontFamily:"'Inter',system-ui",fontSize:14,color:'#9A8080' }}>Cambia los filtros para ver más</div>
          </div>
        )}
      </div>

      {current && (
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:16,padding:'12px 24px 16px' }}>
          <button onClick={swipeLeft} style={{ width:62,height:62,borderRadius:'50%',border:'2.5px solid #E09090',cursor:'pointer',background:'#FDEAEA',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C2020" strokeWidth="2.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button onClick={undo} style={{ width:46,height:46,borderRadius:'50%',border:'2px solid #C8C0C0',cursor:'pointer',background:'#ECEAEA',display:'flex',alignItems:'center',justifyContent:'center',opacity:history.length?1:0.3 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>
          </button>
          <button onClick={swipeRight} style={{ width:62,height:62,borderRadius:'50%',border:'2.5px solid #165C2E',cursor:'pointer',background:'#2E9954',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      )}
    </>
  )
}
