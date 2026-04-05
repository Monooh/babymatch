import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GENDER_OPTIONS = ['Niña', 'Niño', 'Unisex']
const ORIGIN_OPTIONS = ['Español','Euskera','Catalán','Gallego','Francés','Italiano','Latino','Griego','Hebreo','Árabe','Escandinavo','Germánico','Irlandés','Internacional','Africano','Japonés','Sánscrito']
const STYLE_OPTIONS  = ['Clásico','Moderno','Corto','Raro / único','Literario','Mitológico','Espiritual','Naturaleza','Musical','Minimalista']
const POP_OPTIONS    = ['Muy común','Moderado','Poco común','Raro']
const SYLLABLE_OPTIONS = ['1','2','3','4','5+']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const COLLECTION_OPTIONS = [
  { id:'bíblico',       label:'📖 Bíblicos',              tag:'bíblico' },
  { id:'tendencia2026', label:'🔥 Tendencia 2026',         tag:'popular' },
  { id:'influencer',    label:'✨ Estilo influencer',       tag:'moderno' },
  { id:'realeza',       label:'👑 Reyes y reinas',          tag:'noble' },
  { id:'naturaleza',    label:'🌿 Naturaleza y elementos',  tag:'naturaleza' },
  { id:'mitológico',    label:'⚡ Mitológicos',             tag:'mitológico' },
  { id:'cortisimos',    label:'💎 Cortísimos (1 sílaba)',   tag:'minimalista' },
  { id:'espiritual',    label:'🕊️ Espirituales',            tag:'espiritual' },
  { id:'literario',     label:'📚 Literarios',              tag:'literario' },
  { id:'internacional', label:'🌍 Internacionales',         tag:'internacional' },
]

const GENDER_MAP = { 'Niña':'f', 'Niño':'m', 'Unisex':'u' }
const POP_MAP    = { 'Muy común':[70,100], 'Moderado':[40,70], 'Poco común':[15,40], 'Raro':[0,15] }
const COLL_TAG   = { 'bíblico':'bíblico','tendencia2026':'popular','influencer':'moderno','realeza':'noble','naturaleza':'naturaleza','mitológico':'mitológico','cortisimos':'minimalista','espiritual':'espiritual','literario':'literario','internacional':'internacional' }

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, fontWeight:700, color:'#5A4040', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>{title}</div>
      {children}
    </div>
  )
}

function PillGroup({ options, selected, onChange, getKey, getLabel }) {
  const toggle = opt => {
    const k = getKey(opt)
    onChange(selected.includes(k) ? selected.filter(x=>x!==k) : [...selected, k])
  }
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {options.map(opt => {
        const k = getKey(opt)
        return (
          <button key={k} className={`pill ${selected.includes(k)?'active':''}`} onClick={()=>toggle(opt)} type="button">
            {getLabel(opt)}
          </button>
        )
      })}
    </div>
  )
}

