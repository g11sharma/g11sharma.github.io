/* ============================================================
   Lumen Plan — a mini EPM planning application (EPBCS-style)
   Year-end forecast and next-year budget on a lean French P&L,
   with what-if simulation, spreading, cell comments, audit trail,
   price/volume/mix analysis and ERP actuals import.
   Fictional company, fictional data. Single file, no backend.
   ============================================================ */
const X=(fr,en)=>S.lang==="fr"?fr:en;
const MONTHS={fr:["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."],en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]};
const MONTHS_LONG={fr:["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],en:["January","February","March","April","May","June","July","August","September","October","November","December"]};
const LOCALE={fr:"fr-FR",en:"en-GB"};
const ALL=[0,1,2,3,4,5,6,7,8,9,10,11], SEED_CLOSED=8;
const QUARTERS={FY:ALL,Q1:[0,1,2],Q2:[3,4,5],Q3:[6,7,8],Q4:[9,10,11]};
const actM=()=>ALL.slice(0,S.closed), fcM=()=>ALL.slice(S.closed), split=()=>`${S.closed}+${12-S.closed}`;

const ENT=[
  {id:"LYO",erp:"FR01",fr:"Lyon · Siège",en:"Lyon · Head office",hq:true,owner:"Sophie Bernard"},
  {id:"PAR",erp:"FR02",fr:"Paris · Commercial",en:"Paris · Sales",owner:"Claire Martin"},
  {id:"LIL",erp:"FR03",fr:"Lille · Usine",en:"Lille · Plant",owner:"Thomas Leroy"}
];
const APPROVER="Marc Dubois";
const ACC=[
  {id:"UNITS",code:"DRV",fr:"Volume vendu (unités)",en:"Units sold",kind:"input",type:"drv",hqHide:true,int:true,add:true},
  {id:"PRICE",code:"DRV",fr:"Prix de vente moyen (€)",en:"Average selling price (€)",kind:"input",type:"drv",hqHide:true,dec:2},
  {id:"706",code:"706",fr:"Chiffre d'affaires",en:"Revenue",kind:"calc",type:"rev",hqHide:true},
  {id:"607",code:"607",fr:"Achats consommés",en:"Cost of purchases",kind:"input",type:"exp",hqHide:true,add:true},
  {id:"MB",code:"MB",fr:"Marge brute",en:"Gross margin",kind:"dyn",type:"rev",hqHide:true,formula:'"706" - "607"'},
  {id:"HC",code:"DRV",fr:"Effectif moyen (ETP)",en:"Average headcount (FTE)",kind:"input",type:"drv",dec:1},
  {id:"SAL",code:"DRV",fr:"Salaire brut mensuel moyen (€)",en:"Average monthly gross salary (€)",kind:"input",type:"drv"},
  {id:"641",code:"641",fr:"Salaires bruts",en:"Gross salaries",kind:"calc",type:"exp"},
  {id:"645",code:"645",fr:"Charges sociales",en:"Social charges",kind:"calc",type:"exp"},
  {id:"61",code:"61",fr:"Services extérieurs (loyers, énergie)",en:"External services (rent, energy)",kind:"input",type:"exp",add:true},
  {id:"62",code:"62",fr:"Autres services extérieurs",en:"Other external services",kind:"input",type:"exp",add:true},
  {id:"63",code:"63",fr:"Impôts et taxes",en:"Taxes and duties",kind:"input",type:"exp",add:true},
  {id:"ALLOC",code:"ALLOC",fr:"Quote-part frais de siège",en:"Head-office cost allocation",kind:"calc",type:"exp"},
  {id:"EBE",code:"EBE",fr:"EBE (excédent brut d'exploitation)",en:"EBITDA",kind:"dyn",type:"rev",formula:'"MB" - "641" - "645" - "61" - "62" - "63" - "ALLOC"'},
  {id:"681",code:"681",fr:"Dotations aux amortissements",en:"Depreciation",kind:"input",type:"exp",add:true},
  {id:"REX",code:"REX",fr:"Résultat d'exploitation",en:"Operating result",kind:"dyn",type:"rev",formula:'"EBE" - "681"',final:true}
];
const STORED=ACC.filter(a=>a.kind!=="dyn").map(a=>a.id);
const LINE_IDS=["706","607","641","645","61","62","63","ALLOC","681"];
const accById=Object.fromEntries(ACC.map(a=>[a.id,a]));
const entById=Object.fromEntries(ENT.map(e=>[e.id,e]));
const PLANS={
  FC26:{fr:()=>`Prévision FY26 (${split()})`,en:()=>`Forecast FY26 (${split()})`,sc:"Forecast",yr:"FY26",ver:"Working",ref:"BUD26"},
  BUD27W:{fr:()=>"Budget FY27 · Working",en:()=>"Budget FY27 · Working",sc:"Budget",yr:"FY27",ver:"Working",ref:"FC26"},
  BUD27F:{fr:()=>"Budget FY27 · Final",en:()=>"Budget FY27 · Final",sc:"Budget",yr:"FY27",ver:"Final",ro:true}
};
const planLabel=p=>PLANS[p][S.lang]();
const SCN={ACT26:{fr:"Réel FY26",en:"Actual FY26"},BUD26:{fr:"Budget FY26",en:"Budget FY26"},FC26:{fr:"Prévision FY26",en:"Forecast FY26"},BUD27W:{fr:"Budget FY27",en:"Budget FY27"},BUD27F:{fr:"Budget FY27 (Final)",en:"Budget FY27 (Final)"},SIM:{fr:"Scénario what-if",en:"What-if scenario"}};
const CMP={
  FCvB:{cur:"FC26",ref:"BUD26",lab:()=>X(`Prévision ${split()} vs budget FY26`,`Forecast ${split()} vs budget FY26`)},
  AvB:{cur:"ACT26",ref:"BUD26",limit:true,lab:()=>X(`Réel vs budget FY26 (cumul à fin ${MONTHS_LONG.fr[S.closed-1]})`,`Actual vs budget FY26 (year to date, ${MONTHS_LONG.en[S.closed-1]})`)},
  B27vF:{cur:"BUD27W",ref:"FC26",lab:()=>X("Budget FY27 vs prévision FY26","Budget FY27 vs forecast FY26")},
  B27FvF:{cur:"BUD27F",ref:"FC26",lab:()=>X("Budget FY27 (Final) vs prévision FY26","Budget FY27 (Final) vs forecast FY26")}
};

/* ---------- calculations (the "business rules") ---------- */
const r2=x=>Math.round(x*100)/100;
function emptyCube(){const c={};ENT.forEach(e=>{c[e.id]={};STORED.forEach(a=>c[e.id][a]=Array(12).fill(0))});return c}
function calcRevenue(c,ents,ms){let n=0;ents.filter(e=>!entById[e].hq).forEach(e=>ms.forEach(m=>{c[e]["706"][m]=Math.round(c[e].UNITS[m]*c[e].PRICE[m]);n++}));return n}
function calcPayroll(c,ents,ms,rate){let n=0;ents.forEach(e=>ms.forEach(m=>{const g=c[e].HC[m]*c[e].SAL[m]*(m===11?2:1);c[e]["641"][m]=Math.round(g);c[e]["645"][m]=Math.round(g*rate);n+=2}));return n}
function poolOf(c,m){const L=c.LYO;return L["61"][m]+L["62"][m]+L["63"][m]+L["641"][m]+L["645"][m]}
function allocate(c,ms){let pool=0;ms.forEach(m=>{const p=poolOf(c,m);pool+=p;const hp=c.PAR.HC[m],hl=c.LIL.HC[m],k=hp+hl?hp/(hp+hl):.5;
  c.LYO.ALLOC[m]=-p;c.PAR.ALLOC[m]=Math.round(p*k);c.LIL.ALLOC[m]=p-c.PAR.ALLOC[m]});return pool}

/* ---------- seed data ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const SEAS=[0.82,0.86,0.98,1.0,1.04,1.08,0.92,0.68,1.06,1.1,1.18,1.28];
const P={
  PAR:{units:14800,price:42.5,cogs:.44,HC:18,SAL:3800,"61":9000,"62":14000,"63":1800,"681":4200},
  LIL:{units:21600,price:37.9,cogs:.49,HC:50,SAL:2900,"61":26000,"62":9000,"63":5200,"681":23500},
  LYO:{HC:22,SAL:4600,"61":21000,"62":16000,"63":2400,"681":6300}
};
function put(c,e,m,v){Object.entries(v).forEach(([k,x])=>c[e][k][m]=x)}
function seed(){
  const R=rng(2026),D={ACT26:emptyCube(),BUD26:emptyCube(),FC26:emptyCube(),BUD27W:emptyCube(),BUD27F:emptyCube()};
  ENT.forEach(({id:e,hq})=>{const p=P[e];
    for(let m=0;m<12;m++){
      const b={HC:p.HC,SAL:p.SAL,"61":p["61"],"62":p["62"],"63":p["63"],"681":p["681"]};
      if(!hq){b.UNITS=Math.round(p.units*SEAS[m]);b.PRICE=p.price;b["607"]=Math.round(b.UNITS*b.PRICE*p.cogs/10)*10}
      put(D.BUD26,e,m,b);
      if(m<SEED_CLOSED){const a={HC:p.HC+(e==="LIL"&&m>=3?2:0),SAL:Math.round(p.SAL*(1+.02*R())),"61":Math.round(p["61"]*(1.04+.04*R())),"62":Math.round(p["62"]*(.9+.2*R())),"63":p["63"],"681":p["681"]};
        if(!hq){a.UNITS=Math.round(p.units*SEAS[m]*(e==="PAR"?.93:1.01)*(.97+.06*R()));a.PRICE=r2(p.price*(e==="LIL"?1.025:1)*(.99+.02*R()));a["607"]=Math.round(a.UNITS*a.PRICE*p.cogs*(1.03+.03*R()))}
        put(D.ACT26,e,m,a)}
      else{const f={HC:p.HC+(e==="LIL"?2:0),SAL:Math.round(p.SAL*1.01),"61":Math.round(p["61"]*1.05),"62":p["62"],"63":p["63"],"681":p["681"]};
        if(!hq){f.UNITS=Math.round(p.units*SEAS[m]*(e==="PAR"?.95:1.0));f.PRICE=r2(p.price*(e==="LIL"?1.025:1));f["607"]=Math.round(f.UNITS*f.PRICE*p.cogs*1.03/10)*10}
        put(D.FC26,e,m,f)}
      const n={HC:p.HC+(e==="LYO"?0:2),SAL:Math.round(p.SAL*1.03/10)*10,"61":Math.round(p["61"]*1.04/10)*10,"62":Math.round(p["62"]*1.02/10)*10,"63":Math.round(p["63"]*1.02/10)*10,"681":e==="LIL"?Math.round(p["681"]*1.12/10)*10:p["681"]};
      if(!hq){n.UNITS=Math.round(p.units*SEAS[m]*(e==="PAR"?1.02:1.05));n.PRICE=r2(p.price*(e==="LIL"?1.025:1)*1.03);n["607"]=Math.round(n.UNITS*n.PRICE*p.cogs*1.02/10)*10}
      put(D.BUD27W,e,m,n);
    }});
  D.BUD27W.PAR["62"][10]=31000;
  const ids=ENT.map(e=>e.id),A=ALL.slice(0,SEED_CLOSED),F=ALL.slice(SEED_CLOSED);
  calcRevenue(D.BUD26,ids,ALL);calcPayroll(D.BUD26,ids,ALL,.42);allocate(D.BUD26,ALL);
  calcRevenue(D.ACT26,ids,A);calcPayroll(D.ACT26,ids,A,.425);allocate(D.ACT26,A);
  ids.forEach(e=>STORED.forEach(a=>A.forEach(m=>D.FC26[e][a][m]=D.ACT26[e][a][m])));
  calcRevenue(D.FC26,ids,F);calcPayroll(D.FC26,ids,F,.42);allocate(D.FC26,F);
  calcRevenue(D.BUD27W,ids,ALL);calcPayroll(D.BUD27W,ids,ALL,.42);allocate(D.BUD27W,ALL);
  return D;
}
function detectLang(){
  try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en")return q}catch(e){}
  try{const v=localStorage.getItem("preferredLang");if(v==="fr"||v==="en")return v}catch(e){}
  return (navigator.language||"fr").slice(0,2).toLowerCase()==="en"?"en":"fr";
}
function freshState(){
  const t0="2026-09-15T09:12:00",t1="2026-09-22T17:40:00",D=seed();
  const u=D.FC26.PAR.UNITS[8];
  return {D,rate:.42,closed:SEED_CLOSED,lang:detectLang(),tab:"overview",role:"planner",notes:true,
    pov:{plan:"FC26",ent:"PAR"},varPov:{cmp:"FCvB",ent:"TOTAL",per:"FY",acc:"706"},
    status:{LYO:"draft",PAR:"draft",LIL:"draft"},
    stale:{FC26:{rev:[],pay:[],alloc:false},BUD27W:{rev:[],pay:[],alloc:false}},
    pending:{},runOnSave:true,lastRun:{rev:t1,pay:t1,alloc:t1,copy:null},sel:null,
    sim:{base:"FC26",ent:"TOTAL",vol:0,price:0,cogs:0,sal:0,ext:0},
    spread:{a:"UNITS",method:"seas"},imp:null,
    comments:{
      "FC26|PAR|UNITS|8":[{who:"Claire Martin",ts:"2026-09-22T10:05:00",fr:"Perte du client Luminis Retail fin août : volumes de septembre à décembre revus à −5 % vs budget.",en:"Lost the Luminis Retail account at the end of August: September–December volumes revised to −5% vs budget."}],
      "BUD27W|PAR|62|10":[{who:"Claire Martin",ts:"2026-09-18T15:20:00",fr:"Salon Maison&Objet : stand, déplacements et agence événementielle.",en:"Maison&Objet trade fair: stand, travel and events agency."}],
      "BUD27W|LIL|681|0":[{who:"Thomas Leroy",ts:"2026-09-17T11:40:00",fr:"Nouvelle ligne d'assemblage mise en service en janvier : dotations +12 %.",en:"New assembly line commissioned in January: depreciation +12%."}]
    },
    audit:[{ts:"2026-09-22T10:02:00",who:"Claire Martin",plan:"FC26",e:"PAR",a:"UNITS",m:8,from:Math.round(u/.95),to:u,src:"input"}],
    log:[{ts:t1,rule:"BR_CalcRevenue",ok:true,fr:"Prévision FY26 et budget FY27 calculés",en:"FY26 forecast and FY27 budget calculated"},
         {ts:t1,rule:"BR_CalcPayroll",ok:true,fr:"Salaires et charges calculés (taux 42 %)",en:"Salaries and charges calculated (42% rate)"},
         {ts:t1,rule:"BR_AllocHQ",ok:true,fr:"Frais de siège alloués sur PAR et LIL",en:"Head-office costs allocated to PAR and LIL"}],
    history:ENT.map(e=>({ts:t0,ent:e.id,from:"notStarted",to:"draft",who:e.owner,c:""}))};
}

/* ---------- state & persistence ---------- */
const KEY="lumenplan-v4";
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.D||!S.D.FC26||S.closed==null)S=freshState();
S.tour=null;
try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en")S.lang=q}catch(e){}
let SIMD=null;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

const L=o=>o[S.lang];
const loc=()=>LOCALE[S.lang];
const fmt0=v=>new Intl.NumberFormat(loc(),{maximumFractionDigits:0}).format(Math.round(v));
const fmtD=(v,d)=>new Intl.NumberFormat(loc(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
const fmtA=(a,v)=>accById[a]&&accById[a].dec?fmtD(v,accById[a].dec):fmt0(v);
const eur=v=>fmt0(v)+" €";
const signed=v=>(v>0?"+":v<0?"−":"")+fmt0(Math.abs(v))+" €";
const pct=v=>!isFinite(v)?"—":(v>0?"+":v<0?"−":"")+fmtD(Math.abs(v*100),1)+" %";
const share=v=>fmtD(v*100,1)+" %";
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const stamp=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`};
const showTs=ts=>ts?new Date(ts).toLocaleString(loc(),{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):X("jamais","never");
const stLabel=s=>X({notStarted:"Non démarré",draft:"Brouillon",submitted:"Soumis",approved:"Approuvé"}[s],{notStarted:"Not started",draft:"Draft",submitted:"Submitted",approved:"Approved"}[s]);
const actor=e=>S.role==="planner"?entById[e].owner:APPROVER;

/* ---------- data access ---------- */
const cubeOf=sc=>sc==="SIM"?SIMD:S.D[sc];
function val(sc,e,a,m){
  if(e==="TOTAL"){
    if(a==="PRICE"){const u=val(sc,e,"UNITS",m);return u?val(sc,e,"706",m)/u:0}
    if(a==="SAL"){const h=val(sc,e,"HC",m);return h?ENT.reduce((s,x)=>s+val(sc,x.id,"HC",m)*val(sc,x.id,"SAL",m),0)/h:0}
    return ENT.reduce((s,x)=>s+val(sc,x.id,a,m),0);
  }
  if(a==="MB")return val(sc,e,"706",m)-val(sc,e,"607",m);
  if(a==="EBE")return val(sc,e,"MB",m)-["641","645","61","62","63","ALLOC"].reduce((s,x)=>s+val(sc,e,x,m),0);
  if(a==="REX")return val(sc,e,"EBE",m)-val(sc,e,"681",m);
  return cubeOf(sc)[e][a][m]||0;
}
function sumVal(sc,e,a,ms){
  if(!ms.length)return 0;
  if(a==="PRICE"){const u=sumVal(sc,e,"UNITS",ms);return u?sumVal(sc,e,"706",ms)/u:0}
  if(a==="HC")return ms.reduce((s,m)=>s+val(sc,e,"HC",m),0)/ms.length;
  if(a==="SAL"){const h=ms.reduce((s,m)=>s+val(sc,e,"HC",m),0);return h?ms.reduce((s,m)=>s+val(sc,e,"HC",m)*val(sc,e,"SAL",m),0)/h:0}
  return ms.reduce((s,m)=>s+val(sc,e,a,m),0);
}
const impact=(a,cur,ref)=>accById[a].type==="exp"?ref-cur:cur-ref;
const openMonths=(plan,e)=>plan==="FC26"?fcM():plan==="BUD27W"&&S.status[e]==="draft"?ALL:[];

/* ---------- parsing & validation ---------- */
function parse(raw){
  let s=String(raw).trim().replace(/[\s  ]/g,"");
  s=S.lang==="fr"?s.replace(",","."):s.replace(/,/g,"");
  return s===""||!/^-?\d*\.?\d+$/.test(s)?NaN:Number(s);
}
const toRaw=(a,v)=>accById[a].dec?String(v).replace(".",S.lang==="fr"?",":"."):String(v);
function cellIssues(plan,e,a,m,v){
  const out=[];
  if(isNaN(v))return [{sev:"e",msg:X("Valeur non numérique","Not a number")}];
  if(v<0)out.push({sev:"e",msg:X("Montant négatif interdit sur ce compte","Negative amounts are not allowed on this account")});
  if((a==="PRICE"||a==="SAL")&&v<=0)out.push({sev:"e",msg:X("La valeur doit être strictement positive","Value must be greater than zero")});
  if(a==="UNITS"&&!Number.isInteger(v))out.push({sev:"e",msg:X("Le volume doit être un nombre entier","Units must be a whole number")});
  if(!out.length){const ref=PLANS[plan].ref,r=S.D[ref][e][a][m];
    if(r>0){const d=(v-r)/r;if(Math.abs(d)>.5)out.push({sev:"w",msg:X(`Écart de ${pct(d)} vs ${L(SCN[ref])} du même mois (seuil ±50 %)`,`${pct(d)} change vs ${L(SCN[ref])} for the same month (±50% threshold)`)})}}
  return out;
}
const pk=(plan,e,a,m)=>`${plan}|${e}|${a}|${m}`;
const pendingFor=(plan,e)=>Object.keys(S.pending).filter(k=>k.startsWith(plan+"|"+e+"|"));
function formIssues(plan,e){
  const list=[];
  ACC.filter(a=>a.kind==="input"&&!(entById[e].hq&&a.hqHide)).forEach(a=>openMonths(plan,e).forEach(m=>{
    const k=pk(plan,e,a.id,m),v=k in S.pending?parse(S.pending[k]):S.D[plan][e][a.id][m];
    cellIssues(plan,e,a.id,m,v).forEach(i=>list.push({...i,a:a.id,m}));
  }));
  return list;
}
function audit(plan,e,a,m,from,to,src,who){S.audit.unshift({ts:stamp(),who,plan,e,a,m,from,to,src});if(S.audit.length>500)S.audit.length=500}

/* ---------- notes, explanations, tour ---------- */
const NOTES={
 form:()=>[X(`Deux exercices tournent en même temps, comme chaque automne en FP&A. La prévision FY26 « ${split()} » garde le réel clos (bleu, verrouillé) et re-prévoit les mois restants ; le budget FY27 couvre toute l'année. Les cellules jaunes sont des hypothèses ; le chiffre d'affaires et la masse salariale (gris) sont calculés par des règles. Cliquez sur une cellule pour voir ses commentaires et son historique.`,`Two cycles run at once, as every autumn in FP&A. The FY26 “${split()}” forecast keeps closed actuals (blue, locked) and re-forecasts the remaining months; the FY27 budget covers the full year. Yellow cells are assumptions; revenue and payroll (grey) are calculated by rules. Click a cell to see its comments and history.`),
   X("On ne saisit pas un P&L ligne à ligne : on saisit des inducteurs (volumes, prix, effectifs, salaires), ou un total annuel que l'outil répartit sur les mois. Le P&L en découle.","A P&L isn't typed line by line: you enter drivers (volumes, prices, headcount, salaries), or an annual total the tool spreads over the months. The P&L follows.")],
 sim:()=>[X("Le bac à sable what-if copie un plan, applique des chocs sur les hypothèses et recalcule tout le P&L, sans toucher au plan officiel. Choisissez un scénario prédéfini ou réglez les curseurs, puis publiez si le résultat doit devenir la nouvelle prévision.","The what-if sandbox copies a plan, applies shocks to the assumptions and recalculates the whole P&L, without touching the official plan. Pick a preset or move the sliders, then publish if the result should become the new forecast."),
   X("La direction pose rarement la question « quel est le chiffre ? », mais plutôt « que se passe-t-il si… ? ». Répondre en quelques secondes, c'est ce qui distingue un outil de planification d'un tableur.","Management rarely asks “what is the number?”; they ask “what happens if…?”. Answering in seconds is what separates a planning tool from a spreadsheet.")],
 rules:()=>[X("Les règles de gestion transforment les hypothèses en P&L : chiffre d'affaires, masse salariale et charges sociales, puis allocation des frais de siège. Elles s'appliquent aux mois ouverts de la prévision FY26 et au budget FY27. Chaque exécution est tracée.","Business rules turn assumptions into a P&L: revenue, payroll and social charges, then the head-office allocation. They apply to the open months of the FY26 forecast and to the FY27 budget. Every run is logged."),
   X("Une règle centralisée applique la même méthode à toutes les entités : personne ne recalcule sa masse salariale ou son allocation à la main dans Excel.","A central rule applies the same method to every entity, so nobody recalculates payroll or allocations by hand in Excel.")],
 var:()=>[X("Trois lectures d'écarts, celles d'un comité de pilotage : le réel contre le budget (où en est-on ?), la prévision contre le budget (où va-t-on atterrir ?) et le budget FY27 contre l'atterrissage FY26 (que promet-on ?). L'écart de chiffre d'affaires est décomposé en effets volume, prix et mix.","Three variance views, the ones a steering committee uses: actual vs budget (where are we?), forecast vs budget (where will we land?) and FY27 budget vs FY26 landing (what are we committing to?). The revenue variance is split into volume, price and mix effects."),
   X("Dire « le CA est en retard de 285 k€ » ne suffit pas : il faut savoir si l'on a vendu moins, moins cher, ou pas au bon endroit. Chaque cause appelle une action différente.","Saying “revenue is 285k€ behind” is not enough: you need to know whether you sold less, cheaper, or in the wrong place. Each cause calls for a different action.")],
 wf:()=>[X("Le budget FY27 suit un circuit par entité : brouillon, soumis, approuvé. Une fois soumises, les données sont verrouillées ; le DAF approuve ou rejette avec un motif.","The FY27 budget follows a path for each entity: draft, submitted, approved. Once submitted its data is locked; the CFO approves, or rejects with a reason."),
   X("Le verrouillage évite qu'un chiffre change après la revue du DAF, et l'historique répond à la question « qui a validé quoi, et quand ? ».","Locking stops a figure changing after the CFO has reviewed it, and the history answers “who approved what, and when?”.")],
 imp:()=>[X("Chaque mois, le réel arrive de l'ERP. Le fichier est lu, chaque ligne est traduite (société ERP → entité, compte ERP → compte de planification, signe comptable), les lignes non reconnues sont rejetées, puis le mois est chargé dans le scénario Réel et clôturé : la prévision passe d'un cran.","Each month, actuals arrive from the ERP. The file is read, each row is translated (ERP company → entity, ERP account → planning account, accounting sign), unrecognised rows are rejected, then the month is loaded into the Actual scenario and closed: the forecast moves on one month."),
   X("La table de correspondance est le contrat entre la comptabilité et le contrôle de gestion : sans elle, les chiffres du plan et ceux de la compta ne se réconcilient jamais.","The mapping table is the contract between accounting and FP&A: without it, plan figures and ledger figures never reconcile.")],
 dim:()=>[X("Les dimensions sont les axes du cube : chaque chiffre se trouve à l'intersection d'un compte, d'une entité, d'une période, d'une année, d'un scénario et d'une version, les six dimensions obligatoires d'Oracle EPM Planning. Account et Period sont denses (presque toujours remplies), les autres éparses.","Dimensions are the axes of the cube: every figure sits at the intersection of an account, an entity, a period, a year, a scenario and a version, the six required dimensions in Oracle EPM Planning. Account and Period are dense (almost always filled), the others sparse."),
   X("Bien concevoir les dimensions est la décision la plus structurante d'un projet EPM : tout le reste en dépend.","Dimension design is the most far-reaching decision on an EPM project: everything else depends on it.")]
};
let EXPLAIN=null;
function explain(fn){const l=S.lang,o={};["fr","en"].forEach(x=>{S.lang=x;o[x]=fn()});S.lang=l;EXPLAIN=o}
function intro(tab){const n=NOTES[tab];if(!n||!S.notes)return"";const [a,b]=n();
  return `<div class="intro"><span class="ic" aria-hidden="true">i</span><div><p>${a}</p><p class="whyl"><b>${X("Pourquoi","Why")}</b>${b}</p></div></div>`}
function explainBox(){if(!EXPLAIN||!S.notes)return"";const x=L(EXPLAIN);
  return `<div class="explain" role="status"><span class="lab">${X("Ce qui vient de se passer","What just happened")}</span><button class="x" id="explain-close" aria-label="${X("Fermer","Close")}">×</button><h4>${x.title}</h4><p>${x.body}</p></div>`}
const why=(fr,en)=>S.notes?`<div class="why"><b>${X("Pourquoi","Why")}</b>${X(fr,en)}</div>`:"";

const TOUR=[
 {tab:"form",sel:()=>`#c-FC26-PAR-UNITS-${Math.min(S.closed,11)}`,setup:()=>{S.pov={plan:"FC26",ent:"PAR"}},
  fr:()=>["Re-prévoyez un mois",`Voici la prévision de Paris. Les mois clos sont du réel, verrouillé. Changez le volume de ${MONTHS_LONG.fr[Math.min(S.closed,11)]}, puis appuyez sur Entrée : la cellule devient orange. Le petit coin bleu signale un commentaire : cliquez sur la cellule pour le lire.`],
  en:()=>["Re-forecast a month",`This is Paris's forecast. Closed months are actuals, locked. Change the ${MONTHS_LONG.en[Math.min(S.closed,11)]} volume, then press Enter: the cell turns orange. The small blue corner marks a comment: click the cell to read it.`]},
 {tab:"form",sel:()=>"#save",setup:()=>{S.pov={plan:"FC26",ent:"PAR"}},
  fr:()=>["Enregistrez","Les contrôles s'exécutent d'abord, puis les données sont écrites et les règles recalculent le P&L. La modification est tracée dans l'historique de la cellule, avec l'ancienne et la nouvelle valeur."],
  en:()=>["Save","Checks run first, then the data is written and the rules recalculate the P&L. The change is recorded in the cell's history, with the old and new values."]},
 {tab:"form",sel:()=>"#sp-go",setup:()=>{S.pov={plan:"BUD27W",ent:"LIL"};S.spread={a:"UNITS",method:"seas"}},
  fr:()=>["Saisissez en top-down","Dans le budget FY27 de Lille, tapez un volume annuel (par exemple 300 000) et cliquez sur « Répartir » : l'outil le ventile sur les 12 mois selon la saisonnalité de la prévision FY26. Relisez, puis enregistrez."],
  en:()=>["Enter top-down","In Lille's FY27 budget, type an annual volume (for example 300000) and click “Spread”: the tool splits it over the 12 months using the FY26 forecast seasonality. Review it, then save."]},
 {tab:"sim",sel:()=>"[data-preset=slow]",
  fr:()=>["Testez un scénario","Cliquez sur « Ralentissement » : volumes −8 %, prix −2 %. Le P&L entier est recalculé dans un bac à sable, sans toucher au plan officiel."],
  en:()=>["Test a scenario","Click “Slowdown”: volumes −8%, prices −2%. The whole P&L is recalculated in a sandbox, without touching the official plan."]},
 {tab:"wf",sel:()=>"[data-wf=submit][data-e=PAR]",setup:()=>{S.role="planner"},
  fr:()=>["Soumettez, puis approuvez","Soumettez le budget FY27 de Paris, passez en rôle « Approbateur » et approuvez-le. Les chiffres sont copiés vers la version Final."],
  en:()=>["Submit, then approve","Submit Paris's FY27 budget, switch to the “Approver” role and approve it. The figures are copied to the Final version."]},
 {tab:"var",sel:()=>"#pvm",setup:()=>{S.varPov.cmp="FCvB";S.varPov.ent="TOTAL"},
  fr:()=>["Lisez les écarts","Ici, l'écart de chiffre d'affaires est décomposé : on a vendu moins (volume), à un prix différent (prix), et pas dans les mêmes proportions entre Paris et Lille (mix)."],
  en:()=>["Read the variances","Here the revenue variance is broken down: fewer units sold (volume), at a different price (price), and in different proportions between Paris and Lille (mix)."]},
 {tab:"imp",sel:()=>"#imp-sample",
  fr:()=>["Chargez le réel du mois",`Chargez l'export ERP de ${MONTHS_LONG.fr[Math.min(S.closed,11)]}, relisez le rapport de validation (une ligne est rejetée volontairement), chargez le réel, puis clôturez le mois : la prévision passe en ${S.closed+1}+${11-S.closed}.`],
  en:()=>["Load the month's actuals",`Load the ${MONTHS_LONG.en[Math.min(S.closed,11)]} ERP export, review the validation report (one row is rejected on purpose), load the actuals, then close the month: the forecast becomes ${S.closed+1}+${11-S.closed}.`]}
];
function renderTour(){
  document.querySelectorAll(".tour-target").forEach(n=>n.classList.remove("tour-target"));
  let card=document.getElementById("tourcard");
  if(S.tour==null){if(card)card.remove();document.body.classList.remove("touring");return}
  const st=TOUR[S.tour],[h,b]=L(st)();
  if(!card){card=document.createElement("div");card.id="tourcard";card.className="tourcard";card.setAttribute("role","dialog");document.body.appendChild(card)}
  document.body.classList.add("touring");
  card.innerHTML=`<span class="step">${X("Visite guidée","Guided tour")} · ${S.tour+1}/${TOUR.length}</span><h4>${h}</h4><p>${b}</p>
   <div class="nav"><span class="dots">${TOUR.map((_,i)=>`<i class="${i===S.tour?"on":""}"></i>`).join("")}</span>
   <button class="btn ghost" data-tour="end">${X("Quitter","Exit")}</button>
   ${S.tour>0?`<button class="btn" data-tour="prev">${X("Précédent","Back")}</button>`:""}
   <button class="btn primary" data-tour="next">${S.tour===TOUR.length-1?X("Terminer","Finish"):X("Suivant","Next")}</button></div>`;
  const el=document.querySelector(st.sel());
  if(el){const tgt=el.closest("td.in")||el;tgt.classList.add("tour-target");
    const r=tgt.getBoundingClientRect();if(r.top<60||r.bottom>innerHeight-200)tgt.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}
}
function goTour(i){if(i==null||i<0||i>=TOUR.length){S.tour=null;render();return}S.tour=i;const st=TOUR[i];S.tab=st.tab;if(st.setup)st.setup();render()}

/* ---------- UI shell ---------- */
const TABS=[["overview","Présentation","Overview"],["form","Saisie","Planning forms"],["sim","Simulation what-if","What-if simulation"],["rules","Règles de gestion","Business rules"],["var","Analyse des écarts","Variance analysis"],["wf","Workflow budget FY27","FY27 budget workflow"],["imp","Intégration du réel","Actuals integration"],["dim","Dimensions","Dimensions"],["about","Notes techniques","Technical notes"]];
const staleCount=()=>["FC26","BUD27W"].reduce((s,p)=>s+S.stale[p].rev.length+S.stale[p].pay.length+(S.stale[p].alloc?1:0),0);
function renderTabs(){
  const nP=Object.keys(S.pending).length,st=staleCount();
  document.getElementById("tabs").innerHTML=TABS.map(([id,fr,en])=>{let b="";
    if(id==="form"&&nP)b=`<span class="badge">${nP}</span>`;if(id==="rules"&&st)b=`<span class="badge">!</span>`;
    return `<button role="tab" id="tab-${id}" aria-selected="${S.tab===id}" data-tab="${id}">${X(fr,en)}${b}</button>`}).join("");
}
function render(){
  document.documentElement.lang=S.lang;
  document.getElementById("subtitle").textContent=X("Prévision FY26 et budget FY27 · Maison Lumen SAS (société fictive, luminaires)","FY26 forecast and FY27 budget · Maison Lumen SAS (fictional lighting company)");
  document.getElementById("footnote").textContent=X("Projet de portfolio · Toutes les données et personnes sont fictives · Aucun lien avec Oracle Corporation.","Portfolio project · All data and people are fictional · Not affiliated with Oracle Corporation.");
  document.getElementById("lang-fr").setAttribute("aria-pressed",S.lang==="fr");
  document.getElementById("lang-en").setAttribute("aria-pressed",S.lang==="en");
  document.getElementById("tour-start").textContent=X("Visite guidée","Guided tour");
  const nt=document.getElementById("notes-toggle");nt.textContent=S.notes?X("Masquer les notes","Hide notes"):X("Afficher les notes","Show notes");nt.setAttribute("aria-pressed",S.notes);
  renderTabs();
  document.getElementById("main").innerHTML=`<section class="panel" role="tabpanel">${intro(S.tab)}${explainBox()}${({overview:viewOverview,form:viewForm,sim:viewSim,rules:viewRules,var:viewVar,wf:viewWf,imp:viewImp,dim:viewDim,about:viewAbout})[S.tab]()}</section>`;
  if(S.tab==="var")drawCharts();
  if(S.tab==="sim")renderSimOut();
  if(S.tab==="form")renderCellPanel();
  renderTour();persist();
}
let toastTimer;
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2600)}
const chip=st=>`<span class="chip st-${st}">${stLabel(st)}</span>`;
const effChip=imp=>imp>.5?`<span class="chip fav">${X("Favorable","Favourable")}</span>`:imp<-.5?`<span class="chip unf">${X("Défavorable","Unfavourable")}</span>`:`<span class="chip neu">${X("Stable","Flat")}</span>`;
const entOpts=(sel,withTotal)=>(withTotal?[{id:"TOTAL"}]:[]).concat(ENT).map(e=>`<option value="${e.id}" ${sel===e.id?"selected":""}>${e.id==="TOTAL"?X("Total entités","Total entities"):e.id+" · "+L(e)}</option>`).join("");

