const GENDER_OPTIONS     = ['Niña', 'Niño', 'Unisex']
const ORIGIN_OPTIONS     = ['Español', 'Euskera', 'Catalán', 'Gallego', 'Francés',
                            'Italiano', 'Latino', 'Griego', 'Hebreo', 'Árabe',
                            'Escandinavo', 'Germánico', 'Irlandés', 'Escocés',
                            'Internacional', 'Africano', 'Japonés', 'Persa', 'Eslavo']
const STYLE_OPTIONS      = ['Clásico', 'Moderno', 'Corto', 'Raro / único', 'Literario',
                            'Mitológico', 'Espiritual', 'Naturaleza', 'Musical', 'Minimalista']
const POPULARITY_OPTIONS = ['Muy común', 'Moderado', 'Poco común', 'Raro']

function PillGroup({ options, selected, onChange }) {
  function toggle(opt) {
    if (selected.includes(opt)) onChange(selected.filter(o => o !== opt))
    else onChange([...selected, opt])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => (
        <button
          key={opt}
          className={`pill ${selected.includes(opt) ? 'active' : ''}`}
          onClick={() => toggle(opt)}
          type="button"
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function Filters({ filters, onChange, onDone }) {
  function update(key, val) {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FFF4F1' }}>
      <div className="screen-header">
        <div>
          <h2>Personaliza tu búsqueda</h2>
          <p>Elige qué nombres quieres ver</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <div style={{ fontFamily: "'Inter',system-ui", fontSize: 11, fontWeight: 700, color: '#5A4040', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Género
          </div>
          <PillGroup options={GENDER_OPTIONS} selected={filters.gender} onChange={v => update('gender', v)} />
        </div>

        <div>
          <div style={{ fontFamily: "'Inter',system-ui", fontSize: 11, fontWeight: 700, color: '#5A4040', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Origen
          </div>
          <PillGroup options={ORIGIN_OPTIONS} selected={filters.origin} onChange={v => update('origin', v)} />
        </div>

        <div>
          <div style={{ fontFamily: "'Inter',system-ui", fontSize: 11, fontWeight: 700, color: '#5A4040', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Estilo
          </div>
          <PillGroup options={STYLE_OPTIONS} selected={filters.style} onChange={v => update('style', v)} />
        </div>

        <div>
          <div style={{ fontFamily: "'Inter',system-ui", fontSize: 11, fontWeight: 700, color: '#5A4040', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Popularidad
          </div>
          <PillGroup options={POPULARITY_OPTIONS} selected={filters.popularity} onChange={v => update('popularity', v)} />
        </div>

      </div>

      <div style={{ padding: '14px 22px 22px', background: '#fff', borderTop: '1px solid #EDEBE9' }}>
        <button className="btn-primary" onClick={onDone}>
          Ver nombres ✨
        </button>
      </div>
    </div>
  )
}
