import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const GENDER_MAP = { 'Niña': 'f', 'Niño': 'm', 'Unisex': 'u' }
const POP_MAP    = { 'Muy común': [70,100], 'Moderado': [40,70], 'Poco común': [15,40], 'Raro': [0,15] }

function GenderBadge({ gender }) {
  const cfg = {
    f: { bg: '#FDEAEA', color: '#7C2020', label: '♀ Femenino' },
    m: { bg: '#DCEEFF', color: '#1A3E80', label: '♂ Masculino' },
    u: { bg: '#DFF2E8', color: '#145030', label: '⚭ Unisex' },
  }[gender] || { bg: '#F2F2F2', color: '#555', label: gender }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontFamily: "'Inter',system-ui", fontSize: 11, fontWeight: 700,
      marginBottom: 14,
    }}>
      {cfg.label}
    </div>
  )
}

function MatchOverlay({ name, onContinue, onViewMatches }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(165deg,#FFF4F1 0%,#FDDCDC 45%,#DFF2E8 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '40px 28px',
      animation: 'fadeIn .3s ease',
    }}>
      <div style={{ fontSize: 64, marginBottom: 8, animation: 'popIn .5s cubic-bezier(.175,.885,.32,1.275) both' }}>🎉</div>
      <div style={{ fontFamily: "'Poppins',system-ui", fontSize: 30, fontWeight: 700, color: '#1A0E0E', marginBottom: 6 }}>
        ¡Es un Match!
      </div>
      <div style={{ fontFamily: "'Inter',system-ui", fontSize: 14, color: '#5A4040', marginBottom: 24 }}>
        Los dos habéis elegido este nombre
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FDDCDC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '3px solid #fff' }}>👩</div>
        <span style={{ fontSize: 18, margin: '0 6px' }}>💕</span>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#DFF2E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '3px solid #fff' }}>👨</div>
      </div>
      <div style={{
        background: '#fff', borderRadius: 22, padding: '26px 28px',
        marginBottom: 22, border: '1.5px solid #C8C4C2', width: '100%',
      }}>
        <div style={{ fontFamily: "'Poppins',system-ui", fontSize: 46, fontWeight: 700, color: '#1A0E0E', marginBottom: 6, letterSpacing: -1 }}>
          {name?.name}
        </div>
        <div style={{ fontFamily: "'Inter',system-ui", fontSize: 13, color: '#5A4040' }}>
          {name?.origin}
        </div>
      </div>
      <button className="btn-primary" onClick={onContinue} style={{ marginBottom: 10 }}>
        Seguir buscando
      </button>
      <button className="btn-secondary" onClick={onViewMatches}>
        Ver todos los matches
      </button>
    </div>
  )
}