/* ---------- view: planning forms ---------- */
function viewForm(){
  const {plan,ent:e}=S.pov,pl=PLANS[plan],st=S.status[e],mon=MONTHS[S.lang];
  const open=openMonths(plan,e),editable=open.length>0,isFc=plan==="FC26";
  const rows=ACC.filter(a=>!(entById[e].hq&&a.hqHide));
  const iss=editable?formIssues(plan,e):[];
  const issMap={};iss.forEach(i=>{(issMap[i.a+"|"+i.m]=issMap[i.a+"|"+i.m]||[]).push(i)});
  const nP=pendingFor(plan,e).length,stl=S.stale[plan]||{rev:[],pay:[],alloc:false};
  const stR=stl.rev.includes(e),stP=stl.pay.includes(e),stA=stl.alloc;
  let lock="";
  if(plan==="BUD27F")lock=X("version Final, alimentée à l'approbation","Final version, filled on approval");
  else if(plan==="BUD27W"&&st!=="draft")lock=X(st==="submitted"?"unité soumise pour approbation":"unité approuvée",st==="submitted"?"planning unit submitted for approval":"planning unit approved");
  else if(isFc&&!open.length)lock=X("exercice entièrement clos","year fully closed");
  const selK=S.sel?pk(S.sel.plan,S.sel.e,S.sel.a,S.sel.m):"";
  const body=rows.map(a=>{
    let tds="";
    for(let m=0;m<12;m++){
      const ck=pk(plan,e,a.id,m),cm=S.comments[ck]&&S.comments[ck].length?" cmt":"",sl=ck===selK?" sel":"";
      if(a.kind==="input"&&open.includes(m)){
        const isP=ck in S.pending,shown=isP?S.pending[ck]:fmtA(a.id,S.D[plan][e][a.id][m]);
        const ci=issMap[a.id+"|"+m]||[];
        const c=["in",isP?"dirty":"",ci.some(x=>x.sev==="e")?"err":"",ci.some(x=>x.sev==="w")?"wrn":""].join(" ")+cm+sl;
        const ttl=ci.map(x=>x.msg).join(" · ");
        tds+=`<td class="${c}"${ttl?` title="${esc(ttl)}"`:""}><input id="c-${plan}-${e}-${a.id}-${m}" data-a="${a.id}" data-m="${m}" value="${esc(shown)}" inputmode="decimal" aria-label="${esc(L(a))} ${mon[m]}"></td>`;
      } else tds+=`<td class="v${isFc&&m<S.closed&&a.kind!=="dyn"?" act":""}${a.kind==="input"?" ro":""}${cm}${sl}" data-cell="${a.id}|${m}">${fmtA(a.id,val(plan,e,a.id,m))}</td>`;
    }
    tds+=`<td class="v fy">${fmtA(a.id,sumVal(plan,e,a.id,ALL))}</td>`;
    return `<tr class="k-${a.kind}${a.final?" res":""}${a.type==="drv"?" drv":""}"><td class="acc"><span class="code">${a.code}</span>${esc(L(a))}</td>${tds}</tr>`;
  }).join("");
  const head=`<tr><th class="acc">${X("Compte","Account")}</th>${mon.map((x,i)=>`<th>${x}${isFc?`<span class="ptag ${i<S.closed?"a":"f"}">${i<S.closed?X("Réel","Act."):X("Prév.","Fcst")}</span>`:""}</th>`).join("")}<th>${X("Total","Total")}</th></tr>`;
  const ebe=sumVal(plan,e,"EBE",ALL),ca=sumVal(plan,e,"706",ALL);
  const addAcc=ACC.filter(a=>a.add&&!(entById[e].hq&&a.hqHide));
  if(!addAcc.some(a=>a.id===S.spread.a))S.spread.a=addAcc[0].id;
  const refName=L(SCN[PLANS[plan].ref||"BUD26"]);
  const curOpen=open.reduce((s,m)=>{const k=pk(plan,e,S.spread.a,m);return s+(k in S.pending?(parse(S.pending[k])||0):S.D[plan][e][S.spread.a][m])},0);
  const recent=S.audit.filter(x=>x.plan===plan&&x.e===e).slice(0,6);
  return `
  <div class="pov">
    <label>${X("Plan","Plan")}<select id="pov-plan">${Object.keys(PLANS).map(p=>`<option value="${p}" ${plan===p?"selected":""}>${planLabel(p)}</option>`).join("")}</select></label>
    <label>${X("Entité","Entity")}<select id="pov-ent">${entOpts(e,false)}</select></label>
    <label>${X("Scénario","Scenario")}<span class="fixed">${pl.sc}</span></label>
    <label>${X("Exercice","Year")}<span class="fixed">${pl.yr}</span></label>
    <label>${X("Version","Version")}<span class="fixed">${pl.ver}</span></label>
    <span class="spacer"></span>
    ${!isFc?`<label>${X("Unité de planification","Planning unit")}<span style="text-transform:none;letter-spacing:0">${chip(st)}</span></label>`:`<label>${X("Mois ouverts","Open months")}<span class="fixed">${open.length?`${mon[open[0]]} – ${mon[11]}`:"—"}</span></label>`}
  </div>
  <div class="statusline">
    ${lock?`<span class="flag lock">🔒 ${X("Lecture seule","Read-only")} · ${lock}</span>`:""}
    ${editable?`<span><strong class="num" id="npend">${nP}</strong> ${X("cellule(s) modifiée(s) non enregistrée(s)","unsaved cell change(s)")}</span>`:""}
    ${stR?`<span class="flag stale">▲ ${X("Chiffre d'affaires à recalculer","Revenue needs recalculating")}</span>`:""}
    ${stP?`<span class="flag stale">▲ ${X("Masse salariale à recalculer","Payroll needs recalculating")}</span>`:""}
    ${stA?`<span class="flag stale">▲ ${X("Allocation du siège à relancer","Head-office allocation needs re-running")}</span>`:""}
    ${!stR&&!stP&&!stA&&plan!=="BUD27F"?`<span class="flag" style="color:var(--good)">✓ ${X("Calculs à jour","Calculations up to date")}</span>`:""}
    <span class="grow"></span>
    ${!entById[e].hq?`<span>${X("Taux d'EBE","EBITDA margin")} <strong class="num">${ca?share(ebe/ca):"—"}</strong></span>`:""}
  </div>
  <div class="gridbox"><table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table></div>
  <div class="legend-cells">
    <span><i style="background:var(--cell-in)"></i>${X("Hypothèse saisie","Input assumption")}</span>
    <span><i style="background:var(--cell-dirty)"></i>${X("Modifiée, non enregistrée","Changed, not saved")}</span>
    <span><i style="background:var(--cell-calc)"></i>${X("Calculée par règle","Calculated by rule")}</span>
    ${isFc?`<span><i style="background:var(--cell-act)"></i>${X("Réel (ERP), verrouillé","Actual (ERP), locked")}</span>`:""}
    <span><i style="background:var(--cell-tot)"></i>${X("Sous-total (formule membre)","Subtotal (member formula)")}</span>
    <span><i style="background:linear-gradient(225deg,var(--warn) 0 30%,var(--cell-in) 30%)"></i>${X("Alerte de contrôle","Check warning")}</span>
    <span><i style="background:linear-gradient(135deg,var(--accent) 0 30%,var(--surface) 30%)"></i>${X("Commentaire","Comment")}</span>
  </div>
  ${editable?`<div class="spread">
    <span class="ttl">${X("Saisie top-down : répartir un total sur les mois ouverts","Top-down entry: spread a total over the open months")}</span>
    <label>${X("Compte","Account")}<select id="sp-acc">${addAcc.map(a=>`<option value="${a.id}" ${S.spread.a===a.id?"selected":""}>${a.code==="DRV"?"":a.code+" · "}${esc(L(a))}</option>`).join("")}</select></label>
    <label>${X(`Total ${open.length} mois`,`Total ${open.length} months`)}<input id="sp-total" inputmode="decimal" placeholder="${fmt0(curOpen)}"></label>
    <label>${X("Méthode","Method")}<select id="sp-method">
      <option value="seas" ${S.spread.method==="seas"?"selected":""}>${X(`Saisonnalité ${refName}`,`${refName} seasonality`)}</option>
      <option value="prop" ${S.spread.method==="prop"?"selected":""}>${X("Proportionnel aux valeurs actuelles","In proportion to current values")}</option>
      <option value="even" ${S.spread.method==="even"?"selected":""}>${X("Uniforme","Even")}</option></select></label>
    <button class="btn" id="sp-go">${X("Répartir","Spread")}</button>
  </div>
  <div class="formbar">
    <label class="check"><input type="checkbox" id="runonsave" ${S.runOnSave?"checked":""}> ${X("Lancer les règles après enregistrement","Run rules after save")}</label>
    <span class="grow"></span>
    <button class="btn ghost" id="discard" ${nP?"":"disabled"}>${X("Annuler les modifications","Discard changes")}</button>
    <button class="btn primary" id="save">${X("Enregistrer","Save")}</button>
  </div>`:""}
  <div class="twocol">
    <div class="panelcard" id="cellpanel"></div>
    <div style="display:grid;gap:16px">
    ${editable?`<div class="issues" style="margin:0"><h3>${X("Contrôles du formulaire","Form checks")}</h3>${iss.length?`<ul>${iss.slice(0,10).map(i=>`<li><span class="sev ${i.sev}">${i.sev==="e"?X("Erreur","Error"):X("Alerte","Warning")}</span><span class="where">${e} · ${accById[i.a].code==="DRV"?i.a:accById[i.a].code} · ${mon[i.m]}</span><span>${esc(i.msg)}</span></li>`).join("")}</ul>`:`<ul><li><span class="sev ok">OK</span><span>${X("Aucune anomalie sur ce formulaire.","No issues on this form.")}</span></li></ul>`}</div>`:""}
    <div class="panelcard"><h3>${X("Dernières modifications","Recent changes")} · ${e}</h3>
      ${recent.length?`<table class="tbl"><tbody>${recent.map(x=>`<tr><td class="mono" style="padding-left:0;white-space:nowrap">${showTs(x.ts)}</td><td>${accById[x.a].code==="DRV"?x.a:accById[x.a].code} · ${mon[x.m]}</td><td class="r mono">${fmtA(x.a,x.from)} → ${fmtA(x.a,x.to)}</td><td class="muted" style="padding-right:0">${esc(x.who)}</td></tr>`).join("")}</tbody></table>`:`<p class="muted" style="margin:0">${X("Aucune modification enregistrée sur ce formulaire.","No saved changes on this form yet.")}</p>`}</div>
    </div>
  </div>`;
}
function renderCellPanel(){
  const el=document.getElementById("cellpanel");if(!el)return;
  const mon=MONTHS_LONG[S.lang];
  if(!S.sel||S.sel.plan!==S.pov.plan||S.sel.e!==S.pov.ent){el.innerHTML=`<h3>${X("Cellule sélectionnée","Selected cell")}</h3><p class="muted" style="margin:0">${X("Cliquez sur une cellule pour afficher sa valeur, sa source, ses commentaires et son historique. Les cellules marquées d'un coin bleu ont déjà un commentaire.","Click a cell to see its value, source, comments and history. Cells with a blue corner already have a comment.")}</p>`;return}
  const {plan,e,a,m}=S.sel,A=accById[a],k=pk(plan,e,a,m);
  const src=plan==="FC26"&&m<S.closed?X("Réel chargé depuis l'ERP","Actual loaded from the ERP"):A.kind==="input"?X("Saisie (hypothèse)","Input (assumption)"):A.kind==="calc"?X(`Calculée par règle (${a==="706"?"BR_CalcRevenue":a==="ALLOC"?"BR_AllocHQ":"BR_CalcPayroll"})`,`Calculated by rule (${a==="706"?"BR_CalcRevenue":a==="ALLOC"?"BR_AllocHQ":"BR_CalcPayroll"})`):X("Formule membre","Member formula");
  const cms=S.comments[k]||[],hist=S.audit.filter(x=>x.plan===plan&&x.e===e&&x.a===a&&x.m===m);
  const srcLab={input:X("saisie","input"),spread:X("répartition","spread"),simulation:X("simulation publiée","published simulation"),import:X("import ERP","ERP import")};
  el.innerHTML=`<h3>${X("Cellule sélectionnée","Selected cell")}</h3>
    <div><div class="big">${fmtA(a,val(plan,e,a,m))}</div>
    <div class="kv"><span><b>${e}</b> · ${A.code==="DRV"?"":A.code+" "}${esc(L(A))}</span><span>${mon[m]}</span><span>${planLabel(plan)}</span></div>
    <div class="kv"><span>${X("Source","Source")} : <b>${src}</b></span></div></div>
    <div><h3 style="margin-bottom:6px">${X("Commentaires","Comments")} (${cms.length})</h3>
    ${cms.length?`<ul class="cmts">${cms.map(c=>`<li><div class="meta">${esc(c.who)} · ${showTs(c.ts)}</div>${esc(c.text||L(c))}</li>`).join("")}</ul>`:`<p class="muted" style="margin:0">${X("Aucun commentaire.","No comments.")}</p>`}</div>
    <textarea id="cp-text" placeholder="${X("Justifiez ce chiffre (hypothèse, source, décision)…","Explain this figure (assumption, source, decision)…")}"></textarea>
    <div><button class="btn" id="cp-add">${X("Ajouter un commentaire","Add comment")}</button></div>
    <div><h3 style="margin-bottom:6px">${X("Historique de la cellule","Cell history")}</h3>
    ${hist.length?`<ul class="cmts">${hist.map(x=>`<li><div class="meta">${esc(x.who)} · ${showTs(x.ts)} · ${srcLab[x.src]||x.src}</div><span class="mono">${fmtA(a,x.from)} → ${fmtA(a,x.to)}</span></li>`).join("")}</ul>`:`<p class="muted" style="margin:0">${A.kind==="input"?X("Pas de modification enregistrée.","No saved changes."):X("Valeur produite par une règle ou une formule : elle n'est pas saisie directement.","Value produced by a rule or formula: it is never entered directly.")}</p>`}</div>`;
}
function selectCell(plan,e,a,m){
  S.sel={plan,e,a,m};
  document.querySelectorAll(".grid td.sel").forEach(n=>n.classList.remove("sel"));
  const inp=document.getElementById(`c-${plan}-${e}-${a}-${m}`);
  const td=inp?inp.parentElement:document.querySelector(`.grid td[data-cell="${a}|${m}"]`);
  if(td)td.classList.add("sel");
  renderCellPanel();
}
function saveForm(){
  const {plan,ent:e}=S.pov,keys=pendingFor(plan,e);
  if(!keys.length){toast(X("Aucune modification à enregistrer","No changes to save"));return}
  const bad=keys.some(k=>{const [,,a,m]=k.split("|");return cellIssues(plan,e,a,+m,parse(S.pending[k])).some(i=>i.sev==="e")});
  if(bad){toast(X("Enregistrement refusé : corrigez les erreurs en rouge.","Save refused: fix the errors in red."));
    explain(()=>({title:X("Rien n'a été enregistré","Nothing was saved"),body:X("Au moins une cellule est invalide (en rouge). Le formulaire est validé en entier : une seule erreur bloque l'enregistrement, pour qu'un plan à moitié faux n'atteigne jamais la base.","At least one cell is invalid (in red). The whole form is validated: a single error blocks the save, so a half-wrong plan never reaches the database.")}));
    render();return}
  const b0={ca:sumVal(plan,e,"706",ALL),ebe:sumVal(plan,e,"EBE",ALL),grp:sumVal(plan,"TOTAL","REX",ALL)};
  const stl=S.stale[plan];let drv=false,pay=false,alloc=false;const who=actor(e);
  keys.forEach(k=>{const [,,a,m]=k.split("|"),from=S.D[plan][e][a][+m],to=parse(S.pending[k]);
    S.D[plan][e][a][+m]=to;audit(plan,e,a,+m,from,to,SPREAD_KEYS.has(k)?"spread":"input",who);delete S.pending[k];SPREAD_KEYS.delete(k);
    if(a==="UNITS"||a==="PRICE")drv=true;if(a==="HC"||a==="SAL")pay=true;if(a==="HC"||e==="LYO")alloc=true});
  if(drv&&!stl.rev.includes(e))stl.rev.push(e);
  if(pay&&!stl.pay.includes(e))stl.pay.push(e);
  if(alloc)stl.alloc=true;
  let ran=false,al=null;
  if(S.runOnSave&&(drv||pay||alloc)){if(drv)runRev([plan]);if(pay)runPay([plan]);if(alloc||pay&&e==="LYO")al=runAlloc([plan])[plan];ran=true}
  const b1={ca:sumVal(plan,e,"706",ALL),ebe:sumVal(plan,e,"EBE",ALL),grp:sumVal(plan,"TOTAL","REX",ALL)};
  explain(()=>{
    let t=X(`${keys.length} cellule(s) écrite(s) dans ${planLabel(plan)} pour ${e}, chacune tracée dans l'historique avec son ancienne valeur. Les sous-totaux (marge brute, EBE, résultat) sont des formules membres : ils se recalculent immédiatement.`,`${keys.length} cell(s) written to ${planLabel(plan)} for ${e}, each recorded in the history with its old value. Subtotals (gross margin, EBITDA, result) are member formulas, so they update immediately.`);
    if(drv&&ran)t+=X(` La règle de chiffre d'affaires a revalorisé les ventes (volume × prix) : ${eur(b0.ca)} → ${eur(b1.ca)} sur l'année.`,` The revenue rule re-valued sales (units × price): ${eur(b0.ca)} → ${eur(b1.ca)} for the year.`);
    if(pay&&ran)t+=X(" La masse salariale et les charges sociales ont été recalculées."," Payroll and social charges were recalculated.");
    if(al&&al.ok)t+=X(` L'allocation du siège a été relancée (${eur(al.pool)} répartis).`,` The head-office allocation was re-run (${eur(al.pool)} spread).`);
    if(al&&!al.ok)t+=X(` L'allocation n'a pas pu être relancée car ${al.locked} est verrouillée.`,` The allocation could not be re-run because ${al.locked} is locked.`);
    if(!ran&&(drv||pay||alloc))t+=X(" Les règles n'ont pas été lancées : les lignes calculées (gris) affichent encore l'ancien calcul."," Rules were not run: calculated lines (grey) still show the old values.");
    t+=X(` EBE de ${e} : ${eur(b0.ebe)} → ${eur(b1.ebe)} · résultat d'exploitation du groupe : ${eur(b0.grp)} → ${eur(b1.grp)}.`,` ${e} EBITDA: ${eur(b0.ebe)} → ${eur(b1.ebe)} · group operating result: ${eur(b0.grp)} → ${eur(b1.grp)}.`);
    return {title:X("Formulaire enregistré","Form saved"),body:t};
  });
  render();toast(X(`Formulaire enregistré · ${keys.length} cellule(s)`,`Form saved · ${keys.length} cell(s)`));
}
const SPREAD_KEYS=new Set();
function doSpread(){
  const {plan,ent:e}=S.pov,a=S.spread.a,ms=openMonths(plan,e);
  const tot=parse(document.getElementById("sp-total").value);
  if(isNaN(tot)||tot<0){toast(X("Saisissez un total positif.","Enter a positive total."));return}
  let w;
  if(S.spread.method==="even")w=ms.map(()=>1);
  else if(S.spread.method==="prop")w=ms.map(m=>S.D[plan][e][a][m]);
  else{const ref=PLANS[plan].ref;w=ms.map(m=>{const r=S.D[ref][e][a][m];return r>0?r:0})}
  let sw=w.reduce((s,x)=>s+x,0);if(!sw){w=ms.map(()=>1);sw=ms.length}
  const vals=w.map(x=>Math.floor(tot*x/sw));let rest=Math.round(tot)-vals.reduce((s,x)=>s+x,0);
  const order=w.map((x,i)=>i).sort((i,j)=>w[j]-w[i]);for(let i=0;rest>0;i=(i+1)%order.length,rest--)vals[order[i]]++;
  ms.forEach((m,i)=>{const k=pk(plan,e,a,m);S.pending[k]=fmt0(vals[i]);SPREAD_KEYS.add(k)});
  const refN=L(SCN[PLANS[plan].ref]),mon=MONTHS[S.lang],pk1=vals.indexOf(Math.max(...vals));
  explain(()=>({title:X("Total réparti","Total spread"),body:X(`${fmt0(tot)} ont été ventilés sur ${ms.length} mois (${S.spread.method==="seas"?`selon la saisonnalité du ${refN}`:S.spread.method==="prop"?"au prorata des valeurs existantes":"de façon uniforme"}), du plus fort en ${mon[ms[pk1]]} (${fmt0(vals[pk1])}) au plus faible. Les cellules sont orange : rien n'est encore écrit. Ajustez un mois si besoin, puis enregistrez.`,`${fmt0(tot)} was split over ${ms.length} months (${S.spread.method==="seas"?`using ${refN} seasonality`:S.spread.method==="prop"?"in proportion to existing values":"evenly"}), highest in ${mon[ms[pk1]]} (${fmt0(vals[pk1])}). The cells are orange: nothing is written yet. Adjust any month if needed, then save.`)}));
  render();
}

