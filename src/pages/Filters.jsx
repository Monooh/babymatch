import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GENDER_OPTIONS   = ['Niña','Niño','Unisex']
const ORIGIN_OPTIONS   = ['Español','Euskera','Catalán','Gallego','Francés','Italiano','Latino','Griego','Hebreo','Árabe','Escandinavo','Germánico','Irlandés','Internacional','Africano','Japonés','Sánscrito']
const STYLE_OPTIONS    = ['Clásico','Moderno','Corto','Raro / único','Literario','Mitológico','Espiritual','Naturaleza','Musical','Minimalista']
const POP_OPTIONS      = ['Muy común','Moderado','Poco común','Raro']
const SYLLABLE_OPTIONS = ['1','2','3','4','5+']
const LETTERS          = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const COLLECTION_OPTIONS = [
  {id:'bíblico',       label:'📖 Bíblicos'},
  {id:'tendencia2026', label:'🔥 Tendencia 2026'},
  {id:'influencer',    label:'✨ Estilo influencer'},
  {id:'realeza',       label:'👑 Reyes y reinas'},
  {id:'naturaleza',    label:'🌿 Naturaleza'},
  {id:'mitológico',    label:'⚡ Mitológicos'},
  {id:'cortisimos',    label:'💎 1 sílaba'},
  {id:'espiritual',    label:'🕊️ Espirituales'},
  {id:'literario',     label:'📚 Literarios'},
  {id:'internacional', label:'🌍 Internacionales'},
]

const GENDER_MAP = {'Niña':'f','Niño':'m','Unisex':'u'}
const POP_MAP    = {'Muy común':[70,100],'Moderado':[40,70],'Poco común':[15,40],'Raro':[0,15]}
const COLL_TAG   = {bíblico:'bíblico',tendencia2026:'popular',influencer:'moderno',realeza:'noble',naturaleza:'naturaleza','mitológico':'mitológico',cortisimos:'minimalista',espiritual:'espiritual',literario:'literario',internacional:'internacional'}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'Inter',system-ui",fontSize:11,fontWeight:700,color:'#5A4040',textTransform:'uppercase',letterSpacing:1,marginBottom:10 }}>{title}</div>
      {children}
    </div>
  )
}

function Pills({ options, selected, onChange, getKey=o=>o, getLabel=o=>o }) {
  const toggle = o => { const k=getKey(o); onChange(selected.includes(k)?selected.filter(x=>x!==k):[...selected,k]) }
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
      {options.map(o => {
        const k=getKey(o); const active=selected.includes(k)
        return <button key={k} className={`pill ${active?'active':''}`} onClick={()=>toggle(o)} type="button">{getLabel(o)}</button>
      })}
    </div>
  )
}

