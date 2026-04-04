import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Filters from './pages/Filters'
import Swipe from './pages/Swipe'
import Matches from './pages/Matches'
import './index.css'

export default function App() {
  const [session, setSession]   = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [page, setPage]         = useState('swipe') // swipe | matches | filters
  const [filters, setFilters]   = useState({
    gender: [],
    origin: [],
    style:  [],
    popularity: [],
  })
  const [loading, setLoading] = useState(true)

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch couple when logged in
  useEffect(() => {
    if (!session) return
    fetchCouple()
  }, [session])

  async function fetchCouple() {
    const uid = session.user.id
    const { data } = await supabase
      .from('couples')
      .select('id')
      .or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`)
      .eq('status', 'active')
      .single()
    if (data) setCoupleId(data.id)
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48 }}>🌸</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-shell">
        <Login onLogin={() => {}} />
      </div>
    )
  }

  if (!coupleId) {
    return (
      <div className="app-shell">
        <Setup session={session} onCouple={(id) => setCoupleId(id)} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      {page === 'filters' && (
        <Filters
          filters={filters}
          onChange={setFilters}
          onDone={() => setPage('swipe')}
        />
      )}
      {page === 'swipe' && (
        <Swipe
          session={session}
          coupleId={coupleId}
          filters={filters}
        />
      )}
      {page === 'matches' && (
        <Matches session={session} coupleId={coupleId} />
      )}

      <nav className="bottom-nav">
        <button className={`nav-btn ${page === 'filters' ? 'active' : ''}`} onClick={() => setPage('filters')}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <span className="nav-label">Filtros</span>
        </button>
        <button className={`nav-btn ${page === 'swipe' ? 'active' : ''}`} onClick={() => setPage('swipe')}>
          <span style={{ fontSize: 20 }}>🌸</span>
          <span className="nav-label">Swipe</span>
        </button>
        <button className={`nav-btn ${page === 'matches' ? 'active' : ''}`} onClick={() => setPage('matches')}>
          <span style={{ fontSize: 20 }}>💖</span>
          <span className="nav-label">Matches</span>
        </button>
      </nav>
    </div>
  )
}