/* ---------- rules ---------- */
function logPush(rule,ok,fr,en){S.log.unshift({ts:stamp(),rule,ok,fr,en});S.log=S.log.slice(0,30)}
const planScope=plan=>{const ents=ENT.map(e=>e.id);if(plan==="FC26")return {ents,ms:fcM(),skipped:[]};
  return {ents:ents.filter(e=>S.status[e]==="draft"),ms:ALL,skipped:ents.filter(e=>S.status[e]!=="draft")}};
function runRev(plans=["FC26","BUD27W"]){const out={};plans.forEach(p=>{const s=planScope(p);const n=calcRevenue(S.D[p],s.ents,s.ms);
  S.stale[p].rev=S.stale[p].rev.filter(e=>!s.ents.includes(e));out[p]={n,skipped:s.skipped.filter(e=>!entById[e].hq)};
  logPush("BR_CalcRevenue",true,`${PLANS[p].fr()} : ${n} cellules calculées${out[p].skipped.length?` · ignorée(s), verrouillée(s) : ${out[p].skipped.join(", ")}`:""}`,`${PLANS[p].en()}: ${n} cells calculated${out[p].skipped.length?` · skipped, locked: ${out[p].skipped.join(", ")}`:""}`)});
  S.lastRun.rev=stamp();return out}
function runPay(plans=["FC26","BUD27W"]){const out={};plans.forEach(p=>{const s=planScope(p);const n=calcPayroll(S.D[p],s.ents,s.ms,S.rate);
  S.stale[p].pay=S.stale[p].pay.filter(e=>!s.ents.includes(e));out[p]={n,skipped:s.skipped};
  logPush("BR_CalcPayroll",true,`${PLANS[p].fr()} : ${n} cellules calculées (taux ${share(S.rate)})${s.skipped.length?` · ignorée(s) : ${s.skipped.join(", ")}`:""}`,`${PLANS[p].en()}: ${n} cells calculated (${share(S.rate)} rate)${s.skipped.length?` · skipped: ${s.skipped.join(", ")}`:""}`)});
  S.lastRun.pay=stamp();return out}
