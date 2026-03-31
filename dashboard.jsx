'use client'
/**
 * Dashboard Casa — v3 (tutte le feature)
 * npm install framer-motion recharts
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

// ── SUPABASE ───────────────────────────────────────────────────────────────────
const supabase = createClient(
  'https://dszjuniyjwjifjbxjdjl.supabase.co',
  'sb_publishable_2u9avH3evns68qQECSEKFQ_ZealKOk7'
)
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

// ── FA ICON HELPER ─────────────────────────────────────────────────────────────
const I = (cls, style) => {
  const e = document.createElement('i')
  e.className = cls
  if (style) Object.assign(e.style, style)
  return e
}
// React-friendly inline FA icon
const Fa = ({icon, style, className=''}) => <i className={`${icon} ${className}`} style={{...style}} />

// Styled tooltip wrapper
const Tip = ({label, children, pos='bottom'}) => {
  const [show, setShow] = useState(false)
  const top = pos === 'top'
  return <span style={{position:'relative',display:'inline-flex'}}
    onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
    {children}
    {show && <span style={{position:'absolute',[top?'bottom':'top']:'calc(100% + 8px)',left:'50%',transform:'translateX(-50%)',
      background:'#1E293B',color:'#F1F5F9',fontSize:11,fontWeight:500,padding:'5px 10px',borderRadius:6,
      whiteSpace:'nowrap',pointerEvents:'none',zIndex:9999,boxShadow:'0 4px 12px rgba(0,0,0,.25)',
      animation:'tipIn .15s ease'}}>{label}
      <span style={{position:'absolute',[top?'top':'bottom']:'100%',left:'50%',transform:'translateX(-50%)',
        border:'5px solid transparent',[top?'borderTopColor':'borderBottomColor']:'#1E293B'}} />
    </span>}
  </span>
}

// ── CUSTOM SELECT (bottom-sheet pannello) ───────────────────────────────────────
const Sel = ({value, onChange, options, style, placeholder}) => {
  const [open, setOpen] = useState(false)
  const t = useT()
  const opts = options.map(o => typeof o === 'string' ? {value:o, label:o} : o)
  const sel = opts.find(o => o.value === value)
  const pick = v => { onChange({target:{value:v}}); setOpen(false) }
  return <>
    <div onClick={()=>setOpen(true)}
      style={{...style, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none', gap:6}}>
      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,color:sel?undefined:t.textMut}}>{sel ? sel.label : (placeholder||'Seleziona...')}</span>
      <Fa icon='fa-solid fa-chevron-down' style={{fontSize:10,flexShrink:0,color:t.textMut}} />
    </div>
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          onClick={()=>setOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:9998}}>
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:300,damping:30}}
            onClick={e=>e.stopPropagation()}
            style={{position:'absolute',bottom:0,left:0,right:0,background:t.cardBg,borderRadius:'20px 20px 0 0',
              padding:'12px 16px 24px',boxShadow:'0 -8px 30px rgba(0,0,0,0.18)',maxHeight:'55vh',display:'flex',flexDirection:'column'}}>
            <div style={{width:36,height:4,borderRadius:2,background:t.border,margin:'0 auto 12px',flexShrink:0}} />
            <p style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:t.text,textAlign:'center'}}>{placeholder||'Seleziona'}</p>
            <div style={{overflowY:'auto',flex:1,display:'grid',gridTemplateColumns:opts.length<=4?'repeat(2,1fr)':'repeat(3,1fr)',gap:8}}>
              {opts.map(o => {
                const active = o.value === value
                return (
                  <motion.button key={o.value} whileTap={{scale:0.93}} onClick={()=>pick(o.value)}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',
                      padding:'14px 8px',background:active?'#3B82F618':t.tagBg,
                      border:active?'2px solid #3B82F6':'2px solid transparent',
                      borderRadius:14,cursor:'pointer',transition:'all 0.15s',minHeight:48}}>
                    <span style={{fontSize:13,fontWeight:active?700:500,color:active?'#3B82F6':t.textSec,lineHeight:1.3}}>{o.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const CATEGORIE_SPESE_DEFAULT    = ['Casa','Spesa','Bollette','Trasporti','Salute','Intrattenimento','Extra']
const CATEGORIE_SCADENZE_DEFAULT = ['Assicurazione','Bollo','Manutenzione','Documento','Abbonamento','Altro']
const STANZE     = ['Cucina','Bagno','Soggiorno','Camera','Giardino','Garage','Generale']
const MESI       = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const MESI_FULL  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GG_SETT    = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

// ── CUSTOM DATE PICKER (bottom-sheet calendario) ────────────────────────────────
const DatePick = ({value, onChange, style, placeholder}) => {
  const [open, setOpen] = useState(false)
  const t = useT()
  const today = new Date()
  const parsed = value ? new Date(value+'T00:00:00') : today
  const [viewY, setViewY] = useState(parsed.getFullYear())
  const [viewM, setViewM] = useState(parsed.getMonth())

  const fmtLabel = v => {
    if (!v) return placeholder || 'Seleziona data'
    const d = new Date(v+'T00:00:00')
    return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`
  }

  const daysInMonth = new Date(viewY, viewM+1, 0).getDate()
  const firstDay = (new Date(viewY, viewM, 1).getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const pick = day => {
    const v = `${viewY}-${String(viewM+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    onChange({target:{value:v}})
    setOpen(false)
  }
  const prev = () => { if (viewM===0){setViewM(11);setViewY(y=>y-1)} else setViewM(m=>m-1) }
  const next = () => { if (viewM===11){setViewM(0);setViewY(y=>y+1)} else setViewM(m=>m+1) }
  const selDay = value ? +value.split('-')[2] : null
  const selM = value ? +value.split('-')[1]-1 : null
  const selY = value ? +value.split('-')[0] : null
  const isToday = (d) => d===today.getDate() && viewM===today.getMonth() && viewY===today.getFullYear()

  return <>
    <div onClick={()=>{setOpen(true);if(value){const p=new Date(value+'T00:00:00');setViewY(p.getFullYear());setViewM(p.getMonth())}}}
      style={{...style, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none', gap:6}}>
      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,color:value?undefined:t.textMut}}>{fmtLabel(value)}</span>
      <Fa icon='fa-solid fa-calendar-days' style={{fontSize:12,flexShrink:0,color:t.textMut}} />
    </div>
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          onClick={()=>setOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:9998}}>
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:300,damping:30}}
            onClick={e=>e.stopPropagation()}
            style={{position:'absolute',bottom:0,left:0,right:0,background:t.cardBg,borderRadius:'20px 20px 0 0',
              padding:'12px 16px 24px',boxShadow:'0 -8px 30px rgba(0,0,0,0.18)'}}>
            <div style={{width:36,height:4,borderRadius:2,background:t.border,margin:'0 auto 12px'}} />
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <motion.button whileTap={{scale:0.85}} onClick={prev} style={{background:'none',border:'none',cursor:'pointer',padding:8,fontSize:16,color:t.textSec}}>
                <Fa icon='fa-solid fa-chevron-left' />
              </motion.button>
              <span style={{fontSize:15,fontWeight:700,color:t.text}}>{MESI_FULL[viewM]} {viewY}</span>
              <motion.button whileTap={{scale:0.85}} onClick={next} style={{background:'none',border:'none',cursor:'pointer',padding:8,fontSize:16,color:t.textSec}}>
                <Fa icon='fa-solid fa-chevron-right' />
              </motion.button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
              {GG_SETT.map(g=><div key={g} style={{textAlign:'center',fontSize:11,fontWeight:600,color:t.textMut,padding:4}}>{g}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
              {cells.map((d,i) => {
                if (!d) return <div key={'e'+i} />
                const active = d===selDay && viewM===selM && viewY===selY
                return (
                  <motion.button key={i} whileTap={{scale:0.88}} onClick={()=>pick(d)}
                    style={{width:'100%',aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
                      background:active?'#3B82F6':isToday(d)?'#3B82F615':'transparent',
                      color:active?'white':isToday(d)?'#3B82F6':t.text,
                      border:isToday(d)&&!active?'1.5px solid #3B82F6':'2px solid transparent',
                      borderRadius:12,cursor:'pointer',fontSize:14,fontWeight:active||isToday(d)?700:400,transition:'all 0.12s'}}>
                    {d}
                  </motion.button>
                )
              })}
            </div>
            <motion.button whileTap={{scale:0.95}} onClick={()=>{const td=today.toISOString().slice(0,10);onChange({target:{value:td}});setOpen(false)}}
              style={{marginTop:12,width:'100%',padding:10,background:t.tagBg,border:'none',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,color:'#3B82F6'}}>
              Oggi
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
}

// ── CUSTOM MONTH PICKER (bottom-sheet mese/anno) ────────────────────────────────
const MonthPick = ({value, onChange, style, placeholder}) => {
  const [open, setOpen] = useState(false)
  const t = useT()
  const today = new Date()
  const curY = value ? +value.split('-')[0] : today.getFullYear()
  const curM = value ? +value.split('-')[1]-1 : today.getMonth()
  const [viewY, setViewY] = useState(curY)

  const fmtLabel = v => {
    if (!v) return placeholder || 'Seleziona mese'
    const [y,m] = v.split('-')
    return `${MESI_FULL[+m-1]} ${y}`
  }

  const pick = m => {
    const v = `${viewY}-${String(m+1).padStart(2,'0')}`
    onChange({target:{value:v}})
    setOpen(false)
  }

  return <>
    <div onClick={()=>{setOpen(true);if(value)setViewY(+value.split('-')[0])}}
      style={{...style, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none', gap:6}}>
      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,color:value?undefined:t.textMut}}>{fmtLabel(value)}</span>
      <Fa icon='fa-solid fa-calendar-days' style={{fontSize:12,flexShrink:0,color:t.textMut}} />
    </div>
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          onClick={()=>setOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:9998}}>
          <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:300,damping:30}}
            onClick={e=>e.stopPropagation()}
            style={{position:'absolute',bottom:0,left:0,right:0,background:t.cardBg,borderRadius:'20px 20px 0 0',
              padding:'12px 16px 24px',boxShadow:'0 -8px 30px rgba(0,0,0,0.18)'}}>
            <div style={{width:36,height:4,borderRadius:2,background:t.border,margin:'0 auto 12px'}} />
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <motion.button whileTap={{scale:0.85}} onClick={()=>setViewY(y=>y-1)} style={{background:'none',border:'none',cursor:'pointer',padding:8,fontSize:16,color:t.textSec}}>
                <Fa icon='fa-solid fa-chevron-left' />
              </motion.button>
              <span style={{fontSize:16,fontWeight:700,color:t.text}}>{viewY}</span>
              <motion.button whileTap={{scale:0.85}} onClick={()=>setViewY(y=>y+1)} style={{background:'none',border:'none',cursor:'pointer',padding:8,fontSize:16,color:t.textSec}}>
                <Fa icon='fa-solid fa-chevron-right' />
              </motion.button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {MESI_FULL.map((m,i) => {
                const active = i===curM && viewY===curY
                const isCur = i===today.getMonth() && viewY===today.getFullYear()
                return (
                  <motion.button key={m} whileTap={{scale:0.93}} onClick={()=>pick(i)}
                    style={{padding:'14px 8px',background:active?'#3B82F618':t.tagBg,
                      border:active?'2px solid #3B82F6':isCur?'1.5px solid #3B82F6':'2px solid transparent',
                      borderRadius:14,cursor:'pointer',transition:'all 0.15s'}}>
                    <span style={{fontSize:13,fontWeight:active?700:isCur?600:500,color:active?'#3B82F6':isCur?'#3B82F6':t.textSec}}>{m}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
}

// ── CUSTOM INPUT (styled) ───────────────────────────────────────────────────────
const Inp = ({style, onFocus, onBlur, ...props}) => {
  const [focused, setFocused] = useState(false)
  const t = useT()
  return <input {...props}
    style={{padding:'8px 12px',border:`1.5px solid ${focused?'#3B82F6':t.inputBorder}`,
      borderRadius:10,fontSize:14,color:t.text,outline:'none',background:t.inputBg,
      width:'100%',boxSizing:'border-box',transition:'border-color 0.2s,box-shadow 0.2s',
      ...(focused?{boxShadow:'0 0 0 3px rgba(59,130,246,0.08)'}:{}),fontFamily:'inherit',...style}}
    onFocus={e=>{setFocused(true);onFocus?.(e)}}
    onBlur={e=>{setFocused(false);onBlur?.(e)}} />
}

// ── CUSTOM TOGGLE (switch) ──────────────────────────────────────────────────────
const Chk = ({checked, onChange, label, style}) => {
  const t = useT()
  return <div onClick={()=>onChange({target:{checked:!checked}})}
    style={{display:'inline-flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none',...style}}>
    <motion.div animate={{background:checked?'#3B82F6':(t.border||'#CBD5E1')}}
      style={{width:44,height:24,borderRadius:12,position:'relative',flexShrink:0}}>
      <motion.div animate={{x:checked?20:2}} transition={{type:'spring',stiffness:500,damping:30}}
        style={{width:20,height:20,borderRadius:10,background:'white',position:'absolute',top:2,
          boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
    </motion.div>
    {label && <span style={{fontSize:13,color:t.textSec}}>{label}</span>}
  </div>
}

// ── CUSTOM TEXTAREA (styled) ────────────────────────────────────────────────────
const Txa = ({style, onFocus, onBlur, ...props}) => {
  const [focused, setFocused] = useState(false)
  const t = useT()
  return <textarea {...props}
    style={{padding:'10px 12px',border:`1.5px solid ${focused?'#3B82F6':t.inputBorder}`,
      borderRadius:10,fontSize:14,color:t.text,outline:'none',background:t.inputBg,
      width:'100%',boxSizing:'border-box',transition:'border-color 0.2s,box-shadow 0.2s',
      resize:'vertical',fontFamily:'inherit',
      ...(focused?{boxShadow:'0 0 0 3px rgba(59,130,246,0.08)'}:{}),...style}}
    onFocus={e=>{setFocused(true);onFocus?.(e)}}
    onBlur={e=>{setFocused(false);onBlur?.(e)}} />
}

const PRIORITA_ORD = { Alta:0, Media:1, Bassa:2 }
const NOTE_COLORI  = ['#FEF3C7','#DBEAFE','#D1FAE5','#FCE7F3','#F3E8FF','#FEE2E2']
const RUOLI_CONTATTI = ['Idraulico','Elettricista','Medico','Veterinario','Giardiniere','Amministratore','Altro']
const EXTRA_COLORS   = ['#14B8A6','#F97316','#06B6D4','#A855F7','#84CC16','#E11D48','#0EA5E9','#D946EF']
const COLORI_CAT = {
  Casa:'#3B82F6', Spesa:'#10B981', Bollette:'#F59E0B',
  Trasporti:'#8B5CF6', Salute:'#EF4444', Intrattenimento:'#EC4899', Extra:'#6B7280',
}

const TIPI_ACCANTONAMENTO = ['Vacanza','Auto','Casa','Viaggi','Emergenze','Altro']

const ACCENT_COLORS = [
  {value:'#3B82F6',label:'Blu'},
  {value:'#10B981',label:'Verde'},
  {value:'#8B5CF6',label:'Viola'},
  {value:'#F59E0B',label:'Ambra'},
  {value:'#EF4444',label:'Rosso'},
  {value:'#EC4899',label:'Rosa'},
  {value:'#06B6D4',label:'Ciano'},
  {value:'#F97316',label:'Arancione'},
  {value:'#6366F1',label:'Indaco'},
]

const LISTA_SPESA_CAT = ['Frutta/Verdura','Carne/Pesce','Latticini','Pane/Pasta','Bevande','Surgelati','Pulizia','Igiene','Altro']

const INITIAL = {
  spese:[], scadenze:[], attivita:[], consumi:[],
  membrifamiglia:['Carmine','Partner','Bambino'],
  budget:2000,
  budgetCategorie:{},
  conti:[{id:1,nome:'Conto principale',saldo:0}],
  entrateMensili:0,
  stipendi:[],
  note:[], contatti:[], inventario:[],
  accantonamenti:[],
  rimborsi:[],
  badges:[],
  categorieSpese:[...CATEGORIE_SPESE_DEFAULT],
  categorieScadenze:[...CATEGORIE_SCADENZE_DEFAULT],
  goalRisparmio:500,
  darkMode:false,
  backupIntervallo:0,
  ultimoBackup:null,
  listaSpesa:[],
  accentColor:'#3B82F6',
  fotoAllegati:{},
}

// ── THEMES ─────────────────────────────────────────────────────────────────────
const makeThemes = (accent='#3B82F6') => ({
  light: {
    bg:'#F8FAFC', cardBg:'white', text:'#1E293B', textSec:'#64748B',
    textMut:'#94A3B8', border:'#E2E8F0', inputBg:'white', inputBorder:'#E2E8F0',
    rowBg:'#F8FAFC', shadow:'0 1px 3px rgba(0,0,0,0.06)',
    headerBg:'white', navBg:'white', tagBg:'#F1F5F9', tagText:'#64748B',
    accent, accentBg:accent+'15', accentLight:accent+'30',
  },
  dark: {
    bg:'#0F172A', cardBg:'#1E293B', text:'#F1F5F9', textSec:'#94A3B8',
    textMut:'#64748B', border:'#334155', inputBg:'#334155', inputBorder:'#475569',
    rowBg:'#283548', shadow:'0 1px 3px rgba(0,0,0,0.4)',
    headerBg:'#1E293B', navBg:'#1E293B', tagBg:'#334155', tagText:'#94A3B8',
    accent, accentBg:accent+'15', accentLight:accent+'30',
  },
})
const THEMES = makeThemes()
const ThemeCtx = createContext(THEMES.light)
const useT = () => useContext(ThemeCtx)

const ToastCtx = createContext(() => {})
const useToast = () => useContext(ToastCtx)

const makeS = (t) => ({
  input:     { padding:'8px 12px', border:`1px solid ${t.inputBorder}`, borderRadius:8, fontSize:14, color:t.text, outline:'none', background:t.inputBg },
  inputFull: { padding:'8px 12px', border:`1px solid ${t.inputBorder}`, borderRadius:8, fontSize:14, color:t.text, outline:'none', background:t.inputBg, width:'100%', boxSizing:'border-box' },
  btn:  (c) => ({ width:'100%', padding:'12px', background:c, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 }),
  card:      { background:t.cardBg, borderRadius:16, padding:20, boxShadow:t.shadow },
  smallBtn:  (active,c) => ({ padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:active?(c||'#1E293B'):t.tagBg, color:active?'white':t.tagText, transition:'all 0.15s' }),
})

// ── FRAMER VARIANTS ────────────────────────────────────────────────────────────
const TAB_V  = { initial:{opacity:0,y:14}, animate:{opacity:1,y:0,transition:{duration:0.22,ease:[0.25,0.46,0.45,0.94]}}, exit:{opacity:0,y:-8,transition:{duration:0.14}} }
const ITEM_V = { initial:{opacity:0,x:-14,scale:0.97}, animate:{opacity:1,x:0,scale:1,transition:{type:'spring',stiffness:340,damping:28}}, exit:{opacity:0,x:48,scale:0.94,transition:{duration:0.17,ease:'easeIn'}} }
const CARD_V = { initial:{opacity:0,y:18,scale:0.97}, animate:(i)=>({opacity:1,y:0,scale:1,transition:{delay:i*0.08,duration:0.28,ease:'easeOut'}}) }

// ── UTILITIES ──────────────────────────────────────────────────────────────────
const mc  = () => new Date().toISOString().slice(0,7)
const mp  = () => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7) }
const sum = (arr, fn) => arr.reduce((a,x) => a+(fn?fn(x):x), 0)
const catCol = (cat) => COLORI_CAT[cat] || EXTRA_COLORS[Math.abs([...cat].reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0)) % EXTRA_COLORS.length] || '#94A3B8'

function scadCol(data) {
  const gg = Math.ceil((new Date(data)-new Date())/864e5)
  if (gg<0)   return {color:'#EF4444',label:'Scaduta',bg:'#EF444415'}
  if (gg<=7)  return {color:'#F59E0B',label:`${gg}g`, bg:'#F59E0B15'}
  if (gg<=30) return {color:'#3B82F6',label:`${gg}g`, bg:'#3B82F615'}
  return        {color:'#10B981',label:`${gg}g`, bg:'#10B98115'}
}

function ultimi6()  { return Array.from({length:6}, (_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()-(5-i));  return d.toISOString().slice(0,7) }) }
function ultimi12() { return Array.from({length:12},(_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()-(11-i)); return d.toISOString().slice(0,7) }) }

const totMese = (spese,mese) => sum(spese.filter(s=>s.data?.startsWith(mese)), s=>+s.importo)
const totAnno = (spese,anno) => sum(spese.filter(s=>s.data?.startsWith(String(anno))), s=>+s.importo)

function exportJSON(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
  Object.assign(document.createElement('a'),{href:url,download:`dashboard-casa-${new Date().toISOString().slice(0,10)}.json`}).click()
  URL.revokeObjectURL(url)
}

function exportCSV(data) {
  const rows = [['Data','Descrizione','Importo','Categoria','Pagato da','Ricorrente','Condivisa']]
  const sorted = [...data.spese].sort((a,b)=>a.data?.localeCompare(b.data))
  sorted.forEach(s => rows.push([s.data, `"${(s.descrizione||'').replace(/"/g,'""')}"`, s.importo, s.categoria, s.pagatoDa||'', s.ricorrente?'Sì':'No', s.condivisa?'Sì':'No']))
  const csv = rows.map(r => r.join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}))
  Object.assign(document.createElement('a'),{href:url,download:`spese-${new Date().toISOString().slice(0,10)}.csv`}).click()
  URL.revokeObjectURL(url)
}

function exportReport(data) {
  const mese = mc()
  const meseLabel = MESI_FULL[new Date().getMonth()] + ' ' + new Date().getFullYear()
  const spMese = data.spese.filter(s=>s.data?.startsWith(mese))
  const totSpese = sum(spMese, s=>+s.importo)
  const entrate = getStipendioMese(data, mese)
  const perCat = {}
  spMese.forEach(s => { perCat[s.categoria] = (perCat[s.categoria]||0) + +s.importo })
  let txt = `REPORT MENSILE — ${meseLabel}\n${'═'.repeat(40)}\n\n`
  txt += `Stipendio:      € ${entrate.toFixed(2)}\n`
  txt += `Totale spese:   € ${totSpese.toFixed(2)}\n`
  txt += `Saldo:          € ${(entrate-totSpese).toFixed(2)}\n`
  txt += `Budget:         € ${data.budget}\n\n`
  txt += `SPESE PER CATEGORIA\n${'-'.repeat(30)}\n`
  Object.entries(perCat).sort((a,b)=>b[1]-a[1]).forEach(([cat,val]) => { txt += `${cat.padEnd(20)} € ${val.toFixed(2)}\n` })
  txt += `\nDETTAGLIO MOVIMENTI\n${'-'.repeat(30)}\n`
  spMese.sort((a,b)=>a.data?.localeCompare(b.data)).forEach(s => { txt += `${s.data}  ${s.descrizione.padEnd(25)} € ${(+s.importo).toFixed(2)}  [${s.categoria}]\n` })
  const scadAtt = data.scadenze.filter(s=>!s.gestita).length
  txt += `\n\nSCADENZE ATTIVE: ${scadAtt}\n`
  txt += `ATTIVITÀ APERTE: ${data.attivita.filter(a=>!a.completata).length}\n`
  const url = URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}))
  Object.assign(document.createElement('a'),{href:url,download:`report-${mese}.txt`}).click()
  URL.revokeObjectURL(url)
}

function giorniMese(anno,mese) {
  const days = new Date(anno,mese+1,0).getDate()
  let start = new Date(anno,mese,1).getDay()-1
  if (start<0) start=6
  return {days,start}
}

function calcolaDebiti(spese, membri) {
  if (!membri.length) return []
  const pagato = {}; const quota = {}
  membri.forEach(m => { pagato[m]=0; quota[m]=0 })
  spese.filter(s=>s.pagatoDa && s.condivisa).forEach(s => {
    const imp = +s.importo
    if (pagato[s.pagatoDa] !== undefined) pagato[s.pagatoDa] += imp
    if (s.splitQuote && Object.keys(s.splitQuote).length) {
      Object.entries(s.splitQuote).forEach(([m, pct]) => { if (quota[m] !== undefined) quota[m] += imp * pct / 100 })
    } else {
      const perPersona = imp / membri.length
      membri.forEach(m => { quota[m] += perPersona })
    }
  })
  return membri.map(m => ({ nome:m, pagato:pagato[m]||0, quota:quota[m]||0, saldo:(pagato[m]||0)-(quota[m]||0) }))
}

// Calcola trasferimenti ottimali (chi deve pagare chi)
function calcolaTrasferimenti(spese, membri) {
  const debiti = calcolaDebiti(spese, membri)
  const creditori = debiti.filter(d => d.saldo > 0.5).map(d => ({...d})).sort((a,b) => b.saldo - a.saldo)
  const debitori = debiti.filter(d => d.saldo < -0.5).map(d => ({...d, saldo: -d.saldo})).sort((a,b) => b.saldo - a.saldo)
  const trasf = []
  let ci = 0, di = 0
  while (ci < creditori.length && di < debitori.length) {
    const min = Math.min(creditori[ci].saldo, debitori[di].saldo)
    if (min > 0.5) trasf.push({ da: debitori[di].nome, a: creditori[ci].nome, importo: Math.round(min * 100) / 100 })
    creditori[ci].saldo -= min; debitori[di].saldo -= min
    if (creditori[ci].saldo < 0.5) ci++
    if (debitori[di].saldo < 0.5) di++
  }
  return trasf
}

// Rileva spese potenzialmente ricorrenti
function rilevaRicorrenti(spese) {
  const byDesc = {}
  spese.forEach(s => {
    if (s.ricorrente) return
    const key = s.descrizione?.toLowerCase().trim()
    if (!key) return
    const mese = s.data?.slice(0, 7)
    if (!byDesc[key]) byDesc[key] = {}
    if (!byDesc[key][mese]) byDesc[key][mese] = +s.importo
  })
  const suggerimenti = []
  Object.entries(byDesc).forEach(([desc, mesi]) => {
    const numMesi = Object.keys(mesi).length
    if (numMesi >= 3) {
      const importi = Object.values(mesi)
      const media = importi.reduce((s, v) => s + v, 0) / importi.length
      const variazione = Math.max(...importi) - Math.min(...importi)
      if (variazione / media < 0.25) suggerimenti.push({ descrizione: desc, mesi: numMesi, importoMedio: Math.round(media * 100) / 100 })
    }
  })
  return suggerimenti
}

// Spese ricorrenti mancanti nel mese corrente
function ricorrentiMancanti(spese, meseCorr) {
  const ricorrenti = spese.filter(s => s.ricorrente)
  const descs = [...new Set(ricorrenti.map(s => s.descrizione?.toLowerCase().trim()).filter(Boolean))]
  const speseMese = spese.filter(s => s.data?.startsWith(meseCorr))
  return descs.filter(d => !speseMese.some(s => s.descrizione?.toLowerCase().trim() === d)).map(d => {
    const orig = ricorrenti.find(s => s.descrizione?.toLowerCase().trim() === d)
    return { descrizione: orig?.descrizione || d, importo: orig?.importo || 0 }
  })
}

// Badge definitions
const BADGE_DEFS = [
  { id:'prima-spesa', nome:'Prima Spesa', desc:'Hai registrato la tua prima spesa', icon:'fa-solid fa-star', color:'#F59E0B', check:d=>d.spese.length>=1 },
  { id:'spese-50', nome:'Tracciatore', desc:'50 spese tracciate', icon:'fa-solid fa-fire', color:'#EF4444', check:d=>d.spese.length>=50 },
  { id:'spese-100', nome:'Tracciatore Pro', desc:'100 spese tracciate', icon:'fa-solid fa-fire-flame-curved', color:'#DC2626', check:d=>d.spese.length>=100 },
  { id:'spese-500', nome:'Maestro dei Conti', desc:'500 spese tracciate', icon:'fa-solid fa-crown', color:'#8B5CF6', check:d=>d.spese.length>=500 },
  { id:'sotto-budget-1', nome:'Risparmiatore', desc:'Sotto budget per 1 mese', icon:'fa-solid fa-piggy-bank', color:'#10B981', check:d=>{ const t=totMese(d.spese,mc()); return t>0&&t<d.budget } },
  { id:'sotto-budget-3', nome:'Risparmiatore d\'Oro', desc:'Sotto budget 3 mesi di fila', icon:'fa-solid fa-medal', color:'#F59E0B', check:d=>[0,1,2].every(i=>{const m=new Date();m.setMonth(m.getMonth()-i);const k=m.toISOString().slice(0,7);const t=totMese(d.spese,k);return t>0&&t<d.budget}) },
  { id:'prima-scadenza', nome:'Puntuale', desc:'Prima scadenza gestita', icon:'fa-solid fa-calendar-check', color:'#3B82F6', check:d=>d.scadenze.some(s=>s.gestita) },
  { id:'note-10', nome:'Annotatore', desc:'10 note create', icon:'fa-solid fa-pen-fancy', color:'#F97316', check:d=>d.note.length>=10 },
  { id:'accantonamento-completo', nome:'Obiettivo Raggiunto', desc:'Accantonamento completato al 100%', icon:'fa-solid fa-trophy', color:'#FFD700', check:d=>(d.accantonamenti||[]).some(a=>(a.accantonato||0)>=(a.obiettivo||1)&&a.obiettivo>0) },
  { id:'famiglia-3', nome:'Famiglia Unita', desc:'3+ membri registrati', icon:'fa-solid fa-users', color:'#6366F1', check:d=>d.membrifamiglia.length>=3 },
  { id:'inventario-5', nome:'Casa Ordinata', desc:'5+ oggetti in inventario', icon:'fa-solid fa-boxes-stacked', color:'#0EA5E9', check:d=>d.inventario.length>=5 },
  { id:'rimborso-1', nome:'Conti Pari', desc:'Primo rimborso effettuato', icon:'fa-solid fa-handshake', color:'#14B8A6', check:d=>(d.rimborsi||[]).length>=1 },
]

// Previsione flusso di cassa
function previsioneFlusso(data, giorniAvanti=90) {
  const oggi = new Date()
  const meseCorr = mc()
  const stipendioMese = getStipendioMese(data, meseCorr)
  const speseCorr = totMese(data.spese, meseCorr)
  const ggPassati = oggi.getDate()
  const speseGiorno = ggPassati > 0 ? speseCorr / ggPassati : 0
  const quotaAcc = (data.accantonamenti||[]).reduce((s,a)=>{
    if(a.percentuale&&stipendioMese>0) return s+(stipendioMese*a.percentuale/100)
    return s+(a.importoManuale||0)
  },0)
  let saldo = stipendioMese - speseCorr - quotaAcc
  const punti = []
  for (let i=0;i<=giorniAvanti;i++) {
    const d = new Date(oggi); d.setDate(d.getDate()+i)
    const iso = d.toISOString().slice(0,10)
    if (i>0) {
      if (d.getDate()===1) { saldo += stipendioMese; saldo -= quotaAcc }
      saldo -= speseGiorno
      data.scadenze.filter(s=>!s.gestita&&s.data===iso&&s.importoStimato).forEach(s=>{ saldo -= +s.importoStimato })
    }
    if (i%(giorniAvanti>60?7:giorniAvanti>30?3:1)===0||i===giorniAvanti) {
      punti.push({ data:iso, label:`${d.getDate()}/${d.getMonth()+1}`, saldo:Math.round(saldo), giorno:i })
    }
  }
  return punti
}

// Costi per stanza
function costiPerStanza(spese, mese) {
  const per = {}
  spese.filter(s=>s.stanza&&s.data?.startsWith(mese)).forEach(s=>{ per[s.stanza]=(per[s.stanza]||0)+ +s.importo })
  return Object.entries(per).map(([stanza,totale])=>({stanza,totale})).sort((a,b)=>b.totale-a.totale)
}

// OCR - Load Tesseract.js from CDN
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    s.onload = () => resolve(window.Tesseract)
    s.onerror = () => reject(new Error('Impossibile caricare OCR'))
    document.head.appendChild(s)
  })
}

// Estrai importo e data da testo OCR (migliorato per bollette)
function parseOCR(text) {
  const result = {}
  // Normalizza testo OCR: rimuovi spazi multipli, caratteri speciali problematici
  const cleanText = text.replace(/\s+/g,' ').replace(/[*#]+/g,' ').trim()
  // Pattern per numeri che OCR può frammentare: "12, 50" "12 ,50" "12 , 50"
  const amt = '(\\d{1,6})\\s*[.,]\\s*(\\d{1,2})'
  // Cerca importi (€, EUR, TOTALE, scontrini, bollette)
  const importoPatterns = [
    // Bollette
    new RegExp('(?:totale\\s*(?:da\\s*pagare|fattura|bolletta|dovuto))\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    new RegExp('(?:importo\\s*totale)\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    // Scontrini - pattern specifici
    new RegExp('(?:totale\\s*(?:euro|eur|complessivo|vendita|reparto))\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    new RegExp('(?:tot\\.?\\s*(?:euro|eur|complessivo)?)\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    new RegExp('(?:contante|contanti|carta|bancomat|pos|pagamento|pagato|corrispettivo|corrispettivi|resto)\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    new RegExp('(?:importo\\s*(?:pagato|dovuto)?)\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    new RegExp('(?:totale|total|tot\\.?)\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    new RegExp('(?:pagare|dovuto)\\s*[:=€]?\\s*[€$]?\\s*' + amt, 'i'),
    // Simbolo € con importo
    new RegExp('[€]\\s*' + amt),
    new RegExp(amt + '\\s*[€]'),
    // EUR/EURO con importo
    new RegExp('(?:eur(?:o)?)\\s*[:=]?\\s*' + amt, 'i'),
    new RegExp(amt + '\\s*(?:eur(?:o)?)', 'i'),
  ]
  for (const p of importoPatterns) {
    const m = cleanText.match(p)
    if (m) { result.importo = m[1] + '.' + m[2].padEnd(2,'0'); break }
  }
  // Fallback: se nessun pattern ha matchato, cerca l'ultimo importo grande nel testo (tipico degli scontrini: il totale è l'ultimo importo)
  if (!result.importo) {
    const allAmounts = [...cleanText.matchAll(/(\d{1,6})\s*[.,]\s*(\d{1,2})(?!\d)/g)]
    if (allAmounts.length) {
      // Prendi il più grande tra gli ultimi 3 importi trovati (il totale è spesso l'ultimo o il più grande)
      const candidates = allAmounts.slice(-3).map(m => ({ val: parseFloat(m[1]+'.'+m[2].padEnd(2,'0')), int: m[1], dec: m[2] }))
      const best = candidates.reduce((a,b) => a.val > b.val ? a : b)
      if (best.val >= 0.5) result.importo = best.int + '.' + best.dec.padEnd(2,'0')
    }
  }
  // Cerca date (più formati, anche con spazi OCR)
  const dataPatterns = [
    /(\d{2})\s*[\/\-.\s]\s*(\d{2})\s*[\/\-.\s]\s*(\d{4})/,
    /(\d{2})\s*[\/\-.\s]\s*(\d{2})\s*[\/\-.\s]\s*(\d{2})(?!\d)/,
    /(\d{1,2})\s+(gen(?:naio)?|feb(?:braio)?|mar(?:zo)?|apr(?:ile)?|mag(?:gio)?|giu(?:gno)?|lug(?:lio)?|ago(?:sto)?|set(?:tembre)?|ott(?:obre)?|nov(?:embre)?|dic(?:embre)?)\s+(\d{2,4})/i,
  ]
  const mesiMap = {gen:'01',gennaio:'01',feb:'02',febbraio:'02',mar:'03',marzo:'03',apr:'04',aprile:'04',mag:'05',maggio:'05',giu:'06',giugno:'06',lug:'07',luglio:'07',ago:'08',agosto:'08',set:'09',settembre:'09',ott:'10',ottobre:'10',nov:'11',novembre:'11',dic:'12',dicembre:'12'}
  for (const p of dataPatterns) {
    const m = cleanText.match(p)
    if (m) {
      if (mesiMap[m[2]?.toLowerCase()]) {
        result.data = `${m[3]}-${mesiMap[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`
      } else {
        const anno = m[3].length===2 ? '20'+m[3] : m[3]
        result.data = `${anno}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
      }
      break
    }
  }
  // Cerca periodo bolletta
  const periodoPattern = /(?:periodo|competenza|fornitura)\s*[:=]?\s*(.+)/i
  const pm = text.match(periodoPattern)
  if (pm) result.periodo = pm[1].trim().slice(0,50)
  // Cerca fornitore bolletta
  const fornitori = ['enel','eni','edison','a2a','iren','hera','acea','sorgenia','illumia','plenitude','fastweb','tim','vodafone','windtre','sky']
  const tl = text.toLowerCase()
  for (const f of fornitori) {
    if (tl.includes(f)) { result.fornitore = f.charAt(0).toUpperCase()+f.slice(1); break }
  }
  // Rileva tipo bolletta
  if (/\b(luce|elettric|energia\s*elettrica|kWh)\b/i.test(text)) result.tipoBolletta = 'luce'
  else if (/\b(gas|metano|smc|m[³3])\b/i.test(text)) result.tipoBolletta = 'gas'
  else if (/\b(acqua|idric|m[³3])\b/i.test(text)) result.tipoBolletta = 'acqua'
  return result
}

// Suggerimenti budget intelligenti
function suggerimentiIntelligenti(data) {
  const sugg = []
  const meseCorr = mc()
  const mesePrev = mp()
  const spMese = data.spese.filter(s=>s.data?.startsWith(meseCorr))
  const totCorr = sum(spMese, s=>+s.importo)
  const totPrev = totMese(data.spese, mesePrev)
  const giorniPassati = new Date().getDate()
  const giorniNelMese = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate()
  const velocitaGiorno = giorniPassati > 0 ? totCorr / giorniPassati : 0
  const proiezione = velocitaGiorno * giorniNelMese
  const entrate = getStipendioMese(data, meseCorr)

  // Analisi per categoria - confronto storico
  const ultimi3 = [0,1,2].map(i => { const d=new Date(); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7) })
  const perCatCorr = {}
  const perCatMedia = {}
  spMese.forEach(s => { perCatCorr[s.categoria] = (perCatCorr[s.categoria]||0) + +s.importo })
  data.categorieSpese.forEach(cat => {
    const vals = ultimi3.slice(1).map(m => sum(data.spese.filter(s=>s.data?.startsWith(m)&&s.categoria===cat), s=>+s.importo))
    const media = vals.length > 0 ? vals.reduce((a,b)=>a+b,0)/vals.length : 0
    if (media > 0) perCatMedia[cat] = media
  })

  // Suggerimento: categoria in aumento
  Object.entries(perCatCorr).forEach(([cat, val]) => {
    const media = perCatMedia[cat]
    if (media && val > media * 1.3 && val > 30) {
      sugg.push({ tipo:'warning', icon:'fa-solid fa-arrow-trend-up', color:'#F59E0B',
        testo:`${cat}: € ${val.toFixed(0)} (+${((val-media)/media*100).toFixed(0)}% rispetto alla media)`,
        azione:`Riduci di € ${(val-media).toFixed(0)} per tornare alla media` })
    }
  })

  // Suggerimento: categoria sotto la media
  Object.entries(perCatCorr).forEach(([cat, val]) => {
    const media = perCatMedia[cat]
    if (media && val < media * 0.7 && media > 30) {
      sugg.push({ tipo:'success', icon:'fa-solid fa-arrow-trend-down', color:'#10B981',
        testo:`${cat}: € ${val.toFixed(0)} (-${((media-val)/media*100).toFixed(0)}% rispetto alla media)`,
        azione:'Ottimo lavoro! Continua così' })
    }
  })

  // Suggerimento: proiezione fine mese
  if (proiezione > data.budget * 1.1 && giorniPassati >= 5) {
    const risparmioNeeded = proiezione - data.budget
    const budgetGiornaliero = (data.budget - totCorr) / (giorniNelMese - giorniPassati)
    sugg.push({ tipo:'danger', icon:'fa-solid fa-triangle-exclamation', color:'#EF4444',
      testo:`Proiezione: € ${proiezione.toFixed(0)} (budget € ${data.budget})`,
      azione:`Riduci a € ${Math.max(0,budgetGiornaliero).toFixed(0)}/giorno per restare in budget` })
  }

  // Suggerimento: risparmio possibile
  if (entrate > 0 && totCorr < entrate * 0.5 && giorniPassati >= 15) {
    const risparmio = entrate - proiezione
    if (risparmio > 100) {
      sugg.push({ tipo:'info', icon:'fa-solid fa-piggy-bank', color:'#3B82F6',
        testo:`Potresti risparmiare ~ € ${risparmio.toFixed(0)} questo mese`,
        azione:'Considera di aumentare gli accantonamenti' })
    }
  }

  // Suggerimento: spesa ricorrente non registrata
  const mancanti = ricorrentiMancanti(data.spese, meseCorr)
  if (mancanti.length > 0 && giorniPassati >= 10) {
    sugg.push({ tipo:'info', icon:'fa-solid fa-repeat', color:'#8B5CF6',
      testo:`${mancanti.length} spese ricorrenti mancanti questo mese`,
      azione:mancanti.map(m=>m.descrizione).join(', ') })
  }

  return sugg
}

// Genera file .ics per calendario
function generaICS(data) {
  const escape = s => (s||'').replace(/[\\;,]/g, c => '\\'+c).replace(/\n/g, '\\n')
  let ics = 'BEGIN:VCALENDAR\\nVERSION:2.0\\nPRODID:-//Casa Nostra//Dashboard//IT\\nCALSCALE:GREGORIAN\\n'

  // Scadenze attive
  data.scadenze.filter(s=>!s.gestita).forEach(s => {
    const dt = (s.data||'').replace(/-/g,'')
    ics += 'BEGIN:VEVENT\\n'
    ics += `DTSTART;VALUE=DATE:${dt}\\n`
    ics += `DTEND;VALUE=DATE:${dt}\\n`
    ics += `SUMMARY:📅 ${escape(s.nome)}\\n`
    ics += `DESCRIPTION:${escape(s.categoria||'')}${s.importoStimato ? ' - €'+s.importoStimato : ''}${s.note ? '\\n'+escape(s.note) : ''}\\n`
    ics += 'BEGIN:VALARM\\nTRIGGER:-P3D\\nACTION:DISPLAY\\nDESCRIPTION:Scadenza tra 3 giorni\\nEND:VALARM\\n'
    ics += 'BEGIN:VALARM\\nTRIGGER:-P1D\\nACTION:DISPLAY\\nDESCRIPTION:Scadenza domani\\nEND:VALARM\\n'
    ics += 'END:VEVENT\\n'
  })

  // Attività non completate con data
  data.attivita.filter(a=>!a.completata).forEach(a => {
    const dt = new Date().toISOString().slice(0,10).replace(/-/g,'')
    ics += 'BEGIN:VTODO\\n'
    ics += `DTSTART;VALUE=DATE:${dt}\\n`
    ics += `SUMMARY:✅ ${escape(a.testo)}\\n`
    ics += `DESCRIPTION:${escape(a.stanza||'')} - Priorità: ${a.priorita||'Media'}\\n`
    ics += `PRIORITY:${a.priorita==='Alta'?1:a.priorita==='Bassa'?9:5}\\n`
    ics += 'END:VTODO\\n'
  })

  ics += 'END:VCALENDAR'

  // Fix: replace literal \\n with actual newlines
  ics = ics.replace(/\\n/g, '\\r\\n')

  const blob = new Blob([ics], { type:'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href:url, download:'casa-nostra.ics' }).click()
  URL.revokeObjectURL(url)
}

// Gestione foto allegati (base64)
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// PDF Report Generation
function generaReportPDF(data) {
  const mese = mc()
  const ml = MESI_FULL[new Date().getMonth()] + ' ' + new Date().getFullYear()
  const spMese = data.spese.filter(s=>s.data?.startsWith(mese))
  const totSpese = sum(spMese, s=>+s.importo)
  const entrate = getStipendioMese(data, mese)
  const saldo = entrate - totSpese
  const perCat = {}
  spMese.forEach(s=>{ perCat[s.categoria]=(perCat[s.categoria]||0)+ +s.importo })
  const catSorted = Object.entries(perCat).sort((a,b)=>b[1]-a[1])
  const top5 = [...spMese].sort((a,b)=>b.importo-a.importo).slice(0,5)
  const mesePrev = mp()
  const totPrev = totMese(data.spese, mesePrev)
  const diffPerc = totPrev > 0 ? ((totSpese-totPrev)/totPrev*100).toFixed(1) : 0

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report ${ml}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;padding:32px;max-width:700px;margin:0 auto;color:#1E293B;background:white}
h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #E2E8F0}
.subtitle{color:#64748B;font-size:13px;margin-bottom:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.kpi{padding:16px;border-radius:12px;text-align:center}.kpi .val{font-size:28px;font-weight:700}.kpi .lab{font-size:12px;color:#64748B;margin-top:2px}
.bar-wrap{margin-bottom:8px}.bar-label{display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px}
.bar{height:10px;background:#E2E8F0;border-radius:5px;overflow:hidden}.bar-fill{height:100%;border-radius:5px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:13px}
.footer{margin-top:32px;text-align:center;font-size:11px;color:#94A3B8}
@media print{body{padding:20px}button{display:none!important}}
</style></head><body>
<h1>Report Mensile — Casa Nostra</h1>
<p class="subtitle">${ml} · Generato il ${new Date().toLocaleDateString('it-IT')}</p>
<div class="grid">
  <div class="kpi" style="background:#ECFDF5"><div class="val" style="color:#059669">€ ${entrate.toFixed(0)}</div><div class="lab">Entrate</div></div>
  <div class="kpi" style="background:#FEF2F2"><div class="val" style="color:#EF4444">€ ${totSpese.toFixed(0)}</div><div class="lab">Spese</div></div>
  <div class="kpi" style="background:${saldo>=0?'#ECFDF5':'#FEF2F2'}"><div class="val" style="color:${saldo>=0?'#10B981':'#EF4444'}">€ ${saldo.toFixed(0)}</div><div class="lab">Saldo</div></div>
  <div class="kpi" style="background:#EFF6FF"><div class="val" style="color:#3B82F6">${diffPerc>0?'+':''}${diffPerc}%</div><div class="lab">vs mese scorso</div></div>
</div>
<h2>Spese per Categoria</h2>
${catSorted.map(([cat,val])=>`<div class="bar-wrap"><div class="bar-label"><span>${cat}</span><span style="font-weight:600">€ ${val.toFixed(0)} (${(val/totSpese*100).toFixed(0)}%)</span></div><div class="bar"><div class="bar-fill" style="width:${(val/totSpese*100).toFixed(0)}%;background:${COLORI_CAT[cat]||'#6B7280'}"></div></div></div>`).join('')}
<h2>Top 5 Spese</h2>
${top5.map(s=>`<div class="row"><span>${s.data} — ${s.descrizione}</span><span style="font-weight:600">€ ${(+s.importo).toFixed(2)}</span></div>`).join('')}
<h2>Riepilogo</h2>
<div class="row"><span>Budget mensile</span><span style="font-weight:600">€ ${data.budget}</span></div>
<div class="row"><span>Spese totali</span><span style="font-weight:600;color:#EF4444">€ ${totSpese.toFixed(2)}</span></div>
<div class="row"><span>Budget utilizzato</span><span style="font-weight:600">${(totSpese/data.budget*100).toFixed(0)}%</span></div>
<div class="row"><span>Movimenti del mese</span><span style="font-weight:600">${spMese.length}</span></div>
<div class="row"><span>Scadenze attive</span><span style="font-weight:600">${data.scadenze.filter(s=>!s.gestita).length}</span></div>
<div class="row"><span>Attività aperte</span><span style="font-weight:600">${data.attivita.filter(a=>!a.completata).length}</span></div>
<div style="margin-top:20px;text-align:center"><button onclick="window.print()" style="padding:10px 28px;background:#3B82F6;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">Stampa / Salva PDF</button></div>
<div class="footer">Casa Nostra — Dashboard Domestica</div></body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
  else {
    const blob = new Blob([html], {type:'text/html'})
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'),{href:url,download:`report-${mese}.html`}).click()
    URL.revokeObjectURL(url)
  }
}

// ── RESPONSIVE HOOK ────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    let raf
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setW(window.innerWidth)) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])
  return w
}

// ── SHARED UI ──────────────────────────────────────────────────────────────────
function FormField({ label, error, children }) {
  const t = useT()
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:t.textSec,marginBottom:4}}>{label}</label>
      {children}
      <AnimatePresence>
        {error && <motion.p initial={{opacity:0,height:0,marginTop:0}} animate={{opacity:1,height:'auto',marginTop:3}} exit={{opacity:0,height:0,marginTop:0}} style={{fontSize:11,color:'#EF4444',margin:0}}>{error}</motion.p>}
      </AnimatePresence>
    </div>
  )
}

function NotifBadge({ count, color='#EF4444' }) {
  if (!count) return null
  return (
    <motion.span key={count} initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:500,damping:20}}
      style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:17,height:17,borderRadius:'50%',background:color,color:'white',fontSize:10,fontWeight:700,marginLeft:5}}>
      {count>9?'9+':count}
    </motion.span>
  )
}

function ProgBar({ pct, color }) {
  const t = useT()
  return (
    <div style={{height:8,background:t.border,borderRadius:4,overflow:'hidden'}}>
      <motion.div initial={{width:0}} animate={{width:`${Math.min(pct,100)}%`}} transition={{duration:0.85,ease:'easeOut',delay:0.2}}
        style={{height:'100%',background:color,borderRadius:4}} />
    </div>
  )
}

function Delta({ curr, prev, label }) {
  if (!prev) return null
  const pct = ((curr-prev)/prev)*100
  const up = pct>0
  return (
    <motion.span initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
      style={{fontSize:12,color:up?'#EF4444':'#10B981',fontWeight:600,marginLeft:6}}>
      {up?'↑':'↓'} {Math.abs(pct).toFixed(0)}% {label || 'vs mese scorso'}
    </motion.span>
  )
}

function Modal({ open, onClose, title, children }) {
  const t = useT()
  const w = useWindowWidth()
  const mob = w < 768
  if (!open) return null
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:mob?'flex-end':'center',justifyContent:'center',padding:mob?0:20}}
      onClick={onClose}>
      <motion.div initial={{scale:mob?1:0.9,opacity:0,y:mob?100:0}} animate={{scale:1,opacity:1,y:0}} exit={{scale:mob?1:0.9,opacity:0,y:mob?100:0}}
        style={{background:t.cardBg,borderRadius:mob?'16px 16px 0 0':16,padding:mob?16:24,maxWidth:mob?'100%':500,width:'100%',maxHeight:mob?'90vh':'80vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0,fontSize:mob?16:18,fontWeight:700,color:t.text}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:t.textMut,lineHeight:1}}>×</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

// ── STIPENDIO HELPER ──────────────────────────────────────────────────────────
function getStipendioMese(data, mese) {
  const stipendi = data.stipendi || []
  const trovato = stipendi.find(s => s.mese === mese)
  if (trovato) return trovato.importo
  // fallback: ultimo stipendio registrato
  const ultimo = [...stipendi].sort((a,b) => b.mese.localeCompare(a.mese))[0]
  return ultimo ? ultimo.importo : (data.entrateMensili || 0)
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeTab({ data, setTab, updateData }) {
  const t = useT(); const S = makeS(t)
  const w = useWindowWidth(); const mob = w < 768
  const tmese = totMese(data.spese, mc())
  const tprec = totMese(data.spese, mp())
  // Consumi del mese corrente integrati nel budget
  const consumoMeseHome = data.consumi.find(c=>c.mese===mc())
  const totConsumiHome = consumoMeseHome ? +(consumoMeseHome.luce||0) + +(consumoMeseHome.gas||0) + +(consumoMeseHome.acqua||0) : 0
  const perc  = ((tmese + totConsumiHome)/(data.budget||1))*100

  const sAlert  = data.scadenze.filter(s=>{ if(s.gestita) return false; return Math.ceil((new Date(s.data)-new Date())/864e5)<0 }).length
  const sImm    = data.scadenze.filter(s=>{ if(s.gestita) return false; const g=Math.ceil((new Date(s.data)-new Date())/864e5); return g>=0&&g<=30 }).length
  const aAperte = data.attivita.filter(a=>!a.completata).length
  const aTot    = data.attivita.length

  const uc  = [...data.consumi].sort((a,b)=>b.mese?.localeCompare(a.mese))[0]
  const uc2 = [...data.consumi].sort((a,b)=>b.mese?.localeCompare(a.mese))[1]
  const tc  = uc  ? +(uc.luce||0) + +(uc.gas||0) + +(uc.acqua||0) : null
  const tc2 = uc2 ? +(uc2.luce||0) + +(uc2.gas||0) + +(uc2.acqua||0) : null

  const entrate     = getStipendioMese(data, mc())
  // Consumi già calcolati sopra come totConsumiHome
  const totConsumi = totConsumiHome
  const speseTotali = tmese + totConsumi
  const risparmioReale = entrate - speseTotali

  // accantonamenti
  const accantonamenti = data.accantonamenti || []
  const quotaAccant = accantonamenti.reduce((s, a) => {
    if (a.percentuale && entrate > 0) return s + (entrate * a.percentuale / 100)
    return s + (a.importoManuale || 0)
  }, 0)
  const disponibileReale = risparmioReale - quotaAccant

  const risparmio   = Math.max(0, data.budget - tmese)
  const percRisp    = data.goalRisparmio ? (Math.max(0, risparmioReale)/data.goalRisparmio)*100 : 0
  const proiezione  = new Date().getDate() > 0 ? (tmese / new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate() : tmese
  const rispPrevisto = entrate - proiezione

  const cards = [
    {
      id:'spese', emoji:<Fa icon='fa-solid fa-wallet' />, title:'Spese del mese',
      value:`€ ${speseTotali.toFixed(0)}`, subtitle:`Budget € ${data.budget}${totConsumi>0?' (incl. bollette)':''}`,
      color: perc>100?'#EF4444':'#3B82F6', bg: perc>100?'#EF444415':'#3B82F615',
      extra: (
        <div style={{marginTop:10}}>
          <ProgBar pct={perc} color={perc>100?'#EF4444':perc>80?'#F59E0B':'#3B82F6'} />
          {totConsumi>0 && <p style={{margin:'4px 0 2px',fontSize:10,color:'#8B5CF6'}}><Fa icon='fa-solid fa-bolt' style={{marginRight:4}} />Bollette incluse: € {totConsumi.toFixed(0)}</p>}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:4,alignItems:'center'}}>
            <span style={{fontSize:11,color:t.textMut}}>{perc.toFixed(0)}% usato</span>
            {tprec>0 && <Delta curr={tmese} prev={tprec} />}
          </div>
        </div>
      ),
    },
    {
      id:'scadenze', emoji:<Fa icon='fa-regular fa-calendar-check' />, title:'Scadenze',
      value: sAlert>0?`${sAlert} scadute`:sImm>0?`${sImm} imminenti`:'Tutto ok',
      subtitle:`${data.scadenze.filter(s=>!s.gestita).length} attive`,
      color: sAlert>0?'#EF4444':sImm>0?'#F59E0B':'#10B981', bg: sAlert>0?'#EF444415':sImm>0?'#F59E0B15':'#10B98115',
    },
    {
      id:'attivita', emoji:<Fa icon='fa-solid fa-list-check' />, title:'Lista attività',
      value:`${aAperte} da fare`, subtitle:`${aTot-aAperte} completate`,
      color:'#10B981', bg:'#10B98115',
      extra: aTot>0 ? <div style={{marginTop:10}}><ProgBar pct={((aTot-aAperte)/aTot)*100} color="#10B981" /></div> : null,
    },
    {
      id:'consumi', emoji:<Fa icon='fa-solid fa-bolt' />, title:'Consumi',
      value: tc!==null?`€ ${tc.toFixed(0)}`:'—',
      subtitle: uc?`${MESI[+uc.mese?.slice(5,7)-1]} ${uc.mese?.slice(0,4)}`:'Nessun dato',
      color:'#8B5CF6', bg:'#8B5CF615',
      extra: tc!==null&&tc2!==null ? <div style={{marginTop:6}}><Delta curr={tc} prev={tc2} /></div> : null,
    },
    {
      id:'disponibile', tab:'stipendio', emoji:<Fa icon='fa-solid fa-coins' />, title:'Disponibile reale',
      value: entrate>0 ? `€ ${disponibileReale.toFixed(0)}` : '—',
      subtitle: entrate>0 ? `Stipendio € ${entrate.toFixed(0)}` : 'Registra lo stipendio',
      color: disponibileReale>=0?'#10B981':'#EF4444', bg: disponibileReale>=0?'#10B98115':'#EF444415',
      extra: entrate>0 ? (
        <div style={{marginTop:10}}>
          <ProgBar pct={Math.min(100, (speseTotali/entrate)*100)} color={speseTotali>entrate?'#EF4444':speseTotali/entrate>0.8?'#F59E0B':'#10B981'} />
          <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:6}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:t.textMut}}>Spese</span>
              <span style={{color:'#EF4444',fontWeight:500}}>- € {tmese.toFixed(0)}</span>
            </div>
            {totConsumi > 0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:t.textMut}}><Fa icon='fa-solid fa-bolt' style={{marginRight:4}} />Bollette</span>
              <span style={{color:'#8B5CF6',fontWeight:500}}>- € {totConsumi.toFixed(0)}</span>
            </div>}
            {quotaAccant > 0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:t.textMut}}>Accantonamenti</span>
              <span style={{color:'#F59E0B',fontWeight:500}}>- € {quotaAccant.toFixed(0)}</span>
            </div>}
          </div>
          {data.goalRisparmio>0 && <p style={{margin:'4px 0 0',fontSize:11,color:percRisp>=100?'#10B981':'#F59E0B',fontWeight:600}}><Fa icon='fa-solid fa-bullseye' style={{marginRight:4}} />Goal: €{data.goalRisparmio} ({percRisp.toFixed(0)}%)</p>}
          <p style={{margin:'2px 0 0',fontSize:11,color:t.textMut}}>Proiezione fine mese: € {(rispPrevisto - quotaAccant - totConsumi).toFixed(0)}</p>
        </div>
      ) : null,
    },
    (() => {
      const stipendi = data.stipendi || []
      const stipCorr = stipendi.find(s => s.mese === mc())
      return {
        id:'stipendio', emoji:<Fa icon='fa-solid fa-briefcase' />, title:'Stipendio',
        value: stipCorr ? `€ ${stipCorr.importo.toFixed(0)}` : (entrate > 0 ? `€ ${entrate.toFixed(0)}` : '—'),
        subtitle: stipCorr ? `${MESI[new Date().getMonth()]} ${new Date().getFullYear()}` : 'Non ancora versato',
        color:'#059669', bg:'#05966915',
        extra: stipendi.length > 0 ? (
          <div style={{marginTop:6}}>
            <p style={{margin:0,fontSize:11,color:t.textMut}}>{stipendi.length} versament{stipendi.length===1?'o':'i'} registrat{stipendi.length===1?'o':'i'}</p>
          </div>
        ) : null,
      }
    })(),
    {
      id:'note', emoji:<Fa icon='fa-regular fa-note-sticky' />, title:'Note',
      value:`${data.note.length}`, subtitle:'appunti',
      color:'#F97316', bg:'#F9731615',
    },
    (() => {
      const acc = data.accantonamenti || []
      const totAcc = acc.reduce((s,a) => s + (a.accantonato||0), 0)
      const totObj = acc.reduce((s,a) => s + (a.obiettivo||0), 0)
      const percAcc = totObj > 0 ? (totAcc/totObj)*100 : 0
      return {
        id:'accantonamenti', emoji:<Fa icon='fa-solid fa-piggy-bank' />, title:'Accantonamenti',
        value: acc.length>0 ? `€ ${totAcc.toFixed(0)}` : '—',
        subtitle: acc.length>0 ? `${acc.length} fondi attivi` : 'Nessun fondo',
        color:'#0EA5E9', bg:'#0EA5E915',
        extra: acc.length>0 && totObj>0 ? (
          <div style={{marginTop:10}}>
            <ProgBar pct={Math.min(100, percAcc)} color={percAcc>=100?'#10B981':'#0EA5E9'} />
            <p style={{margin:'4px 0 0',fontSize:11,color:t.textMut}}>Obiettivo: € {totObj.toFixed(0)} ({percAcc.toFixed(0)}%)</p>
          </div>
        ) : null,
      }
    })(),
    (() => {
      const conti = data.conti || []
      const totSaldo = conti.reduce((s,c) => s + (c.saldo||0), 0)
      return conti.length > 1 ? {
        id:'conti', emoji:<Fa icon='fa-solid fa-building-columns' />, title:'Conti',
        value:`€ ${totSaldo.toFixed(0)}`, subtitle:`${conti.length} conti attivi`,
        color:'#6366F1', bg:'#6366F115',
        extra: (
          <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:8}}>
            {conti.map(c=>(
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                <span style={{color:t.textMut}}>{c.nome}</span>
                <span style={{fontWeight:600,color:c.saldo>=0?t.text:'#EF4444'}}>€ {(c.saldo||0).toFixed(0)}</span>
              </div>
            ))}
          </div>
        ),
      } : null
    })(),
  ].filter(Boolean)

  // Smart alerts data
  const giorniPassati = new Date().getDate()
  const giorniNelMese = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate()
  const giorniRimasti = giorniNelMese - giorniPassati
  const velocitaGiorno = giorniPassati > 0 ? tmese / giorniPassati : 0
  const previsioneFM = velocitaGiorno * giorniNelMese
  const budgetGiornaliero = giorniRimasti > 0 ? Math.max(0, data.budget - tmese) / giorniRimasti : 0
  const debiti = calcolaDebiti(data.spese.filter(s=>s.data?.startsWith(mc())), data.membrifamiglia)
  const debitiAttivi = debiti.filter(d=>Math.abs(d.saldo)>1)
  const smartAlerts = []
  if (velocitaGiorno > 0 && previsioneFM > data.budget * 1.1) smartAlerts.push({icon:<Fa icon='fa-solid fa-fire' />,msg:`Stai spendendo € ${velocitaGiorno.toFixed(0)}/giorno — previsti € ${previsioneFM.toFixed(0)} a fine mese`,color:'#EF4444',bg:'#EF444415'})
  if (giorniRimasti > 0 && tmese < data.budget) smartAlerts.push({icon:<Fa icon='fa-solid fa-lightbulb' />,msg:`Budget giornaliero disponibile: € ${budgetGiornaliero.toFixed(1)}`,color:'#3B82F6',bg:'#3B82F615'})
  if (debitiAttivi.length > 0) { const creditori = debitiAttivi.filter(d=>d.saldo>0); const debitori = debitiAttivi.filter(d=>d.saldo<0); if(creditori.length) smartAlerts.push({icon:<Fa icon='fa-solid fa-arrows-rotate' />,msg:`${creditori.map(d=>`${d.nome} ha anticipato € ${d.saldo.toFixed(0)}`).join(', ')}`,color:'#8B5CF6',bg:'#8B5CF615'}) }
  const scadOggi = data.scadenze.filter(s=>!s.gestita&&s.data===new Date().toISOString().slice(0,10))
  if (scadOggi.length) smartAlerts.push({icon:<Fa icon='fa-solid fa-bell' />,msg:`Scadenza oggi: ${scadOggi.map(s=>s.nome).join(', ')}`,color:'#F59E0B',bg:'#F59E0B15'})
  // Scadenze domani
  const domani = new Date(); domani.setDate(domani.getDate()+1); const domaniISO = domani.toISOString().slice(0,10)
  const scadDomani = data.scadenze.filter(s=>!s.gestita&&s.data===domaniISO)
  if (scadDomani.length) smartAlerts.push({icon:<Fa icon='fa-regular fa-clock' />,msg:`Domani: ${scadDomani.map(s=>s.nome+(s.importoStimato?` (€${s.importoStimato})`:'')). join(', ')}`,color:'#6366F1',bg:'#6366F115'})
  // Budget categorie quasi esauriti
  Object.entries(data.budgetCategorie||{}).forEach(([cat,limite]) => {
    const spesoCat = data.spese.filter(s=>s.data?.startsWith(mc())&&s.categoria===cat).reduce((s,x)=>s+ +x.importo,0)
    if (spesoCat >= limite * 0.9 && spesoCat < limite) smartAlerts.push({icon:<Fa icon='fa-solid fa-chart-pie' />,msg:`Budget ${cat} al ${(spesoCat/limite*100).toFixed(0)}% — restano € ${(limite-spesoCat).toFixed(0)}`,color:'#F97316',bg:'#F9731615'})
    if (spesoCat >= limite) smartAlerts.push({icon:<Fa icon='fa-solid fa-triangle-exclamation' />,msg:`Budget ${cat} superato! € ${spesoCat.toFixed(0)} / € ${limite}`,color:'#EF4444',bg:'#EF444415'})
  })
  // Garanzie in scadenza
  data.inventario.filter(x=>x.scadenzaGaranzia).forEach(x=>{
    const gg=Math.ceil((new Date(x.scadenzaGaranzia)-new Date())/864e5)
    if(gg>=0&&gg<=30) smartAlerts.push({icon:<Fa icon='fa-solid fa-shield-halved' />,msg:`Garanzia ${x.nome} scade tra ${gg} giorn${gg===1?'o':'i'}`,color:'#0EA5E9',bg:'#0EA5E915'})
  })
  // Ricorrenti mancanti
  const ricMancanti = ricorrentiMancanti(data.spese, mc())
  if (ricMancanti.length>0) smartAlerts.push({icon:<Fa icon='fa-solid fa-rotate' />,msg:`${ricMancanti.length} spes${ricMancanti.length===1?'a ricorrente non ancora inserita':'e ricorrenti non ancora inserite'}`,color:'#8B5CF6',bg:'#8B5CF615'})

  const barData = ultimi6().map(m => ({ name:MESI[+m.slice(5,7)-1], Spese:+totMese(data.spese,m).toFixed(0) }))

  const prossime = [...data.scadenze].filter(s=>!s.gestita).sort((a,b)=>a.data?.localeCompare(b.data)).slice(0,4)
  const topAtt   = [...data.attivita].filter(a=>!a.completata).sort((a,b)=>PRIORITA_ORD[a.priorita]-PRIORITA_ORD[b.priorita]).slice(0,4)
  const pc = {Alta:'#EF4444',Media:'#F59E0B',Bassa:'#10B981'}

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{margin:'0 0 4px',fontSize:mob?18:22,fontWeight:700,color:t.text}}>Benvenuto!</h2>
        <p style={{margin:0,color:t.textSec,fontSize:14}}>Riepilogo della tua casa</p>
      </div>

      <AnimatePresence>
        {perc>80 && (
          <motion.div initial={{opacity:0,height:0,marginBottom:0}} animate={{opacity:1,height:'auto',marginBottom:16}} exit={{opacity:0,height:0,marginBottom:0}}
            style={{background:perc>100?'#EF444415':'#F59E0B15',border:`1px solid ${t.border}`,borderRadius:12,padding:'11px 16px',color:perc>100?'#DC2626':'#D97706',fontSize:14,fontWeight:500}}>
            {perc>100?`Budget superato di € ${(tmese-data.budget).toFixed(2)}!`:`Hai usato il ${perc.toFixed(0)}% del budget mensile`}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Smart Alerts */}
      {smartAlerts.length>0 && (
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
          {smartAlerts.map((a,i)=>(
            <motion.div key={i} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:a.bg,borderRadius:10,border:`1px solid ${a.color}22`}}>
              <span style={{fontSize:16}}>{a.icon}</span>
              <span style={{fontSize:13,color:a.color,fontWeight:500,flex:1}}>{a.msg}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Suggerimenti Budget Intelligenti */}
      {(()=>{
        const sugg = suggerimentiIntelligenti(data)
        if (sugg.length === 0) return null
        return (
          <div style={{...S.card,marginBottom:16,border:`1px solid ${t.accent}22`}}>
            <h3 style={{margin:'0 0 10px',fontSize:14,fontWeight:700,color:t.text}}>
              <Fa icon='fa-solid fa-wand-magic-sparkles' style={{marginRight:6,color:t.accent}} />Suggerimenti Intelligenti
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {sugg.map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
                  style={{padding:'10px 12px',background:s.color+'10',borderRadius:10,borderLeft:`3px solid ${s.color}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <Fa icon={s.icon} style={{color:s.color,fontSize:13}} />
                    <span style={{fontSize:13,fontWeight:600,color:s.color}}>{s.testo}</span>
                  </div>
                  <p style={{margin:0,fontSize:11,color:t.textSec,paddingLeft:21}}>{s.azione}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Quick actions */}
      <div style={{display:'flex',gap:mob?6:10,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {label:'+ Spesa',icon:<Fa icon='fa-solid fa-wallet' />,tab:'spese',color:'#3B82F6'},
          {label:'+ Scadenza',icon:<Fa icon='fa-regular fa-calendar-check' />,tab:'scadenze',color:'#F59E0B'},
          {label:'+ Attività',icon:<Fa icon='fa-solid fa-list-check' />,tab:'attivita',color:'#10B981'},
          {label:'+ Nota',icon:<Fa icon='fa-regular fa-note-sticky' />,tab:'note',color:'#F97316'},
        ].map(qa=>(
          <motion.button key={qa.tab} whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={()=>setTab(qa.tab)}
            style={{padding:mob?'7px 12px':'8px 16px',background:`${qa.color}12`,border:`1px solid ${qa.color}33`,borderRadius:10,cursor:'pointer',fontSize:mob?11:13,fontWeight:600,color:qa.color,display:'flex',alignItems:'center',gap:5}}>
            <span>{qa.icon}</span>{qa.label}
          </motion.button>
        ))}
      </div>

      <motion.div initial="initial" animate="animate" variants={{animate:{transition:{staggerChildren:0.07}}}}
        style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(auto-fit,minmax(210px,1fr))',gap:mob?10:14,marginBottom:20}}>
        {cards.map((card,i)=>(
          <motion.div key={card.id} variants={CARD_V} custom={i}
            whileHover={{y:-3,boxShadow:'0 8px 24px rgba(0,0,0,0.10)'}} whileTap={{scale:0.97}}
            onClick={()=>setTab(card.tab||card.id)} style={{...S.card,cursor:'pointer',border:'2px solid transparent'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <p style={{margin:'0 0 4px',fontSize:12,color:t.textSec,fontWeight:500}}>{card.title}</p>
                <p style={{margin:0,fontSize:mob?20:25,fontWeight:700,color:card.color}}>{card.value}</p>
                <p style={{margin:'4px 0 0',fontSize:12,color:t.textMut}}>{card.subtitle}</p>
              </div>
              <div style={{width:mob?38:46,height:mob?38:46,borderRadius:12,background:card.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:mob?18:21,flexShrink:0,color:card.color}}>{card.emoji}</div>
            </div>
            {card.extra}
          </motion.div>
        ))}
      </motion.div>

      {/* Budget Intelligence */}
      {data.budget > 0 && tmese > 0 && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{...S.card,marginBottom:20}}>
          <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-brain' style={{marginRight:6}} />Budget Intelligence</h3>
          <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(3,1fr)',gap:mob?10:16}}>
            <div style={{padding:14,background:velocitaGiorno*giorniNelMese>data.budget?'#EF444415':'#10B98115',borderRadius:12,textAlign:'center'}}>
              <p style={{margin:'0 0 4px',fontSize:11,color:t.textMut}}>Velocità spesa</p>
              <p style={{margin:0,fontSize:22,fontWeight:700,color:velocitaGiorno*giorniNelMese>data.budget?'#EF4444':'#10B981'}}>€ {velocitaGiorno.toFixed(1)}<span style={{fontSize:12,fontWeight:400}}>/giorno</span></p>
            </div>
            <div style={{padding:14,background:'#3B82F615',borderRadius:12,textAlign:'center'}}>
              <p style={{margin:'0 0 4px',fontSize:11,color:t.textMut}}>Proiezione fine mese</p>
              <p style={{margin:0,fontSize:22,fontWeight:700,color:previsioneFM>data.budget?'#EF4444':'#3B82F6'}}>€ {previsioneFM.toFixed(0)}</p>
            </div>
            <div style={{padding:14,background:budgetGiornaliero<10?'#F59E0B15':'#10B98115',borderRadius:12,textAlign:'center'}}>
              <p style={{margin:'0 0 4px',fontSize:11,color:t.textMut}}>Puoi spendere ancora</p>
              <p style={{margin:0,fontSize:22,fontWeight:700,color:budgetGiornaliero<10?'#F59E0B':'#10B981'}}>€ {budgetGiornaliero.toFixed(1)}<span style={{fontSize:12,fontWeight:400}}>/giorno</span></p>
            </div>
          </div>
          {/* Progress breakpoints */}
          <div style={{marginTop:14,position:'relative'}}>
            <div style={{height:10,background:t.rowBg,borderRadius:5,overflow:'hidden',position:'relative'}}>
              <motion.div initial={{width:0}} animate={{width:`${Math.min(perc,100)}%`}} transition={{duration:0.8}} 
                style={{height:'100%',borderRadius:5,background:perc>100?'#EF4444':perc>90?'linear-gradient(90deg,#F59E0B,#EF4444)':perc>75?'linear-gradient(90deg,#3B82F6,#F59E0B)':'#3B82F6'}} />
              {[50,75,90].map(bp=>(
                <div key={bp} style={{position:'absolute',left:`${bp}%`,top:-2,width:1,height:14,background:t.textMut+'66'}} />
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              <span style={{fontSize:10,color:t.textMut}}>€ 0</span>
              {[50,75,90].map(bp=><span key={bp} style={{position:'absolute',left:`calc(${bp}% - 8px)`,fontSize:9,color:t.textMut,marginTop:4}}>{bp}%</span>)}
              <span style={{fontSize:10,color:t.textMut}}>€ {data.budget}</span>
            </div>
          </div>
        </motion.div>
      )}

      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(auto-fit,minmax(310px,1fr))',gap:mob?10:14}}>
        <div style={S.card}>
          <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}>Spese ultimi 6 mesi</h3>
          {data.spese.length===0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessuna spesa ancora</p>
            : <ResponsiveContainer width="100%" height={175}>
                <BarChart data={barData} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v=>[`€ ${v}`,'Spese']} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
                  <Bar dataKey="Spese" fill="#3B82F6" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>Prossime scadenze</h3>
            <button onClick={()=>setTab('scadenze')} style={{background:'none',border:'none',color:'#F59E0B',cursor:'pointer',fontSize:12,fontWeight:600}}>Tutte →</button>
          </div>
          {prossime.length===0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessuna scadenza attiva</p>
            : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {prossime.map((s,i)=>{ const {color,label,bg}=scadCol(s.data); return (
                  <div key={s.id||i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:bg,borderRadius:9}}>
                    <span style={{fontSize:10,fontWeight:700,color,minWidth:42,textAlign:'center'}}>{label}</span>
                    <span style={{flex:1,fontSize:13,color:t.text,fontWeight:500}}>{s.nome}</span>
                    <span style={{fontSize:11,color:t.textMut}}>{new Date(s.data).toLocaleDateString('it-IT')}</span>
                  </div>
                )})}
              </div>
          }
        </div>

        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>Attività prioritarie</h3>
            <button onClick={()=>setTab('attivita')} style={{background:'none',border:'none',color:'#10B981',cursor:'pointer',fontSize:12,fontWeight:600}}>Tutte →</button>
          </div>
          {topAtt.length===0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessuna attività aperta</p>
            : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {topAtt.map((a,i)=>(
                  <div key={a.id||i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:t.rowBg,borderRadius:9}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:pc[a.priorita],flexShrink:0}} />
                    <span style={{flex:1,fontSize:13,color:t.text}}>{a.testo}</span>
                    <span style={{fontSize:11,background:t.tagBg,color:t.tagText,padding:'1px 6px',borderRadius:6}}>{a.stanza}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>Ultimi movimenti</h3>
            <button onClick={()=>setTab('spese')} style={{background:'none',border:'none',color:'#3B82F6',cursor:'pointer',fontSize:12,fontWeight:600}}>Tutti →</button>
          </div>
          {data.spese.length===0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessuna spesa. <button onClick={()=>setTab('spese')} style={{background:'none',border:'none',color:'#3B82F6',cursor:'pointer',fontSize:14,fontWeight:600,padding:0}}>Aggiungi →</button></p>
            : <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {[...data.spese].slice(-5).reverse().map((s)=>(
                  <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${t.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:catCol(s.categoria)}} />
                      <span style={{fontSize:13,color:t.text}}>{s.descrizione}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:600,color:t.text}}>€ {(+s.importo).toFixed(2)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Debiti tra membri — enhanced */}
        {debitiAttivi.length > 0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-arrows-rotate' style={{marginRight:6}} />Saldi tra membri</h3>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {debiti.map(d=>(
                <div key={d.nome} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:t.rowBg,borderRadius:9}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:d.saldo>0?'#10B98115':'#EF444415',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:d.saldo>0?'#059669':'#DC2626'}}>
                      {d.nome[0].toUpperCase()}
                    </div>
                    <span style={{fontSize:13,color:t.text,fontWeight:500}}>{d.nome}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:d.saldo>0?'#10B981':d.saldo<-1?'#EF4444':t.textMut}}>
                    {d.saldo>0?'+':''}€ {d.saldo.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            {/* Trasferimenti suggeriti */}
            {(() => {
              const trasf = calcolaTrasferimenti(data.spese.filter(s=>s.data?.startsWith(mc())), data.membrifamiglia)
              return trasf.length > 0 ? (
                <div style={{marginTop:12,padding:10,background:'#6366F110',borderRadius:10}}>
                  <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#6366F1'}}><Fa icon='fa-solid fa-route' style={{marginRight:4}} />Per pareggiare i conti:</p>
                  {trasf.map((tr,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:t.text}}>{tr.da} → {tr.a}: <b>€ {tr.importo.toFixed(2)}</b></span>
                      <motion.button whileTap={{scale:0.9}} onClick={() => {
                        updateData('rimborsi', [...(data.rimborsi||[]), { id:Date.now(), da:tr.da, a:tr.a, importo:tr.importo, data:new Date().toISOString().slice(0,10) }])
                      }} style={{padding:'3px 10px',background:'#10B981',color:'white',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                        <Fa icon='fa-solid fa-check' style={{marginRight:3}} />Salda
                      </motion.button>
                    </div>
                  ))}
                </div>
              ) : null
            })()}
            {/* Storico rimborsi */}
            {(data.rimborsi||[]).length > 0 && (
              <div style={{marginTop:10}}>
                <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:t.textSec}}>Storico rimborsi</p>
                {[...(data.rimborsi||[])].reverse().slice(0,5).map(r => (
                  <div key={r.id} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:t.textMut,padding:'3px 0',borderBottom:`1px solid ${t.border}`}}>
                    <span>{r.da} → {r.a}</span>
                    <span>€ {r.importo.toFixed(2)} · {new Date(r.data).toLocaleDateString('it-IT')}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{margin:'8px 0 0',fontSize:11,color:t.textMut}}>Basato sulle spese condivise del mese corrente</p>
          </div>
        )}

        {/* Previsione flusso di cassa */}
        {entrate > 0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-chart-line' style={{marginRight:6}} />Previsione flusso di cassa</h3>
            {(() => {
              const flusso = previsioneFlusso(data, 90)
              const minSaldo = Math.min(...flusso.map(f=>f.saldo))
              const critico = flusso.find(f=>f.saldo<0)
              return (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={flusso}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                      <XAxis dataKey="label" tick={{fontSize:10,fill:t.textMut}} interval={Math.max(0,Math.floor(flusso.length/5)-1)} />
                      <YAxis tick={{fontSize:10,fill:t.textMut}} tickFormatter={v=>`€${v}`} width={55} />
                      <Tooltip formatter={v=>`€ ${v}`} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8,fontSize:12}} />
                      <Area type="monotone" dataKey="saldo" stroke="#3B82F6" fill="#3B82F620" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
                    <div style={{fontSize:12,color:t.textMut}}>
                      <Fa icon='fa-solid fa-calendar-day' style={{marginRight:4,color:'#3B82F6'}} />
                      Tra 30gg: <b style={{color:t.text}}>€ {(flusso.find(f=>f.giorno>=28)?.saldo||0).toFixed(0)}</b>
                    </div>
                    {critico && <div style={{fontSize:12,color:'#EF4444',fontWeight:600}}>
                      <Fa icon='fa-solid fa-triangle-exclamation' style={{marginRight:4}} />
                      Saldo negativo il {new Date(critico.data).toLocaleDateString('it-IT')}
                    </div>}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Gamification — Badge */}
        {(() => {
          const earned = BADGE_DEFS.filter(b => b.check(data))
          const newBadges = earned.filter(b => !(data.badges||[]).includes(b.id))
          if (newBadges.length > 0 && updateData) {
            setTimeout(() => updateData('badges', [...new Set([...(data.badges||[]), ...newBadges.map(b=>b.id)])]), 100)
          }
          return earned.length > 0 ? (
            <div style={S.card}>
              <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-trophy' style={{marginRight:6}} />Traguardi</h3>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {earned.map(b => (
                  <motion.div key={b.id} initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:400,damping:15}}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:b.color+'15',borderRadius:20,border:`1px solid ${b.color}30`}}>
                    <Fa icon={b.icon} style={{color:b.color,fontSize:14}} />
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:t.text}}>{b.nome}</div>
                      <div style={{fontSize:10,color:t.textMut}}>{b.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div style={{marginTop:10,display:'flex',alignItems:'center',gap:8}}>
                <ProgBar pct={earned.length/BADGE_DEFS.length*100} color='#F59E0B' />
                <span style={{fontSize:11,color:t.textMut,whiteSpace:'nowrap'}}>{earned.length}/{BADGE_DEFS.length}</span>
              </div>
            </div>
          ) : null
        })()}

        {/* Classifica familiare — chi ha speso meno */}
        {data.membrifamiglia.length > 1 && data.spese.filter(s=>s.data?.startsWith(mc())&&s.pagatoDa).length > 0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-ranking-star' style={{marginRight:6}} />Classifica del mese</h3>
            {(() => {
              const speseMese = data.spese.filter(s=>s.data?.startsWith(mc()))
              const perMembro = data.membrifamiglia.map(m => ({
                nome: m,
                speso: speseMese.filter(s=>s.pagatoDa===m&&!s.condivisa).reduce((s,x)=>s+ +x.importo,0)
              })).sort((a,b)=>a.speso-b.speso)
              const maxSpeso = Math.max(...perMembro.map(m=>m.speso), 1)
              const medaglie = ['🥇','🥈','🥉']
              return (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {perMembro.map((m,i) => (
                    <div key={m.nome}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:13,color:t.text,fontWeight:500}}>{i<3?medaglie[i]+' ':''}{m.nome}</span>
                        <span style={{fontSize:13,fontWeight:600,color:i===0?'#10B981':t.text}}>€ {m.speso.toFixed(0)}</span>
                      </div>
                      <ProgBar pct={maxSpeso>0?m.speso/maxSpeso*100:0} color={i===0?'#10B981':i===1?'#3B82F6':'#F59E0B'} />
                    </div>
                  ))}
                </div>
              )
            })()}
            <p style={{margin:'6px 0 0',fontSize:11,color:t.textMut}}>Spese personali (escluse condivise)</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SPESE ─────────────────────────────────────────────────────────────────────
function SpeseTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm]   = useState({ descrizione:'', importo:'', categoria:data.categorieSpese[0]||'Casa', data:new Date().toISOString().slice(0,10), ricorrente:false, pagatoDa:'', condivisa:false, contattoId:'', conto:'', stanza:'', splitQuote:{} })
  const [errors, setErrors] = useState({})
  const [filtroMese, setFiltroMese] = useState(mc())
  const [filtroCat, setFiltroCat]   = useState('Tutte')
  const [filtroAnno, setFiltroAnno] = useState('')
  const [cerca, setCerca]           = useState('')
  const [ordine, setOrdine]         = useState('data-desc')
  const [showSplit, setShowSplit]   = useState(false)
  const [editId, setEditId]         = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [showSplitQuote, setShowSplitQuote] = useState(false)
  const [fotoPreview, setFotoPreview] = useState(null)
  const ocrInputRef = useRef(null)
  const fotoInputRef = useRef(null)

  const validate = () => {
    const e = {}
    if (!form.descrizione.trim()) e.descrizione = 'Inserisci una descrizione'
    if (!form.importo || +form.importo<=0) e.importo = 'Importo non valido'
    setErrors(e); return !Object.keys(e).length
  }

  const formDefault = { descrizione:'', importo:'', categoria:data.categorieSpese[0]||'Casa', data:new Date().toISOString().slice(0,10), ricorrente:false, pagatoDa:'', condivisa:false, contattoId:'', conto:'', stanza:'', splitQuote:{} }

  const handleOCR = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    try {
      const Tess = await loadTesseract()
      const { data: { text } } = await Tess.recognize(file, 'ita+eng')
      console.log('[OCR] Testo riconosciuto:', text)
      const parsed = parseOCR(text)
      console.log('[OCR] Risultato parsing:', parsed)
      const updates = {}
      if (parsed.importo) updates.importo = parsed.importo
      if (parsed.data) updates.data = parsed.data
      if (parsed.tipoBolletta) {
        updates.categoria = 'Bollette'
        updates.descrizione = `${parsed.fornitore?parsed.fornitore+' - ':''}Bolletta ${parsed.tipoBolletta}${parsed.periodo?' ('+parsed.periodo+')':''}`
      }
      setForm(f => ({ ...f, ...updates }))
      // Salva foto dello scontrino
      try { const b64 = await readFileAsBase64(file); setFotoPreview(b64) } catch {}
      const msgs = []
      if (parsed.importo) msgs.push(`€ ${parsed.importo}`)
      if (parsed.data) msgs.push(`data ${parsed.data}`)
      if (parsed.tipoBolletta) msgs.push(`bolletta ${parsed.tipoBolletta}`)
      if (parsed.fornitore) msgs.push(parsed.fornitore)
      toast(msgs.length ? `Rilevato: ${msgs.join(' · ')}` : 'Nessun importo rilevato – prova con foto più nitida', msgs.length ? 'success' : 'info')
    } catch {
      toast('Errore durante la scansione', 'error')
    }
    setOcrLoading(false)
    if (ocrInputRef.current) ocrInputRef.current.value = ''
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const b64 = await readFileAsBase64(file)
      setFotoPreview(b64)
      toast('Foto allegata')
    } catch { toast('Errore', 'error') }
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  const aggiungi = () => {
    if (!validate()) return
    const newId = editId || Date.now()
    if (editId) {
      updateData('spese', data.spese.map(s=>s.id===editId?{...s, descrizione:form.descrizione.trim(), importo:+form.importo, categoria:form.categoria, data:form.data, ricorrente:form.ricorrente, pagatoDa:form.pagatoDa, condivisa:form.condivisa, contattoId:form.contattoId||undefined, conto:form.conto||undefined, stanza:form.stanza||undefined, splitQuote:form.condivisa&&Object.keys(form.splitQuote||{}).length?form.splitQuote:undefined}:s))
      toast('Spesa aggiornata')
    } else {
      updateData('spese', [...data.spese, { ...form, importo:+form.importo, id:newId, contattoId:form.contattoId||undefined, conto:form.conto||undefined, stanza:form.stanza||undefined, splitQuote:form.condivisa&&Object.keys(form.splitQuote||{}).length?form.splitQuote:undefined }])
      toast('Spesa aggiunta')
    }
    // Salva foto se presente
    if (fotoPreview) {
      const fa = {...(data.fotoAllegati||{})}
      fa[`spesa-${newId}`] = fotoPreview
      updateData('fotoAllegati', fa)
      setFotoPreview(null)
    }
    setForm(formDefault); setEditId(null); setErrors({})
  }

  const startEdit = (s) => {
    setForm({ descrizione:s.descrizione, importo:String(s.importo), categoria:s.categoria, data:s.data, ricorrente:!!s.ricorrente, pagatoDa:s.pagatoDa||'', condivisa:!!s.condivisa, contattoId:s.contattoId||'', conto:s.conto||'', stanza:s.stanza||'', splitQuote:s.splitQuote||{} })
    setEditId(s.id)
  }
  const cancelEdit = () => { setForm(formDefault); setEditId(null); setErrors({}) }

  const rimuovi = (id) => { if(!confirm('Eliminare questa spesa?')) return; updateData('spese', data.spese.filter(s=>s.id!==id)); toast('Spesa eliminata') }

  const periodo = filtroAnno || filtroMese
  let lista = data.spese.filter(s=>s.data?.startsWith(periodo))
  if (filtroCat!=='Tutte') lista = lista.filter(s=>s.categoria===filtroCat)
  if (cerca) lista = lista.filter(s=>s.descrizione?.toLowerCase().includes(cerca.toLowerCase()))
  lista = [...lista].sort((a,b)=>{
    if (ordine==='data-desc')    return b.data?.localeCompare(a.data)||0
    if (ordine==='data-asc')     return a.data?.localeCompare(b.data)||0
    if (ordine==='importo-desc') return b.importo-a.importo
    if (ordine==='importo-asc')  return a.importo-b.importo
    return 0
  })

  const totFiltr = sum(lista, s=>+s.importo)
  const totAll   = totMese(data.spese, filtroMese)
  const perc     = (totAll/(data.budget||1))*100

  const perCat = (data.categorieSpese)
    .map(cat=>({name:cat, value:+sum(data.spese.filter(s=>s.data?.startsWith(periodo)&&s.categoria===cat), s=>+s.importo).toFixed(2)}))
    .filter(c=>c.value>0)

  const anni = [...new Set(data.spese.map(s=>s.data?.slice(0,4)).filter(Boolean))].sort().reverse()
  const debiti = calcolaDebiti(data.spese.filter(s=>s.data?.startsWith(periodo)), data.membrifamiglia)

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 320px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-wallet' style={{marginRight:6}} />Spese & Budget</h2>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <MonthPick value={filtroMese} onChange={e=>{setFiltroMese(e.target.value);setFiltroAnno('')}} style={S.input} />
              {anni.length>0 && (
                <Sel value={filtroAnno} onChange={e=>{setFiltroAnno(e.target.value)}} style={{...S.input,fontSize:12}}
                  options={[{value:'',label:'Mese'},...anni.map(a=>({value:a,label:'Anno '+a}))]} />
              )}
            </div>
          </div>
          <div style={{display:'flex',gap:mob?8:12,marginBottom:14,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:mob?'45%':undefined,background:'#3B82F615',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Totale{filtroAnno?' anno':' speso'}</p>
              <motion.p key={totFiltr} initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} transition={{type:'spring',stiffness:300}}
                style={{margin:0,fontSize:mob?20:26,fontWeight:700,color:'#3B82F6'}}>€ {(filtroAnno?totAnno(data.spese,+filtroAnno):totAll).toFixed(2)}</motion.p>
            </div>
            {!filtroAnno && (
              <div style={{flex:1,minWidth:mob?'45%':undefined,background:totAll>data.budget?'#EF444415':'#10B98115',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
                <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Rimanente</p>
                <motion.p key={data.budget-totAll} initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} transition={{type:'spring',stiffness:300}}
                  style={{margin:0,fontSize:mob?20:26,fontWeight:700,color:totAll>data.budget?'#EF4444':'#10B981'}}>€ {(data.budget-totAll).toFixed(2)}</motion.p>
              </div>
            )}
          </div>
          {!filtroAnno && <>
            <ProgBar pct={perc} color={perc>100?'#EF4444':perc>80?'#F59E0B':'#3B82F6'} />
            <p style={{margin:'4px 0 0',fontSize:11,color:t.textMut}}>Budget: € {data.budget} · {perc.toFixed(0)}% usato</p>
          </>}
        </div>

        <div style={S.card}>
          <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
            <Inp value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="Cerca..." style={{flex:1,minWidth:mob?80:130}} />
            <Sel value={ordine} onChange={e=>setOrdine(e.target.value)} style={{...S.input,fontSize:12}}
              options={[{value:'data-desc',label:'↓ Data'},{value:'data-asc',label:'↑ Data'},{value:'importo-desc',label:'↓ Importo'},{value:'importo-asc',label:'↑ Importo'}]} />
          </div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
            {['Tutte',...data.categorieSpese].map(cat=>(
              <motion.button key={cat} whileTap={{scale:0.91}} onClick={()=>setFiltroCat(cat)}
                style={{padding:'4px 10px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:500,background:filtroCat===cat?(catCol(cat)||'#1E293B'):t.tagBg,color:filtroCat===cat?'white':t.tagText,transition:'all 0.15s'}}>
                {cat}
              </motion.button>
            ))}
          </div>

          {lista.length===0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessuna spesa trovata</p>
            : <>
                <p style={{margin:'0 0 8px',fontSize:12,color:t.textSec}}>{lista.length} movimenti · € {totFiltr.toFixed(2)}</p>
                <AnimatePresence mode="popLayout">
                  {lista.map(s=>(
                    <motion.div key={s.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                      style={{display:'flex',alignItems:'center',gap:mob?6:10,padding:mob?'8px 8px':'10px 12px',background:t.rowBg,borderRadius:10,marginBottom:5,flexWrap:mob?'wrap':'nowrap'}}>
                      <div style={{width:9,height:9,borderRadius:'50%',background:catCol(s.categoria),flexShrink:0}} />
                      <span style={{flex:1,fontSize:mob?13:14,color:t.text,minWidth:mob?'60%':undefined}}>
                        {s.descrizione}
                        {s.ricorrente && <span style={{fontSize:10,background:'#3B82F618',color:'#3B82F6',padding:'1px 5px',borderRadius:6,marginLeft:6}}><Fa icon='fa-solid fa-rotate' /></span>}
                        {s.condivisa && <span style={{fontSize:10,background:'#10B98118',color:'#10B981',padding:'1px 5px',borderRadius:6,marginLeft:4}}>split</span>}
                      </span>
                      {!mob && <span style={{fontSize:11,color:t.textMut}}>{s.data}</span>}
                      {!mob && <span style={{fontSize:11,background:t.tagBg,color:t.tagText,padding:'2px 7px',borderRadius:8}}>{s.categoria}</span>}
                      {!mob && s.pagatoDa && <span style={{fontSize:11,color:'#3B82F6'}}><Fa icon='fa-solid fa-user' style={{marginRight:3}} />{s.pagatoDa}</span>}
                      {!mob && s.contattoId && (()=>{const ct=data.contatti.find(c=>c.id===+s.contattoId||c.id===s.contattoId); return ct ? <span style={{fontSize:10,background:'#0369A118',color:'#0369A1',padding:'1px 5px',borderRadius:6}}><Fa icon='fa-solid fa-address-card' style={{marginRight:3}} />{ct.nome}</span> : null})()}
                      <span style={{fontSize:mob?13:14,fontWeight:700,color:t.text,minWidth:mob?50:68,textAlign:'right'}}>€ {(+s.importo).toFixed(2)}</span>
                      <motion.button whileTap={{scale:0.85}} onClick={()=>startEdit(s)}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:14,padding:'0 2px'}}><Fa icon='fa-solid fa-pen' /></motion.button>
                      <motion.button whileHover={{scale:1.2}} whileTap={{scale:0.75}} onClick={()=>rimuovi(s.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:18,padding:'0 2px',lineHeight:1}}>×</motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>}
        </div>

        {debiti.some(d=>d.saldo!==0) && (
          <div style={S.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-people-group' style={{marginRight:6}} />Split spese</h3>
              <button onClick={()=>setShowSplit(v=>!v)} style={{background:'none',border:'none',color:'#3B82F6',cursor:'pointer',fontSize:12,fontWeight:600}}>
                {showSplit?'Nascondi':'Dettagli →'}
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {debiti.map(d=>(
                <div key={d.nome} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:t.rowBg,borderRadius:8}}>
                  <span style={{fontSize:13,color:t.text,fontWeight:500}}>{d.nome}</span>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:14,fontWeight:700,color:d.saldo>=0?'#10B981':'#EF4444'}}>
                      {d.saldo>=0?'+':''}€ {d.saldo.toFixed(2)}
                    </span>
                    {showSplit && <p style={{margin:0,fontSize:11,color:t.textMut}}>Pagato: €{d.pagato.toFixed(2)} · Quota: €{d.quota.toFixed(2)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:600,color:t.text}}>{editId ? 'Modifica spesa' : '+ Nuova spesa'}</h3>
            <div style={{display:'flex',gap:6}}>
              <motion.button whileTap={{scale:0.9}} onClick={()=>fotoInputRef.current?.click()}
                style={{padding:'6px 12px',background:'#10B98115',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,color:'#10B981',display:'flex',alignItems:'center',gap:4}}>
                <Fa icon='fa-solid fa-paperclip' /> Foto
              </motion.button>
              <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{display:'none'}} />
              <motion.button whileTap={{scale:0.9}} onClick={()=>ocrInputRef.current?.click()} disabled={ocrLoading}
                style={{padding:'6px 12px',background:'#8B5CF615',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,color:'#8B5CF6',display:'flex',alignItems:'center',gap:4}}>
                {ocrLoading ? <><Fa icon='fa-solid fa-spinner fa-spin' /> Scansione...</> : <><Fa icon='fa-solid fa-camera' /> Scontrino</>}
              </motion.button>
              <input ref={ocrInputRef} type="file" accept="image/*" capture="environment" onChange={handleOCR} style={{display:'none'}} />
            </div>
          </div>
          <FormField label="Descrizione" error={errors.descrizione}>
            <Inp value={form.descrizione} onChange={e=>setForm({...form,descrizione:e.target.value})} placeholder="es. Supermercato" onKeyDown={e=>e.key==='Enter'&&aggiungi()} />
          </FormField>
          <FormField label="Importo (€)" error={errors.importo}>
            <Inp type="number" value={form.importo} onChange={e=>setForm({...form,importo:e.target.value})} placeholder="0.00" />
          </FormField>
          <FormField label="Categoria">
            <Sel value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} style={S.inputFull}
              options={data.categorieSpese.map(c=>({value:c,label:c}))} />
          </FormField>
          <FormField label="Data">
            <DatePick value={form.data} onChange={e=>setForm({...form,data:e.target.value})} style={S.inputFull} />
          </FormField>
          <FormField label="Pagato da">
            <Sel value={form.pagatoDa} onChange={e=>setForm({...form,pagatoDa:e.target.value})} style={S.inputFull}
              options={[{value:'',label:'— comune —'},...data.membrifamiglia.map(m=>({value:m,label:m}))]} />
          </FormField>
          <FormField label="Stanza">
            <Sel value={form.stanza} onChange={e=>setForm({...form,stanza:e.target.value})} style={S.inputFull}
              options={[{value:'',label:'— nessuna —'},...STANZE.map(s=>({value:s,label:s}))]} />
          </FormField>
          {(data.conti||[]).length>1 && (
            <FormField label="Conto">
              <Sel value={form.conto} onChange={e=>setForm({...form,conto:e.target.value})} style={S.inputFull}
                options={[{value:'',label:'— tutti —'},...(data.conti||[]).map(c=>({value:c.nome,label:c.nome}))]} />
            </FormField>
          )}
          {data.contatti.length>0 && (
            <FormField label="Contatto collegato">
              <Sel value={form.contattoId} onChange={e=>setForm({...form,contattoId:e.target.value})} style={S.inputFull}
                options={[{value:'',label:'— nessuno —'},...data.contatti.map(c=>({value:String(c.id),label:c.nome+' ('+c.ruolo+')'}))]} />
            </FormField>
          )}
          <div style={{display:'flex',gap:16,marginBottom:12}}>
            <Chk checked={form.ricorrente} onChange={e=>setForm({...form,ricorrente:e.target.checked})} label="Ricorrente" />
            <Chk checked={form.condivisa} onChange={e=>setForm({...form,condivisa:e.target.checked})} label="Condivisa" />
          </div>
          {form.condivisa && data.membrifamiglia.length>1 && (
            <div style={{marginBottom:12,padding:12,background:t.rowBg,borderRadius:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:600,color:t.textSec}}>Quote personalizzate</span>
                <button onClick={()=>{
                  if (Object.keys(form.splitQuote||{}).length) { setForm({...form,splitQuote:{}}) }
                  else { const eq=Math.round(100/data.membrifamiglia.length*100)/100; setForm({...form,splitQuote:Object.fromEntries(data.membrifamiglia.map(m=>[m,eq]))}) }
                }} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#3B82F6',fontWeight:600}}>
                  {Object.keys(form.splitQuote||{}).length?'Dividi equamente':'Personalizza %'}
                </button>
              </div>
              {Object.keys(form.splitQuote||{}).length>0 ? (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {data.membrifamiglia.map(m=>(
                    <div key={m} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:13,color:t.text,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m}</span>
                      <Inp type="number" value={form.splitQuote[m]||''} onChange={e=>setForm({...form,splitQuote:{...form.splitQuote,[m]:+e.target.value||0}})}
                        style={{width:70,textAlign:'center'}} placeholder="%" />
                      <span style={{fontSize:12,color:t.textMut}}>%</span>
                    </div>
                  ))}
                  {(()=>{const tot=Object.values(form.splitQuote).reduce((s,v)=>s+(+v||0),0); return Math.abs(tot-100)>0.5 ? <p style={{margin:'4px 0 0',fontSize:11,color:'#EF4444',fontWeight:600}}>Totale: {tot.toFixed(0)}% (deve essere 100%)</p> : null})()}
                </div>
              ) : <p style={{margin:0,fontSize:12,color:t.textMut}}>Diviso equamente ({Math.round(100/data.membrifamiglia.length)}% ciascuno)</p>}
            </div>
          )}
          {/* Foto allegata */}
          {fotoPreview && (
            <div style={{marginBottom:12,position:'relative',display:'inline-block'}}>
              <img src={fotoPreview} alt="Allegato" style={{maxWidth:'100%',maxHeight:120,borderRadius:10,border:`1px solid ${t.border}`}} />
              <motion.button whileTap={{scale:0.8}} onClick={()=>setFotoPreview(null)}
                style={{position:'absolute',top:-8,right:-8,width:22,height:22,borderRadius:'50%',background:'#EF4444',color:'white',border:'none',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>×</motion.button>
            </div>
          )}
          <div style={{display:'flex',gap:8}}>
            <motion.button whileTap={{scale:0.97}} onClick={aggiungi} style={{...S.btn(t.accent),flex:1}}>{editId ? 'Aggiorna' : 'Aggiungi spesa'}</motion.button>
            {editId && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
          </div>
        </div>

        <AnimatePresence>
          {perCat.length>0 && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={S.card}>
              <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}>Per categoria</h3>
              <ResponsiveContainer width="100%" height={185}>
                <PieChart>
                  <Pie data={perCat} cx="50%" cy="50%" innerRadius={46} outerRadius={74} paddingAngle={3} dataKey="value">
                    {perCat.map((e,i)=><Cell key={i} fill={catCol(e.name)} />)}
                  </Pie>
                  <Tooltip formatter={v=>`€ ${v}`} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {perCat.map(c=>(
                  <div key={c.name} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:catCol(c.name)}} />
                      <span style={{color:t.textSec}}>{c.name}</span>
                    </div>
                    <span style={{fontWeight:600,color:t.text}}>€ {c.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {Object.keys(data.budgetCategorie||{}).length>0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-sliders' style={{marginRight:6}} />Budget per categoria</h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {data.categorieSpese.filter(cat=>(data.budgetCategorie||{})[cat]).map(cat=>{
                const budgetCat = (data.budgetCategorie||{})[cat]
                const spesoCat = data.spese.filter(s=>s.data?.startsWith(filtroAnno||filtroMese)&&s.categoria===cat).reduce((s,x)=>s+ +x.importo,0)
                const percCat = (spesoCat/budgetCat)*100
                return (
                  <div key={cat}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:catCol(cat)}} />
                        <span style={{fontSize:12,color:t.text,fontWeight:500}}>{cat}</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:percCat>100?'#EF4444':percCat>80?'#F59E0B':t.textSec}}>{'\u20AC'} {spesoCat.toFixed(0)} / {budgetCat}</span>
                    </div>
                    <ProgBar pct={Math.min(percCat,100)} color={percCat>100?'#EF4444':percCat>80?'#F59E0B':catCol(cat)} />
                    {percCat>100 && <p style={{margin:'2px 0 0',fontSize:10,color:'#EF4444',fontWeight:600}}><Fa icon='fa-solid fa-triangle-exclamation' style={{marginRight:3}} />Superato di {'\u20AC'} {(spesoCat-budgetCat).toFixed(0)}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(() => {
          const cps = costiPerStanza(data.spese, filtroAnno||filtroMese)
          const totCps = cps.reduce((s,c) => s + c.totale, 0)
          return cps.length > 0 ? (
            <div style={S.card}>
              <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-house-chimney' style={{marginRight:6}} />Costi per stanza</h3>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {cps.map(c => (
                  <div key={c.stanza}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:12,color:t.text,fontWeight:500}}>{c.stanza}</span>
                      <span style={{fontSize:12,fontWeight:600,color:t.textSec}}>€ {c.totale.toFixed(0)} ({(c.totale/totCps*100).toFixed(0)}%)</span>
                    </div>
                    <ProgBar pct={totCps>0?c.totale/totCps*100:0} color={COLORI_CAT[c.stanza]||'#6366F1'} />
                  </div>
                ))}
              </div>
              <p style={{margin:'8px 0 0',fontSize:11,color:t.textMut}}>Totale con stanza: € {totCps.toFixed(0)}</p>
            </div>
          ) : null
        })()}

        {(() => {
          const sugg = rilevaRicorrenti(data.spese)
          const mancanti = ricorrentiMancanti(data.spese, filtroMese)
          return (sugg.length > 0 || mancanti.length > 0) ? (
            <div style={S.card}>
              <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-rotate' style={{marginRight:6}} />Spese ricorrenti</h3>
              {mancanti.length > 0 && (
                <div style={{marginBottom:sugg.length>0?10:0}}>
                  <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#F59E0B'}}><Fa icon='fa-solid fa-triangle-exclamation' style={{marginRight:4}} />Non ancora inserite questo mese:</p>
                  {mancanti.map((m,i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 8px',background:'#F59E0B10',borderRadius:6,marginBottom:3}}>
                      <span style={{fontSize:12,color:t.text}}>{m.descrizione}</span>
                      <span style={{fontSize:12,fontWeight:600,color:'#F59E0B'}}>€ {(+m.importo).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {sugg.length > 0 && (
                <div>
                  <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#3B82F6'}}><Fa icon='fa-solid fa-lightbulb' style={{marginRight:4}} />Suggerimento: potrebbero essere ricorrenti</p>
                  {sugg.map((s,i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 8px',background:'#3B82F610',borderRadius:6,marginBottom:3}}>
                      <span style={{fontSize:12,color:t.text,textTransform:'capitalize'}}>{s.descrizione}</span>
                      <span style={{fontSize:12,color:t.textMut}}>~€ {s.importoMedio.toFixed(2)} × {s.mesi} mesi</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null
        })()}

        <div style={S.card}>
          <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-coins' style={{marginRight:6}} />Stipendio</h3>
          {(() => {
            const stipendio = getStipendioMese(data, filtroMese)
            const spMese = totMese(data.spese, filtroMese)
            const risp = stipendio - spMese
            const accantonamenti = data.accantonamenti || []
            const quotaAcc = accantonamenti.reduce((s, a) => {
              if (a.percentuale && stipendio > 0) return s + (stipendio * a.percentuale / 100)
              return s + (a.importoManuale || 0)
            }, 0)
            const disponibile = risp - quotaAcc
            return stipendio > 0 ? (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:22,fontWeight:700,color:'#059669'}}>€ {stipendio.toFixed(2)}</span>
                  <span style={{fontSize:11,color:t.textMut}}>da tab Stipendio</span>
                </div>
                <div style={{padding:12,background:disponibile>=0?'#ECFDF5':'#FEF2F2',borderRadius:10}}>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                      <span style={{color:t.textSec}}>Spese</span>
                      <span style={{fontWeight:600,color:'#EF4444'}}>- € {spMese.toFixed(2)}</span>
                    </div>
                    {quotaAcc > 0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                      <span style={{color:t.textSec}}>Accantonamenti</span>
                      <span style={{fontWeight:600,color:'#F59E0B'}}>- € {quotaAcc.toFixed(2)}</span>
                    </div>}
                    <div style={{borderTop:`1px solid ${t.border}`,paddingTop:4,marginTop:2,display:'flex',justifyContent:'space-between',fontSize:14}}>
                      <span style={{fontWeight:600,color:t.text}}>Disponibile</span>
                      <span style={{fontWeight:700,color:disponibile>=0?'#10B981':'#EF4444'}}>€ {disponibile.toFixed(2)}</span>
                    </div>
                  </div>
                  <ProgBar pct={Math.min(100,(spMese/stipendio)*100)} color={spMese>stipendio?'#EF4444':spMese/stipendio>0.8?'#F59E0B':'#10B981'} />
                  <p style={{margin:'4px 0 0',fontSize:11,color:t.textMut}}>Speso {((spMese/stipendio)*100).toFixed(0)}% dello stipendio</p>
                </div>
              </div>
            ) : (
              <p style={{color:t.textMut,fontSize:13}}>Registra il tuo stipendio nel tab Stipendio</p>
            )
          })()}
        </div>

        <div style={S.card}>
          <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}>Budget mensile</h3>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Inp type="number" defaultValue={data.budget} onBlur={e=>updateData('budget',+e.target.value||0)} style={{flex:1}} />
            <span style={{color:t.textSec,fontSize:14,whiteSpace:'nowrap'}}>€/mese</span>
          </div>
        </div>

        <div style={S.card}>
          <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-bullseye' style={{marginRight:6}} />Goal risparmio</h3>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Inp type="number" defaultValue={data.goalRisparmio} onBlur={e=>updateData('goalRisparmio',+e.target.value||0)} style={{flex:1}} />
            <span style={{color:t.textSec,fontSize:14,whiteSpace:'nowrap'}}>€/mese</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SCADENZE ──────────────────────────────────────────────────────────────────
function ScadenzeTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm]     = useState({ nome:'', data:'', categoria:data.categorieScadenze[0]||'Altro', note:'', ripetizione:'annuale' })
  const [errors, setErrors] = useState({})
  const [mostraGestite, setMostraGestite] = useState(false)
  const [editId, setEditId] = useState(null)
  const [convertPrompt, setConvertPrompt] = useState(null)
  const formDefault = { nome:'', data:'', categoria:data.categorieScadenze[0]||'Altro', note:'', ripetizione:'annuale', importoStimato:'' }

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome='Inserisci un nome'
    if (!form.data) e.data='Inserisci una data'
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    if (editId) {
      updateData('scadenze', data.scadenze.map(s=>s.id===editId?{...s, nome:form.nome.trim(), data:form.data, categoria:form.categoria, note:form.note, ripetizione:form.ripetizione, importoStimato:form.importoStimato?+form.importoStimato:undefined}:s))
      toast('Scadenza aggiornata')
    } else {
      updateData('scadenze', [...data.scadenze, {...form, id:Date.now(), gestita:false, importoStimato:form.importoStimato?+form.importoStimato:undefined}])
      toast('Scadenza aggiunta')
    }
    setForm(formDefault); setEditId(null); setErrors({})
  }

  const startEdit = (s) => {
    setForm({ nome:s.nome, data:s.data, categoria:s.categoria, note:s.note||'', ripetizione:s.ripetizione||'nessuna', importoStimato:s.importoStimato||'' })
    setEditId(s.id)
  }
  const cancelEdit = () => { setForm(formDefault); setEditId(null); setErrors({}) }

  const rimuovi = (id) => { if(!confirm('Eliminare questa scadenza?')) return; updateData('scadenze', data.scadenze.filter(s=>s.id!==id)); toast('Scadenza eliminata') }

  const segnaGestita = (id) => {
    const s = data.scadenze.find(x=>x.id===id)
    if (!s) return
    let nuove = data.scadenze.map(x=>x.id===id?{...x,gestita:true}:x)
    if (s.ripetizione==='annuale') {
      const next = new Date(s.data); next.setFullYear(next.getFullYear()+1)
      nuove = [...nuove, {...s,id:Date.now(),gestita:false,data:next.toISOString().slice(0,10)}]
    }
    updateData('scadenze', nuove)
    toast('Scadenza gestita')
    // Prompt to convert to spesa
    setConvertPrompt({nome:s.nome, importo:s.importoStimato||'', data:s.data, categoria:s.categoria==='Bollette'||s.categoria==='Abbonamento'?'Bollette':'Casa'})
  }

  const convertToSpesa = () => {
    if (!convertPrompt || !convertPrompt.importo || +convertPrompt.importo <= 0) return
    updateData('spese', [...data.spese, {
      id: Date.now() + 1,
      descrizione: convertPrompt.nome,
      importo: +convertPrompt.importo,
      categoria: convertPrompt.categoria,
      data: convertPrompt.data || new Date().toISOString().slice(0,10),
      ricorrente: false, pagatoDa: '', condivisa: false,
    }])
    toast('Spesa creata da scadenza')
    setConvertPrompt(null)
  }

  const attive  = [...data.scadenze].filter(s=>!s.gestita).sort((a,b)=>a.data?.localeCompare(b.data))
  const gestite = [...data.scadenze].filter(s=>s.gestita).sort((a,b)=>b.data?.localeCompare(a.data))

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 300px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-regular fa-calendar-check' style={{marginRight:6}} />Scadenze & Documenti</h2>
            <motion.button whileTap={{scale:0.95}} onClick={()=>setMostraGestite(v=>!v)}
              style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${t.border}`,background:t.cardBg,cursor:'pointer',fontSize:12,color:t.textSec,fontWeight:500}}>
              {mostraGestite?'Mostra attive':`Archivio (${gestite.length})`}
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {!mostraGestite ? (
              <motion.div key="attive" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                {attive.length===0
                  ? <p style={{color:t.textMut,fontSize:14}}>Nessuna scadenza attiva</p>
                  : <AnimatePresence mode="popLayout">
                      {attive.map(s=>{
                        const {color,label,bg} = scadCol(s.data)
                        return (
                          <motion.div key={s.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                            style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:bg,borderRadius:12,border:`1px solid ${color}33`,marginBottom:8}}>
                            <div style={{width:46,height:46,borderRadius:10,background:color+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <span style={{fontSize:11,fontWeight:700,color,textAlign:'center',lineHeight:1.3}}>{label}</span>
                            </div>
                            <div style={{flex:1}}>
                              <p style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>{s.nome}</p>
                              <p style={{margin:'2px 0 0',fontSize:12,color:t.textSec}}>{s.categoria} · {new Date(s.data).toLocaleDateString('it-IT')}</p>
                              {s.note && <p style={{margin:'2px 0 0',fontSize:11,color:t.textMut}}>{s.note}</p>}
                              <div style={{display:'flex',gap:6,marginTop:3,flexWrap:'wrap'}}>
                                {s.ripetizione==='annuale' && <span style={{fontSize:10,background:'#3B82F618',color:'#3B82F6',padding:'1px 6px',borderRadius:6,display:'inline-block'}}><Fa icon='fa-solid fa-rotate' style={{marginRight:3}} />annuale</span>}
                                {s.importoStimato>0 && <span style={{fontSize:10,background:'#05966918',color:'#059669',padding:'1px 6px',borderRadius:6,display:'inline-block'}}>€ {s.importoStimato}</span>}
                              </div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                              <motion.button whileTap={{scale:0.9}} onClick={()=>startEdit(s)}
                                style={{padding:'5px 10px',background:t.tagBg,color:t.textSec,border:'none',borderRadius:8,fontSize:12,cursor:'pointer'}}><Fa icon='fa-solid fa-pen' /></motion.button>
                              <motion.button whileTap={{scale:0.9}} onClick={()=>segnaGestita(s.id)}
                                style={{padding:'5px 10px',background:'#10B981',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}><Fa icon='fa-solid fa-check' style={{marginRight:4}} />Gestita</motion.button>
                              <motion.button whileTap={{scale:0.9}} onClick={()=>rimuovi(s.id)}
                                style={{padding:'5px 10px',background:'none',color:t.textMut,border:`1px solid ${t.border}`,borderRadius:8,fontSize:12,cursor:'pointer'}}>Elimina</motion.button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                }
              </motion.div>
            ) : (
              <motion.div key="gestite" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                {gestite.length===0
                  ? <p style={{color:t.textMut,fontSize:14}}>Nessuna scadenza archiviata</p>
                  : <AnimatePresence mode="popLayout">
                      {gestite.map(s=>(
                        <motion.div key={s.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                          style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:t.rowBg,borderRadius:10,marginBottom:6,opacity:0.7}}>
                          <span style={{fontSize:16}}><Fa icon='fa-solid fa-circle-check' /></span>
                          <div style={{flex:1}}>
                            <p style={{margin:0,fontSize:14,fontWeight:600,color:t.textSec,textDecoration:'line-through'}}>{s.nome}</p>
                            <p style={{margin:0,fontSize:11,color:t.textMut}}>{new Date(s.data).toLocaleDateString('it-IT')}</p>
                          </div>
                          <motion.button whileTap={{scale:0.85}} onClick={()=>rimuovi(s.id)}
                            style={{background:'none',border:'none',cursor:'pointer',color:t.textMut,fontSize:18}}>×</motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{...S.card,alignSelf:'start'}}>
        <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>{editId ? 'Modifica scadenza' : '+ Nuova scadenza'}</h3>
        <FormField label="Nome" error={errors.nome}>
          <Inp value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="es. Bollo auto" onKeyDown={e=>e.key==='Enter'&&aggiungi()} />
        </FormField>
        <FormField label="Data scadenza" error={errors.data}>
          <DatePick value={form.data} onChange={e=>setForm({...form,data:e.target.value})} style={S.inputFull} />
        </FormField>
        <FormField label="Categoria">
          <Sel value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} style={S.inputFull}
            options={data.categorieScadenze.map(c=>({value:c,label:c}))} />
        </FormField>
        <FormField label="Ripetizione">
          <Sel value={form.ripetizione} onChange={e=>setForm({...form,ripetizione:e.target.value})} style={S.inputFull}
            options={[{value:'nessuna',label:'Nessuna'},{value:'annuale',label:'Annuale (auto-rinnovo)'}]} />
        </FormField>
        <FormField label="Note">
          <Inp value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale" />
        </FormField>
        <FormField label="Importo stimato (€)">
          <Inp type="number" value={form.importoStimato} onChange={e=>setForm({...form,importoStimato:e.target.value})} placeholder="Per creare spesa quando gestita" />
        </FormField>
        <div style={{display:'flex',gap:8}}>
          <motion.button whileTap={{scale:0.97}} onClick={aggiungi} style={{...S.btn('#F59E0B'),flex:1}}>{editId ? 'Aggiorna' : 'Aggiungi scadenza'}</motion.button>
          {editId && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
        </div>

        {/* Convert to spesa prompt */}
        <AnimatePresence>
          {convertPrompt && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{marginTop:12,padding:14,background:'#3B82F615',border:`1px solid ${t.border}`,borderRadius:12}}>
              <p style={{margin:'0 0 8px',fontSize:13,fontWeight:600,color:'#1D4ED8'}}><Fa icon='fa-solid fa-wallet' style={{marginRight:4}} />Registrare come spesa?</p>
              <p style={{margin:'0 0 8px',fontSize:12,color:'#3B82F6'}}>"{convertPrompt.nome}" — {convertPrompt.data}</p>
              <Inp type="number" value={convertPrompt.importo} onChange={e=>setConvertPrompt({...convertPrompt,importo:e.target.value})} placeholder="Importo €" style={{marginBottom:8}} />
              <Sel value={convertPrompt.categoria} onChange={e=>setConvertPrompt({...convertPrompt,categoria:e.target.value})} style={{...S.inputFull,marginBottom:8}}
                options={data.categorieSpese.map(c=>({value:c,label:c}))} />
              <div style={{display:'flex',gap:6}}>
                <motion.button whileTap={{scale:0.95}} onClick={convertToSpesa}
                  style={{flex:1,padding:'8px',background:'#3B82F6',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Sì, registra spesa</motion.button>
                <motion.button whileTap={{scale:0.95}} onClick={()=>setConvertPrompt(null)}
                  style={{padding:'8px 12px',background:t.tagBg,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',color:t.textSec}}>No</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── ATTIVITÀ (drag & drop) ────────────────────────────────────────────────────
function AttivitaTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm]     = useState({ testo:'', stanza:'Generale', assegnato:'', priorita:'Media', contattoId:'' })
  const [errors, setErrors] = useState({})
  const [filtro, setFiltro] = useState('tutte')
  const [filtroStanza, setFiltroStanza] = useState('Tutte')
  const [editId, setEditId] = useState(null)
  const formDefault = { testo:'', stanza:'Generale', assegnato:'', priorita:'Media', contattoId:'' }

  const validate = () => {
    const e = {}
    if (!form.testo.trim()) e.testo="Descrivi l'attività"
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    if (editId) {
      updateData('attivita', data.attivita.map(a=>a.id===editId?{...a, testo:form.testo.trim(), stanza:form.stanza, assegnato:form.assegnato, priorita:form.priorita, contattoId:form.contattoId||undefined}:a))
      toast('Attivit\u00e0 aggiornata')
    } else {
      updateData('attivita', [...data.attivita, {...form, id:Date.now(), completata:false, creatoIl:new Date().toISOString().slice(0,10), contattoId:form.contattoId||undefined}])
      toast('Attivit\u00e0 aggiunta')
    }
    setForm(formDefault); setEditId(null); setErrors({})
  }

  const startEdit = (a) => {
    setForm({ testo:a.testo, stanza:a.stanza||'Generale', assegnato:a.assegnato||'', priorita:a.priorita||'Media', contattoId:a.contattoId||'' })
    setEditId(a.id)
  }
  const cancelEdit = () => { setForm(formDefault); setEditId(null); setErrors({}) }

  const toggle  = (id) => updateData('attivita', data.attivita.map(a=>a.id===id?{...a,completata:!a.completata}:a))
  const rimuovi = (id) => { if(!confirm('Eliminare questa attivit\u00e0?')) return; updateData('attivita', data.attivita.filter(a=>a.id!==id)); toast('Attivit\u00e0 eliminata') }
  const pc = {Alta:'#EF4444',Media:'#F59E0B',Bassa:'#10B981'}

  let lista = [...data.attivita]
  if (filtro==='aperte')     lista = lista.filter(a=>!a.completata)
  if (filtro==='completate') lista = lista.filter(a=>a.completata)
  if (filtroStanza!=='Tutte') lista = lista.filter(a=>a.stanza===filtroStanza)

  const aperte     = data.attivita.filter(a=>!a.completata).length
  const completate = data.attivita.filter(a=>a.completata).length

  const onReorder = (newList) => {
    const idsSet = new Set(newList.map(a=>a.id))
    const rest = data.attivita.filter(a=>!idsSet.has(a.id))
    updateData('attivita', [...newList, ...rest])
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 300px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-list-check' style={{marginRight:6}} />Lista attività</h2>
            <span style={{fontSize:13,color:t.textSec}}>{aperte} da fare · {completate} ok</span>
          </div>

          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            {['tutte','aperte','completate'].map(f=>(
              <motion.button key={f} whileTap={{scale:0.9}} onClick={()=>setFiltro(f)}
                style={{padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:500,background:filtro===f?'#10B981':t.tagBg,color:filtro===f?'white':t.tagText}}>
                {f}
              </motion.button>
            ))}
            <Sel value={filtroStanza} onChange={e=>setFiltroStanza(e.target.value)} style={{...S.input,fontSize:12,padding:'5px 8px'}}
              options={[{value:'Tutte',label:'Tutte le stanze'},...STANZE.map(s=>({value:s,label:s}))]} />
          </div>

          <p style={{margin:'0 0 8px',fontSize:11,color:t.textMut}}>Trascina per riordinare le attività</p>

          {lista.length===0
            ? <motion.p initial={{opacity:0}} animate={{opacity:1}} style={{color:t.textMut,fontSize:14}}>
                {filtro==='aperte'?'Tutte le attività completate —':'Nessuna attività'}
              </motion.p>
            : <Reorder.Group axis="y" values={lista} onReorder={onReorder} style={{listStyle:'none',padding:0,margin:0}}>
                {lista.map(a=>(
                  <Reorder.Item key={a.id} value={a} style={{marginBottom:6,cursor:'grab'}}>
                    <motion.div layout
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:a.completata?t.rowBg:t.cardBg,border:`1px solid ${a.completata?t.border:t.border}`,borderRadius:10}}>
                      <motion.div whileHover={{scale:1.12}} whileTap={{scale:0.82}} onClick={()=>toggle(a.id)}
                        style={{width:20,height:20,borderRadius:6,border:`2px solid ${a.completata?'#10B981':'#CBD5E1'}`,background:a.completata?'#10B981':'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'white'}}>
                        <AnimatePresence>
                          {a.completata && <motion.span initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Fa icon='fa-solid fa-check' /></motion.span>}
                        </AnimatePresence>
                      </motion.div>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontSize:14,color:a.completata?t.textMut:t.text,textDecoration:a.completata?'line-through':'none'}}>{a.testo}</p>
                        <div style={{display:'flex',gap:5,marginTop:3,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,background:t.tagBg,color:t.tagText,padding:'1px 6px',borderRadius:6}}>{a.stanza}</span>
                          {a.assegnato && <span style={{fontSize:11,background:'#3B82F618',color:'#3B82F6',padding:'1px 6px',borderRadius:6}}><Fa icon='fa-solid fa-user' style={{marginRight:3}} />{a.assegnato}</span>}
                          {a.contattoId && (()=>{const ct=data.contatti.find(c=>c.id===+a.contattoId||c.id===a.contattoId); return ct ? <span style={{fontSize:10,background:'#0369A118',color:'#0369A1',padding:'1px 5px',borderRadius:6}}><Fa icon='fa-solid fa-address-card' style={{marginRight:3}} />{ct.nome}</span> : null})()}
                          <span style={{fontSize:11,background:pc[a.priorita]+'22',color:pc[a.priorita],padding:'1px 6px',borderRadius:6,fontWeight:600}}>{a.priorita}</span>
                        </div>
                      </div>
                      <span style={{fontSize:16,cursor:'grab',color:t.textMut,userSelect:'none'}}>⠿</span>
                      <motion.button whileHover={{scale:1.2}} whileTap={{scale:0.75}} onClick={()=>rimuovi(a.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:t.textMut,fontSize:20,padding:'0 2px',lineHeight:1}}>×</motion.button>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
          }
        </div>
      </div>

      <div style={{...S.card,alignSelf:'start'}}>
        <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>{editId ? 'Modifica attivit\u00e0' : '+ Nuova attivit\u00e0'}</h3>
        <FormField label="Cosa fare" error={errors.testo}>
          <Inp value={form.testo} onChange={e=>setForm({...form,testo:e.target.value})} placeholder="es. Riparare rubinetto" onKeyDown={e=>e.key==='Enter'&&aggiungi()} />
        </FormField>
        <FormField label="Stanza">
          <Sel value={form.stanza} onChange={e=>setForm({...form,stanza:e.target.value})} style={S.inputFull}
            options={STANZE.map(s=>({value:s,label:s}))} />
        </FormField>
        <FormField label="Assegna a">
          <Sel value={form.assegnato} onChange={e=>setForm({...form,assegnato:e.target.value})} style={S.inputFull}
            options={[{value:'',label:'— nessuno —'},...data.membrifamiglia.map(m=>({value:m,label:m}))]} />
        </FormField>
        {data.contatti.length>0 && (
          <FormField label="Contatto collegato">
            <Sel value={form.contattoId} onChange={e=>setForm({...form,contattoId:e.target.value})} style={S.inputFull}
              options={[{value:'',label:'— nessuno —'},...data.contatti.map(c=>({value:String(c.id),label:c.nome+' ('+c.ruolo+')'}))]} />
          </FormField>
        )}
        <FormField label="Priorità">
          <Sel value={form.priorita} onChange={e=>setForm({...form,priorita:e.target.value})} style={S.inputFull}
            options={['Alta','Media','Bassa'].map(p=>({value:p,label:p}))} />
        </FormField>
        <div style={{display:'flex',gap:8}}>
          <motion.button whileTap={{scale:0.97}} onClick={aggiungi} style={{...S.btn('#10B981'),flex:1}}>{editId ? 'Aggiorna' : 'Aggiungi attivit\u00e0'}</motion.button>
          {editId && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
        </div>

        {data.attivita.length>0 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{marginTop:16,padding:14,background:t.rowBg,borderRadius:12}}>
            <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:t.textSec}}>Completamento</p>
            <ProgBar pct={(completate/data.attivita.length)*100} color="#10B981" />
            <p style={{margin:'4px 0 0',fontSize:11,color:t.textMut}}>{completate}/{data.attivita.length} — {((completate/data.attivita.length)*100).toFixed(0)}%</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── CONSUMI ───────────────────────────────────────────────────────────────────
function ConsumiTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm] = useState({ mese:mc(), luce:'', gas:'', acqua:'' })
  const [editMese, setEditMese] = useState(null)

  const salva = () => {
    if (!form.luce&&!form.gas&&!form.acqua) { toast('Inserisci almeno un valore'); return }
    const idx = data.consumi.findIndex(c=>c.mese===form.mese)
    if (idx>=0) { const u=[...data.consumi]; u[idx]={...form}; updateData('consumi',u); toast('Consumi aggiornati') }
    else { updateData('consumi', [...data.consumi, {...form,id:Date.now()}]); toast('Consumi salvati') }
    setEditMese(null); setForm({ mese:mc(), luce:'', gas:'', acqua:'' })
  }

  const startEdit = (c) => {
    setForm({mese:c.mese,luce:String(c.luce||''),gas:String(c.gas||''),acqua:String(c.acqua||'')})
    setEditMese(c.mese)
  }

  const cancelEdit = () => { setEditMese(null); setForm({ mese:mc(), luce:'', gas:'', acqua:'' }) }

  const rimuovi = (mese) => { if(!confirm('Eliminare questi consumi?')) return; updateData('consumi', data.consumi.filter(c=>c.mese!==mese)); toast('Consumi eliminati') }

  const ordinati = [...data.consumi].sort((a,b)=>a.mese?.localeCompare(b.mese)).slice(-12)
  const totC = (c) => +(c.luce||0) + +(c.gas||0) + +(c.acqua||0)
  const media = ordinati.length ? sum(ordinati,totC)/ordinati.length : 0
  const ult   = ordinati[ordinati.length-1]
  const penu  = ordinati[ordinati.length-2]

  const chartData = ordinati.map(c=>({
    name: MESI[+c.mese?.slice(5,7)-1]+" '"+c.mese?.slice(2,4),
    Luce:+(c.luce||0), Gas:+(c.gas||0), Acqua:+(c.acqua||0), Totale:totC(c),
  }))

  const formTot = +(form.luce||0) + +(form.gas||0) + +(form.acqua||0)

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 300px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {ordinati.length>0 && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
            style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(3,1fr)',gap:mob?8:12}}>
            {[
              {label:'Media mensile',value:`€ ${media.toFixed(0)}`,color:'#8B5CF6',bg:'#8B5CF615'},
              {label:'Ultimo mese',value:ult?`€ ${totC(ult).toFixed(0)}`:'—',color:ult&&totC(ult)>media?'#EF4444':'#10B981',bg:ult&&totC(ult)>media?'#EF444415':'#10B98115'},
              {label:'Proiezione annuale',value:`€ ${(media*12).toFixed(0)}`,color:'#3B82F6',bg:'#3B82F615'},
            ].map(st=>(
              <div key={st.label} style={{...S.card,padding:mob?10:14,textAlign:'center'}}>
                <p style={{margin:'0 0 3px',fontSize:11,color:t.textSec}}>{st.label}</p>
                <p style={{margin:0,fontSize:mob?16:19,fontWeight:700,color:st.color}}>{st.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-bolt' style={{marginRight:6}} />Consumi energetici</h2>
          {chartData.length<2
            ? <p style={{color:t.textMut,fontSize:14}}>Aggiungi almeno 2 mesi per il grafico</p>
            : <ResponsiveContainer width="100%" height={mob?200:275}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                  <XAxis dataKey="name" tick={{fontSize:11,fill:t.textMut}} />
                  <YAxis tick={{fontSize:11,fill:t.textMut}} />
                  <Tooltip formatter={(v,n)=>[`€ ${v}`,n]} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
                  <Legend />
                  <Line type="monotone" dataKey="Luce"   stroke="#F59E0B" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                  <Line type="monotone" dataKey="Gas"    stroke="#EF4444" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                  <Line type="monotone" dataKey="Acqua"  stroke="#3B82F6" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                  <Line type="monotone" dataKey="Totale" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>

        {ordinati.length>0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}>Storico mensile</h3>
            <AnimatePresence mode="popLayout">
              {[...ordinati].reverse().map(c=>{
                const tot=totC(c); const sopra=tot>media
                return (
                  <motion.div key={c.mese} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                    style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:t.rowBg,borderRadius:10,marginBottom:5}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontWeight:600,color:t.textSec,fontSize:13,minWidth:65}}>{MESI[+c.mese?.slice(5,7)-1]} {c.mese?.slice(0,4)}</span>
                      <span style={{fontSize:11,color:sopra?'#EF4444':'#10B981'}}>{sopra?'↑ sopra':'↓ sotto'}</span>
                    </div>
                    <div style={{display:'flex',gap:10,fontSize:12,color:t.textSec,alignItems:'center'}}>
                      <span><Fa icon='fa-solid fa-lightbulb' style={{marginRight:2}} />{(+(c.luce||0)).toFixed(0)}</span>
                      <span><Fa icon='fa-solid fa-fire-flame-simple' style={{marginRight:2}} />{(+(c.gas||0)).toFixed(0)}</span>
                      <span><Fa icon='fa-solid fa-droplet' style={{marginRight:2}} />{(+(c.acqua||0)).toFixed(0)}</span>
                      <span style={{fontWeight:700,color:sopra?'#EF4444':'#10B981',minWidth:52,textAlign:'right'}}>€{tot.toFixed(0)}</span>
                    </div>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>startEdit(c)}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:14,padding:'0 2px'}}><Fa icon='fa-solid fa-pen' /></motion.button>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>rimuovi(c.mese)}
                      style={{background:'none',border:'none',cursor:'pointer',color:t.textMut,fontSize:18,marginLeft:6}}>×</motion.button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div style={{...S.card,alignSelf:'start'}}>
        <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>{editMese ? 'Modifica consumi' : '+ Inserisci consumi'}</h3>
        <FormField label="Mese">
          <MonthPick value={form.mese} onChange={e=>setForm({...form,mese:e.target.value})} style={S.inputFull} />
        </FormField>
        <FormField label="Luce (€)">
          <Inp type="number" value={form.luce} onChange={e=>setForm({...form,luce:e.target.value})} placeholder="0.00" />
        </FormField>
        <FormField label="Gas (€)">
          <Inp type="number" value={form.gas} onChange={e=>setForm({...form,gas:e.target.value})} placeholder="0.00" />
        </FormField>
        <FormField label="Acqua (€)">
          <Inp type="number" value={form.acqua} onChange={e=>setForm({...form,acqua:e.target.value})} placeholder="0.00" />
        </FormField>
        <AnimatePresence>
          {formTot>0 && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{marginBottom:10,padding:'10px 12px',background:'#8B5CF615',borderRadius:10,fontSize:13,color:'#8B5CF6',fontWeight:600}}>
              Totale: € {formTot.toFixed(2)}
              {media>0 && <span style={{fontSize:11,color:formTot>media?'#EF4444':'#10B981',marginLeft:8}}>({formTot>media?'↑':'↓'} media € {media.toFixed(0)})</span>}
            </motion.div>
          )}
        </AnimatePresence>
        <p style={{margin:'0 0 8px',fontSize:11,color:t.textMut}}>{editMese ? 'Stai modificando i consumi di questo mese.' : 'Se il mese esiste già, i dati verranno aggiornati.'}</p>
        <div style={{display:'flex',gap:8}}>
          <motion.button whileTap={{scale:0.97}} onClick={salva} style={{...S.btn('#8B5CF6'),flex:1}}>{editMese ? 'Aggiorna consumi' : 'Salva consumi'}</motion.button>
          {editMese && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
        </div>
        {ult&&penu && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{marginTop:12,padding:'10px 12px',background:t.rowBg,borderRadius:10}}>
            <p style={{margin:'0 0 3px',fontSize:11,color:t.textSec}}>Confronto ultimi 2 mesi</p>
            <Delta curr={totC(ult)} prev={totC(penu)} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function AnalyticsTab({ data }) {
  const t = useT(); const S = makeS(t)
  const w = useWindowWidth(); const mob = w < 768
  const [anno, setAnno] = useState(new Date().getFullYear())

  const mesiAnno = Array.from({length:12},(_,i)=>`${anno}-${String(i+1).padStart(2,'0')}`)
  const datiMensili = mesiAnno.map((m,i)=>({
    name:MESI[i],
    [anno]:+totMese(data.spese,m).toFixed(0),
    [anno-1]:+totMese(data.spese,`${anno-1}-${String(i+1).padStart(2,'0')}`).toFixed(0),
  }))

  const totCorr = totAnno(data.spese, anno)
  const totPrec = totAnno(data.spese, anno-1)
  const mediaMensile = totCorr / (new Date().getMonth()+1)
  const mesePiuCostoso = datiMensili.reduce((max,m)=>m[anno]>max.val?{name:m.name,val:m[anno]}:max,{name:'-',val:0})

  const perCatAnno = data.categorieSpese
    .map(cat=>({name:cat,value:+sum(data.spese.filter(s=>s.data?.startsWith(String(anno))&&s.categoria===cat),s=>+s.importo).toFixed(2)}))
    .filter(c=>c.value>0)

  const trendCat = data.categorieSpese.slice(0,5).map(cat=>({
    cat,
    data: mesiAnno.map((m,i)=>({name:MESI[i],value:+totMese(data.spese.filter(s=>s.categoria===cat),m).toFixed(0)})),
  }))

  const anni = [...new Set(data.spese.map(s=>s.data?.slice(0,4)).filter(Boolean))].sort().reverse()

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <h2 style={{margin:0,fontSize:mob?16:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-chart-pie' style={{marginRight:6}} />Analytics</h2>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {anni.map(a=>(
            <motion.button key={a} whileTap={{scale:0.9}} onClick={()=>setAnno(+a)}
              style={S.smallBtn(+a===anno,'#3B82F6')}>{a}</motion.button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(auto-fit,minmax(200px,1fr))',gap:mob?8:12}}>
        {[
          {label:`Totale ${anno}`,value:`€ ${totCorr.toFixed(0)}`,color:'#3B82F6'},
          {label:'Media mensile',value:`€ ${mediaMensile.toFixed(0)}`,color:'#8B5CF6'},
          {label:'Mese più costoso',value:`${mesePiuCostoso.name} (€${mesePiuCostoso.val})`,color:'#EF4444'},
          {label:`vs ${anno-1}`,value:totPrec>0?`${((totCorr-totPrec)/totPrec*100).toFixed(0)}%`:'N/A',color:totCorr>totPrec?'#EF4444':'#10B981'},
        ].map(st=>(
          <div key={st.label} style={{...S.card,padding:mob?10:14,textAlign:'center'}}>
            <p style={{margin:'0 0 3px',fontSize:11,color:t.textSec}}>{st.label}</p>
            <p style={{margin:0,fontSize:mob?16:20,fontWeight:700,color:st.color}}>{st.value}</p>
          </div>
        ))}
      </div>

      <div style={{...S.card,overflow:'hidden',position:'relative'}}>
        <div style={{position:'absolute',top:0,right:0,width:180,height:180,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)',pointerEvents:'none'}} />
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
          <div>
            <h3 style={{margin:0,fontSize:16,fontWeight:700,color:t.text}}>Trend annuale</h3>
            <p style={{margin:'2px 0 0',fontSize:12,color:t.textMut}}>{anno} vs {anno-1}</p>
          </div>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:22,height:3,borderRadius:2,background:'linear-gradient(90deg,#3B82F6,#8B5CF6)'}} />
              <span style={{fontSize:11,fontWeight:600,color:t.textSec}}>{anno}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:22,height:3,borderRadius:2,background:'#CBD5E1',opacity:0.6}} />
              <span style={{fontSize:11,fontWeight:500,color:t.textMut}}>{anno-1}</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={mob?240:320}>
          <AreaChart data={datiMensili} margin={{top:5,right:8,left:-10,bottom:0}}>
            <defs>
              <linearGradient id="gradCorr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.28} />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.10} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPrec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.10} />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={t.border} strokeOpacity={0.5} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:500,fill:t.textMut}} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:t.textMut}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:`€${v}`} />
            <Tooltip cursor={{stroke:t.border,strokeDasharray:'4 4'}}
              content={({active,payload,label})=>{
                if(!active||!payload?.length) return null
                return <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:14,padding:'12px 16px',
                  boxShadow:'0 8px 24px rgba(0,0,0,0.12)',backdropFilter:'blur(8px)'}}>
                  <p style={{margin:'0 0 8px',fontSize:13,fontWeight:700,color:t.text}}>{label}</p>
                  {payload.map((p,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:i<payload.length-1?4:0}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:i===0?'#3B82F6':'#94A3B8',
                        boxShadow:i===0?'0 0 6px rgba(59,130,246,0.4)':'none'}} />
                      <span style={{fontSize:12,color:t.textSec,minWidth:30}}>{p.name}</span>
                      <span style={{fontSize:13,fontWeight:700,color:i===0?'#3B82F6':t.textMut}}>€ {p.value?.toLocaleString('it-IT')}</span>
                    </div>
                  ))}
                  {payload.length===2 && payload[1].value>0 && (()=>{
                    const diff = payload[0].value - payload[1].value
                    const perc = ((diff/payload[1].value)*100).toFixed(0)
                    return <div style={{marginTop:8,paddingTop:6,borderTop:`1px solid ${t.border}`,display:'flex',alignItems:'center',gap:4}}>
                      <Fa icon={diff>=0?'fa-solid fa-arrow-trend-up':'fa-solid fa-arrow-trend-down'} style={{fontSize:10,color:diff>=0?'#EF4444':'#10B981'}} />
                      <span style={{fontSize:11,fontWeight:600,color:diff>=0?'#EF4444':'#10B981'}}>{diff>=0?'+':''}{perc}%</span>
                    </div>
                  })()}
                </div>
              }}
            />
            <Area type="natural" dataKey={anno-1} stroke="#CBD5E1" fill="url(#gradPrec)" strokeWidth={2} strokeDasharray="6 4"
              dot={false} activeDot={{r:4,fill:'#94A3B8',stroke:'white',strokeWidth:2}} />
            <Area type="natural" dataKey={anno} stroke="url(#lineGrad)" fill="url(#gradCorr)" strokeWidth={2.5}
              dot={false} activeDot={{r:6,fill:'#3B82F6',stroke:'white',strokeWidth:3,style:{filter:'drop-shadow(0 2px 6px rgba(59,130,246,0.4))'}}} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:mob?12:16}}>
        {perCatAnno.length>0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}>Categorie {anno}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={perCatAnno} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {perCatAnno.map((e,i)=><Cell key={i} fill={catCol(e.name)} />)}
                </Pie>
                <Tooltip formatter={v=>`€ ${v}`} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {perCatAnno.sort((a,b)=>b.value-a.value).map(c=>(
                <div key={c.name} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:catCol(c.name)}} />
                    <span style={{color:t.textSec}}>{c.name}</span>
                  </div>
                  <span style={{fontWeight:600,color:t.text}}>€ {c.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={S.card}>
          <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}>Riepilogo mensile {anno}</h3>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {datiMensili.map((m,i)=>{
              const val = m[anno]
              const maxVal = Math.max(...datiMensili.map(x=>x[anno])) || 1
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,color:t.textSec,minWidth:30}}>{m.name}</span>
                  <div style={{flex:1,height:18,background:t.rowBg,borderRadius:4,overflow:'hidden'}}>
                    <motion.div initial={{width:0}} animate={{width:`${(val/maxVal)*100}%`}} transition={{duration:0.6,delay:i*0.03}}
                      style={{height:'100%',background:val===mesePiuCostoso.val&&val>0?'#EF4444':'#3B82F6',borderRadius:4}} />
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:t.text,minWidth:55,textAlign:'right'}}>€ {val}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bilancio stipendio vs spese */}
      {(() => {
        const stipendi = data.stipendi || []
        const totStipAnno = stipendi.filter(s => s.mese.startsWith(String(anno))).reduce((s,x) => s + x.importo, 0)
        const bilancio = totStipAnno - totCorr
        const accantonamenti = data.accantonamenti || []
        const entrateCorr = getStipendioMese(data, mc())
        const quotaAnnua = accantonamenti.reduce((s, a) => {
          if (a.percentuale && entrateCorr > 0) return s + (entrateCorr * a.percentuale / 100) * 12
          return s + (a.importoManuale || 0) * 12
        }, 0)
        if (totStipAnno <= 0) return null
        return (
          <div style={S.card}>
            <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-scale-balanced' style={{marginRight:6}} />Bilancio annuale {anno}</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:14}}>
              <div style={{padding:12,background:'#3B82F615',borderRadius:10,textAlign:'center'}}>
                <p style={{margin:'0 0 2px',fontSize:11,color:t.textSec}}>Stipendi totali</p>
                <p style={{margin:0,fontSize:20,fontWeight:700,color:'#3B82F6'}}>€ {totStipAnno.toFixed(0)}</p>
              </div>
              <div style={{padding:12,background:'#EF444415',borderRadius:10,textAlign:'center'}}>
                <p style={{margin:'0 0 2px',fontSize:11,color:t.textSec}}>Spese totali</p>
                <p style={{margin:0,fontSize:20,fontWeight:700,color:'#EF4444'}}>€ {totCorr.toFixed(0)}</p>
              </div>
              <div style={{padding:12,background:bilancio>=0?'#10B98115':'#EF444415',borderRadius:10,textAlign:'center'}}>
                <p style={{margin:'0 0 2px',fontSize:11,color:t.textSec}}>Saldo</p>
                <p style={{margin:0,fontSize:20,fontWeight:700,color:bilancio>=0?'#10B981':'#EF4444'}}>{bilancio>=0?'+':''}€ {bilancio.toFixed(0)}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mesiAnno.map((m,i) => {
                const st = stipendi.find(s => s.mese === m)
                return { name:MESI[i], Stipendio:st ? st.importo : 0, Spese:+totMese(data.spese,m).toFixed(0) }
              })} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="name" tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
                <Tooltip formatter={v=>[`€ ${v}`]} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
                <Legend wrapperStyle={{fontSize:12}} />
                <Bar dataKey="Stipendio" fill="#059669" radius={[4,4,0,0]} />
                <Bar dataKey="Spese" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })()}

      {/* Confronto mese su mese */}
      {(()=>{
        const ultMesi = Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return d.toISOString().slice(0,7)})
        const confronti = []
        for(let i=0;i<ultMesi.length-1;i++){
          const curr=ultMesi[i],prev=ultMesi[i+1]
          const tCurr=totMese(data.spese,curr),tPrev=totMese(data.spese,prev)
          if(tCurr===0&&tPrev===0) continue
          const diff=tCurr-tPrev
          const pct=tPrev>0?((diff/tPrev)*100):0
          // Per categoria
          const catDiff=[]
          data.categorieSpese.forEach(cat=>{
            const c=sum(data.spese.filter(s=>s.data?.startsWith(curr)&&s.categoria===cat),s=>+s.importo)
            const p=sum(data.spese.filter(s=>s.data?.startsWith(prev)&&s.categoria===cat),s=>+s.importo)
            if(c>0||p>0) catDiff.push({cat,curr:c,prev:p,diff:c-p,pct:p>0?((c-p)/p*100):c>0?100:0})
          })
          confronti.push({curr,prev,tCurr,tPrev,diff,pct,catDiff:catDiff.sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,5)})
        }
        if(confronti.length===0) return null
        return (
          <div style={S.card}>
            <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}>
              <Fa icon='fa-solid fa-arrows-left-right' style={{marginRight:6}} />Confronto Mese su Mese
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {confronti.slice(0,4).map((c,ci)=>{
                const mCurr=MESI[+c.curr.slice(5,7)-1]
                const mPrev=MESI[+c.prev.slice(5,7)-1]
                const up=c.diff>0
                return (
                  <motion.div key={ci} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:ci*0.1}}
                    style={{padding:14,background:t.rowBg,borderRadius:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <span style={{fontSize:14,fontWeight:600,color:t.text}}>{mCurr} vs {mPrev}</span>
                      <span style={{fontSize:13,fontWeight:700,color:up?'#EF4444':'#10B981',display:'flex',alignItems:'center',gap:4}}>
                        <Fa icon={up?'fa-solid fa-arrow-trend-up':'fa-solid fa-arrow-trend-down'} style={{fontSize:11}} />
                        {up?'+':''}{c.pct.toFixed(0)}% ({up?'+':''}€{c.diff.toFixed(0)})
                      </span>
                    </div>
                    <div style={{display:'flex',gap:8,marginBottom:8}}>
                      <div style={{flex:1,padding:8,background:t.cardBg,borderRadius:8,textAlign:'center'}}>
                        <p style={{margin:0,fontSize:16,fontWeight:700,color:t.text}}>€ {c.tCurr.toFixed(0)}</p>
                        <p style={{margin:0,fontSize:10,color:t.textMut}}>{mCurr}</p>
                      </div>
                      <div style={{flex:1,padding:8,background:t.cardBg,borderRadius:8,textAlign:'center'}}>
                        <p style={{margin:0,fontSize:16,fontWeight:700,color:t.textSec}}>€ {c.tPrev.toFixed(0)}</p>
                        <p style={{margin:0,fontSize:10,color:t.textMut}}>{mPrev}</p>
                      </div>
                    </div>
                    {c.catDiff.length>0 && (
                      <div style={{display:'flex',flexDirection:'column',gap:3}}>
                        <p style={{margin:0,fontSize:10,fontWeight:600,color:t.textMut,textTransform:'uppercase',letterSpacing:0.5}}>Variazioni principali</p>
                        {c.catDiff.map(cd=>(
                          <div key={cd.cat} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{width:6,height:6,borderRadius:'50%',background:catCol(cd.cat)}} />
                              <span style={{color:t.textSec}}>{cd.cat}</span>
                            </div>
                            <span style={{fontWeight:600,color:cd.diff>0?'#EF4444':cd.diff<0?'#10B981':t.textMut}}>
                              {cd.diff>0?'+':''}€ {cd.diff.toFixed(0)} ({cd.pct>0?'+':''}{cd.pct.toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Trend per categoria top 5 */}
      {trendCat.length>0 && (
        <div style={S.card}>
          <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}>
            <Fa icon='fa-solid fa-chart-line' style={{marginRight:6}} />Trend per Categoria
          </h3>
          <ResponsiveContainer width="100%" height={mob?220:280}>
            <LineChart data={mesiAnno.map((m,i)=>{
              const row = {name:MESI[i]}
              trendCat.forEach(tc => { row[tc.cat] = tc.data[i]?.value || 0 })
              return row
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="name" tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:t.textMut}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} formatter={v=>`€ ${v}`} />
              <Legend wrapperStyle={{fontSize:11}} />
              {trendCat.map((tc,i) => (
                <Line key={tc.cat} type="monotone" dataKey={tc.cat} stroke={catCol(tc.cat)} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── CALENDARIO ────────────────────────────────────────────────────────────────
function CalendarioTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [mese, setMese] = useState(new Date().getMonth())
  const [selGiorno, setSelGiorno] = useState(null)
  const [showAddSpesa, setShowAddSpesa] = useState(false)
  const [nuovaSpesa, setNuovaSpesa] = useState({descrizione:'',importo:'',categoria:data.categorieSpese[0]||'Casa'})

  const {days,start} = giorniMese(anno,mese)
  const meseStr = `${anno}-${String(mese+1).padStart(2,'0')}`
  const oggi = new Date().toISOString().slice(0,10)

  const eventiGiorno = (g) => {
    const ds = `${meseStr}-${String(g).padStart(2,'0')}`
    return {
      spese: data.spese.filter(s=>s.data===ds),
      scadenze: data.scadenze.filter(s=>s.data===ds&&!s.gestita),
      attivita: data.attivita.filter(a=>a.data===ds&&!a.completata),
    }
  }

  // Heatmap: calcola massimo spese giornaliere nel mese
  const spesePerGiorno = {}
  for (let d=1;d<=days;d++) { const ds=`${meseStr}-${String(d).padStart(2,'0')}`; spesePerGiorno[d]=sum(data.spese.filter(s=>s.data===ds),s=>+s.importo) }
  const maxSpesa = Math.max(...Object.values(spesePerGiorno), 1)

  const heatColor = (g) => {
    const v = spesePerGiorno[g] || 0
    if (v === 0) return null
    const intensity = Math.min(v/maxSpesa, 1)
    return `rgba(239,68,68,${0.08 + intensity * 0.22})`
  }

  const prev = () => { if(mese===0){setMese(11);setAnno(anno-1)} else setMese(mese-1); setSelGiorno(null) }
  const next = () => { if(mese===11){setMese(0);setAnno(anno+1)} else setMese(mese+1); setSelGiorno(null) }

  const cells = []
  for (let i=0;i<start;i++) cells.push(null)
  for (let d=1;d<=days;d++) cells.push(d)

  const dettagli = selGiorno ? eventiGiorno(selGiorno) : null

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 300px',gap:mob?14:20}}>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <motion.button whileTap={{scale:0.9}} onClick={prev}
            style={{padding:'6px 14px',background:t.tagBg,border:'none',borderRadius:8,cursor:'pointer',fontSize:16,color:t.text}}>←</motion.button>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:t.text}}>{MESI_FULL[mese]} {anno}</h2>
          <motion.button whileTap={{scale:0.9}} onClick={next}
            style={{padding:'6px 14px',background:t.tagBg,border:'none',borderRadius:8,cursor:'pointer',fontSize:16,color:t.text}}>→</motion.button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:mob?1:3}}>
          {GG_SETT.map(g=><div key={g} style={{textAlign:'center',fontWeight:600,fontSize:mob?10:12,color:t.textMut,padding:mob?3:6}}>{mob?g[0]:g}</div>)}
          {cells.map((day,i)=>{
            if (day===null) return <div key={`e${i}`} />
            const ds = `${meseStr}-${String(day).padStart(2,'0')}`
            const {spese,scadenze,attivita} = eventiGiorno(day)
            const isToday = ds===oggi
            const hasSp = spese.length>0
            const hasSc = scadenze.length>0
            const hasAt = attivita.length>0
            const selected = selGiorno===day
            const heat = heatColor(day)
            return (
              <motion.div key={day} whileHover={{scale:1.05}} whileTap={{scale:0.92}}
                onClick={()=>setSelGiorno(day===selGiorno?null:day)}
                style={{
                  textAlign:'center',padding:mob?4:8,borderRadius:mob?6:10,cursor:'pointer',
                  background: selected?'#3B82F6':isToday?'#EFF6FF':heat||t.cardBg,
                  border: isToday&&!selected?'2px solid #3B82F6':`2px solid ${selected?'#3B82F6':'transparent'}`,
                  color: selected?'white':t.text, fontWeight:isToday?700:400, fontSize:14, minHeight:48,
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
                }}>
                <span>{day}</span>
                <div style={{display:'flex',gap:3}}>
                  {hasSp && <div style={{width:5,height:5,borderRadius:'50%',background:selected?'white':'#3B82F6'}} />}
                  {hasSc && <div style={{width:5,height:5,borderRadius:'50%',background:selected?'white':'#F59E0B'}} />}
                  {hasAt && <div style={{width:5,height:5,borderRadius:'50%',background:selected?'white':'#10B981'}} />}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div style={{display:'flex',gap:16,marginTop:14,fontSize:12,color:t.textMut,flexWrap:'wrap'}}>
          <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',background:'#3B82F6'}} /> Spese</span>
          <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',background:'#F59E0B'}} /> Scadenze</span>
          <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',background:'#10B981'}} /> Attività</span>
          <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:8,borderRadius:3,background:'rgba(239,68,68,0.2)'}} /> Heatmap spese</span>
        </div>

        {/* Monthly summary */}
        <div style={{display:'flex',gap:mob?8:14,marginTop:14,flexWrap:'wrap'}}>
          {[
            {label:'Spese',val:`€ ${sum(data.spese.filter(s=>s.data?.startsWith(meseStr)),s=>+s.importo).toFixed(0)}`,color:'#3B82F6'},
            {label:'Scadenze',val:data.scadenze.filter(s=>s.data?.startsWith(meseStr)&&!s.gestita).length,color:'#F59E0B'},
            {label:'Attività',val:data.attivita.filter(a=>a.data?.startsWith(meseStr)&&!a.completata).length,color:'#10B981'},
          ].map(s=>(
            <div key={s.label} style={{fontSize:12,color:s.color,fontWeight:600}}>{s.label}: {s.val}</div>
          ))}
        </div>
      </div>

      <div style={{...S.card,alignSelf:'start'}}>
        {selGiorno ? (
          <>
            <h3 style={{margin:'0 0 12px',fontSize:16,fontWeight:600,color:t.text}}>{selGiorno} {MESI_FULL[mese]}</h3>
            {dettagli.scadenze.length>0 && (
              <div style={{marginBottom:12}}>
                <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#F59E0B'}}><Fa icon='fa-regular fa-calendar-check' style={{marginRight:4}} />Scadenze</p>
                {dettagli.scadenze.map(s=>(
                  <div key={s.id} style={{padding:'6px 8px',background:'#F59E0B15',borderRadius:8,marginBottom:4,fontSize:13,color:t.text}}>{s.nome}</div>
                ))}
              </div>
            )}
            {dettagli.attivita?.length>0 && (
              <div style={{marginBottom:12}}>
                <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#10B981'}}><Fa icon='fa-solid fa-list-check' style={{marginRight:4}} />Attività</p>
                {dettagli.attivita.map(a=>(
                  <div key={a.id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',background:'#10B98115',borderRadius:8,marginBottom:4,fontSize:13,color:t.text}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:({Alta:'#EF4444',Media:'#F59E0B',Bassa:'#10B981'})[a.priorita]||'#94A3B8'}} />
                    {a.testo}
                  </div>
                ))}
              </div>
            )}
            {dettagli.spese.length>0 && (
              <div>
                <p style={{margin:'0 0 6px',fontSize:12,fontWeight:600,color:'#3B82F6'}}><Fa icon='fa-solid fa-wallet' style={{marginRight:4}} />Spese</p>
                {dettagli.spese.map(s=>(
                  <div key={s.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 8px',background:'#3B82F615',borderRadius:8,marginBottom:4,fontSize:13}}>
                    <span style={{color:t.text}}>{s.descrizione}</span>
                    <span style={{fontWeight:600,color:t.text}}>€ {(+s.importo).toFixed(2)}</span>
                  </div>
                ))}
                <p style={{margin:'6px 0 0',fontSize:12,fontWeight:600,color:'#3B82F6'}}>
                  Totale: € {sum(dettagli.spese,s=>+s.importo).toFixed(2)}
                </p>
              </div>
            )}
            {dettagli.spese.length===0&&dettagli.scadenze.length===0&&(!dettagli.attivita||dettagli.attivita.length===0) && (
              <p style={{color:t.textMut,fontSize:14}}>Nessun evento</p>
            )}

            {/* Quick add spesa from calendar */}
            {!showAddSpesa ? (
              <motion.button whileTap={{scale:0.95}} onClick={()=>setShowAddSpesa(true)}
                style={{width:'100%',marginTop:14,padding:'10px',background:'#3B82F612',border:`1px dashed #3B82F6`,borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:600,color:'#3B82F6'}}>
                + Aggiungi spesa al {selGiorno} {MESI_FULL[mese]}
              </motion.button>
            ) : (
              <div style={{marginTop:14,padding:12,background:t.rowBg,borderRadius:10}}>
                <p style={{margin:'0 0 8px',fontSize:13,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-wallet' style={{marginRight:4}} />Nuova spesa — {selGiorno} {MESI_FULL[mese]}</p>
                <Inp value={nuovaSpesa.descrizione} onChange={e=>setNuovaSpesa({...nuovaSpesa,descrizione:e.target.value})} placeholder="Descrizione" style={{marginBottom:6}} />
                <Inp type="number" value={nuovaSpesa.importo} onChange={e=>setNuovaSpesa({...nuovaSpesa,importo:e.target.value})} placeholder="Importo €" style={{marginBottom:6}} />
                <Sel value={nuovaSpesa.categoria} onChange={e=>setNuovaSpesa({...nuovaSpesa,categoria:e.target.value})} style={{...S.inputFull,marginBottom:8}}
                  options={data.categorieSpese.map(c=>({value:c,label:c}))} />
                <div style={{display:'flex',gap:6}}>
                  <motion.button whileTap={{scale:0.95}} onClick={()=>{
                    if(!nuovaSpesa.descrizione.trim()||!nuovaSpesa.importo||+nuovaSpesa.importo<=0) { toast('Compila descrizione e importo'); return }
                    const ds = `${meseStr}-${String(selGiorno).padStart(2,'0')}`
                    updateData('spese',[...data.spese,{id:Date.now(),descrizione:nuovaSpesa.descrizione,importo:+nuovaSpesa.importo,categoria:nuovaSpesa.categoria,data:ds,ricorrente:false,pagatoDa:'',condivisa:false}])
                    setNuovaSpesa({descrizione:'',importo:'',categoria:data.categorieSpese[0]||'Casa'})
                    setShowAddSpesa(false); toast('Spesa aggiunta dal calendario')
                  }} style={{flex:1,padding:'8px',background:'#3B82F6',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                    Salva
                  </motion.button>
                  <motion.button whileTap={{scale:0.95}} onClick={()=>setShowAddSpesa(false)}
                    style={{padding:'8px 12px',background:t.tagBg,border:'none',borderRadius:8,fontSize:13,cursor:'pointer',color:t.textSec}}>
                    Annulla
                  </motion.button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{textAlign:'center',padding:20}}>
            <p style={{fontSize:32,margin:'0 0 8px'}}><Fa icon='fa-regular fa-calendar' style={{fontSize:32}} /></p>
            <p style={{color:t.textMut,fontSize:14}}>Seleziona un giorno</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── NOTE ──────────────────────────────────────────────────────────────────────
function NoteTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [testo, setTesto]   = useState('')
  const [colore, setColore] = useState(NOTE_COLORI[0])
  const [editId, setEditId] = useState(null)
  const [editTesto, setEditTesto] = useState('')

  const aggiungi = () => {
    if (!testo.trim()) return
    updateData('note', [...data.note, { id:Date.now(), testo, colore, creatoIl:new Date().toISOString().slice(0,10) }])
    setTesto(''); toast('Nota aggiunta')
  }

  const rimuovi = (id) => { if(!confirm('Eliminare questa nota?')) return; updateData('note', data.note.filter(n=>n.id!==id)); toast('Nota eliminata') }

  const salvaEdit = (id) => {
    updateData('note', data.note.map(n=>n.id===id?{...n,testo:editTesto}:n))
    setEditId(null); toast('Nota aggiornata')
  }

  return (
    <div>
      <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-regular fa-note-sticky' style={{marginRight:6}} />Note & Appunti</h2>

      <div style={{...S.card,marginBottom:16}}>
        <Txa value={testo} onChange={e=>setTesto(e.target.value)} placeholder="Scrivi un appunto... (es. chiamare idraulico, codice WiFi, ecc.)"
          style={{minHeight:80}} />
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
          <div style={{display:'flex',gap:6}}>
            {NOTE_COLORI.map(c=>(
              <motion.div key={c} whileTap={{scale:0.8}} onClick={()=>setColore(c)}
                style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border:colore===c?'3px solid #3B82F6':'3px solid transparent'}} />
            ))}
          </div>
          <motion.button whileTap={{scale:0.95}} onClick={aggiungi}
            style={{padding:'8px 20px',background:'#F97316',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            + Aggiungi
          </motion.button>
        </div>
      </div>

      {data.note.length===0
        ? <p style={{color:t.textMut,fontSize:14,textAlign:'center',marginTop:40}}>Nessun appunto ancora. Scrivi qualcosa! </p>
        : <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            <AnimatePresence>
              {[...data.note].reverse().map(n=>(
                <motion.div key={n.id} layout initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
                  style={{background:n.colore||NOTE_COLORI[0],borderRadius:14,padding:16,position:'relative',minHeight:100}}>
                  {editId===n.id ? (
                    <>
                      <Txa value={editTesto} onChange={e=>setEditTesto(e.target.value)}
                        style={{minHeight:60,border:'none',background:'rgba(255,255,255,0.5)',borderRadius:8,padding:8,color:'#1E293B'}} />
                      <div style={{display:'flex',gap:6,marginTop:8}}>
                        <button onClick={()=>salvaEdit(n.id)} style={{padding:'4px 12px',background:'#10B981',color:'white',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>Salva</button>
                        <button onClick={()=>setEditId(null)} style={{padding:'4px 12px',background:'#94A3B8',color:'white',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>Annulla</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{margin:'0 0 10px',fontSize:14,color:'#1E293B',whiteSpace:'pre-wrap',lineHeight:1.5}}>{n.testo}</p>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:11,color:'#64748B'}}>{n.creatoIl}</span>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setEditId(n.id);setEditTesto(n.testo)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:14}}><Fa icon='fa-solid fa-pen' /></button>
                          <button onClick={()=>rimuovi(n.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:14}}><Fa icon='fa-regular fa-trash-can' />️</button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
      }
    </div>
  )
}

// ── CONTATTI ──────────────────────────────────────────────────────────────────
function ContattiTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm] = useState({ nome:'', ruolo:RUOLI_CONTATTI[0], telefono:'', note:'' })
  const [errors, setErrors] = useState({})
  const [editId, setEditId] = useState(null)
  const formDefault = { nome:'', ruolo:RUOLI_CONTATTI[0], telefono:'', note:'' }

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome='Inserisci un nome'
    if (!form.telefono.trim()) e.telefono='Inserisci un telefono'
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    if (editId) {
      updateData('contatti', data.contatti.map(c=>c.id===editId?{...c, nome:form.nome.trim(), ruolo:form.ruolo, telefono:form.telefono.trim(), note:form.note}:c))
      toast('Contatto aggiornato')
    } else {
      updateData('contatti', [...data.contatti, {...form,id:Date.now()}])
      toast('Contatto aggiunto')
    }
    setForm(formDefault); setEditId(null); setErrors({})
  }

  const startEdit = (c) => {
    setForm({ nome:c.nome, ruolo:c.ruolo||RUOLI_CONTATTI[0], telefono:c.telefono, note:c.note||'' })
    setEditId(c.id)
  }
  const cancelEdit = () => { setForm(formDefault); setEditId(null); setErrors({}) }

  const rimuovi = (id) => { if(!confirm('Eliminare questo contatto?')) return; updateData('contatti', data.contatti.filter(c=>c.id!==id)); toast('Contatto eliminato') }

  const ruoloEmoji = {Idraulico:<Fa icon='fa-solid fa-wrench' />,Elettricista:<Fa icon='fa-solid fa-bolt' />,Medico:<Fa icon='fa-solid fa-stethoscope' />,Veterinario:<Fa icon='fa-solid fa-paw' />,Giardiniere:<Fa icon='fa-solid fa-leaf' />,Amministratore:<Fa icon='fa-solid fa-building' />,Altro:<Fa icon='fa-solid fa-phone' />}

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 300px',gap:mob?14:20}}>
      <div style={S.card}>
        <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-address-book' style={{marginRight:6}} />Contatti utili</h2>
        {data.contatti.length===0
          ? <p style={{color:t.textMut,fontSize:14}}>Nessun contatto. Aggiungi idraulico, elettricista, medico...</p>
          : <AnimatePresence mode="popLayout">
              {data.contatti.map(c=>(
                <motion.div key={c.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                  style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:t.rowBg,borderRadius:12,marginBottom:8}}>
                  <div style={{width:42,height:42,borderRadius:10,background:'#3B82F615',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,color:'#3B82F6'}}>
                    {ruoloEmoji[c.ruolo]||<Fa icon='fa-solid fa-phone' />}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>{c.nome}</p>
                    <p style={{margin:'2px 0 0',fontSize:12,color:t.textSec}}>{c.ruolo} · <a href={`tel:${c.telefono}`} style={{color:'#3B82F6',textDecoration:'none'}}>{c.telefono}</a></p>
                    {c.note && <p style={{margin:'2px 0 0',fontSize:11,color:t.textMut}}>{c.note}</p>}
                  </div>
                  <motion.button whileTap={{scale:0.85}} onClick={()=>startEdit(c)}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:14,padding:'0 2px'}}><Fa icon='fa-solid fa-pen' /></motion.button>
                  <motion.button whileTap={{scale:0.85}} onClick={()=>rimuovi(c.id)}
                    style={{background:'none',border:'none',cursor:'pointer',color:t.textMut,fontSize:18}}>×</motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
        }
      </div>

      <div style={{...S.card,alignSelf:'start'}}>
        <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>{editId ? 'Modifica contatto' : '+ Nuovo contatto'}</h3>
        <FormField label="Nome" error={errors.nome}>
          <Inp value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="es. Mario Rossi" onKeyDown={e=>e.key==='Enter'&&aggiungi()} />
        </FormField>
        <FormField label="Ruolo">
          <Sel value={form.ruolo} onChange={e=>setForm({...form,ruolo:e.target.value})} style={S.inputFull}
            options={RUOLI_CONTATTI.map(r=>({value:r,label:r}))} />
        </FormField>
        <FormField label="Telefono" error={errors.telefono}>
          <Inp value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="es. 333 1234567" />
        </FormField>
        <FormField label="Note">
          <Inp value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale" />
        </FormField>
        <div style={{display:'flex',gap:8}}>
          <motion.button whileTap={{scale:0.97}} onClick={aggiungi} style={{...S.btn('#06B6D4'),flex:1}}>{editId ? 'Aggiorna' : 'Aggiungi contatto'}</motion.button>
          {editId && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
        </div>
      </div>
    </div>
  )
}

// ── INVENTARIO ────────────────────────────────────────────────────────────────
function InventarioTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm] = useState({ nome:'', stanza:STANZE[0], dataAcquisto:'', scadenzaGaranzia:'', note:'' })
  const [errors, setErrors] = useState({})
  const [filtroStanza, setFiltroStanza] = useState('Tutte')
  const [editId, setEditId] = useState(null)
  const formDefault = { nome:'', stanza:STANZE[0], dataAcquisto:'', scadenzaGaranzia:'', note:'' }

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome='Inserisci un nome'
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    if (editId) {
      updateData('inventario', data.inventario.map(x=>x.id===editId?{...x, nome:form.nome.trim(), stanza:form.stanza, dataAcquisto:form.dataAcquisto, scadenzaGaranzia:form.scadenzaGaranzia, note:form.note}:x))
      toast('Oggetto aggiornato')
    } else {
      updateData('inventario', [...data.inventario, {...form,id:Date.now()}])
      toast('Oggetto aggiunto')
    }
    setForm(formDefault); setEditId(null); setErrors({})
  }

  const startEdit = (x) => {
    setForm({ nome:x.nome, stanza:x.stanza||STANZE[0], dataAcquisto:x.dataAcquisto||'', scadenzaGaranzia:x.scadenzaGaranzia||'', note:x.note||'' })
    setEditId(x.id)
  }
  const cancelEdit = () => { setForm(formDefault); setEditId(null); setErrors({}) }

  const rimuovi = (id) => { if(!confirm('Eliminare questo oggetto?')) return; updateData('inventario', data.inventario.filter(x=>x.id!==id)); toast('Oggetto eliminato') }

  let lista = data.inventario
  if (filtroStanza!=='Tutte') lista = lista.filter(x=>x.stanza===filtroStanza)

  const garantieInScadenza = data.inventario.filter(x=>{
    if (!x.scadenzaGaranzia) return false
    const gg = Math.ceil((new Date(x.scadenzaGaranzia)-new Date())/864e5)
    return gg>=0&&gg<=90
  }).length

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 300px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {garantieInScadenza>0 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            style={{background:'#F59E0B15',border:`1px solid ${t.border}`,borderRadius:12,padding:'11px 16px',color:'#D97706',fontSize:14,fontWeight:500}}>
            <Fa icon='fa-solid fa-triangle-exclamation' /> {garantieInScadenza} garanzi{garantieInScadenza===1?'a':'e'} in scadenza entro 90 giorni
          </motion.div>
        )}

        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-box-open' style={{marginRight:6}} />Inventario casa</h2>
            <Sel value={filtroStanza} onChange={e=>setFiltroStanza(e.target.value)} style={{...S.input,fontSize:12}}
              options={[{value:'Tutte',label:'Tutte le stanze'},...STANZE.map(s=>({value:s,label:s}))]} />
          </div>

          {lista.length===0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessun oggetto. Inizia ad aggiungere!</p>
            : <AnimatePresence mode="popLayout">
                {lista.map(x=>{
                  const garScad = x.scadenzaGaranzia ? Math.ceil((new Date(x.scadenzaGaranzia)-new Date())/864e5) : null
                  const garColor = garScad!==null ? (garScad<0?'#EF4444':garScad<=90?'#F59E0B':'#10B981') : null
                  return (
                    <motion.div key={x.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                      style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:t.rowBg,borderRadius:12,marginBottom:8}}>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>{x.nome}</p>
                        <div style={{display:'flex',gap:6,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                          <span style={{fontSize:11,background:t.tagBg,color:t.tagText,padding:'1px 6px',borderRadius:6}}>{x.stanza}</span>
                          {x.dataAcquisto && <span style={{fontSize:11,color:t.textMut}}><Fa icon='fa-solid fa-cart-shopping' style={{marginRight:3}} />{new Date(x.dataAcquisto).toLocaleDateString('it-IT')}</span>}
                          {x.scadenzaGaranzia && <span style={{fontSize:11,color:garColor,fontWeight:600}}><Fa icon='fa-solid fa-shield-halved' style={{marginRight:3}} />{garScad<0?'Scaduta':`${garScad}g`}</span>}
                        </div>
                        {x.note && <p style={{margin:'3px 0 0',fontSize:11,color:t.textMut}}>{x.note}</p>}
                      </div>
                      <motion.button whileTap={{scale:0.85}} onClick={()=>startEdit(x)}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:14,padding:'0 2px'}}><Fa icon='fa-solid fa-pen' /></motion.button>
                      <motion.button whileTap={{scale:0.85}} onClick={()=>rimuovi(x.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:t.textMut,fontSize:18}}>×</motion.button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
          }
        </div>
      </div>

      <div style={{...S.card,alignSelf:'start'}}>
        <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>{editId ? 'Modifica oggetto' : '+ Nuovo oggetto'}</h3>
        <FormField label="Nome oggetto" error={errors.nome}>
          <Inp value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="es. Lavatrice" onKeyDown={e=>e.key==='Enter'&&aggiungi()} />
        </FormField>
        <FormField label="Stanza">
          <Sel value={form.stanza} onChange={e=>setForm({...form,stanza:e.target.value})} style={S.inputFull}
            options={STANZE.map(s=>({value:s,label:s}))} />
        </FormField>
        <FormField label="Data acquisto">
          <DatePick value={form.dataAcquisto} onChange={e=>setForm({...form,dataAcquisto:e.target.value})} style={S.inputFull} />
        </FormField>
        <FormField label="Scadenza garanzia">
          <DatePick value={form.scadenzaGaranzia} onChange={e=>setForm({...form,scadenzaGaranzia:e.target.value})} style={S.inputFull} />
        </FormField>
        <FormField label="Note">
          <Inp value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale" />
        </FormField>
        <div style={{display:'flex',gap:8}}>
          <motion.button whileTap={{scale:0.97}} onClick={aggiungi} style={{...S.btn('#8B5CF6'),flex:1}}>{editId ? 'Aggiorna' : 'Aggiungi oggetto'}</motion.button>
          {editId && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
        </div>
      </div>
    </div>
  )
}

// ── STIPENDIO ─────────────────────────────────────────────────────────────────
function StipendioTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm] = useState({ importo:'', mese:mc(), note:'', conto:'' })
  const [errors, setErrors] = useState({})
  const [editId, setEditId] = useState(null)
  const formDefault = { importo:'', mese:mc(), note:'', conto:'' }

  const stipendi = data.stipendi || []
  const meseCorrente = mc()

  const validate = () => {
    const e = {}
    if (!form.importo || +form.importo <= 0) e.importo = 'Importo non valido'
    if (!form.mese) e.mese = 'Seleziona un mese'
    const duplicato = stipendi.find(s => s.mese === form.mese && s.id !== editId)
    if (duplicato) e.mese = 'Mese già registrato'
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    if (editId) {
      const nuovi = stipendi.map(s => s.id === editId ? { ...s, importo:+form.importo, mese:form.mese, note:form.note.trim(), conto:form.conto||undefined } : s)
      updateData('stipendi', nuovi.sort((a,b) => b.mese.localeCompare(a.mese)))
      toast('Stipendio aggiornato')
    } else {
      const nuovoStipendio = { id:Date.now(), importo:+form.importo, mese:form.mese, note:form.note.trim(), data:new Date().toISOString().slice(0,10), conto:form.conto||undefined }
      const nuovi = [...stipendi, nuovoStipendio].sort((a,b) => b.mese.localeCompare(a.mese))
      updateData('stipendi', nuovi)
      updateData('entrateMensili', +form.importo)
      toast('Stipendio registrato')
    }
    setEditId(null); setForm(formDefault); setErrors({})
  }

  const rimuovi = (id) => {
    const nuovi = stipendi.filter(s => s.id !== id)
    updateData('stipendi', nuovi)
    if (nuovi.length > 0) {
      const ultimo = [...nuovi].sort((a,b) => b.mese.localeCompare(a.mese))[0]
      updateData('entrateMensili', ultimo.importo)
    }
  }

  const startEdit = (s) => {
    setEditId(s.id)
    setForm({ importo:String(s.importo), mese:s.mese, note:s.note||'', conto:s.conto||'' })
    setErrors({})
  }

  const cancelEdit = () => { setEditId(null); setForm(formDefault); setErrors({}) }

  // statistiche
  const stipMeseCorr = stipendi.find(s => s.mese === meseCorrente)
  const totAnnoCorr = stipendi.filter(s => s.mese.startsWith(String(new Date().getFullYear()))).reduce((s,x) => s + x.importo, 0)
  const media = stipendi.length > 0 ? stipendi.reduce((s,x) => s + x.importo, 0) / stipendi.length : 0
  const entrate = getStipendioMese(data, meseCorrente)
  const speseMese = totMese(data.spese, meseCorrente)
  const risparmio = entrate - speseMese

  // dati grafico ultimi 12 mesi
  const ultimi12M = ultimi12()
  const chartData = ultimi12M.map(m => {
    const st = stipendi.find(s => s.mese === m)
    const sp = totMese(data.spese, m)
    return { name:MESI[+m.slice(5,7)-1], Stipendio:st ? st.importo : 0, Spese:+sp.toFixed(0) }
  })

  // accantonamenti info
  const accantonamenti = data.accantonamenti || []
  const quotaAccant = accantonamenti.reduce((s, a) => {
    if (a.percentuale && entrate > 0) return s + (entrate * a.percentuale / 100)
    return s + (a.importoManuale || 0)
  }, 0)

  const lista = [...stipendi].sort((a,b) => b.mese.localeCompare(a.mese))

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 340px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {/* Riepilogo */}
        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-briefcase' style={{marginRight:6}} />Stipendio</h2>
          <div style={{display:'flex',gap:mob?8:12,marginBottom:14,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:mob?100:140,background:'#3B82F615',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Mese corrente</p>
              <p style={{margin:0,fontSize:mob?18:24,fontWeight:700,color:'#3B82F6'}}>
                {stipMeseCorr ? `€ ${stipMeseCorr.importo.toFixed(2)}` : '—'}
              </p>
              <p style={{margin:'2px 0 0',fontSize:11,color:t.textMut}}>{MESI_FULL[new Date().getMonth()]} {new Date().getFullYear()}</p>
            </div>
            <div style={{flex:1,minWidth:mob?100:140,background:'#10B98115',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Totale anno</p>
              <p style={{margin:0,fontSize:mob?18:24,fontWeight:700,color:'#10B981'}}>€ {totAnnoCorr.toFixed(2)}</p>
            </div>
            <div style={{flex:1,minWidth:mob?100:140,background:'#F59E0B15',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Media mensile</p>
              <p style={{margin:0,fontSize:mob?18:24,fontWeight:700,color:'#F59E0B'}}>€ {media.toFixed(2)}</p>
            </div>
          </div>

          {/* Bilancio mese corrente */}
          {(stipMeseCorr || entrate > 0) && (
            <div style={{padding:14,background:t.rowBg,borderRadius:12,marginBottom:10}}>
              <h4 style={{margin:'0 0 10px',fontSize:14,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-chart-bar' style={{marginRight:6}} />Bilancio {MESI_FULL[new Date().getMonth()]}</h4>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{color:t.textSec}}>Stipendio versato</span>
                  <span style={{fontWeight:600,color:'#3B82F6'}}>€ {entrate.toFixed(2)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{color:t.textSec}}>Spese del mese</span>
                  <span style={{fontWeight:600,color:'#EF4444'}}>- € {speseMese.toFixed(2)}</span>
                </div>
                {quotaAccant > 0 && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                    <span style={{color:t.textSec}}>Accantonamenti</span>
                    <span style={{fontWeight:600,color:'#F59E0B'}}>- € {quotaAccant.toFixed(2)}</span>
                  </div>
                )}
                <div style={{borderTop:`1px solid ${t.border}`,paddingTop:6,marginTop:2,display:'flex',justifyContent:'space-between',fontSize:14}}>
                  <span style={{fontWeight:600,color:t.text}}>Disponibile</span>
                  <span style={{fontWeight:700,color:(risparmio - quotaAccant) >= 0 ? '#10B981' : '#EF4444'}}>
                    € {(risparmio - quotaAccant).toFixed(2)}
                  </span>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <ProgBar pct={Math.min(100, (speseMese / (entrate || 1)) * 100)}
                  color={speseMese > entrate ? '#EF4444' : '#10B981'} />
                <p style={{margin:'4px 0 0',fontSize:11,color:t.textMut}}>
                  Speso {((speseMese / (entrate || 1)) * 100).toFixed(0)}% dello stipendio
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Grafico confronto */}
        {stipendi.length > 0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-chart-line' style={{marginRight:6}} />Stipendio vs Spese (ultimi 12 mesi)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="name" tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:t.textMut}} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`€ ${v}`]} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
                <Legend wrapperStyle={{fontSize:12}} />
                <Bar dataKey="Stipendio" fill="#3B82F6" radius={[5,5,0,0]} />
                <Bar dataKey="Spese" fill="#EF4444" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Storico */}
        <div style={S.card}>
          <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-clipboard-list' style={{marginRight:6}} />Storico versamenti</h3>
          {lista.length === 0
            ? <p style={{color:t.textMut,fontSize:14}}>Nessun versamento registrato</p>
            : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {lista.map(s => {
                  const spMese = totMese(data.spese, s.mese)
                  const diff = s.importo - spMese
                  const mIdx = +s.mese.slice(5,7) - 1
                  return (
                    <motion.div key={s.id} layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:t.rowBg,borderRadius:10}}>
                      <div style={{width:40,height:40,borderRadius:10,background:'#3B82F615',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span style={{fontSize:12,fontWeight:700,color:'#3B82F6'}}>{MESI[mIdx]}</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:15,fontWeight:700,color:t.text}}>€ {s.importo.toFixed(2)}</span>
                          <span style={{fontSize:12,fontWeight:600,color:diff >= 0 ? '#10B981' : '#EF4444'}}>
                            {diff >= 0 ? '+' : ''}€ {diff.toFixed(2)}
                          </span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
                          <span style={{fontSize:11,color:t.textMut}}>
                            {MESI_FULL[mIdx]} {s.mese.slice(0,4)}
                            {s.note && ` · ${s.note}`}
                          </span>
                          <span style={{fontSize:10,color:t.textMut}}>Spese: € {spMese.toFixed(2)}</span>
                        </div>
                      </div>
                      <motion.button whileTap={{scale:0.85}} onClick={() => startEdit(s)}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:14,padding:'0 2px'}}><Fa icon='fa-solid fa-pen' /></motion.button>
                      <motion.button whileHover={{scale:1.2}} whileTap={{scale:0.75}} onClick={() => rimuovi(s.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:18,padding:'0 2px',lineHeight:1}}>×</motion.button>
                    </motion.div>
                  )
                })}
              </div>
          }
        </div>
      </div>

      {/* Form laterale */}
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>{editId ? 'Modifica versamento' : '+ Registra versamento'}</h3>
          <FormField label="Importo versato (€)" error={errors.importo}>
            <Inp type="number" value={form.importo} onChange={e => setForm({...form, importo:e.target.value})}
              placeholder="es. 1500" onKeyDown={e => e.key === 'Enter' && aggiungi()} />
          </FormField>
          <FormField label="Mese di riferimento" error={errors.mese}>
            <MonthPick value={form.mese} onChange={e => setForm({...form, mese:e.target.value})} style={S.inputFull} />
          </FormField>
          <FormField label="Note (opzionale)">
            <Inp value={form.note} onChange={e => setForm({...form, note:e.target.value})}
              placeholder="es. Tredicesima, straordinari..." />
          </FormField>
          {(data.conti||[]).length>1 && (
            <FormField label="Conto">
              <Sel value={form.conto} onChange={e=>setForm({...form,conto:e.target.value})} style={S.inputFull}
                options={[{value:'',label:'\u2014 tutti \u2014'},...(data.conti||[]).map(c=>({value:c.nome,label:c.nome}))]} />
            </FormField>
          )}
          <div style={{display:'flex',gap:8}}>
            <motion.button whileTap={{scale:0.97}} onClick={aggiungi} style={{...S.btn('#3B82F6'),flex:1}}>{editId ? 'Aggiorna' : 'Registra versamento'}</motion.button>
            {editId && <motion.button whileTap={{scale:0.97}} onClick={cancelEdit} style={{...S.btn('#6B7280'),flex:'none',padding:'12px 16px'}}>Annulla</motion.button>}
          </div>
        </div>

        {/* Riepilogo distribuzione */}
        {entrate > 0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-chart-pie' style={{marginRight:6}} />Distribuzione stipendio</h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(() => {
                const budget = data.budget || 0
                const voci = [
                  { label:'Budget spese', val:budget, col:'#3B82F6', emoji:<Fa icon='fa-solid fa-cart-shopping' /> },
                  { label:'Accantonamenti', val:quotaAccant, col:'#F59E0B', emoji:<Fa icon='fa-solid fa-piggy-bank' /> },
                  { label:'Risparmio libero', val:Math.max(0, entrate - budget - quotaAccant), col:'#10B981', emoji:<Fa icon='fa-solid fa-money-bills' /> },
                ]
                return voci.map(v => (
                  <div key={v.label}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <span style={{fontSize:13,color:t.textSec}}>{v.emoji} {v.label}</span>
                      <span style={{fontSize:13,fontWeight:600,color:v.col}}>€ {v.val.toFixed(2)}</span>
                    </div>
                    <ProgBar pct={entrate > 0 ? (v.val / entrate) * 100 : 0} color={v.col} />
                    <p style={{margin:'2px 0 8px',fontSize:10,color:t.textMut}}>{entrate > 0 ? ((v.val / entrate) * 100).toFixed(1) : 0}% dello stipendio</p>
                  </div>
                ))
              })()}
            </div>
            {entrate - (data.budget || 0) - quotaAccant < 0 && (
              <div style={{padding:8,background:'#EF444415',borderRadius:8,marginTop:4}}>
                <p style={{margin:0,fontSize:12,color:'#EF4444',fontWeight:500}}><Fa icon='fa-solid fa-triangle-exclamation' /> Budget + accantonamenti superano lo stipendio di € {Math.abs(entrate - (data.budget || 0) - quotaAccant).toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ACCANTONAMENTI ────────────────────────────────────────────────────────────
function AccantonamentiTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [form, setForm] = useState({ nome:'', tipo:TIPI_ACCANTONAMENTO[0], percentuale:'', importoManuale:'', obiettivo:'' })
  const [errors, setErrors] = useState({})
  const [editId, setEditId] = useState(null)
  const [versaId, setVersaId] = useState(null)
  const [versaImporto, setVersaImporto] = useState('')

  const entrate = getStipendioMese(data, mc())
  const accantonamenti = data.accantonamenti || []
  const totPerc = accantonamenti.reduce((s, a) => s + (a.percentuale || 0), 0)

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Inserisci un nome'
    if (!form.obiettivo || +form.obiettivo <= 0) e.obiettivo = 'Obiettivo non valido'
    if (!form.percentuale && !form.importoManuale) e.percentuale = 'Imposta % o importo'
    if (form.percentuale && (+form.percentuale <= 0 || +form.percentuale > 100)) e.percentuale = '% non valida'
    if (form.importoManuale && +form.importoManuale <= 0) e.importoManuale = 'Importo non valido'
    if (form.percentuale) {
      const percAltri = editId ? accantonamenti.filter(a => a.id !== editId).reduce((s, a) => s + (a.percentuale || 0), 0) : totPerc
      const nuovaTot = percAltri + +form.percentuale
      if (nuovaTot > 100) e.percentuale = `Max disponibile: ${(100 - percAltri).toFixed(1)}%`
    }
    setErrors(e); return !Object.keys(e).length
  }

  const aggiungi = () => {
    if (!validate()) return
    if (editId) {
      updateData('accantonamenti', accantonamenti.map(a => a.id === editId ? {
        ...a,
        nome: form.nome.trim(),
        tipo: form.tipo,
        percentuale: +form.percentuale || 0,
        importoManuale: +form.importoManuale || 0,
        obiettivo: +form.obiettivo,
      } : a))
      toast('Fondo aggiornato')
    } else {
      const nuovo = {
        id: Date.now(),
        nome: form.nome.trim(),
        tipo: form.tipo,
        percentuale: +form.percentuale || 0,
        importoManuale: +form.importoManuale || 0,
        accantonato: 0,
        obiettivo: +form.obiettivo,
      }
      updateData('accantonamenti', [...accantonamenti, nuovo])
      toast('Fondo creato')
    }
    setForm({ nome:'', tipo:TIPI_ACCANTONAMENTO[0], percentuale:'', importoManuale:'', obiettivo:'' })
    setEditId(null); setErrors({})
  }

  const rimuovi = (id) => { if(!confirm('Eliminare questo fondo?')) return; updateData('accantonamenti', accantonamenti.filter(a => a.id !== id)); toast('Fondo eliminato') }

  const versamento = (id) => {
    const imp = +versaImporto
    if (!imp || imp <= 0) return
    const fondo = accantonamenti.find(a => a.id === id)
    const nuovoTot = (fondo?.accantonato || 0) + imp
    if (fondo && nuovoTot > fondo.obiettivo) {
      const max = fondo.obiettivo - (fondo.accantonato || 0)
      if (max <= 0) return
      updateData('accantonamenti', accantonamenti.map(a => a.id === id ? { ...a, accantonato: fondo.obiettivo } : a))
    } else {
      updateData('accantonamenti', accantonamenti.map(a => a.id === id ? { ...a, accantonato: nuovoTot } : a))
    }
    setVersaId(null); setVersaImporto('')
  }

  const startEdit = (a) => {
    setForm({ nome: a.nome, tipo: a.tipo, percentuale: a.percentuale || '', importoManuale: a.importoManuale || '', obiettivo: a.obiettivo })
    setEditId(a.id)
  }

  const cancelEdit = () => {
    setForm({ nome:'', tipo:TIPI_ACCANTONAMENTO[0], percentuale:'', importoManuale:'', obiettivo:'' })
    setEditId(null); setErrors({})
  }

  const emojiTipo = { Vacanza:<Fa icon='fa-solid fa-umbrella-beach' />, Auto:<Fa icon='fa-solid fa-car' />, Casa:<Fa icon='fa-solid fa-house' />, Viaggi:<Fa icon='fa-solid fa-plane' />, Emergenze:<Fa icon='fa-solid fa-triangle-exclamation' />, Altro:<Fa icon='fa-solid fa-bookmark' /> }
  const colTipo = { Vacanza:'#F59E0B', Auto:'#3B82F6', Casa:'#10B981', Viaggi:'#8B5CF6', Emergenze:'#EF4444', Altro:'#6B7280' }

  const totAccantonato = accantonamenti.reduce((s, a) => s + (a.accantonato || 0), 0)
  const totObiettivo = accantonamenti.reduce((s, a) => s + (a.obiettivo || 0), 0)
  const quotaMensile = accantonamenti.reduce((s, a) => {
    if (a.percentuale && entrate > 0) return s + (entrate * a.percentuale / 100)
    return s + (a.importoManuale || 0)
  }, 0)

  return (
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'minmax(0,1fr) 340px',gap:mob?14:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {/* Riepilogo */}
        <div style={S.card}>
          <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-piggy-bank' style={{marginRight:6}} />Piano di Accantonamento</h2>
          <div style={{display:'flex',gap:mob?8:12,marginBottom:14,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:mob?100:140,background:'#3B82F615',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Totale accantonato</p>
              <p style={{margin:0,fontSize:mob?18:24,fontWeight:700,color:'#3B82F6'}}>€ {totAccantonato.toFixed(2)}</p>
            </div>
            <div style={{flex:1,minWidth:mob?100:140,background:'#10B98115',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Obiettivo totale</p>
              <p style={{margin:0,fontSize:mob?18:24,fontWeight:700,color:'#10B981'}}>€ {totObiettivo.toFixed(2)}</p>
            </div>
            <div style={{flex:1,minWidth:mob?100:140,background:'#F59E0B15',borderRadius:12,padding:mob?10:14,textAlign:'center'}}>
              <p style={{margin:'0 0 2px',fontSize:12,color:t.textSec}}>Quota mensile</p>
              <p style={{margin:0,fontSize:mob?18:24,fontWeight:700,color:'#F59E0B'}}>€ {quotaMensile.toFixed(2)}</p>
            </div>
          </div>
          {totObiettivo > 0 && (
            <div>
              <ProgBar pct={(totAccantonato / totObiettivo) * 100} color="#3B82F6" />
              <p style={{margin:'4px 0 0',fontSize:11,color:t.textMut}}>Progresso globale: {((totAccantonato / totObiettivo) * 100).toFixed(1)}%</p>
            </div>
          )}
          {entrate > 0 && (
            <div style={{marginTop:10,padding:10,background:t.rowBg,borderRadius:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:t.textSec}}>Entrate mensili</span>
                <span style={{fontWeight:600,color:t.text}}>€ {entrate.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:4}}>
                <span style={{color:t.textSec}}>Destinato ad accantonamenti</span>
                <span style={{fontWeight:600,color:'#F59E0B'}}>€ {quotaMensile.toFixed(2)} ({totPerc.toFixed(1)}%)</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:4}}>
                <span style={{color:t.textSec}}>Disponibile dopo accantonamenti</span>
                <span style={{fontWeight:600,color:entrate - quotaMensile >= 0 ? '#10B981' : '#EF4444'}}>€ {(entrate - quotaMensile).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Lista fondi */}
        {accantonamenti.length === 0
          ? <div style={{...S.card,textAlign:'center',padding:40}}>
              <p style={{fontSize:40,margin:'0 0 8px'}}><Fa icon='fa-solid fa-piggy-bank' style={{fontSize:40}} /></p>
              <p style={{color:t.textMut,fontSize:14}}>Nessun fondo di accantonamento creato</p>
              <p style={{color:t.textMut,fontSize:12}}>Usa il form a destra per aggiungere il primo fondo</p>
            </div>
          : <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {accantonamenti.map(a => {
                const perc = a.obiettivo ? (a.accantonato / a.obiettivo) * 100 : 0
                const quota = a.percentuale && entrate > 0 ? entrate * a.percentuale / 100 : a.importoManuale || 0
                const mesiRim = quota > 0 ? Math.ceil((a.obiettivo - a.accantonato) / quota) : null
                const col = colTipo[a.tipo] || '#6B7280'
                return (
                  <motion.div key={a.id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                    style={{...S.card,borderLeft:`4px solid ${col}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:24}}>{emojiTipo[a.tipo] || <Fa icon='fa-solid fa-bookmark' />}</span>
                        <div>
                          <h3 style={{margin:0,fontSize:16,fontWeight:600,color:t.text}}>{a.nome}</h3>
                          <span style={{fontSize:11,background:t.tagBg,color:col,padding:'2px 8px',borderRadius:8,fontWeight:600}}>{a.tipo}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        <motion.button whileTap={{scale:0.85}} onClick={() => setVersaId(versaId === a.id ? null : a.id)}
                          style={{background:'#10B98115',border:'none',borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:12,fontWeight:600,color:'#10B981'}}>
                          + Versa
                        </motion.button>
                        <motion.button whileTap={{scale:0.85}} onClick={() => startEdit(a)}
                          style={{background:t.tagBg,border:'none',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:12,color:t.textSec}}><Fa icon='fa-solid fa-pen' /></motion.button>
                        <motion.button whileTap={{scale:0.85}} onClick={() => rimuovi(a.id)}
                          style={{background:'#EF444415',border:'none',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontSize:12,color:'#EF4444'}}>×</motion.button>
                      </div>
                    </div>

                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                      <span style={{fontSize:22,fontWeight:700,color:col}}>€ {(a.accantonato || 0).toFixed(2)}</span>
                      <span style={{fontSize:13,color:t.textMut}}>/ € {a.obiettivo.toFixed(2)}</span>
                    </div>
                    <ProgBar pct={Math.min(100, perc)} color={perc >= 100 ? '#10B981' : col} />
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                      <span style={{fontSize:11,color:t.textMut}}>
                        {perc >= 100 ? 'Obiettivo raggiunto!' : `${perc.toFixed(1)}% completato`}
                      </span>
                      <div style={{display:'flex',gap:10}}>
                        <span style={{fontSize:11,color:t.textMut}}>
                          Quota: € {quota.toFixed(2)}/mese
                          {a.percentuale > 0 && ` (${a.percentuale}%)`}
                        </span>
                        {mesiRim !== null && mesiRim > 0 && perc < 100 && (
                          <span style={{fontSize:11,color:t.textSec,fontWeight:500}}>~{mesiRim} mesi</span>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {versaId === a.id && (
                        <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                          style={{marginTop:10,overflow:'hidden'}}>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <Inp type="number" value={versaImporto} onChange={e => setVersaImporto(e.target.value)}
                              placeholder="€ importo" style={{flex:1,padding:'8px 10px',fontSize:13}} 
                              onKeyDown={e => e.key === 'Enter' && versamento(a.id)} />
                            <motion.button whileTap={{scale:0.95}} onClick={() => versamento(a.id)}
                              style={{background:'#10B981',color:'white',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>Versa</motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
        }
      </div>

      {/* Form laterale */}
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={S.card}>
          <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:600,color:t.text}}>
            {editId ? 'Modifica fondo' : '+ Nuovo fondo'}
          </h3>
          <FormField label="Nome del fondo" error={errors.nome}>
            <Inp value={form.nome} onChange={e => setForm({...form, nome:e.target.value})}
              placeholder="es. Vacanza estiva 2025" />
          </FormField>
          <FormField label="Tipo">
            <Sel value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})} style={S.inputFull}
              options={TIPI_ACCANTONAMENTO.map(t=>({value:t,label:t}))} />
          </FormField>
          <FormField label="Obiettivo (€)" error={errors.obiettivo}>
            <Inp type="number" value={form.obiettivo} onChange={e => setForm({...form, obiettivo:e.target.value})}
              placeholder="es. 3000" />
          </FormField>
          <div style={{padding:10,background:t.rowBg,borderRadius:10,margin:'8px 0 12px'}}>
            <p style={{margin:'0 0 8px',fontSize:12,fontWeight:600,color:t.text}}>Modalità di accantonamento</p>
            <p style={{margin:'0 0 6px',fontSize:11,color:t.textMut}}>Scegli % delle entrate oppure un importo fisso mensile</p>
            <FormField label={`% delle entrate${entrate > 0 ? ` (€ ${entrate.toFixed(0)})` : ''}`} error={errors.percentuale}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <Inp type="number" value={form.percentuale} onChange={e => setForm({...form, percentuale:e.target.value, importoManuale:''})}
                  placeholder="es. 10" min="0" max="100" step="0.5" style={{flex:1}} />
                <span style={{color:t.textSec,fontSize:14}}>%</span>
              </div>
              {form.percentuale && entrate > 0 && (
                <p style={{margin:'4px 0 0',fontSize:11,color:'#3B82F6',fontWeight:500}}>= € {(entrate * (+form.percentuale) / 100).toFixed(2)}/mese</p>
              )}
            </FormField>
            <div style={{textAlign:'center',fontSize:11,color:t.textMut,margin:'4px 0'}}>oppure</div>
            <FormField label="Importo fisso mensile (€)" error={errors.importoManuale}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <Inp type="number" value={form.importoManuale} onChange={e => setForm({...form, importoManuale:e.target.value, percentuale:''})}
                  placeholder="es. 200" style={{flex:1}} />
                <span style={{color:t.textSec,fontSize:14}}>€</span>
              </div>
            </FormField>
          </div>
          {form.obiettivo > 0 && (form.percentuale || form.importoManuale) && (() => {
            const quota = form.percentuale && entrate > 0 ? entrate * (+form.percentuale) / 100 : +form.importoManuale || 0
            const mesi = quota > 0 ? Math.ceil(+form.obiettivo / quota) : 0
            return quota > 0 ? (
              <div style={{padding:8,background:'#3B82F615',borderRadius:8,marginBottom:12}}>
                <p style={{margin:0,fontSize:12,color:'#3B82F6',fontWeight:500}}>
                  <Fa icon='fa-solid fa-chart-bar' style={{marginRight:4}} />Con € {quota.toFixed(2)}/mese raggiungerai € {(+form.obiettivo).toFixed(0)} in ~{mesi} mesi
                </p>
              </div>
            ) : null
          })()}
          <div style={{display:'flex',gap:8}}>
            <motion.button whileTap={{scale:0.97}} onClick={aggiungi}
              style={{...S.btn('#3B82F6'),flex:1}}>{editId ? 'Aggiorna' : 'Crea fondo'}</motion.button>
            {editId && (
              <motion.button whileTap={{scale:0.97}} onClick={cancelEdit}
                style={{...S.btn('#6B7280'),flex:'none',padding:'10px 16px'}}>Annulla</motion.button>
            )}
          </div>
        </div>

        {entrate <= 0 && (
          <div style={{...S.card,background:'#F59E0B15',border:`1px solid ${t.border}`}}>
            <p style={{margin:0,fontSize:13,color:'#D97706'}}>
              <Fa icon='fa-solid fa-triangle-exclamation' /> Registra lo <strong>stipendio</strong> nel tab Stipendio per calcolare le percentuali di accantonamento
            </p>
          </div>
        )}

        {accantonamenti.length > 0 && (
          <div style={S.card}>
            <h3 style={{margin:'0 0 10px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-chart-bar' style={{marginRight:6}} />Riepilogo fondi</h3>
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie data={accantonamenti.map(a => ({name:a.nome, value:a.accantonato || 0}))} cx="50%" cy="50%" innerRadius={46} outerRadius={74} paddingAngle={3} dataKey="value">
                  {accantonamenti.map((a, i) => <Cell key={i} fill={colTipo[a.tipo] || EXTRA_COLORS[i % EXTRA_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `€ ${v.toFixed(2)}`} contentStyle={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:8}} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {accantonamenti.map(a => (
                <div key={a.id} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:colTipo[a.tipo] || '#6B7280'}} />
                    <span style={{color:t.textSec}}>{a.nome}</span>
                  </div>
                  <span style={{fontWeight:600,color:t.text}}>€ {(a.accantonato || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── LISTA DELLA SPESA ─────────────────────────────────────────────────────────
function ListaSpesaTab({ data, updateData }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [nome, setNome] = useState('')
  const [quantita, setQuantita] = useState('1')
  const [unita, setUnita] = useState('pz')
  const [categoria, setCategoria] = useState('Altro')
  const [prezzo, setPrezzo] = useState('')
  const [filtro, setFiltro] = useState('tutti')

  const lista = data.listaSpesa || []

  const aggiungi = () => {
    if (!nome.trim()) return
    const item = {
      id: Date.now() + (Math.random()*1000|0),
      nome: nome.trim(),
      quantita: +quantita || 1,
      unita,
      categoria,
      prezzo: +prezzo || 0,
      completato: false,
      creatoIl: new Date().toISOString().slice(0,10),
    }
    updateData('listaSpesa', [...lista, item])
    setNome(''); setQuantita('1'); setPrezzo('')
    toast('Aggiunto alla lista')
  }

  const toggle = (id) => {
    updateData('listaSpesa', lista.map(x => x.id === id ? {...x, completato: !x.completato} : x))
  }

  const rimuovi = (id) => {
    updateData('listaSpesa', lista.filter(x => x.id !== id))
  }

  const pulisciCompletati = () => {
    const completati = lista.filter(x => x.completato)
    if (completati.length === 0) return
    // Converti in spesa se hanno prezzo
    const conPrezzo = completati.filter(x => x.prezzo > 0)
    if (conPrezzo.length > 0) {
      const totale = sum(conPrezzo, x => x.prezzo * x.quantita)
      const nuovaSpesa = {
        id: Date.now(),
        descrizione: `Spesa: ${conPrezzo.map(x=>x.nome).join(', ').slice(0,60)}`,
        importo: totale,
        categoria: 'Spesa',
        data: new Date().toISOString().slice(0,10),
        pagatoDa: data.membrifamiglia[0] || '',
      }
      updateData('spese', [...data.spese, nuovaSpesa])
      toast(`Spesa di € ${totale.toFixed(2)} registrata`)
    }
    updateData('listaSpesa', lista.filter(x => !x.completato))
  }

  const filtrati = filtro === 'tutti' ? lista
    : filtro === 'attivi' ? lista.filter(x => !x.completato)
    : filtro === 'completati' ? lista.filter(x => x.completato)
    : lista.filter(x => x.categoria === filtro)

  const perCategoria = {}
  filtrati.forEach(x => { perCategoria[x.categoria] = (perCategoria[x.categoria] || []).concat(x) })

  const totale = lista.filter(x => !x.completato).reduce((s,x) => s + (x.prezzo||0) * x.quantita, 0)
  const completati = lista.filter(x => x.completato).length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <h2 style={{margin:0,fontSize:mob?16:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-cart-shopping' style={{marginRight:6,color:t.accent}} />Lista della Spesa</h2>
        {completati > 0 && (
          <motion.button whileTap={{scale:0.95}} onClick={pulisciCompletati}
            style={{padding:'6px 14px',background:'#10B981',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
            <Fa icon='fa-solid fa-broom' style={{marginRight:4}} />Archivia {completati} completat{completati===1?'o':'i'}
          </motion.button>
        )}
      </div>

      {/* Form */}
      <div style={{...S.card}}>
        <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr auto auto auto',gap:8,alignItems:'end'}}>
          <FormField label="Prodotto">
            <Inp value={nome} onChange={e=>setNome(e.target.value)} placeholder="Es. Latte, Pane..." style={{width:'100%'}}
              onKeyDown={e=>e.key==='Enter'&&aggiungi()} />
          </FormField>
          <div style={{display:'flex',gap:6}}>
            <FormField label="Qtà">
              <Inp type="number" value={quantita} onChange={e=>setQuantita(e.target.value)} style={{width:60}} min="1" />
            </FormField>
            <FormField label="Unità">
              <Sel value={unita} onChange={e=>setUnita(e.target.value)}
                options={['pz','kg','g','L','mL','conf'].map(u=>({value:u,label:u}))}
                style={{...S.input,width:70}} />
            </FormField>
          </div>
          <FormField label="Prezzo (€)">
            <Inp type="number" value={prezzo} onChange={e=>setPrezzo(e.target.value)} placeholder="0.00" style={{width:80}} step="0.01" />
          </FormField>
        </div>
        <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
          <Sel value={categoria} onChange={e=>setCategoria(e.target.value)}
            options={LISTA_SPESA_CAT.map(c=>({value:c,label:c}))}
            style={{...S.input,flex:1}} placeholder="Categoria" />
          <motion.button whileTap={{scale:0.95}} onClick={aggiungi}
            style={{...S.btn(t.accent),width:'auto',padding:'10px 20px',marginTop:0}}>
            <Fa icon='fa-solid fa-plus' style={{marginRight:4}} />Aggiungi
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        <div style={{...S.card,padding:12,textAlign:'center'}}>
          <p style={{margin:0,fontSize:20,fontWeight:700,color:t.accent}}>{lista.filter(x=>!x.completato).length}</p>
          <p style={{margin:0,fontSize:11,color:t.textMut}}>Da comprare</p>
        </div>
        <div style={{...S.card,padding:12,textAlign:'center'}}>
          <p style={{margin:0,fontSize:20,fontWeight:700,color:'#10B981'}}>{completati}</p>
          <p style={{margin:0,fontSize:11,color:t.textMut}}>Completati</p>
        </div>
        <div style={{...S.card,padding:12,textAlign:'center'}}>
          <p style={{margin:0,fontSize:20,fontWeight:700,color:'#F59E0B'}}>€ {totale.toFixed(2)}</p>
          <p style={{margin:0,fontSize:11,color:t.textMut}}>Stima totale</p>
        </div>
      </div>

      {lista.length > 0 && <ProgBar pct={(completati/lista.length)*100} color='#10B981' />}

      {/* Filtri */}
      <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:4}}>
        {['tutti','attivi','completati',...LISTA_SPESA_CAT].map(f => (
          <motion.button key={f} whileTap={{scale:0.93}} onClick={()=>setFiltro(f)}
            style={S.smallBtn(filtro===f,t.accent)}>{f==='tutti'?'Tutti':f==='attivi'?'Da fare':f==='completati'?'Fatti':f}</motion.button>
        ))}
      </div>

      {/* Lista per categoria */}
      {Object.entries(perCategoria).sort().map(([cat, items]) => (
        <div key={cat}>
          <p style={{margin:'0 0 6px',fontSize:12,fontWeight:700,color:t.textSec,textTransform:'uppercase',letterSpacing:0.5}}>
            {cat} ({items.length})
          </p>
          <AnimatePresence>
            {items.map(item => (
              <motion.div key={item.id} layout variants={ITEM_V} initial="initial" animate="animate" exit="exit"
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:t.cardBg,borderRadius:10,marginBottom:6,boxShadow:t.shadow,
                  opacity:item.completato?0.5:1,transition:'opacity 0.2s'}}>
                <motion.button whileTap={{scale:0.8}} onClick={()=>toggle(item.id)}
                  style={{width:26,height:26,borderRadius:8,border:`2px solid ${item.completato?'#10B981':t.border}`,background:item.completato?'#10B981':'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                  {item.completato && <Fa icon='fa-solid fa-check' style={{color:'white',fontSize:12}} />}
                </motion.button>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:14,fontWeight:500,color:t.text,textDecoration:item.completato?'line-through':'none'}}>
                    {item.nome}
                  </p>
                  <p style={{margin:0,fontSize:11,color:t.textMut}}>
                    {item.quantita} {item.unita}
                    {item.prezzo > 0 && ` · € ${(item.prezzo * item.quantita).toFixed(2)}`}
                  </p>
                </div>
                <motion.button whileTap={{scale:0.8}} onClick={()=>rimuovi(item.id)}
                  style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:14,padding:4,flexShrink:0}}>
                  <Fa icon='fa-solid fa-trash' />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}

      {lista.length === 0 && (
        <div style={{textAlign:'center',padding:40,color:t.textMut}}>
          <Fa icon='fa-solid fa-cart-shopping' style={{fontSize:48,marginBottom:12,opacity:0.3}} />
          <p style={{margin:0,fontSize:14}}>La lista è vuota</p>
          <p style={{margin:'4px 0 0',fontSize:12}}>Aggiungi prodotti per iniziare</p>
        </div>
      )}
    </div>
  )
}

// ── IMPOSTAZIONI (categorie, backup, ecc.) ────────────────────────────────────
function ImpostazioniTab({ data, updateData, onResetSetup, user, onLogout }) {
  const t = useT(); const S = makeS(t); const toast = useToast()
  const w = useWindowWidth(); const mob = w < 768
  const [nuovaCatSpese, setNuovaCatSpese]       = useState('')
  const [nuovaCatScadenze, setNuovaCatScadenze] = useState('')
  const [nuovoConto, setNuovoConto]             = useState('')
  const [budgetCatEdit, setBudgetCatEdit]       = useState({})

  const aggiungiCatSpese = () => {
    if (!nuovaCatSpese.trim() || data.categorieSpese.includes(nuovaCatSpese.trim())) return
    updateData('categorieSpese', [...data.categorieSpese, nuovaCatSpese.trim()])
    setNuovaCatSpese('')
  }

  const rimuoviCatSpese = (cat) => {
    if (CATEGORIE_SPESE_DEFAULT.includes(cat)) return
    updateData('categorieSpese', data.categorieSpese.filter(c=>c!==cat))
  }

  const aggiungiCatScadenze = () => {
    if (!nuovaCatScadenze.trim() || data.categorieScadenze.includes(nuovaCatScadenze.trim())) return
    updateData('categorieScadenze', [...data.categorieScadenze, nuovaCatScadenze.trim()])
    setNuovaCatScadenze('')
  }

  const rimuoviCatScadenze = (cat) => {
    if (CATEGORIE_SCADENZE_DEFAULT.includes(cat)) return
    updateData('categorieScadenze', data.categorieScadenze.filter(c=>c!==cat))
  }

  return (
    <div>
      <h2 style={{margin:'0 0 20px',fontSize:18,fontWeight:700,color:t.text}}><Fa icon='fa-solid fa-gear' style={{marginRight:6}} />Impostazioni</h2>

      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}>Categorie spese</h3>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          {data.categorieSpese.map(cat=>(
            <span key={cat} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',background:t.tagBg,borderRadius:20,fontSize:12,color:t.tagText}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:catCol(cat)}} />
              {cat}
              {!CATEGORIE_SPESE_DEFAULT.includes(cat) && (
                <button onClick={()=>rimuoviCatSpese(cat)} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:14,padding:0,marginLeft:2,lineHeight:1}}>×</button>
              )}
            </span>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <Inp value={nuovaCatSpese} onChange={e=>setNuovaCatSpese(e.target.value)} placeholder="Nuova categoria..." style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&aggiungiCatSpese()} />
          <motion.button whileTap={{scale:0.95}} onClick={aggiungiCatSpese} style={{padding:'8px 16px',background:'#3B82F6',color:'white',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>+ Aggiungi</motion.button>
        </div>
      </div>

      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}>Categorie scadenze</h3>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          {data.categorieScadenze.map(cat=>(
            <span key={cat} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',background:t.tagBg,borderRadius:20,fontSize:12,color:t.tagText}}>
              {cat}
              {!CATEGORIE_SCADENZE_DEFAULT.includes(cat) && (
                <button onClick={()=>rimuoviCatScadenze(cat)} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:14,padding:0,marginLeft:2,lineHeight:1}}>×</button>
              )}
            </span>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <Inp value={nuovaCatScadenze} onChange={e=>setNuovaCatScadenze(e.target.value)} placeholder="Nuova categoria..." style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&aggiungiCatScadenze()} />
          <motion.button whileTap={{scale:0.95}} onClick={aggiungiCatScadenze} style={{padding:'8px 16px',background:'#F59E0B',color:'white',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>+ Aggiungi</motion.button>
        </div>
      </div>

      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-building-columns' style={{marginRight:6}} />Conti</h3>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
          {(data.conti||[]).map(c=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:t.rowBg,borderRadius:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Fa icon='fa-solid fa-wallet' style={{color:'#3B82F6'}} />
                <span style={{fontSize:14,fontWeight:500,color:t.text}}>{c.nome}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Inp type="number" defaultValue={c.saldo} onBlur={e=>updateData('conti',(data.conti||[]).map(x=>x.id===c.id?{...x,saldo:+e.target.value||0}:x))}
                  style={{width:100,textAlign:'right',fontSize:13}} placeholder="Saldo" />
                <span style={{fontSize:12,color:t.textMut}}>€</span>
                {(data.conti||[]).length>1 && <button onClick={()=>{updateData('conti',(data.conti||[]).filter(x=>x.id!==c.id));toast('Conto rimosso')}} style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:16,padding:0}}>×</button>}
              </div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <Inp value={nuovoConto} onChange={e=>setNuovoConto(e.target.value)} placeholder="Nuovo conto..." style={{flex:1}} onKeyDown={e=>{if(e.key==='Enter'&&nuovoConto.trim()){updateData('conti',[...(data.conti||[]),{id:Date.now(),nome:nuovoConto.trim(),saldo:0}]);setNuovoConto('');toast('Conto aggiunto')}}} />
          <motion.button whileTap={{scale:0.95}} onClick={()=>{if(!nuovoConto.trim())return;updateData('conti',[...(data.conti||[]),{id:Date.now(),nome:nuovoConto.trim(),saldo:0}]);setNuovoConto('');toast('Conto aggiunto')}} style={{padding:'8px 16px',background:'#3B82F6',color:'white',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>+ Aggiungi</motion.button>
        </div>
      </div>

      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-chart-pie' style={{marginRight:6}} />Budget per categoria</h3>
        <p style={{margin:'0 0 10px',fontSize:12,color:t.textSec}}>Imposta un limite di spesa mensile per ogni categoria</p>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {data.categorieSpese.map(cat=>{
            const bc = data.budgetCategorie||{}
            return (
              <div key={cat} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:t.rowBg,borderRadius:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:catCol(cat),flexShrink:0}} />
                <span style={{flex:1,fontSize:13,color:t.text}}>{cat}</span>
                <Inp type="number" defaultValue={bc[cat]||''} placeholder="—"
                  onBlur={e=>{const v=+e.target.value||0;const nb={...(data.budgetCategorie||{})};if(v>0)nb[cat]=v;else delete nb[cat];updateData('budgetCategorie',nb)}}
                  style={{width:80,textAlign:'right',fontSize:13}} />
                <span style={{fontSize:12,color:t.textMut}}>€</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}>Backup automatico</h3>
        <p style={{margin:'0 0 8px',fontSize:13,color:t.textSec}}>Esporta automaticamente il JSON ogni N minuti (0 = disabilitato)</p>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Inp type="number" defaultValue={data.backupIntervallo} onBlur={e=>updateData('backupIntervallo',Math.max(0,+e.target.value||0))}
            style={{flex:1}} min="0" step="5" />
          <span style={{color:t.textSec,fontSize:14}}>min</span>
        </div>
        {data.ultimoBackup && <p style={{margin:'8px 0 0',fontSize:11,color:t.textMut}}>Ultimo backup: {new Date(data.ultimoBackup).toLocaleString('it-IT')}</p>}
      </div>

      {/* Colore Accento */}
      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-palette' style={{marginRight:6}} />Colore accento</h3>
        <p style={{margin:'0 0 10px',fontSize:13,color:t.textSec}}>Personalizza il colore principale dell'app</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:8}}>
          {ACCENT_COLORS.map(ac => {
            const active = (data.accentColor||'#3B82F6') === ac.value
            return (
              <motion.button key={ac.value} whileTap={{scale:0.9}} onClick={()=>updateData('accentColor',ac.value)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'12px 8px',
                  background:active?ac.value+'18':t.tagBg, border:active?`2px solid ${ac.value}`:'2px solid transparent',
                  borderRadius:12,cursor:'pointer',transition:'all 0.15s'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:ac.value,boxShadow:active?`0 0 12px ${ac.value}60`:'none'}} />
                <span style={{fontSize:11,fontWeight:active?700:500,color:active?ac.value:t.textSec}}>{ac.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Esporta Calendario */}
      <div style={{...S.card,marginBottom:16}}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-calendar-plus' style={{marginRight:6}} />Integrazione Calendario</h3>
        <p style={{margin:'0 0 10px',fontSize:13,color:t.textSec}}>Esporta scadenze e attività nel calendario del telefono</p>
        <motion.button whileTap={{scale:0.95}} onClick={()=>{generaICS(data);toast('File .ics scaricato — aprilo per importare nel calendario')}}
          style={{width:'100%',padding:'12px',background:t.accent,color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer'}}>
          <Fa icon='fa-solid fa-download' style={{marginRight:6}} />Esporta .ics (Apple/Google Calendar)
        </motion.button>
        <p style={{margin:'8px 0 0',fontSize:11,color:t.textMut}}>
          <Fa icon='fa-solid fa-circle-info' style={{marginRight:4}} />
          {data.scadenze.filter(s=>!s.gestita).length} scadenze + {data.attivita.filter(a=>!a.completata).length} attività verranno esportate
        </p>
      </div>

      {/* Account */}
      {user && (
        <div style={S.card}>
          <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}><Fa icon='fa-solid fa-user-circle' style={{marginRight:6}} />Account</h3>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:14,background:t.tagBg,borderRadius:12,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'#3B82F615',border:'2px solid #3B82F6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#3B82F6'}}>
              {user.email[0].toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
              <div style={{fontSize:11,color:t.textMut}}>Dati sincronizzati con il cloud</div>
            </div>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#10B981',boxShadow:'0 0 6px #10B98160'}} />
          </div>
          <motion.button whileTap={{scale:0.95}} onClick={()=>{if(confirm('Vuoi disconnetterti? I dati locali verranno rimossi.')) onLogout()}}
            style={{padding:'10px 20px',background:'#EF4444',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <Fa icon='fa-solid fa-right-from-bracket' style={{marginRight:6}} />Disconnetti
          </motion.button>
        </div>
      )}

      <div style={S.card}>
        <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:600,color:t.text}}>Dati</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <motion.button whileTap={{scale:0.95}} onClick={()=>exportJSON(data)}
            style={{padding:'10px 20px',background:'#10B981',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>⬇ Esporta JSON</motion.button>
          <motion.button whileTap={{scale:0.95}} onClick={()=>{if(confirm('Reset completo?')) updateData(null, INITIAL)}}
            style={{padding:'10px 20px',background:'#EF4444',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}><Fa icon='fa-regular fa-trash-can' />️ Reset dati</motion.button>
          <motion.button whileTap={{scale:0.95}} onClick={onResetSetup}
            style={{padding:'10px 20px',background:'#3B82F6',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}><Fa icon='fa-solid fa-wand-magic-sparkles' style={{marginRight:6}} />Setup guidato</motion.button>
        </div>
      </div>
    </div>
  )
}

// ── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const theme = THEMES.light

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Compila tutti i campi'); return }
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'register') {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
        if (err) { setError(err.message); setLoading(false); return }
        if (data?.user) {
          // Crea il record dati per il nuovo utente
          await supabase.from('dashboard_data').upsert({ id: data.user.id, data: {}, updated_at: new Date().toISOString() })
          onAuth(data.user, true)
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) { setError(err.message === 'Invalid login credentials' ? 'Email o password non validi' : err.message); setLoading(false); return }
        if (data?.user) onAuth(data.user, false)
      }
    } catch (ex) { setError('Errore di connessione') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #F0FDF4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '-apple-system,BlinkMacSystemFont,Inter,Segoe UI,sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}><Fa icon="fa-solid fa-house-chimney" style={{ color: '#3B82F6' }} /></div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1E293B' }}>Casa Nostra</h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B' }}>
            {mode === 'login' ? 'Accedi per sincronizzare i tuoi dati' : 'Crea un account per iniziare'}
          </p>
        </div>

        {/* Tab Login/Registrati */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F1F5F9', borderRadius: 10, padding: 3 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: mode === m ? 'white' : 'transparent', color: mode === m ? '#1E293B' : '#94A3B8',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {m === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 6, display: 'block' }}>
              <Fa icon="fa-solid fa-envelope" style={{ marginRight: 6 }} />Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="la-tua@email.com"
              autoComplete="email"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 6, display: 'block' }}>
              <Fa icon="fa-solid fa-lock" style={{ marginRight: 6 }} />Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Minimo 6 caratteri' : '••••••'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, fontSize: 13, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fa icon="fa-solid fa-circle-exclamation" />{error}
            </div>
          )}
          {success && (
            <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, fontSize: 13, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fa icon="fa-solid fa-circle-check" />{success}
            </div>
          )}

          <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={loading}
            style={{ padding: '14px', background: loading ? '#94A3B8' : '#3B82F6', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginTop: 4 }}>
            {loading ? <><Fa icon="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Caricamento...</> :
              mode === 'login' ? <><Fa icon="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }} />Accedi</> :
              <><Fa icon="fa-solid fa-user-plus" style={{ marginRight: 8 }} />Crea account</>}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          <Fa icon="fa-solid fa-shield-halved" style={{ marginRight: 4 }} />
          I tuoi dati sono protetti e criptati
        </div>
      </motion.div>
    </div>
  )
}

// ── SETUP WIZARD ─────────────────────────────────────────────────────────────
function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [membri, setMembri] = useState([''])
  const [nuovoM, setNuovoM] = useState('')
  const [budget, setBudget] = useState('')
  const [stipendio, setStipendio] = useState('')
  const [goalRisparmio, setGoalRisparmio] = useState('')
  const [catSpese, setCatSpese] = useState([...CATEGORIE_SPESE_DEFAULT])
  const [catScadenze, setCatScadenze] = useState([...CATEGORIE_SCADENZE_DEFAULT])
  const [nuovaCatS, setNuovaCatS] = useState('')
  const [nuovaCatSc, setNuovaCatSc] = useState('')
  const [scadenze, setScadenze] = useState([])
  const [scNome, setScNome] = useState('')
  const [scData, setScData] = useState('')
  const [scCat, setScCat] = useState('')
  const [scImporto, setScImporto] = useState('')
  const [scRipetizione, setScRipetizione] = useState('nessuna')
  const [darkMode, setDarkMode] = useState(false)

  const theme = darkMode ? THEMES.dark : THEMES.light
  const s = makeS(theme)
  const STEPS = ['Benvenuto','Famiglia','Finanze','Categorie','Scadenze','Fatto']

  const addMembro = () => {
    const n = nuovoM.trim()
    if (n && !membri.includes(n)) { setMembri(prev => [...prev, n]); setNuovoM('') }
  }
  const rmMembro = (m) => setMembri(prev => prev.filter(x => x !== m))

  const addCatS = () => {
    const n = nuovaCatS.trim()
    if (n && !catSpese.includes(n)) { setCatSpese(prev => [...prev, n]); setNuovaCatS('') }
  }
  const addCatSc = () => {
    const n = nuovaCatSc.trim()
    if (n && !catScadenze.includes(n)) { setCatScadenze(prev => [...prev, n]); setNuovaCatSc('') }
  }

  const addScadenza = () => {
    if (!scNome.trim() || !scData) return
    setScadenze(prev => [...prev, {
      id: Date.now(), nome: scNome.trim(), data: scData,
      categoria: scCat || catScadenze[0] || 'Altro',
      importoStimato: +scImporto || 0, ripetizione: scRipetizione,
      note: '', gestita: false,
    }])
    setScNome(''); setScData(''); setScImporto(''); setScRipetizione('nessuna')
  }

  const finish = () => {
    const oggi = new Date().toISOString().slice(0, 10)
    const mese = new Date().toISOString().slice(0, 7)
    const realData = {
      ...INITIAL,
      membrifamiglia: membri.filter(m => m.trim()),
      budget: +budget || 2000,
      entrateMensili: +stipendio || 0,
      goalRisparmio: +goalRisparmio || 500,
      categorieSpese: catSpese,
      categorieScadenze: catScadenze,
      scadenze,
      darkMode,
      stipendi: (+stipendio) ? [{ id: Date.now(), importo: +stipendio, mese, note: 'Setup iniziale', data: oggi }] : [],
    }
    onComplete(realData)
  }

  const canNext = () => {
    if (step === 1) return membri.filter(m => m.trim()).length > 0
    if (step === 2) return +budget > 0
    return true
  }

  const lbl = { fontSize: 13, fontWeight: 600, color: theme.textSec, marginBottom: 6, display: 'block' }
  const wrap = { display: 'flex', flexDirection: 'column', gap: 16 }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '-apple-system,BlinkMacSystemFont,Inter,Segoe UI,sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ background: theme.cardBg, borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#3B82F6' : theme.border, transition: 'background 0.3s' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>

            {/* STEP 0 — Benvenuto */}
            {step === 0 && (
              <div style={wrap}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}><Fa icon="fa-solid fa-house-chimney" style={{ color: '#3B82F6' }} /></div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: theme.text }}>Benvenuto in Casa Nostra</h2>
                  <p style={{ margin: '10px 0 0', fontSize: 15, color: theme.textSec, lineHeight: 1.5 }}>
                    Configuriamo insieme la tua dashboard con i tuoi dati reali. Ci vorranno solo pochi minuti.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: theme.tagBg, borderRadius: 12, marginTop: 8 }}>
                  <Fa icon="fa-solid fa-circle-info" style={{ color: '#3B82F6', fontSize: 18 }} />
                  <span style={{ fontSize: 13, color: theme.textSec, lineHeight: 1.4 }}>Potrai modificare tutto anche dopo dalle Impostazioni</span>
                </div>
                <Chk checked={darkMode} onChange={e => setDarkMode(e.target.checked)}
                  label={<><Fa icon="fa-solid fa-moon" style={{ marginRight: 6 }} />Modalit&agrave; scura</>} />
              </div>
            )}

            {/* STEP 1 — Famiglia */}
            {step === 1 && (
              <div style={wrap}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}><Fa icon="fa-solid fa-users" style={{ marginRight: 8, color: '#3B82F6' }} />Membri della famiglia</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.textSec }}>Chi vive in casa? Serviranno per assegnare spese e attivit&agrave;</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {membri.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: theme.rowBg, borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6FF', border: '2px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#3B82F6' }}>
                        {(m || '?')[0].toUpperCase()}
                      </div>
                      {i === 0 ? (
                        <Inp value={m} onChange={e => setMembri(prev => { const a = [...prev]; a[0] = e.target.value; return a })}
                          placeholder="Il tuo nome..." style={{ flex: 1 }} />
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: theme.text }}>{m}</span>
                          <button onClick={() => rmMembro(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16 }}>
                            <Fa icon="fa-solid fa-xmark" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Inp value={nuovoM} onChange={e => setNuovoM(e.target.value)} placeholder="Aggiungi membro..."
                    style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addMembro()} />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={addMembro}
                    style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Fa icon="fa-solid fa-plus" />
                  </motion.button>
                </div>
              </div>
            )}

            {/* STEP 2 — Finanze */}
            {step === 2 && (
              <div style={wrap}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}><Fa icon="fa-solid fa-wallet" style={{ marginRight: 8, color: '#10B981' }} />Le tue finanze</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.textSec }}>Imposta stipendio, budget mensile e obiettivo di risparmio</p>
                </div>
                <div>
                  <label style={lbl}><Fa icon="fa-solid fa-money-bill-wave" style={{ marginRight: 6 }} />Stipendio mensile netto</label>
                  <div style={{ position: 'relative' }}>
                    <Inp type="number" value={stipendio} onChange={e => setStipendio(e.target.value)} placeholder="es. 1800"
                      style={{ paddingRight: 30 }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMut, fontSize: 14 }}>&euro;</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}><Fa icon="fa-solid fa-chart-pie" style={{ marginRight: 6 }} />Budget mensile spese</label>
                  <div style={{ position: 'relative' }}>
                    <Inp type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="es. 1200"
                      style={{ paddingRight: 30 }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMut, fontSize: 14 }}>&euro;</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}><Fa icon="fa-solid fa-piggy-bank" style={{ marginRight: 6 }} />Obiettivo risparmio mensile</label>
                  <div style={{ position: 'relative' }}>
                    <Inp type="number" value={goalRisparmio} onChange={e => setGoalRisparmio(e.target.value)} placeholder="es. 300"
                      style={{ paddingRight: 30 }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMut, fontSize: 14 }}>&euro;</span>
                  </div>
                </div>
                {+stipendio > 0 && +budget > 0 && (
                  <div style={{ padding: 14, background: theme.tagBg, borderRadius: 12, fontSize: 13, color: theme.textSec }}>
                    <Fa icon="fa-solid fa-calculator" style={{ marginRight: 6, color: '#3B82F6' }} />
                    Dopo spese e risparmio ti restano: <strong style={{ color: theme.text }}>&euro;{(+stipendio - +budget - (+goalRisparmio || 0)).toLocaleString('it-IT')}</strong>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Categorie */}
            {step === 3 && (
              <div style={wrap}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}><Fa icon="fa-solid fa-tags" style={{ marginRight: 8, color: '#F59E0B' }} />Categorie</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.textSec }}>Personalizza le categorie per spese e scadenze</p>
                </div>
                <div>
                  <label style={lbl}>Categorie spese</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {catSpese.map(c => (
                      <span key={c} style={{ padding: '4px 10px', background: theme.tagBg, borderRadius: 6, fontSize: 12, color: theme.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c}
                        <button onClick={() => setCatSpese(prev => prev.filter(x => x !== c))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMut, fontSize: 12, padding: 0, lineHeight: 1 }}><Fa icon="fa-solid fa-xmark" /></button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Inp value={nuovaCatS} onChange={e => setNuovaCatS(e.target.value)} placeholder="Nuova categoria..."
                      style={{ flex: 1, fontSize: 12 }} onKeyDown={e => e.key === 'Enter' && addCatS()} />
                    <button onClick={addCatS} style={{ padding: '5px 12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}><Fa icon="fa-solid fa-plus" /></button>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Categorie scadenze</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {catScadenze.map(c => (
                      <span key={c} style={{ padding: '4px 10px', background: theme.tagBg, borderRadius: 6, fontSize: 12, color: theme.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c}
                        <button onClick={() => setCatScadenze(prev => prev.filter(x => x !== c))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMut, fontSize: 12, padding: 0, lineHeight: 1 }}><Fa icon="fa-solid fa-xmark" /></button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Inp value={nuovaCatSc} onChange={e => setNuovaCatSc(e.target.value)} placeholder="Nuova categoria..."
                      style={{ flex: 1, fontSize: 12 }} onKeyDown={e => e.key === 'Enter' && addCatSc()} />
                    <button onClick={addCatSc} style={{ padding: '5px 12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}><Fa icon="fa-solid fa-plus" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — Scadenze ricorrenti */}
            {step === 4 && (
              <div style={wrap}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}><Fa icon="fa-solid fa-calendar-check" style={{ marginRight: 8, color: '#EF4444' }} />Scadenze fisse</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.textSec }}>Aggiungi bollette, assicurazioni e scadenze ricorrenti</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Inp value={scNome} onChange={e => setScNome(e.target.value)} placeholder="Nome scadenza (es. Affitto, Bolletta luce...)"
                    style={s.inputFull} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <DatePick value={scData} onChange={e => setScData(e.target.value)} style={{ ...s.input, flex: 1 }} />
                    <Sel value={scCat} onChange={e => setScCat(e.target.value)} style={{ ...s.input, flex: 1 }}
                      options={[{value:'',label:'Categoria'},...catScadenze.map(c=>({value:c,label:c}))]} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Inp type="number" value={scImporto} onChange={e => setScImporto(e.target.value)} placeholder="Importo stimato"
                        style={{ paddingRight: 24 }} />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: theme.textMut, fontSize: 13 }}>&euro;</span>
                    </div>
                    <Sel value={scRipetizione} onChange={e => setScRipetizione(e.target.value)} style={{ ...s.input, flex: 1 }}
                      options={[{value:'nessuna',label:'Non ricorrente'},{value:'mensile',label:'Mensile'},{value:'bimestrale',label:'Bimestrale'},{value:'trimestrale',label:'Trimestrale'},{value:'semestrale',label:'Semestrale'},{value:'annuale',label:'Annuale'}]} />
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={addScadenza}
                    style={{ padding: '10px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Fa icon="fa-solid fa-plus" style={{ marginRight: 6 }} />Aggiungi scadenza
                  </motion.button>
                </div>
                {scadenze.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <label style={lbl}>Scadenze aggiunte ({scadenze.length})</label>
                    {scadenze.map(sc => (
                      <div key={sc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: theme.rowBg, borderRadius: 8, fontSize: 13 }}>
                        <div>
                          <span style={{ fontWeight: 600, color: theme.text }}>{sc.nome}</span>
                          <span style={{ color: theme.textMut, marginLeft: 8 }}>{sc.data}</span>
                          {sc.ripetizione !== 'nessuna' && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#DBEAFE', color: '#2563EB', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{sc.ripetizione}</span>}
                          {sc.importoStimato > 0 && <span style={{ marginLeft: 6, color: '#EF4444', fontWeight: 600 }}>&euro;{sc.importoStimato}</span>}
                        </div>
                        <button onClick={() => setScadenze(prev => prev.filter(x => x.id !== sc.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Fa icon="fa-solid fa-trash" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {scadenze.length === 0 && (
                  <div style={{ padding: 14, background: theme.tagBg, borderRadius: 12, fontSize: 13, color: theme.textMut, textAlign: 'center' }}>
                    <Fa icon="fa-regular fa-lightbulb" style={{ marginRight: 6 }} />Puoi aggiungere scadenze anche dopo dalla tab Scadenze
                  </div>
                )}
              </div>
            )}

            {/* STEP 5 — Riepilogo */}
            {step === 5 && (
              <div style={wrap}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}><Fa icon="fa-solid fa-circle-check" style={{ color: '#10B981' }} /></div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.text }}>Tutto pronto!</h2>
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: theme.textSec }}>Ecco un riepilogo della tua configurazione</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  {[
                    { icon: 'fa-solid fa-users', label: 'Membri', val: membri.filter(m => m.trim()).join(', '), color: '#3B82F6' },
                    { icon: 'fa-solid fa-money-bill-wave', label: 'Stipendio', val: (+stipendio ? '\u20AC' + (+stipendio).toLocaleString('it-IT') : 'Non impostato'), color: '#10B981' },
                    { icon: 'fa-solid fa-chart-pie', label: 'Budget', val: '\u20AC' + (+budget || 2000).toLocaleString('it-IT') + '/mese', color: '#F59E0B' },
                    { icon: 'fa-solid fa-piggy-bank', label: 'Obiettivo risparmio', val: '\u20AC' + (+goalRisparmio || 500).toLocaleString('it-IT') + '/mese', color: '#8B5CF6' },
                    { icon: 'fa-solid fa-tags', label: 'Categorie spese', val: catSpese.length + ' categorie', color: '#EC4899' },
                    { icon: 'fa-solid fa-calendar-check', label: 'Scadenze', val: scadenze.length + ' scadenze impostate', color: '#EF4444' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: theme.rowBg, borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: r.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Fa icon={r.icon} style={{ color: r.color, fontSize: 15 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: theme.textMut, fontWeight: 500 }}>{r.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{r.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, gap: 12 }}>
          {step > 0 ? (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(step - 1)}
              style={{ padding: '10px 20px', background: theme.tagBg, color: theme.textSec, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <Fa icon="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Indietro
            </motion.button>
          ) : <div />}
          {step < 5 ? (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => canNext() && setStep(step + 1)}
              style={{ padding: '10px 24px', background: canNext() ? '#3B82F6' : theme.border, color: canNext() ? 'white' : theme.textMut, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: canNext() ? 'pointer' : 'default' }}>
              Avanti<Fa icon="fa-solid fa-arrow-right" style={{ marginLeft: 6 }} />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.96 }} onClick={finish}
              style={{ padding: '10px 28px', background: '#10B981', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <Fa icon="fa-solid fa-rocket" style={{ marginRight: 6 }} />Inizia!
            </motion.button>
          )}
        </div>

        {/* Step indicator text */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: theme.textMut }}>
          {step + 1} di {STEPS.length} &mdash; {STEPS[step]}
        </div>
      </motion.div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function DashboardCasa() {
  const [tab, setTab]   = useState('home')
  const [data, setData] = useState(INITIAL)
  const [setupDone, setSetupDone] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const importRef       = useRef(null)
  const [showMembri, setShowMembri] = useState(false)
  const [nuovoMembro, setNuovoMembro] = useState('')
  const [editMembro, setEditMembro] = useState(null)
  const [editMembroNome, setEditMembroNome] = useState('')
  const [toasts, setToasts] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const skipHistory = useRef(false)
  const [mobileMore, setMobileMore] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | ok | error
  const syncTimer = useRef(null)
  const lastSynced = useRef(null)
  const w = useWindowWidth(); const mob = w < 768

  const toast = useCallback((msg, type='success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800)
  }, [])

  const handleSetupComplete = useCallback((realData) => {
    setData(realData)
    setSetupDone(true)
  }, [])

  const handleAuth = useCallback((u, isNew = false) => {
    setUser(u)
    setAuthLoading(false)
    if (isNew) {
      setData(INITIAL)
      setSetupDone(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setData(INITIAL)
    setSetupDone(false)
  }, [])

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Carica dati da Supabase
  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        setSyncStatus('syncing')
        const { data: row, error } = await supabase.from('dashboard_data').select('data, updated_at').eq('id', user.id).single()
        if (!error && row?.data && Object.keys(row.data).length > 0) {
          setData({ ...INITIAL, ...row.data })
          setSetupDone(true)
        }
        setSyncStatus('ok')
        lastSynced.current = Date.now()
      } catch { setSyncStatus('error') }
    }
    loadData()
  }, [user])

  // Salva su Supabase (debounced)
  useEffect(() => {
    if (!user) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      try {
        setSyncStatus('syncing')
        const { error } = await supabase.from('dashboard_data').upsert({ id: user.id, data, updated_at: new Date().toISOString() })
        setSyncStatus(error ? 'error' : 'ok')
        if (!error) lastSynced.current = Date.now()
      } catch { setSyncStatus('error') }
    }, 2000)
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current) }
  }, [data, user])

  // Undo/Redo history
  useEffect(() => {
    if (skipHistory.current) { skipHistory.current = false; return }
    setHistory(prev => { const h = prev.slice(0, historyIdx + 1); h.push(data); if (h.length > 30) h.shift(); return h })
    setHistoryIdx(prev => Math.min(prev + 1, 29))
  }, [data])

  const undo = useCallback(() => {
    if (historyIdx <= 0) return
    skipHistory.current = true
    setHistoryIdx(prev => prev - 1)
    setData(history[historyIdx - 1])
    toast('Azione annullata', 'info')
  }, [history, historyIdx, toast])

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return
    skipHistory.current = true
    setHistoryIdx(prev => prev + 1)
    setData(history[historyIdx + 1])
    toast('Azione ripristinata', 'info')
  }, [history, historyIdx, toast])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const updateData = (key, val) => {
    if (key===null) { setData(val); return }
    setData(prev=>({...prev,[key]:val}))
  }

  // Recurring expenses (riesegue ad ogni cambio mese, usa flag per evitare duplicati)
  const meseRicorrente = mc()
  useEffect(() => {
    const ricorrenti = data.spese.filter(s=>s.ricorrente)
    const daAggiungere = []
    ricorrenti.forEach(s=>{
      const giaPresente = data.spese.some(x=>x.ricorrenteOrigine===s.id && x.data?.startsWith(meseRicorrente))
      if (!giaPresente && !s.data?.startsWith(meseRicorrente)) {
        daAggiungere.push({...s, id:Date.now()+(Math.random()*10000|0), data:meseRicorrente+s.data?.slice(7), ricorrenteOrigine:s.id, ricorrente:false})
      }
    })
    if (daAggiungere.length>0) updateData('spese', [...data.spese,...daAggiungere])
  // eslint-disable-next-line
  }, [meseRicorrente])

  // Auto-generate scadenze from inventory warranties expiring within 90 days
  useEffect(() => {
    const oggi = new Date()
    const daCreare = []
    data.inventario.forEach(item => {
      if (!item.scadenzaGaranzia) return
      const gg = Math.ceil((new Date(item.scadenzaGaranzia) - oggi) / 864e5)
      if (gg < 0 || gg > 90) return
      const giaEsiste = data.scadenze.some(s => s.origineInventario === item.id && !s.gestita)
      if (!giaEsiste) {
        daCreare.push({ id: Date.now() + (Math.random()*10000|0), nome: `<Fa icon='fa-solid fa-triangle-exclamation' /> Garanzia: ${item.nome}`, data: item.scadenzaGaranzia, categoria: 'Manutenzione', note: `Garanzia in scadenza — ${item.stanza}`, ripetizione: 'nessuna', gestita: false, origineInventario: item.id })
      }
    })
    if (daCreare.length > 0) updateData('scadenze', [...data.scadenze, ...daCreare])
  // eslint-disable-next-line
  }, [data.inventario.length])

  // Auto backup
  useEffect(() => {
    if (!data.backupIntervallo || data.backupIntervallo<=0) return
    const id = setInterval(() => {
      exportJSON(data)
      updateData('ultimoBackup', new Date().toISOString())
    }, data.backupIntervallo*60000)
    return () => clearInterval(id)
  }, [data.backupIntervallo])

  // Browser notifications — check every hour, avoid repeats
  const notifiedRef = useRef(new Set())
  useEffect(() => {
    const checkNotif = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const now = new Date()
      // Scadenze imminenti
      data.scadenze.filter(s => !s.gestita).forEach(s => {
        const gg = Math.ceil((new Date(s.data) - now) / 864e5)
        const key = `scad-${s.id}-${s.data}`
        if (gg >= 0 && gg <= 3 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          new Notification('Scadenza imminente', {
            body: `${s.nome} scade ${gg === 0 ? 'oggi' : `tra ${gg} giorn${gg === 1 ? 'o' : 'i'}`}${s.importoStimato ? ` (€ ${s.importoStimato})` : ''}`,
          })
        }
      })
      // Budget al 90%
      const meseCorr = mc()
      const speseMese = totMese(data.spese, meseCorr)
      const budgetKey = `budget-${meseCorr}`
      if (speseMese >= data.budget * 0.9 && !notifiedRef.current.has(budgetKey)) {
        notifiedRef.current.add(budgetKey)
        new Notification('Budget quasi esaurito', { body: `Hai speso € ${speseMese.toFixed(0)} su € ${data.budget} (${(speseMese/data.budget*100).toFixed(0)}%)` })
      }
      // Budget per categoria
      Object.entries(data.budgetCategorie||{}).forEach(([cat, lim]) => {
        const spCat = data.spese.filter(s=>s.data?.startsWith(meseCorr)&&s.categoria===cat).reduce((s,x)=>s+ +x.importo,0)
        const catKey = `budcat-${cat}-${meseCorr}`
        if (spCat >= lim * 0.9 && !notifiedRef.current.has(catKey)) {
          notifiedRef.current.add(catKey)
          new Notification(`Budget ${cat} al ${(spCat/lim*100).toFixed(0)}%`, { body: `€ ${spCat.toFixed(0)} / € ${lim}` })
        }
      })
      // Garanzie in scadenza (30 giorni)
      data.inventario.filter(x=>x.scadenzaGaranzia).forEach(x=>{
        const gg=Math.ceil((new Date(x.scadenzaGaranzia)-now)/864e5)
        const gKey=`gar-${x.id}`
        if(gg>=0&&gg<=30&&!notifiedRef.current.has(gKey)){
          notifiedRef.current.add(gKey)
          new Notification('Garanzia in scadenza',{body:`${x.nome}: garanzia scade tra ${gg} giorn${gg===1?'o':'i'}`})
        }
      })
    }
    checkNotif()
    const id = setInterval(checkNotif, 3600000) // every hour
    return () => clearInterval(id)
  }, [data.scadenze])

  // PWA registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{})
    }
  }, [])

  const importJSON = (e) => {
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { try{setData({...INITIAL,...JSON.parse(ev.target.result)})}catch{alert('File non valido')} }
    reader.readAsText(file)
    e.target.value = ''
  }

  const requestNotif = async () => {
    if (!('Notification' in window)) { toast('Il browser non supporta le notifiche','error'); return }
    const perm = Notification.permission
    if (perm === 'granted') {
      // Already granted — test with a sample notification
      new Notification('Notifiche attive', { body: 'Riceverai avvisi per scadenze imminenti' })
      toast('Notifiche già abilitate')
      return
    }
    if (perm === 'denied') { toast('Notifiche bloccate dal browser. Sblocca dalle impostazioni del sito.','error'); return }
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      new Notification('Notifiche attivate!', { body: 'Riceverai avvisi per le scadenze nei prossimi 3 giorni' })
      toast('Notifiche abilitate con successo')
    } else {
      toast('Permesso notifiche negato','error')
    }
  }

  const [notifPerm, setNotifPerm] = useState(() => ('Notification' in window) ? Notification.permission : 'denied')
  useEffect(() => {
    const check = () => { if ('Notification' in window) setNotifPerm(Notification.permission) }
    const id = setInterval(check, 2000)
    return () => clearInterval(id)
  }, [])

  const aggiungiMembro = () => {
    if (!nuovoMembro.trim() || data.membrifamiglia.includes(nuovoMembro.trim())) return
    updateData('membrifamiglia', [...data.membrifamiglia, nuovoMembro.trim()])
    setNuovoMembro('')
  }
  const rimuoviMembro = (m) => updateData('membrifamiglia', data.membrifamiglia.filter(x=>x!==m))
  const rinominaMembro = () => {
    const vecchio = editMembro, nuovo = editMembroNome.trim()
    if (!nuovo || nuovo === vecchio) { setEditMembro(null); return }
    if (data.membrifamiglia.includes(nuovo)) { toast('Nome già esistente','error'); return }
    updateData('membrifamiglia', data.membrifamiglia.map(m=>m===vecchio?nuovo:m))
    updateData('spese', data.spese.map(s=>s.pagatoDa===vecchio?{...s,pagatoDa:nuovo}:s))
    updateData('attivita', data.attivita.map(a=>a.assegnato===vecchio?{...a,assegnato:nuovo}:a))
    setEditMembro(null)
    toast('Membro rinominato')
  }

  const dynamicThemes = makeThemes(data.accentColor || '#3B82F6')
  const theme = data.darkMode ? dynamicThemes.dark : dynamicThemes.light
  const S     = makeS(theme)

  const sAlert  = data.scadenze.filter(s=>{if(s.gestita)return false; const g=Math.ceil((new Date(s.data)-new Date())/864e5); return g<0||g<=7}).length
  const aAperte = data.attivita.filter(a=>!a.completata).length
  const garAlert = data.inventario.filter(x=>{if(!x.scadenzaGaranzia)return false; const gg=Math.ceil((new Date(x.scadenzaGaranzia)-new Date())/864e5); return gg>=0&&gg<=90}).length

  const dk = data.darkMode
  const tabs = [
    {id:'home',       label:<><Fa icon="fa-solid fa-house" /> Home</>,        color:dk?'#F1F5F9':'#1E293B'},
    {id:'spese',      label:<><Fa icon="fa-solid fa-wallet" /> Spese</>,       color:dk?'#60A5FA':'#3B82F6'},
    {id:'stipendio',   label:<><Fa icon="fa-solid fa-briefcase" /> Stipendio</>,   color:dk?'#34D399':'#059669'},
    {id:'scadenze',   label:<><Fa icon="fa-regular fa-calendar-check" /> Scadenze</>,    color:dk?'#FBBF24':'#F59E0B', badge:sAlert, badgeColor:'#EF4444'},
    {id:'attivita',   label:<><Fa icon="fa-solid fa-list-check" /> Attività</>,    color:dk?'#34D399':'#10B981', badge:aAperte, badgeColor:'#F59E0B'},
    {id:'consumi',    label:<><Fa icon="fa-solid fa-bolt" /> Consumi</>,     color:dk?'#A78BFA':'#8B5CF6'},
    {id:'analytics',  label:<><Fa icon="fa-solid fa-chart-pie" /> Analytics</>,   color:dk?'#60A5FA':'#3B82F6'},
    {id:'calendario', label:<><Fa icon="fa-regular fa-calendar" /> Calendario</>,  color:dk?'#818CF8':'#6366F1'},
    {id:'note',       label:<><Fa icon="fa-regular fa-note-sticky" /> Note</>,        color:dk?'#FB923C':'#F97316'},
    {id:'contatti',   label:<><Fa icon="fa-solid fa-address-book" /> Contatti</>,    color:dk?'#22D3EE':'#06B6D4'},
    {id:'inventario', label:<><Fa icon="fa-solid fa-box-open" /> Inventario</>,  color:dk?'#A78BFA':'#8B5CF6', badge:garAlert, badgeColor:'#F59E0B'},
    {id:'accantonamenti', label:<><Fa icon="fa-solid fa-piggy-bank" /> Accantonamenti</>, color:dk?'#38BDF8':'#0EA5E9'},
    {id:'listaSpesa',  label:<><Fa icon="fa-solid fa-cart-shopping" /> Lista Spesa</>, color:dk?'#34D399':'#10B981'},
    {id:'impostazioni', label:<><Fa icon="fa-solid fa-gear" /> Impostazioni</>, color:dk?'#94A3B8':'#64748B'},
  ]

  // Mobile bottom nav — 5 tab principali + "Altro"
  const BOTTOM_TABS = ['home','spese','scadenze','attivita','analytics']
  const bottomTabs = tabs.filter(t => BOTTOM_TABS.includes(t.id))
  const moreTabs = tabs.filter(t => !BOTTOM_TABS.includes(t.id))
  const bottomIcons = {
    home:'fa-solid fa-house', spese:'fa-solid fa-wallet', scadenze:'fa-regular fa-calendar-check',
    attivita:'fa-solid fa-list-check', analytics:'fa-solid fa-chart-pie',
  }
  const bottomLabels = { home:'Home', spese:'Spese', scadenze:'Scadenze', attivita:'Attività', analytics:'Analytics' }
  const moreIcons = {
    stipendio:'fa-solid fa-briefcase', consumi:'fa-solid fa-bolt', calendario:'fa-regular fa-calendar',
    note:'fa-regular fa-note-sticky', contatti:'fa-solid fa-address-book', inventario:'fa-solid fa-box-open',
    accantonamenti:'fa-solid fa-piggy-bank', listaSpesa:'fa-solid fa-cart-shopping', impostazioni:'fa-solid fa-gear',
  }
  const moreLabels = {
    stipendio:'Stipendio', consumi:'Consumi', calendario:'Calendario', note:'Note',
    contatti:'Contatti', inventario:'Inventario', accantonamenti:'Risparmi', listaSpesa:'Lista', impostazioni:'Impostazioni',
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: '-apple-system,sans-serif' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
        <Fa icon="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#3B82F6', marginBottom: 12 }} />
        <p style={{ color: '#64748B', fontSize: 14 }}>Caricamento...</p>
      </motion.div>
    </div>
  )

  if (!user) return <AuthScreen onAuth={handleAuth} />
  if (!setupDone) return <SetupWizard onComplete={handleSetupComplete} />

  return (
    <ThemeCtx.Provider value={theme}>
    <ToastCtx.Provider value={toast}>
      <style>{`
        nav::-webkit-scrollbar{height:0;display:none}
        nav{-ms-overflow-style:none;scrollbar-width:none}
        @media(max-width:767px){
          input,select,textarea{font-size:16px !important}
        }
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
      <div style={{minHeight:'100vh',background:theme.bg,fontFamily:'system-ui,-apple-system,sans-serif',color:theme.text}}>
        {/* HEADER */}
        <header style={{background:theme.headerBg,borderBottom:`1px solid ${theme.border}`,padding:mob?'8px 12px':'13px 24px',paddingTop:mob?'calc(env(safe-area-inset-top, 0px) + 8px)':'calc(env(safe-area-inset-top, 0px) + 13px)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:mob?8:12,minWidth:0}}>
            <motion.span animate={{rotate:[0,12,-6,0]}} transition={{delay:0.8,duration:0.55,ease:'easeInOut'}}
              style={{fontSize:mob?20:28,display:'inline-block',flexShrink:0,color:theme.text}}><Fa icon='fa-solid fa-house' /></motion.span>
            <div style={{minWidth:0}}>
              <h1 style={{margin:0,fontSize:mob?15:19,fontWeight:700,color:theme.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Casa Nostra</h1>
              {!mob && <p style={{margin:0,fontSize:12,color:theme.textMut}}>
                {new Date().toLocaleDateString('it-IT',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
              </p>}
            </div>
            <div title={syncStatus==='ok'?'Sincronizzato con il cloud':syncStatus==='syncing'?'Sincronizzazione...':syncStatus==='error'?'Errore di sync':'In attesa'}
              style={{width:mob?8:10,height:mob?8:10,borderRadius:'50%',flexShrink:0,
                background:syncStatus==='ok'?'#10B981':syncStatus==='syncing'?'#F59E0B':syncStatus==='error'?'#EF4444':'#94A3B8',
                boxShadow:`0 0 6px ${syncStatus==='ok'?'#10B98160':syncStatus==='syncing'?'#F59E0B60':syncStatus==='error'?'#EF444460':'transparent'}`,
                animation:syncStatus==='syncing'?'pulse 1.2s infinite':'none'}} />
          </div>

          <div style={{display:'flex',alignItems:'center',gap:mob?6:8,flexWrap:'nowrap',justifyContent:'flex-end'}}>
            {/* Mobile: solo dark mode, cerca, export/import */}
            {mob && <>
              <motion.button whileTap={{scale:0.9}} onClick={()=>updateData('darkMode',!data.darkMode)}
                style={{width:36,height:36,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',color:theme.textSec}}>
                {data.darkMode?<Fa icon='fa-solid fa-sun' />:<Fa icon='fa-solid fa-moon' />}
              </motion.button>
              <motion.button whileTap={{scale:0.9}} onClick={()=>setShowSearch(true)}
                style={{width:36,height:36,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',color:theme.textSec}}>
                <Fa icon='fa-solid fa-magnifying-glass' />
              </motion.button>
              <motion.button whileTap={{scale:0.9}} onClick={()=>setShowMembri(true)}
                style={{width:36,height:36,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',color:theme.textSec}}>
                <Fa icon='fa-solid fa-users' />
              </motion.button>
            </>}

            {/* Desktop: full controls */}
            {!mob && <>
              {data.membrifamiglia.map(m=>(
                <motion.div key={m} whileHover={{scale:1.12}} title={m} onClick={()=>setShowMembri(true)}
                  style={{width:32,height:32,borderRadius:'50%',background:'#3B82F615',border:`2px solid ${theme.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#3B82F6',cursor:'pointer'}}>
                  {m[0].toUpperCase()}
                </motion.div>
              ))}
              <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={()=>setShowMembri(true)}
                style={{width:32,height:32,borderRadius:'50%',background:theme.tagBg,border:`2px dashed ${theme.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer',color:theme.textMut}}>+</motion.button>
              <div style={{width:1,height:24,background:theme.border,margin:'0 4px'}} />
              <Tip label={data.darkMode?'Light mode':'Dark mode'}>
                <motion.button whileTap={{scale:0.9}} onClick={()=>updateData('darkMode',!data.darkMode)}
                  style={{width:32,height:32,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {data.darkMode?<Fa icon='fa-solid fa-sun' />:<Fa icon='fa-solid fa-moon' />}
                </motion.button>
              </Tip>
              <Tip label="Cerca (Ctrl+K)">
                <motion.button whileTap={{scale:0.9}} onClick={()=>setShowSearch(true)}
                  style={{width:32,height:32,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Fa icon='fa-solid fa-magnifying-glass' />
                </motion.button>
              </Tip>
              <Tip label="Annulla (Ctrl+Z)">
                <motion.button whileTap={{scale:0.9}} onClick={undo} disabled={historyIdx<=0}
                  style={{width:32,height:32,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:historyIdx<=0?'default':'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',opacity:historyIdx<=0?0.3:1}}>
                  <Fa icon='fa-solid fa-rotate-left' />
                </motion.button>
              </Tip>
              <Tip label="Ripristina (Ctrl+Y)">
                <motion.button whileTap={{scale:0.9}} onClick={redo} disabled={historyIdx>=history.length-1}
                  style={{width:32,height:32,borderRadius:'50%',background:theme.tagBg,border:'none',cursor:historyIdx>=history.length-1?'default':'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',opacity:historyIdx>=history.length-1?0.3:1}}>
                  <Fa icon='fa-solid fa-rotate-right' />
                </motion.button>
              </Tip>
              <Tip label={notifPerm==='granted'?'Notifiche attive':notifPerm==='denied'?'Notifiche bloccate':'Abilita notifiche'}>
                <motion.button whileTap={{scale:0.9}} onClick={requestNotif}
                  style={{width:32,height:32,borderRadius:'50%',background:notifPerm==='granted'?'#D1FAE5':notifPerm==='denied'?'#FEE2E2':theme.tagBg,border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:notifPerm==='granted'?'#059669':notifPerm==='denied'?'#DC2626':theme.textSec}}>
                  <Fa icon={notifPerm==='granted'?'fa-solid fa-bell':'fa-regular fa-bell'} />
                </motion.button>
              </Tip>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={()=>exportJSON(data)}
                style={{padding:'6px 10px',background:theme.tagBg,border:'none',borderRadius:8,cursor:'pointer',fontSize:12,color:theme.textSec,fontWeight:500}}><Fa icon='fa-solid fa-download' style={{marginRight:4}} />JSON</motion.button>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={()=>exportCSV(data)}
                style={{padding:'6px 10px',background:theme.tagBg,border:'none',borderRadius:8,cursor:'pointer',fontSize:12,color:theme.textSec,fontWeight:500}}><Fa icon='fa-solid fa-file-csv' style={{marginRight:4}} />CSV</motion.button>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={()=>exportReport(data)}
                style={{padding:'6px 10px',background:theme.tagBg,border:'none',borderRadius:8,cursor:'pointer',fontSize:12,color:theme.textSec,fontWeight:500}}><Fa icon='fa-solid fa-file-lines' style={{marginRight:4}} />Report</motion.button>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={()=>generaReportPDF(data)}
                style={{padding:'6px 10px',background:'#EF444420',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,color:'#EF4444',fontWeight:600}}><Fa icon='fa-solid fa-file-pdf' style={{marginRight:4}} />PDF</motion.button>
              <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={()=>importRef.current?.click()}
                style={{padding:'6px 10px',background:theme.tagBg,border:'none',borderRadius:8,cursor:'pointer',fontSize:12,color:theme.textSec,fontWeight:500}}><Fa icon='fa-solid fa-upload' style={{marginRight:4}} />Import</motion.button>
              <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{display:'none'}} />
            </>}
          </div>
        </header>

        {/* NAV — only desktop */}
        {!mob && <nav style={{background:theme.navBg,borderBottom:`1px solid ${theme.border}`,padding:'0 24px',display:'flex',gap:2,overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          {tabs.map(tb=>(
            <motion.button key={tb.id} onClick={()=>setTab(tb.id)} whileTap={{scale:0.94}}
              style={{
                padding:'12px 14px',border:'none',background:'none',cursor:'pointer',
                fontSize:13,fontWeight:tab===tb.id?700:400,
                color:tab===tb.id?tb.color:theme.textSec,
                borderBottom:tab===tb.id?`3px solid ${tb.color}`:'3px solid transparent',
                whiteSpace:'nowrap',position:'relative',transition:'color 0.15s',
              }}>
              {tb.label}
              {tb.badge>0 && <NotifBadge count={tb.badge} color={tb.badgeColor} />}
            </motion.button>
          ))}
        </nav>}

        {/* CONTENT */}
        <main style={{width:'100%',margin:0,padding:mob?'12px 10px 80px':'24px 24px',paddingBottom:mob?'calc(env(safe-area-inset-bottom, 0px) + 80px)':'24px'}}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} variants={TAB_V} initial="initial" animate="animate" exit="exit">
              {tab==='home'        && <HomeTab       data={data} setTab={setTab} updateData={updateData} />}
              {tab==='spese'       && <SpeseTab      data={data} updateData={updateData} />}
              {tab==='stipendio'   && <StipendioTab  data={data} updateData={updateData} />}
              {tab==='scadenze'    && <ScadenzeTab   data={data} updateData={updateData} />}
              {tab==='attivita'    && <AttivitaTab   data={data} updateData={updateData} />}
              {tab==='consumi'     && <ConsumiTab    data={data} updateData={updateData} />}
              {tab==='analytics'   && <AnalyticsTab  data={data} />}
              {tab==='calendario'  && <CalendarioTab data={data} updateData={updateData} />}
              {tab==='note'        && <NoteTab       data={data} updateData={updateData} />}
              {tab==='contatti'    && <ContattiTab   data={data} updateData={updateData} />}
              {tab==='inventario'  && <InventarioTab data={data} updateData={updateData} />}
              {tab==='accantonamenti' && <AccantonamentiTab data={data} updateData={updateData} />}
              {tab==='listaSpesa'  && <ListaSpesaTab data={data} updateData={updateData} />}
              {tab==='impostazioni'&& <ImpostazioniTab data={data} updateData={updateData} onResetSetup={()=>setSetupDone(false)} user={user} onLogout={handleLogout} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Modal Membri */}
        <AnimatePresence>
          {showMembri && (
            <Modal open={showMembri} onClose={()=>setShowMembri(false)} title="Membri famiglia">
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {data.membrifamiglia.map(m=>(
                  <div key={m} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:theme.rowBg,borderRadius:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'#3B82F615',border:`2px solid ${theme.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#3B82F6',flexShrink:0}}>
                        {(editMembro===m?editMembroNome||m:m)[0].toUpperCase()}
                      </div>
                      {editMembro===m ? (
                        <Inp autoFocus value={editMembroNome} onChange={e=>setEditMembroNome(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter')rinominaMembro();if(e.key==='Escape')setEditMembro(null)}}
                          style={{flex:1,minWidth:0}} />
                      ) : (
                        <span style={{fontSize:15,fontWeight:500,color:theme.text}}>{m}</span>
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                      {editMembro===m ? (<>
                        <motion.button whileTap={{scale:0.85}} onClick={rinominaMembro}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#10B981',fontSize:16,padding:4}}><Fa icon='fa-solid fa-check' /></motion.button>
                        <motion.button whileTap={{scale:0.85}} onClick={()=>setEditMembro(null)}
                          style={{background:'none',border:'none',cursor:'pointer',color:theme.textMut,fontSize:16,padding:4}}><Fa icon='fa-solid fa-xmark' /></motion.button>
                      </>) : (<>
                        <motion.button whileTap={{scale:0.85}} onClick={()=>{setEditMembro(m);setEditMembroNome(m)}}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#3B82F6',fontSize:14,padding:4}}><Fa icon='fa-solid fa-pen' /></motion.button>
                        <motion.button whileTap={{scale:0.85}} onClick={()=>rimuoviMembro(m)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:18,padding:4}}>×</motion.button>
                      </>)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8}}>
                <Inp value={nuovoMembro} onChange={e=>setNuovoMembro(e.target.value)} placeholder="Nuovo membro..."
                  style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&aggiungiMembro()} />
                <motion.button whileTap={{scale:0.95}} onClick={aggiungiMembro}
                  style={{padding:'8px 16px',background:'#3B82F6',color:'white',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>+ Aggiungi</motion.button>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1500,display:'flex',justifyContent:'center',alignItems:mob?'flex-start':'flex-start',paddingTop:mob?20:80}}
            onClick={()=>{setShowSearch(false);setSearchQ('')}}>
            <motion.div initial={{scale:0.95,opacity:0,y:-20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:-20}}
              style={{background:theme.cardBg,borderRadius:16,width:'100%',maxWidth:560,maxHeight:'70vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',margin:mob?'0 10px':0}}
              onClick={e=>e.stopPropagation()}>
              <div style={{padding:'16px 20px',borderBottom:`1px solid ${theme.border}`,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18,color:theme.textMut}}><Fa icon='fa-solid fa-magnifying-glass' /></span>
                <Inp autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Cerca ovunque... (spese, scadenze, note, contatti...)"
                  style={{flex:1,border:'none',background:'transparent',fontSize:15,boxShadow:'none'}} />
                <kbd style={{padding:'2px 8px',borderRadius:6,background:theme.tagBg,fontSize:11,color:theme.textMut,border:`1px solid ${theme.border}`}}>ESC</kbd>
              </div>
              <div style={{overflow:'auto',padding:'12px 20px',flex:1}}>
                {(()=>{
                  if(!searchQ.trim()) return <p style={{color:theme.textMut,fontSize:13,textAlign:'center',padding:20}}>Inizia a digitare per cercare...</p>
                  const q = searchQ.toLowerCase()
                  const results = []
                  data.spese.filter(s=>(s.descrizione||'').toLowerCase().includes(q)||(s.categoria||'').toLowerCase().includes(q)).forEach(s=>results.push({type:'spese',icon:<Fa icon='fa-solid fa-wallet' />,label:s.descrizione,sub:`€ ${(+s.importo).toFixed(2)} — ${s.data||''}`,tab:'spese'}))
                  data.scadenze.filter(s=>(s.nome||'').toLowerCase().includes(q)).forEach(s=>results.push({type:'scadenze',icon:<Fa icon='fa-regular fa-calendar-check' />,label:s.nome,sub:s.data?new Date(s.data).toLocaleDateString('it-IT'):'',tab:'scadenze'}))
                  data.attivita.filter(a=>(a.testo||'').toLowerCase().includes(q)).forEach(a=>results.push({type:'attivita',icon:<Fa icon='fa-solid fa-list-check' />,label:a.testo,sub:a.priorita||'',tab:'attivita'}))
                  data.note.filter(n=>(n.testo||'').toLowerCase().includes(q)).forEach(n=>results.push({type:'note',icon:<Fa icon='fa-regular fa-note-sticky' />,label:n.testo.slice(0,80),sub:n.creatoIl||'',tab:'note'}))
                  data.contatti.filter(c=>(c.nome||'').toLowerCase().includes(q)||(c.telefono||'').includes(q)).forEach(c=>results.push({type:'contatti',icon:<Fa icon='fa-solid fa-address-book' />,label:c.nome,sub:`${c.ruolo||''} ${c.telefono||''}`,tab:'contatti'}))
                  data.inventario.filter(x=>(x.nome||'').toLowerCase().includes(q)||(x.stanza||'').toLowerCase().includes(q)).forEach(x=>results.push({type:'inventario',icon:<Fa icon='fa-solid fa-box-open' />,label:x.nome,sub:x.stanza||'',tab:'inventario'}));
                  (data.stipendi||[]).filter(s=>(s.note||'').toLowerCase().includes(q)||s.mese?.includes(q)).forEach(s=>results.push({type:'stipendio',icon:<Fa icon='fa-solid fa-briefcase' />,label:`Stipendio ${MESI[+s.mese?.slice(5,7)-1]||''} ${s.mese?.slice(0,4)||''}`,sub:`€ ${s.importo?.toFixed(2)||''}`,tab:'stipendio'}))
                  if(results.length===0) return <p style={{color:theme.textMut,fontSize:13,textAlign:'center',padding:20}}>Nessun risultato per "{searchQ}"</p>
                  return (
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      <p style={{margin:'0 0 8px',fontSize:11,color:theme.textMut}}>{results.length} risultat{results.length===1?'o':'i'}</p>
                      {results.slice(0,20).map((r,i)=>(
                        <motion.div key={i} whileHover={{background:theme.rowBg}} onClick={()=>{setTab(r.tab);setShowSearch(false);setSearchQ('')}}
                          style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,cursor:'pointer',transition:'background 0.1s'}}>
                          <span style={{fontSize:18,flexShrink:0}}>{r.icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:0,fontSize:13,fontWeight:500,color:theme.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.label}</p>
                            <p style={{margin:0,fontSize:11,color:theme.textMut}}>{r.sub}</p>
                          </div>
                          <span style={{fontSize:11,color:theme.textMut,flexShrink:0}}>{r.type}</span>
                        </motion.div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      {mob && (
        <nav style={{position:'fixed',bottom:0,left:0,right:0,background:theme.headerBg,borderTop:`1px solid ${theme.border}`,
          display:'flex',justifyContent:'space-around',alignItems:'stretch',zIndex:900,
          paddingBottom:'env(safe-area-inset-bottom, 0px)',boxShadow:'0 -2px 12px rgba(0,0,0,0.08)'}}>
          {bottomTabs.map(bt=>{
            const active = tab===bt.id
            const tb = tabs.find(t=>t.id===bt.id)
            return (
              <motion.button key={bt.id} whileTap={{scale:0.9}} onClick={()=>{setTab(bt.id);setMobileMore(false)}}
                style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
                  padding:'8px 0 6px',border:'none',background:'none',cursor:'pointer',position:'relative',
                  color:active?tb.color:theme.textMut,transition:'color 0.15s'}}>
                <Fa icon={bottomIcons[bt.id]} style={{fontSize:18}} />
                <span style={{fontSize:10,fontWeight:active?700:500}}>{bottomLabels[bt.id]}</span>
                {active && <motion.div layoutId="bottomActive" style={{position:'absolute',top:0,left:'20%',right:'20%',height:3,borderRadius:'0 0 3px 3px',background:tb.color}} />}
                {bt.badge>0 && <span style={{position:'absolute',top:4,right:'22%',width:16,height:16,borderRadius:'50%',background:bt.badgeColor||'#EF4444',color:'white',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{bt.badge}</span>}
              </motion.button>
            )
          })}
          {/* Altro button */}
          <motion.button whileTap={{scale:0.9}} onClick={()=>setMobileMore(!mobileMore)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
              padding:'8px 0 6px',border:'none',background:'none',cursor:'pointer',
              color:mobileMore||moreTabs.some(t=>t.id===tab)?'#3B82F6':theme.textMut,transition:'color 0.15s'}}>
            <Fa icon={mobileMore?'fa-solid fa-xmark':'fa-solid fa-grip'} style={{fontSize:18}} />
            <span style={{fontSize:10,fontWeight:mobileMore?700:500}}>Altro</span>
          </motion.button>
        </nav>
      )}

      {/* Mobile "Altro" Drawer */}
      <AnimatePresence>
        {mob && mobileMore && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>setMobileMore(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:899}}>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',stiffness:300,damping:30}}
              onClick={e=>e.stopPropagation()}
              style={{position:'absolute',bottom:60,left:0,right:0,background:theme.cardBg,borderRadius:'20px 20px 0 0',
                padding:'12px 16px',paddingBottom:'calc(env(safe-area-inset-bottom,0) + 12px)',
                boxShadow:'0 -8px 30px rgba(0,0,0,0.15)',maxHeight:'60vh',overflow:'auto'}}>
              <div style={{width:36,height:4,borderRadius:2,background:theme.border,margin:'0 auto 14px'}} />
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {moreTabs.map(mt=>{
                  const active = tab===mt.id
                  return (
                    <motion.button key={mt.id} whileTap={{scale:0.92}} onClick={()=>{setTab(mt.id);setMobileMore(false)}}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'14px 4px',
                        background:active?mt.color+'18':theme.tagBg,border:active?`2px solid ${mt.color}`:`2px solid transparent`,
                        borderRadius:14,cursor:'pointer',transition:'all 0.15s'}}>
                      <Fa icon={moreIcons[mt.id]} style={{fontSize:20,color:active?mt.color:theme.textSec}} />
                      <span style={{fontSize:11,fontWeight:active?700:500,color:active?mt.color:theme.textSec}}>{moreLabels[mt.id]}</span>
                      {mt.badge>0 && <span style={{padding:'1px 6px',borderRadius:8,background:mt.badgeColor||'#EF4444',color:'white',fontSize:9,fontWeight:700}}>{mt.badge}</span>}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div style={{position:'fixed',top:mob?'calc(env(safe-area-inset-top, 0px) + 56px)':'calc(env(safe-area-inset-top, 0px) + 68px)',right:mob?10:20,zIndex:2000,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
        <AnimatePresence>
          {toasts.map(t=>(
            <motion.div key={t.id} initial={{opacity:0,x:60,scale:0.9}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:60,scale:0.9}} transition={{duration:0.22}}
              style={{padding:'10px 18px',borderRadius:10,background:t.type==='success'?'#10B981':t.type==='error'?'#EF4444':'#3B82F6',
                color:'white',fontSize:13,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.2)',pointerEvents:'auto',whiteSpace:'nowrap'}}>
              {t.type==='success'?<><Fa icon='fa-solid fa-check' /> </>:t.type==='error'?<><Fa icon='fa-solid fa-xmark' /> </>:<><Fa icon='fa-solid fa-circle-info' /> </>}{t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
    </ThemeCtx.Provider>
  )
}