export default function Swipe({ session, coupleId, filters }) {
  const [names, setNames]         = useState([])
  const [index, setIndex]         = useState(0)
  const [history, setHistory]     = useState([])
  const [match, setMatch]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [swiping, setSwiping]     = useState(null) // 'left' | 'right'
  const [likeOpacity, setLikeOpacity] = useState(0)
  const [nopeOpacity, setNopeOpacity] = useState(0)

  const cardRef  = useRef(null)
  const isDragging = useRef(false)
  const startX   = useRef(0)
  const startY   = useRef(0)

  useEffect(() => { loadNames() }, [filters])

  async function loadNames() {
    setLoading(true)
    setIndex(0)
    setHistory([])

    // Fetch names already swiped
    const { data: swiped } = await supabase
      .from('swipes')
      .select('name_id')
      .eq('user_id', session.user.id)
      .eq('couple_id', coupleId)

    const swipedIds = swiped?.map(s => s.name_id) || []

    // Build query
    let q = supabase.from('names').select('*')

    if (filters.gender?.length) {
      const genders = filters.gender.map(g => GENDER_MAP[g]).filter(Boolean)
      if (genders.length) q = q.in('gender', genders)
    }
    if (filters.origin?.length) {
      q = q.in('origin', filters.origin)
    }

    const { data } = await q.order('popularity', { ascending: false }).limit(200)

    let filtered = data || []

    // Filter popularity ranges
    if (filters.popularity?.length) {
      const ranges = filters.popularity.map(p => POP_MAP[p]).filter(Boolean)
      filtered = filtered.filter(n =>
        ranges.some(([min, max]) => n.popularity >= min && n.popularity <= max)
      )
    }

    // Filter style tags
    if (filters.style?.length) {
      const styleLower = filters.style.map(s => s.toLowerCase().replace(' / ', '/'))
      filtered = filtered.filter(n =>
        n.style_tags?.some(tag => styleLower.some(s => tag.includes(s.split('/')[0].trim())))
      )
    }

    // Exclude already swiped
    filtered = filtered.filter(n => !swipedIds.includes(n.id))

    // Shuffle
    filtered.sort(() => Math.random() - 0.5)

    setNames(filtered)
    setLoading(false)
  }

  async function registerSwipe(name, direction) {
    await supabase.from('swipes').insert({
      user_id:   session.user.id,
      couple_id: coupleId,
      name_id:   name.id,
      direction,
    })

    if (direction === 'like') {
      // Check if partner already liked this name
      const { data: m } = await supabase
        .from('matches')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('name_id', name.id)
        .single()

      if (m) setMatch(name)
    }
  }

  function animateSwipe(dir) {
    setSwiping(dir)
    const card = cardRef.current
    if (!card) return
    const tx = dir === 'right' ? 130 : -130
    card.style.transition = 'transform .38s ease, opacity .38s ease'
    card.style.transform  = `translateX(${tx}%) rotate(${dir === 'right' ? 16 : -16}deg)`
    card.style.opacity    = '0'
    setTimeout(() => {
      card.style.transition = ''
      card.style.transform  = ''
      card.style.opacity    = '1'
      setSwiping(null)
      setLikeOpacity(0)
      setNopeOpacity(0)
    }, 400)
  }

  async function swipeRight() {
    if (index >= names.length || swiping) return
    const name = names[index]
    animateSwipe('right')
    setHistory(h => [...h, index])
    setTimeout(() => setIndex(i => i + 1), 390)
    await registerSwipe(name, 'like')
  }

  async function swipeLeft() {
    if (index >= names.length || swiping) return
    const name = names[index]
    animateSwipe('left')
    setHistory(h => [...h, index])
    setTimeout(() => setIndex(i => i + 1), 390)
    await registerSwipe(name, 'dislike')
  }

  function undo() {
    if (!history.length) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setIndex(prev)
  }

  // Drag handlers
  function onMouseDown(e) {
    isDragging.current = true
    startX.current = e.clientX
    startY.current = e.clientY
  }
  function onMouseMove(e) {
    if (!isDragging.current) return
    moveDrag(e.clientX - startX.current, e.clientY - startY.current)
  }
  function onMouseUp(e) {
    if (!isDragging.current) return
    isDragging.current = false
    endDrag(e.clientX - startX.current)
  }
  function onTouchStart(e) {
    isDragging.current = true
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }
  function onTouchMove(e) {
    if (!isDragging.current) return
    e.preventDefault()
    moveDrag(e.touches[0].clientX - startX.current, e.touches[0].clientY - startY.current)
  }
  function onTouchEnd(e) {
    if (!isDragging.current) return
    isDragging.current = false
    endDrag(e.changedTouches[0].clientX - startX.current)
  }

  function moveDrag(dx, dy) {
    const card = cardRef.current
    if (!card || swiping) return
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.07}deg)`
    const thr = 40
    if (dx > thr)       { setLikeOpacity(Math.min(1, (dx - thr) / 80)); setNopeOpacity(0) }
    else if (dx < -thr) { setNopeOpacity(Math.min(1, (-dx - thr) / 80)); setLikeOpacity(0) }
    else                { setLikeOpacity(0); setNopeOpacity(0) }
  }

  function endDrag(dx) {
    const card = cardRef.current
    if (!card) return
    if (dx > 80)       swipeRight()
    else if (dx < -80) swipeLeft()
    else {
      card.style.transition = 'transform .28s'
      card.style.transform  = ''
      setLikeOpacity(0)
      setNopeOpacity(0)
      setTimeout(() => { if (card) card.style.transition = '' }, 280)
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🌸</div>
        <div style={{ fontFamily: "'Inter',system-ui", color: '#9A8080', fontSize: 14 }}>Cargando nombres...</div>
      </div>
    )
  }

  const current = names[index]
  const remaining = names.length - index

  return (
    <>
      {match && (
        <MatchOverlay
          name={match}
          onContinue={() => setMatch(null)}
          onViewMatches={() => { setMatch(null); /* parent handles nav */ }}
        />
      )}

      {/* Header */}
      <div style={{
        padding: '14px 22px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        background: '#fff', borderBottom: '1px solid #EDEBE9',
      }}>
        <div style={{ fontFamily: "'Inter',system-ui", fontSize: 13, color: '#9A8080', fontWeight: 500 }}>
          {remaining > 0 ? `${remaining} nombres` : 'Sin más nombres'}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#EDEBE9', overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: '#8B2020',
          width: names.length ? `${Math.round((index / names.length) * 100)}%` : '0%',
          transition: 'width .3s',
        }} />
      </div>

      {/* Card stack */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px', position: 'relative',
      }}>
        {/* Shadow cards */}
        {remaining > 2 && (
          <div style={{ position: 'absolute', width: 'calc(100% - 80px)', height: '72%', background: '#fff', borderRadius: 26, border: '1px solid #EDEBE9', top: 40, zIndex: 0, opacity: .3, transform: 'scale(.88)' }} />
        )}
        {remaining > 1 && (
          <div style={{ position: 'absolute', width: 'calc(100% - 56px)', height: '74%', background: '#fff', borderRadius: 26, border: '1px solid #EDEBE9', top: 30, zIndex: 1, opacity: .6, transform: 'scale(.94)' }} />
        )}

        {current ? (
          <div
            ref={cardRef}
            style={{
              width: '100%', maxWidth: 320,
              background: '#fff', borderRadius: 26,
              padding: '28px 24px 24px', textAlign: 'center',
              border: '1.5px solid #C8C4C2',
              position: 'relative', zIndex: 2,
              cursor: 'grab', userSelect: 'none',
              boxShadow: '0 6px 28px rgba(26,14,14,.09)',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={e => { if (isDragging.current) { isDragging.current = false; endDrag(e.clientX - startX.current) } }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* LIKE / NOPE labels */}
            <div style={{ position: 'absolute', top: 20, right: 16, padding: '5px 14px', borderRadius: 10, fontFamily: "'Poppins',system-ui", fontSize: 15, fontWeight: 700, border: '2.5px solid #145030', color: '#145030', transform: 'rotate(15deg)', opacity: likeOpacity, pointerEvents: 'none', transition: 'opacity .05s' }}>
              LIKE
            </div>
            <div style={{ position: 'absolute', top: 20, left: 16, padding: '5px 14px', borderRadius: 10, fontFamily: "'Poppins',system-ui", fontSize: 15, fontWeight: 700, border: '2.5px solid #7C2020', color: '#7C2020', transform: 'rotate(-15deg)', opacity: nopeOpacity, pointerEvents: 'none', transition: 'opacity .05s' }}>
              NOPE
            </div>

            <GenderBadge gender={current.gender} />

            <div style={{ fontFamily: "'Poppins',system-ui", fontSize: 54, fontWeight: 700, color: '#1A0E0E', lineHeight: 1, marginBottom: 8, letterSpacing: -1.5 }}>
              {current.name}
            </div>
            <div style={{ fontFamily: "'Inter',system-ui", fontSize: 12, color: '#8B2020', fontWeight: 700, letterSpacing: .3, marginBottom: 10 }}>
              {current.origin}
            </div>
            <div style={{ fontFamily: "'Inter',system-ui", fontSize: 13, color: '#5A4040', lineHeight: 1.55, marginBottom: 18, padding: '0 4px' }}>
              {current.meaning}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Inter',system-ui", fontSize: 11, color: '#9A8080' }}>
                <span>Popularidad</span>
                <div style={{ width: 44, height: 3, background: '#EDEBE9', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#8B2020', width: `${current.popularity}%` }} />
                </div>
              </div>
              <div style={{ fontFamily: "'Inter',system-ui", fontSize: 11, color: '#9A8080' }}>
                {current.syllables} {current.syllables === 1 ? 'sílaba' : 'sílabas'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎊</div>
            <div style={{ fontFamily: "'Poppins',system-ui", fontSize: 20, fontWeight: 700, color: '#1A0E0E', marginBottom: 8 }}>
              ¡Has visto todos los nombres!
            </div>
            <div style={{ fontFamily: "'Inter',system-ui", fontSize: 14, color: '#9A8080', marginBottom: 24 }}>
              Cambia los filtros para ver más
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {current && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '16px 24px 20px' }}>
          {/* Nope */}
          <button
            onClick={swipeLeft}
            style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#FDEAEA', border: '2.5px solid #E09090', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.09)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C2020" strokeWidth="2.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Undo */}
          <button
            onClick={undo}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #C8C0C0', cursor: 'pointer', background: '#ECEAEA', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .15s', opacity: history.length ? 1 : 0.3 }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.09)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>
            </svg>
          </button>

          {/* Like — verde sólido */}
          <button
            onClick={swipeRight}
            style={{ width: 64, height: 64, borderRadius: '50%', border: '2.5px solid #165C2E', cursor: 'pointer', background: '#2E9954', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.09)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn  { from { transform:scale(0); opacity:0 } to { transform:scale(1); opacity:1 } }
      `}</style>
    </>
  )
}