function runAlloc(plans=["FC26","BUD27W"]){const out={};plans.forEach(p=>{
  if(p==="BUD27W"){const locked=ENT.filter(e=>S.status[e.id]!=="draft").map(e=>e.id);
    if(locked.length){logPush("BR_AllocHQ",false,`${PLANS[p].fr()} : échec, unités verrouillées (${locked.join(", ")})`,`${PLANS[p].en()}: failed, locked planning units (${locked.join(", ")})`);out[p]={ok:false,locked:locked.join(", ")};return}}
  const ms=p==="FC26"?fcM():ALL,pool=allocate(S.D[p],ms);S.stale[p].alloc=false;
  out[p]={ok:true,pool,par:sumVal(p,"PAR","ALLOC",ms),lil:sumVal(p,"LIL","ALLOC",ms)};
  logPush("BR_AllocHQ",true,`${PLANS[p].fr()} : ${eur(pool)} répartis sur PAR et LIL`,`${PLANS[p].en()}: ${eur(pool)} spread over PAR and LIL`)});
  S.lastRun.alloc=stamp();return out}
function explainRules(rv,py,al){
  explain(()=>{const parts=[];let title=X("Règles exécutées","Rules completed");
    if(rv)parts.push(X(`Chiffre d'affaires recalculé (volume × prix) : ${rv.FC26?rv.FC26.n:0} cellules de prévision et ${rv.BUD27W?rv.BUD27W.n:0} cellules de budget FY27.`,`Revenue recalculated (units × price): ${rv.FC26?rv.FC26.n:0} forecast cells and ${rv.BUD27W?rv.BUD27W.n:0} FY27 budget cells.`)+(rv.BUD27W&&rv.BUD27W.skipped.length?X(` ${rv.BUD27W.skipped.join(", ")} ignorée(s) : on ne réécrit pas un budget en cours d'approbation.`,` ${rv.BUD27W.skipped.join(", ")} skipped: a budget under approval is never rewritten.`):""));
    if(py)parts.push(X(`Masse salariale recalculée : salaires = effectif × salaire moyen (13e mois en décembre), charges sociales = ${share(S.rate)} des salaires.`,`Payroll recalculated: salaries = headcount × average salary (13th month in December), social charges = ${share(S.rate)} of salaries.`));
    if(al){const a=al.BUD27W,f=al.FC26;
      if(f&&f.ok)parts.push(X(`Allocation du siège, mois de prévision : ${eur(f.pool)} répartis selon les effectifs, Paris ${eur(f.par)} et Lille ${eur(f.lil)}.`,`Head-office allocation, forecast months: ${eur(f.pool)} spread by headcount, Paris ${eur(f.par)} and Lille ${eur(f.lil)}.`));
      if(a&&a.ok)parts.push(X(`Budget FY27 : ${eur(a.pool)} répartis, Paris ${eur(a.par)} et Lille ${eur(a.lil)}. Lyon est crédité du même montant : son EBE tombe à zéro et le total groupe ne bouge pas. Une allocation déplace des coûts, elle n'en crée pas.`,`FY27 budget: ${eur(a.pool)} spread, Paris ${eur(a.par)} and Lille ${eur(a.lil)}. Lyon is credited the same amount: its EBITDA falls to zero and the group total does not move. An allocation moves costs, it does not create them.`));
      if(a&&!a.ok){title=X("Règle arrêtée sur le budget FY27","Rule stopped on the FY27 budget");parts.push(X(`L'allocation du budget FY27 ne s'est pas exécutée : ${a.locked} est soumise ou approuvée. Modifier des chiffres que le DAF est en train de revoir fausserait sa revue. Rejetez ou rouvrez l'entité, puis relancez.`,`The FY27 budget allocation did not run: ${a.locked} is submitted or approved. Changing figures the CFO is reviewing would undermine the review. Reject or reopen the entity, then run it again.`))}}
    return {title,body:parts.join(" ")}});
}
function viewRules(){
  const k=s=>esc(s).replace(/(FIX|ENDFIX|IF|ENDIF|DATACOPY|TO|@RELATIVE|@ISMBR|@LEVMBRS|&amp;\w+|\{\w+\})/g,"<b>$1</b>");
  const stale=key=>["FC26","BUD27W"].filter(p=>key==="alloc"?S.stale[p].alloc:S.stale[p][key].length);
  const foot=key=>{const s=stale(key);return `<div class="foot">${s.length?`<span class="flag stale">▲ ${X("À relancer","Needs re-running")} : ${s.map(planLabel).join(", ")}</span>`:`<span>✓ ${X("Calculs à jour","Up to date")}</span>`}<span>${X("Dernière exécution","Last run")} : ${showTs(S.lastRun[key])}</span><span style="flex:1"></span><button class="btn" data-run="${key}">${X("Lancer","Run")}</button></div>`};
  const mon=MONTHS[S.lang],fm=fcM();
  return `
  <div class="formbar" style="margin-top:0;margin-bottom:16px"><p class="muted" style="margin:0;max-width:72ch">${X(`Syntaxe des scripts de calcul Essbase utilisée par EPBCS, exécutée ici en JavaScript. Portée : mois ouverts de la prévision FY26 (&FcstMonths = ${fm.length?mon[fm[0]]+" – "+mon[11]:"—"}) et budget FY27 Working.`,`Written in the Essbase calc-script syntax EPBCS uses, and run here in JavaScript. Scope: open months of the FY26 forecast (&FcstMonths = ${fm.length?mon[fm[0]]+" – "+mon[11]:"—"}) and the FY27 Working budget.`)}</p><span class="grow"></span><button class="btn primary" id="runall">${X("Lancer toutes les règles","Run all rules")}</button></div>
  <div class="cols">
    <div class="card"><h3><span class="rid">BR_CalcRevenue</span>${X("Chiffre d'affaires","Revenue")}</h3>
      <p>${X("Valorise les ventes à partir des inducteurs : volume × prix moyen, mois par mois.","Values sales from the drivers: units × average price, month by month.")}</p>
      <pre class="calc">${k(`FIX({RTP_Scenario}, "Working",
    &FcstMonths, @RELATIVE("OpEntities", 0))
  "706" = "UNITS" * "PRICE";
ENDFIX`)}</pre>
      ${why("Si le prix ou le volume change, le chiffre d'affaires suit : aucun risque d'oublier de le retaper.","If price or volume changes, revenue follows: there is no risk of forgetting to retype it.")}
      ${foot("rev")}</div>
    <div class="card"><h3><span class="rid">BR_CalcPayroll</span>${X("Masse salariale","Payroll")}</h3>
      <p>${X("Salaires bruts = effectif × salaire moyen, avec un 13e mois versé en décembre. Charges sociales patronales = salaires × taux.","Gross salaries = headcount × average salary, with a 13th month paid in December. Employer social charges = salaries × rate.")}</p>
      <pre class="calc">${k(`FIX({RTP_Scenario}, "Working", &FcstMonths)
  "641" (
    "641" = "HC" * "SAL";
    IF (@ISMBR("Dec"))  /* 13e mois */
      "641" = "641" * 2;
    ENDIF
    "645" = "641" * "TX_CHARGES"->"BegBalance";
  )
ENDFIX`)}</pre>
      <div class="hc"><label for="rate">${X("Taux de charges sociales (hypothèse globale)","Social-charges rate (global assumption)")}</label><input id="rate" value="${fmtD(S.rate*100,1)}" inputmode="decimal"><span class="share">%</span></div>
      ${why("En France, les charges patronales ajoutent environ 40 à 45 % au brut : c'est souvent la plus grosse ligne de coût après les achats.","In France, employer charges add about 40–45% to gross pay: often the biggest cost line after purchases.")}
      ${foot("pay")}</div>
    <div class="card"><h3><span class="rid">BR_AllocHQ</span>${X("Allocation des frais de siège","Head-office cost allocation")}</h3>
      <p>${X("Répartit les coûts de Lyon au-dessus de l'EBE vers Paris et Lille, au prorata de l'effectif du mois. Lyon est crédité du même montant.","Allocates Lyon's costs above EBITDA to Paris and Lille, by that month's headcount. Lyon is credited the same amount.")}</p>
      <pre class="calc">${k(`FIX({RTP_Scenario}, "Working", &FcstMonths)
  "ALLOC" (
    IF (@ISMBR("LYO"))
      "ALLOC" = -("61"+"62"+"63"+"641"+"645");
    ELSE
      "ALLOC" = ("61"+"62"+"63"+"641"+"645")->"LYO"
        * "HC" / "HC"->"OpEntities";
    ENDIF )
ENDFIX`)}</pre>
      ${why("Chaque site porte sa part des coûts communs : on obtient une rentabilité réelle par site, pas seulement une marge brute.","Each site carries its share of shared costs, giving true profitability per site rather than just a gross margin.")}
      ${foot("alloc")}</div>
    <div class="card"><h3><span class="rid">BR_CopyToFinal</span>${X("Copie Working → Final","Copy Working → Final")}</h3>
      <p>${X("Déclenchée à l'approbation d'une entité du budget FY27 : fige les données validées dans la version Final.","Runs when an FY27 budget entity is approved and freezes the approved data in the Final version.")}</p>
      <pre class="calc">${k(`FIX("Budget", "FY27", {RTP_Entity})
  DATACOPY "Working" TO "Final";
ENDFIX`)}</pre>
      ${why("Working continue d'évoluer ; Final garde une photo figée de ce qui a été approuvé, la référence pour suivre l'année.","Working keeps evolving; Final keeps a frozen snapshot of what was approved, the reference for tracking the year.")}
      <div class="foot"><span>${X("Automatique (workflow)","Automatic (workflow)")}</span><span>${X("Dernière exécution","Last run")} : ${showTs(S.lastRun.copy)}</span></div></div>
  </div>
  <div class="sectitle"><h2>${X("Journal d'exécution","Run log")}</h2></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Horodatage","Time")}</th><th>${X("Règle","Rule")}</th><th>${X("Résultat","Result")}</th></tr></thead><tbody>
  ${S.log.map(l=>`<tr><td class="mono" style="white-space:nowrap">${showTs(l.ts)}</td><td class="mono">${l.rule}</td><td><span class="sev ${l.ok?"ok":"e"}" style="margin-right:8px">${l.ok?"OK":X("Échec","Failed")}</span>${esc(L(l))}</td></tr>`).join("")}
  </tbody></table></div>`;
}

/* ---------- view: what-if simulation ---------- */
const SLIDERS=[["vol",()=>X("Volumes vendus","Units sold"),-20,20,()=>X("Appliqué aux volumes et aux achats","Applied to volumes and purchases")],
  ["price",()=>X("Prix de vente","Selling prices"),-10,10,()=>X("Appliqué au prix moyen","Applied to the average price")],
  ["cogs",()=>X("Coût unitaire des achats","Unit purchase cost"),-10,15,()=>X("Inflation matières et composants","Materials and components inflation")],
  ["sal",()=>X("Salaires moyens","Average salaries"),-5,10,()=>X("Charges sociales recalculées en cascade","Social charges recalculated in turn")],
  ["ext",()=>X("Services extérieurs","External services"),-15,15,()=>X("Comptes 61 et 62 (loyers, énergie, honoraires)","Accounts 61 and 62 (rent, energy, fees)")]];
const PRESETS={slow:{vol:-8,price:-2,cogs:0,sal:0,ext:0},infl:{vol:0,price:1.5,cogs:6,sal:3,ext:4},up:{vol:6,price:1,cogs:1,sal:1.5,ext:0},zero:{vol:0,price:0,cogs:0,sal:0,ext:0}};
function buildSim(){
  const s=S.sim,base=s.base,c=JSON.parse(JSON.stringify(S.D[base])),ms=base==="FC26"?fcM():ALL,ids=ENT.map(e=>e.id);
  ids.forEach(e=>ms.forEach(m=>{const x=c[e];
    if(!entById[e].hq){x.UNITS[m]=Math.round(x.UNITS[m]*(1+s.vol/100));x.PRICE[m]=r2(x.PRICE[m]*(1+s.price/100));x["607"][m]=Math.round(x["607"][m]*(1+s.vol/100)*(1+s.cogs/100))}
    x.SAL[m]=Math.round(x.SAL[m]*(1+s.sal/100));x["61"][m]=Math.round(x["61"][m]*(1+s.ext/100));x["62"][m]=Math.round(x["62"][m]*(1+s.ext/100))}));
  calcRevenue(c,ids,ms);calcPayroll(c,ids,ms,S.rate);allocate(c,ms);SIMD=c;return ms;
}
function viewSim(){
  const s=S.sim;
  return `
  <div class="pov">
    <label>${X("Plan de départ","Base plan")}<select id="sim-base"><option value="FC26" ${s.base==="FC26"?"selected":""}>${planLabel("FC26")}</option><option value="BUD27W" ${s.base==="BUD27W"?"selected":""}>${planLabel("BUD27W")}</option></select></label>
    <label>${X("Entité affichée","Entity shown")}<select id="sim-ent">${entOpts(s.ent,true)}</select></label>
    <span class="spacer"></span>
    <label>${X("Mois simulés","Months simulated")}<span class="fixed">${s.base==="FC26"?(fcM().length?`${MONTHS[S.lang][fcM()[0]]} – ${MONTHS[S.lang][11]}`:"—"):X("Année complète","Full year")}</span></label>
  </div>
  <div class="presets"><span class="lab">${X("Scénarios","Presets")}</span>
    <button class="btn" data-preset="slow">${X("Ralentissement","Slowdown")}</button>
    <button class="btn" data-preset="infl">${X("Inflation des coûts","Cost inflation")}</button>
    <button class="btn" data-preset="up">${X("Reprise","Recovery")}</button>
    <button class="btn ghost" data-preset="zero">${X("Réinitialiser","Reset")}</button></div>
  <div class="sliders">${SLIDERS.map(([k,lab,mn,mx,hint])=>`<div class="slider"><div class="top"><label for="sl-${k}">${lab()}</label><output id="out-${k}" class="${s[k]>0?"pos":""}">${pct(s[k]/100)}</output></div>
    <input type="range" id="sl-${k}" data-sl="${k}" min="${mn}" max="${mx}" step="0.5" value="${s[k]}"><span class="hint">${hint()}</span></div>`).join("")}</div>
  <div id="sim-out"></div>
  <div class="formbar"><span class="muted" style="font-size:12.5px;max-width:70ch">${X("Publier écrit les hypothèses simulées dans le plan (mois ouverts, entités modifiables), relance les règles et trace chaque cellule dans l'historique.","Publishing writes the simulated assumptions into the plan (open months, editable entities), re-runs the rules and records every cell in the history.")}</span><span class="grow"></span><button class="btn primary" id="sim-publish">${X("Publier dans le plan","Publish to plan")}</button></div>`;
}
function renderSimOut(){
  const el=document.getElementById("sim-out");if(!el)return;
  const s=S.sim,ms=buildSim(),e=s.ent,base=s.base,bl=L(SCN[base]);
  const row=a=>{const b=sumVal(base,e,a,ALL),x=sumVal("SIM",e,a,ALL);return {a,b,x,d:x-b,imp:impact(a,x,b)}};
  const ca=row("706"),ebe=row("EBE"),rex=row("REX");
  const tile=(r,lab,extra)=>`<div class="kpi"><span class="lab">${lab}</span><span class="big">${eur(r.x)}</span><span class="sub"><span class="num">${signed(r.d)}</span><span class="num">${pct(r.b?r.d/Math.abs(r.b):NaN)}</span>${effChip(r.imp)}</span><span class="sub">${bl} <span class="num">${eur(r.b)}</span></span>${extra||""}</div>`;
  const ids=["UNITS","PRICE","706","607","MB","641","645","61","62","63","ALLOC","EBE","681","REX"].filter(a=>!(e==="LYO"&&accById[a].hqHide));
  const tbl=ids.map(a=>{const r=row(a),A=accById[a],drv=A.type==="drv";return `<tr class="${drv?"drvrow":""}"${A.kind==="dyn"?' style="font-weight:600"':""}><td><span class="mono muted" style="display:inline-block;width:52px">${A.code}</span>${esc(L(A))}</td><td class="r mono">${fmtA(a,r.b)}</td><td class="r mono">${fmtA(a,r.x)}</td><td class="r mono">${drv?(r.d>0?"+":r.d<0?"−":"")+fmtA(a,Math.abs(r.d)):signed(r.d).replace(" €","")}</td><td>${drv?'<span class="muted">—</span>':effChip(r.imp)}</td></tr>`}).join("");
  const neutral=SLIDERS.every(([k])=>!s[k]);
  el.innerHTML=`<div class="kpis">${tile(ca,X("Chiffre d'affaires","Revenue"))}${tile(ebe,X("EBE","EBITDA"),`<span class="sub">${X("Taux d'EBE","EBITDA margin")} <span class="num">${ca.x?share(ebe.x/ca.x):"—"}</span> · ${bl} <span class="num">${ca.b?share(ebe.b/ca.b):"—"}</span></span>`)}${tile(rex,X("Résultat d'exploitation","Operating result"))}</div>
  ${neutral?`<div class="narr"><p>${X("Aucun choc appliqué : le scénario est identique au plan. Choisissez un scénario prédéfini ou déplacez un curseur.","No shock applied: the scenario matches the plan. Pick a preset or move a slider.")}</p></div>`:`<div class="narr"><p>${esc(X(`Sur ${ms.length} mois, ce scénario porte le résultat d'exploitation ${e==="TOTAL"?"du groupe":"de "+e} à ${eur(rex.x)}, soit ${signed(rex.d)} par rapport au plan.`,`Over ${ms.length} months, this scenario brings ${e==="TOTAL"?"the group's":e+"'s"} operating result to ${eur(rex.x)}, ${signed(rex.d)} against the plan.`)+(s.vol?X(` À lui seul, un point de volume vaut environ ${eur(Math.abs(sensitivity("vol")))} de résultat.`,` One point of volume alone is worth about ${eur(Math.abs(sensitivity("vol")))} of result.`):""))}</p></div>`}
  <div class="sectitle"><h2>${X("Plan vs scénario","Plan vs scenario")}</h2><p>${e==="TOTAL"?X("Total entités","Total entities"):e} · ${X("Année","Full year")} · €</p></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Compte","Account")}</th><th class="r">${bl}</th><th class="r">${X("Scénario","Scenario")}</th><th class="r">${X("Écart","Variance")}</th><th>${X("Effet","Effect")}</th></tr></thead><tbody>${tbl}</tbody></table></div>`;
}
function sensitivity(k){const keep={...S.sim};SLIDERS.forEach(([x])=>S.sim[x]=0);S.sim[k]=1;buildSim();const v=sumVal("SIM",keep.ent,"REX",ALL)-sumVal(keep.base,keep.ent,"REX",ALL);Object.assign(S.sim,keep);buildSim();return v}
function publishSim(){
  const s=S.sim,base=s.base,ms=buildSim();
  if(SLIDERS.every(([k])=>!s[k])){toast(X("Aucun choc à publier.","No shock to publish."));return}
  const ents=base==="FC26"?ENT.map(e=>e.id):ENT.map(e=>e.id).filter(e=>S.status[e]==="draft");
  const skipped=ENT.map(e=>e.id).filter(e=>!ents.includes(e));
  const g0=sumVal(base,"TOTAL","REX",ALL);let n=0;
  ents.forEach(e=>["UNITS","PRICE","607","SAL","61","62"].forEach(a=>{if(entById[e].hq&&accById[a].hqHide)return;ms.forEach(m=>{const from=S.D[base][e][a][m],to=SIMD[e][a][m];if(from!==to){S.D[base][e][a][m]=to;audit(base,e,a,m,from,to,"simulation",actor(e));n++}})}));
  runRev([base]);runPay([base]);const al=runAlloc([base])[base];
  const g1=sumVal(base,"TOTAL","REX",ALL),preset={...s};
  SLIDERS.forEach(([k])=>S.sim[k]=0);
  explain(()=>({title:X("Scénario publié","Scenario published"),body:X(`${n} cellules d'hypothèses écrites dans ${planLabel(base)} (volumes ${pct(preset.vol/100)}, prix ${pct(preset.price/100)}, achats ${pct(preset.cogs/100)}, salaires ${pct(preset.sal/100)}, services extérieurs ${pct(preset.ext/100)}), chacune tracée dans l'historique. Les règles ont été relancées : résultat d'exploitation du groupe ${eur(g0)} → ${eur(g1)}.${skipped.length?` ${skipped.join(", ")} non modifiée(s) car verrouillée(s).`:""}${al&&!al.ok?" L'allocation n'a pas pu être relancée : une entité est verrouillée.":""} Les curseurs sont remis à zéro.`,`${n} assumption cells written to ${planLabel(base)} (volumes ${pct(preset.vol/100)}, prices ${pct(preset.price/100)}, purchases ${pct(preset.cogs/100)}, salaries ${pct(preset.sal/100)}, external services ${pct(preset.ext/100)}), each recorded in the history. The rules were re-run: group operating result ${eur(g0)} → ${eur(g1)}.${skipped.length?` ${skipped.join(", ")} left unchanged because locked.`:""}${al&&!al.ok?" The allocation could not be re-run: an entity is locked.":""} The sliders are reset to zero.`)}));
  render();toast(X("Scénario publié","Scenario published"));
}