export default function Filters({ filters, onChange, onDone }) {
  const [count, setCount]     = useState(null)
  const [counting, setCounting] = useState(false)

  function update(key, val) { onChange({...filters,[key]:val}) }

  const hasFilters = Object.entries(filters).some(([k,v]) =>
    Array.isArray(v) ? v.length > 0 : !!v
  )

  useEffect(() => {
    const t = setTimeout(countNames, 400)
    return () => clearTimeout(t)
  }, [JSON.stringify(filters)])

  async function countNames() {
    setCounting(true)
    let q = supabase.from('names').select('id,gender,origin,style_tags,popularity,syllables,name')
    if (filters.gender?.length) { const g=filters.gender.map(x=>GENDER_MAP[x]).filter(Boolean); if(g.length) q=q.in('gender',g) }
    if (filters.origin?.length) q=q.in('origin',filters.origin)
    const { data } = await q.limit(1000)
    let f = data || []
    if (filters.popularity?.length) { const r=filters.popularity.map(p=>POP_MAP[p]).filter(Boolean); f=f.filter(n=>r.some(([a,b])=>n.popularity>=a&&n.popularity<=b)) }
    if (filters.style?.length) { const sl=filters.style.map(s=>s.toLowerCase().replace(' / ','/')); f=f.filter(n=>n.style_tags?.some(t=>sl.some(s=>t.includes(s.split('/')[0].trim())))) }
    if (filters.collections?.length) { const ct=filters.collections.map(c=>COLL_TAG[c]).filter(Boolean); f=f.filter(n=>ct.some(tag=>n.style_tags?.some(t=>t.toLowerCase().includes(tag.toLowerCase())))) }
    if (filters.syllables?.length) {
      f=f.filter(n=>{ if(filters.syllables.includes('5+')&&n.syllables>=5) return true; return filters.syllables.filter(x=>x!=='5+').includes(String(n.syllables)) })
    }
    // Fix 9: multiple letters
    if (filters.startLetters?.length) { f=f.filter(n=>filters.startLetters.some(l=>n.name.toLowerCase().startsWith(l.toLowerCase()))) }
    setCount(f.length); setCounting(false)
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',minHeight:'100%',background:'#FFF4F1' }}>
      <div className="screen-header" style={{ justifyContent:'space-between' }}>
        <div><h2>Filtros</h2><p>Personaliza qué nombres quieres ver</p></div>
        {hasFilters && (
          <button onClick={()=>onChange({gender:[],origin:[],style:[],popularity:[],collections:[],syllables:[],startLetters:[]})}
            style={{ background:'none',border:'none',cursor:'pointer',fontFamily:"'Inter',system-ui",fontSize:12,color:'#8B2020',fontWeight:700 }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Live count */}
      <div style={{ background:hasFilters?'#FFF0E8':'#F5F5F5',padding:'10px 22px',borderBottom:'1px solid #EDEBE9',display:'flex',alignItems:'center',gap:8 }}>
        <div style={{ fontFamily:"'Poppins',system-ui",fontSize:22,fontWeight:700,color:hasFilters?'#8B2020':'#B0A0A0' }}>
          {counting?'...':count!==null?count:'—'}
        </div>
        <div style={{ fontFamily:"'Inter',system-ui",fontSize:13,color:'#9A8080' }}>
          nombres {hasFilters?'con estos filtros':'en total'}
        </div>
      </div>

      <div style={{ flex:1,padding:'18px 22px',overflowY:'auto',display:'flex',flexDirection:'column',gap:22 }}>

        <Section title="Colecciones">
          <Pills options={COLLECTION_OPTIONS} selected={filters.collections||[]} onChange={v=>update('collections',v)} getKey={o=>o.id} getLabel={o=>o.label} />
        </Section>

        <div style={{ height:1,background:'#EDEBE9' }} />

        <Section title="Género">
          <Pills options={GENDER_OPTIONS} selected={filters.gender} onChange={v=>update('gender',v)} />
        </Section>

        <Section title="Origen">
          <Pills options={ORIGIN_OPTIONS} selected={filters.origin} onChange={v=>update('origin',v)} />
        </Section>

        {/* Fix 9: multiple letters */}
        <Section title="Empieza por la letra">
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {LETTERS.map(l => {
              const active = (filters.startLetters||[]).includes(l)
              return (
                <button key={l}
                  onClick={() => {
                    const curr = filters.startLetters||[]
                    update('startLetters', active ? curr.filter(x=>x!==l) : [...curr,l])
                  }}
                  style={{ width:34,height:34,borderRadius:9,border:active?'none':'1.5px solid #C8C4C2',background:active?'#3D1A1A':'#fff',color:active?'#fff':'#5A4040',fontFamily:"'Poppins',system-ui",fontSize:13,fontWeight:700,cursor:'pointer' }}>
                  {l}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Número de sílabas">
          <Pills options={SYLLABLE_OPTIONS} selected={filters.syllables||[]} onChange={v=>update('syllables',v)} getLabel={o=>`${o} ${o==='1'?'sílaba':'sílabas'}`} />
        </Section>

        <Section title="Estilo">
          <Pills options={STYLE_OPTIONS} selected={filters.style} onChange={v=>update('style',v)} />
        </Section>

        <Section title="Popularidad">
          <Pills options={POP_OPTIONS} selected={filters.popularity} onChange={v=>update('popularity',v)} />
        </Section>

      </div>

      <div style={{ padding:'14px 22px 22px',background:'#fff',borderTop:'1px solid #EDEBE9' }}>
        <button className="btn-primary" onClick={onDone}>
          {count!==null&&hasFilters?`Ver ${count} nombres ✨`:'Ver nombres ✨'}
        </button>
      </div>
    </div>
  )
}
