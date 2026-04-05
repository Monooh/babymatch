const GENDER_OPTIONS = ['Niña', 'Niño', 'Unisex']

const ORIGIN_OPTIONS = [
  'Español', 'Euskera', 'Catalán', 'Gallego',
  'Francés', 'Italiano', 'Latino', 'Griego',
  'Hebreo', 'Árabe', 'Escandinavo', 'Germánico',
  'Irlandés', 'Internacional', 'Africano', 'Japonés', 'Sánscrito'
]

const STYLE_OPTIONS = [
  'Clásico', 'Moderno', 'Corto', 'Raro / único',
  'Literario', 'Mitológico', 'Espiritual', 'Naturaleza',
  'Musical', 'Minimalista'
]

const POPULARITY_OPTIONS = ['Muy común', 'Moderado', 'Poco común', 'Raro']

// Collections = curated sets by tag
const COLLECTION_OPTIONS = [
  { id: 'bíblico',        label: '📖 Bíblicos',                  tag: 'bíblico' },
  { id: 'tendencia2025',  label: '🔥 Tendencia 2025',            tag: 'popular' },
  { id: 'influencer',     label: '✨ Estilo influencer',          tag: 'moderno' },
  { id: 'realeza',        label: '👑 Reyes y reinas',             tag: 'noble' },
  { id: 'naturaleza',     label: '🌿 Naturaleza y elementos',     tag: 'naturaleza' },
  { id: 'mitológico',     label: '⚡ Mitológicos',                tag: 'mitológico' },
  { id: 'cortisimos',     label: '💎 Cortísimos (1 sílaba)',      tag: 'minimalista' },
  { id: 'espiritual',     label: '🕊️ Espirituales',               tag: 'espiritual' },
  { id: 'literario',      label: '📚 Literarios',                 tag: 'literario' },
  { id: 'internacional',  label: '🌍 Internacionales',            tag: 'internacional' },
]

function PillGroup({ options, selected, onChange, isCollection }) {
  function toggle(opt) {
    const key = isCollection ? opt.id : opt
    const selectedKeys = isCollection ? selected : selected
    if (selectedKeys.includes(key)) onChange(selectedKeys.filter(o => o !== key))
    else onChange([...selectedKeys, key])
  }

  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {options.map(opt => {
        const key = isCollection ? opt.id : opt
        const label = isCollection ? opt.label : opt
        const isActive = selected.includes(key)
        return (
          <button
            key={key}
            className={`pill ${isActive ? 'active' : ''}`}
            onClick={() => toggle(opt)}
            type="button"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'Inter',system-ui", fontSize:11, fontWeight:700, color:'#5A4040', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function Filters({ filters, onChange, onDone }) {
  function update(key, val) { onChange({ ...filters, [key]: val }) }

  const hasFilters = filters.gender.length + filters.origin.length + filters.style.length + filters.popularity.length + (filters.collections || []).length > 0

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%', background:'#FFF4F1' }}>
      <div className="screen-header" style={{ justifyContent:'space-between' }}>
        <div>
          <h2>Filtros</h2>
          <p>Personaliza qué nombres quieres ver</p>
        </div>
        {hasFilters && (
          <button
            onClick={() => onChange({ gender:[], origin:[], style:[], popularity:[], collections:[] })}
            style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'Inter',system-ui", fontSize:12, color:'#8B2020', fontWeight:600 }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div style={{ flex:1, padding:'18px 22px', overflowY:'auto', display:'flex', flexDirection:'column', gap:22 }}>

        <Section title="Colecciones">
          <PillGroup
            options={COLLECTION_OPTIONS}
            selected={filters.collections || []}
            onChange={v => update('collections', v)}
            isCollection={true}
          />
        </Section>

        <div style={{ height:1, background:'#EDEBE9' }} />

        <Section title="Género">
          <PillGroup options={GENDER_OPTIONS} selected={filters.gender} onChange={v => update('gender', v)} />
        </Section>

        <Section title="Origen">
          <PillGroup options={ORIGIN_OPTIONS} selected={filters.origin} onChange={v => update('origin', v)} />
        </Section>

        <Section title="Estilo">
          <PillGroup options={STYLE_OPTIONS} selected={filters.style} onChange={v => update('style', v)} />
        </Section>

        <Section title="Popularidad">
          <PillGroup options={POPULARITY_OPTIONS} selected={filters.popularity} onChange={v => update('popularity', v)} />
        </Section>

      </div>

      <div style={{ padding:'14px 22px 22px', background:'#fff', borderTop:'1px solid #EDEBE9' }}>
        <button className="btn-primary" onClick={onDone}>Ver nombres ✨</button>
      </div>
    </div>
  )
}