/* ---------- view: variance ---------- */
function cmpCtx(){const p=S.varPov,c=CMP[p.cmp];let ms=QUARTERS[p.per];if(c.limit)ms=ms.filter(m=>m<S.closed);return {p,c,ms,e:p.ent}}
function pvm(c,e,ms){
  const ents=(e==="TOTAL"?ENT.map(x=>x.id):[e]).filter(x=>!entById[x].hq);if(!ents.length)return null;
  let vol=0,price=0;ents.forEach(x=>{const Uc=sumVal(c.cur,x,"UNITS",ms),Ur=sumVal(c.ref,x,"UNITS",ms),Rc=sumVal(c.cur,x,"706",ms),Rr=sumVal(c.ref,x,"706",ms);
    const Pr=Ur?Rr/Ur:0,Pc=Uc?Rc/Uc:0;vol+=(Uc-Ur)*Pr;price+=(Pc-Pr)*Uc});
  let mix=0,volT=vol;
  if(e==="TOTAL"){const Uc=sumVal(c.cur,e,"UNITS",ms),Ur=sumVal(c.ref,e,"UNITS",ms),Rr=sumVal(c.ref,e,"706",ms);volT=(Uc-Ur)*(Ur?Rr/Ur:0);mix=vol-volT}
  return {vol:volT,mix,price,ref:sumVal(c.ref,e,"706",ms),cur:sumVal(c.cur,e,"706",ms)};
}
function viewVar(){
  const {p,c,ms,e}=cmpCtx();
  if(e==="LYO"&&accById[p.acc].hqHide)p.acc="641";
  const curL=L(SCN[c.cur]),refL=L(SCN[c.ref]);
  const row=a=>{const cur=sumVal(c.cur,e,a,ms),ref=sumVal(c.ref,e,a,ms);return {a,cur,ref,d:cur-ref,imp:impact(a,cur,ref)}};
  const kpi=(a,label,extra)=>{const r=row(a);return `<div class="kpi"><span class="lab">${label}</span><span class="big">${eur(r.cur)}</span><span class="sub"><span class="num">${signed(r.d)}</span><span class="num">${pct(r.ref?r.d/Math.abs(r.ref):NaN)}</span>${effChip(r.imp)}</span><span class="sub">${refL} <span class="num">${eur(r.ref)}</span></span>${extra||""}</div>`};
  const ca=row("706"),ebe=row("EBE"),rex=row("REX");
  const marg=(v,base)=>base?share(v/base):"—";
  const lines=LINE_IDS.filter(a=>!(e==="LYO"&&accById[a].hqHide)).map(row);
  const best=lines.filter(x=>x.imp>.5).sort((x,y)=>y.imp-x.imp)[0],worst=lines.filter(x=>x.imp<-.5).sort((x,y)=>x.imp-y.imp)[0];
  const nm=x=>x?`${accById[x.a].code} ${L(accById[x.a])} (${signed(x.imp)})`:"";
  const empty=c.cur==="BUD27F"&&ENT.every(x=>S.status[x.id]!=="approved");
  const nApp=ENT.filter(x=>S.status[x.id]==="approved").length;
  const pv=pvm(c,e,ms);
  const narr=X(`${curL} : résultat d'exploitation de ${eur(rex.cur)}, soit ${signed(rex.d)} (${pct(rex.ref?rex.d/Math.abs(rex.ref):NaN)}) par rapport au ${refL}. Taux d'EBE ${marg(ebe.cur,ca.cur)} contre ${marg(ebe.ref,ca.ref)}.${best?` Principal facteur favorable : ${nm(best)}.`:""}${worst?` Principal facteur défavorable : ${nm(worst)}.`:""}`,
    `${curL}: operating result of ${eur(rex.cur)}, ${signed(rex.d)} (${pct(rex.ref?rex.d/Math.abs(rex.ref):NaN)}) against ${refL}. EBITDA margin ${marg(ebe.cur,ca.cur)} vs ${marg(ebe.ref,ca.ref)}.${best?` Main favourable driver: ${nm(best)}.`:""}${worst?` Main unfavourable driver: ${nm(worst)}.`:""}`);
  const tblIds=["UNITS","PRICE","HC","706","607","MB","641","645","61","62","63","ALLOC","EBE","681","REX"].filter(a=>!(e==="LYO"&&accById[a].hqHide));
  const tbl=tblIds.map(a=>{const r=row(a),A=accById[a],drv=A.type==="drv",strong=A.kind==="dyn";
    return `<tr class="${drv?"drvrow":""}"${strong?' style="font-weight:600"':""}><td><span class="mono muted" style="display:inline-block;width:52px">${A.code}</span>${esc(L(A))}</td><td class="r mono">${fmtA(a,r.ref)}</td><td class="r mono">${fmtA(a,r.cur)}</td><td class="r mono">${drv?(r.d>0?"+":r.d<0?"−":"")+fmtA(a,Math.abs(r.d)):signed(r.d).replace(" €","")}</td><td class="r mono">${pct(r.ref?r.d/Math.abs(r.ref):NaN)}</td><td>${drv?'<span class="muted">—</span>':effChip(r.imp)}</td></tr>`}).join("");
  const accOpts=["706","607","MB","641","645","61","62","63","ALLOC","EBE","681","REX"].filter(a=>!(e==="LYO"&&accById[a].hqHide)).map(a=>`<option value="${a}" ${p.acc===a?"selected":""}>${accById[a].code} · ${esc(L(accById[a]))}</option>`).join("");
  const perLab=q=>q==="FY"?(c.limit?X(`Cumul à fin ${MONTHS_LONG.fr[S.closed-1]}`,`Year to date (${MONTHS_LONG.en[S.closed-1]})`):X("Année","Full year")):q;
  const perOk=q=>!c.limit||QUARTERS[q].some(m=>m<S.closed);
  const partial=c.limit&&p.per!=="FY"&&QUARTERS[p.per].some(m=>m>=S.closed);
  const pvText=pv?X(`Le chiffre d'affaires passe de ${eur(pv.ref)} à ${eur(pv.cur)} : effet volume ${signed(pv.vol)}, effet prix ${signed(pv.price)}${e==="TOTAL"?`, effet mix ${signed(pv.mix)}`:""}.`,`Revenue moves from ${eur(pv.ref)} to ${eur(pv.cur)}: volume effect ${signed(pv.vol)}, price effect ${signed(pv.price)}${e==="TOTAL"?`, mix effect ${signed(pv.mix)}`:""}.`):"";
  return `
  <div class="pov">
    <label style="flex:1 1 260px">${X("Comparaison","Comparison")}<select id="var-cmp">${Object.keys(CMP).map(k=>`<option value="${k}" ${p.cmp===k?"selected":""}>${CMP[k].lab()}</option>`).join("")}</select></label>
    <label>${X("Entité","Entity")}<select id="var-ent">${entOpts(e,true)}</select></label>
    <label>${X("Période","Period")}<select id="var-per">${Object.keys(QUARTERS).filter(perOk).map(q=>`<option value="${q}" ${p.per===q?"selected":""}>${perLab(q)}</option>`).join("")}</select></label>
  </div>
  ${partial?`<div class="banner">${X(`${p.per} partiel : le réel n'est disponible que jusqu'à ${MONTHS_LONG.fr[S.closed-1]}.`,`Partial ${p.per}: actuals are only available up to ${MONTHS_LONG.en[S.closed-1]}.`)}</div>`:""}
  ${c.cur==="BUD27F"?`<div class="banner">${X(`Version Final : ${nApp}/3 entité(s) approuvée(s). Les entités non approuvées apparaissent à zéro.`,`Final version: ${nApp}/3 entities approved. Entities not yet approved show as zero.`)}</div>`:""}
  <div class="kpis">${kpi("706",X("Chiffre d'affaires","Revenue"))}${kpi("EBE",X("EBE","EBITDA"),`<span class="sub">${X("Taux d'EBE","EBITDA margin")} <span class="num">${marg(ebe.cur,ca.cur)}</span> · ${refL} <span class="num">${marg(ebe.ref,ca.ref)}</span></span>`)}${kpi("REX",X("Résultat d'exploitation","Operating result"))}</div>
  ${empty?"":`<div class="narr"><p>${esc(narr)}</p></div>`}
  <div class="two">
    <div class="chartcard"><div class="head"><h3>${X("Impact de chaque ligne sur le résultat","Impact of each line on the result")}</h3><span class="note">${X(`${curL} moins ${refL}, signé selon l'effet sur le résultat`,`${curL} minus ${refL}, signed by its effect on the result`)}</span></div><div class="chartscroll" id="bridge"></div></div>
    ${pv?`<div class="chartcard" id="pvm"><div class="head"><h3>${X("Analyse prix / volume / mix du chiffre d'affaires","Revenue price / volume / mix analysis")}</h3><span class="note">${X("Volume au prix de référence, prix sur les volumes réalisés, mix entre entités","Volume at reference price, price on actual volumes, mix between entities")}</span></div><div class="chartscroll" id="pvmchart"></div><p class="muted" style="margin:6px 0 0;font-size:12.5px">${esc(pvText)}</p></div>`:""}
  </div>
  <div class="chartcard" style="margin-top:16px"><div class="head"><h3>${X("Profil mensuel","Monthly profile")}</h3>
      <label class="note" style="display:flex;gap:6px;align-items:center">${X("Compte","Account")} <select id="var-acc" style="border:1px solid var(--line-2);border-radius:5px;padding:3px 6px;background:var(--surface-2)">${accOpts}</select></label></div>
      <div class="legend"><span><i style="background:var(--s-act)"></i>${refL}</span><span><i style="background:var(--s-bud)"></i>${curL}</span>${c.cur==="FC26"&&S.closed<12?`<span><i style="background:repeating-linear-gradient(90deg,var(--s-bud) 0 4px,transparent 4px 7px)"></i>${X("Mois en prévision","Forecast months")}</span>`:""}</div>
      <div class="chartscroll" id="line"></div></div>
  <div class="sectitle"><h2>${X("Compte de résultat détaillé","Detailed P&L")}</h2><p>${e==="TOTAL"?X("Total entités","Total entities"):e} · ${perLab(p.per)} · €</p></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Compte","Account")}</th><th class="r">${refL}</th><th class="r">${curL}</th><th class="r">${X("Écart","Variance")}</th><th class="r">${X("Écart %","Var. %")}</th><th>${X("Effet","Effect")}</th></tr></thead><tbody>${tbl}</tbody></table></div>`;
}
const tip=document.getElementById("tip");
function showTip(html,x,y){tip.innerHTML=html;tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;let lx=x+14,ly=y-h-10;if(lx+w>innerWidth-8)lx=x-w-14;if(ly<8)ly=y+16;tip.style.left=lx+"px";tip.style.top=ly+"px"}
function hideTip(){tip.hidden=true}
function niceStep(range,count){const raw=range/count||1;const mag=Math.pow(10,Math.floor(Math.log10(raw)));const n=raw/mag;return (n<1.5?1:n<3?2:n<7?5:10)*mag}
function compact(v){const a=Math.abs(v),s=v<0?"−":"";if(a>=1e6)return s+fmtD(a/1e6,1)+" M";if(a>=1e3)return s+fmt0(a/1e3)+" k";return s+fmt0(a)}
function diverging(elId,rows,aria){
  const W=580,labW=220,rowH=28,top=8,H=top+rows.length*rowH+26;
  const maxAbs=Math.max(1,...rows.map(d=>Math.abs(d.v))),step=niceStep(maxAbs*2,4),lim=Math.ceil(maxAbs/step)*step;
  const x0=labW+(W-labW-30)/2,sx=(W-labW-40)/2/lim;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:460px;display:block" role="img" aria-label="${esc(aria)}">`;
  for(let v=-lim;v<=lim+1e-6;v+=step){const x=x0+v*sx;s+=`<line class="gridline" x1="${x}" x2="${x}" y1="${top}" y2="${H-22}"/><text class="axis" x="${x}" y="${H-6}" text-anchor="middle">${compact(v)}</text>`}
  rows.forEach((d,i)=>{const y=top+i*rowH,bh=15,by=y+(rowH-bh)/2,w=Math.abs(d.v)*sx,x=d.v>=0?x0:x0-w;
    s+=`<text x="${labW-10}" y="${y+rowH/2+4}" text-anchor="end" style="font-size:12px;fill:var(--ink-2)">${d.code?`<tspan style="font-family:var(--f-num);fill:var(--muted);font-size:11px">${d.code}</tspan> `:""}${esc(d.label.length>26?d.label.slice(0,25)+"…":d.label)}</text>`;
    if(w>.5)s+=`<rect x="${x}" y="${by}" width="${Math.max(w,2)}" height="${bh}" rx="3" fill="${d.v>=0?"var(--good)":"var(--bad)"}"/>`;
    s+=`<text x="${d.v>=0?x0-5:x0+5}" y="${y+rowH/2+4}" text-anchor="${d.v>=0?"end":"start"}" style="font-size:11px;fill:var(--ink-2);font-family:var(--f-num)">${compact(d.v)}</text>`;
    s+=`<rect class="hit" data-i="${i}" x="0" y="${y}" width="${W}" height="${rowH}" fill="transparent"/>`});
  s+=`<line x1="${x0}" x2="${x0}" y1="${top}" y2="${H-22}" stroke="var(--ink-2)" stroke-width="1"/></svg>`;
  const el=document.getElementById(elId);el.innerHTML=s;
  el.querySelectorAll(".hit").forEach(r=>{r.addEventListener("mousemove",ev=>showTip(rows[+r.dataset.i].tip,ev.clientX,ev.clientY));r.addEventListener("mouseleave",hideTip)});
}
function drawCharts(){
  const {p,c,ms,e}=cmpCtx(),curL=L(SCN[c.cur]),refL=L(SCN[c.ref]);
  diverging("bridge",LINE_IDS.filter(a=>!(e==="LYO"&&accById[a].hqHide)).map(a=>{const cur=sumVal(c.cur,e,a,ms),ref=sumVal(c.ref,e,a,ms),v=impact(a,cur,ref);
    return {code:accById[a].code,label:L(accById[a]),v,tip:`<strong>${accById[a].code} · ${esc(L(accById[a]))}</strong><br>${refL} <span class="tv">${eur(ref)}</span><br>${curL} <span class="tv">${eur(cur)}</span><br>${v>=0?X("Favorable","Favourable"):X("Défavorable","Unfavourable")} <span class="tv">${signed(v)}</span>`}}),X("Impact par ligne","Impact by line"));
  const pv=pvm(c,e,ms);
  if(pv){const rows=[{label:X("Effet volume","Volume effect"),v:pv.vol,t:X("Écart d'unités × prix de référence","Unit variance × reference price")},{label:X("Effet prix","Price effect"),v:pv.price,t:X("Écart de prix × unités réalisées","Price variance × units achieved")}];
    if(e==="TOTAL")rows.splice(1,0,{label:X("Effet mix (entités)","Mix effect (entities)"),v:pv.mix,t:X("Répartition des ventes entre Paris et Lille, qui n'ont pas le même prix moyen","Split of sales between Paris and Lille, which have different average prices")});
    rows.push({label:X("Écart total de CA","Total revenue variance"),v:pv.cur-pv.ref,t:`${refL} ${eur(pv.ref)} → ${curL} ${eur(pv.cur)}`});
    diverging("pvmchart",rows.map(r=>({label:r.label,v:r.v,tip:`<strong>${esc(r.label)}</strong><br><span class="tv">${signed(r.v)}</span><br>${esc(r.t)}`})),X("Prix volume mix","Price volume mix"))}
  const a=p.acc,mon=MONTHS[S.lang],curMs=c.limit?actM():ALL,cl=S.closed;
  const ref=ALL.map(m=>val(c.ref,e,a,m)),cur=ALL.map(m=>val(c.cur,e,a,m));
  const LW=1100,LH=240,pl=60,pr=14,pt=12,pb=26;
  const vis=[...ref,...curMs.map(m=>cur[m])];let mn=Math.min(0,...vis),mx=Math.max(...vis);if(mx===mn)mx=mn+1;
  const st=niceStep(mx-mn,4);mn=Math.floor(mn/st)*st;mx=Math.ceil(mx/st)*st;
  const Xp=m=>pl+m*(LW-pl-pr)/11,Y=v=>pt+(mx-v)/(mx-mn)*(LH-pt-pb);
  let g=`<svg viewBox="0 0 ${LW} ${LH}" width="100%" style="min-width:520px;display:block" role="img" aria-label="${X("Profil mensuel","Monthly profile")}">`;
  for(let v=mn;v<=mx+1e-6;v+=st)g+=`<line class="gridline" x1="${pl}" x2="${LW-pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${pl-8}" y="${Y(v)+4}" text-anchor="end">${compact(v)}</text>`;
  mon.forEach((m,i)=>g+=`<text class="axis" x="${Xp(i)}" y="${LH-8}" text-anchor="middle">${m.replace(".","")}</text>`);
  if(ms.length&&ms.length<12)g+=`<rect x="${Xp(ms[0])-8}" y="${pt}" width="${Xp(ms[ms.length-1])-Xp(ms[0])+16}" height="${LH-pt-pb}" fill="var(--accent-soft)" opacity=".7"/>`;
  const line=(arr,idx)=>idx.map((m,i)=>`${i?"L":"M"}${Xp(m).toFixed(1)},${Y(arr[m]).toFixed(1)}`).join("");
  g+=`<path d="${line(ref,ALL)}" fill="none" stroke="var(--s-act)" stroke-width="2" stroke-linejoin="round"/>`;
  if(c.cur==="FC26"&&cl<12){g+=`<path d="${line(cur,ALL.slice(0,cl))}" fill="none" stroke="var(--s-bud)" stroke-width="2" stroke-linejoin="round"/><path d="${line(cur,ALL.slice(Math.max(cl-1,0)))}" fill="none" stroke="var(--s-bud)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>`}
  else if(curMs.length)g+=`<path d="${line(cur,curMs)}" fill="none" stroke="var(--s-bud)" stroke-width="2" stroke-linejoin="round"/>`;
  const lastC=curMs[curMs.length-1];
  g+=`<circle cx="${Xp(11)}" cy="${Y(ref[11])}" r="4" fill="var(--s-act)" stroke="var(--surface)" stroke-width="2"/>${lastC!=null?`<circle cx="${Xp(lastC)}" cy="${Y(cur[lastC])}" r="4" fill="var(--s-bud)" stroke="var(--surface)" stroke-width="2"/>`:""}`;
  g+=`<line id="xh" x1="0" x2="0" y1="${pt}" y2="${LH-pb}" stroke="var(--ink-2)" stroke-dasharray="3 3" visibility="hidden"/><circle id="xa" r="4.5" fill="var(--s-act)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/><circle id="xb" r="4.5" fill="var(--s-bud)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`;
  g+=`<rect id="lhit" x="${pl}" y="${pt}" width="${LW-pl-pr}" height="${LH-pt-pb}" fill="transparent"/></svg>`;
  const lineEl=document.getElementById("line");lineEl.innerHTML=g;
  const svg=lineEl.querySelector("svg"),hit=lineEl.querySelector("#lhit"),xh=svg.querySelector("#xh"),xa=svg.querySelector("#xa"),xb=svg.querySelector("#xb");
  hit.addEventListener("mousemove",ev=>{const r=svg.getBoundingClientRect(),vx=(ev.clientX-r.left)*LW/r.width,i=Math.max(0,Math.min(11,Math.round((vx-pl)/((LW-pl-pr)/11))));
    const hasC=curMs.includes(i);
    xh.setAttribute("visibility","visible");xa.setAttribute("visibility","visible");xb.setAttribute("visibility",hasC?"visible":"hidden");
    xh.setAttribute("x1",Xp(i));xh.setAttribute("x2",Xp(i));xa.setAttribute("cx",Xp(i));xa.setAttribute("cy",Y(ref[i]));xb.setAttribute("cx",Xp(i));xb.setAttribute("cy",Y(cur[i]));
    const tag=c.cur==="FC26"?(i<cl?X(" (réel)"," (actual)"):X(" (prévision)"," (forecast)")):"";
    showTip(`<strong>${mon[i]} · ${accById[a].code}</strong><br>${refL} <span class="tv">${fmtA(a,ref[i])}</span>${hasC?`<br>${curL}${tag} <span class="tv">${fmtA(a,cur[i])}</span><br>${X("Écart","Variance")} <span class="tv">${signed(cur[i]-ref[i])}</span>`:`<br><span style="opacity:.75">${X("Pas encore de réel","No actuals yet")}</span>`}`,ev.clientX,ev.clientY)});
  hit.addEventListener("mouseleave",()=>{[xh,xa,xb].forEach(n=>n.setAttribute("visibility","hidden"));hideTip()});
}

