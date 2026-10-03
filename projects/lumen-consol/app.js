/* ============================================================
   Lumen Consol — a mini financial consolidation application
   (FCCS-style): French parent, subsidiaries in GBP, USD and INR.
   Translation (IAS 21), intercompany matching and eliminations,
   goodwill and non-controlling interests, consolidated statements.
   Fictional group, fictional data. Single file, no backend.
   ============================================================ */
const X=(fr,en)=>S.lang==="fr"?fr:en;
const LOCALE={fr:"fr-FR",en:"en-GB"};
const PERIOD={fr:"S1 2026 · clôture au 30 juin 2026",en:"H1 2026 · closing 30 June 2026"};

const ENT=[
  {id:"FR",ccy:"EUR",parent:true,name:"Maison Lumen SAS",cty:{fr:"France",en:"France"},role:{fr:"Société mère · fabrication et marque",en:"Parent · manufacturing and brand"},owner:"Sophie Bernard"},
  {id:"UK",ccy:"GBP",pct:1,capAcq:1500,resAcq:900,inv:3000,acq:2018,name:"Lumen Lighting Ltd",cty:{fr:"Royaume-Uni",en:"United Kingdom"},role:{fr:"Distribution",en:"Distribution"},owner:"James Carter"},
  {id:"US",ccy:"USD",pct:.8,capAcq:3000,resAcq:1200,inv:4000,acq:2021,name:"Lumen Lighting Inc.",cty:{fr:"États-Unis",en:"United States"},role:{fr:"Distribution · détenue à 80 %",en:"Distribution · 80% owned"},owner:"Emily Brooks"},
  {id:"IN",ccy:"INR",pct:1,capAcq:80000,resAcq:20000,inv:1500,acq:2019,name:"Lumen Components Pvt Ltd",cty:{fr:"Inde",en:"India"},role:{fr:"Fabrication de composants",en:"Component manufacturing"},owner:"Priya Nair"}
];
const entById=Object.fromEntries(ENT.map(e=>[e.id,e]));
const SUBS=ENT.filter(e=>!e.parent);
const PL=["REV","COGS","PERS","OPEX","DEP","FIN","TAX"];
const ASSETS=["GW","PPE","INV_SUB","LOAN_IC","DTA","STOCK","REC","CASH"];
const LIABS=["CAP","RES","CTA","NI_BS","NCI","LOANS","PAY","PLUG"];
const LOCAL_A=["PPE","INV_SUB","LOAN_IC","STOCK","REC","CASH"],LOCAL_L=["CAP","RES","LOANS","PAY"];
const ACC={
  REV:["Chiffre d'affaires","Revenue"],COGS:["Coût des ventes","Cost of sales"],PERS:["Charges de personnel","Staff costs"],OPEX:["Autres charges opérationnelles","Other operating expenses"],DEP:["Dotations aux amortissements","Depreciation"],
  EBIT:["Résultat opérationnel","Operating profit"],FIN:["Résultat financier","Net finance result"],TAX:["Impôt sur le résultat","Income tax"],NI:["Résultat net","Net income"],
  GW:["Goodwill","Goodwill"],PPE:["Immobilisations corporelles","Property, plant and equipment"],INV_SUB:["Titres de participation","Investments in subsidiaries"],LOAN_IC:["Prêt intragroupe","Intercompany loan"],DTA:["Impôts différés actifs","Deferred tax assets"],STOCK:["Stocks","Inventories"],REC:["Créances clients","Trade receivables"],CASH:["Trésorerie","Cash"],
  CAP:["Capital social","Share capital"],RES:["Réserves","Reserves"],CTA:["Écart de conversion","Translation reserve"],NI_BS:["Résultat de la période","Net income for the period"],NCI:["Participations ne donnant pas le contrôle","Non-controlling interests"],LOANS:["Emprunts","Borrowings"],PAY:["Dettes fournisseurs","Trade payables"],PLUG:["Écarts intragroupe en suspens (non réconciliés)","Unreconciled intercompany differences (suspense)"],
  TA:["Total actif","Total assets"],TL:["Total passif","Total equity and liabilities"]
};
const accL=a=>X(ACC[a][0],ACC[a][1]);
// open = closing rate at 31/12/2025 · hist = acquisition-date rate (capital, pre-acquisition reserves, goodwill at cost)
// hres = weighted historical rate of post-acquisition reserves, carried forward from prior closings
const RATES0={GBP:{close:1.17,avg:1.165,open:1.19,hist:1.2,hres:1.16},USD:{close:.92,avg:.915,open:.9,hist:.85,hres:.91},INR:{close:.0105,avg:.0106,open:.0108,hist:.0125,hres:.0114}};
// Tax rate of the entity holding the inventory, used for deferred tax on unrealised profit (IAS 12)
const TAXR={FR:.25,UK:.25,US:.21,IN:.25};
// Intercompany details ("of which" amounts, local currency, thousands). sign = effect on the parent account's natural balance.
const IC0=[
  {id:"FR-REV-UK",e:"FR",acc:"REV",p:"UK",amt:6000,sign:1,rt:"avg"},
  {id:"FR-REV-US",e:"FR",acc:"REV",p:"US",amt:4800,sign:1,rt:"avg"},
  {id:"FR-COGS-IN",e:"FR",acc:"COGS",p:"IN",amt:5000,sign:-1,rt:"avg"},
  {id:"FR-INT-US",e:"FR",acc:"FIN",p:"US",amt:30,sign:1,rt:"avg",kind:"int"},
  {id:"FR-DIV-UK",e:"FR",acc:"FIN",p:"UK",amt:468,sign:1,rt:"avg",kind:"div"},
  {id:"FR-REC-UK",e:"FR",acc:"REC",p:"UK",amt:1200,sign:1,rt:"close"},
  {id:"FR-REC-US",e:"FR",acc:"REC",p:"US",amt:900,sign:1,rt:"close"},
  {id:"FR-PAY-IN",e:"FR",acc:"PAY",p:"IN",amt:850,sign:1,rt:"close"},
  {id:"FR-LOAN-US",e:"FR",acc:"LOAN_IC",p:"US",amt:2000,sign:1,rt:"close"},
  {id:"UK-COGS-FR",e:"UK",acc:"COGS",p:"FR",amt:5150,sign:-1,rt:"avg"},
  {id:"UK-DIV-FR",e:"UK",acc:"RES",p:"FR",amt:400,sign:-1,rt:"close",kind:"div"},
  {id:"UK-PAY-FR",e:"UK",acc:"PAY",p:"FR",amt:1020,sign:1,rt:"close"},
  {id:"US-COGS-FR",e:"US",acc:"COGS",p:"FR",amt:5246,sign:-1,rt:"avg"},
  {id:"US-INT-FR",e:"US",acc:"FIN",p:"FR",amt:32.8,sign:-1,rt:"avg",kind:"int"},
  {id:"US-PAY-FR",e:"US",acc:"PAY",p:"FR",amt:870,sign:1,rt:"close"},
  {id:"US-LOAN-FR",e:"US",acc:"LOANS",p:"FR",amt:2174,sign:1,rt:"close"},
  {id:"IN-REV-FR",e:"IN",acc:"REV",p:"FR",amt:471700,sign:1,rt:"avg"},
  {id:"IN-REC-FR",e:"IN",acc:"REC",p:"FR",amt:81000,sign:1,rt:"close"}
];
const PAIRS=[
  {id:"P1",type:"sales",a:"FR-REV-UK",b:"UK-COGS-FR",fr:"Ventes de produits finis FR → UK",en:"Finished goods sales FR → UK"},
  {id:"P2",type:"sales",a:"FR-REV-US",b:"US-COGS-FR",fr:"Ventes de produits finis FR → US",en:"Finished goods sales FR → US"},
  {id:"P3",type:"sales",a:"IN-REV-FR",b:"FR-COGS-IN",fr:"Ventes de composants IN → FR",en:"Component sales IN → FR"},
  {id:"P4",type:"int",a:"FR-INT-US",b:"US-INT-FR",fr:"Intérêts du prêt FR → US",en:"Interest on the FR → US loan"},
  {id:"P5",type:"div",a:"FR-DIV-UK",b:"UK-DIV-FR",fr:"Dividende versé par UK à FR",en:"Dividend paid by UK to FR"},
  {id:"P6",type:"bal",a:"FR-REC-UK",b:"UK-PAY-FR",fr:"Créance FR / dette UK",en:"FR receivable / UK payable"},
  {id:"P7",type:"bal",a:"FR-REC-US",b:"US-PAY-FR",fr:"Créance FR / dette US",en:"FR receivable / US payable"},
  {id:"P8",type:"bal",a:"IN-REC-FR",b:"FR-PAY-IN",fr:"Créance IN / dette FR",en:"IN receivable / FR payable"},
  {id:"P9",type:"loan",a:"FR-LOAN-US",b:"US-LOAN-FR",fr:"Prêt FR → US",en:"Loan FR → US"}
];
function seedData(){
  return {
    FR:{REV:42000,COGS:-24000,PERS:-9500,OPEX:-3800,DEP:-1400,FIN:378,TAX:-900,PPE:18000,INV_SUB:8500,LOAN_IC:2000,STOCK:7200,REC:9000,CAP:10000,RES:14522,LOANS:12000,PAY:8500},
    UK:{REV:9000,COGS:-6200,PERS:-1200,OPEX:-600,DEP:-100,FIN:-20,TAX:-220,PPE:1200,INV_SUB:0,LOAN_IC:0,STOCK:2400,REC:2100,CAP:1500,RES:2040,LOANS:0,PAY:2300},
    US:{REV:8500,COGS:-5800,PERS:-1300,OPEX:-700,DEP:-150,FIN:-43,TAX:-106,PPE:2400,INV_SUB:0,LOAN_IC:0,STOCK:2300,REC:2600,CAP:3000,RES:1025,LOANS:2174,PAY:1800},
    IN:{REV:560000,COGS:-380000,PERS:-70000,OPEX:-30000,DEP:-12000,FIN:-3000,TAX:-16250,PPE:150000,INV_SUB:0,LOAN_IC:0,STOCK:60000,REC:95000,CAP:80000,RES:116250,LOANS:40000,PAY:55000}
  };
}
const JUSERS={preparer:"Léa Moreau",approver:"Marc Dubois"};
const JGROUPS={Audit:["Audit","Audit"],IC:["Intragroupe","Intercompany"],Reclass:["Reclassements","Reclassifications"]};
const CONSM={EI:{code:"FCCS_Entity Input",fr:"Entity Input · devise locale, avant conversion",en:"Entity Input · local currency, before translation"},TCI:{code:"FCCS_Translated Currency Input",fr:"Translated Currency Input · EUR, après conversion",en:"Translated Currency Input · EUR, after translation"},CI:{code:"FCCS_Contribution Input",fr:"Contribution Input · EUR, ajustement groupe",en:"Contribution Input · EUR, group-level adjustment"}};
const JACC=["REV","COGS","PERS","OPEX","DEP","FIN","TAX","PPE","STOCK","REC","CASH","RES","LOANS","PAY"];
const JSTAT=["working","submitted","approved","posted"];
function seedJournals(){return [
  {id:"J1",label:"UK_AUDIT_ACCRUAL",desc:{fr:"Honoraires d'audit du S1 non encore facturés, à la demande des commissaires aux comptes",en:"H1 audit fees not yet invoiced, at the auditors' request"},group:"Audit",type:"autorev",bal:"balanced",cons:"EI",status:"submitted",
   lines:[{e:"UK",acc:"OPEX",icp:"",dr:45,cr:0,d:{fr:"Honoraires d'audit",en:"Audit fees"}},{e:"UK",acc:"PAY",icp:"",dr:0,cr:45,d:{fr:"Charges à payer",en:"Accrued expenses"}}],
   hist:[{ts:"2026-07-08T10:12:00",who:"Léa Moreau",a:"create"},{ts:"2026-07-08T10:40:00",who:"Léa Moreau",a:"submit"}]},
  {id:"J2",label:"GRP_RECLASS_DISCOUNTS",desc:{fr:"Reclassement IFRS 15 : escomptes accordés aux clients présentés en diminution du chiffre d'affaires",en:"IFRS 15 reclassification: customer discounts presented as a deduction from revenue"},group:"Reclass",type:"regular",bal:"balanced",cons:"CI",status:"working",
   lines:[{e:"FR",acc:"REV",icp:"",dr:180,cr:0,d:{fr:"Escomptes clients",en:"Customer discounts"}},{e:"FR",acc:"OPEX",icp:"",dr:0,cr:180,d:{fr:"Annulation en charges",en:"Removed from expenses"}}],
   hist:[{ts:"2026-07-09T09:05:00",who:"Léa Moreau",a:"create"}]}
];}
const txt=v=>v==null?"":typeof v==="string"?v:L(v);
const natural=(acc,dr,cr)=>ASSETS.includes(acc)?(+dr||0)-(+cr||0):(+cr||0)-(+dr||0);
const postedJ=c=>(S.journals||[]).filter(j=>j.status==="posted"&&j.cons===c);
function eiAdj(e){const o={};postedJ("EI").forEach(j=>j.lines.forEach(l=>{if(l.e!==e||l.acc==="CASH")return;o[l.acc]=(o[l.acc]||0)+natural(l.acc,l.dr,l.cr)}));return o}
function effData(e){const d={...S.data[e]};Object.entries(eiAdj(e)).forEach(([k,v])=>d[k]=(d[k]||0)+v);return d}
function detectLang(){
  try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en")return q}catch(e){}
  try{const v=localStorage.getItem("preferredLang");if(v==="fr"||v==="en")return v}catch(e){}
  return (navigator.language||"fr").slice(0,2).toLowerCase()==="en"?"en":"fr";
}
function freshState(){
  const st={lang:detectLang(),tab:"overview",notes:true,data:seedData(),ic:IC0.map(x=>({...x})),rates:JSON.parse(JSON.stringify(RATES0)),
    upi:{stock:1000,margin:.30},tol:10,impacted:[],ent:"US",snap:null,runs:[],journals:seedJournals(),jsel:"J1",jrole:"preparer"};
  return st;
}
const KEY="lumenconsol-v3";
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.data||!S.rates)S=freshState();
S.tour=null;
try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en")S.lang=q}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ---------- formatting ---------- */
const L=o=>o[S.lang];
const loc=()=>LOCALE[S.lang];
const nf=(v,d=0)=>new Intl.NumberFormat(loc(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(Math.abs(v)<.00001?0:v);
const k0=v=>nf(Math.round(Math.round(v*1000)/1000));
const k1=v=>nf(v,1);
const keur=v=>k0(v)+" k€";
const sgn=(v,d=0)=>(v>0.00001?"+":v<-0.00001?"−":"")+nf(Math.abs(v),d);
const rateF=(c,v)=>nf(v,c==="INR"?6:4);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const stamp=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`};
const showTs=ts=>ts?new Date(ts).toLocaleString(loc(),{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
const sym=c=>({EUR:"k€",GBP:"k£",USD:"k$",INR:"k₹"}[c]);

/* ---------- local data & translation ---------- */
const ni=d=>PL.reduce((s,a)=>s+d[a],0);
const cash=d=>d.CAP+d.RES+ni(d)+d.LOANS+d.PAY-(d.PPE+d.INV_SUB+d.LOAN_IC+d.STOCK+d.REC);
const rateOf=(e,type)=>{const c=entById[e].ccy;return c==="EUR"?1:S.rates[c][type]};
// Dividends paid in the period (local currency and euros at the payment-date rate), from the intercompany detail
const divsOf=e=>S.ic.filter(x=>x.e===e&&x.kind==="div"&&x.acc==="RES");
function translate(e){
  const E=entById[e],d=effData(e),r={close:rateOf(e,"close"),avg:rateOf(e,"avg"),hist:rateOf(e,"hist"),hres:rateOf(e,"hres"),open:rateOf(e,"open")},o={};
  PL.forEach(a=>o[a]=d[a]*r.avg);
  ["PPE","INV_SUB","LOAN_IC","STOCK","REC"].forEach(a=>o[a]=d[a]*r.close);o.CASH=cash(d)*r.close;
  o.LOANS=d.LOANS*r.close;o.PAY=d.PAY*r.close;o.CAP=d.CAP*r.hist;
  // Reserves at historical rates: pre-acquisition at the acquisition rate, post-acquisition at the rates
  // of the years they were earned, less this period's dividends at the payment-date rate
  const div=divsOf(e).reduce((s,x)=>s+icAmt(x),0),divEur=divsOf(e).reduce((s,x)=>s+icAmt(x)*rateOf(e,x.rt),0);
  const resAcq=E.parent?0:E.resAcq,resOpen=d.RES+div;
  o.RES_ACQ=resAcq*r.hist;o.RES_POST=(resOpen-resAcq)*r.hres;o.DIV=-divEur;o.RES=o.RES_ACQ+o.RES_POST+o.DIV;
  o.NI=PL.reduce((s,a)=>s+o[a],0);
  o.CTA=(o.PPE+o.INV_SUB+o.LOAN_IC+o.STOCK+o.REC+o.CASH)-(o.LOANS+o.PAY+o.CAP+o.RES+o.NI);
  // Opening reserve: opening net assets at the opening rate less equity at historical rates.
  // The difference is this period's exchange difference, reported in other comprehensive income (IAS 21.39)
  o.CTA_OPEN=(d.CAP+resOpen)*r.open-(o.CAP+o.RES_ACQ+o.RES_POST);
  o.OCI=o.CTA-o.CTA_OPEN;
  o.div=div;o.resOpen=resOpen;o.rates=r;return o;
}
const icById=id=>S.ic.find(x=>x.id===id);
function icAmt(x){let v=x.amt;postedJ("EI").forEach(j=>j.lines.forEach(l=>{if(l.e===x.e&&l.acc===x.acc&&l.icp===x.p)v+=natural(l.acc,l.dr,l.cr)*x.sign}));return v}
function icEur(x){let v=icAmt(x)*rateOf(x.e,x.rt);postedJ("TCI").forEach(j=>j.lines.forEach(l=>{if(l.e===x.e&&l.acc===x.acc&&l.icp===x.p)v+=natural(l.acc,l.dr,l.cr)*x.sign}));return v}
function matching(){
  return PAIRS.map(p=>{const A=icById(p.a),B=icById(p.b),a=icEur(A),b=icEur(B),d=a-b;
    const r0=x=>{const c=entById[x.e].ccy;return c==="EUR"?1:RATES0[c][x.rt]},d0=icAmt(A)*r0(A)-icAmt(B)*r0(B);
    const st=Math.abs(d)<.05?"ok":Math.abs(d)<=S.tol?"tol":Math.abs(d0)<=S.tol?"fx":"ko";return {...p,A,B,a,b,d,d0,st}});
}

/* ---------- consolidation engine ---------- */
function consolidate(){
  const T={};ENT.forEach(e=>T[e.id]=translate(e.id));
  postedJ("TCI").forEach(j=>j.lines.forEach(l=>{const t=T[l.e],v=natural(l.acc,l.dr,l.cr);t[l.acc]=(t[l.acc]||0)+v;if(PL.includes(l.acc))t.NI+=v}));
  const agg={};[...PL,...ASSETS,...LIABS].forEach(a=>agg[a]=0);
  ENT.forEach(e=>{const t=T[e.id];PL.forEach(a=>agg[a]+=t[a]);LOCAL_A.forEach(a=>agg[a]+=t[a]);["CAP","RES","LOANS","PAY","CTA"].forEach(a=>agg[a]+=t[a]);agg.NI_BS+=t.NI});
  const M=matching(),entries=[];let icFx=0;
  M.forEach(m=>{let lines,code;
    // Differences within tolerance (FX, rounding) stay in the group's result as finance result (IAS 21.45);
    // differences to investigate are parked in a suspense account until corrected
    const diff=m.type==="bal"||m.type==="loan"?m.b-m.a:m.a-m.b,tolerated=m.st!=="ko",gap={acc:tolerated?"FIN":"PLUG",amt:diff};
    if(tolerated)icFx+=diff;
    if(m.type==="sales"){lines=[{acc:"REV",e:m.A.e,amt:-m.a},{acc:"COGS",e:m.B.e,amt:m.b},gap];code="E1"}
    if(m.type==="int"){lines=[{acc:"FIN",e:m.A.e,amt:-m.a},{acc:"FIN",e:m.B.e,amt:m.b},gap];code="E2"}
    if(m.type==="div"){lines=[{acc:"FIN",e:m.A.e,amt:-m.a},{acc:"RES",e:m.B.e,amt:m.b},gap];code="E3"}
    if(m.type==="bal"){lines=[{acc:"REC",e:m.A.e,amt:-m.a},{acc:"PAY",e:m.B.e,amt:-m.b},gap];code="E4"}
    if(m.type==="loan"){lines=[{acc:"LOAN_IC",e:m.A.e,amt:-m.a},{acc:"LOANS",e:m.B.e,amt:-m.b},gap];code="E4"}
    entries.push({code,pair:m.id,group:"ic",fr:m.fr,en:m.en,lines:lines.filter(l=>Math.abs(l.amt)>.001)})});
  // Unrealised profit in UK inventory, with deferred tax at the buyer's tax rate (IAS 12)
  const u=S.upi.stock*rateOf("UK","close")*S.upi.margin,dt=u*TAXR.UK;
  entries.push({code:"E5",group:"ic",fr:"Marge interne en stock chez UK",en:"Unrealised profit in UK inventory",lines:[{acc:"COGS",e:"UK",amt:-u},{acc:"STOCK",e:"UK",amt:-u},{acc:"DTA",e:"UK",amt:dt},{acc:"TAX",e:"UK",amt:dt}],upi:u});
  const eq={};
  SUBS.forEach(s=>{const t=T[s.id],r=t.rates,h=r.hist,AQ=(s.capAcq+s.resAcq)*h,PA=t.RES-s.resAcq*h,m=1-s.pct;
    // Goodwill is an asset of the foreign operation: kept in its currency and translated at the closing rate (IAS 21.47)
    const gwH=s.inv-s.pct*AQ,gwL=gwH/h,gw=gwL*r.close,gwCTA=gw-gwH,gwOCI=gwL*(r.close-r.open);
    const nci=m*(t.CAP+t.RES+t.CTA+t.NI);
    eq[s.id]={AQ,PA,gwH,gwL,gw,gwCTA,gwOCI,nci,nciNI:m*t.NI,nciOCI:m*t.OCI,oci:t.OCI,capE:t.CAP,resE:t.RES,ctaE:t.CTA,niE:t.NI,inv:s.inv,pct:s.pct};
    entries.push({code:"E6",group:"eq",sub:s.id,fr:`Élimination des titres ${s.id}`,en:`Investment elimination ${s.id}`,lines:[
      {acc:"INV_SUB",e:"FR",amt:-s.inv},{acc:"GW",amt:gw},{acc:"CAP",e:s.id,amt:-t.CAP},{acc:"RES",e:s.id,amt:-t.RES+s.pct*PA},
      {acc:"CTA",e:s.id,amt:-m*t.CTA},{acc:"CTA",amt:gwCTA},{acc:"NI_BS",e:s.id,amt:-m*t.NI},{acc:"NCI",amt:nci}].filter(l=>Math.abs(l.amt)>.001)})});
  const colIC={},colEQ={},colJ={};[...PL,...ASSETS,...LIABS].forEach(a=>{colIC[a]=0;colEQ[a]=0;colJ[a]=0});
  postedJ("CI").forEach(j=>j.lines.forEach(l=>{const v=natural(l.acc,l.dr,l.cr);colJ[l.acc]+=v;if(PL.includes(l.acc))colJ.NI_BS+=v}));
  entries.forEach(en=>en.lines.forEach(l=>{const col=en.group==="ic"?colIC:colEQ;col[l.acc]+=l.amt;if(PL.includes(l.acc))col.NI_BS+=l.amt}));
  const cons={};[...PL,...ASSETS,...LIABS].forEach(a=>cons[a]=agg[a]+colIC[a]+colEQ[a]+colJ[a]);
  const sum=(o,ks)=>ks.reduce((s,a)=>s+o[a],0);
  const consNI=sum(cons,PL),nciNI=SUBS.reduce((s,x)=>s+eq[x.id].nciNI,0);
  // Other comprehensive income: exchange differences of the period on subsidiaries and on goodwill
  const oci=SUBS.reduce((s,x)=>s+eq[x.id].oci+eq[x.id].gwOCI,0),nciOCI=SUBS.reduce((s,x)=>s+eq[x.id].nciOCI,0);
  const snap={ts:stamp(),T,agg,colIC,colEQ,colJ,journals:(S.journals||[]).filter(j=>j.status==="posted").map(j=>j.label),cons,entries,eq,upi:u,dt,nciNI,consNI,groupNI:consNI-nciNI,
    oci,nciOCI,groupOCI:oci-nciOCI,icFx,
    TA:sum(cons,ASSETS),TL:sum(cons,LIABS),plug:cons.PLUG,matching:M.map(m=>({id:m.id,st:m.st,d:m.d})),rates:JSON.parse(JSON.stringify(S.rates))};
  snap.balanced=Math.abs(snap.TA-snap.TL)<.5;
  return snap;
}

/* ---------- notes, explanations, tour ---------- */
const NOTES={
 group:()=>[X("Le périmètre de consolidation : la société mère française et ses trois filiales, avec le pourcentage détenu et la méthode. Toutes sont contrôlées (IFRS 10), donc consolidées par intégration globale : on reprend 100 % de leurs comptes, puis on isole la part des minoritaires, appelée en IFRS « participations ne donnant pas le contrôle ». Chaque entité a un statut : dès qu'une donnée ou un taux change, elle passe « à reconsolider ».","The consolidation scope: the French parent and its three subsidiaries, with the share held and the method. All are controlled (IFRS 10), so they are fully consolidated: 100% of their accounts are taken in, then the share owned by outside shareholders is separated out as non-controlling interests (NCI). Each entity has a status: as soon as a figure or a rate changes, it becomes “impacted”."),
   X("Consolider, c'est présenter le groupe comme une seule entreprise : ce qu'il vend à l'extérieur, ce qu'il possède et ce qu'il doit, sans les flux internes.","Consolidating means presenting the group as one single company: what it sells outside, what it owns and what it owes, without internal flows.")],
 local:()=>[X("Les liasses de chaque filiale, dans sa propre devise, telles que remontées par la comptabilité locale. Les lignes « dont intragroupe » détaillent ce qui a été échangé avec une autre société du groupe : c'est la dimension Intercompany de l'outil. Les montants en jaune sont modifiables ; la trésorerie équilibre automatiquement le bilan.","Each subsidiary's reporting package, in its own currency, as submitted by local accounting. The “of which intercompany” lines detail what was exchanged with another group company: this is the tool's Intercompany dimension. Yellow amounts can be edited; cash balances the balance sheet automatically."),
   X("Sans le détail par partenaire, impossible d'éliminer proprement les flux internes : c'est la donnée la plus importante d'une liasse de consolidation.","Without the partner detail, internal flows cannot be eliminated properly: it is the most important data in a consolidation package.")],
 conv:()=>[X("Conversion en euros selon la méthode du cours de clôture (IAS 21) : actifs et dettes au taux de clôture, compte de résultat au taux moyen, capitaux propres aux taux historiques (capital et réserves d'avant l'acquisition au taux d'acquisition, réserves accumulées depuis aux taux des années où elles ont été gagnées, dividendes au taux du jour du paiement). La différence est l'écart de conversion, inscrit en capitaux propres ; sa variation de la période passe en autres éléments du résultat global.","Translation into euros using the closing-rate method (IAS 21): assets and liabilities at the closing rate, the income statement at the average rate, equity at historical rates (capital and pre-acquisition reserves at the acquisition rate, reserves earned since at the rates of the years they were earned, dividends at the payment-date rate). The difference is the translation reserve, held in equity; its movement for the period goes through other comprehensive income."),
   X("L'écart de conversion n'est ni un gain ni une perte réalisés : il reflète l'effet des devises sur la valeur en euros des filiales étrangères, et ne passe en résultat qu'en cas de cession.","The translation reserve is not a realised gain or loss: it reflects the effect of currencies on the euro value of foreign subsidiaries, and is only recycled to profit or loss on disposal.")],
 ic:()=>[X("Avant d'éliminer, on rapproche : chaque transaction intragroupe doit apparaître pour le même montant chez les deux sociétés. Les écarts sous le seuil de tolérance (change, arrondis) sont acceptés et restent dans le résultat financier du groupe (IAS 21.45) ; au-delà, ils sont isolés en compte d'attente, puis analysés et corrigés. Les écritures d'élimination E1 à E5 annulent ensuite ces flux.","Before eliminating, you reconcile: every intercompany transaction must appear for the same amount in both companies. Differences below the tolerance (FX, rounding) are accepted and stay in the group's finance result (IAS 21.45); above it they are parked in a suspense account, then investigated and corrected. Elimination entries E1 to E5 then cancel these flows."),
   X("Une vente à sa propre filiale n'est pas un vrai chiffre d'affaires : sans élimination, le groupe gonflerait son activité et ses marges.","A sale to your own subsidiary is not real revenue: without elimination, the group would inflate its activity and margins.")],
 eq:()=>[X("La société mère a acheté ses filiales : ces titres figurent à son bilan. En consolidation, on les remplace par les actifs et passifs des filiales. L'écart entre le prix payé et la quote-part des capitaux propres acquis est le goodwill (IFRS 3), converti au taux de clôture comme un actif de la filiale (IAS 21.47) ; la part des capitaux propres qui n'appartient pas au groupe va aux participations ne donnant pas le contrôle (« minoritaires »), évaluées à leur quote-part de l'actif net.","The parent bought its subsidiaries: those shares sit on its balance sheet. In consolidation they are replaced by the subsidiaries' assets and liabilities. The gap between the price paid and the share of equity acquired is goodwill (IFRS 3), translated at the closing rate as an asset of the subsidiary (IAS 21.47); the share of equity the group does not own goes to non-controlling interests, measured at their share of net assets."),
   X("Sans cette étape, le groupe compterait deux fois les mêmes capitaux propres : une fois chez la mère (les titres), une fois chez la filiale.","Without this step, the group would count the same equity twice: once at the parent (the shares) and once at the subsidiary.")],
 jnl:()=>[X("Un journal est une correction manuelle, documentée et approuvée, qui s'ajoute aux données chargées sans les écraser. On choisit où il s'applique : dans la devise de la filiale avant conversion (Entity Input), en euros après conversion (Translated Currency Input) ou au niveau du groupe (Contribution Input). Il suit un circuit : brouillon, soumis, approuvé, comptabilisé.","A journal is a manual, documented and approved correction, added on top of loaded data without overwriting it. You choose where it applies: in the subsidiary's currency before translation (Entity Input), in euros after translation (Translated Currency Input) or at group level (Contribution Input). It follows a path: working, submitted, approved, posted."),
   X("Les journaux sont la première chose que regardent les commissaires aux comptes : qui a corrigé quoi, pourquoi, et qui l'a validé. La personne qui approuve ne peut pas comptabiliser elle-même.","Journals are the first thing auditors look at: who corrected what, why, and who signed it off. The person who approves cannot post the journal themselves.")],
 ws:()=>[X("La feuille de consolidation montre tout le calcul, compte par compte : les quatre entités converties en euros, leur addition (l'agrégé), les éliminations intragroupe, l'élimination des titres, puis le consolidé. C'est l'équivalent de la dimension Consolidation d'Oracle FCCS.","The consolidation worksheet shows the whole calculation, account by account: the four entities translated into euros, their sum (aggregated), intercompany eliminations, investment elimination, then the consolidated result. It mirrors the Consolidation dimension in Oracle FCCS."),
   X("Chaque chiffre consolidé peut être expliqué : c'est ce que demandent les commissaires aux comptes.","Every consolidated figure can be explained: this is exactly what auditors ask for.")],
 stm:()=>[X("Les états financiers consolidés présentés selon IAS 1 : compte de résultat, état du résultat global (avec les écarts de conversion de la période), et bilan avec les capitaux propres part du groupe séparés des participations ne donnant pas le contrôle. Des contrôles automatiques vérifient que le bilan est équilibré et que l'intragroupe est bien éliminé.","The consolidated financial statements presented under IAS 1: income statement, statement of comprehensive income (with the period's exchange differences), and a balance sheet showing equity attributable to owners separately from non-controlling interests. Automatic checks confirm the balance sheet balances and intercompany is fully eliminated."),
   X("Ce sont les chiffres publiés, présentés au conseil, aux banques et aux investisseurs.","These are the published figures, presented to the board, banks and investors.")],
 dim:()=>[X("Oracle FCCS crée toujours neuf dimensions système ; Currency et Intercompany s'y ajoutent dès que l'application est multidevise et gère l'intragroupe, ce qui est le cas ici. Les dimensions propres à la consolidation (Consolidation, Data Source, Movement, View, Currency, Intercompany) permettent la conversion, les éliminations, les journaux et la piste d'audit.","Oracle FCCS always creates nine system dimensions; Currency and Intercompany are added when the application is multi-currency and tracks intercompany, as here. The consolidation-specific ones (Consolidation, Data Source, Movement, View, Currency, Intercompany) make translation, eliminations, journals and the audit trail possible."),
   X("Ces dimensions sont livrées par l'outil : le consultant les paramètre, il ne les invente pas.","These dimensions come with the tool: the consultant configures them rather than inventing them.")]
};
let EXPLAIN=null;
function explain(fn){const l=S.lang,o={};["fr","en"].forEach(x=>{S.lang=x;o[x]=fn()});S.lang=l;EXPLAIN=o}
function intro(tab){const n=NOTES[tab];if(!n||!S.notes)return"";const [a,b]=n();return `<div class="intro"><span class="ic" aria-hidden="true">i</span><div><p>${a}</p><p class="whyl"><b>${X("Pourquoi","Why")}</b>${b}</p></div></div>`}
function explainBox(){if(!EXPLAIN||!S.notes)return"";const x=L(EXPLAIN);return `<div class="explain" role="status"><span class="lab">${X("Ce qui vient de se passer","What just happened")}</span><button class="x" id="explain-close" aria-label="${X("Fermer","Close")}">×</button><h4>${x.title}</h4><p>${x.body}</p></div>`}
const why=(fr,en)=>S.notes?`<div class="why"><b>${X("Pourquoi","Why")}</b>${X(fr,en)}</div>`:"";
const TOUR=[
 {tab:"group",sel:"#consolidate",fr:["Lancez la consolidation","Voici le groupe : une mère française et trois filiales. Cliquez sur « Consolider le groupe » : conversion, éliminations et états consolidés sont calculés en une fois."],en:["Run the consolidation","This is the group: a French parent and three subsidiaries. Click “Consolidate the group”: translation, eliminations and consolidated statements are calculated in one go."]},
 {tab:"local",sel:"#ic-US-PAY-FR",setup:()=>{S.ent="US"},fr:["Lisez une liasse locale","La filiale américaine déclare ses comptes en dollars. Cette ligne indique sa dette envers la France : 870 k$. Retenez ce chiffre, il pose problème plus loin."],en:["Read a local package","The US subsidiary reports in dollars. This line shows what it owes France: 870 k$. Keep it in mind, it causes a problem later on."]},
 {tab:"conv",sel:"[data-fx=gbp]",fr:["Faites bouger une devise","Cliquez sur « Livre sterling −5 % » : les montants britanniques en euros baissent et l'écart de conversion bouge. La filiale UK passe « à reconsolider »."],en:["Move a currency","Click “Pound sterling −5%”: UK amounts in euros fall and the translation reserve moves. The UK entity becomes “impacted”."]},
 {tab:"ic",sel:"#make-jnl",fr:["Rapprochez l'intragroupe","La France a une créance de 900 k€ sur les États-Unis, qui ne reconnaissent qu'environ 800 k€ : une facture est en transit. Cliquez sur « Créer le journal de correction »."],en:["Reconcile intercompany","France has a 900 k€ receivable on the US, which only acknowledges about 800 k€: an invoice is in transit. Click “Create the correcting journal”."]},
 {tab:"jnl",sel:"#j-submit",fr:["Faites valider le journal","Scannez puis soumettez le journal. Passez en rôle Approbateur pour l'approuver, puis revenez en Préparatrice pour le comptabiliser : celui qui approuve ne comptabilise pas."],en:["Get the journal signed off","Scan then submit the journal. Switch to the Approver role to approve it, then back to Preparer to post it: whoever approves does not post."]},
 {tab:"group",sel:"#consolidate",fr:["Reconsolidez","Deux entités sont à reconsolider. Relancez la consolidation pour intégrer le nouveau taux et la correction."],en:["Consolidate again","Two entities are impacted. Run the consolidation again to take in the new rate and the correction."]},
 {tab:"ws",sel:".ws",fr:["Suivez le calcul","La feuille de consolidation : quatre entités en euros, leur somme, les éliminations, puis le consolidé. Survolez la colonne des éliminations pour comprendre chaque retraitement."],en:["Follow the calculation","The consolidation worksheet: four entities in euros, their sum, the eliminations, then the consolidated result. Each column shows one stage of the process."]},
 {tab:"stm",sel:".kpis",fr:["Lisez les comptes consolidés","Le résultat du groupe, la part des minoritaires, le goodwill et un bilan qui s'équilibre au centime près."],en:["Read the consolidated accounts","The group result, non-controlling interests, goodwill and a balance sheet that balances exactly."]}
];
function renderTour(){
  document.querySelectorAll(".tour-target").forEach(n=>n.classList.remove("tour-target"));
  let card=document.getElementById("tourcard");
  if(S.tour==null){if(card)card.remove();document.body.classList.remove("touring");return}
  const st=TOUR[S.tour],[h,b]=L(st);
  if(!card){card=document.createElement("div");card.id="tourcard";card.className="tourcard";card.setAttribute("role","dialog");document.body.appendChild(card)}
  document.body.classList.add("touring");
  card.innerHTML=`<span class="step">${X("Visite guidée","Guided tour")} · ${S.tour+1}/${TOUR.length}</span><h4>${h}</h4><p>${b}</p><div class="nav"><span class="dots">${TOUR.map((_,i)=>`<i class="${i===S.tour?"on":""}"></i>`).join("")}</span><button class="btn ghost" data-tour="end">${X("Quitter","Exit")}</button>${S.tour>0?`<button class="btn" data-tour="prev">${X("Précédent","Back")}</button>`:""}<button class="btn primary" data-tour="next">${S.tour===TOUR.length-1?X("Terminer","Finish"):X("Suivant","Next")}</button></div>`;
  const el=document.querySelector(st.sel);
  if(el){const tgt=el.closest("td")||el;tgt.classList.add("tour-target");const r=tgt.getBoundingClientRect();if(r.top<60||r.bottom>innerHeight-200)tgt.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}
}
function goTour(i){if(i==null||i<0||i>=TOUR.length){S.tour=null;render();return}S.tour=i;const st=TOUR[i];S.tab=st.tab;if(st.setup)st.setup();render()}

/* ---------- shell ---------- */
const TABS=[["overview","Présentation","Overview"],["group","Groupe","Group"],["local","Données locales","Local data"],["conv","Conversion","Translation"],["ic","Intragroupe","Intercompany"],["jnl","Journaux","Journals"],["eq","Titres & minoritaires","Investments & NCI"],["ws","Feuille de consolidation","Consolidation worksheet"],["stm","États consolidés","Consolidated statements"],["dim","Dimensions","Dimensions"],["about","Notes techniques","Technical notes"]];
function renderTabs(){document.getElementById("tabs").innerHTML=TABS.map(([id,fr,en])=>{let b="";if(id==="group"&&S.impacted.length)b=`<span class="badge">${S.impacted.length}</span>`;if(id==="jnl"){const k=(S.journals||[]).filter(j=>S.jrole==="approver"?j.status==="submitted":j.status==="approved").length;if(k)b=`<span class="badge">${k}</span>`}if(id==="ic"){const k=matching().filter(m=>m.st==="ko").length;if(k)b=`<span class="badge">${k}</span>`}return `<button role="tab" id="tab-${id}" aria-selected="${S.tab===id}" data-tab="${id}">${X(fr,en)}${b}</button>`}).join("")}
function render(){
  document.documentElement.lang=S.lang;
  document.getElementById("subtitle").textContent=X("Consolidation S1 2026 · Groupe Maison Lumen (groupe fictif, luminaires)","H1 2026 consolidation · Maison Lumen Group (fictional lighting group)");
  document.getElementById("footnote").textContent=X("Projet de portfolio · Toutes les données et personnes sont fictives · Montants en milliers · Aucun lien avec Oracle Corporation.","Portfolio project · All data and people are fictional · Amounts in thousands · Not affiliated with Oracle Corporation.");
  document.getElementById("lang-fr").setAttribute("aria-pressed",S.lang==="fr");document.getElementById("lang-en").setAttribute("aria-pressed",S.lang==="en");
  document.getElementById("tour-start").textContent=X("Visite guidée","Guided tour");
  const nt=document.getElementById("notes-toggle");nt.textContent=S.notes?X("Masquer les notes","Hide notes"):X("Afficher les notes","Show notes");nt.setAttribute("aria-pressed",S.notes);
  renderTabs();
  const V={overview:viewOverview,group:viewGroup,local:viewLocal,conv:viewConv,ic:viewIC,jnl:viewJnl,eq:viewEq,ws:viewWS,stm:viewStm,dim:viewDim,about:viewAbout};
  document.getElementById("main").innerHTML=`<section class="panel" role="tabpanel">${intro(S.tab)}${explainBox()}${V[S.tab]()}</section>`;
  if(S.tab==="stm"&&S.snap)drawContribution();
  renderTour();persist();
}
let toastTimer;function toast(m){const el=document.getElementById("toast");el.textContent=m;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2600)}
const stChip=e=>!S.snap?`<span class="chip st-nd">${X("Non consolidé","Not consolidated")}</span>`:S.impacted.includes(e)?`<span class="chip st-imp">${X("À reconsolider","Impacted")}</span>`:`<span class="chip st-ok">OK</span>`;
function staleBanner(){
  if(!S.snap)return `<div class="stale-banner"><span>${X("Le groupe n'a pas encore été consolidé.","The group has not been consolidated yet.")}</span><button class="btn primary" id="consolidate-2">${X("Consolider le groupe","Consolidate the group")}</button></div>`;
  if(S.impacted.length)return `<div class="stale-banner"><span>${X(`Données modifiées depuis la dernière consolidation (${S.impacted.join(", ")}). Les chiffres affichés sont ceux du ${showTs(S.snap.ts)}.`,`Data changed since the last consolidation (${S.impacted.join(", ")}). Figures shown are from ${showTs(S.snap.ts)}.`)}</span><button class="btn primary" id="consolidate-2">${X("Reconsolider","Consolidate again")}</button></div>`;
  return "";
}
function markImpacted(ids){ids.forEach(i=>{if(!S.impacted.includes(i))S.impacted.push(i)});if(S.snap&&ids.length&&!S.impacted.includes("FR"))S.impacted.push("FR")}

/* ---------- overview ---------- */
function viewOverview(){
  const steps=[["local",X("Collecter les liasses","Collect packages"),X("Chaque filiale remonte ses comptes dans sa devise, avec le détail intragroupe.","Each subsidiary submits its accounts in its own currency, with intercompany detail.")],
    ["conv",X("Convertir","Translate"),X("Tout est converti en euros : clôture, moyen ou historique selon la ligne.","Everything is translated into euros: closing, average or historical rate by line.")],
    ["ic",X("Rapprocher l'intragroupe","Reconcile intercompany"),X("Les montants échangés entre filiales doivent concorder des deux côtés.","Amounts exchanged between subsidiaries must agree on both sides.")],
    ["ic",X("Éliminer","Eliminate"),X("Ventes, dettes, prêts, dividendes et marges internes sont annulés.","Internal sales, balances, loans, dividends and margins are cancelled.")],
    ["eq",X("Titres et minoritaires","Investments and NCI"),X("Les titres laissent place au goodwill et à la part des minoritaires.","Shares give way to goodwill and non-controlling interests.")],
    ["stm",X("Publier","Report"),X("Compte de résultat et bilan consolidés, contrôlés et expliqués.","Consolidated income statement and balance sheet, checked and explained.")]];
  const vs=[[X("Conversion","Translation"),X("Taux copiés à la main dans chaque onglet","Rates copied by hand into every sheet"),X("Tables de taux centrales, appliquées par règle","Central rate tables applied by rule")],
    [X("Intragroupe","Intercompany"),X("Écarts découverts la veille de la clôture","Differences found the night before close"),X("Rapprochement automatique avec seuil de tolérance","Automatic matching with a tolerance")],
    [X("Éliminations","Eliminations"),X("Écritures ressaisies à chaque clôture","Entries re-keyed at every close"),X("Règles d'élimination standard, rejouées à chaque fois","Standard elimination rules, replayed every time")],
    [X("Audit","Audit"),X("Difficile de justifier un chiffre","Hard to justify a figure"),X("Chaque montant retraçable jusqu'à la liasse","Every amount traceable back to the package")],
    [X("Délais","Timing"),X("Plusieurs semaines","Several weeks"),X("Quelques jours","A few days")]];
  return `<div class="ov">
  <div class="ov-hero"><div>
    <p class="ov-eyebrow">${X("Qu'est-ce que la consolidation ?","What is financial consolidation?")}</p>
    <h2>${X("Présenter un groupe de sociétés comme s'il n'en formait qu'une.","Presenting a group of companies as if it were just one.")}</h2>
    <p class="lead">${X("Un groupe possède plusieurs sociétés, souvent dans plusieurs pays et plusieurs devises. La consolidation additionne leurs comptes, les convertit dans une seule devise, retire tout ce qu'elles échangent entre elles et remplace les titres détenus par les actifs réellement contrôlés. Le résultat : un compte de résultat et un bilan uniques, exigés par la loi (Code de commerce, normes IFRS pour les sociétés cotées), les banques et les investisseurs. Des outils comme Oracle FCCS, OneStream ou CCH Tagetik automatisent ce processus.","A group owns several companies, often across countries and currencies. Consolidation adds up their accounts, translates them into one currency, removes everything they trade among themselves and replaces the shares held with the assets actually controlled. The result is a single income statement and balance sheet, required by law (IFRS for listed groups), banks and investors. Tools such as Oracle FCCS, OneStream or CCH Tagetik automate this process.")}</p></div>
    <div class="ov-vals">
      <div class="ov-val"><b>${X("Une obligation légale","A legal requirement")}</b><span>${X("Les groupes au-delà de certains seuils doivent publier des comptes consolidés.","Groups above certain thresholds must publish consolidated accounts.")}</span></div>
      <div class="ov-val"><b>${X("La vraie taille du groupe","The group's true size")}</b><span>${X("Sans flux internes, le chiffre d'affaires et les marges sont exacts.","Without internal flows, revenue and margins are accurate.")}</span></div>
      <div class="ov-val"><b>${X("Une clôture plus rapide","A faster close")}</b><span>${X("Les règles standard remplacent les retraitements manuels.","Standard rules replace manual adjustments.")}</span></div></div></div>
  <div><h3 class="sec">${X("Pourquoi un outil plutôt qu'Excel ?","Why a tool rather than Excel?")}</h3><p class="sec">${X("Un tableur suffit pour deux sociétés dans la même devise. Au-delà, les risques d'erreur et les délais explosent.","A spreadsheet is fine for two companies in one currency. Beyond that, errors and delays multiply.")}</p>
    <div class="vs" role="table"><div class="h k0"></div><div class="h">${X("Avec des tableurs","With spreadsheets")}</div><div class="h good">${X("Avec un outil de consolidation","With a consolidation tool")}</div>${vs.map(r=>`<div class="k">${r[0]}</div><div class="bad">${esc(r[1])}</div><div>${esc(r[2])}</div>`).join("")}</div></div>
  <div><h3 class="sec">${X("Le processus de consolidation","The consolidation process")}</h3><p class="sec">${X("Chaque étape correspond à un onglet de la démo : cliquez pour y aller.","Each step matches a tab in the demo: click to go there.")}</p>
    <div class="cycle">${steps.map((s,i)=>`<button data-goto="${s[0]}"><span class="n">${String(i+1).padStart(2,"0")}</span><span class="t">${s[1]}</span><span class="d">${s[2]}</span><span class="go">${X("Voir l'étape →","See this step →")}</span></button>`).join("")}</div>
    <p class="loop">↻ ${X("Le processus se répète à chaque clôture : mensuelle, trimestrielle ou semestrielle.","The process repeats at every close: monthly, quarterly or half-yearly.")}</p></div>
  <div class="built"><div>
    <p class="ov-eyebrow">${X("Ce que j'ai construit","What I built")}</p>
    <h3>${X("Lumen Consol, un simulateur de consolidation qui calcule vraiment","Lumen Consol, a consolidation simulator that really calculates")}</h3>
    <p>${X("Il suit la logique d'Oracle FCCS, sur lequel j'ai travaillé comme consultant : liasses locales, conversion, rapprochement et éliminations intragroupe, élimination des titres, goodwill et intérêts minoritaires, jusqu'aux états consolidés.","It follows the logic of Oracle FCCS, which I have worked on as a consultant: local packages, translation, intercompany matching and eliminations, investment elimination, goodwill and non-controlling interests, through to consolidated statements.")}</p>
    <p>${X("Le groupe : Maison Lumen SAS, en France, et ses filiales au Royaume-Uni, aux États-Unis (détenue à 80 %) et en Inde. Clôture semestrielle au 30 juin 2026.","The group: Maison Lumen SAS in France and its subsidiaries in the United Kingdom, the United States (80% owned) and India. Half-year close at 30 June 2026.")}</p>
    <ul><li>${X("Changez un taux de change ou une donnée locale : l'impact est tracé jusqu'aux comptes consolidés.","Change an exchange rate or a local figure: the impact flows through to the consolidated accounts.")}</li><li>${X("Chaque écriture d'élimination est affichée en débit / crédit et expliquée.","Every elimination entry is shown as debits and credits, and explained.")}</li><li>${X("Conforme aux règles IFRS clés : goodwill au taux de clôture (IAS 21), impôt différé sur les marges internes (IAS 12), état du résultat global et capitaux propres part du groupe (IAS 1).","Aligned with key IFRS rules: goodwill at the closing rate (IAS 21), deferred tax on internal margins (IAS 12), statement of comprehensive income and equity attributable to owners (IAS 1).")}</li><li>${X("Les corrections passent par des journaux approuvés, comme dans FCCS : brouillon, soumis, approuvé, comptabilisé.","Corrections go through approved journals, as in FCCS: working, submitted, approved, posted.")}</li><li>${X("Disponible en français et en anglais.","Available in French and English.")}</li></ul>
    <div class="ctas"><button class="btn primary" id="tour-start-3">${X("Lancer la visite guidée (8 étapes)","Start the guided tour (8 steps)")}</button><button class="btn" data-goto="group">${X("Voir le groupe","See the group")}</button></div>
    <p class="byline" style="margin-top:14px">${X("Conçu et développé par","Designed and built by")} <strong>Gaurav Sharma</strong> · ${X("Consultant Oracle EPM (FCCS, EPBCS)","Oracle EPM consultant (FCCS, EPBCS)")}</p></div>
    <div class="facts"><div><b>${X("4 entités","4 entities")}</b>${X("France, Royaume-Uni, États-Unis, Inde","France, UK, US, India")}</div><div><b>${X("4 devises","4 currencies")}</b>EUR, GBP, USD, INR</div><div><b>${X("9 flux intragroupe","9 intercompany flows")}</b>${X("Ventes, dettes, prêt, intérêts, dividende","Sales, balances, loan, interest, dividend")}</div><div><b>${X("Éliminations et journaux","Eliminations and journals")}</b>${X("E1 à E6 automatiques, journaux approuvés","E1 to E6 automatic, approved journals")}</div><div><b>${X("11 dimensions","11 dimensions")}</b>${X("9 système + Currency et Intercompany","9 system + Currency and Intercompany")}</div><div><b>${X("Données fictives","Fictional data")}</b>${X("Aucune donnée client réelle","No real client data")}</div></div></div>
  </div>`;
}

/* ---------- group ---------- */
function viewGroup(){
  const node=e=>`<div class="node${e.parent?" parent":""}"><div class="row"><span class="code">${e.id} · ${e.ccy}</span>${stChip(e.id)}</div><span class="nm">${esc(e.name)}</span><span class="meta">${L(e.cty)} · ${L(e.role)}</span><span class="meta">${e.parent?X("Société consolidante","Consolidating entity"):X(`Intégration globale · acquise en ${e.acq}`,`Full consolidation · acquired ${e.acq}`)}</span>${e.pct&&e.pct<1?`<span class="meta"><b>${X(`Intérêts minoritaires : ${nf((1-e.pct)*100)} %`,`Non-controlling interests: ${nf((1-e.pct)*100)}%`)}</b></span>`:""}</div>`;
  const done=!!S.snap&&!S.impacted.length;
  const procs=[X("Liasses locales","Local packages"),X("Conversion","Translation"),X("Rapprochement","Matching"),X("Éliminations","Eliminations"),X("Titres & minoritaires","Investments & NCI"),X("États consolidés","Statements")];
  return `
  <div class="formbar" style="margin-top:0;margin-bottom:14px"><div><b>${X("Périmètre de consolidation","Consolidation scope")}</b> · <span class="muted">${L(PERIOD)}</span></div><span class="grow"></span><button class="btn primary" id="consolidate">${S.snap?X("Reconsolider le groupe","Consolidate again"):X("Consolider le groupe","Consolidate the group")}</button></div>
  <div class="org">${node(ENT[0])}<div class="stem"></div><div class="bar"></div>
    <div class="kids">${SUBS.map(s=>`<div class="kid"><div class="stem"></div><span class="pct">${nf(s.pct*100)} %</span>${node(s)}</div>`).join("")}</div></div>
  <div class="sectitle"><h2>${X("Étapes du processus","Process steps")}</h2><p>${S.snap?X(`Dernière consolidation : ${showTs(S.snap.ts)}`,`Last consolidation: ${showTs(S.snap.ts)}`):X("Pas encore consolidé","Not consolidated yet")}</p></div>
  <div class="proc">${procs.map((p,i)=>`<div class="${done?"done":""}"><span class="n">${String(i+1).padStart(2,"0")}</span><b>${p}</b></div>`).join("")}</div>
  ${S.runs.length?`<div class="sectitle"><h2>${X("Journal des consolidations","Consolidation log")}</h2></div><div class="tblbox"><table class="tbl"><thead><tr><th>${X("Horodatage","Time")}</th><th class="r">${X("Résultat net part du groupe","Net income, group share")}</th><th class="r">${X("Écart de conversion","Translation reserve")}</th><th class="r">${X("Intragroupe en suspens","IC suspense")}</th><th>${X("Contrôles","Checks")}</th></tr></thead><tbody>${S.runs.slice(0,8).map(r=>`<tr><td class="mono">${showTs(r.ts)}</td><td class="r mono">${keur(r.gni)}</td><td class="r mono">${keur(r.cta)}</td><td class="r mono">${k1(r.plug)}</td><td><span class="sev ${r.ok?"ok":"e"}">${r.ok?"OK":X("À revoir","Review")}</span></td></tr>`).join("")}</tbody></table></div>`:""}`;
}
function runConsolidation(){
  const prev=S.snap;S.snap=consolidate();const s=S.snap;S.impacted=[];
  S.runs.unshift({ts:s.ts,gni:s.groupNI,cta:s.cons.CTA,plug:s.plug,ok:s.balanced&&s.matching.every(m=>m.st!=="ko")});S.runs=S.runs.slice(0,20);
  const ko=s.matching.filter(m=>m.st==="ko").length;
  explain(()=>({title:X("Groupe consolidé","Group consolidated"),body:X(`Les quatre liasses ont été converties en euros, ${s.entries.length} écritures d'élimination passées (E1 à E6) et les états consolidés recalculés. Résultat net part du groupe : ${keur(s.groupNI)}${prev?` (précédemment ${keur(prev.groupNI)})`:""} ; participations ne donnant pas le contrôle : ${keur(s.nciNI)} ; goodwill au taux de clôture : ${keur(s.cons.GW)}. Écarts de conversion de la période en résultat global : ${keur(s.oci)}. Le bilan ${s.balanced?"s'équilibre":"ne s'équilibre pas"} à ${keur(s.TA)}. Les écarts intragroupe tolérés (${k1(s.icFx)} k€) restent en résultat financier.${ko?` Attention : ${ko} écart(s) dépassent le seuil de tolérance et sont isolés en compte d'attente (${k1(s.plug)} k€) jusqu'à correction.`:""}`,
    `The four packages were translated into euros, ${s.entries.length} elimination entries posted (E1 to E6) and the consolidated statements recalculated. Net income, group share: ${keur(s.groupNI)}${prev?` (previously ${keur(prev.groupNI)})`:""}; non-controlling interests: ${keur(s.nciNI)}; goodwill at the closing rate: ${keur(s.cons.GW)}. Exchange differences for the period in other comprehensive income: ${keur(s.oci)}. The balance sheet ${s.balanced?"balances":"does not balance"} at ${keur(s.TA)}. Tolerated intercompany differences (${k1(s.icFx)} k€) stay in the finance result.${ko?` Warning: ${ko} difference(s) exceed the tolerance and sit in a suspense account (${k1(s.plug)} k€) until corrected.`:""}`)}));
  render();toast(X("Consolidation terminée","Consolidation complete"));
}

