'use client'
/**
 * Dashboard Casa — v2
 * npm install framer-motion recharts
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const CATEGORIE_SPESE    = ['Casa', 'Spesa', 'Bollette', 'Trasporti', 'Salute', 'Intrattenimento', 'Extra']
const CATEGORIE_SCADENZE = ['Assicurazione', 'Bollo', 'Manutenzione', 'Documento', 'Abbonamento', 'Altro']
const STANZE             = ['Cucina', 'Bagno', 'Soggiorno', 'Camera', 'Giardino', 'Garage', 'Generale']
const MESI               = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const PRIORITA_ORD       = { Alta: 0, Media: 1, Bassa: 2 }

const COLORI_CAT = {
  Casa: '#3B82F6', Spesa: '#10B981', Bollette: '#F59E0B',
  Trasporti: '#8B5CF6', Salute: '#EF4444', Intrattenimento: '#EC4899', Extra: '#6B7280',
}

const INITIAL = {
  spese: [], scadenze: [], attivita: [], consumi: [],
  membrifamiglia: ['Carmine', 'Partner', 'Bambino'],
  budget: 2000,
}

// ── FRAMER VARIANTS ────────────────────────────────────────────────────────────
const TAB_V = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.14 } },
}

const ITEM_V = {
  initial: { opacity: 0, x: -14, scale: 0.97 },
  animate: { opacity: 1, x: 0,   scale: 1,    transition: { type: 'spring', stiffness: 340, damping: 28 } },
  exit:    { opacity: 0, x: 48,  scale: 0.94,  transition: { duration: 0.17, ease: 'easeIn' } },
}

const CARD_V = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.08, duration: 0.28, ease: 'easeOut' } }),
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  input:     { padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#1E293B', outline: 'none', background: 'white' },
  inputFull: { padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#1E293B', outline: 'none', background: 'white', width: '100%', boxSizing: 'border-box' },
  btn:  (c) => ({ width: '100%', padding: '12px', background: c, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }),
  card:      { background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
}

// ── UTILITIES ──────────────────────────────────────────────────────────────────
const mc  = () => new Date().toISOString().slice(0, 7)
const mp  = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7) }
const sum = (arr, fn) => arr.reduce((a, x) => a + (fn ? fn(x) : x), 0)

function scadCol(data) {
  const gg = Math.ceil((new Date(data) - new Date()) / 864e5)
  if (gg < 0)   return { color: '#EF4444', label: 'Scaduta', bg: '#FEF2F2' }
  if (gg <= 7)  return { color: '#F59E0B', label: `${gg}g`,  bg: '#FFFBEB' }
  if (gg <= 30) return { color: '#3B82F6', label: `${gg}g`,  bg: '#EFF6FF' }
  return          { color: '#10B981', label: `${gg}g`,  bg: '#ECFDF5' }
}

function ultimi6() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    return d.toISOString().slice(0, 7)
  })
}

const totMese = (spese, mese) =>
  sum(spese.filter(s => s.data?.startsWith(mese)), s => +s.importo)

function exportJSON(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  Object.assign(document.createElement('a'), { href: url, download: 'dashboard-casa.json' }).click()
  URL.revokeObjectURL(url)
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function FormField({ label, error, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 3 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            style={{ fontSize: 11, color: '#EF4444', margin: 0 }}
          >{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotifBadge({ count, color = '#EF4444' }) {
  if (!count) return null
  return (
    <motion.span
      key={count}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 17, height: 17, borderRadius: '50%', background: color,
        color: 'white', fontSize: 10, fontWeight: 700, marginLeft: 5,
      }}
    >{count > 9 ? '9+' : count}</motion.span>
  )
}

function ProgBar({ pct, color }) {
  return (
    <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.85, ease: 'easeOut', delay: 0.2 }}
        style={{ height: '100%', background: color, borderRadius: 4 }}
      />
    </div>
  )
}

function Delta({ curr, prev }) {
  if (!prev) return null
  const pct = ((curr - prev) / prev) * 100
  const up  = pct > 0
  return (
    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      style={{ fontSize: 12, color: up ? '#EF4444' : '#10B981', fontWeight: 600, marginLeft: 6 }}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}% vs mese scorso
    </motion.span>
  )
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeTab({ data, setTab }) {
  const tmese  = totMese(data.spese, mc())
  const tprec  = totMese(data.spese, mp())
  const perc   = (tmese / (data.budget || 1)) * 100

  const sAlert  = data.scadenze.filter(s => { if (s.gestita) return false; const g = Math.ceil((new Date(s.data) - new Date()) / 864e5); return g < 0 }).length
  const sImm    = data.scadenze.filter(s => { if (s.gestita) return false; const g = Math.ceil((new Date(s.data) - new Date()) / 864e5); return g >= 0 && g <= 30 }).length
  const aAperte = data.attivita.filter(a => !a.completata).length
  const aTot    = data.attivita.length

  const uc  = [...data.consumi].sort((a, b) => b.mese?.localeCompare(a.mese))[0]
  const uc2 = [...data.consumi].sort((a, b) => b.mese?.localeCompare(a.mese))[1]
  const tc  = uc  ? +(uc.luce||0) + +(uc.gas||0) + +(uc.acqua||0) : null
  const tc2 = uc2 ? +(uc2.luce||0) + +(uc2.gas||0) + +(uc2.acqua||0) : null

  const cards = [
    {
      id: 'spese', emoji: '💰', title: 'Spese del mese',
      value: `€ ${tmese.toFixed(0)}`, subtitle: `Budget € ${data.budget}`,
      color: perc > 100 ? '#EF4444' : '#3B82F6',
      bg:    perc > 100 ? '#FEF2F2' : '#EFF6FF',
      extra: (
        <div style={{ marginTop: 10 }}>
          <ProgBar pct={perc} color={perc > 100 ? '#EF4444' : perc > 80 ? '#F59E0B' : '#3B82F6'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{perc.toFixed(0)}% usato</span>
            {tprec > 0 && <Delta curr={tmese} prev={tprec} />}
          </div>
        </div>
      ),
    },
    {
      id: 'scadenze', emoji: '📅', title: 'Scadenze',
      value: sAlert > 0 ? `${sAlert} scadute` : sImm > 0 ? `${sImm} imminenti` : 'Tutto ok',
      subtitle: `${data.scadenze.filter(s => !s.gestita).length} attive`,
      color: sAlert > 0 ? '#EF4444' : sImm > 0 ? '#F59E0B' : '#10B981',
      bg:    sAlert > 0 ? '#FEF2F2' : sImm > 0 ? '#FFFBEB' : '#ECFDF5',
    },
    {
      id: 'attivita', emoji: '✅', title: 'Lista attività',
      value: `${aAperte} da fare`, subtitle: `${aTot - aAperte} completate`,
      color: '#10B981', bg: '#ECFDF5',
      extra: aTot > 0 ? <div style={{ marginTop: 10 }}><ProgBar pct={((aTot - aAperte) / aTot) * 100} color="#10B981" /></div> : null,
    },
    {
      id: 'consumi', emoji: '⚡', title: 'Consumi',
      value: tc !== null ? `€ ${tc.toFixed(0)}` : '—',
      subtitle: uc ? `${MESI[+uc.mese?.slice(5, 7) - 1]} ${uc.mese?.slice(0, 4)}` : 'Nessun dato',
      color: '#8B5CF6', bg: '#F5F3FF',
      extra: tc !== null && tc2 !== null ? <div style={{ marginTop: 6 }}><Delta curr={tc} prev={tc2} /></div> : null,
    },
  ]

  const barData = ultimi6().map(m => ({
    name: MESI[+m.slice(5, 7) - 1],
    Spese: +totMese(data.spese, m).toFixed(0),
  }))

  const prossime = [...data.scadenze].filter(s => !s.gestita)
    .sort((a, b) => a.data?.localeCompare(b.data)).slice(0, 4)

  const topAtt = [...data.attivita].filter(a => !a.completata)
    .sort((a, b) => PRIORITA_ORD[a.priorita] - PRIORITA_ORD[b.priorita]).slice(0, 4)

  const pc = { Alta: '#EF4444', Media: '#F59E0B', Bassa: '#10B981' }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1E293B' }}>Benvenuto! 👋</h2>
        <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>Riepilogo della tua casa</p>
      </div>

      {/* Budget alert */}
      <AnimatePresence>
        {perc > 80 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              background: perc > 100 ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${perc > 100 ? '#FECACA' : '#FDE68A'}`,
              borderRadius: 12, padding: '11px 16px',
              color: perc > 100 ? '#DC2626' : '#D97706', fontSize: 14, fontWeight: 500,
            }}
          >
            {perc > 100
              ? `⚠️ Budget superato di € ${(tmese - data.budget).toFixed(2)}!`
              : `⚠️ Hai usato il ${perc.toFixed(0)}% del budget mensile`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Cards */}
      <motion.div
        initial="initial" animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.07 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))', gap: 14, marginBottom: 20 }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.id} variants={CARD_V} custom={i}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab(card.id)}
            style={{ ...S.card, cursor: 'pointer', border: '2px solid transparent' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748B', fontWeight: 500 }}>{card.title}</p>
                <p style={{ margin: 0, fontSize: 25, fontWeight: 700, color: card.color }}>{card.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>{card.subtitle}</p>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>
                {card.emoji}
              </div>
            </div>
            {card.extra}
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 14 }}>
        {/* Bar chart */}
        <div style={S.card}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Spese ultimi 6 mesi</h3>
          {data.spese.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna spesa ancora</p>
            : <ResponsiveContainer width="100%" height={175}>
                <BarChart data={barData} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => [`€ ${v}`, 'Spese']} />
                  <Bar dataKey="Spese" fill="#3B82F6" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Prossime scadenze */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Prossime scadenze</h3>
            <button onClick={() => setTab('scadenze')} style={{ background: 'none', border: 'none', color: '#F59E0B', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Tutte →</button>
          </div>
          {prossime.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna scadenza attiva 🎉</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prossime.map((s, i) => {
                  const { color, label, bg } = scadCol(s.data)
                  return (
                    <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: bg, borderRadius: 9 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 42, textAlign: 'center' }}>{label}</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: 500 }}>{s.nome}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(s.data).toLocaleDateString('it-IT')}</span>
                    </div>
                  )
                })}
              </div>
          }
        </div>

        {/* Attività prioritarie */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Attività prioritarie</h3>
            <button onClick={() => setTab('attivita')} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Tutte →</button>
          </div>
          {topAtt.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna attività aperta 🎉</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {topAtt.map((a, i) => (
                  <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F8FAFC', borderRadius: 9 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: pc[a.priorita], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>{a.testo}</span>
                    <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '1px 6px', borderRadius: 6 }}>{a.stanza}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Ultimi movimenti */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Ultimi movimenti</h3>
            <button onClick={() => setTab('spese')} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Tutti →</button>
          </div>
          {data.spese.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna spesa. <button onClick={() => setTab('spese')} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}>Aggiungi →</button></p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[...data.spese].slice(-5).reverse().map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORI_CAT[s.categoria] || '#94A3B8' }} />
                      <span style={{ fontSize: 13, color: '#334155' }}>{s.descrizione}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>€ {(+s.importo).toFixed(2)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}

// ── SPESE ─────────────────────────────────────────────────────────────────────
function SpeseTab({ data, updateData }) {
  const [form, setForm]   = useState({ descrizione: '', importo: '', categoria: 'Casa', data: new Date().toISOString().slice(0, 10) })
  const [errors, setErrors] = useState({})
  const [filtroMese, setFiltroMese]     = useState(mc())
  const [filtroCat, setFiltroCat]       = useState('Tutte')
  const [cerca, setCerca]               = useState('')
  const [ordine, setOrdine]             = useState('data-desc')

  const validate = () => {
    const e = {}
    if (!form.descrizione.trim()) e.descrizione = 'Inserisci una descrizione'
    if (!form.importo || +form.importo <= 0) e.importo = 'Importo non valido'
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    updateData('spese', [...data.spese, { ...form, importo: +form.importo, id: Date.now() }])
    setForm({ descrizione: '', importo: '', categoria: 'Casa', data: new Date().toISOString().slice(0, 10) })
    setErrors({})
  }

  const rimuovi = (id) => updateData('spese', data.spese.filter(s => s.id !== id))

  let lista = data.spese.filter(s => s.data?.startsWith(filtroMese))
  if (filtroCat !== 'Tutte') lista = lista.filter(s => s.categoria === filtroCat)
  if (cerca) lista = lista.filter(s => s.descrizione?.toLowerCase().includes(cerca.toLowerCase()))
  lista = [...lista].sort((a, b) => {
    if (ordine === 'data-desc')    return b.data?.localeCompare(a.data) || 0
    if (ordine === 'data-asc')     return a.data?.localeCompare(b.data) || 0
    if (ordine === 'importo-desc') return b.importo - a.importo
    if (ordine === 'importo-asc')  return a.importo - b.importo
    return 0
  })

  const totFiltr = sum(lista, s => +s.importo)
  const totAll   = totMese(data.spese, filtroMese)
  const perc     = (totAll / (data.budget || 1)) * 100

  const perCat = CATEGORIE_SPESE
    .map(cat => ({ name: cat, value: +sum(data.spese.filter(s => s.data?.startsWith(filtroMese) && s.categoria === cat), s => +s.importo).toFixed(2) }))
    .filter(c => c.value > 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }}>
      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>💰 Spese & Budget</h2>
            <input type="month" value={filtroMese} onChange={e => setFiltroMese(e.target.value)} style={S.input} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, background: '#EFF6FF', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#64748B' }}>Totale speso</p>
              <motion.p key={totAll} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
                style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#3B82F6' }}>€ {totAll.toFixed(2)}</motion.p>
            </div>
            <div style={{ flex: 1, background: totAll > data.budget ? '#FEF2F2' : '#ECFDF5', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#64748B' }}>Rimanente</p>
              <motion.p key={data.budget - totAll} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
                style={{ margin: 0, fontSize: 26, fontWeight: 700, color: totAll > data.budget ? '#EF4444' : '#10B981' }}>€ {(data.budget - totAll).toFixed(2)}</motion.p>
            </div>
          </div>
          <ProgBar pct={perc} color={perc > 100 ? '#EF4444' : perc > 80 ? '#F59E0B' : '#3B82F6'} />
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>Budget: € {data.budget} · {perc.toFixed(0)}% usato</p>
        </div>

        <div style={S.card}>
          {/* Filtri */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={cerca} onChange={e => setCerca(e.target.value)} placeholder="🔍 Cerca..." style={{ ...S.input, flex: 1, minWidth: 130 }} />
            <select value={ordine} onChange={e => setOrdine(e.target.value)} style={{ ...S.input, fontSize: 12 }}>
              <option value="data-desc">↓ Data</option>
              <option value="data-asc">↑ Data</option>
              <option value="importo-desc">↓ Importo</option>
              <option value="importo-asc">↑ Importo</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {['Tutte', ...CATEGORIE_SPESE].map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.91 }} onClick={() => setFiltroCat(cat)}
                style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: filtroCat === cat ? (COLORI_CAT[cat] || '#1E293B') : '#F1F5F9', color: filtroCat === cat ? 'white' : '#64748B', transition: 'all 0.15s' }}>
                {cat}
              </motion.button>
            ))}
          </div>

          {lista.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna spesa trovata</p>
            : <>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748B' }}>{lista.length} movimenti · € {totFiltr.toFixed(2)}</p>
                <AnimatePresence mode="popLayout">
                  {lista.map(s => (
                    <motion.div key={s.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 5 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: COLORI_CAT[s.categoria] || '#94A3B8', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: '#334155' }}>{s.descrizione}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{s.data}</span>
                      <span style={{ fontSize: 11, background: '#E2E8F0', color: '#475569', padding: '2px 7px', borderRadius: 8 }}>{s.categoria}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', minWidth: 68, textAlign: 'right' }}>€ {(+s.importo).toFixed(2)}</span>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.75 }} onClick={() => rimuovi(s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
          }
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1E293B' }}>+ Nuova spesa</h3>
          <FormField label="Descrizione" error={errors.descrizione}>
            <input value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} placeholder="es. Supermercato" style={S.inputFull} onKeyDown={e => e.key === 'Enter' && aggiungi()} />
          </FormField>
          <FormField label="Importo (€)" error={errors.importo}>
            <input type="number" value={form.importo} onChange={e => setForm({ ...form, importo: e.target.value })} placeholder="0.00" style={S.inputFull} />
          </FormField>
          <FormField label="Categoria">
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={S.inputFull}>
              {CATEGORIE_SPESE.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Data">
            <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={S.inputFull} />
          </FormField>
          <motion.button whileTap={{ scale: 0.97 }} onClick={aggiungi} style={S.btn('#3B82F6')}>Aggiungi spesa</motion.button>
        </div>

        <AnimatePresence>
          {perCat.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={S.card}>
              <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Per categoria</h3>
              <ResponsiveContainer width="100%" height={185}>
                <PieChart>
                  <Pie data={perCat} cx="50%" cy="50%" innerRadius={46} outerRadius={74} paddingAngle={3} dataKey="value">
                    {perCat.map((e, i) => <Cell key={i} fill={COLORI_CAT[e.name] || '#94A3B8'} />)}
                  </Pie>
                  <Tooltip formatter={v => `€ ${v}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {perCat.map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORI_CAT[c.name] || '#94A3B8' }} />
                      <span style={{ color: '#475569' }}>{c.name}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>€ {c.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={S.card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Budget mensile</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" defaultValue={data.budget}
              onBlur={e => updateData('budget', +e.target.value || 0)}
              style={{ ...S.inputFull, flex: 1 }} />
            <span style={{ color: '#64748B', fontSize: 14, whiteSpace: 'nowrap' }}>€/mese</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SCADENZE ──────────────────────────────────────────────────────────────────
function ScadenzeTab({ data, updateData }) {
  const [form, setForm]     = useState({ nome: '', data: '', categoria: 'Assicurazione', note: '', ripetizione: 'annuale' })
  const [errors, setErrors] = useState({})
  const [mostraGestite, setMostraGestite] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Inserisci un nome'
    if (!form.data) e.data = 'Inserisci una data'
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    updateData('scadenze', [...data.scadenze, { ...form, id: Date.now(), gestita: false }])
    setForm({ nome: '', data: '', categoria: 'Assicurazione', note: '', ripetizione: 'annuale' })
    setErrors({})
  }

  const rimuovi = (id) => updateData('scadenze', data.scadenze.filter(s => s.id !== id))

  const segnaGestita = (id) => {
    const s = data.scadenze.find(x => x.id === id)
    if (!s) return
    let nuove = data.scadenze.map(x => x.id === id ? { ...x, gestita: true } : x)
    // Auto-rinnovo annuale
    if (s.ripetizione === 'annuale') {
      const next = new Date(s.data)
      next.setFullYear(next.getFullYear() + 1)
      nuove = [...nuove, { ...s, id: Date.now(), gestita: false, data: next.toISOString().slice(0, 10) }]
    }
    updateData('scadenze', nuove)
  }

  const attive  = [...data.scadenze].filter(s => !s.gestita).sort((a, b) => a.data?.localeCompare(b.data))
  const gestite = [...data.scadenze].filter(s => s.gestita).sort((a, b) => b.data?.localeCompare(a.data))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>📅 Scadenze & Documenti</h2>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setMostraGestite(v => !v)}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: 12, color: '#64748B', fontWeight: 500 }}>
              {mostraGestite ? 'Mostra attive' : `Archivio (${gestite.length})`}
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {!mostraGestite ? (
              <motion.div key="attive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {attive.length === 0
                  ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna scadenza attiva 🎉</p>
                  : <AnimatePresence mode="popLayout">
                      {attive.map(s => {
                        const { color, label, bg } = scadCol(s.data)
                        return (
                          <motion.div key={s.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: bg, borderRadius: 12, border: `1px solid ${color}33`, marginBottom: 8 }}>
                            <div style={{ width: 46, height: 46, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>{s.nome}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>{s.categoria} · {new Date(s.data).toLocaleDateString('it-IT')}</p>
                              {s.note && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8' }}>{s.note}</p>}
                              {s.ripetizione === 'annuale' && <span style={{ fontSize: 10, background: '#EFF6FF', color: '#3B82F6', padding: '1px 6px', borderRadius: 6, marginTop: 3, display: 'inline-block' }}>↻ annuale</span>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => segnaGestita(s.id)}
                                style={{ padding: '5px 10px', background: '#10B981', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                ✓ Gestita
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => rimuovi(s.id)}
                                style={{ padding: '5px 10px', background: 'none', color: '#94A3B8', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                                Elimina
                              </motion.button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                }
              </motion.div>
            ) : (
              <motion.div key="gestite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {gestite.length === 0
                  ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Nessuna scadenza archiviata</p>
                  : <AnimatePresence mode="popLayout">
                      {gestite.map(s => (
                        <motion.div key={s.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 6, opacity: 0.7 }}>
                          <span style={{ fontSize: 16 }}>✅</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748B', textDecoration: 'line-through' }}>{s.nome}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{new Date(s.data).toLocaleDateString('it-IT')}</p>
                          </div>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => rimuovi(s.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 18 }}>×</motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Form */}
      <div style={{ ...S.card, alignSelf: 'start' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1E293B' }}>+ Nuova scadenza</h3>
        <FormField label="Nome" error={errors.nome}>
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="es. Bollo auto" style={S.inputFull} onKeyDown={e => e.key === 'Enter' && aggiungi()} />
        </FormField>
        <FormField label="Data scadenza" error={errors.data}>
          <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={S.inputFull} />
        </FormField>
        <FormField label="Categoria">
          <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={S.inputFull}>
            {CATEGORIE_SCADENZE.map(c => <option key={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Ripetizione">
          <select value={form.ripetizione} onChange={e => setForm({ ...form, ripetizione: e.target.value })} style={S.inputFull}>
            <option value="nessuna">Nessuna</option>
            <option value="annuale">Annuale (auto-rinnovo)</option>
          </select>
        </FormField>
        <FormField label="Note">
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Opzionale" style={S.inputFull} />
        </FormField>
        <motion.button whileTap={{ scale: 0.97 }} onClick={aggiungi} style={S.btn('#F59E0B')}>Aggiungi scadenza</motion.button>
      </div>
    </div>
  )
}

// ── ATTIVITÀ ──────────────────────────────────────────────────────────────────
function AttivitaTab({ data, updateData }) {
  const [form, setForm]     = useState({ testo: '', stanza: 'Generale', assegnato: '', priorita: 'Media' })
  const [errors, setErrors] = useState({})
  const [filtro, setFiltro] = useState('tutte')
  const [filtroStanza, setFiltroStanza] = useState('Tutte')

  const validate = () => {
    const e = {}
    if (!form.testo.trim()) e.testo = "Descrivi l'attività"
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    updateData('attivita', [...data.attivita, { ...form, id: Date.now(), completata: false, creatoIl: new Date().toISOString().slice(0, 10) }])
    setForm({ testo: '', stanza: 'Generale', assegnato: '', priorita: 'Media' })
    setErrors({})
  }

  const toggle  = (id) => updateData('attivita', data.attivita.map(a => a.id === id ? { ...a, completata: !a.completata } : a))
  const rimuovi = (id) => updateData('attivita', data.attivita.filter(a => a.id !== id))

  const pc = { Alta: '#EF4444', Media: '#F59E0B', Bassa: '#10B981' }

  let lista = [...data.attivita]
  if (filtro === 'aperte')     lista = lista.filter(a => !a.completata)
  if (filtro === 'completate') lista = lista.filter(a => a.completata)
  if (filtroStanza !== 'Tutte') lista = lista.filter(a => a.stanza === filtroStanza)
  // Auto-sort: aperte prima per priorità, completate in fondo
  lista.sort((a, b) => {
    if (a.completata !== b.completata) return a.completata ? 1 : -1
    return PRIORITA_ORD[a.priorita] - PRIORITA_ORD[b.priorita]
  })

  const aperte     = data.attivita.filter(a => !a.completata).length
  const completate = data.attivita.filter(a => a.completata).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>✅ Lista attività</h2>
            <span style={{ fontSize: 13, color: '#64748B' }}>{aperte} da fare · {completate} ok</span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {['tutte', 'aperte', 'completate'].map(f => (
              <motion.button key={f} whileTap={{ scale: 0.9 }} onClick={() => setFiltro(f)}
                style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: filtro === f ? '#10B981' : '#F1F5F9', color: filtro === f ? 'white' : '#64748B' }}>
                {f}
              </motion.button>
            ))}
            <select value={filtroStanza} onChange={e => setFiltroStanza(e.target.value)} style={{ ...S.input, fontSize: 12, padding: '5px 8px' }}>
              <option value="Tutte">Tutte le stanze</option>
              {STANZE.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {lista.length === 0
            ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#94A3B8', fontSize: 14 }}>
                {filtro === 'aperte' ? 'Tutte le attività completate 🎉' : 'Nessuna attività'}
              </motion.p>
            : <AnimatePresence mode="popLayout">
                {lista.map(a => (
                  <motion.div key={a.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: a.completata ? '#F8FAFC' : 'white', border: `1px solid ${a.completata ? '#F1F5F9' : '#E2E8F0'}`, borderRadius: 10, marginBottom: 6 }}>
                    {/* Custom checkbox */}
                    <motion.div whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.82 }} onClick={() => toggle(a.id)}
                      style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${a.completata ? '#10B981' : '#CBD5E1'}`, background: a.completata ? '#10B981' : 'white', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>
                      <AnimatePresence>
                        {a.completata && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>✓</motion.span>}
                      </AnimatePresence>
                    </motion.div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, color: a.completata ? '#94A3B8' : '#1E293B', textDecoration: a.completata ? 'line-through' : 'none' }}>{a.testo}</p>
                      <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '1px 6px', borderRadius: 6 }}>{a.stanza}</span>
                        {a.assegnato && <span style={{ fontSize: 11, background: '#EFF6FF', color: '#3B82F6', padding: '1px 6px', borderRadius: 6 }}>👤 {a.assegnato}</span>}
                        <span style={{ fontSize: 11, background: pc[a.priorita] + '22', color: pc[a.priorita], padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>{a.priorita}</span>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.75 }} onClick={() => rimuovi(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 20, padding: '0 2px', lineHeight: 1 }}>×</motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
          }
        </div>
      </div>

      {/* Form */}
      <div style={{ ...S.card, alignSelf: 'start' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1E293B' }}>+ Nuova attività</h3>
        <FormField label="Cosa fare" error={errors.testo}>
          <input value={form.testo} onChange={e => setForm({ ...form, testo: e.target.value })} placeholder="es. Riparare rubinetto" style={S.inputFull} onKeyDown={e => e.key === 'Enter' && aggiungi()} />
        </FormField>
        <FormField label="Stanza">
          <select value={form.stanza} onChange={e => setForm({ ...form, stanza: e.target.value })} style={S.inputFull}>
            {STANZE.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Assegna a">
          <select value={form.assegnato} onChange={e => setForm({ ...form, assegnato: e.target.value })} style={S.inputFull}>
            <option value="">— nessuno —</option>
            {data.membrifamiglia.map(m => <option key={m}>{m}</option>)}
          </select>
        </FormField>
        <FormField label="Priorità">
          <select value={form.priorita} onChange={e => setForm({ ...form, priorita: e.target.value })} style={S.inputFull}>
            {['Alta', 'Media', 'Bassa'].map(p => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        <motion.button whileTap={{ scale: 0.97 }} onClick={aggiungi} style={S.btn('#10B981')}>Aggiungi attività</motion.button>

        {data.attivita.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16, padding: 14, background: '#F8FAFC', borderRadius: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Completamento</p>
            <ProgBar pct={(completate / data.attivita.length) * 100} color="#10B981" />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>{completate}/{data.attivita.length} — {((completate / data.attivita.length) * 100).toFixed(0)}%</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── CONSUMI ───────────────────────────────────────────────────────────────────
function ConsumiTab({ data, updateData }) {
  const [form, setForm] = useState({ mese: mc(), luce: '', gas: '', acqua: '' })

  const salva = () => {
    if (!form.luce && !form.gas && !form.acqua) return
    const idx = data.consumi.findIndex(c => c.mese === form.mese)
    if (idx >= 0) { const u = [...data.consumi]; u[idx] = { ...form }; updateData('consumi', u) }
    else updateData('consumi', [...data.consumi, { ...form, id: Date.now() }])
  }

  const rimuovi = (mese) => updateData('consumi', data.consumi.filter(c => c.mese !== mese))

  const ordinati = [...data.consumi].sort((a, b) => a.mese?.localeCompare(b.mese)).slice(-12)
  const totC = (c) => +(c.luce||0) + +(c.gas||0) + +(c.acqua||0)

  const media = ordinati.length ? sum(ordinati, totC) / ordinati.length : 0
  const ult   = ordinati[ordinati.length - 1]
  const penu  = ordinati[ordinati.length - 2]

  const chartData = ordinati.map(c => ({
    name: MESI[+c.mese?.slice(5, 7) - 1] + " '" + c.mese?.slice(2, 4),
    Luce: +(c.luce||0), Gas: +(c.gas||0), Acqua: +(c.acqua||0),
    Totale: totC(c),
  }))

  const formTot = +(form.luce||0) + +(form.gas||0) + +(form.acqua||0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stat cards */}
        {ordinati.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Media mensile', value: `€ ${media.toFixed(0)}`, color: '#8B5CF6', bg: '#F5F3FF' },
              { label: 'Ultimo mese',   value: ult ? `€ ${totC(ult).toFixed(0)}` : '—', color: ult && totC(ult) > media ? '#EF4444' : '#10B981', bg: ult && totC(ult) > media ? '#FEF2F2' : '#ECFDF5' },
              { label: 'Proiezione annuale', value: `€ ${(media * 12).toFixed(0)}`, color: '#3B82F6', bg: '#EFF6FF' },
            ].map(st => (
              <div key={st.label} style={{ ...S.card, padding: 14, textAlign: 'center' }}>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: '#64748B' }}>{st.label}</p>
                <p style={{ margin: 0, fontSize: 19, fontWeight: 700, color: st.color }}>{st.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        <div style={S.card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1E293B' }}>⚡ Consumi energetici</h2>
          {chartData.length < 2
            ? <p style={{ color: '#94A3B8', fontSize: 14 }}>Aggiungi almeno 2 mesi per il grafico comparativo</p>
            : <ResponsiveContainer width="100%" height={275}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip formatter={(v, n) => [`€ ${v}`, n]} />
                  <Legend />
                  <Line type="monotone" dataKey="Luce"   stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Gas"    stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Acqua"  stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Totale" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>

        {ordinati.length > 0 && (
          <div style={S.card}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Storico mensile</h3>
            <AnimatePresence mode="popLayout">
              {[...ordinati].reverse().map((c) => {
                const tot = totC(c)
                const sopra = tot > media
                return (
                  <motion.div key={c.mese} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: '#475569', fontSize: 13, minWidth: 65 }}>
                        {MESI[+c.mese?.slice(5, 7) - 1]} {c.mese?.slice(0, 4)}
                      </span>
                      <span style={{ fontSize: 11, color: sopra ? '#EF4444' : '#10B981' }}>{sopra ? '↑ sopra' : '↓ sotto'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#64748B', alignItems: 'center' }}>
                      <span>⚡{(+(c.luce||0)).toFixed(0)}</span>
                      <span>🔥{(+(c.gas||0)).toFixed(0)}</span>
                      <span>💧{(+(c.acqua||0)).toFixed(0)}</span>
                      <span style={{ fontWeight: 700, color: sopra ? '#EF4444' : '#10B981', minWidth: 52, textAlign: 'right' }}>€{tot.toFixed(0)}</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => rimuovi(c.mese)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 18, marginLeft: 6 }}>×</motion.button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ ...S.card, alignSelf: 'start' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1E293B' }}>+ Inserisci consumi</h3>
        <FormField label="Mese">
          <input type="month" value={form.mese} onChange={e => setForm({ ...form, mese: e.target.value })} style={S.inputFull} />
        </FormField>
        <FormField label="⚡ Luce (€)">
          <input type="number" value={form.luce} onChange={e => setForm({ ...form, luce: e.target.value })} placeholder="0.00" style={S.inputFull} />
        </FormField>
        <FormField label="🔥 Gas (€)">
          <input type="number" value={form.gas} onChange={e => setForm({ ...form, gas: e.target.value })} placeholder="0.00" style={S.inputFull} />
        </FormField>
        <FormField label="💧 Acqua (€)">
          <input type="number" value={form.acqua} onChange={e => setForm({ ...form, acqua: e.target.value })} placeholder="0.00" style={S.inputFull} />
        </FormField>

        <AnimatePresence>
          {formTot > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 10, padding: '10px 12px', background: '#F5F3FF', borderRadius: 10, fontSize: 13, color: '#8B5CF6', fontWeight: 600 }}>
              Totale: € {formTot.toFixed(2)}
              {media > 0 && <span style={{ fontSize: 11, color: formTot > media ? '#EF4444' : '#10B981', marginLeft: 8 }}>
                ({formTot > media ? '↑' : '↓'} media € {media.toFixed(0)})
              </span>}
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94A3B8' }}>Se il mese esiste già, i dati verranno aggiornati.</p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={salva} style={S.btn('#8B5CF6')}>Salva consumi</motion.button>

        {ult && penu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10 }}>
            <p style={{ margin: '0 0 3px', fontSize: 11, color: '#64748B' }}>Confronto ultimi 2 mesi</p>
            <Delta curr={totC(ult)} prev={totC(penu)} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function DashboardCasa() {
  const [tab, setTab]   = useState('home')
  const [data, setData] = useState(INITIAL)
  const importRef       = useRef(null)

  useEffect(() => {
    try { const s = localStorage.getItem('dashboard-casa'); if (s) setData({ ...INITIAL, ...JSON.parse(s) }) } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem('dashboard-casa', JSON.stringify(data))
  }, [data])

  const updateData = (key, val) => setData(prev => ({ ...prev, [key]: val }))

  const importJSON = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try { setData({ ...INITIAL, ...JSON.parse(ev.target.result) }) } catch { alert('File non valido') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Badge
  const sAlert  = data.scadenze.filter(s => { if (s.gestita) return false; const g = Math.ceil((new Date(s.data) - new Date()) / 864e5); return g < 0 || g <= 7 }).length
  const aAperte = data.attivita.filter(a => !a.completata).length

  const tabs = [
    { id: 'home',     label: '🏡 Home',     color: '#1E293B' },
    { id: 'spese',    label: '💰 Spese',    color: '#3B82F6' },
    { id: 'scadenze', label: '📅 Scadenze', color: '#F59E0B', badge: sAlert,  badgeColor: '#EF4444' },
    { id: 'attivita', label: '✅ Attività', color: '#10B981', badge: aAperte, badgeColor: '#F59E0B' },
    { id: 'consumi',  label: '⚡ Consumi',  color: '#8B5CF6' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.span
            animate={{ rotate: [0, 12, -6, 0] }}
            transition={{ delay: 0.8, duration: 0.55, ease: 'easeInOut' }}
            style={{ fontSize: 28, display: 'inline-block' }}>🏠</motion.span>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#1E293B' }}>Casa Nostra</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data.membrifamiglia.map(m => (
            <motion.div key={m} whileHover={{ scale: 1.12 }} title={m}
              style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6FF', border: '2px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#3B82F6', cursor: 'default' }}>
              {m[0].toUpperCase()}
            </motion.div>
          ))}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => exportJSON(data)}
            style={{ padding: '6px 10px', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}>
            ⬇ Export
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => importRef.current?.click()}
            style={{ padding: '6px 10px', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}>
            ⬆ Import
          </motion.button>
          <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />
        </div>
      </header>

      {/* NAV */}
      <nav style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 24px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {tabs.map(t => (
          <motion.button key={t.id} onClick={() => setTab(t.id)} whileTap={{ scale: 0.94 }}
            style={{
              padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? t.color : '#64748B',
              borderBottom: tab === t.id ? `3px solid ${t.color}` : '3px solid transparent',
              whiteSpace: 'nowrap', position: 'relative', transition: 'color 0.15s',
            }}>
            {t.label}
            {t.badge > 0 && <NotifBadge count={t.badge} color={t.badgeColor} />}
          </motion.button>
        ))}
      </nav>

      {/* CONTENT */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} variants={TAB_V} initial="initial" animate="animate" exit="exit">
            {tab === 'home'     && <HomeTab     data={data} setTab={setTab} />}
            {tab === 'spese'    && <SpeseTab    data={data} updateData={updateData} />}
            {tab === 'scadenze' && <ScadenzeTab data={data} updateData={updateData} />}
            {tab === 'attivita' && <AttivitaTab data={data} updateData={updateData} />}
            {tab === 'consumi'  && <ConsumiTab  data={data} updateData={updateData} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}