/* ---------- view: workflow ---------- */
let rejecting=null;
function blockers(e){const r=[],s=S.stale.BUD27W;
  if(pendingFor("BUD27W",e).length)r.push(X("Modifications non enregistrées","Unsaved changes"));
  if(s.rev.includes(e))r.push(X("Chiffre d'affaires non recalculé","Revenue not recalculated"));
  if(s.pay.includes(e))r.push(X("Masse salariale non recalculée","Payroll not recalculated"));
  if(s.alloc)r.push(X("Allocation du siège non relancée","Head-office allocation not re-run"));
  if(formIssues("BUD27W",e).some(i=>i.sev==="e"))r.push(X("Erreurs de contrôle","Check errors"));
  return r}
function viewWf(){
  const planner=S.role==="planner";
  const cards=ENT.map(x=>{const st=S.status[x.id],bl=st==="draft"?blockers(x.id):[];
    const rex=sumVal("BUD27W",x.id,"REX",ALL),ebe=sumVal("BUD27W",x.id,"EBE",ALL);
    const nC=Object.keys(S.comments).filter(k=>k.startsWith("BUD27W|"+x.id+"|")).reduce((s,k)=>s+S.comments[k].length,0);
    let acts="";
    if(planner){if(st==="notStarted")acts+=`<button class="btn" data-wf="start" data-e="${x.id}">${X("Démarrer","Start")}</button>`;
      if(st==="draft")acts+=`<button class="btn primary" data-wf="submit" data-e="${x.id}" ${bl.length?"disabled":""}>${X("Soumettre","Submit")}</button>`}
    else{if(st==="submitted")acts+=`<button class="btn primary" data-wf="approve" data-e="${x.id}">${X("Approuver","Approve")}</button><button class="btn danger" data-wf="reject" data-e="${x.id}">${X("Rejeter","Reject")}</button>`;
      if(st==="approved")acts+=`<button class="btn" data-wf="reopen" data-e="${x.id}">${X("Rouvrir","Reopen")}</button>`}
    const rej=rejecting===x.id?`<textarea id="rej-${x.id}" placeholder="${X("Motif du rejet (obligatoire)","Reason for rejection (required)")}"></textarea><div class="acts"><button class="btn danger" data-wf="rejectok" data-e="${x.id}">${X("Confirmer le rejet","Confirm rejection")}</button><button class="btn ghost" data-wf="rejectcancel" data-e="${x.id}">${X("Annuler","Cancel")}</button></div>`:"";
    return `<div class="card"><div class="row"><h3 style="font-size:15px">${x.id} · ${esc(L(x))}</h3>${chip(st)}</div>
      <div class="row who"><span>${X("Responsable","Owner")} : ${x.owner}</span><span>${nC} ${X("commentaire(s)","comment(s)")}</span></div>
      <div class="row who"><span>${X("EBE","EBITDA")} <span class="num">${eur(ebe)}</span></span><span>${X("Résultat","Result")} <span class="num">${eur(rex)}</span></span></div>
      ${planner&&bl.length?`<div class="reason">▲ ${bl.map(esc).join(" · ")}</div>`:""}
      ${rej||(acts?`<div class="acts">${acts}</div>`:"")}</div>`}).join("");
  return `
  <div class="flow">${["notStarted","draft","submitted","approved"].map(chip).join('<span class="arrow">→</span>')}</div>
  <div class="pov" style="margin-bottom:16px"><label>${X("Vous agissez en tant que","You are acting as")}<span class="seg" role="group" style="margin-top:2px"><button type="button" data-role="planner" aria-pressed="${planner}">${X("Contrôleur de gestion","Management accountant")}</button><button type="button" data-role="approver" aria-pressed="${!planner}">${X("Approbateur (DAF)","Approver (CFO)")} · ${APPROVER}</button></span></label></div>
  <div class="pu">${cards}</div>
  <div class="sectitle"><h2>${X("Historique","History")}</h2></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Horodatage","Time")}</th><th>${X("Entité","Entity")}</th><th>${X("Transition","Transition")}</th><th>${X("Par","By")}</th><th>${X("Commentaire","Comment")}</th></tr></thead><tbody>
  ${S.history.slice().reverse().map(h=>`<tr><td class="mono" style="white-space:nowrap">${showTs(h.ts)}</td><td class="mono">${h.ent}</td><td style="white-space:nowrap">${chip(h.from)} → ${chip(h.to)}</td><td>${esc(h.who)}</td><td>${esc(h.c||"—")}</td></tr>`).join("")}
  </tbody></table></div>`;
}
function wf(action,e){
  const from=S.status[e];let to=from,who=S.role==="planner"?entById[e].owner:APPROVER,c="";
  if(action==="start")to="draft";
  if(action==="submit"){if(blockers(e).length)return;to="submitted"}
  if(action==="approve"){to="approved";STORED.forEach(a=>S.D.BUD27F[e][a]=S.D.BUD27W[e][a].slice());S.lastRun.copy=stamp();logPush("BR_CopyToFinal",true,`${e} copié de Working vers Final`,`${e} copied from Working to Final`)}
  if(action==="reopen")to="draft";
  if(action==="reject"){rejecting=e;render();const ta=document.getElementById("rej-"+e);ta&&ta.focus();return}
  if(action==="rejectcancel"){rejecting=null;render();return}
  if(action==="rejectok"){c=((document.getElementById("rej-"+e)||{}).value||"").trim();if(!c){toast(X("Indiquez un motif de rejet.","Enter a reason for rejection."));return}to="draft";rejecting=null}
  S.status[e]=to;S.history.push({ts:stamp(),ent:e,from,to,who,c});
  explain(()=>{const o=entById[e].owner,M={
    start:[X(`${e} démarrée`,`${e} started`),X(`L'unité de planification passe en brouillon : ${o} peut saisir son budget.`,`The planning unit moves to draft: ${o} can enter the budget.`)],
    submit:[X(`${e} soumise`,`${e} submitted`),X(`Le budget FY27 de ${e} est maintenant en lecture seule pour le contrôleur, et ${APPROVER} peut le revoir, commentaires compris. Les contrôles étaient au vert : pas de modification en attente, calculs à jour, aucune erreur.`,`${e}'s FY27 budget is now read-only for the accountant, and ${APPROVER} can review it, comments included. The checks were green: no pending changes, calculations up to date, no errors.`)],
    approve:[X(`${e} approuvée`,`${e} approved`),X(`La règle BR_CopyToFinal a copié la version Working vers Final pour ${e}. Choisissez « Budget FY27 (Final) » dans l'analyse des écarts pour voir les chiffres approuvés.`,`BR_CopyToFinal copied the Working version to Final for ${e}. Choose “Budget FY27 (Final)” in the variance analysis to see the approved figures.`)],
    rejectok:[X(`${e} rejetée`,`${e} rejected`),X(`${e} repasse en brouillon avec le motif « ${esc(c)} ». ${o} peut à nouveau modifier ses chiffres puis soumettre.`,`${e} goes back to draft with the reason “${esc(c)}”. ${o} can edit the figures again and resubmit.`)],
    reopen:[X(`${e} rouverte`,`${e} reopened`),X(`${e} redevient modifiable. La version Final garde la dernière copie approuvée jusqu'à la prochaine approbation.`,`${e} is editable again. The Final version keeps the last approved copy until the next approval.`)]}[action];
    return {title:M[0],body:M[1]}});
  render();toast(`${e} · ${stLabel(to)}`);
}

/* ---------- view: actuals integration ---------- */
const MAP=[
  {src:"706",tgt:"706",sign:-1,fr:"Ventes de produits finis",en:"Sales of finished goods"},
  {src:"607",tgt:"607",sign:1,fr:"Achats de marchandises",en:"Purchases of goods"},
  {src:"606",tgt:"61",sign:1,fr:"Énergie et fournitures",en:"Energy and supplies"},
  {src:"613",tgt:"61",sign:1,fr:"Locations",en:"Rent"},
  {src:"622",tgt:"62",sign:1,fr:"Honoraires",en:"Fees"},
  {src:"625",tgt:"62",sign:1,fr:"Déplacements",en:"Travel"},
  {src:"626",tgt:"62",sign:1,fr:"Télécom",en:"Telecoms"},
  {src:"635",tgt:"63",sign:1,fr:"Impôts et taxes (CFE)",en:"Taxes (CFE)"},
  {src:"641",tgt:"641",sign:1,fr:"Salaires et primes",en:"Salaries and bonuses"},
  {src:"645",tgt:"645",sign:1,fr:"Cotisations URSSAF et retraite",en:"Social security and pension"},
  {src:"681",tgt:"681",sign:1,fr:"Dotations aux amortissements",en:"Depreciation"},
  {src:"STAT_UNITS",tgt:"UNITS",sign:1,fr:"Statistique : unités vendues",en:"Statistic: units sold"},
  {src:"STAT_HC",tgt:"HC",sign:1,fr:"Statistique : effectif ETP",en:"Statistic: FTE headcount"}
];
const mapOf=acct=>MAP.find(r=>r.src.startsWith("STAT")?acct===r.src:acct.startsWith(r.src));
const periodOf=m=>`2026-${String(m+1).padStart(2,"0")}`;
function sampleCsv(){
  const m=S.closed,R=rng(900+m),F=S.D.FC26,f2=v=>v.toFixed(2).replace(".",","),L2=[];
  L2.push("societe;compte;libelle;periode;montant");
  const add=(e,acct,lab,v)=>L2.push(`${entById[e].erp};${acct};${lab};${periodOf(m)};${typeof v==="number"&&!Number.isInteger(v)?f2(v):v}`);
  ENT.forEach(({id:e,hq})=>{const x=F[e];
    if(!hq){const u=Math.round(x.UNITS[m]*(.96+.06*R())),rev=r2(u*x.PRICE[m]*(.99+.02*R()));
      add(e,"706100","Ventes produits finis",-rev);add(e,"607000","Achats marchandises",r2(x["607"][m]*(.98+.05*R())));add(e,"STAT_UNITS","Unités vendues",u)}
    const sal=x["641"][m]*(.99+.02*R());
    add(e,"641100","Salaires de base",r2(sal*.92));add(e,"641300","Primes",r2(sal*.08));
    const ch=sal*S.rate*(1+.01*R());add(e,"645100","Cotisations URSSAF",r2(ch*.7));add(e,"645300","Cotisations retraite",r2(ch*.3));
    const s61=x["61"][m]*(1+.06*R());add(e,"613200","Locations immobilières",r2(s61*.6));add(e,"606100","Énergie",r2(s61*.4));
    const s62=x["62"][m]*(.94+.12*R());add(e,"622600","Honoraires",r2(s62*.5));add(e,"625100","Déplacements",r2(s62*.3));add(e,"626000","Télécom",r2(s62*.2));
    add(e,"635110","CFE",x["63"][m]);add(e,"681120","Dotations immobilisations",x["681"][m]);add(e,"STAT_HC","Effectif ETP",x.HC[m]);
    if(e==="PAR")add(e,"658000","Charges diverses gestion courante","1250,00")});
  return L2.join("\n");
}
function parseCsv(text){
  const lines=text.replace(/\r/g,"").split("\n").filter(l=>l.trim());
  const rep={read:0,ok:0,rej:[],stage:{},period:periodOf(S.closed)};
  if(!lines.length)return rep;
  const d=lines[0].includes(";")?";":",";
  const first=lines[0].toLowerCase().includes("compte")||lines[0].toLowerCase().includes("account");
  const erp=Object.fromEntries(ENT.map(e=>[e.erp,e.id]));
  (first?lines.slice(1):lines).forEach((l,i)=>{rep.read++;const c=l.split(d).map(s=>s.trim());const n=i+(first?2:1);
    if(c.length<5){rep.rej.push({n,why:X("Ligne incomplète (5 colonnes attendues)","Incomplete row (5 columns expected)"),l});return}
    const [soc,acct,,per,amt]=c,e=erp[soc];
    if(!e){rep.rej.push({n,why:X(`Société ERP « ${soc} » inconnue`,`Unknown ERP company “${soc}”`),l});return}
    if(per!==rep.period){rep.rej.push({n,why:X(`Période ${per} hors fenêtre de chargement (${rep.period} attendue)`,`Period ${per} outside the load window (${rep.period} expected)`),l});return}
    const mp=mapOf(acct);
    if(!mp){rep.rej.push({n,why:X(`Compte ERP ${acct} sans correspondance`,`ERP account ${acct} has no mapping`),l});return}
    const v=Number(String(amt).replace(/[\s ]/g,"").replace(",","."));
    if(!isFinite(v)){rep.rej.push({n,why:X(`Montant illisible « ${amt} »`,`Unreadable amount “${amt}”`),l});return}
    rep.stage[e]=rep.stage[e]||{};rep.stage[e][mp.tgt]=(rep.stage[e][mp.tgt]||0)+v*mp.sign;rep.ok++});
  return rep;
}
function viewImp(){
  const m=S.closed,mon=MONTHS_LONG[S.lang],im=S.imp;
  if(m>=12)return `<div class="panelcard"><h3>${X("Exercice clos","Year closed")}</h3><p style="margin:0">${X("Les 12 mois de FY26 sont chargés et clos : la prévision est devenue le réel de l'année. Réinitialisez la démo dans « À propos » pour recommencer.","All 12 months of FY26 are loaded and closed: the forecast has become the full-year actual. Reset the demo under “About” to start again.")}</p></div>`;
  const stepCls=i=>{const s=!im?0:im.loaded?2:1;return i<s?"done":i===s?"on":""};
  const r=im&&im.rep,mapped=r?Object.keys(r.stage):[];
  const accs=["UNITS","706","607","HC","641","645","61","62","63","681"];
  const prev=r&&mapped.length?`<div class="tblbox" style="margin-top:12px"><table class="tbl"><thead><tr><th>${X("Entité","Entity")}</th><th>${X("Compte","Account")}</th><th class="r">${X(`Réel ${mon[m]}`,`${mon[m]} actual`)}</th><th class="r">${X("Prévision du mois","Month forecast")}</th><th class="r">${X("Écart","Variance")}</th><th>${X("Effet","Effect")}</th></tr></thead><tbody>
    ${ENT.filter(e=>r.stage[e.id]).map(e=>accs.filter(a=>r.stage[e.id][a]!=null).map((a,i)=>{const v=r.stage[e.id][a],f=S.D.FC26[e.id][a][m],A=accById[a],drv=A.type==="drv";
      return `<tr class="${drv?"drvrow":""}"><td class="mono">${i===0?e.id:""}</td><td><span class="mono muted" style="display:inline-block;width:48px">${A.code==="DRV"?a:A.code}</span>${esc(L(A))}</td><td class="r mono">${fmtA(a,v)}</td><td class="r mono">${fmtA(a,f)}</td><td class="r mono">${(v-f>0?"+":v-f<0?"−":"")+fmtA(a,Math.abs(v-f))}</td><td>${drv?'<span class="muted">—</span>':effChip(impact(a,v,f))}</td></tr>`}).join("")).join("")}</tbody></table></div>`:"";
  return `
  <div class="steps"><span class="s ${stepCls(0)}">1 · ${X("Importer le fichier","Import the file")}</span><span class="arrow">→</span><span class="s ${stepCls(1)}">2 · ${X("Valider et charger","Validate and load")}</span><span class="arrow">→</span><span class="s ${stepCls(2)}">3 · ${X(`Clôturer ${mon[m]}`,`Close ${mon[m]}`)}</span></div>
  <div class="twocol" style="margin-top:0">
    <div class="panelcard">
      <h3>${X(`Export ERP · ${mon[m]} 2026`,`ERP export · ${mon[m]} 2026`)}</h3>
      <p style="margin:0;color:var(--ink-2)">${X("Format : société ; compte ERP ; libellé ; période ; montant. Convention comptable : débits positifs, crédits négatifs (les ventes arrivent donc en négatif). Les statistiques (unités, effectifs) utilisent des comptes STAT_.","Format: company; ERP account; label; period; amount. Accounting convention: debits positive, credits negative (so sales arrive negative). Statistics (units, headcount) use STAT_ accounts.")}</p>
      <div class="acts" style="display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn primary" id="imp-sample">${X("Charger le fichier d'exemple","Load the sample file")}</button>
        <span class="btn filebtn">${X("Importer un CSV…","Import a CSV…")}<input type="file" id="imp-file" accept=".csv,.txt,text/csv" aria-label="${X("Importer un fichier CSV","Import a CSV file")}"></span>
      </div>
      <pre class="csv">${esc(im&&im.text?im.text:sampleCsv())}</pre>
      <p class="muted" style="margin:0;font-size:12px">${X("Aperçu du fichier d'exemple. Pour tester votre propre fichier, copiez ce modèle dans un tableur et enregistrez-le en CSV.","Sample file preview. To test your own file, copy this template into a spreadsheet and save it as CSV.")}</p>
    </div>
    <div class="panelcard">
      <h3>${X("Table de correspondance","Mapping table")}</h3>
      <table class="tbl"><thead><tr><th style="padding-left:0">${X("Compte ERP","ERP account")}</th><th>${X("Libellé","Label")}</th><th>${X("Compte plan","Plan account")}</th><th class="r" style="padding-right:0">${X("Signe","Sign")}</th></tr></thead><tbody>
      ${MAP.map(x=>`<tr><td class="mono" style="padding-left:0">${x.src}${x.src.startsWith("STAT")?"":"*"}</td><td>${esc(L(x))}</td><td class="mono">${x.tgt}</td><td class="r mono" style="padding-right:0">${x.sign<0?"×(−1)":"×1"}</td></tr>`).join("")}</tbody></table>
      <p class="muted" style="margin:0;font-size:12.5px">${X("Sociétés : FR01 → LYO, FR02 → PAR, FR03 → LIL.","Companies: FR01 → LYO, FR02 → PAR, FR03 → LIL.")}</p>
      ${why("Inverser le signe des produits permet de lire le chiffre d'affaires en positif dans le plan, comme les contrôleurs de gestion en ont l'habitude.","Flipping the sign on revenue lets the plan show sales as positive figures, the way management accountants expect.")}
    </div>
  </div>
  ${r?`<div class="panelcard" style="margin-top:16px"><h3>${X("Rapport de validation","Validation report")}</h3>
    <div class="stats"><div><span>${X("Lignes lues","Rows read")}</span><b>${r.read}</b></div><div><span>${X("Lignes mappées","Rows mapped")}</span><b style="color:var(--good)">${r.ok}</b></div><div><span>${X("Lignes rejetées","Rows rejected")}</span><b style="color:${r.rej.length?"var(--bad)":"inherit"}">${r.rej.length}</b></div></div>
    ${r.rej.length?`<ul class="cmts">${r.rej.slice(0,8).map(x=>`<li><div class="meta">${X("Ligne","Row")} ${x.n} · <span class="sev e">${X("Rejet","Kick-out")}</span></div>${esc(x.why)}<div class="mono muted" style="font-size:11.5px;margin-top:2px">${esc(x.l)}</div></li>`).join("")}</ul>`:""}
    ${prev}
    <div class="formbar" style="margin-top:6px"><span class="muted" style="font-size:12.5px">${im.loaded?X(`Réel de ${mon[m]} chargé dans le scénario Actual. Clôturez le mois pour faire avancer la prévision.`,`${mon[m]} actuals loaded into the Actual scenario. Close the month to move the forecast on.`):X("Les lignes rejetées ne seront pas chargées. En production, on complète la table de correspondance puis on relance l'import.","Rejected rows will not be loaded. In production you would extend the mapping table, then re-run the import.")}</span><span class="grow"></span>
      ${im.loaded?`<button class="btn primary" id="imp-close">${X(`Clôturer ${mon[m]} → prévision ${m+1}+${11-m}`,`Close ${mon[m]} → ${m+1}+${11-m} forecast`)}</button>`:`<button class="btn primary" id="imp-load" ${r.ok?"":"disabled"}>${X(`Charger ${r.ok} ligne(s) dans le réel`,`Load ${r.ok} row(s) into actuals`)}</button>`}</div></div>`:""}`;
}
function importText(text,label){
  const rep=parseCsv(text);S.imp={text,rep,loaded:false,label};
  const mon=MONTHS_LONG;
  explain(()=>({title:X("Fichier lu et validé","File read and validated"),body:X(`${rep.read} lignes lues dans ${label}. ${rep.ok} ont trouvé leur correspondance (société → entité, compte ERP → compte du plan, signe inversé pour les ventes). ${rep.rej.length} rejetée(s) : ${rep.rej.length?rep.rej.map(r=>r.why).slice(0,2).join(" ; ")+". ":""}Rien n'est encore écrit : relisez l'écart au réel du mois contre la prévision, puis chargez.`,`${rep.read} rows read from ${label}. ${rep.ok} were mapped (company → entity, ERP account → plan account, sign flipped for sales). ${rep.rej.length} rejected: ${rep.rej.length?rep.rej.map(r=>r.why).slice(0,2).join("; ")+". ":""}Nothing is written yet: review the month's actuals against the forecast, then load.`)}));
  render();
}
function loadActuals(){
  const m=S.closed,st=S.imp.rep.stage,A=S.D.ACT26;
  ENT.forEach(({id:e,hq})=>{const x=st[e];if(!x)return;
    ["UNITS","706","607","HC","641","645","61","62","63","681"].forEach(a=>{if(x[a]==null)return;const from=A[e][a][m],to=a==="HC"?x[a]:Math.round(x[a]);A[e][a][m]=to;audit("ACT26",e,a,m,from,to,"import","ERP")});
    A[e].PRICE[m]=A[e].UNITS[m]?r2(A[e]["706"][m]/A[e].UNITS[m]):0;
    A[e].SAL[m]=A[e].HC[m]?Math.round(A[e]["641"][m]/A[e].HC[m]/(m===11?2:1)):0});
  allocate(A,[m]);S.imp.loaded=true;
  const mon=MONTHS_LONG,rx=sumVal("ACT26","TOTAL","REX",[m]),fx=sumVal("FC26","TOTAL","REX",[m]);
  explain(()=>({title:X("Réel chargé","Actuals loaded"),body:X(`${S.imp.rep.ok} lignes écrites dans le scénario Actual pour ${mon.fr[m]}. Le prix moyen et le salaire moyen sont déduits (CA ÷ unités, salaires ÷ effectif) et l'allocation du siège est recalculée sur le réel. Résultat d'exploitation du mois : ${eur(rx)} contre ${eur(fx)} prévus (${signed(rx-fx)}).`,`${S.imp.rep.ok} rows written to the Actual scenario for ${mon.en[m]}. Average price and salary are derived (revenue ÷ units, salaries ÷ headcount) and the head-office allocation is recalculated on actuals. Month operating result: ${eur(rx)} against ${eur(fx)} forecast (${signed(rx-fx)}).`)}));
  render();
}
function closeMonth(){
  const m=S.closed,f0=sumVal("FC26","TOTAL","REX",ALL);
  ENT.forEach(({id:e})=>STORED.forEach(a=>S.D.FC26[e][a][m]=S.D.ACT26[e][a][m]));
  Object.keys(S.pending).filter(k=>k.startsWith("FC26|")&&+k.split("|")[3]===m).forEach(k=>delete S.pending[k]);
  S.closed++;S.imp=null;const f1=sumVal("FC26","TOTAL","REX",ALL),mon=MONTHS_LONG;
  logPush("CLOSE",true,`Clôture de ${mon.fr[m]} : &ActMonths = janv. – ${MONTHS.fr[m]}, prévision ${split()}`,`${mon.en[m]} closed: &ActMonths = Jan – ${MONTHS.en[m]}, ${split()} forecast`);
  explain(()=>({title:X(`${mon.fr[m][0].toUpperCase()+mon.fr[m].slice(1)} clôturé`,`${mon.en[m]} closed`),body:X(`Les variables de substitution avancent d'un mois : le réel couvre maintenant janvier à ${mon.fr[m]} et la prévision devient ${split()}. Dans la prévision, ${mon.fr[m]} est remplacé par le réel et se verrouille. Atterrissage du résultat d'exploitation FY26 : ${eur(f0)} → ${eur(f1)}. Aucun formulaire ni aucune règle n'a été modifié.`,`The substitution variables move on one month: actuals now run from January to ${mon.en[m]} and the forecast becomes ${split()}. In the forecast, ${mon.en[m]} is replaced by actuals and locks. FY26 operating result landing: ${eur(f0)} → ${eur(f1)}. No form or rule was changed.`)}));
  render();toast(X(`Prévision ${split()}`,`${split()} forecast`));
}

