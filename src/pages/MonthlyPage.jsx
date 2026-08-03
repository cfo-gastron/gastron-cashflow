import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { rp, MONTHS_SHORT } from '../lib/utils'

const COGS_IDS  = ['d_cogs']
const OPEX_ORDER = ['d_cogs','d_opex','d_sal','d_off','d_corp','d_capex','d_liab']

export default function MonthlyPage({ page, setPage }) {
  const { allItems, transactions } = useApp()
  const [inclEst,  setInclEst]  = useState(true)
  const [fullYear, setFullYear] = useState(false)
  const [modal,    setModal]    = useState(null)

  const months = fullYear ? [0,1,2,3,4,5,6,7,8,9,10,11] : [3,4,5,6,7,8,9,10,11]

  const data = useMemo(() => {
    const items = [...transactions.filter(z=>!z.is_kemb&&(inclEst||!z.is_est)), ...allItems.filter(z=>z.is_rec)]
    const d = {}
    for (const m of months) d[m] = { in:{}, out:{} }
    for (const z of items) {
      if (!z.date) continue
      const m = new Date(z.date).getMonth()
      if (!months.includes(m)) continue
      const bucket = z.type==='in' ? d[m].in : d[m].out
      const cid = z.cat_id||'__uncategorized', cname = z.cat_name||'Lainnya', sname = z.subcat_name||z.name
      if (!bucket[cid]) bucket[cid] = { catName:cname, subs:{}, items:{} }
      bucket[cid].subs[sname] = (bucket[cid].subs[sname]||0) + Number(z.amount)
      if (!bucket[cid].items[sname]) bucket[cid].items[sname] = []
      bucket[cid].items[sname].push(z)
    }
    return d
  }, [allItems, transactions, inclEst, fullYear, months])

  const mRev={}, mCOGS={}, mGP={}, mOpex={}, mNet={}
  for (const m of months) {
    mRev[m]  = Object.values(data[m].in).reduce((s,c)=>s+Object.values(c.subs).reduce((a,b)=>a+b,0),0)
    mCOGS[m] = Object.entries(data[m].out).filter(([id])=>COGS_IDS.includes(id)).reduce((s,[,c])=>s+Object.values(c.subs).reduce((a,b)=>a+b,0),0)
    mGP[m]   = mRev[m]-mCOGS[m]
    mOpex[m] = Object.values(data[m].out).reduce((s,c)=>s+Object.values(c.subs).reduce((a,b)=>a+b,0),0)
    mNet[m]  = mRev[m]-mOpex[m]
  }
  const totRev=months.reduce((s,m)=>s+mRev[m],0), totCOGS=months.reduce((s,m)=>s+mCOGS[m],0)
  const totGP=months.reduce((s,m)=>s+mGP[m],0), totOpex=months.reduce((s,m)=>s+mOpex[m],0), totNet=months.reduce((s,m)=>s+mNet[m],0)

  const allOutCats = {}
  for (const m of months) for (const [cid,cv] of Object.entries(data[m].out)) { if (!allOutCats[cid]) allOutCats[cid]=cv.catName }
  const sortedCats = [...OPEX_ORDER.filter(id=>allOutCats[id]), ...Object.keys(allOutCats).filter(id=>!OPEX_ORDER.includes(id))]

  function numCell(v, neg=false, clickItems=null, label='') {
    if (!v) return <td style={{textAlign:'right',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:11}}>—</td>
    const color = neg ? 'var(--red)' : v>0 ? 'var(--green)' : 'var(--red)'
    const txt = `${neg||v<0?'-':''}${rp(Math.abs(v))}`
    if (clickItems) return (
      <td style={{textAlign:'right'}}>
        <span style={{fontFamily:'var(--mono)',fontSize:11,color,cursor:'pointer',textDecoration:'underline',textUnderlineOffset:2}} onClick={()=>setModal({items:clickItems,label,total:v})}>
          {txt}
        </span>
      </td>
    )
    return <td style={{textAlign:'right'}}><span style={{fontFamily:'var(--mono)',fontSize:11,color}}>{txt}</span></td>
  }
  function pct(v,rev){ return rev?(v/rev*100).toFixed(1)+'%':'—' }

  const thStyle={padding:'7px 12px',textAlign:'right',fontSize:9,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',whiteSpace:'nowrap',fontFamily:'var(--sora)',borderBottom:'0.5px solid var(--glass-bd)',background:'var(--sb-bg)',backdropFilter:'blur(12px)'}
  const th1Style={...thStyle,textAlign:'left',position:'sticky',left:0,zIndex:11,minWidth:180}
  const tdBase={padding:'5px 12px',borderBottom:'0.5px solid var(--divider)',verticalAlign:'middle',background:'rgba(255,255,255,.45)'}
  const td1Base={...tdBase,textAlign:'left',position:'sticky',left:0,zIndex:1,background:'rgba(248,244,238,.9)',backdropFilter:'blur(8px)',minWidth:180,fontSize:11,color:'var(--text)',fontWeight:400}

  return (
    <>
      <div className="main">
        <div className="main-hdr">
          <span className="page-title">Monthly Report</span>
          <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text2)',cursor:'pointer'}}>
              <input type="checkbox" checked={inclEst} onChange={e=>setInclEst(e.target.checked)} style={{accentColor:'var(--red)',width:'auto'}}/>
              Termasuk estimasi
            </label>
            <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text2)',cursor:'pointer'}}>
              <input type="checkbox" checked={fullYear} onChange={e=>setFullYear(e.target.checked)} style={{accentColor:'var(--red)',width:'auto'}}/>
              Tampilkan Jan–Mar
            </label>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:'16px 20px'}}>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:'var(--sora)',fontSize:14,fontWeight:700,color:'var(--navy)',marginBottom:3}}>Monthly Cashflow Summary 2026</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>Otomatis dari Forecast & Recurring</div>
          </div>

          <div style={{overflowX:'auto',borderRadius:12,border:'0.5px solid var(--glass-bd)',boxShadow:'var(--shadow)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead>
                <tr>
                  <th style={th1Style}>Kategori</th>
                  {months.map(m=><th key={m} style={thStyle}>{MONTHS_SHORT[m]}</th>)}
                  <th style={thStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                {/* PENDAPATAN */}
                <tr><td colSpan={months.length+2} style={{...tdBase,background:'var(--green-bg)',fontFamily:'var(--sora)',fontSize:9,fontWeight:700,color:'var(--green)',textTransform:'uppercase',letterSpacing:'.07em',padding:'6px 12px'}}>💰 Pendapatan</td></tr>
                {Object.entries(data[months[0]]?.in||{}).length===0 && months.every(m=>!Object.keys(data[m].in).length) ? (
                  <tr><td style={td1Base}>—</td>{months.map(m=><td key={m} style={{...tdBase,textAlign:'right',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:11}}>—</td>)}<td style={{...tdBase,textAlign:'right',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:11}}>—</td></tr>
                ) : (
                  <>
                    {(() => {
                      const allInCats = {}
                      for (const m of months) for (const [cid,cv] of Object.entries(data[m].in)) { if (!allInCats[cid]) allInCats[cid]=cv.catName }
                      return Object.entries(allInCats).map(([cid,cname])=>(
                        <Fragment key={cid}>
                          <tr>
                            <td style={{...td1Base,fontWeight:600,color:'var(--text)'}}>{cname}</td>
                            {months.map(m=>{
                              const cat=data[m].in[cid]; const v=cat?Object.values(cat.subs).reduce((a,b)=>a+b,0):0
                              const items=cat?Object.values(cat.items).flat():[]
                              return numCell(v,false,items.length?items:null,`${cname} · ${MONTHS_SHORT[m]}`)
                            })}
                            {numCell(months.reduce((s,m)=>{const c=data[m].in[cid];return s+(c?Object.values(c.subs).reduce((a,b)=>a+b,0):0)},0))}
                          </tr>
                          {Object.keys(data[months.find(m=>data[m].in[cid])||months[0]]?.in[cid]?.subs||{}).map(sname=>(
                            <tr key={sname}>
                              <td style={{...td1Base,paddingLeft:24,color:'var(--text2)',fontSize:10}}>{sname}</td>
                              {months.map(m=>{const v=data[m].in[cid]?.subs[sname]||0;return numCell(v,false,data[m].in[cid]?.items[sname]||null,`${sname} · ${MONTHS_SHORT[m]}`);})}
                              {numCell(months.reduce((s,m)=>s+(data[m].in[cid]?.subs[sname]||0),0))}
                            </tr>
                          ))}
                        </Fragment>
                      ))
                    })()}
                  </>
                )}
                <tr style={{fontWeight:700}}>
                  <td style={{...td1Base,fontWeight:700,color:'var(--green)',background:'rgba(30,138,85,.06)'}}>TOTAL PENDAPATAN</td>
                  {months.map(m=><td key={m} style={{...tdBase,textAlign:'right',background:'rgba(30,138,85,.06)'}}><span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--green)'}}>{mRev[m]?rp(mRev[m]):'—'}</span></td>)}
                  <td style={{...tdBase,textAlign:'right',background:'rgba(30,138,85,.06)'}}><span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--green)'}}>{totRev?rp(totRev):'—'}</span></td>
                </tr>

                <tr><td colSpan={months.length+2} style={{height:6,background:'var(--sb-bg)',border:'none',padding:0}}></td></tr>

                {/* COGS */}
                <tr><td colSpan={months.length+2} style={{...tdBase,background:'var(--red-bg)',fontFamily:'var(--sora)',fontSize:9,fontWeight:700,color:'var(--red)',textTransform:'uppercase',letterSpacing:'.07em',padding:'6px 12px'}}>📦 Cost of Goods Sold</td></tr>
                {sortedCats.filter(id=>COGS_IDS.includes(id)).map(cid=>(
                  <tr key={cid}>
                    <td style={td1Base}>{allOutCats[cid]}</td>
                    {months.map(m=>{const c=data[m].out[cid];const v=c?Object.values(c.subs).reduce((a,b)=>a+b,0):0;return numCell(v,true,c?Object.values(c.items).flat():null,`${allOutCats[cid]} · ${MONTHS_SHORT[m]}`)})}
                    {numCell(months.reduce((s,m)=>{const c=data[m].out[cid];return s+(c?Object.values(c.subs).reduce((a,b)=>a+b,0):0)},0),true)}
                  </tr>
                ))}
                <tr style={{fontWeight:700}}>
                  <td style={{...td1Base,fontWeight:700,color:'var(--navy)',background:'rgba(30,138,85,.08)'}}>GROSS PROFIT</td>
                  {months.map(m=><td key={m} style={{...tdBase,textAlign:'right',background:'rgba(30,138,85,.08)'}}><span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:mGP[m]>=0?'var(--green)':'var(--red)'}}>{mGP[m]?rp(Math.abs(mGP[m])):'—'}</span></td>)}
                  <td style={{...tdBase,textAlign:'right',background:'rgba(30,138,85,.08)'}}><span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:totGP>=0?'var(--green)':'var(--red)'}}>{totGP?rp(Math.abs(totGP)):'—'}</span></td>
                </tr>
                <tr>
                  <td style={{...td1Base,color:'var(--text3)',fontSize:10}}>Gross Margin</td>
                  {months.map(m=><td key={m} style={{...tdBase,textAlign:'right',fontSize:10,color:'var(--text3)'}}>{pct(mGP[m],mRev[m])}</td>)}
                  <td style={{...tdBase,textAlign:'right',fontSize:10,color:'var(--text3)'}}>{pct(totGP,totRev)}</td>
                </tr>

                <tr><td colSpan={months.length+2} style={{height:6,background:'var(--sb-bg)',border:'none',padding:0}}></td></tr>

                {/* OPEX */}
                <tr><td colSpan={months.length+2} style={{...tdBase,background:'var(--amber-bg)',fontFamily:'var(--sora)',fontSize:9,fontWeight:700,color:'var(--amber)',textTransform:'uppercase',letterSpacing:'.07em',padding:'6px 12px'}}>📊 Operating Expenses</td></tr>
                {sortedCats.filter(id=>!COGS_IDS.includes(id)).map(cid=>(
                  <tr key={cid}>
                    <td style={td1Base}>{allOutCats[cid]}</td>
                    {months.map(m=>{const c=data[m].out[cid];const v=c?Object.values(c.subs).reduce((a,b)=>a+b,0):0;return numCell(v,true,c?Object.values(c.items).flat():null,`${allOutCats[cid]} · ${MONTHS_SHORT[m]}`)})}
                    {numCell(months.reduce((s,m)=>{const c=data[m].out[cid];return s+(c?Object.values(c.subs).reduce((a,b)=>a+b,0):0)},0),true)}
                  </tr>
                ))}

                <tr><td colSpan={months.length+2} style={{height:6,background:'var(--sb-bg)',border:'none',padding:0}}></td></tr>

                {/* NET */}
                <tr>
                  <td style={{...td1Base,fontWeight:700,color:'var(--navy)',background:'rgba(67,123,202,.06)'}}>NET CASHFLOW</td>
                  {months.map(m=><td key={m} style={{...tdBase,textAlign:'right',background:'rgba(67,123,202,.06)'}}><span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,color:mNet[m]>=0?'var(--green)':'var(--red)'}}>{mNet[m]?rp(Math.abs(mNet[m])):'—'}</span></td>)}
                  <td style={{...tdBase,textAlign:'right',background:'rgba(67,123,202,.06)'}}><span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,color:totNet>=0?'var(--green)':'var(--red)'}}>{totNet?rp(Math.abs(totNet)):'—'}</span></td>
                </tr>
                <tr>
                  <td style={{...td1Base,color:'var(--text3)',fontSize:10,background:'rgba(67,123,202,.04)'}}>Net Margin</td>
                  {months.map(m=><td key={m} style={{...tdBase,textAlign:'right',fontSize:10,color:'var(--text3)',background:'rgba(67,123,202,.04)'}}>{pct(mNet[m],mRev[m])}</td>)}
                  <td style={{...tdBase,textAlign:'right',fontSize:10,color:'var(--text3)',background:'rgba(67,123,202,.04)'}}>{pct(totNet,totRev)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modal-hdr">
              <div>
                <div className="modal-title">{modal.label}</div>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{modal.items.length} transaksi · Total {rp(modal.total)}</div>
              </div>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div style={{maxHeight:320,overflow:'auto',padding:'0 18px 16px',display:'flex',flexDirection:'column',gap:5}}>
              {modal.items.map((z,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:500,color:'var(--navy)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{z.name}</div>
                    <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{z.subcat_name||z.cat_name||'—'} · {z.date}</div>
                  </div>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:500,color:z.type==='in'?'var(--green)':'var(--red)',whiteSpace:'nowrap'}}>
                    {z.type==='in'?'+':'-'}{rp(z.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Fragment({ children }) { return children }