export default function Filters({ filters, onChange, onDone }) {
  const [count, setCount] = useState(null)
  const [counting, setCounting] = useState(false)

  function update(key, val) { onChange({ ...filters, [key]: val }) }

  const hasFilters = (filters.gender?.length||0)+(filters.origin?.length||0)+(filters.style?.length||0)+(filters.popularity?.length||0)+(filters.collections?.length||0)+(filters.syllables?.length||0)+(filters.startLetter?1:0) > 0

  // Count matching names whenever filters change
  useEffect(() => {
    const timer = setTimeout(() => countNames(), 400)
    return () => clearTimeout(timer)
  }, [filters])

  async function countNames() {
    setCounting(true)
    let q = supabase.from('names').select('id, gender, origin, style_tags, popularity, syllables, name')
    if (filters.gender?.length) {
      const genders = filters.gender.map(g=>GENDER_MAP[g]).filter(Boolean)
      if (genders.length) q = q.in('gender', genders)
    }
    if (filters.origin?.length) q = q.in('origin', filters.origin)
    const { data } = await q.limit(1000)
    let filtered = data || []
    if (filters.popularity?.length) {
      const ranges = filters.popularity.map(p=>POP_MAP[p]).filter(Boolean)
      filtered = filtered.filter(n => ranges.some(([min,max])=>n.popularity>=min&&n.popularity<=max))
    }
    if (filters.style?.length) {
      const sl = filters.style.map(s=>s.toLowerCase().replace(' / ','/'))
      filtered = filtered.filter(n=>n.style_tags?.some(t=>sl.some(s=>t.includes(s.split('/')[0].trim()))))
    }
    if (filters.collections?.length) {
      const ct = filters.collections.map(c=>COLL_TAG[c]).filter(Boolean)
      filtered = filtered.filter(n=>ct.some(tag=>n.style_tags?.some(t=>t.toLowerCase().includes(tag.toLowerCase()))))
    }
    if (filters.syllables?.length) {
      filtered = filtered.filter(n => {
        if (filters.syllables.includes('5+')) return n.syllables >= 5 || filters.syllables.includes(String(n.syllables))
        return filters.syllables.includes(String(n.syllables))
      })
    }
    if (filters.startLetter) {
      filtered = filtered.filter(n=>n.name.toLowerCase().startsWith(filters.startLetter.toLowerCase()))
    }
    setCount(filtered.length)
    setCounting(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%', background:'#FFF4F1' }}>
      <div className="screen-header" style={{ justifyContent:'space-between' }}>
        <div>
          <h2>Filtros</h2>
          <p>Personaliza qué nombres quieres ver</p>
        </div>
        {hasFilters && (
          <button onClick={() => onChange({ gender:[], origin:[], style:[], popularity:[], collections:[], syllables:[], startLetter:'' })}
            style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'Inter',system-ui", fontSize:12, color:'#8B2020', fontWeight:700 }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Live count banner */}
      <div style={{ background: hasFilters ? '#FFF0E8' : '#F5F5F5', padding:'10px 22px', borderBottom:'1px solid #EDEBE9', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ fontFamily:"'Poppins',system-ui", fontSize:22, fontWeight:700, color: hasFilters ? '#8B2020' : '#B0A0A0' }}>
          {counting ? '...' : count !== null ? count : '—'}
        </div>
        <div style={{ fontFamily:"'Inter',system-ui", fontSize:13, color:'#9A8080' }}>
          nombres {hasFilters ? 'con estos filtros' : 'en total'}
        </div>
      </div>

      <div style={{ flex:1, padding:'18px 22px', overflowY:'auto', display:'flex', flexDirection:'column', gap:22 }}>

        <Section title="Colecciones">
          <PillGroup options={COLLECTION_OPTIONS} selected={filters.collections||[]} onChange={v=>update('collections',v)} getKey={o=>o.id} getLabel={o=>o.label} />
        </Section>

        <div style={{ height:1, background:'#EDEBE9' }} />

        <Section title="Género">
          <PillGroup options={GENDER_OPTIONS} selected={filters.gender} onChange={v=>update('gender',v)} getKey={o=>o} getLabel={o=>o} />
        </Section>

        <Section title="Origen">
          <PillGroup options={ORIGIN_OPTIONS} selected={filters.origin} onChange={v=>update('origin',v)} getKey={o=>o} getLabel={o=>o} />
        </Section>

        <Section title="Empieza por la letra">
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {LETTERS.map(l => (
              <button key={l}
                onClick={() => update('startLetter', filters.startLetter===l ? '' : l)}
                style={{ width:36, height:36, borderRadius:10, border: filters.startLetter===l ? 'none' : '1.5px solid #C8C4C2', background: filters.startLetter===l ? '#3D1A1A' : '#fff', color: filters.startLetter===l ? '#fff' : '#5A4040', fontFamily:"'Poppins',system-ui", fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Número de sílabas">
          <PillGroup options={SYLLABLE_OPTIONS} selected={filters.syllables||[]} onChange={v=>update('syllables',v)} getKey={o=>o} getLabel={o=>`${o} ${o==='1'?'sílaba':'sílabas'}`} />
        </Section>

        <Section title="Estilo">
          <PillGroup options={STYLE_OPTIONS} selected={filters.style} onChange={v=>update('style',v)} getKey={o=>o} getLabel={o=>o} />
        </Section>

        <Section title="Popularidad">
          <PillGroup options={POP_OPTIONS} selected={filters.popularity} onChange={v=>update('popularity',v)} getKey={o=>o} getLabel={o=>o} />
        </Section>

      </div>

      <div style={{ padding:'14px 22px 22px', background:'#fff', borderTop:'1px solid #EDEBE9' }}>
        <button className="btn-primary" onClick={onDone}>
          {count !== null && hasFilters ? `Ver ${count} nombres ✨` : 'Ver nombres ✨'}
        </button>
      </div>
    </div>
  )
}