/* ---------- view: dimensions ---------- */
function viewDim(){
  const accRows=ACC.map(a=>{
    const storage=a.kind==="dyn"?X("Calcul dynamique","Dynamic calc"):X("Stocké","Store");
    const op=a.type==="drv"?"~":a.type==="exp"?"−":"+";
    const src=a.type==="drv"?X("Inducteur","Driver"):{input:X("Saisie","Input"),calc:X("Règle","Rule"),dyn:X("Formule","Formula")}[a.kind];
    const ty={rev:X("Produit / marge","Revenue / margin"),exp:X("Charge","Expense"),drv:X("Hypothèse","Assumption")}[a.type];
    return `<tr${a.kind==="dyn"?' style="font-weight:600"':""}><td class="mono">${a.id}</td><td>${esc(L(a))}</td><td>${ty}</td><td>${storage}</td><td class="mono">${op}</td><td>${src}</td><td class="mono" style="font-size:11.5px;white-space:nowrap">${a.formula?esc(a.formula):"—"}</td></tr>`}).join("");
  const mon=MONTHS[S.lang],cl=S.closed;
  const dense=`<span class="prop">${X("dense","dense")}</span>`,sparse=`<span class="prop">${X("éparse","sparse")}</span>`;
  const sub=t=>`<div class="muted" style="font-size:12px">${t}</div>`;
  const card=(n,id,title,d,body)=>`<div class="card"><h3><span class="rid">${n} · ${id} ${d}</span>${title}</h3>${body}</div>`;
  return `
  <div class="formbar" style="margin-top:0;margin-bottom:14px"><p style="margin:0;max-width:80ch;color:var(--ink-2)">${X("Structure standard d'une application Oracle EPM Planning (module Financials) : les <b>six dimensions obligatoires</b> (Account, Entity, Period, Years, Scenario, Version), plus la dimension <b>Plan Element</b> ajoutée par le module. Les dimensions Currency et personnalisées (Product, Market…) sont optionnelles et non activées ici.","Standard structure of an Oracle EPM Planning application (Financials module): the <b>six required dimensions</b> (Account, Entity, Period, Years, Scenario, Version), plus the <b>Plan Element</b> dimension added by the module. Currency and custom dimensions (Product, Market…) are optional and not enabled here.")}</p></div>
  <div class="cols">
    ${card(1,"Account",X("Compte","Account"),dense,`<ul class="tree"><li><span class="m">REX</span>${X("Résultat d'exploitation","Operating result")}<ul>
      <li><span class="m">EBE</span>${X("EBE","EBITDA")} <ul><li><span class="m">MB</span>706, 607</li><li><span class="m">…</span>641, 645, 61, 62, 63, ALLOC</li></ul></li><li><span class="m">681</span>${X("Amortissements","Depreciation")}</li></ul></li>
      <li><span class="m">Drivers</span>UNITS, PRICE, HC, SAL <span class="prop">${X("non agrégés","no aggregation")}</span></li></ul>${sub(X("Détail des membres et propriétés dans le tableau ci-dessous.","Member details and properties in the table below."))}`)}
    ${card(2,"Entity",X("Entité","Entity"),sparse,`<ul class="tree"><li><span class="m">OpEntities</span>${X("Total entités","Total entities")} <span class="prop">EUR</span>
      <ul>${ENT.map(e=>`<li><span class="m">${e.id}</span>${esc(L(e))} <span class="prop">ERP ${e.erp}</span>${e.hq?`<span class="prop">${X("centre de coûts","cost centre")}</span>`:""}</li>`).join("")}</ul></li></ul>${sub(X("Chaque entité feuille est une unité de planification du workflow.","Each leaf entity is a workflow planning unit."))}`)}
    ${card(3,"Period",X("Période","Period"),dense,`<ul class="tree"><li><span class="m">YearTotal</span><span class="prop">${X("Calcul dynamique","Dynamic calc")}</span>
      <ul>${["Q1","Q2","Q3","Q4"].map((q,i)=>`<li><span class="m">${q}</span>${mon.slice(i*3,i*3+3).join(", ")}</li>`).join("")}</ul></li>
      <li><span class="m">BegBalance</span>${X("Hypothèses annuelles (taux de charges)","Annual assumptions (charges rate)")}</li></ul>`)}
    ${card(4,"Years",X("Années","Years"),sparse,`<ul class="tree"><li><span class="m">FY26</span>${X("Exercice en cours : réel, budget, prévision","Current year: actual, budget, forecast")}</li><li><span class="m">FY27</span>${X("Exercice budgété","Budget year")}</li></ul>${sub(X("Séparer Years et Period permet de réutiliser les mêmes mois pour chaque exercice.","Keeping Years apart from Period lets every year reuse the same months."))}`)}
    ${card(5,"Scenario",X("Scénario","Scenario"),sparse,`<ul class="tree">
      <li><span class="m">Actual</span>${X("Réel","Actual")} <span class="prop">${X("lecture seule","read-only")}</span>${sub(X(`Chargé depuis l'ERP, janvier à ${MONTHS_LONG.fr[cl-1]}`,`Loaded from the ERP, January to ${MONTHS_LONG.en[cl-1]}`))}</li>
      <li><span class="m">Budget</span>${X("Budget","Budget")} <span class="prop">FY26 · FY27</span>${sub(X("FY26 approuvé l'an dernier ; FY27 en préparation","FY26 approved last year; FY27 in preparation"))}</li>
      <li><span class="m">Forecast</span>${X("Prévision","Forecast")} <span class="prop">${split()}</span>${sub(X("Réel sur les mois clos, prévision ensuite","Actuals for closed months, forecast afterwards"))}</li></ul>`)}
    ${card(6,"Version",X("Version","Version"),sparse,`<ul class="tree">
      <li><span class="m">Working</span><span class="prop">bottom-up</span>${sub(X("Saisie des contrôleurs, modifiable","Accountants' entry, editable"))}</li>
      <li><span class="m">Final</span><span class="prop">${X("lecture seule","read-only")}</span>${sub(X("Copie figée à l'approbation (BR_CopyToFinal)","Frozen copy on approval (BR_CopyToFinal)"))}</li></ul>`)}
    ${card(7,"Plan Element",X("Élément de plan","Plan element"),sparse,`<ul class="tree">
      <li><span class="m">Loaded</span>${X("Chargé depuis l'ERP","Loaded from the ERP")}</li>
      <li><span class="m">Calculated</span>${X("Produit par les règles","Produced by rules")}</li>
      <li><span class="m">Direct Input</span>${X("Saisi dans les formulaires","Entered in forms")}</li></ul>${sub(X("Dimension ajoutée par le module Financials pour distinguer l'origine d'un montant. Ici, elle est simplifiée : l'origine s'affiche dans le panneau de la cellule sélectionnée plutôt que d'être stockée sur un axe séparé.","Added by the Financials module to track where an amount comes from. Simplified here: the origin shows in the selected-cell panel rather than being stored on a separate axis."))}`)}
    <div class="card" style="background:var(--surface-2)"><h3><span class="rid">${X("Non activées","Not enabled")}</span>${X("Dimensions optionnelles","Optional dimensions")}</h3>
      <ul class="tree"><li><span class="m">Currency</span>${X("Créée seulement en mode multidevise ; l'application est en EUR uniquement.","Only created in multi-currency mode; this application is EUR only.")}</li>
      <li><span class="m">Product · Market</span>${X("Dimensions personnalisées : volumes et prix sont planifiés par entité, sans détail produit.","Custom dimensions: volumes and prices are planned by entity, without product detail.")}</li></ul></div>
  </div>
  <div class="sectitle"><h2><span class="mono" style="font-size:13px;color:var(--accent);font-weight:500;margin-right:8px">Account</span>${X("Membres du compte de résultat","P&L account members")}</h2><p>${X("Codes du Plan comptable général (PCG) et soldes intermédiaires de gestion","French chart-of-accounts (PCG) codes and French P&L subtotals")}</p></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>ID</th><th>${X("Libellé","Label")}</th><th>Type</th><th>${X("Stockage","Storage")}</th><th>${X("Agrég.","Agg.")}</th><th>${X("Alimentation","Source")}</th><th>${X("Formule membre","Member formula")}</th></tr></thead><tbody>${accRows}</tbody></table></div>
  <div class="sectitle"><h2>${X("Variables de substitution","Substitution variables")}</h2><p>${X("Paramètres globaux, pas des dimensions","Global settings, not dimensions")}</p></div>
  <div class="tblbox" style="max-width:640px"><table class="tbl"><tbody>
    <tr><td class="mono">&amp;CurYr</td><td>FY26</td></tr>
    <tr><td class="mono">&amp;BudYr</td><td>FY27</td></tr>
    <tr><td class="mono">&amp;ActMonths</td><td>${mon[0]} – ${mon[cl-1]}</td></tr>
    <tr><td class="mono">&amp;FcstMonths</td><td>${cl<12?`${mon[cl]} – ${mon[11]}`:"—"}</td></tr></tbody></table></div>
  <div style="max-width:640px;margin-top:10px">${why("À chaque clôture mensuelle, ces variables avancent d'un mois (onglet Intégration du réel) : la prévision passe en 9+3 sans toucher aux formulaires ni aux règles.","At each month-end close these variables move on one month (Actuals integration tab): the forecast becomes 9+3 without changing any form or rule.")}</div>`;
}