/* ---------- local data ---------- */
function viewLocal(){
  const e=S.ent,E=entById[e],d=S.data[e],D=effData(e),J=eiAdj(e),c=sym(E.ccy),ics=S.ic.filter(x=>x.e===e);
  const hasJ=Object.values(J).some(v=>Math.abs(v)>.0001);
  const jc=a=>hasJ?`<td class="r mono">${J[a]?sgn(J[a],J[a]%1?1:0):"·"}</td><td class="r mono">${nf(D[a],D[a]%1?1:0)}</td>`:"";
  const jcV=(v,t)=>hasJ?`<td class="r mono">${Math.abs(v-t)>.0001?sgn(t-v,1):"·"}</td><td class="r mono">${nf(t,t%1?1:0)}</td>`:"";
  const partnerRows=a=>ics.filter(x=>x.acc===a).map(x=>{const eff=icAmt(x);return `<tr class="icrow"><td>${X("dont intragroupe","of which intercompany")} → ${x.p}${x.kind==="div"?X(" (dividende)"," (dividend)"):x.kind==="int"?X(" (intérêts)"," (interest)"):""}</td><td class="r"><input class="icin" id="ic-${x.id}" data-ic="${x.id}" value="${nf(x.amt,x.amt%1?1:0)}" inputmode="decimal" aria-label="${x.id}"></td>${jcV(x.amt,eff)}</tr>`}).join("");
  const plRow=a=>`<tr><td>${accL(a)}</td><td class="r"><input class="icin" data-pl="${a}" value="${nf(d[a])}" inputmode="decimal" aria-label="${accL(a)}"></td>${jc(a)}</tr>${partnerRows(a)}`;
  const bsRow=(a,v,vt)=>`<tr${a==="CASH"?' class="ctarow"':""}><td>${accL(a)}${a==="CASH"?` <span class="muted" style="font-weight:400">(${X("équilibre","balancing")})</span>`:""}</td><td class="r mono">${nf(v)}</td>${hasJ?jcV(v,vt==null?v:vt):""}</tr>${partnerRows(a)}`;
  const n=ni(d),nT=ni(D),cs=cash(d),csT=cash(D),ta=LOCAL_A.reduce((s,a)=>s+(a==="CASH"?cs:d[a]),0),taT=LOCAL_A.reduce((s,a)=>s+(a==="CASH"?csT:D[a]),0),tl=d.CAP+d.RES+n+d.LOANS+d.PAY,tlT=D.CAP+D.RES+nT+D.LOANS+D.PAY;
  const ebit=x=>x.REV+x.COGS+x.PERS+x.OPEX+x.DEP;
  const plRows=PL.map(a=>a==="FIN"?`<tr class="totrow"><td>${accL("EBIT")}</td><td class="r mono">${nf(ebit(d))}</td>${hasJ?jcV(ebit(d),ebit(D)):""}</tr>${plRow(a)}`:plRow(a)).join("");
  const hd=hasJ?`<th class="r">${X("Données chargées","Data input")}</th><th class="r">${X("Journaux","Journal input")}</th><th class="r">Total</th>`:`<th class="r">${c}</th>`;
  return `
  <div class="pov"><label>${X("Entité","Entity")}<select id="ent-sel">${ENT.map(x=>`<option value="${x.id}" ${x.id===e?"selected":""}>${x.id} · ${esc(x.name)}</option>`).join("")}</select></label>
    <label>${X("Devise locale","Local currency")}<span class="fixed">${E.ccy}</span></label><label>${X("Période","Period")}<span class="fixed">${X("S1 2026","H1 2026")}</span></label><label>${X("Consolidation","Consolidation")}<span class="fixed">Entity Input</span></label>
    <span class="spacer"></span><label>${X("Statut","Status")}<span style="text-transform:none;letter-spacing:0">${stChip(e)}</span></label></div>
  ${hasJ?`<p class="muted" style="margin:10px 0 0;font-size:12.5px">${X(`Montants en ${c}. La dimension Data Source sépare les données chargées des journaux comptabilisés (${postedJ("EI").filter(j=>j.lines.some(l=>l.e===e)).map(j=>j.label).join(", ")}) : les journaux ne modifient jamais la liasse d'origine.`,`Amounts in ${c}. The Data Source dimension keeps loaded data apart from posted journals (${postedJ("EI").filter(j=>j.lines.some(l=>l.e===e)).map(j=>j.label).join(", ")}): journals never overwrite the original package.`)}</p>`:""}
  <div class="two">
    <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Compte de résultat","Income statement")}</th>${hd}</tr></thead><tbody>${plRows}<tr class="totrow"><td>${accL("NI")}</td><td class="r mono">${nf(n)}</td>${hasJ?jcV(n,nT):""}</tr></tbody></table></div>
    <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Bilan au 30 juin","Balance sheet at 30 June")}</th>${hd}</tr></thead><tbody>
      ${LOCAL_A.map(a=>(a==="INV_SUB"||a==="LOAN_IC")&&!d[a]&&!ics.some(x=>x.acc===a)?"":bsRow(a,a==="CASH"?cs:d[a],a==="CASH"?csT:D[a])).join("")}
      <tr class="totrow"><td>${accL("TA")}</td><td class="r mono">${nf(ta)}</td>${hasJ?jcV(ta,taT):""}</tr>
      ${bsRow("CAP",d.CAP,D.CAP)}${bsRow("RES",d.RES,D.RES)}<tr><td>${accL("NI_BS")}</td><td class="r mono">${nf(n)}</td>${hasJ?jcV(n,nT):""}</tr>${d.LOANS||ics.some(x=>x.acc==="LOANS")?bsRow("LOANS",d.LOANS,D.LOANS):""}${bsRow("PAY",d.PAY,D.PAY)}
      <tr class="totrow"><td>${accL("TL")}</td><td class="r mono">${nf(tl)}</td>${hasJ?jcV(tl,tlT):""}</tr></tbody></table>
      <p class="muted" style="margin:8px 12px;font-size:12.5px">${Math.abs(taT-tlT)<.5?"✓ "+X("Liasse équilibrée","Package balances"):"▲ "+X("Liasse déséquilibrée","Package does not balance")}${E.parent?"":" · "+X(`Réserves à l'acquisition (${E.acq}) : ${nf(E.resAcq)} ${c}`,`Reserves at acquisition (${E.acq}): ${nf(E.resAcq)} ${c}`)}</p></div>
  </div>`;
}

/* ---------- translation ---------- */
function viewConv(){
  const e=S.ent==="FR"?"UK":S.ent,E=entById[e],d=effData(e),t=translate(e),c=sym(E.ccy);
  const r=t.rates,RL={close:X("Clôture","Closing"),avg:X("Moyen","Average"),hist:X("Acquisition","Acquisition"),hres:X("Historique (réserves)","Historical (reserves)")};
  const row=(a,v,rt,cls)=>`<tr${cls?` class="${cls}"`:""}><td>${accL(a)}</td><td class="r mono">${v==null?"—":nf(v)}</td><td>${rt?RL[rt]:"—"}</td><td class="r mono">${rt?rateF(E.ccy,r[rt]):"—"}</td><td class="r mono">${nf(t[a==="NI_BS"?"NI":a])}</td></tr>`;
  const rowX=(lab,v,rl,rv,eur,cls)=>`<tr${cls?` class="${cls}"`:""}><td>${lab}</td><td class="r mono">${nf(v)}</td><td>${rl}</td><td class="r mono">${rv==null?"—":rateF(E.ccy,rv)}</td><td class="r mono">${nf(eur)}</td></tr>`;
  const divRate=t.div?-t.DIV/t.div:null;
  const ctas=SUBS.map(s=>({s,t:translate(s.id)}));
  const ri=(k,f,lab)=>`<td class="r"><input class="ratein" data-rate="${k}|${f}" value="${rateF(k,S.rates[k][f])}" inputmode="decimal" aria-label="${k} ${lab}"></td>`;
  const ro=(k,f,lab,last)=>`<td class="r"${last?' style="padding-right:0"':""}><input class="ratein ro" value="${rateF(k,S.rates[k][f])}" readonly aria-label="${k} ${lab}"></td>`;
  return `
  <div class="twocol" style="margin-top:0">
  <div class="panelcard"><h3>${X("Taux de change (1 unité = x EUR)","Exchange rates (1 unit = x EUR)")}</h3>
    <div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="padding-left:0">${X("Devise","Currency")}</th><th class="r">${X("Clôture 30/06","Closing 30/06")}</th><th class="r">${X("Moyen S1","H1 average")}</th><th class="r">${X("Ouverture 01/01","Opening 01/01")}</th><th class="r">${X("Acquisition","Acquisition")}</th><th class="r" style="padding-right:0">${X("Hist. réserves","Hist. reserves")}</th></tr></thead><tbody>
    ${Object.keys(S.rates).map(k=>`<tr><td class="mono" style="padding-left:0">${k}</td>${ri(k,"close","closing")}${ri(k,"avg","average")}${ro(k,"open","opening")}${ro(k,"hist","acquisition")}${ro(k,"hres","historical reserves",1)}</tr>`).join("")}</tbody></table></div>
    <div class="presets" style="margin:4px 0 0"><span class="lab">${X("Scénarios de change","FX scenarios")}</span><button class="btn" data-fx="gbp">${X("Livre sterling −5 %","Pound sterling −5%")}</button><button class="btn" data-fx="usd">${X("Dollar +5 %","Dollar +5%")}</button><button class="btn" data-fx="inr">${X("Roupie −8 %","Rupee −8%")}</button><button class="btn ghost" data-fx="reset">${X("Taux d'origine","Original rates")}</button></div>
    ${why("Les capitaux propres ne sont jamais reconvertis : le capital et les réserves d'avant l'acquisition gardent le taux d'acquisition, les réserves accumulées depuis gardent les taux des années où elles ont été gagnées (reportés de clôture en clôture). Le taux d'ouverture sert à isoler l'écart de conversion de la période.","Equity is never retranslated: capital and pre-acquisition reserves keep the acquisition rate, and reserves earned since keep the rates of the years they were earned (carried forward from one close to the next). The opening rate isolates the period's exchange difference.")}</div>
  <div class="panelcard"><h3>${X("Écart de conversion par filiale","Translation reserve by subsidiary")}</h3>
    <table class="tbl"><thead><tr><th style="padding-left:0">${X("Filiale","Subsidiary")}</th><th class="r">${X("Cumul au 30/06","Cumulative at 30/06")}</th><th class="r" style="padding-right:0">${X("dont variation S1 (OCI)","of which H1 movement (OCI)")}</th></tr></thead><tbody>${ctas.map(x=>`<tr><td style="padding-left:0">${x.s.id} · ${x.s.ccy}</td><td class="r mono">${keur(x.t.CTA)}</td><td class="r mono" style="padding-right:0">${sgn(x.t.OCI)} k€</td></tr>`).join("")}
    <tr class="totrow"><td style="padding-left:0">${X("Total (avant goodwill et minoritaires)","Total (before goodwill and NCI)")}</td><td class="r mono">${keur(ctas.reduce((s,x)=>s+x.t.CTA,0))}</td><td class="r mono" style="padding-right:0">${sgn(ctas.reduce((s,x)=>s+x.t.OCI,0))} k€</td></tr></tbody></table>
    <p class="muted" style="margin:0;font-size:12.5px">${X("Calculé en direct sur les taux saisis ; les états consolidés se mettent à jour à la prochaine consolidation. La variation de la période passe en autres éléments du résultat global ; celle du goodwill s'y ajoute en consolidation.","Calculated live from the rates entered; the consolidated statements update at the next consolidation. The period's movement goes through other comprehensive income; the goodwill movement is added at consolidation.")}</p></div></div>
  <div class="pov" style="margin-top:16px"><label>${X("Filiale","Subsidiary")}<select id="conv-ent">${SUBS.map(x=>`<option value="${x.id}" ${x.id===e?"selected":""}>${x.id} · ${esc(x.name)} (${x.ccy})</option>`).join("")}</select></label><span class="spacer"></span><label>${X("Statut","Status")}<span style="text-transform:none;letter-spacing:0">${stChip(e)}</span></label></div>
  <div class="tblbox" style="margin-top:12px"><table class="tbl"><thead><tr><th>${X("Compte","Account")}</th><th class="r">${c}</th><th>${X("Taux appliqué","Rate applied")}</th><th class="r">${X("Taux","Rate")}</th><th class="r">k€</th></tr></thead><tbody>
    ${PL.map(a=>row(a,d[a],"avg")).join("")}<tr class="totrow"><td>${accL("NI")}</td><td class="r mono">${nf(ni(d))}</td><td>${X("Somme","Sum")}</td><td></td><td class="r mono">${nf(t.NI)}</td></tr>
    ${LOCAL_A.filter(a=>a!=="INV_SUB"&&a!=="LOAN_IC").map(a=>row(a,a==="CASH"?cash(d):d[a],"close")).join("")}
    ${row("LOANS",d.LOANS,"close")}${row("PAY",d.PAY,"close")}${row("CAP",d.CAP,"hist")}
    ${rowX(X(`Réserves à l'acquisition (${E.acq})`,`Reserves at acquisition (${E.acq})`),E.resAcq,RL.hist,r.hist,t.RES_ACQ)}
    ${rowX(X("Réserves accumulées depuis (ouverture)","Reserves earned since (opening)"),t.resOpen-E.resAcq,RL.hres,r.hres,t.RES_POST)}
    ${t.div?rowX(X("Dividendes versés sur la période","Dividends paid in the period"),-t.div,X("Jour du paiement","Payment date"),divRate,t.DIV):""}
    <tr><td>${accL("NI_BS")}</td><td class="r mono">${nf(ni(d))}</td><td>${X("Taux moyen (via le résultat)","Average rate (via the P&L)")}</td><td></td><td class="r mono">${nf(t.NI)}</td></tr>
    <tr class="ctarow"><td>${accL("CTA")}</td><td class="r mono">—</td><td colspan="2">${X("Solde : actif − dettes − capitaux propres convertis","Balance: assets − liabilities − translated equity")}</td><td class="r mono">${nf(t.CTA)}</td></tr></tbody></table></div>`;
}

/* ---------- intercompany ---------- */
function drcr(acc,amt){const asset=ASSETS.includes(acc);const debit=asset?amt>0:amt<0;return {dr:debit?Math.abs(amt):0,cr:debit?0:Math.abs(amt)}}
function entryHtml(en){
  const tot=en.lines.reduce((s,l)=>{const x=drcr(l.acc,l.amt);return {dr:s.dr+x.dr,cr:s.cr+x.cr}},{dr:0,cr:0});
  const expl={E1:X("La vente interne disparaît du chiffre d'affaires du vendeur et du coût des ventes de l'acheteur.","The internal sale is removed from the seller's revenue and the buyer's cost of sales."),E2:X("Les intérêts reçus par la mère et payés par la filiale s'annulent.","Interest received by the parent and paid by the subsidiary cancel out."),E3:X("Le dividende n'est qu'un transfert interne : on l'ôte du résultat de la mère et on le rend aux réserves.","The dividend is only an internal transfer: it is removed from the parent's result and returned to reserves."),E4:X("La créance de l'un et la dette de l'autre s'annulent. Un écart toléré (change, arrondi) reste en résultat financier (IAS 21.45) ; un écart à analyser est isolé en compte d'attente jusqu'à sa correction.","One company's receivable and the other's payable cancel out. A tolerated difference (FX, rounding) stays in the finance result (IAS 21.45); a difference to investigate is parked in a suspense account until corrected."),E5:X(`UK détient encore ${nf(S.upi.stock)} k£ de produits achetés à FR. La marge de FR (${nf(S.upi.margin*100)} %) n'est pas réalisée pour le groupe tant que le produit n'est pas vendu à un client externe. Son élimination crée un impôt différé actif au taux de l'acheteur, UK (${nf(TAXR.UK*100)} %, IAS 12).`,`UK still holds ${nf(S.upi.stock)} k£ of goods bought from FR. FR's margin (${nf(S.upi.margin*100)}%) is not realised for the group until the goods are sold to an outside customer. Eliminating it creates a deferred tax asset at the buyer's rate, UK (${nf(TAXR.UK*100)}%, IAS 12).`),E6:X("Les titres de la mère sont remplacés par la quote-part des capitaux propres acquis ; l'écart est le goodwill, converti au taux de clôture (IAS 21.47), sa variation de change allant en écart de conversion. La part des capitaux propres et du résultat qui revient aux associés extérieurs passe en participations ne donnant pas le contrôle.","The parent's shares are replaced by its share of the equity acquired; the difference is goodwill, translated at the closing rate (IAS 21.47), with its exchange movement going to the translation reserve. The share of equity and income belonging to outside shareholders moves to non-controlling interests.")}[en.code];
  return `<div class="entry"><div class="top"><b><span class="code">${en.code}</span> · ${esc(L(en))}</b><span class="muted" style="font-size:12px">${Math.abs(tot.dr-tot.cr)<.05?"✓ "+X("Écriture équilibrée","Balanced entry"):"▲"}</span></div>${expl?`<p>${expl}</p>`:""}
    <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Compte","Account")}</th><th>${X("Entité","Entity")}</th><th class="r">${X("Débit","Debit")}</th><th class="r">${X("Crédit","Credit")}</th></tr></thead><tbody>${en.lines.map(l=>{const x=drcr(l.acc,l.amt);return `<tr><td>${accL(l.acc)}</td><td class="mono">${l.e||X("Groupe","Group")}</td><td class="r mono">${x.dr?k1(x.dr):""}</td><td class="r mono">${x.cr?k1(x.cr):""}</td></tr>`}).join("")}<tr class="totrow"><td colspan="2">Total</td><td class="r mono">${k1(tot.dr)}</td><td class="r mono">${k1(tot.cr)}</td></tr></tbody></table></div></div>`;
}
function viewIC(){
  const M=matching(),stc={ok:`<span class="chip st-ok">${X("Rapproché","Matched")}</span>`,tol:`<span class="chip st-nd">${X("Écart toléré","Within tolerance")}</span>`,fx:`<span class="chip st-nd">${X("Écart de change","FX difference")}</span>`,ko:`<span class="chip st-imp">${X("À analyser","To investigate")}</span>`};
  const ko=M.filter(m=>m.st==="ko");
  return `
  <div class="formbar" style="margin-top:0;margin-bottom:12px"><b>${X("Rapprochement intragroupe","Intercompany matching")}</b><span class="muted">${X("en k€, convertis","in k€, translated")}</span><span class="grow"></span><label class="check">${X("Seuil de tolérance","Tolerance")} <input class="ratein" id="tol" value="${nf(S.tol)}" inputmode="decimal" style="width:70px"> k€</label></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Flux","Flow")}</th><th>${X("Entité A","Entity A")}</th><th class="r">k€</th><th>${X("Entité B","Entity B")}</th><th class="r">k€</th><th class="r">${X("Écart","Difference")}</th><th>${X("Statut","Status")}</th></tr></thead><tbody>
  ${M.map(m=>`<tr><td>${esc(L(m))}</td><td class="mono">${m.A.e} · ${m.A.acc==="LOAN_IC"?"LOAN":m.A.acc}</td><td class="r mono">${k1(m.a)}</td><td class="mono">${m.B.e} · ${m.B.acc}</td><td class="r mono">${k1(m.b)}</td><td class="r mono">${sgn(m.d,1)}</td><td>${stc[m.st]}</td></tr>`).join("")}</tbody></table></div>
  ${M.some(m=>m.st==="fx")?`<p class="muted" style="margin:8px 0 0;font-size:12.5px">${X("« Écart de change » : les deux sociétés sont d'accord dans leur devise, mais la variation du taux crée un écart en euros. C'est un vrai effet de change pour le groupe : il est accepté sans analyse et reste en résultat financier (IAS 21.45).","“FX difference”: both companies agree in their own currency, but the rate change creates a gap in euros. It is a real exchange effect for the group: it is accepted with no investigation and stays in the finance result (IAS 21.45).")}</p>`:""}
  ${ko.length?`<div class="panelcard" style="margin-top:14px;border-color:var(--warn)"><h3>${X("Écart à analyser","Difference to investigate")}</h3>${ko.map(m=>{
    if(m.id!=="P7")return `<p style="margin:0">${esc(L(m))} : ${X("écart de","difference of")} ${sgn(m.d,1)} k€. ${X("Corrigez les montants dans les données locales, ou passez un journal.","Correct the amounts in local data, or post a journal.")}</p>`;
    const j=(S.journals||[]).find(x=>x.label==="US_IC_INTRANSIT_0629");
    return `<p style="margin:0">${X(`La France a facturé 900 k€ aux États-Unis le 29 juin ; la filiale US n'a enregistré que ${nf(icAmt(icById("US-PAY-FR")),1)} k$ (≈ ${k1(m.b)} k€). Une facture de ${nf(100/rateOf("US","close"),1)} k$ est en transit : les marchandises sont expédiées mais pas encore reçues. On ne modifie pas la liasse US : on passe un journal en Entity Input chez US (stock / dette envers FR), qui sera approuvé puis comptabilisé.`,`France invoiced the US 900 k€ on 29 June; the US subsidiary only booked ${nf(icAmt(icById("US-PAY-FR")),1)} k$ (≈ ${k1(m.b)} k€). A ${nf(100/rateOf("US","close"),1)} k$ invoice is in transit: goods are shipped but not yet received. The US package is not edited: instead a journal is posted at Entity Input for US (inventory / payable to FR), then approved and posted.`)}</p><div>${j?`<span class="chip st-${j.status}" style="margin-right:8px">${jst(j.status)}</span><button class="btn" data-openj="${j.id}">${X("Ouvrir le journal","Open the journal")}</button>`:`<button class="btn primary" id="make-jnl">${X("Créer le journal de correction","Create the correcting journal")}</button>`}</div>`}).join("")}</div>`:""}
  <div class="sectitle"><h2>${X("Écritures d'élimination intragroupe (E1 à E5)","Intercompany elimination entries (E1 to E5)")}</h2><p>${X("Issues de la dernière consolidation","From the last consolidation")}</p></div>
  ${staleBanner()}
  ${S.snap?`<div class="jr">${S.snap.entries.filter(x=>x.group==="ic").map(entryHtml).join("")}</div>`:""}`;
}

/* ---------- investments & NCI ---------- */
function viewEq(){
  if(!S.snap)return staleBanner();
  const s=S.snap;
  return `${staleBanner()}<div class="gwgrid">${SUBS.map(sub=>{const q=s.eq[sub.id],h=s.T[sub.id].rates.hist;
    return `<div class="card"><h3><span class="rid">${sub.id} · ${sub.ccy} · ${nf(sub.pct*100)} %</span>${esc(sub.name)}</h3>
    <table class="calc-table" style="width:100%"><tbody>
    <tr><td>${X("Prix payé par FR (titres)","Price paid by FR (shares)")}</td><td class="r">${keur(q.inv)}</td></tr>
    <tr><td>${X(`Capitaux propres à l'acquisition : ${nf(sub.capAcq+sub.resAcq)} ${sym(sub.ccy)} × ${rateF(sub.ccy,h)}`,`Equity at acquisition: ${nf(sub.capAcq+sub.resAcq)} ${sym(sub.ccy)} × ${rateF(sub.ccy,h)}`)}</td><td class="r">${keur(q.AQ)}</td></tr>
    <tr><td>${X(`Quote-part du groupe (${nf(sub.pct*100)} %)`,`Group share (${nf(sub.pct*100)}%)`)}</td><td class="r">${keur(q.AQ*sub.pct)}</td></tr>
    <tr><td>${X("Goodwill à l'acquisition = prix − quote-part","Goodwill at acquisition = price − share")}</td><td class="r">${keur(q.gwH)}</td></tr>
    <tr><td class="muted">${X(`soit en devise : ${nf(q.gwL)} ${sym(sub.ccy)}`,`in local currency: ${nf(q.gwL)} ${sym(sub.ccy)}`)}</td><td class="r muted"></td></tr>
    <tr><td class="muted">${X(`Écart de conversion sur goodwill (taux ${rateF(sub.ccy,s.T[sub.id].rates.close)})`,`Translation difference on goodwill (rate ${rateF(sub.ccy,s.T[sub.id].rates.close)})`)}</td><td class="r muted">${sgn(q.gwCTA)} k€</td></tr>
    <tr class="res"><td>${X("Goodwill au taux de clôture (IAS 21.47)","Goodwill at the closing rate (IAS 21.47)")}</td><td class="r">${keur(q.gw)}</td></tr></tbody></table>
    <table class="calc-table" style="width:100%;margin-top:10px"><tbody>
    <tr><td>${X("Capitaux propres actuels en euros","Current equity in euros")}</td><td class="r">${keur(q.capE+q.resE+q.ctaE+q.niE)}</td></tr>
    <tr><td class="muted">${X("dont résultat de la période","of which net income")}</td><td class="r muted">${keur(q.niE)}</td></tr>
    <tr><td class="muted">${X("dont écart de conversion","of which translation reserve")}</td><td class="r muted">${keur(q.ctaE)}</td></tr>
    <tr class="res"><td>${X(`Participations ne donnant pas le contrôle (${nf((1-sub.pct)*100)} %)`,`Non-controlling interests (${nf((1-sub.pct)*100)}%)`)}</td><td class="r">${keur(q.nci)}</td></tr></tbody></table>
    ${sub.pct<1?why("20 % de la filiale américaine appartient à un associé local : le groupe consolide 100 % de ses comptes, mais cette part est isolée en capitaux propres, dans le résultat et dans le résultat global. Elle est évaluée à sa quote-part de l'actif net, sans goodwill (option d'IFRS 3.19, dite « goodwill partiel »).","20% of the US subsidiary belongs to a local partner: the group consolidates 100% of its accounts, but that share is shown separately in equity, net income and comprehensive income. It is measured at its share of net assets, with no goodwill (the IFRS 3.19 “partial goodwill” option)."):""}</div>`}).join("")}</div>
  <div class="sectitle"><h2>${X("Écritures d'élimination des titres (E6)","Investment elimination entries (E6)")}</h2></div>
  <div class="jr">${s.entries.filter(x=>x.group==="eq").map(entryHtml).join("")}</div>`;
}

/* ---------- journals ---------- */
const jst=st=>X({working:"Brouillon",submitted:"Soumis",approved:"Approuvé",posted:"Comptabilisé"}[st],{working:"Working",submitted:"Submitted",approved:"Approved",posted:"Posted"}[st]);
const jacts={create:["Création","Created"],submit:["Soumis","Submitted"],approve:["Approuvé","Approved"],reject:["Rejeté","Rejected"],post:["Comptabilisé","Posted"],unpost:["Comptabilisation annulée","Unposted"],edit:["Modifié","Edited"]};
const jccy=(j,l)=>j.cons==="EI"?entById[l.e].ccy:"EUR";
function scanJ(j){
  const out=[],E=(fr,en)=>out.push({sev:"e",msg:X(fr,en)}),W=(fr,en)=>out.push({sev:"w",msg:X(fr,en)});
  if(!j.label)E("Libellé obligatoire.","A label is required.");
  else if(/[.+\-*/#{};,@"'\s]/.test(j.label))E("Le libellé contient un caractère interdit (. + - * / # { } ; , @, guillemets ou espace).","The label contains a forbidden character (. + - * / # { } ; , @, quotes or space).");
  else if(S.journals.some(x=>x!==j&&x.label===j.label))E("Ce libellé existe déjà.","This label already exists.");
  if(!txt(j.desc))W("Ajoutez une description : les auditeurs la liront.","Add a description: auditors will read it.");
  const ls=j.lines.filter(l=>(+l.dr||0)||(+l.cr||0));
  if(ls.length<2)E("Un journal doit comporter au moins deux lignes avec montant.","A journal needs at least two lines with an amount.");
  j.lines.forEach((l,i)=>{const n=i+1;if((+l.dr||0)<0||(+l.cr||0)<0)E(`Ligne ${n} : montant négatif.`,`Line ${n}: negative amount.`);
    if((+l.dr||0)&&(+l.cr||0))E(`Ligne ${n} : débit et crédit sur la même ligne.`,`Line ${n}: debit and credit on the same line.`);
    if(l.icp&&l.icp===l.e)E(`Ligne ${n} : le partenaire intragroupe ne peut pas être l'entité elle-même.`,`Line ${n}: the intercompany partner cannot be the entity itself.`)});
  if(j.bal==="balanced"){
    if(j.cons==="EI"){const by={};j.lines.forEach(l=>{by[l.e]=(by[l.e]||0)+(+l.dr||0)-(+l.cr||0)});Object.entries(by).forEach(([e,v])=>{if(Math.abs(v)>.005)E(`Non équilibré pour ${e} : écart de ${nf(v,2)} ${sym(entById[e].ccy)}. En Entity Input, chaque entité s'équilibre dans sa devise.`,`Not balanced for ${e}: difference of ${nf(v,2)} ${sym(entById[e].ccy)}. At Entity Input each entity balances in its own currency.`)})}
    else{const v=j.lines.reduce((t,l)=>t+(+l.dr||0)-(+l.cr||0),0);if(Math.abs(v)>.005)E(`Journal non équilibré : écart de ${nf(v,2)} k€.`,`Journal not balanced: difference of ${nf(v,2)} k€.`)}}
  else W("Journal déséquilibré autorisé : l'écart sera absorbé par la trésorerie de l'entité.","Unbalanced journal allowed: the difference will be absorbed by the entity's cash.");
  return out;
}
function jEntities(j){return [...new Set(j.lines.map(l=>l.e))]}
function viewJnl(){
  const js=S.journals,sel=js.find(j=>j.id===S.jsel)||js[0],prep=S.jrole==="preparer",me=JUSERS[S.jrole];
  const tot=j=>j.lines.reduce((t,l)=>t+(+l.dr||0),0);
  const rows=js.map(j=>`<tr class="jrow${sel&&sel.id===j.id?" on":""}" data-jsel="${j.id}"><td class="mono">${esc(j.label||"—")}</td><td>${esc(txt(j.desc)).slice(0,70)}${txt(j.desc).length>70?"…":""}</td><td>${(g=>X(g[0],g[1]))(JGROUPS[j.group]||["—","—"])}</td><td>${j.type==="autorev"?X("Extourne auto.","Auto-reversing"):X("Régulier","Regular")}</td><td class="mono" style="font-size:12px">${j.cons}</td><td class="r mono">${nf(tot(j),1)}</td><td><span class="chip st-${j.status}">${jst(j.status)}</span></td></tr>`
    +(j.status==="posted"&&j.type==="autorev"?`<tr class="jrow rev"><td class="mono">↺ ${esc(j.label)}</td><td>${X("Extourne automatique générée sur la période suivante","Automatic reversal generated in the next period")}</td><td></td><td></td><td class="mono" style="font-size:12px">${j.cons}</td><td class="r mono">${nf(tot(j),1)}</td><td><span class="chip st-sched">${X("Juil. 2026","Jul 2026")}</span></td></tr>`:"")).join("");
  let det="";
  if(sel){const ed=prep&&sel.status==="working",dis=ed?"":"disabled",iss=scanJ(sel),errs=iss.filter(i=>i.sev==="e");
    const ents=ENT.map(e=>e.id),dsum=sel.lines.reduce((t,l)=>t+(+l.dr||0),0),csum=sel.lines.reduce((t,l)=>t+(+l.cr||0),0);
    const lastApprover=[...sel.hist].reverse().find(h=>h.a==="approve");
    const acts=[];
    if(prep){if(sel.status==="working"){acts.push(`<button class="btn" id="j-scan">${X("Scanner","Scan")}</button>`,`<button class="btn primary" id="j-submit" ${errs.length?"disabled":""}>${X("Soumettre","Submit")}</button>`,`<button class="btn danger" id="j-delete">${X("Supprimer","Delete")}</button>`)}
      if(sel.status==="approved")acts.push(`<button class="btn primary" id="j-post">${X("Comptabiliser","Post")}</button>`);
      if(sel.status==="posted")acts.push(`<button class="btn" id="j-unpost">${X("Annuler la comptabilisation","Unpost")}</button>`)}
    else{if(sel.status==="submitted")acts.push(`<button class="btn primary" id="j-approve">${X("Approuver","Approve")}</button>`,`<button class="btn danger" id="j-reject">${X("Rejeter","Reject")}</button>`);
      if(sel.status==="approved")acts.push(`<span class="muted" style="font-size:12.5px">${X(`Approuvé par ${esc(lastApprover?lastApprover.who:me)} : un autre utilisateur doit le comptabiliser (séparation des tâches).`,`Approved by ${esc(lastApprover?lastApprover.who:me)}: another user must post it (segregation of duties).`)}</span>`)}
    det=`<div class="panelcard" style="margin-top:16px">
      <div class="formbar" style="margin:0"><h3 style="margin:0">${X("Journal","Journal")} · <span class="mono" style="text-transform:none">${esc(sel.label||"—")}</span></h3><span class="chip st-${sel.status}">${jst(sel.status)}</span><span class="grow"></span><span class="muted" style="font-size:12.5px">${X("Scénario Actual · FY26 · Juin · Vue Periodic","Scenario Actual · FY26 · Jun · View Periodic")}</span></div>
      <div class="jform">
        <label>${X("Libellé","Label")}<input id="jf-label" data-jf="label" value="${esc(sel.label)}" ${dis} maxlength="50"></label>
        <label>${X("Groupe","Group")}<select data-jf="group" ${dis}>${Object.keys(JGROUPS).map(g=>`<option value="${g}" ${sel.group===g?"selected":""}>${X(JGROUPS[g][0],JGROUPS[g][1])}</option>`).join("")}</select></label>
        <label>${X("Type","Type")}<select data-jf="type" ${dis}><option value="regular" ${sel.type==="regular"?"selected":""}>${X("Régulier","Regular")}</option><option value="autorev" ${sel.type==="autorev"?"selected":""}>${X("Extourne automatique","Auto-reversing")}</option></select></label>
        <label>${X("Équilibre","Balance type")}<select data-jf="bal" ${dis}><option value="balanced" ${sel.bal==="balanced"?"selected":""}>${X("Équilibré","Balanced")}</option><option value="unbalanced" ${sel.bal==="unbalanced"?"selected":""}>${X("Déséquilibré","Unbalanced")}</option></select></label>
        <label style="grid-column:1/-1">${X("Membre de consolidation","Consolidation member")}<select data-jf="cons" ${dis}>${Object.keys(CONSM).map(k=>`<option value="${k}" ${sel.cons===k?"selected":""}>${CONSM[k].code} — ${esc(L(CONSM[k]))}</option>`).join("")}</select></label>
        <label style="grid-column:1/-1">${X("Description","Description")}<input data-jf="desc" value="${esc(txt(sel.desc))}" ${dis} maxlength="255"></label>
      </div>
      <div class="tblbox"><table class="tbl jl"><thead><tr><th>${X("Entité","Entity")}</th><th>${X("Compte","Account")}</th><th>ICP</th><th class="r">${X("Débit","Debit")}</th><th class="r">${X("Crédit","Credit")}</th><th>${X("Devise","Currency")}</th><th>${X("Libellé de ligne","Line description")}</th><th></th></tr></thead><tbody>
      ${sel.lines.map((l,i)=>`<tr><td><select data-jl="${i}|e" ${dis}>${ents.map(e=>`<option ${l.e===e?"selected":""}>${e}</option>`).join("")}</select></td>
        <td><select data-jl="${i}|acc" ${dis}>${JACC.map(a=>`<option value="${a}" ${l.acc===a?"selected":""}>${accL(a)}</option>`).join("")}</select></td>
        <td><select data-jl="${i}|icp" ${dis}><option value="">—</option>${ents.filter(e=>e!==l.e).map(e=>`<option value="${e}" ${l.icp===e?"selected":""}>ICP_${e}</option>`).join("")}</select></td>
        <td><input class="num" data-jl="${i}|dr" value="${l.dr?nf(l.dr,l.dr%1?1:0):""}" inputmode="decimal" ${dis} aria-label="${X("Débit","Debit")}"></td>
        <td><input class="num" data-jl="${i}|cr" value="${l.cr?nf(l.cr,l.cr%1?1:0):""}" inputmode="decimal" ${dis} aria-label="${X("Crédit","Credit")}"></td>
        <td class="mono">${sym(jccy(sel,l))}</td><td><input data-jl="${i}|d" value="${esc(txt(l.d))}" ${dis} maxlength="100"></td>
        <td>${ed&&sel.lines.length>2?`<button class="rm" data-jdel="${i}" aria-label="${X("Supprimer la ligne","Remove line")}">×</button>`:""}</td></tr>`).join("")}
      <tr class="totrow"><td colspan="3">Total</td><td class="r mono">${nf(dsum,1)}</td><td class="r mono">${nf(csum,1)}</td><td colspan="3">${Math.abs(dsum-csum)<.005?"✓ "+X("Équilibré","Balanced"):X("Écart","Difference")+" "+nf(dsum-csum,1)}</td></tr></tbody></table></div>
      ${ed?`<div><button class="btn ghost" id="j-addline">${X("+ Ajouter une ligne","+ Add a line")}</button></div>`:""}
      ${S.jscan===sel.id||!ed?`<ul class="cmts">${iss.length?iss.map(i=>`<li><span class="sev ${i.sev}" style="margin-right:8px">${i.sev==="e"?X("Erreur","Error"):X("Alerte","Warning")}</span>${esc(i.msg)}</li>`).join(""):`<li><span class="sev ok" style="margin-right:8px">OK</span>${X("Scan réussi : le journal peut être soumis.","Scan passed: the journal can be submitted.")}</li>`}</ul>`:""}
      ${S.jreject===sel.id?`<textarea id="j-reject-text" placeholder="${X("Motif du rejet (obligatoire)","Reason for rejection (required)")}" style="width:100%;min-height:54px;border:1px solid var(--line-2);border-radius:6px;padding:6px 8px;font:inherit;background:var(--surface-2);color:var(--ink)"></textarea><div class="acts" style="display:flex;gap:8px"><button class="btn danger" id="j-reject-ok">${X("Confirmer le rejet","Confirm rejection")}</button><button class="btn ghost" id="j-reject-cancel">${X("Annuler","Cancel")}</button></div>`:`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${acts.join("")}</div>`}
      <div><h3 style="margin-bottom:6px">${X("Historique","History")}</h3><ul class="cmts">${sel.hist.slice().reverse().map(h=>`<li><div class="meta">${showTs(h.ts)} · ${esc(h.who)}</div>${L({fr:jacts[h.a][0],en:jacts[h.a][1]})}${h.c?` — ${esc(h.c)}`:""}</li>`).join("")}</ul></div>
    </div>`}
  return `
  <div class="pov" style="margin-bottom:14px"><label>${X("Vous agissez en tant que","You are acting as")}<span class="seg" role="group" style="margin-top:2px"><button type="button" data-jrole="preparer" aria-pressed="${prep}">${X("Préparatrice","Preparer")} · ${JUSERS.preparer}</button><button type="button" data-jrole="approver" aria-pressed="${!prep}">${X("Approbateur (DAF)","Approver (CFO)")} · ${JUSERS.approver}</button></span></label><span class="spacer"></span>${prep?`<button class="btn primary" id="j-new">${X("Nouveau journal","New journal")}</button>`:""}</div>
  <div class="flow">${JSTAT.map(st=>`<span class="chip st-${st}">${jst(st)}</span>`).join('<span class="arrow">→</span>')}</div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Libellé","Label")}</th><th>${X("Description","Description")}</th><th>${X("Groupe","Group")}</th><th>Type</th><th>${X("Membre","Member")}</th><th class="r">${X("Total débit","Total debit")}</th><th>${X("Statut","Status")}</th></tr></thead><tbody>${rows}</tbody></table></div>
  ${det}`;
}
function jlog(j,a,c){j.hist.push({ts:stamp(),who:JUSERS[S.jrole],a,c})}
function jAct(a){
  const j=S.journals.find(x=>x.id===S.jsel);if(!j)return;
  const ex=(t,b)=>explain(()=>({title:t(),body:b()}));
  if(a==="scan"){S.jscan=j.id;const iss=scanJ(j),e=iss.filter(i=>i.sev==="e").length;ex(()=>X("Journal scanné","Journal scanned"),()=>e?X(`${e} erreur(s) bloquent la soumission. Le scan vérifie le libellé, l'équilibre, les montants et les partenaires intragroupe, comme la fonction Scan de FCCS.`,`${e} error(s) block submission. The scan checks the label, balance, amounts and intercompany partners, like the FCCS Scan function.`):X("Aucune erreur bloquante : le journal peut être soumis à l'approbation.","No blocking error: the journal can be submitted for approval."))}
  if(a==="submit"){if(scanJ(j).some(i=>i.sev==="e"))return;j.status="submitted";jlog(j,"submit");ex(()=>X(`${j.label} soumis`,`${j.label} submitted`),()=>X(`Le journal est verrouillé en modification et attend l'approbation de ${JUSERS.approver}. Passez en rôle Approbateur pour le traiter.`,`The journal is locked for editing and awaits approval by ${JUSERS.approver}. Switch to the Approver role to process it.`))}
  if(a==="approve"){j.status="approved";jlog(j,"approve");ex(()=>X(`${j.label} approuvé`,`${j.label} approved`),()=>X(`Approuvé par ${JUSERS.approver}. Il n'est pas encore dans les chiffres : il doit être comptabilisé, et pas par la personne qui l'a approuvé. Repassez en rôle Préparatrice pour le comptabiliser.`,`Approved by ${JUSERS.approver}. It is not in the figures yet: it must be posted, and not by the person who approved it. Switch back to the Preparer role to post it.`))}
  if(a==="post"){j.status="posted";jlog(j,"post");const ents=j.cons==="CI"?["FR"]:jEntities(j);markImpacted(ents);
    ex(()=>X(`${j.label} comptabilisé`,`${j.label} posted`),()=>X(`Les montants sont stockés en Data Source « FCCS_Journal Input », au membre ${CONSM[j.cons].code}, sans toucher aux données chargées. ${j.cons==="EI"?`Ils seront convertis avec le reste de la liasse (voir Données locales : colonne Journaux).`:j.cons==="CI"?`Ils s'appliquent au niveau groupe, après les éliminations (colonne « Journaux groupe » de la feuille).`:`Ils s'ajoutent aux montants convertis de l'entité.`} ${j.type==="autorev"?"Une extourne est générée automatiquement sur juillet 2026. ":""}${ents.join(", ")} passe(nt) « à reconsolider ».`,`Amounts are stored in the “FCCS_Journal Input” data source, at ${CONSM[j.cons].code}, without touching loaded data. ${j.cons==="EI"?`They will be translated with the rest of the package (see Local data: Journals column).`:j.cons==="CI"?`They apply at group level, after eliminations (“Group journals” column in the worksheet).`:`They are added to the entity's translated amounts.`} ${j.type==="autorev"?"A reversal is generated automatically in July 2026. ":""}${ents.join(", ")} now impacted.`))}
  if(a==="unpost"){j.status="approved";jlog(j,"unpost");markImpacted(j.cons==="CI"?["FR"]:jEntities(j));ex(()=>X(`Comptabilisation de ${j.label} annulée`,`${j.label} unposted`),()=>X("Les montants sont retirés de Journal Input ; le journal reste approuvé et peut être recomptabilisé. Les entités concernées sont à reconsolider.","The amounts are removed from Journal Input; the journal stays approved and can be posted again. The entities concerned are impacted."))}
  if(a==="delete"){S.journals=S.journals.filter(x=>x!==j);S.jsel=S.journals[0]&&S.journals[0].id;ex(()=>X("Journal supprimé","Journal deleted"),()=>X("Seul un journal en brouillon peut être supprimé ; un journal comptabilisé doit d'abord être annulé.","Only a working journal can be deleted; a posted journal must be unposted first."))}
  render();
}
function newJournal(pre){
  const id="J"+(Date.now()%1e7);const j=Object.assign({id,label:"",desc:"",group:"Audit",type:"regular",bal:"balanced",cons:"EI",status:"working",lines:[{e:"UK",acc:"OPEX",icp:"",dr:0,cr:0,d:""},{e:"UK",acc:"PAY",icp:"",dr:0,cr:0,d:""}],hist:[]},pre||{});
  j.hist=[{ts:stamp(),who:JUSERS.preparer,a:"create"}];S.journals.push(j);S.jsel=id;S.jrole="preparer";S.jscan=null;return j;
}

/* ---------- worksheet ---------- */
function viewWS(){
  if(!S.snap)return staleBanner();
  const s=S.snap,cols=ENT.map(e=>e.id);
  const v=(o,a)=>o[a]||0;
  const rowOf=(a,lab,cls)=>{const ent=cols.map(id=>{const t=s.T[id];return a==="NI_BS"?t.NI:(t[a]||0)});
    return `<tr${cls?` class="${cls}"`:""}><td class="acc" style="position:sticky;left:0;background:var(--surface)">${lab||accL(a)}</td>${ent.map(x=>`<td class="v">${k0(x)}</td>`).join("")}<td class="v col-agg">${k0(v(s.agg,a))}</td><td class="v col-el">${Math.abs(v(s.colIC,a))>.4?sgn(v(s.colIC,a)):"·"}</td><td class="v col-el">${Math.abs(v(s.colEQ,a))>.4?sgn(v(s.colEQ,a)):"·"}</td><td class="v col-el">${Math.abs(v(s.colJ||{},a))>.4?sgn(v(s.colJ,a)):"·"}</td><td class="v col-cons">${k0(v(s.cons,a))}</td></tr>`};
  const sumRow=(lab,keys,cls)=>{const f=o=>keys.reduce((t,a)=>t+(o[a]||0),0);const ent=cols.map(id=>{const t=s.T[id];return keys.reduce((q,a)=>q+(a==="NI_BS"?t.NI:(t[a]||0)),0)});
    return `<tr class="${cls||"tot"}"><td class="acc" style="position:sticky;left:0;background:var(--cell-tot)">${lab}</td>${ent.map(x=>`<td class="v">${k0(x)}</td>`).join("")}<td class="v col-agg">${k0(f(s.agg))}</td><td class="v col-el">${sgn(f(s.colIC))}</td><td class="v col-el">${sgn(f(s.colEQ))}</td><td class="v col-el">${sgn(f(s.colJ||{}))}</td><td class="v col-cons">${k0(f(s.cons))}</td></tr>`};
  const hd=t=>`<tr class="hd"><td colspan="10">${t}</td></tr>`;
  return `${staleBanner()}
  <div class="gridbox"><table class="grid ws" style="min-width:1080px"><thead><tr><th class="acc">${X("Compte (k€)","Account (k€)")}</th>${cols.map(c=>`<th>${c}</th>`).join("")}<th class="col-agg">${X("Agrégé","Aggregated")}</th><th>${X("Élim. intragroupe","IC elim.")}</th><th>${X("Titres & minoritaires","Investments & NCI")}</th><th>${X("Journaux groupe","Group journals")}</th><th class="col-cons">${X("Consolidé","Consolidated")}</th></tr></thead><tbody>
  ${hd(X("Compte de résultat","Income statement"))}${["REV","COGS","PERS","OPEX","DEP"].map(a=>rowOf(a)).join("")}${sumRow(accL("EBIT"),["REV","COGS","PERS","OPEX","DEP"])}${rowOf("FIN")}${rowOf("TAX")}${sumRow(accL("NI"),PL)}
  ${hd(X("Actif","Assets"))}${ASSETS.map(a=>rowOf(a)).join("")}${sumRow(accL("TA"),ASSETS)}
  ${hd(X("Capitaux propres et passif","Equity and liabilities"))}${LIABS.map(a=>rowOf(a)).join("")}${sumRow(accL("TL"),LIABS)}
  </tbody></table></div>
  <div class="legend-cells"><span><i style="background:var(--surface-2)"></i>${X("Agrégé : somme des entités converties","Aggregated: sum of translated entities")}</span><span><i style="background:var(--accent-soft)"></i>${X("Consolidé : agrégé + éliminations","Consolidated: aggregated + eliminations")}</span><span>${X("Journaux en Entity Input : inclus dans la colonne de l'entité ; en Contribution Input : colonne « Journaux groupe »","Entity Input journals: included in the entity column; Contribution Input: “Group journals” column")}</span><span>${X("« Résultat de la période » au bilan : part du groupe seulement","“Net income for the period” in the balance sheet: group share only")}</span></div>`;
}

/* ---------- statements ---------- */
function viewStm(){
  if(!S.snap)return staleBanner();
  const s=S.snap,c=s.cons,ebit=c.REV+c.COGS+c.PERS+c.OPEX+c.DEP;
  const aggRev=s.agg.REV;
  const kpi=(lab,v,sub)=>`<div class="kpi"><span class="lab">${lab}</span><span class="big">${keur(v)}</span>${sub?`<span class="sub">${sub}</span>`:""}</div>`;
  const line=(a,v,b)=>`<tr${b?` class="${b===2?"subrow":"totrow"}"`:""}><td>${a}</td><td class="r mono">${k0(v)}</td></tr>`;
  const hdr=t=>`<tr class="sechd"><td colspan="2">${t}</td></tr>`;
  const rows=ks=>ks.filter(a=>Math.abs(c[a])>.4).map(a=>line(accL(a)+(a==="PLUG"?" ▲":""),c[a])).join("");
  const tot=ks=>ks.reduce((t,a)=>t+c[a],0);
  // IAS 1 presentation: current / non-current split, equity attributable to owners shown apart from NCI
  const NCA=["GW","PPE","INV_SUB","LOAN_IC","DTA"],CA=["STOCK","REC","CASH"],EQG=["CAP","RES","CTA","NI_BS"],NCL=["LOANS"],CL=["PAY","PLUG"];
  const eqG=tot(EQG),eqT=eqG+c.NCI,tci=s.consNI+s.oci;
  const checks=[[s.balanced,X(`Bilan équilibré : ${keur(s.TA)} à l'actif et au passif`,`Balance sheet balances: ${keur(s.TA)} on both sides`)],
    [s.matching.every(m=>m.st!=="ko")&&Math.abs(c.PLUG)<.05,X("Aucun écart intragroupe en suspens","No intercompany difference left in suspense")],
    [Math.abs(c.INV_SUB)<.5&&Math.abs(c.LOAN_IC)<.5,X("Titres de participation et prêt intragroupe entièrement éliminés","Investments in subsidiaries and intercompany loan fully eliminated")],
    [!S.impacted.length,X("Toutes les entités consolidées avec les dernières données","All entities consolidated with the latest data")]];
  return `${staleBanner()}
  <div class="kpis">${kpi(X("Chiffre d'affaires consolidé","Consolidated revenue"),c.REV,X(`Agrégé ${keur(aggRev)} · éliminé ${keur(-s.colIC.REV)}`,`Aggregated ${keur(aggRev)} · eliminated ${keur(-s.colIC.REV)}`))}
    ${kpi(X("Résultat net part du groupe","Net income, group share"),s.groupNI,X(`Minoritaires ${keur(s.nciNI)} · total ${keur(s.consNI)}`,`NCI ${keur(s.nciNI)} · total ${keur(s.consNI)}`))}
    ${kpi(X("Résultat global total","Total comprehensive income"),tci,X(`dont écarts de conversion ${keur(s.oci)}`,`of which exchange differences ${keur(s.oci)}`))}
    ${kpi(X("Goodwill","Goodwill"),c.GW,X(`Réserve de conversion ${keur(c.CTA)}`,`Translation reserve ${keur(c.CTA)}`))}</div>
  <div class="narr"><p>${esc(X(`Le groupe réalise ${keur(c.REV)} de chiffre d'affaires avec l'extérieur, après élimination de ${keur(-s.colIC.REV)} de ventes internes, soit ${nf(-s.colIC.REV/aggRev*100,1)} % de l'agrégé. Le résultat opérationnel atteint ${keur(ebit)} (${nf(ebit/c.REV*100,1)} % du CA). La marge interne en stock chez UK réduit le résultat de ${keur(s.upi)} avant impôt, ${keur(s.upi-s.dt)} après impôt différé. Les variations de change de la période (${keur(s.oci)}) passent en résultat global, sans toucher le résultat net.`,`The group generates ${keur(c.REV)} of external revenue, after eliminating ${keur(-s.colIC.REV)} of internal sales, ${nf(-s.colIC.REV/aggRev*100,1)}% of the aggregated figure. Operating profit reaches ${keur(ebit)} (${nf(ebit/c.REV*100,1)}% of revenue). Unrealised profit in UK inventory reduces the result by ${keur(s.upi)} before tax, ${keur(s.upi-s.dt)} after deferred tax. The period's exchange movements (${keur(s.oci)}) go through comprehensive income, without touching net income.`))}</p></div>
  <div class="two">
    <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Compte de résultat et résultat global consolidés","Consolidated income statement and comprehensive income")}</th><th class="r">k€</th></tr></thead><tbody>
      ${["REV","COGS","PERS","OPEX","DEP"].map(a=>line(accL(a),c[a])).join("")}${line(accL("EBIT"),ebit,1)}${line(accL("FIN"),c.FIN)}${line(accL("TAX"),c.TAX)}${line(accL("NI"),s.consNI,1)}
      ${line(X("dont part du groupe","attributable to owners of the parent"),s.groupNI)}${line(X("dont participations ne donnant pas le contrôle","attributable to non-controlling interests"),s.nciNI)}
      ${hdr(X("Autres éléments du résultat global","Other comprehensive income"))}
      ${line(X("Écarts de conversion des activités à l'étranger (recyclables en résultat)","Exchange differences on translating foreign operations (may be reclassified to profit or loss)"),s.oci)}
      ${line(X("Résultat global total","Total comprehensive income"),tci,1)}
      ${line(X("dont part du groupe","attributable to owners of the parent"),s.groupNI+s.groupOCI)}${line(X("dont participations ne donnant pas le contrôle","attributable to non-controlling interests"),s.nciNI+s.nciOCI)}</tbody></table></div>
    <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Bilan consolidé au 30 juin 2026","Consolidated balance sheet at 30 June 2026")}</th><th class="r">k€</th></tr></thead><tbody>
      ${hdr(X("Actif","Assets"))}${rows(NCA)}${line(X("Actifs non courants","Non-current assets"),tot(NCA),2)}${rows(CA)}${line(X("Actifs courants","Current assets"),tot(CA),2)}${line(accL("TA"),s.TA,1)}
      ${hdr(X("Capitaux propres et passif","Equity and liabilities"))}${rows(EQG)}${line(X("Capitaux propres part du groupe","Equity attributable to owners of the parent"),eqG,2)}${rows(["NCI"])}${line(X("Total capitaux propres","Total equity"),eqT,2)}
      ${rows(NCL)}${rows(CL)}${line(X("Total passifs","Total liabilities"),tot(NCL)+tot(CL),2)}${line(accL("TL"),s.TL,1)}</tbody></table>
      ${Math.abs(c.PLUG)>.4?`<p class="muted" style="margin:8px 12px;font-size:12.5px">▲ ${X("Compte d'attente à solder avant publication : corrigez l'écart intragroupe (onglet Intragroupe), puis reconsolidez.","Suspense account to clear before publication: correct the intercompany difference (Intercompany tab), then consolidate again.")}</p>`:""}</div></div>
  <div class="two">
    <div class="chartcard"><div class="head"><h3>${X("Contribution au chiffre d'affaires consolidé","Contribution to consolidated revenue")}</h3><span class="note">${X("Ventes externes de chaque entité, en k€","Each entity's external sales, in k€")}</span></div><div id="contrib"></div></div>
    <div class="panelcard"><h3>${X("Contrôles de consolidation","Consolidation checks")}</h3><ul class="cmts">${checks.map(([ok,t])=>`<li><span class="sev ${ok?"ok":"w"}" style="margin-right:8px">${ok?"OK":"!"}</span>${esc(t)}</li>`).join("")}</ul>
    ${why("Ces contrôles sont ceux qu'un responsable consolidation vérifie avant de transmettre les chiffres au DAF et aux commissaires aux comptes.","These are the checks a group consolidation lead runs before sending figures to the CFO and the auditors.")}</div></div>`;
}
const tip=document.getElementById("tip");
function showTip(h,x,y){tip.innerHTML=h;tip.hidden=false;const w=tip.offsetWidth,ht=tip.offsetHeight;let lx=x+14,ly=y-ht-10;if(lx+w>innerWidth-8)lx=x-w-14;if(ly<8)ly=y+16;tip.style.left=lx+"px";tip.style.top=ly+"px"}
function hideTip(){tip.hidden=true}
function drawContribution(){
  const s=S.snap,el=document.getElementById("contrib");if(!el)return;
  const rows=ENT.map(e=>{const icSales=S.ic.filter(x=>x.e===e.id&&x.acc==="REV").reduce((t,x)=>t+x.amt*s.T[e.id].rates.avg,0);return {id:e.id,name:e.name,ext:s.T[e.id].REV-icSales,tot:s.T[e.id].REV}});
  const max=Math.max(...rows.map(r=>r.ext)),W=560,lab=150,rh=34,H=rows.length*rh+10;
  let g=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${X("Contribution au chiffre d'affaires","Revenue contribution")}">`;
  rows.forEach((r,i)=>{const y=5+i*rh,w=Math.max(2,(W-lab-120)*r.ext/max);
    g+=`<text x="${lab-10}" y="${y+rh/2+4}" text-anchor="end" style="font-size:12px;fill:var(--ink-2)"><tspan style="font-family:var(--f-num);fill:var(--muted);font-size:11px">${r.id}</tspan> ${esc(r.name.split(" ").slice(0,2).join(" "))}</text>`;
    g+=`<rect x="${lab}" y="${y+8}" width="${w}" height="${rh-16}" rx="4" fill="var(--accent)"/><text x="${lab+w+6}" y="${y+rh/2+4}" style="font-size:11.5px;fill:var(--ink-2);font-family:var(--f-num)">${k0(r.ext)} · ${nf(r.ext/s.cons.REV*100,0)} %</text>`;
    g+=`<rect class="hit" data-i="${i}" x="0" y="${y}" width="${W}" height="${rh}" fill="transparent"/>`});
  el.innerHTML=g+"</svg>";
  el.querySelectorAll(".hit").forEach(h=>{h.addEventListener("mousemove",ev=>{const r=rows[+h.dataset.i];showTip(`<strong>${r.id} · ${esc(r.name)}</strong><br>${X("CA converti","Translated revenue")} <span class="tv">${keur(r.tot)}</span><br>${X("dont intragroupe","of which intercompany")} <span class="tv">${keur(r.tot-r.ext)}</span><br>${X("Ventes externes","External sales")} <span class="tv">${keur(r.ext)}</span>`,ev.clientX,ev.clientY)});h.addEventListener("mouseleave",hideTip)});
}

/* ---------- dimensions ---------- */
function viewDim(){
  const D=[["Account",1,X("Comptes du compte de résultat et du bilan, plus les comptes système préfixés FCCS_ (écart de conversion, minoritaires…).","P&L and balance sheet accounts, plus FCCS_ system accounts (translation reserve, NCI…)."),"GW, REV, CTA, NCI, PLUG…"],
    ["Period",1,X("Mois, trimestres, semestres.","Months, quarters, half-years."),X("Juin, T2, S1","Jun, Q2, H1")],
    ["Data Source",1,X("L'origine d'un montant : données chargées, journaux, éliminations, données supplémentaires. C'est elle qui sépare la liasse des journaux.","Where an amount comes from: loaded data, journals, eliminations, supplemental data. It keeps the package apart from journals."),"FCCS_Data Input, FCCS_Journal Input"],
    ["Consolidation",1,X("Les étapes du calcul, de la saisie à la contribution au groupe. Ce sont les colonnes de la feuille de consolidation.","The calculation stages, from input to contribution to the group. These are the worksheet columns."),"Entity Input → Contribution"],
    ["Entity",1,X("Arborescence juridique : le groupe et ses sociétés, avec pourcentage de détention et méthode.","Legal hierarchy: the group and its companies, with ownership and method."),"FR, UK, US, IN"],
    ["Movement",1,X("Les variations du bilan : ouverture, flux, écart de conversion, clôture. Base du tableau de flux (non construit ici).","Balance sheet movements: opening, flows, FX difference, closing. Basis of the cash flow statement (not built here)."),"FCCS_ClosingBalance_Input"],
    ["Scenario",1,X("Réel, budget, prévision.","Actual, budget, forecast."),"Actual"],
    ["Year",1,X("Exercices.","Fiscal years."),"FY26"],
    ["View",1,X("Périodique ou cumul depuis le début d'année ; les journaux se saisissent en périodique par défaut.","Periodic or year to date; journals are entered periodic by default."),"FCCS_Periodic, FCCS_YTD"],
    ["Currency",2,X("Créée parce que l'application est multidevise : devise de l'entité, devise de la mère, devise de reporting ; porte les taux.","Created because the application is multi-currency: entity, parent and reporting currency; holds the rates."),"Entity Currency → EUR"],
    ["Intercompany",2,X("Créée parce que l'intragroupe est activé : le partenaire de chaque transaction interne, indispensable au rapprochement.","Created because intercompany is enabled: the partner of each internal transaction, essential for matching."),"ICP_FR, ICP_UK…"]];
  const card=(d,i)=>`<div class="card"><h3><span class="rid">${i+1} · ${d[0]} <span class="prop">${d[1]===1?X("système","system"):X("activée ici","enabled here")}</span></span>${d[0]}</h3><p>${d[2]}</p><div class="muted" style="font-size:12.5px"><span class="mono">${esc(d[3])}</span></div></div>`;
  return `<div class="formbar" style="margin-top:0;margin-bottom:14px"><p style="margin:0;max-width:85ch;color:var(--ink-2)">${X("Une application Oracle FCCS crée toujours <b>neuf dimensions système</b>. <b>Currency</b> et <b>Intercompany</b> s'ajoutent quand l'application est multidevise et gère l'intragroupe : c'est le cas ici, soit onze dimensions. <b>Multi-GAAP</b> et les dimensions personnalisées (produit, marché…) sont optionnelles et non activées.","An Oracle FCCS application always creates <b>nine system dimensions</b>. <b>Currency</b> and <b>Intercompany</b> are added when the application is multi-currency and tracks intercompany: that is the case here, making eleven. <b>Multi-GAAP</b> and custom dimensions (product, market…) are optional and not enabled.")}</p></div>
  <div class="cols">${D.map(card).join("")}
    <div class="card" style="background:var(--surface-2)"><h3><span class="rid">${X("Non activées","Not enabled")}</span>${X("Dimensions optionnelles","Optional dimensions")}</h3><ul class="tree"><li><span class="m">Multi-GAAP</span>${X("Pour publier dans deux référentiels (IFRS et normes françaises).","To report under two frameworks (IFRS and French GAAP).")}</li><li><span class="m">Custom</span>${X("Produit, marché, destination… placées entre Intercompany et Movement.","Product, market, destination… placed between Intercompany and Movement.")}</li></ul></div></div>
  <div class="sectitle"><h2>${X("Dimension Consolidation : du chiffre saisi au chiffre consolidé","Consolidation dimension: from input to consolidated figure")}</h2></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Membre FCCS","FCCS member")}</th><th>${X("Dans cette démo","In this demo")}</th></tr></thead><tbody>
   <tr><td class="mono">FCCS_Entity Input</td><td>${X("Liasse locale et journaux en devise locale (onglets Données locales et Journaux)","Local package and local-currency journals (Local data and Journals tabs)")}</td></tr>
   <tr><td class="mono">FCCS_Translated Currency Input</td><td>${X("Journaux saisis en euros sur une entité, après conversion","Journals entered in euros on an entity, after translation")}</td></tr>
   <tr><td class="mono">FCCS_Entity Consolidation / Proportion</td><td>${X("Montants convertis, retenus à 100 % (intégration globale)","Translated amounts, taken at 100% (full consolidation)")}</td></tr>
   <tr><td class="mono">FCCS_Elimination</td><td>${X("Écritures automatiques E1 à E6","Automatic entries E1 to E6")}</td></tr>
   <tr><td class="mono">FCCS_Contribution Input</td><td>${X("Journaux de niveau groupe (colonne « Journaux groupe »)","Group-level journals (“Group journals” column)")}</td></tr>
   <tr><td class="mono">FCCS_Contribution</td><td>${X("Colonne Consolidé","Consolidated column")}</td></tr></tbody></table></div>`;
}
function viewAbout(){
  return `<div class="about"><article>
    <h2>${X("Notes techniques","Technical notes")}</h2>
    <p class="byline">${X("Projet de portfolio de","Portfolio project by")} <strong>Gaurav Sharma</strong> · ${X("Consultant Oracle EPM (FCCS, EPBCS)","Oracle EPM consultant (FCCS, EPBCS)")}</p>
    <h3>${X("Méthodes appliquées","Methods applied")}</h3>
    <ul><li>${X("Intégration globale (IFRS 10) pour les trois filiales, contrôlées à 100 % ou 80 %.","Full consolidation (IFRS 10) for the three subsidiaries, controlled at 100% or 80%.")}</li>
    <li>${X("Conversion au cours de clôture (IAS 21) : actifs et dettes au taux de clôture, résultat au taux moyen, capitaux propres aux taux historiques (acquisition pour le capital et les réserves d'avant l'acquisition, taux des années concernées pour les réserves accumulées depuis, jour du paiement pour les dividendes). L'écart de conversion de la période passe en autres éléments du résultat global.","Closing-rate translation (IAS 21): assets and liabilities at the closing rate, income statement at the average rate, equity at historical rates (acquisition rate for capital and pre-acquisition reserves, the rates of the years concerned for reserves earned since, payment date for dividends). The period's exchange difference goes through other comprehensive income.")}</li>
    <li>${X("Éliminations : ventes et achats, créances et dettes, prêt et intérêts, dividende, marge interne en stock avec impôt différé au taux de l'acheteur (IAS 12), titres de participation. Les écarts intragroupe tolérés restent en résultat financier (IAS 21.45), les autres sont isolés en compte d'attente.","Eliminations: sales and purchases, receivables and payables, loan and interest, dividend, unrealised profit in inventory with deferred tax at the buyer's rate (IAS 12), investments. Tolerated intercompany differences stay in the finance result (IAS 21.45); the others are parked in a suspense account.")}</li>
    <li>${X("Goodwill (IFRS 3) = prix payé − quote-part des capitaux propres à l'acquisition, tenu dans la devise de la filiale et converti au taux de clôture (IAS 21.47). Participations ne donnant pas le contrôle à leur quote-part de l'actif net (option d'IFRS 3.19).","Goodwill (IFRS 3) = price paid − share of equity at acquisition, held in the subsidiary's currency and translated at the closing rate (IAS 21.47). Non-controlling interests at their share of net assets (IFRS 3.19 option).")}</li>
    <li>${X("États présentés selon IAS 1 : compte de résultat, état du résultat global, bilan courant / non courant, capitaux propres part du groupe séparés des participations ne donnant pas le contrôle.","Statements presented under IAS 1: income statement, statement of comprehensive income, current / non-current balance sheet, equity attributable to owners shown apart from non-controlling interests.")}</li>
    <li>${X("Journaux : distincts des éliminations automatiques, stockés en Journal Input, avec circuit d'approbation et séparation des tâches.","Journals: separate from automatic eliminations, stored in Journal Input, with an approval workflow and segregation of duties.")}</li></ul>
    <h3>${X("Simplifications assumées","Deliberate simplifications")}</h3>
    <p>${X("Le taux d'ouverture et le taux historique des réserves sont fournis comme données (dans un outil, ils proviennent des clôtures précédentes). Marge interne calculée sur le stock de clôture seulement, sans extourne de la marge d'ouverture ; impôt différé limité à cette marge. Pas de mise en équivalence ni de variation de périmètre, pas de tableau de flux ni de tableau de variation des capitaux propres, pas de modèles de journaux ni d'export. Montants en milliers.","The opening rate and the historical rate of reserves are given as data (in a real tool they come from prior closings). Unrealised profit is computed on closing inventory only, with no reversal of the opening margin; deferred tax is limited to that margin. No equity method or scope changes, no cash flow statement or statement of changes in equity, no journal templates or export. Amounts in thousands.")}</p>
    <h3>${X("Choix techniques","Technical choices")}</h3>
    <p>${X("JavaScript natif, sans backend ni bibliothèque. Le moteur de consolidation tient en une fonction : conversion, écritures équilibrées en débit/crédit, puis agrégation. Les données restent dans votre navigateur.","Plain JavaScript, no backend or library. The consolidation engine is one function: translation, balanced debit/credit entries, then aggregation. Data stays in your browser.")}</p>
    <div class="formbar" style="margin-top:22px"><button class="btn" id="tour-start-2">${X("Lancer la visite guidée","Start the guided tour")}</button><button class="btn danger" id="reset">${X("Réinitialiser la démo","Reset demo")}</button></div></article>
  <aside><div class="card"><h3>${X("Correspondance FCCS","FCCS mapping")}</h3><table class="tbl"><tbody>
    ${[["Data load / packages",X("Liasses locales en devise","Local packages in local currency")],["Exchange rate tables",X("Taux de clôture, moyen, historique","Closing, average, historical rates")],["Translation",X("Conversion IAS 21 et écart de conversion","IAS 21 translation and CTA")],["Intercompany matching report",X("Rapprochement avec seuil de tolérance","Matching with tolerance")],["Elimination rules / plug",X("E1 à E5, compte d'attente pour les écarts non réconciliés","E1 to E5, suspense account for unreconciled differences")],["Ownership management",X("% de détention, goodwill, minoritaires (E6)","Ownership %, goodwill, NCI (E6)")],["Consolidation status",X("OK / À reconsolider","OK / Impacted")],["Consolidation journals",X("Brouillon → soumis → approuvé → comptabilisé, scan, extourne automatique, Entity / Translated / Contribution Input","Working → submitted → approved → posted, scan, auto-reversal, Entity / Translated / Contribution Input")],["Data Source",X("Données chargées et journaux séparés","Loaded data and journals kept apart")]].map(r=>`<tr><td style="font-weight:600;padding-left:0">${r[0]}</td><td style="color:var(--ink-2);padding-right:0">${r[1]}</td></tr>`).join("")}</tbody></table></div></aside></div>`;
}

/* ---------- events ---------- */
function parseNum(raw){let s=String(raw).trim().replace(/[\s  ]/g,"");s=S.lang==="fr"?s.replace(",","."):s.replace(/,/g,"");return s===""||!/^-?\d*\.?\d+$/.test(s)?NaN:Number(s)}
// Share the language choice with the main site (same origin, same key)
function setLang(l){S.lang=l;try{localStorage.setItem("preferredLang",l)}catch(e){}render()}
document.getElementById("lang-fr").onclick=()=>setLang("fr");
document.getElementById("lang-en").onclick=()=>setLang("en");
document.addEventListener("click",ev=>{
  const tr=ev.target.closest("tr[data-jsel]");if(tr){S.jsel=tr.dataset.jsel;S.jscan=null;S.jreject=null;render();return}
  const b=ev.target.closest("button");if(!b||b.disabled)return;
  if(b.dataset.tab){if(S.tab!==b.dataset.tab)EXPLAIN=null;S.tab=b.dataset.tab;hideTip();render();return}
  if(b.dataset.goto){EXPLAIN=null;S.tab=b.dataset.goto;render();scrollTo(0,0);return}
  if(b.id==="consolidate"||b.id==="consolidate-2"){runConsolidation();return}
  if(b.dataset.fx){const k=b.dataset.fx;const before=SUBS.reduce((t,s)=>t+translate(s.id).CTA,0);
    if(k==="reset"){S.rates=JSON.parse(JSON.stringify(RATES0));markImpacted(SUBS.map(s=>s.id))}
    else{const c={gbp:"GBP",usd:"USD",inr:"INR"}[k],f={gbp:.95,usd:1.05,inr:.92}[k];S.rates[c].close=+(RATES0[c].close*f).toPrecision(6);S.rates[c].avg=+(RATES0[c].avg*f).toPrecision(6);markImpacted(SUBS.filter(s=>s.ccy===c).map(s=>s.id));S.ent={GBP:"UK",USD:"US",INR:"IN"}[c]}
    const after=SUBS.reduce((t,s)=>t+translate(s.id).CTA,0);
    explain(()=>({title:X("Taux de change modifiés","Exchange rates changed"),body:X(`Les taux de clôture et moyen ont été ajustés. Le bilan de la filiale est désormais converti à un autre taux que ses capitaux propres (figés à leurs taux historiques) : l'écart de conversion total passe de ${keur(before)} à ${keur(after)}. Son résultat en euros change aussi, via le taux moyen. La filiale est « à reconsolider ».`,`Closing and average rates were adjusted. The subsidiary's balance sheet is now translated at a different rate from its equity (fixed at its historical rates): the total translation reserve moves from ${keur(before)} to ${keur(after)}. Its result in euros changes too, via the average rate. The subsidiary is now “impacted”.`)}));
    render();return}
  if(b.dataset.jrole){S.jrole=b.dataset.jrole;S.jreject=null;render();return}
  if(b.dataset.openj){S.jsel=b.dataset.openj;S.tab="jnl";EXPLAIN=null;render();scrollTo(0,0);return}
  if(b.id==="j-new"){newJournal();explain(()=>({title:X("Nouveau journal","New journal"),body:X("Renseignez un libellé sans espace ni caractère spécial, choisissez le membre de consolidation, puis saisissez des lignes équilibrées. Scannez avant de soumettre.","Enter a label without spaces or special characters, choose the consolidation member, then enter balanced lines. Scan before submitting.")}));render();return}
  if(b.id==="make-jnl"){const amt=+(100/rateOf("US","close")).toFixed(1);newJournal({label:"US_IC_INTRANSIT_0629",desc:X("Facture FR du 29/06 en transit : marchandises expédiées, non encore reçues","FR invoice of 29/06 in transit: goods shipped, not yet received"),group:"IC",cons:"EI",lines:[{e:"US",acc:"STOCK",icp:"",dr:amt,cr:0,d:X("Marchandises en transit","Goods in transit")},{e:"US",acc:"PAY",icp:"FR",dr:0,cr:amt,d:X("Dette envers Maison Lumen SAS","Payable to Maison Lumen SAS")}]});
    S.tab="jnl";explain(()=>({title:X("Journal de correction créé","Correcting journal created"),body:X(`Journal US_IC_INTRANSIT_0629 préparé en Entity Input chez US, en dollars : stock ${nf(amt,1)} k$ au débit, dette envers FR au crédit avec le partenaire ICP_FR. Scannez-le, soumettez-le, faites-le approuver par le DAF, puis comptabilisez-le.`,`Journal US_IC_INTRANSIT_0629 prepared at Entity Input for US, in dollars: inventory ${nf(amt,1)} k$ debit, payable to FR credit with partner ICP_FR. Scan it, submit it, have the CFO approve it, then post it.`)}));render();scrollTo(0,0);return}
  if(b.id==="j-addline"){const j=S.journals.find(x=>x.id===S.jsel);j.lines.push({e:j.lines[0].e,acc:"OPEX",icp:"",dr:0,cr:0,d:""});render();return}
  if(b.dataset.jdel){const j=S.journals.find(x=>x.id===S.jsel);j.lines.splice(+b.dataset.jdel,1);render();return}
  if(b.id==="j-reject"){S.jreject=S.jsel;render();const t=document.getElementById("j-reject-text");t&&t.focus();return}
  if(b.id==="j-reject-cancel"){S.jreject=null;render();return}
  if(b.id==="j-reject-ok"){const c=(document.getElementById("j-reject-text").value||"").trim();if(!c){toast(X("Indiquez un motif de rejet.","Enter a reason for rejection."));return}
    const j=S.journals.find(x=>x.id===S.jsel);j.status="working";jlog(j,"reject",c);S.jreject=null;explain(()=>({title:X(`${j.label} rejeté`,`${j.label} rejected`),body:X(`Le journal revient en brouillon avec le motif « ${esc(c)} ». La préparatrice peut le corriger puis le soumettre à nouveau.`,`The journal goes back to working with the reason “${esc(c)}”. The preparer can correct it and submit it again.`)}));render();return}
  const ja={"j-scan":"scan","j-submit":"submit","j-approve":"approve","j-post":"post","j-unpost":"unpost","j-delete":"delete"}[b.id];if(ja){jAct(ja);return}
  if(b.id==="explain-close"){EXPLAIN=null;render();return}
  if(b.id==="notes-toggle"){S.notes=!S.notes;render();return}
  if(b.id==="tour-start"||b.id==="tour-start-2"||b.id==="tour-start-3"){EXPLAIN=null;goTour(0);return}
  if(b.dataset.tour){const a=b.dataset.tour;goTour(a==="end"?null:a==="next"?S.tour+1:S.tour-1);return}
  if(b.id==="reset"){const l=S.lang;S=freshState();S.lang=l;S.tab="about";S.tour=null;EXPLAIN=null;render();toast(X("Données de démonstration réinitialisées","Demo data reset"));return}
});
document.addEventListener("change",ev=>{
  const el=ev.target;
  if(el.dataset&&el.dataset.jf){const j=S.journals.find(x=>x.id===S.jsel);const f=el.dataset.jf;j[f]=el.value;S.jscan=null;
    if(f==="cons"){explain(()=>({title:X("Membre de consolidation modifié","Consolidation member changed"),body:X({EI:"Entity Input : les montants sont saisis dans la devise de chaque entité et convertis avec sa liasse. C'est le bon choix pour corriger une filiale.",TCI:"Translated Currency Input : les montants sont saisis en euros et s'ajoutent aux chiffres convertis de l'entité, sans passer par les taux. Utile pour corriger un effet de change.",CI:"Contribution Input : les montants sont saisis en euros et s'appliquent au niveau groupe, après les éliminations. C'est l'endroit des reclassements et ajustements de présentation."}[j.cons],{EI:"Entity Input: amounts are entered in each entity's currency and translated with its package. The right choice to correct a subsidiary.",TCI:"Translated Currency Input: amounts are entered in euros and added to the entity's translated figures, bypassing the rates. Useful to correct an FX effect.",CI:"Contribution Input: amounts are entered in euros and apply at group level, after eliminations. The place for reclassifications and presentation adjustments."}[j.cons])}))}
    render();return}
  if(el.dataset&&el.dataset.jl){const j=S.journals.find(x=>x.id===S.jsel);const [i,f]=el.dataset.jl.split("|");const l=j.lines[+i];
    if(f==="dr"||f==="cr"){const v=el.value.trim()===""?0:parseNum(el.value);if(isNaN(v)){toast(X("Montant invalide","Invalid amount"));render();return}l[f]=v}else l[f]=el.value;
    if(f==="e"&&l.icp===l.e)l.icp="";S.jscan=null;render();return}
  if(el.id==="ent-sel"){S.ent=el.value;render();return}
  if(el.id==="conv-ent"){S.ent=el.value;render();return}
  if(el.id==="tol"){const v=parseNum(el.value);if(!isNaN(v)&&v>=0){S.tol=v;explain(()=>({title:X("Seuil de tolérance modifié","Tolerance changed"),body:X(`Les écarts intragroupe jusqu'à ${nf(v)} k€ sont désormais acceptés sans analyse. Un seuil trop large masque de vraies erreurs ; trop serré, il bloque la clôture pour des écarts de change sans importance.`,`Intercompany differences up to ${nf(v)} k€ are now accepted without investigation. Too wide a tolerance hides real errors; too tight, it blocks the close over immaterial FX differences.`)}));render()}return}
  if(el.dataset.rate){const [c,t]=el.dataset.rate.split("|"),v=parseNum(el.value);if(isNaN(v)||v<=0){toast(X("Taux invalide","Invalid rate"));render();return}
    const before=SUBS.reduce((s,x)=>s+translate(x.id).CTA,0);S.rates[c][t]=v;markImpacted(SUBS.filter(s=>s.ccy===c).map(s=>s.id));const after=SUBS.reduce((s,x)=>s+translate(x.id).CTA,0);
    explain(()=>({title:X("Taux modifié","Rate changed"),body:X(`${c} ${t==="close"?"clôture":"moyen"} : ${rateF(c,v)}. Écart de conversion total : ${keur(before)} → ${keur(after)}.`,`${c} ${t==="close"?"closing":"average"}: ${rateF(c,v)}. Total translation reserve: ${keur(before)} → ${keur(after)}.`)}));render();return}
  if(el.dataset.pl){const a=el.dataset.pl,e=S.ent,v=parseNum(el.value);if(isNaN(v)){toast(X("Valeur non numérique","Not a number"));render();return}
    const d=S.data[e],old=d[a];d[a]=v;markImpacted([e]);
    explain(()=>({title:X("Liasse modifiée","Package updated"),body:X(`${e} · ${accL(a)} : ${nf(old)} → ${nf(v)} ${sym(entById[e].ccy)}. Le résultat local devient ${nf(ni(d))} ; la trésorerie absorbe l'écart pour garder la liasse équilibrée. ${e} est « à reconsolider ».`,`${e} · ${accL(a)}: ${nf(old)} → ${nf(v)} ${sym(entById[e].ccy)}. Local net income becomes ${nf(ni(d))}; cash absorbs the difference so the package still balances. ${e} is now “impacted”.`)}));render();return}
  if(el.dataset.ic){const x=icById(el.dataset.ic),v=parseNum(el.value);if(isNaN(v)||v<0){toast(X("Montant invalide","Invalid amount"));render();return}
    const delta=v-x.amt;x.amt=v;S.data[x.e][x.acc]+=delta*x.sign;markImpacted([x.e]);
    explain(()=>({title:X("Détail intragroupe modifié","Intercompany detail updated"),body:X(`${x.e} → ${x.p} (${accL(x.acc)}) : ${sgn(delta,1)} ${sym(entById[x.e].ccy)}. Le compte total suit, la trésorerie rééquilibre la liasse. Consultez l'onglet Intragroupe pour voir l'effet sur le rapprochement.`,`${x.e} → ${x.p} (${accL(x.acc)}): ${sgn(delta,1)} ${sym(entById[x.e].ccy)}. The account total follows and cash rebalances the package. See the Intercompany tab for the effect on matching.`)}));render();return}
});
render();
