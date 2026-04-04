import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Filters from './pages/Filters'
import Swipe from './pages/Swipe'
import Matches from './pages/Matches'
import Likes from './pages/Likes'
import './index.css'

export default function App() {
  const [session, setSession]       = useState(null)
  const [coupleId, setCoupleId]     = useState(null)
  const [coupleCode, setCoupleCode] = useState('')
  const [page, setPage]             = useState('swipe')
  const [showMenu, setShowMenu]     = useState(false)
  const [filters, setFilters]       = useState({ gender:[], origin:[], style:[], popularity:[] })
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) fetchCouple() }, [session])

  async function fetchCouple() {
    const uid = session.user.id
    const { data } = await supabase
      .from('couples')
      .select('id, invite_code')
      .or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`)
      .eq('status', 'active')
      .single()
    if (data) { setCoupleId(data.id); setCoupleCode(data.invite_code) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null); setCoupleId(null); setShowMenu(false)
  }

  function copyCode() { navigator.clipboard.writeText(coupleCode); setShowMenu(false) }

  function shareCode() {
    if (navigator.share) {
      navigator.share({ title:'BabyMatch', text:`Únete con el código: ${coupleCode}\n\nhttps://babymatch.vercel.app` })
    } else copyCode()
    setShowMenu(false)
  }

  if (loading) return (
    <div className="app-shell" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontSize:48 }}>🌸</div>
    </div>
  )

  if (!session) return <div className="app-shell"><Login /></div>
  if (!coupleId) return <div className="app-shell"><Setup session={session} onCouple={(id) => { setCoupleId(id); fetchCouple() }} /></div>

  return (
    <div className="app-shell">

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'#fff', borderBottom:'1px solid #EDEBE9', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:"'Poppins',system-ui", fontSize:16, fontWeight:700, color:'#1A0E0E' }}>
          Baby<span style={{ color:'#8B2020' }}>Match</span>
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowMenu(m => !m)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, padding:4 }}>
            👤
          </button>
          {showMenu && (
            <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, background:'#fff', borderRadius:14, border:'1px solid #EDEBE9', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:220, zIndex:100, overflow:'hidden' }}>
              {coupleCode && (
                <>
                  <div style={{ padding:'12px 16px 4px', fontFamily:"'Inter',system-ui", fontSize:11, fontWeight:700, color:'#9A8080', textTransform:'uppercase', letterSpacing:1 }}>Código de pareja</div>
                  <div style={{ padding:'4px 16px 12px', fontFamily:"'Poppins',system-ui", fontSize:20, fontWeight:700, color:'#8B2020', letterSpacing:3 }}>{coupleCode}</div>
                  <button onClick={shareCode} style={{ width:'100%', padding:'12px 16px', background:'none', border:'none', borderTop:'1px solid #EDEBE9', cursor:'pointer', fontFamily:"'Inter',system-ui", fontSize:14, color:'#1A0E0E', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    📤 Compartir código
                  </button>
                  <button onClick={copyCode} style={{ width:'100%', padding:'12px 16px', background:'none', border:'none', borderTop:'1px solid #EDEBE9', cursor:'pointer', fontFamily:"'Inter',system-ui", fontSize:14, color:'#1A0E0E', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    📋 Copiar código
                  </button>
                </>
              )}
              <button onClick={handleSignOut} style={{ width:'100%', padding:'12px 16px', background:'none', border:'none', borderTop:'1px solid #EDEBE9', cursor:'pointer', fontFamily:"'Inter',system-ui", fontSize:14, color:'#8B2020', textAlign:'left', display:'flex', alignItems:'center', gap:8, fontWeight:700 }}>
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {showMenu && <div onClick={() => setShowMenu(false)} style={{ position:'fixed', inset:0, zIndex:19 }} />}

      {/* Pages */}
      {page === 'filters' && <Filters filters={filters} onChange={setFilters} onDone={() => setPage('swipe')} />}
      {page === 'swipe'   && <Swipe session={session} coupleId={coupleId} filters={filters} />}
      {page === 'likes'   && <Likes session={session} coupleId={coupleId} />}
      {page === 'matches' && <Matches session={session} coupleId={coupleId} />}

      {/* Bottom nav — now 4 items */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${page==='filters'?'active':''}`} onClick={() => setPage('filters')}>
          <span style={{ fontSize:18 }}>⚙️</span>
          <span className="nav-label">Filtros</span>
        </button>
        <button className={`nav-btn ${page==='swipe'?'active':''}`} onClick={() => setPage('swipe')}>
          <span style={{ fontSize:18 }}>🌸</span>
          <span className="nav-label">Swipe</span>
        </button>
        <button className={`nav-btn ${page==='likes'?'active':''}`} onClick={() => setPage('likes')}>
          <span style={{ fontSize:18 }}>👍</span>
          <span className="nav-label">Mis likes</span>
        </button>
        <button className={`nav-btn ${page==='matches'?'active':''}`} onClick={() => setPage('matches')}>
          <span style={{ fontSize:18 }}>💖</span>
          <span className="nav-label">Matches</span>
        </button>
      </nav>
    </div>
  )
}