/* ---------- view: about ---------- */
function viewOverview(){
  const steps=[
    ["imp",null,X("Charger le réel","Load actuals"),X("Le mois clos arrive de l'ERP, il est contrôlé puis chargé.","The closed month arrives from the ERP, is checked, then loaded.")],
    ["form","FC26",X("Mettre à jour la prévision","Update the forecast"),X("Les mois restants sont re-prévus à partir des tendances récentes.","The remaining months are re-forecast from recent trends.")],
    ["form","BUD27W",X("Construire le budget","Build the budget"),X("Chaque site saisit ses hypothèses : volumes, prix, effectifs.","Each site enters its assumptions: volumes, prices, headcount.")],
    ["sim",null,X("Simuler","Simulate"),X("On teste des « et si… ? » avant de s'engager.","You test “what if…?” before committing.")],
    ["wf",null,X("Revoir et approuver","Review and approve"),X("Le DAF valide ou renvoie chaque budget, avec traçabilité.","The CFO approves or sends back each budget, with a full trail.")],
    ["var",null,X("Analyser les écarts","Analyse variances"),X("On explique l'écart au budget pour décider des actions.","You explain the gap to budget to decide on actions.")]
  ];
  const vs=[
    [X("Données","Data"),X("Des dizaines de fichiers envoyés par e-mail","Dozens of files sent by email"),X("Un modèle unique, partagé par tous","One shared model for everyone")],
    [X("Calculs","Calculations"),X("Formules copiées, faciles à casser","Copied formulas, easy to break"),X("Règles centralisées, identiques partout","Central rules, the same everywhere")],
    [X("Traçabilité","Traceability"),X("Qui a changé ce chiffre ? Personne ne sait","Who changed this figure? Nobody knows"),X("Historique et commentaires par cellule","History and comments on every cell")],
    [X("Validation","Sign-off"),X("« budget_v7_final_DEF.xlsx »","“budget_v7_final_FINAL.xlsx”"),X("Workflow d'approbation et verrouillage","Approval workflow and locking")],
    [X("Réel","Actuals"),X("Copier-coller depuis la comptabilité","Copy-paste from accounting"),X("Import contrôlé depuis l'ERP","Checked import from the ERP")],
    [X("Réactivité","Speed"),X("Plusieurs jours pour consolider","Days to consolidate"),X("Une simulation en quelques secondes","A simulation in seconds")]
  ];
  return `<div class="ov">
  <div class="ov-hero">
    <div>
      <p class="ov-eyebrow">${X("Qu'est-ce qu'un module de planification ?","What is a planning module?")}</p>
      <h2>${X("Décider des chiffres de l'entreprise, puis les piloter tout au long de l'année.","Deciding a company's numbers, then steering them all year long.")}</h2>
      <p class="lead">${X("Un module de planification (Oracle EPM Planning, Anaplan, Workday Adaptive Planning, Pigment…) est l'outil où l'équipe financière, le FP&A, construit le budget, met à jour les prévisions chaque mois et compare le tout au réel. Il répond à trois questions que se pose chaque direction : combien allons-nous vendre, dépenser et gagner ? Où en sommes-nous ? Que se passe-t-il si les hypothèses changent ?","A planning module (Oracle EPM Planning, Anaplan, Workday Adaptive Planning, Pigment…) is where the finance team, FP&A, builds the budget, updates the forecast every month and compares everything with actuals. It answers three questions every leadership team asks: how much will we sell, spend and earn? Where are we now? What happens if the assumptions change?")}</p>
    </div>
    <div class="ov-vals">
      <div class="ov-val"><b>${X("Une seule version des chiffres","One version of the numbers")}</b><span>${X("Finance, ventes et opérations travaillent sur le même modèle.","Finance, sales and operations work on the same model.")}</span></div>
      <div class="ov-val"><b>${X("Des décisions plus rapides","Faster decisions")}</b><span>${X("Un scénario se chiffre en minutes, pas en jours.","A scenario is costed in minutes, not days.")}</span></div>
      <div class="ov-val"><b>${X("Des chiffres dont on peut rendre compte","Numbers you can stand behind")}</b><span>${X("Chaque montant a une source, un auteur et une validation.","Every amount has a source, an author and a sign-off.")}</span></div>
    </div>
  </div>

  <div>
    <h3 class="sec">${X("Pourquoi ne pas simplement utiliser Excel ?","Why not just use Excel?")}</h3>
    <p class="sec">${X("Excel reste excellent pour analyser. Il devient fragile dès que des dizaines de personnes doivent construire un plan ensemble.","Excel is still great for analysis. It becomes fragile as soon as dozens of people have to build a plan together.")}</p>
    <div class="vs" role="table">
      <div class="h k0" role="columnheader"></div><div class="h" role="columnheader">${X("Avec des tableurs","With spreadsheets")}</div><div class="h good" role="columnheader">${X("Avec un module de planification","With a planning module")}</div>
      ${vs.map(r=>`<div class="k" role="rowheader">${r[0]}</div><div class="bad" role="cell">${esc(r[1])}</div><div role="cell">${esc(r[2])}</div>`).join("")}
    </div>
  </div>

  <div>
    <h3 class="sec">${X("Le cycle de planification","The planning cycle")}</h3>
    <p class="sec">${X("Chaque étape correspond à un onglet de la démo : cliquez pour y aller.","Each step matches a tab in the demo: click to go there.")}</p>
    <div class="cycle">${steps.map((st,i)=>`<button data-goto="${st[0]}"${st[1]?` data-plan="${st[1]}"`:""}><span class="n">${String(i+1).padStart(2,"0")}</span><span class="t">${st[2]}</span><span class="d">${st[3]}</span><span class="go">${X("Voir l'étape →","See this step →")}</span></button>`).join("")}</div>
    <p class="loop">↻ ${X("Chaque mois, un nouveau mois se clôture et le cycle recommence : la prévision « 8+4 » devient « 9+3 ».","Every month another month closes and the cycle starts again: the “8+4” forecast becomes “9+3”.")}</p>
  </div>

  <div class="built">
    <div>
      <p class="ov-eyebrow">${X("Ce que j'ai construit","What I built")}</p>
      <h3>${X("Lumen Plan, une démo de planification qui fonctionne vraiment","Lumen Plan, a planning demo that actually works")}</h3>
      <p>${X("Pour montrer ce qui se passe à chaque étape, j'ai reconstruit un module de planification complet, sans logiciel propriétaire. Il suit la logique d'Oracle EPM Planning, l'outil sur lequel je travaille comme consultant.","To show what happens at each step, I rebuilt a complete planning module without proprietary software. It follows the logic of Oracle EPM Planning, the tool I work on as a consultant.")}</p>
      <p>${X("Le scénario : fin septembre chez Maison Lumen SAS, fabricant fictif de luminaires. Le réel est clos à fin août ; l'équipe FP&A met à jour la prévision de l'année et prépare le budget de l'an prochain.","The scenario: late September at Maison Lumen SAS, a fictional lighting manufacturer. Actuals are closed to the end of August; the FP&A team is updating this year's forecast and preparing next year's budget.")}</p>
      <ul>
        <li>${X("Chaque action affiche un encadré qui explique ce qui vient de se passer.","Every action shows a panel explaining what just happened.")}</li>
        <li>${X("Tout est modifiable : saisissez, simulez, approuvez, importez.","Everything is live: enter, simulate, approve, import.")}</li>
        <li>${X("Disponible en français et en anglais.","Available in French and English.")}</li>
      </ul>
      <div class="ctas"><button class="btn primary" id="tour-start-3">${X("Lancer la visite guidée (7 étapes)","Start the guided tour (7 steps)")}</button><button class="btn" data-goto="form" data-plan="FC26">${X("Ouvrir le formulaire de saisie","Open the planning form")}</button></div>
      <p class="byline" style="margin-top:14px">${X("Conçu et développé par","Designed and built by")} <strong>Gaurav Sharma</strong> · ${X("Consultant fonctionnel Oracle EPM","Oracle EPM functional consultant")}</p>
    </div>
    <div class="facts">
      <div><b>${X("3 entités","3 entities")}</b>${X("Siège, agence commerciale, usine","Head office, sales office, plant")}</div>
      <div><b>${X("2 cycles en parallèle","2 cycles in parallel")}</b>${X(`Prévision FY26 ${split()} et budget FY27`,`FY26 ${split()} forecast and FY27 budget`)}</div>
      <div><b>${X("Un P&L resserré","A lean P&L")}</b>${X("Du chiffre d'affaires au résultat, codes PCG","Revenue to operating result, French PCG codes")}</div>
      <div><b>${X("4 règles de gestion","4 business rules")}</b>${X("CA, masse salariale, allocation, copie","Revenue, payroll, allocation, copy")}</div>
      <div><b>${X("7 dimensions","7 dimensions")}</b>${X("Les 6 standard + Plan Element","The 6 standard + Plan Element")}</div>
      <div><b>${X("Données fictives","Fictional data")}</b>${X("Aucune donnée client réelle","No real client data")}</div>
    </div>
  </div>
</div>`;
}
function viewAbout(){
  const map=[
    ["Dimensions",X("Les 6 obligatoires + Plan Element (simplifié)","The 6 required + Plan Element (simplified)")],
    ["Plan type / cube",X("Objet en mémoire : scénario-année-version × entité × compte × mois","In-memory object: scenario-year-version × entity × account × month")],
    ["Rolling forecast",X(`Prévision ${split()}, réel verrouillé sur les mois clos`,`${split()} forecast, actuals locked for closed months`)],
    ["Driver-based planning",X("Volume × prix, effectif × salaire, taux de charges","Units × price, headcount × salary, charges rate")],
    ["Data forms + validation",X("Cellules d'entrée, contrôles bloquants et alertes","Input cells, blocking checks and warnings")],
    ["Spreading / top-down",X("Répartition d'un total selon la saisonnalité","Spreading a total using seasonality")],
    ["Cell comments + audit trail",X("Commentaires par cellule, historique avant/après","Cell comments, before/after history")],
    ["What-if / sandbox",X("Chocs sur les hypothèses, comparaison, publication","Shocks on assumptions, comparison, publish")],
    ["Business rules",X("Quatre règles, script affiché, journal d'exécution","Four rules, script shown, run log")],
    ["Dynamic calc members",X("Marge brute, EBE et résultat calculés à la lecture","Gross margin, EBITDA and result calculated on read")],
    ["Approvals / planning units",X("Statuts, verrouillage, rejet motivé, copie de version","Statuses, locking, rejection with reason, version copy")],
    ["Financial reports",X("Écarts, prix/volume/mix, graphiques et commentaire","Variances, price/volume/mix, charts and commentary")],
    ["Data integration",X("Import CSV, table de correspondance, rejets, clôture","CSV import, mapping table, kick-outs, month close")]
  ];
  return `<div class="about">
  <article>
    <h2>${X("Notes techniques","Technical notes")}</h2>
    <p class="byline">${X("Projet de portfolio de","Portfolio project by")} <strong>Gaurav Sharma</strong> · ${X("Consultant fonctionnel Oracle EPM","Oracle EPM functional consultant")}</p>
    <h3>${X("Ce que couvre l'application","What the application covers")}</h3>
    <p>${X("Les fonctions communes aux outils de planification du marché (Oracle EPM, Anaplan, Workday Adaptive Planning, Pigment) : planification par inducteurs, prévision glissante, saisie top-down, commentaires et piste d'audit, simulation what-if, règles de gestion, workflow d'approbation, analyse prix/volume/mix et intégration du réel depuis l'ERP.","The features shared by the main planning tools (Oracle EPM, Anaplan, Workday Adaptive Planning, Pigment): driver-based planning, rolling forecast, top-down entry, comments and audit trail, what-if simulation, business rules, approval workflow, price/volume/mix analysis and ERP actuals integration.")}</p>
    <h3>${X("Choix techniques","Technical choices")}</h3>
    <p>${X("JavaScript natif dans un seul fichier, sans backend, pour que la démo s'ouvre instantanément. Les données sont conservées dans votre navigateur. Une version complète séparerait l'API (Node.js / Express), la base (MongoDB, un document par intersection de POV) et l'interface (React).","Plain JavaScript in a single file, with no backend, so the demo opens instantly. Data is kept in your browser. A full version would split the API (Node.js / Express), the database (MongoDB, one document per POV intersection) and the interface (React).")}</p>
    <h3>${X("Limites assumées","Known limits")}</h3>
    <p>${X("Une seule devise, pas de bilan ni de trésorerie, pas de sécurité par membre ni de complément Excel. La consolidation multi-devises est le sujet de mon second projet.","Single currency, no balance sheet or cash flow, no member-level security or Excel add-in. Multi-currency consolidation is the subject of my second project.")}</p>
    <div class="formbar" style="margin-top:22px"><button class="btn" id="tour-start-2">${X("Lancer la visite guidée","Start the guided tour")}</button><button class="btn danger" id="reset">${X("Réinitialiser la démo","Reset demo")}</button></div>
  </article>
  <aside><div class="card"><h3>${X("Correspondance EPBCS","EPBCS mapping")}</h3>
    <table class="tbl"><tbody>${map.map(r=>`<tr><td style="font-weight:600;padding-left:0">${r[0]}</td><td style="color:var(--ink-2);padding-right:0">${r[1]}</td></tr>`).join("")}</tbody></table></div></aside></div>`;
}

/* ---------- events ---------- */
document.getElementById("lang-fr").onclick=()=>{S.lang="fr";render()};
document.getElementById("lang-en").onclick=()=>{S.lang="en";render()};
document.addEventListener("click",ev=>{
  const td=ev.target.closest(".grid td.v[data-cell]");
  if(td){const [a,m]=td.dataset.cell.split("|");selectCell(S.pov.plan,S.pov.ent,a,+m);persist();return}
  const b=ev.target.closest("button");if(!b||b.disabled)return;
  if(b.dataset.tab){if(S.tab!==b.dataset.tab)EXPLAIN=null;S.tab=b.dataset.tab;hideTip();render();return}
  if(b.id==="save"){saveForm();return}
  if(b.id==="sp-go"){doSpread();return}
  if(b.id==="cp-add"){const t=(document.getElementById("cp-text").value||"").trim();if(!t){toast(X("Écrivez un commentaire.","Write a comment."));return}
    const {plan,e,a,m}=S.sel,k=pk(plan,e,a,m);(S.comments[k]=S.comments[k]||[]).push({who:actor(e),ts:stamp(),text:t});
    explain(()=>({title:X("Commentaire ajouté","Comment added"),body:X(`Le commentaire est attaché à la cellule ${e} · ${accById[a].code==="DRV"?a:accById[a].code} · ${MONTHS.fr[m]} de ${planLabel(plan)}. Il reste visible pour l'approbateur pendant la revue, et la cellule porte désormais un coin bleu.`,`The comment is attached to cell ${e} · ${accById[a].code==="DRV"?a:accById[a].code} · ${MONTHS.en[m]} in ${planLabel(plan)}. The approver sees it during review, and the cell now shows a blue corner.`)}));
    render();toast(X("Commentaire ajouté","Comment added"));return}
  if(b.id==="discard"){const {plan,ent}=S.pov,ks=pendingFor(plan,ent);ks.forEach(k=>{delete S.pending[k];SPREAD_KEYS.delete(k)});
    explain(()=>({title:X("Modifications annulées","Changes discarded"),body:X(`${ks.length} cellule(s) remise(s) à leur valeur enregistrée. Rien n'avait encore été écrit en base.`,`${ks.length} cell(s) reset to their saved value. Nothing had been written to the database yet.`)}));
    render();toast(X("Modifications annulées","Changes discarded"));return}
  if(b.id==="runall"){const rv=runRev(),py=runPay(),al=runAlloc();explainRules(rv,py,al);render();toast(al.BUD27W.ok?X("Règles exécutées","Rules completed"):X("Une règle a échoué — voir le journal","A rule failed — see the log"));return}
  if(b.dataset.run){const k=b.dataset.run;let ok=true;
    if(k==="rev")explainRules(runRev(),null,null);if(k==="pay")explainRules(null,runPay(),null);
    if(k==="alloc"){const al=runAlloc();ok=al.BUD27W.ok;explainRules(null,null,al)}
    render();toast(ok?X("Règle exécutée","Rule completed"):X("Règle en échec — voir le journal","Rule failed — see the log"));return}
  if(b.dataset.preset){Object.assign(S.sim,PRESETS[b.dataset.preset]);const n={slow:X("Ralentissement","Slowdown"),infl:X("Inflation des coûts","Cost inflation"),up:X("Reprise","Recovery"),zero:""}[b.dataset.preset];
    if(n)explain(()=>({title:X(`Scénario « ${n} » appliqué`,`“${n}” scenario applied`),body:X("Le plan a été copié dans un bac à sable, les chocs appliqués aux hypothèses, puis les trois règles relancées sur la copie. Le plan officiel n'a pas bougé : publiez seulement si ce scénario doit devenir la référence.","The plan was copied into a sandbox, the shocks applied to the assumptions, then the three rules re-run on the copy. The official plan has not moved: publish only if this scenario should become the reference.")}));else EXPLAIN=null;
    render();return}
  if(b.id==="sim-publish"){publishSim();return}
  if(b.id==="imp-sample"){importText(sampleCsv(),X(`l'export ERP de ${MONTHS_LONG.fr[S.closed]}`,`the ${MONTHS_LONG.en[S.closed]} ERP export`));return}
  if(b.id==="imp-load"){loadActuals();return}
  if(b.id==="imp-close"){closeMonth();return}
  if(b.dataset.role){S.role=b.dataset.role;rejecting=null;render();return}
  if(b.dataset.wf){wf(b.dataset.wf,b.dataset.e);return}
  if(b.id==="explain-close"){EXPLAIN=null;render();return}
  if(b.id==="notes-toggle"){S.notes=!S.notes;render();return}
  if(b.dataset.goto){EXPLAIN=null;S.tab=b.dataset.goto;if(b.dataset.plan)S.pov.plan=b.dataset.plan;render();scrollTo(0,0);return}
  if(b.id==="tour-start"||b.id==="tour-start-2"||b.id==="tour-start-3"){EXPLAIN=null;goTour(0);return}
  if(b.dataset.tour){const a=b.dataset.tour;goTour(a==="end"?null:a==="next"?S.tour+1:S.tour-1);return}
  if(b.id==="reset"){const l=S.lang;S=freshState();S.lang=l;S.tab="about";S.tour=null;EXPLAIN=null;SPREAD_KEYS.clear();render();toast(X("Données de démonstration réinitialisées","Demo data reset"));return}
});
document.addEventListener("input",ev=>{
  const el=ev.target;if(!el.dataset||!el.dataset.sl)return;
  const k=el.dataset.sl;S.sim[k]=Number(el.value);const o=document.getElementById("out-"+k);if(o){o.textContent=pct(S.sim[k]/100);o.className=S.sim[k]>0?"pos":""}
  renderSimOut();persist();
});
document.addEventListener("change",ev=>{
  const el=ev.target;
  if(el.id==="pov-ent"){S.pov.ent=el.value;render()}
  else if(el.id==="pov-plan"){S.pov.plan=el.value;render()}
  else if(el.id==="runonsave"){S.runOnSave=el.checked;persist()}
  else if(el.id==="sp-acc"){S.spread.a=el.value;render()}
  else if(el.id==="sp-method"){S.spread.method=el.value;persist()}
  else if(el.id==="sim-base"){S.sim.base=el.value;render()}
  else if(el.id==="sim-ent"){S.sim.ent=el.value;render()}
  else if(el.id==="var-cmp"){S.varPov.cmp=el.value;if(CMP[el.value].limit&&!QUARTERS[S.varPov.per].some(m=>m<S.closed))S.varPov.per="FY";render()}
  else if(el.id==="var-ent"){S.varPov.ent=el.value;render()}
  else if(el.id==="var-per"){S.varPov.per=el.value;render()}
  else if(el.id==="var-acc"){S.varPov.acc=el.value;render()}
  else if(el.id==="imp-file"&&el.files&&el.files[0]){const f=el.files[0],r=new FileReader();r.onload=()=>importText(String(r.result),f.name);r.readAsText(f)}
  else if(el.id==="rate"){const v=parse(el.value);
    if(isNaN(v)||v<0||v>80){el.value=fmtD(S.rate*100,1);toast(X("Taux invalide (0 à 80 %)","Invalid rate (0–80%)"));return}
    const old=S.rate;S.rate=v/100;["FC26","BUD27W"].forEach(p=>{S.stale[p].pay=ENT.map(e=>e.id);S.stale[p].alloc=true});
    explain(()=>({title:X("Hypothèse globale modifiée","Global assumption changed"),body:X(`Taux de charges sociales : ${share(old)} → ${share(S.rate)}. Rien n'a encore bougé dans les chiffres : la masse salariale de toutes les entités et l'allocation du siège sont marquées « à recalculer ». Lancez les règles pour appliquer l'hypothèse.`,`Social-charges rate: ${share(old)} → ${share(S.rate)}. No figures have moved yet: every entity's payroll and the head-office allocation are flagged “needs recalculating”. Run the rules to apply the assumption.`)}));
    render()}
});
document.addEventListener("focusin",ev=>{
  const el=ev.target;if(!el.matches(".grid td.in input"))return;
  const {plan,ent:e}=S.pov,a=el.dataset.a,m=+el.dataset.m,k=pk(plan,e,a,m);
  if(!(k in S.pending))el.value=toRaw(a,S.D[plan][e][a][m]);
  el.select();selectCell(plan,e,a,m);
});
document.addEventListener("focusout",ev=>{
  const el=ev.target;if(!el.matches(".grid td.in input"))return;
  const {plan,ent:e}=S.pov,a=el.dataset.a,m=+el.dataset.m,k=pk(plan,e,a,m);
  const v=parse(el.value),saved=S.D[plan][e][a][m];
  if(!isNaN(v)&&v===saved){delete S.pending[k];SPREAD_KEYS.delete(k);el.value=fmtA(a,saved)}else if(!(k in S.pending)||S.pending[k]!==el.value.trim()){S.pending[k]=el.value.trim();SPREAD_KEYS.delete(k)}
  const td=el.parentElement,iss=cellIssues(plan,e,a,m,k in S.pending?parse(S.pending[k]):saved);
  td.classList.toggle("dirty",k in S.pending);td.classList.toggle("err",iss.some(i=>i.sev==="e"));td.classList.toggle("wrn",iss.some(i=>i.sev==="w"));
  td.title=iss.map(i=>i.msg).join(" · ");
  const n=pendingFor(plan,e).length,d=document.getElementById("discard");if(d)d.disabled=!n;
  const sl=document.getElementById("npend");if(sl)sl.textContent=n;
  renderTabs();persist();
});
document.addEventListener("keydown",ev=>{
  const el=ev.target;if(ev.key!=="Enter"||!el.matches(".grid td.in input"))return;
  ev.preventDefault();const rows=[...document.querySelectorAll(`.grid td.in input[data-m="${el.dataset.m}"]`)],i=rows.indexOf(el);(rows[i+1]||rows[0]).focus();
});
render();
