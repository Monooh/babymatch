import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Filters from './pages/Filters'
import Swipe from './pages/Swipe'
import Matches from './pages/Matches'
import Likes from './pages/Likes'
import './index.css'

const IconFilters = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?'#8B2020':'#B0A0A0'} strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
  </svg>
)
const IconSwipe = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'#8B2020':'none'} stroke={active?'#8B2020':'#B0A0A0'} strokeWidth="2" strokeLinecap="round">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
)
const IconLikes = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'#2E9954':'none'} stroke={active?'#2E9954':'#B0A0A0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
)
const IconMatches = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?'#C4830A':'#B0A0A0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

export default function App() {
  const [session, setSession]       = useState(null)
  const [coupleId, setCoupleId]     = useState(null)
  const [coupleCode, setCoupleCode] = useState('')
  const [page, setPage]             = useState('swipe')
  const [showMenu, setShowMenu]     = useState(false)
  const [filters, setFilters]       = useState({
    gender:[], origin:[], style:[], popularity:[],
    collections:[], syllables:[], startLetters:[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e,s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) fetchCouple() }, [session])

  async function fetchCouple() {
    const uid = session.user.id
    // Fix 7: include pending so solo user can swipe, partner can still join
    const { data } = await supabase
      .from('couples').select('id, invite_code, status')
      .or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`)
      .in('status', ['active','pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) { setCoupleId(data.id); setCoupleCode(data.invite_code) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null); setCoupleId(null); setShowMenu(false)
  }
  function copyCode() { navigator.clipboard.writeText(coupleCode); setShowMenu(false) }
  function shareCode() {
    if (navigator.share) navigator.share({ title:'BabyMatch', text:`Únete con el código: ${coupleCode}\n\nhttps://babymatch.vercel.app` })
    else copyCode()
    setShowMenu(false)
  }

  if (loading) return (
    <div className="app-shell" style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ fontSize:48 }}>🌸</div>
    </div>
  )

  if (!session) return <div className="app-shell"><Login /></div>
  if (!coupleId) return (
    <div className="app-shell">
      <Setup session={session} onCouple={id => { setCoupleId(id); fetchCouple() }} />
    </div>
  )

  return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column' }}>

      {/* Top bar */}
      <div style={{ flexShrink:0, position:'sticky', top:0, zIndex:20, background:'#fff', borderBottom:'1px solid #EDEBE9', paddingTop:'calc(10px + env(safe-area-inset-top))', paddingBottom:'10px', paddingLeft:'20px', paddingRight:'20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#fff', boxShadow:'0 2px 8px rgba(124,45,43,.15)', overflow:'hidden', padding:2, flexShrink:0 }}>
            <img src="/logo.png" alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          </div>
          <div style={{ fontFamily:"'Poppins',system-ui",fontSize:16,fontWeight:700,color:'#1A0E0E' }}>
            Baby<span style={{ color:'#8B2020' }}>Match</span>
          </div>
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowMenu(m=>!m)} style={{ background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B0A0A0" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </button>
          {showMenu && (
            <div style={{ position:'absolute',right:0,top:'100%',marginTop:4,background:'#fff',borderRadius:14,border:'1px solid #EDEBE9',boxShadow:'0 8px 24px rgba(0,0,0,0.12)',minWidth:220,zIndex:100,overflow:'hidden' }}>
              {coupleCode&&(
                <>
                  <div style={{ padding:'12px 16px 4px',fontFamily:"'Inter',system-ui",fontSize:11,fontWeight:700,color:'#9A8080',textTransform:'uppercase',letterSpacing:1 }}>Código de pareja</div>
                  <div style={{ padding:'4px 16px 12px',fontFamily:"'Poppins',system-ui",fontSize:20,fontWeight:700,color:'#8B2020',letterSpacing:3 }}>{coupleCode}</div>
                  <button onClick={shareCode} style={{ width:'100%',padding:'12px 16px',background:'none',border:'none',borderTop:'1px solid #EDEBE9',cursor:'pointer',fontFamily:"'Inter',system-ui",fontSize:14,color:'#1A0E0E',textAlign:'left',display:'flex',alignItems:'center',gap:8 }}>📤 Compartir código</button>
                  <button onClick={copyCode}  style={{ width:'100%',padding:'12px 16px',background:'none',border:'none',borderTop:'1px solid #EDEBE9',cursor:'pointer',fontFamily:"'Inter',system-ui",fontSize:14,color:'#1A0E0E',textAlign:'left',display:'flex',alignItems:'center',gap:8 }}>📋 Copiar código</button>
                </>
              )}
              <button onClick={handleSignOut} style={{ width:'100%',padding:'12px 16px',background:'none',border:'none',borderTop:'1px solid #EDEBE9',cursor:'pointer',fontFamily:"'Inter',system-ui",fontSize:14,color:'#8B2020',textAlign:'left',display:'flex',alignItems:'center',gap:8,fontWeight:700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B2020" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
      {showMenu&&<div onClick={()=>setShowMenu(false)} style={{ position:'fixed',inset:0,zIndex:19 }}/>}

      {/* Fix 6: page content fills remaining space */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {page==='filters' && <Filters filters={filters} onChange={setFilters} onDone={()=>setPage('swipe')} />}
        {page==='swipe'   && <Swipe session={session} coupleId={coupleId} filters={filters} />}
        {page==='likes'   && <Likes session={session} coupleId={coupleId} key={Date.now()} />}
        {page==='matches' && <Matches session={session} coupleId={coupleId} />}
      </div>

      {/* Bottom nav — sticky at bottom */}
      <nav style={{ flexShrink:0, background:'#fff', borderTop:'1px solid #EDEBE9', display:'flex', paddingTop:'10px', paddingBottom:'calc(10px + env(safe-area-inset-bottom))' }}>
        {[
          { id:'filters',  Icon:IconFilters,  label:'Filtros' },
          { id:'swipe',    Icon:IconSwipe,    label:'Swipe' },
          { id:'likes',    Icon:IconLikes,    label:'Mis likes' },
          { id:'matches',  Icon:IconMatches,  label:'Matches' },
        ].map(({ id, Icon, label }) => (
          <button key={id} onClick={()=>setPage(id)} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,border:'none',background:'none',cursor:'pointer',padding:'4px 0' }}>
            <Icon active={page===id} />
            <span style={{ fontFamily:"'Inter',system-ui",fontSize:10,fontWeight:page===id?700:400,color:page===id?(id==='likes'?'#2E9954':id==='matches'?'#C4830A':'#8B2020'):'#B0A0A0' }}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
