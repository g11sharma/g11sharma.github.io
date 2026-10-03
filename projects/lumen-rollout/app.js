/* ============================================================
   Lumen Rollout — an EPM deployment project kit (hybrid integrator approach)
   Oracle EPM Planning + FCCS rollout at a fictional French group.
   Dashboard with earned value, Gantt with critical path, RACI,
   risk register, UAT tracker and go/no-go decision.
   Fictional project, fictional data. Single file, no backend.
   ============================================================ */
const X=(fr,en)=>S.lang==="fr"?fr:en;
const LOCALE={fr:"fr-FR",en:"en-GB"};
/* ---------- working-day calendar ---------- */
// The plan runs on working days, as in MS Project or Smartsheet: Monday to Friday, less French public holidays.
const HOLIDAYS=new Set(["2026-04-06","2026-05-01","2026-05-08","2026-05-14","2026-05-25","2026-07-14","2026-08-15","2026-11-01","2026-11-11","2026-12-25","2027-01-01","2027-03-29","2027-05-06","2027-05-17","2027-07-14"]);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const WD=[];for(let d=new Date(2026,2,2);WD.length<520;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)){const w=d.getDay();if(w&&w<6&&!HOLIDAYS.has(iso(d)))WD.push(d)}
const WDX=Object.fromEntries(WD.map((d,i)=>[iso(d),i]));
const wd=s=>{if(!(s in WDX))throw new Error("Not a working day: "+s);return WDX[s]};
const dayDate=n=>WD[Math.max(0,Math.min(WD.length-1,n))];
const wdOnOrAfter=d=>{const i=WD.findIndex(x=>x>=d);return i<0?WD.length-1:i};
const TODAY=wd("2026-09-25"); // status date
const ROLES=[["SP",["Sponsor (DAF)","Sponsor (CFO)"],["Sponsor","Sponsor"]],["CP",["Chef de projet","Project manager"],["CP","PM"]],["CE",["Consultant EPM","EPM consultant"],["Consultant","Consultant"]],["KU",["Utilisateurs clés FP&A","FP&A key users"],["Util. clés","Key users"]],["CO",["Équipe consolidation","Consolidation team"],["Consolidation","Consolidation"]],["IT",["DSI / ERP","IT / ERP"],["DSI","IT"]],["AU",["Commissaires aux comptes","Auditors"],["CAC","Auditors"]]];
const roleL=id=>{const r=ROLES.find(x=>x[0]===id);return r?X(r[1][0],r[1][1]):id};
const roleS=id=>{const r=ROLES.find(x=>x[0]===id);return r?X(r[2][0],r[2][1]):id};
const STAGES=[["S0",["Cadrage","Scoping and mobilisation"]],["S1",["Conception","Design"]],["S2",["Réalisation (paramétrage)","Build (configuration)"]],["S3",["Recette (SIT et UAT)","Testing (SIT and UAT)"]],["S4",["MEP EPBCS et hypercare","EPBCS go-live and hypercare"]],["S5",["MEP FCCS et bilan","FCCS go-live and closure"]]];
// Baseline dates (working days). A task's start is also a "start no earlier than" constraint; durations are in working days.
const TK=(id,st,fr,en,b,e,o)=>({id,st,fr,en,bs:wd(b),dur:wd(e)-wd(b)+1,...o});
const MS=(id,st,fr,en,d,o)=>({id,st,fr,en,bs:wd(d),ms:1,...o});
const TASKS=[
  TK("T01","S0","Lancement, business case et note de cadrage","Kick-off, business case and project charter","2026-03-02","2026-03-27",{deps:[],cost:25,pct:100,ac:27,own:"CP"}),
  MS("M1","S0","Note de cadrage validée en COPIL","Project charter approved by the steering committee","2026-03-27",{deps:["T01"]}),
  TK("T02","S1","Ateliers de conception FP&A et consolidation","FP&A and consolidation design workshops","2026-03-30","2026-04-24",{deps:["M1"],cost:45,pct:100,ac:48,own:"CE"}),
  TK("T03","S1","Conception des dimensions et des règles","Dimension and rule design","2026-04-13","2026-05-13",{deps:["M1"],cost:35,pct:100,ac:36,own:"CE"}),
  MS("M2","S1","Dossier de conception signé","Design document signed off","2026-05-15",{deps:["T02","T03"]}),
  TK("T04","S2","Paramétrage EPBCS en trois CRP (formulaires, règles)","EPBCS build in three CRPs (forms, rules)","2026-05-18","2026-08-25",{deps:["M2"],cost:70,pct:100,ac:74,own:"CE"}),
  TK("T05","S2","Paramétrage FCCS en trois CRP (périmètre, éliminations)","FCCS build in three CRPs (scope, eliminations)","2026-05-18","2026-08-28",{deps:["M2"],cost:80,pct:100,ac:79,own:"CE"}),
  TK("T06","S2","Flux ERP (Data Management)","ERP data flows (Data Management)","2026-05-26","2026-08-28",{deps:["M2"],cost:55,pct:90,ac:62,own:"IT",slip0:20}),
  TK("T07","S2","Rapports et sécurité","Reports and security","2026-06-30","2026-08-28",{deps:["M2"],cost:30,pct:100,ac:29,own:"CE"}),
  MS("M3","S2","Fin de construction","Build complete","2026-08-28",{deps:["T04","T05","T07"]}),
  TK("T08","S3","Tests d'intégration (SIT)","System integration testing (SIT)","2026-08-31","2026-09-11",{deps:["M3"],cost:20,pct:100,ac:22,own:"CE"}),
  TK("T09","S3","Recette utilisateurs (UAT)","User acceptance testing (UAT)","2026-09-14","2026-10-09",{deps:["T08"],cost:40,pct:45,ac:21,own:"KU"}),
  TK("T10","S3","Tests de performance et de sécurité","Performance and security testing","2026-09-28","2026-10-07",{deps:["T08","T06"],cost:12,pct:0,ac:0,own:"IT"}),
  MS("M4","S3","Comité go/no-go EPBCS","EPBCS go/no-go committee","2026-10-09",{deps:["T09","T10"]}),
  TK("T11","S4","Formation des utilisateurs","User training","2026-10-12","2026-10-23",{deps:["M4"],cost:18,pct:0,ac:0,own:"CE"}),
  TK("T12","S4","Bascule et mise en production EPBCS","EPBCS cutover and go-live","2026-10-26","2026-11-02",{deps:["T11"],cost:10,pct:0,ac:0,own:"IT"}),
  MS("M5","S4","Go-live EPBCS · lancement du budget FY27","EPBCS go-live · FY27 budget launch","2026-11-02",{deps:["T12"],key:1}),
  TK("T13","S4","Assistance post-démarrage (hypercare)","Post go-live support (hypercare)","2026-11-03","2026-11-30",{deps:["M5"],cost:15,pct:0,ac:0,own:"CE"}),
  TK("T14","S5","Parallel run sur la clôture de novembre","Parallel run on the November close","2026-12-01","2026-12-14",{deps:["M4"],cost:20,pct:0,ac:0,own:"CO"}),
  MS("M6","S5","Go-live FCCS · clôture annuelle","FCCS go-live · year-end close","2027-01-08",{deps:["T14"],key:1}),
  TK("T15","S5","Clôture du projet et leçons apprises","Project closure and lessons learned","2027-01-11","2027-01-22",{deps:["M6"],cost:5,pct:0,ac:0,own:"CP"})
];
const tById=Object.fromEntries(TASKS.map(t=>[t.id,t]));
const ACTS=[
  {id:"A1",fr:"Valider le business case et la note de cadrage",en:"Approve the business case and project charter",r:{SP:"A",CP:"R",IT:"C",CE:"C",KU:"I",CO:"I"}},
  {id:"A2",fr:"Animer les ateliers de conception",en:"Run the design workshops",r:{CP:"A",CE:"R",KU:"C",CO:"C",IT:"I"}},
  {id:"A3",fr:"Signer le dossier de conception",en:"Sign off the design document",r:{SP:"A",CP:"R",CE:"C",KU:"C",CO:"C",IT:"I"}},
  {id:"A4",fr:"Paramétrer EPBCS et FCCS",en:"Build EPBCS and FCCS",r:{CP:"A",CE:"R",KU:"C",CO:"C"}},
  {id:"A5",fr:"Construire les flux ERP",en:"Build the ERP data flows",r:{CP:"A",IT:"R",CE:"C"}},
  {id:"A6",fr:"Valider les règles de consolidation",en:"Validate the consolidation rules",r:{SP:"A",CO:"A",CE:"R",AU:"C",CP:"I"}},
  {id:"A7",fr:"Rédiger et exécuter les cas de recette",en:"Write and run the test cases",r:{CP:"A",KU:"R",CO:"R",CE:"C"}},
  {id:"A8",fr:"Corriger les anomalies",en:"Fix defects",r:{CP:"A",CE:"R",IT:"C",KU:"I"}},
  {id:"A9",fr:"Former les utilisateurs",en:"Train users",r:{CP:"A",KU:"C",CO:"C"}},
  {id:"A10",fr:"Décider du go/no-go",en:"Decide go/no-go",r:{SP:"A",CP:"R",KU:"C",CO:"C",IT:"C",CE:"C",AU:"I"}}
];
const RESP={avoid:["Éviter","Avoid"],reduce:["Réduire","Reduce"],fallback:["Plan de repli","Contingency plan"],transfer:["Transférer","Transfer"],share:["Partager","Share"],accept:["Accepter","Accept"]};
const RISKS0=[
  {id:"R1",fr:"Données historiques de l'ERP de qualité insuffisante",en:"Poor quality of historical ERP data",p:4,i:4,own:"IT",resp:"reduce",act:["Nettoyage des données et rapprochement mensuel avec la comptabilité","Data cleansing and monthly reconciliation with accounting"],open:true},
  {id:"R2",fr:"Utilisateurs clés peu disponibles pendant la recette (saison budgétaire)",en:"Key users unavailable during testing (budget season)",p:4,i:3,own:"SP",resp:"reduce",act:["Planning de recette validé par le DAF, demi-journées bloquées","Test schedule approved by the CFO, half-days blocked"],open:true},
  {id:"R3",fr:"Retard des flux ERP (Data Management)",en:"Delay in the ERP data flows (Data Management)",p:3,i:4,own:"IT",resp:"fallback",act:["Chargement manuel par fichier en attendant les flux","Manual file loads until the flows are ready"],open:true},
  {id:"R4",fr:"Complexité des règles de consolidation (minoritaires, change)",en:"Complex consolidation rules (NCI, FX)",p:2,i:4,own:"CO",resp:"reduce",act:["Cas de test dédiés, revue par les commissaires aux comptes","Dedicated test cases, auditor review"],open:true},
  {id:"R5",fr:"Résistance au changement (attachement à Excel)",en:"Resistance to change (attachment to Excel)",p:3,i:3,own:"CP",resp:"reduce",act:["Référents par entité, démonstrations, formation pratique","Champions in each entity, demos, hands-on training"],open:true},
  {id:"R6",fr:"Dépendance à un consultant clé",en:"Dependence on one key consultant",p:2,i:3,own:"CP",resp:"reduce",act:["Documentation et binôme avec l'équipe interne","Documentation and pairing with the internal team"],open:true},
  {id:"R7",fr:"Mise à jour Oracle d'octobre pendant la recette (test le 2 oct., production le 16 oct.)",en:"Oracle's October update during testing (test on 2 Oct, production on 16 Oct)",p:3,i:2,own:"IT",resp:"accept",act:["Tests de non-régression après chaque mise à jour, avant la production","Regression tests after each update, before production"],open:true},
  {id:"R8",fr:"Dépassement du budget du projet",en:"Project budget overrun",p:3,i:3,own:"CP",resp:"reduce",act:["Suivi mensuel de la valeur acquise, arbitrage du périmètre avec le sponsor","Monthly earned value tracking, scope trade-offs with the sponsor"],open:true}
];
const ISSUES=[
  {id:"I1",pr:"h",fr:"Flux ERP en retard d'environ un mois : historique 2024–2025 pas encore chargé",en:"ERP flows about a month late: 2024–2025 history not yet loaded",own:"IT",act:["Chargement manuel en recette ; escaladé au comité","Manual loads for testing; escalated to the committee"]},
  {id:"I2",pr:"m",fr:"Depuis la mise à jour Oracle du 4 septembre, journaux indisponibles en environnement de test",en:"Since Oracle's 4 September update, journals are unavailable in the test environment",own:"IT",act:["Demande de support (SR) ouverte chez Oracle","Support request (SR) opened with Oracle"]},
  {id:"I3",pr:"m",fr:"Deux utilisateurs clés absents la semaine du 5 octobre",en:"Two key users absent the week of 5 October",own:"SP",act:["Remplaçants désignés par le DAF","Stand-ins named by the CFO"]}
];
const TESTS0=[
  ["U01","EPBCS","Saisie du budget par inducteurs","Driver-based budget entry","pass"],["U02","EPBCS","Chiffre d'affaires = volume × prix","Revenue = units × price","pass"],["U03","EPBCS","Masse salariale et 13e mois","Payroll and 13th month","fail"],["U04","EPBCS","Allocation des frais de siège","Head-office cost allocation","pass"],
  ["U05","EPBCS","Répartition top-down","Top-down spreading","pass"],["U06","EPBCS","Workflow d'approbation du budget","Budget approval workflow","pass"],["U07","EPBCS","Simulation what-if","What-if simulation","nr"],["U08","EPBCS","Prévision glissante 9+3","Rolling 9+3 forecast","nr"],
  ["U09","FCCS","Conversion IAS 21","IAS 21 translation","pass"],["U10","FCCS","Rapprochement intragroupe","Intercompany matching","fail"],["U11","FCCS","Éliminations automatiques","Automatic eliminations","pass"],["U12","FCCS","Goodwill et intérêts minoritaires","Goodwill and NCI","pass"],
  ["U13","FCCS","Journaux et approbation","Journals and approval","block"],["U14","FCCS","États consolidés","Consolidated statements","nr"],["U15","FCCS","Contrôles de clôture","Close checks","nr"],
  ["U16","DATA","Chargement mensuel du réel ERP","Monthly ERP actuals load","pass"],["U17","DATA","Table de correspondance et rejets","Mapping table and kick-outs","pass"],["U18","DATA","Chargement des taux de change","Exchange rate load","nr"],["U19","DATA","Historique 2024–2025 rapproché","2024–2025 history reconciled","block"],
  ["U20","REP","Rapport d'écarts budgétaires","Budget variance report","pass"],["U21","REP","Liasse de consolidation","Consolidation pack","nr"],["U22","REP","Tableau de bord du DAF","CFO dashboard","nr"],
  ["U23","SEC","Accès limité par entité","Access restricted by entity","fail"],["U24","SEC","Profils approbateurs","Approver profiles","nr"]
].map(([id,mod,fr,en,st])=>({id,mod,fr,en,st}));
const DEFECTS0=[
  {id:"D1",t:"U03",sev:"crit",fr:"Le 13e mois n'est pas calculé en décembre pour Paris",en:"The 13th month is not calculated in December for Paris",st:"open"},
  {id:"D2",t:"U10",sev:"maj",fr:"Les écarts de change sont classés « à analyser » au lieu d'« écart de change »",en:"FX differences are flagged “to investigate” instead of “FX difference”",st:"open"},
  {id:"D3",t:"U20",sev:"min",fr:"Libellé tronqué dans le rapport d'écarts",en:"Truncated label in the variance report",st:"closed"},
  {id:"D4",t:"U23",sev:"crit",fr:"Un contrôleur de Lille voit les données de Paris",en:"A Lille controller can see Paris data",st:"open"},
  {id:"D5",t:"U13",sev:"maj",fr:"Journaux indisponibles depuis la mise à jour Oracle du 4 septembre (environnement de test)",en:"Journals unavailable since Oracle's 4 September update (test environment)",st:"open"},
  {id:"D6",t:"U19",sev:"maj",fr:"Historique 2024 incomplet : flux ERP non livré",en:"2024 history incomplete: ERP flow not delivered",st:"open"}
];
const CHECK0=[
  ["K1","data",1,"Historique 2024–2025 chargé et rapproché","2024–2025 history loaded and reconciled","IT",false],["K2","data",1,"Taux de change et soldes d'ouverture validés","Exchange rates and opening balances approved","CO",true],["K3","data",1,"Tables de correspondance ERP figées","ERP mapping tables frozen","IT",true],
  ["K4","tech",1,"Flux ERP planifiés en production","ERP flows scheduled in production","IT",false],["K5","tech",1,"Instantané (snapshot) de l'application avant bascule","Application snapshot taken before cutover","CE",false],["K6","tech",1,"Droits d'accès en production vérifiés par entité","Production access rights checked by entity","CE",false],
  ["K7","users",1,"Au moins 90 % des utilisateurs formés","At least 90% of users trained","CP",false],["K8","users",0,"Guides utilisateurs publiés","User guides published","CE",true],["K9","users",0,"Référents désignés dans chaque entité","Champions named in each entity","SP",true],
  ["K10","support",0,"Planning d'assistance post-démarrage validé","Hypercare schedule approved","CP",true],["K11","support",0,"Procédure de ticket Oracle (SR) testée","Oracle support (SR) procedure tested","IT",false],
  ["K12","gov",1,"PV de recette signé par le sponsor","Test sign-off minutes signed by the sponsor","SP",false],["K13","gov",1,"Plan de retour arrière documenté","Rollback plan documented","CP",true],["K14","gov",0,"Communication de lancement envoyée","Launch communication sent","CP",false],
  ["K15","tech",1,"Répétition générale de la bascule (mock cutover) réussie, durées mesurées","Mock cutover (dress rehearsal) completed, timings measured","IT",false],["K16","tech",1,"Tests de non-régression réussis après la mise à jour Oracle d'octobre","Regression tests passed after Oracle's October update","KU",false]
].map(([id,cat,crit,fr,en,own,done])=>({id,cat,crit,fr,en,own,done}));
const CATS={data:["Données","Data"],tech:["Technique","Technical"],users:["Utilisateurs","Users"],support:["Support","Support"],gov:["Gouvernance","Governance"]};

/* ---------- RAID: assumptions, dependencies, decisions ---------- */
const ASSUMPTIONS=[
  {id:"AS1",fr:"Les utilisateurs clés consacrent deux demi-journées par semaine à la recette",en:"Key users give two half-days a week to testing",own:"SP",by:"2026-09-14",st:"ok"},
  {id:"AS2",fr:"Le plan de comptes groupe reste figé jusqu'au go-live FCCS",en:"The group chart of accounts stays frozen until the FCCS go-live",own:"CO",by:"2026-05-15",st:"ok"},
  {id:"AS3",fr:"Les licences Oracle EPM couvrent 60 utilisateurs, sans surcoût",en:"Oracle EPM licences cover 60 users at no extra cost",own:"IT",by:"2026-03-27",st:"ok"},
  {id:"AS4",fr:"L'historique 2024–2025 peut être extrait de l'ERP sans retraitement",en:"The 2024–2025 history can be extracted from the ERP without rework",own:"IT",by:"2026-06-30",st:"ko"}
];
// Dependencies on work outside the project team; the status is calculated from the plan
const DEPENDENCIES=[
  {id:"DP1",fr:"Flux ERP livrés par l'équipe ERP avant les tests de performance",en:"ERP flows delivered by the ERP team before performance testing",task:"T06",need:"T10",own:"IT"},
  {id:"DP2",fr:"Environnement de test disponible après chaque mise à jour Oracle",en:"Test environment available after each Oracle update",ext:"ok",own:"IT"},
  {id:"DP3",fr:"Taux de change de clôture fournis par la trésorerie avant le parallel run",en:"Closing exchange rates supplied by treasury before the parallel run",ext:"ok",own:"CO"},
  {id:"DP4",fr:"Calendrier budgétaire FY27 validé par la direction générale",en:"FY27 budget calendar approved by executive management",ext:"late",own:"SP"}
];
// Change control: the project manager approves up to 10 k€ and no go-live impact; above that, the steering committee decides
const CONTINGENCY=48; // k€, held by the sponsor (10 % of the work budget)
const TOL={days:10,cost:.05}; // project tolerances set at charter approval: go-lives ±10 working days, cost +5 %
const CRS0=[
  {id:"CR-01",fr:"Aligner le go-live FCCS sur la clôture annuelle (janvier) plutôt que décembre",en:"Align the FCCS go-live on the year-end close (January) rather than December",type:"time",by:"CO",date:"2026-05-15",cost:0,days:20,auth:"COPIL",st:"approved",note:["Référence mise à jour à la signature de la conception","Baseline updated at design sign-off"]},
  {id:"CR-02",fr:"Chargements manuels par fichier pour la recette, en attendant les flux ERP",en:"Manual file loads for testing until the ERP flows are ready",type:"cost",by:"IT",date:"2026-09-08",cost:8,days:0,auth:"CP",st:"approved",eff:{rel:8},note:["Approuvée par le chef de projet dans sa délégation (≤ 10 k€)","Approved by the project manager within delegated authority (≤ 10 k€)"]},
  {id:"CR-03",fr:"Débloquer 30 k€ de la provision pour aléas : retard ERP et recette prolongée",en:"Release 30 k€ of contingency: ERP delay and extended testing",type:"cost",by:"CP",date:"2026-09-22",cost:30,days:0,auth:"COPIL",st:"submitted",eff:{rel:30},note:["Au-delà de la délégation du chef de projet : décision du COPIL","Above the project manager's delegation: steering committee decision"]},
  {id:"CR-04",fr:"Reporter le tableau de bord du DAF (cas U22) à une phase 2",en:"Defer the CFO dashboard (case U22) to phase 2",type:"scope",by:"KU",date:"2026-09-24",cost:0,days:0,auth:"COPIL",st:"submitted",eff:{descope:"U22"},note:["Réduit le périmètre de la recette sans toucher aux go-lives","Reduces testing scope without affecting the go-lives"]},
  {id:"CR-05",fr:"Ajouter la planification des effectifs par inducteurs en phase 1",en:"Add driver-based workforce planning to phase 1",type:"scope",by:"KU",date:"2026-07-03",cost:40,days:30,auth:"COPIL",st:"rejected",note:["Rejetée : +40 k€ et +6 semaines, incompatible avec le calendrier budgétaire ; inscrite en phase 2","Rejected: +40 k€ and +6 weeks, incompatible with the budget calendar; moved to phase 2"]}
];
const DECISIONS0=[
  {ts:"2026-03-27T17:00:00",who:"COPIL",fr:"Note de cadrage approuvée : budget de 480 k€ plus 48 k€ de provision pour aléas ; tolérances de ±10 jours ouvrés sur les go-lives et de +5 % sur les coûts",en:"Project charter approved: 480 k€ budget plus 48 k€ contingency; tolerances of ±10 working days on go-lives and +5% on cost"},
  {ts:"2026-05-15T17:00:00",who:"COPIL",fr:"Dossier de conception signé ; CR-01 approuvée (go-live FCCS sur la clôture annuelle)",en:"Design document signed off; CR-01 approved (FCCS go-live on the year-end close)"},
  {ts:"2026-07-03T11:00:00",who:"COPIL",fr:"CR-05 rejetée : planification des effectifs reportée en phase 2",en:"CR-05 rejected: workforce planning moved to phase 2"},
  {ts:"2026-08-28T17:00:00",who:"COPIL",fr:"Fin de construction validée ; passage en recette autorisé",en:"Build complete accepted; testing stage authorised"},
  {ts:"2026-09-08T10:00:00",who:X0("Chef de projet","Project manager"),fr:"CR-02 approuvée dans la délégation du chef de projet (8 k€ de provision)",en:"CR-02 approved within the project manager's delegation (8 k€ of contingency)"}
];
function X0(fr,en){return {fr,en}}

function detectLang(){
  try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en")return q}catch(e){}
  try{const v=localStorage.getItem("preferredLang");if(v==="fr"||v==="en")return v}catch(e){}
  return (navigator.language||"fr").slice(0,2).toLowerCase()==="en"?"en":"fr";
}
function freshState(){
  const slip={};TASKS.forEach(t=>{if(t.slip0)slip[t.id]=t.slip0});
  return {lang:detectLang(),tab:"overview",notes:true,slip,pct:Object.fromEntries(TASKS.filter(t=>!t.ms).map(t=>[t.id,t.pct])),
    raci:Object.fromEntries(ACTS.map(a=>[a.id,{...a.r}])),risks:RISKS0.map(r=>({...r})),tests:TESTS0.map(t=>({...t})),defects:DEFECTS0.map(d=>({...d})),
    checks:CHECK0.map(c=>({...c})),decisions:[],crs:CRS0.map(c=>({...c,eff:c.eff?{...c.eff}:null})),log:DECISIONS0.map(d=>({...d}))};
}
const KEY="lumenrollout-v2";
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.raci||!S.tests||!S.crs)S=freshState();
S.tour=null;
try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en")S.lang=q}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ---------- formatting ---------- */
const L=o=>o[S.lang];
const loc=()=>LOCALE[S.lang];
const nf=(v,d=0)=>new Intl.NumberFormat(loc(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
const keur=v=>nf(Math.round(v))+" k€";
const pctF=v=>nf(v*100,0)+" %";
const sgnPct=v=>(v>0?"+":v<0?"−":"")+nf(Math.abs(v)*100,1)+X(" %","%");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fd=n=>{const d=dayDate(n);return d.toLocaleDateString(loc(),d.getFullYear()===2026?{day:"numeric",month:"short"}:{day:"numeric",month:"short",year:"numeric"})};
const stamp=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`};
const showTs=ts=>ts?new Date(ts).toLocaleString(loc(),{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
const tname=t=>X(t.fr,t.en);

/* ---------- schedule & earned value ---------- */
function schedule(slips){
  const o={};TASKS.forEach(t=>{let es=t.bs;t.deps.forEach(d=>{es=Math.max(es,o[d].ef+(t.ms?0:1))});const ef=t.ms?es:es+t.dur-1+(slips[t.id]||0);o[t.id]={es,ef}});return o;
}
const BASE=schedule({});
function forecast(){return schedule(S.slip)}
/* ---------- change control (everything derives from approved change requests) ---------- */
const approvedCR=()=>S.crs.filter(c=>c.st==="approved");
const released=()=>approvedCR().reduce((s,c)=>s+(c.eff&&c.eff.rel||0),0);
const descoped=()=>new Set(approvedCR().map(c=>c.eff&&c.eff.descope).filter(Boolean));
const rebase=id=>approvedCR().reduce((s,c)=>s+(c.eff&&c.eff.rebase&&c.eff.rebase[id]||0),0);
// Committed go-live date: the approved baseline, moved only by an approved change request
const committed=id=>BASE[id].es+rebase(id);
// Critical path method: forward pass (schedule) then backward pass from the committed go-live dates (deadlines).
// Total float = latest allowed finish − forecast finish, in working days: ≤ 0 is critical, < 0 means the commitment is already missed.
// Tasks with no path to a go-live (hypercare, closure) have no float against it.
const SUCC={};TASKS.forEach(t=>t.deps.forEach(d=>(SUCC[d]=SUCC[d]||[]).push(t.id)));
function floats(){
  const f=forecast(),lf={};
  [...TASKS].reverse().forEach(t=>{let v=t.key?committed(t.id):Infinity;
    (SUCC[t.id]||[]).forEach(s=>{const n=tById[s];v=Math.min(v,n.ms?lf[s]:lf[s]-(n.dur+(S.slip[s]||0)))});
    lf[t.id]=v});
  const o={};TASKS.filter(t=>!t.ms&&S.pct[t.id]<100).forEach(t=>{o[t.id]=isFinite(lf[t.id])?lf[t.id]-f[t.id].ef:null});
  return o;
}
function criticalSet(){const fl=floats();return new Set(Object.keys(fl).filter(id=>fl[id]!=null&&fl[id]<=0))}
const BAC=TASKS.reduce((s,t)=>s+(t.cost||0),0);
function pvAt(day){return TASKS.reduce((s,t)=>{if(t.ms)return s;const b=BASE[t.id],fr=Math.max(0,Math.min(1,(day-b.es+1)/t.dur));return s+t.cost*fr},0)}
// Earned value against the work budget (BAC); the authorised budget adds contingency released by change control
function evm(){const PV=pvAt(TODAY),EV=TASKS.reduce((s,t)=>s+(t.ms?0:t.cost*S.pct[t.id]/100),0),AC=TASKS.reduce((s,t)=>s+(t.ac||0),0);
  const SPI=EV/PV,CPI=EV/AC,EAC=BAC/CPI,AUTH=BAC+released();
  return {PV,EV,AC,SPI,CPI,EAC,AUTH,VAC:AUTH-EAC,SV:EV-PV,CV:EV-AC,TCPI:AUTH>AC?(BAC-EV)/(AUTH-AC):Infinity}}
// Project tolerances (PRINCE2 "manage by exception"): beyond them, the project manager raises an exception report
function tolerance(){const f=forecast(),e=evm();
  const worst=TASKS.filter(t=>t.key).map(t=>({t,d:f[t.id].es-committed(t.id)})).reduce((a,b)=>b.d>a.d?b:a),cv=(e.EAC-e.AUTH)/e.AUTH;
  const time={ok:worst.d<=TOL.days,d:worst.d,t:worst.t},cost={ok:cv<=TOL.cost,v:cv};
  return {time,cost,exc:!time.ok||!cost.ok}}
const ragChip=(r,t)=>`<span class="rag rag-${r}">${t||X({g:"Vert",a:"Orange",r:"Rouge"}[r],{g:"Green",a:"Amber",r:"Red"}[r])}</span>`;

/* ---------- RACI, risks, UAT, go/no-go logic ---------- */
function raciIssues(){const out=[];ACTS.forEach(a=>{const v=Object.values(S.raci[a.id]),nA=v.filter(x=>x==="A").length,nR=v.filter(x=>x==="R").length;
  if(nA!==1)out.push({a:a.id,msg:nA?X(`${nA} rôles « A » : un seul responsable final est admis`,`${nA} “A” roles: only one accountable person is allowed`):X("Aucun rôle « A » : personne ne rend compte du résultat","No “A” role: nobody is accountable for the outcome")});
  if(!nR)out.push({a:a.id,msg:X("Aucun rôle « R » : personne ne réalise l'activité","No “R” role: nobody does the work")})});return out}
const score=r=>r.p*r.i;
// One risk scale everywhere (heat map, dashboard, go/no-go): 1–7 low, 8–14 medium, 15–25 high; 20 and above blocks go-live
const RISK={low:7,high:15,block:20};
const zone=s=>s>=RISK.high?3:s>RISK.low?2:1;
function uat(){
  const ds=descoped(),T=S.tests.filter(t=>!ds.has(t.id)),n=T.length,c=k=>T.filter(t=>t.st===k).length,pass=c("pass"),fail=c("fail"),block=c("block"),nr=c("nr");
  const openD=S.defects.filter(d=>d.st!=="closed"),crit=openD.filter(d=>d.sev==="crit").length,maj=openD.filter(d=>d.sev==="maj").length;
  const sec=T.filter(t=>t.mod==="SEC"),secOk=sec.every(t=>t.st==="pass");
  const crits=[
    {id:"C1",ok:pass+fail===n,val:(pass+fail)/n,fr:"100 % des cas de test exécutés",en:"100% of test cases executed",block:true},
    {id:"C2",ok:pass/n>=.95,val:pass/n,cond:pass/n>=.9,fr:"Au moins 95 % des cas réussis",en:"At least 95% of cases passed"},
    {id:"C3",ok:crit===0,fr:"Aucune anomalie critique ouverte",en:"No critical defect open",block:true,n:crit},
    {id:"C4",ok:maj===0,cond:maj<=2,fr:"Anomalies majeures ouvertes : 0 (2 maximum avec contournement)",en:"Open major defects: 0 (at most 2 with a workaround)",n:maj},
    {id:"C5",ok:secOk,fr:"100 % des tests de sécurité réussis",en:"100% of security tests passed",block:true}];
  return {n,pass,fail,block,nr,crit,maj,crits,openD};
}
function goNoGo(){
  const u=uat(),blockers=[],conds=[];
  u.crits.forEach(c=>{if(c.ok)return;const t=X(c.fr,c.en);if(c.block||!c.cond)blockers.push(X(`Recette : ${t}`,`Testing: ${t}`));else conds.push(X(`Recette : ${t}`,`Testing: ${t}`))});
  S.checks.filter(k=>!k.done).forEach(k=>{(k.crit?blockers:conds).push(X(`Checklist : ${k.fr}`,`Checklist: ${k.en}`))});
  S.risks.filter(r=>r.open).forEach(r=>{const s=score(r);if(s>=RISK.block)blockers.push(X(`Risque ${r.id} critique (${s}) : ${r.fr}`,`Critical risk ${r.id} (${s}): ${r.en}`));else if(s>=RISK.high)conds.push(X(`Risque ${r.id} élevé (${s}) : ${r.fr}`,`High risk ${r.id} (${s}): ${r.en}`))});
  const ri=raciIssues();if(ri.length)conds.push(X(`RACI : ${ri.length} incohérence(s) à corriger`,`RACI: ${ri.length} inconsistency(ies) to fix`));
  const v=blockers.length?"nogo":conds.length?"cond":"go";return {v,blockers,conds};
}
function rags(){
  const f=forecast(),e=evm(),u=uat(),tl=tolerance();
  const slipE=f.M5.es-committed("M5"),slipF=f.M6.es-committed("M6"),worst=Math.max(slipE,slipF);
  // Red = outside tolerance, amber = within tolerance but off plan, green = on plan
  const sch=worst>TOL.days||e.SPI<.9?"r":worst>0||e.SPI<.95?"a":"g";
  const cost=!tl.cost.ok?"r":e.EAC>e.AUTH||e.CPI<.95?"a":"g";
  const q=u.crit>0?"r":(u.maj>0||u.fail>0||u.block>0)?"a":"g";
  const mx=Math.max(0,...S.risks.filter(r=>r.open).map(score));const rk=mx>=RISK.high?"r":mx>RISK.low?"a":"g";
  const all=[sch,cost,q,rk];const ov=all.includes("r")?"r":all.includes("a")?"a":"g";
  return {sch,cost,q,rk,ov,slipE,slipF,e,u,f,mx,tl};
}

/* ---------- notes, explanations, tour ---------- */
const NOTES={
 dash:()=>[X("Le rapport d'avancement (la « météo projet ») que le chef de projet présente au comité de pilotage (COPIL) : un statut rouge / orange / vert par dimension, les tolérances fixées par le COPIL (et le rapport d'exception si l'une est dépassée), la valeur acquise, les prochains jalons et les décisions attendues. Tout est calculé à partir des autres onglets.","The status report the project manager presents to the steering committee (COPIL): a red / amber / green status per dimension, the tolerances set by the committee (and the exception report when one is exceeded), earned value, upcoming milestones and decisions needed. Everything is calculated from the other tabs."),
   X("Un comité de pilotage a peu de temps : il doit voir en une minute où est le problème et quelle décision on attend de lui.","A steering committee has little time: it must see in one minute where the problem is and what decision is expected from it.")],
 plan:()=>[X("Le planning par phase, en jours ouvrés (hors week-ends et jours fériés), avec les dépendances entre tâches. Les barres pointillées sont la référence validée, les barres pleines la prévision. En rouge, le chemin critique : les tâches dont la marge totale est nulle ou négative par rapport aux dates de go-live engagées. La colonne « Marge » indique combien de jours ouvrés chaque tâche peut glisser avant de décaler un go-live ; une marge négative signifie que l'engagement est déjà dépassé. Saisissez un glissement pour voir l'effet.","The plan by phase, in working days (excluding weekends and public holidays), with task dependencies. Dashed bars are the approved baseline, solid bars the forecast. In red, the critical path: tasks with zero or negative total float against the committed go-live dates. The “Float” column shows how many working days each task can slip before a go-live moves; negative float means the commitment is already missed. Enter a slip to see the effect."),
   X("Toutes les tâches en retard ne se valent pas : un retard hors du chemin critique est absorbé par la marge, un retard sur le chemin critique décale la date promise au métier.","Not all late tasks are equal: a delay off the critical path is absorbed by float, a delay on the critical path moves the date promised to the business.")],
 raci:()=>[X("Qui fait quoi : R réalise, A rend compte (une seule personne par activité), C est consulté, I est informé. Cliquez sur une case pour changer le rôle. Les lignes en rouge ne respectent pas les règles.","Who does what: R is responsible, A is accountable (one person per activity), C is consulted, I is informed. Click a cell to change the role. Rows in red break the rules."),
   X("Deux « A » sur une même activité, c'est une décision que personne ne prendra vraiment ; aucun « R », c'est une tâche que personne ne fera.","Two “A”s on one activity is a decision nobody will really take; no “R” is a task nobody will do.")],
 raid:()=>[X("Le journal RAID, standard des projets d'intégration : Risques (probabilité × impact de 1 à 5, propriétaire, réponse), Hypothèses (ce que le plan tient pour acquis, à vérifier avant une date), Problèmes (risques déjà survenus) et Dépendances (travaux hors de l'équipe projet), plus le journal des décisions. Une seule échelle de risque sert partout : faible jusqu'à 7, moyen de 8 à 14, élevé à partir de 15.","The RAID log, standard on integration projects: Risks (probability × impact from 1 to 5, owner, response), Assumptions (what the plan takes for granted, to check by a date), Issues (risks that have already happened) and Dependencies (work outside the project team), plus the decision log. One risk scale applies everywhere: low up to 7, medium from 8 to 14, high from 15."),
   X("Un risque sans propriétaire ni action n'est qu'une inquiétude ; une hypothèse jamais vérifiée finit en problème.","A risk without an owner or an action is just a worry; an assumption nobody checks ends up as an issue.")],
 chg:()=>[X("Le contrôle des changements : toute demande qui touche le périmètre, les coûts ou les dates est enregistrée, chiffrée, puis décidée au bon niveau. Le chef de projet approuve jusqu'à 10 k€ sans impact sur un go-live ; au-delà, le COPIL tranche. Une demande approuvée met à jour la référence : budget autorisé, dates engagées ou périmètre de recette.","Change control: every request that affects scope, cost or dates is logged, costed, then decided at the right level. The project manager approves up to 10 k€ with no go-live impact; above that, the steering committee decides. An approved request updates the baseline: authorised budget, committed dates or test scope."),
   X("Sans contrôle des changements, le périmètre dérive en silence et le budget dépasse sans que personne ne l'ait décidé.","Without change control, scope creeps silently and the budget overruns without anyone having decided it.")],
 uat:()=>[X("La recette utilisateurs : les utilisateurs clés rejouent leurs processus réels dans l'outil. Chaque cas de test est réussi, en échec, bloqué ou non joué ; chaque échec ouvre une anomalie. Les critères de sortie, fixés à l'avance, disent quand la recette est terminée.","User acceptance testing: key users replay their real processes in the tool. Each test case is passed, failed, blocked or not run; each failure opens a defect. Exit criteria, set in advance, say when testing is finished."),
   X("Sans critères de sortie écrits d'avance, la date de mise en production se négocie au lieu de se décider.","Without exit criteria written in advance, the go-live date gets negotiated instead of decided.")],
 go:()=>[X("La décision de mise en production est calculée à partir des critères de recette, de la checklist de bascule et des risques ouverts : GO, GO sous conditions ou NO GO. Cochez les actions réalisées puis réunissez le comité pour enregistrer la décision.","The go-live decision is calculated from the testing exit criteria, the cutover checklist and open risks: GO, GO with conditions or NO GO. Tick completed actions, then hold the committee to record the decision."),
   X("Un go/no-go factuel protège le sponsor : on part en production parce que les critères sont remplis, pas parce que la date est arrivée.","A fact-based go/no-go protects the sponsor: you go live because the criteria are met, not because the date has arrived.")]
};
let EXPLAIN=null;
function explain(fn){const l=S.lang,o={};["fr","en"].forEach(x=>{S.lang=x;o[x]=fn()});S.lang=l;EXPLAIN=o}
function intro(tab){const n=NOTES[tab];if(!n||!S.notes)return"";const [a,b]=n();return `<div class="intro"><span class="ic" aria-hidden="true">i</span><div><p>${a}</p><p class="whyl"><b>${X("Pourquoi","Why")}</b>${b}</p></div></div>`}
function explainBox(){if(!EXPLAIN||!S.notes)return"";const x=L(EXPLAIN);return `<div class="explain" role="status"><span class="lab">${X("Ce qui vient de se passer","What just happened")}</span><button class="x" id="explain-close" aria-label="${X("Fermer","Close")}">×</button><h4>${x.title}</h4><p>${x.body}</p></div>`}
const why=(fr,en)=>S.notes?`<div class="why"><b>${X("Pourquoi","Why")}</b>${X(fr,en)}</div>`:"";
const TOUR=[
 {tab:"dash",sel:".ragrow",fr:["Lisez le statut du projet","Le projet est en recette. Le statut global est rouge : deux anomalies critiques, un risque élevé, et une prévision de coûts au-delà de la tolérance de +5 %, d'où un rapport d'exception pour le COPIL. Chaque couleur est calculée, pas choisie."],en:["Read the project status","The project is in testing. Overall status is red: two critical defects, a high risk, and a cost forecast beyond the +5% tolerance, which triggers an exception report to the steering committee. Every colour is calculated, not chosen."]},
 {tab:"chg",sel:"[data-crok='CR-03']",fr:["Décidez d'une demande de changement","La CR-03 demande de débloquer 30 k€ de la provision pour aléas. Au-delà de la délégation du chef de projet, c'est au COPIL de trancher : approuvez-la. Le budget autorisé passe à 518 k€ et la prévision revient dans la tolérance."],en:["Decide a change request","CR-03 asks to release 30 k€ of contingency. It is above the project manager's delegation, so the steering committee decides: approve it. The authorised budget rises to 518 k€ and the forecast is back within tolerance."]},
 {tab:"plan",sel:"#slip-T09",fr:["Faites glisser la recette","Le flux ERP a quatre semaines de retard mais garde deux jours de marge. Saisissez 10 jours ouvrés de glissement sur la recette : elle est sur le chemin critique, le go-live EPBCS recule de deux semaines."],en:["Slip the testing","The ERP flow is four weeks late but keeps two days of float. Enter a 10-working-day slip on UAT: it is on the critical path, so the EPBCS go-live moves by two weeks."]},
 {tab:"raci",sel:"tr.bad",fr:["Corrigez le RACI","Deux lignes sont en rouge. « Valider les règles de consolidation » a deux « A » : cliquez sur celui du Sponsor pour le passer à « C ». « Former les utilisateurs » n'a aucun « R » : donnez-le au consultant EPM."],en:["Fix the RACI","Two rows are red. “Validate the consolidation rules” has two “A”s: click the Sponsor's to turn it into “C”. “Train users” has no “R”: give it to the EPM consultant."]},
 {tab:"raid",sel:".heat",fr:["Réévaluez un risque","R1 (données historiques) est le seul risque élevé. Baissez sa probabilité à 2 quand le nettoyage des données avance : il passe en risque moyen, et la dimension Risques du tableau de bord passe à l'orange."],en:["Reassess a risk","R1 (historical data) is the only high risk. Lower its probability to 2 as data cleansing progresses: it becomes a medium risk, and the dashboard's risk status turns amber."]},
 {tab:"uat",sel:"[data-dfix=D1]",fr:["Traitez les anomalies","Corrigez puis retestez les anomalies critiques D1 et D4. Le cas de test associé passe en réussi, et les critères de sortie se mettent à jour."],en:["Handle the defects","Fix then retest critical defects D1 and D4. The linked test case moves to passed and the exit criteria update."]},
 {tab:"uat",sel:"#run-rest",fr:["Terminez la recette","Simulez l'exécution des cas restants. Il reste les anomalies majeures : deux sont acceptables avec contournement, au-delà la recette n'est pas close."],en:["Finish testing","Simulate running the remaining cases. Major defects remain: two are acceptable with a workaround, more and testing is not closed."]},
 {tab:"go",sel:"#committee",fr:["Réunissez le comité go/no-go","Cochez les actions de bascule, puis enregistrez la décision. Tant qu'un point critique reste ouvert, le verdict est NO GO."],en:["Hold the go/no-go committee","Tick the cutover actions, then record the decision. As long as a critical point remains open, the verdict is NO GO."]}
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
function goTour(i){if(i==null||i<0||i>=TOUR.length){S.tour=null;render();return}S.tour=i;S.tab=TOUR[i].tab;render()}

/* ---------- shell ---------- */
const TABS=[["overview","Présentation","Overview"],["dash","Tableau de bord","Dashboard"],["plan","Planning","Plan"],["raci","RACI","RACI"],["raid","RAID","RAID"],["chg","Changements","Changes"],["uat","Recette (UAT)","Testing (UAT)"],["go","Mise en production","Go-live"],["about","Notes techniques","Technical notes"]];
function renderTabs(){const g=goNoGo();document.getElementById("tabs").innerHTML=TABS.map(([id,fr,en])=>{let b="";
  if(id==="raci"){const n=raciIssues().length;if(n)b=`<span class="badge">${n}</span>`}
  if(id==="uat"){const n=uat().crit;if(n)b=`<span class="badge">${n}</span>`}
  if(id==="chg"){const n=S.crs.filter(c=>c.st==="submitted").length;if(n)b=`<span class="badge">${n}</span>`}
  if(id==="go"&&g.v!=="go")b=`<span class="badge">${g.v==="nogo"?"✕":"!"}</span>`;
  return `<button role="tab" id="tab-${id}" aria-selected="${S.tab===id}" data-tab="${id}">${X(fr,en)}${b}</button>`}).join("")}
function render(){
  document.documentElement.lang=S.lang;
  document.getElementById("subtitle").textContent=X("Projet de déploiement Oracle EPM · Groupe Maison Lumen (projet fictif) · statut au 25 septembre 2026","Oracle EPM deployment project · Maison Lumen Group (fictional project) · status at 25 September 2026");
  document.getElementById("footnote").textContent=X("Projet de portfolio · Toutes les données et personnes sont fictives · PRINCE2® est une marque déposée de PeopleCert · Aucun lien avec Oracle Corporation.","Portfolio project · All data and people are fictional · PRINCE2® is a registered trademark of PeopleCert · Not affiliated with Oracle Corporation.");
  document.getElementById("lang-fr").setAttribute("aria-pressed",S.lang==="fr");document.getElementById("lang-en").setAttribute("aria-pressed",S.lang==="en");
  document.getElementById("tour-start").textContent=X("Visite guidée","Guided tour");
  const nt=document.getElementById("notes-toggle");nt.textContent=S.notes?X("Masquer les notes","Hide notes"):X("Afficher les notes","Show notes");nt.setAttribute("aria-pressed",S.notes);
  renderTabs();
  const V={overview:viewOverview,dash:viewDash,plan:viewPlan,raci:viewRaci,raid:viewRaid,chg:viewChg,uat:viewUat,go:viewGo,about:viewAbout};
  document.getElementById("main").innerHTML=`<section class="panel" role="tabpanel">${intro(S.tab)}${explainBox()}${V[S.tab]()}</section>`;
  if(S.tab==="dash")drawEVM();
  renderTour();persist();
}
let toastTimer;function toast(m){const el=document.getElementById("toast");el.textContent=m;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2600)}

/* ---------- overview ---------- */
function viewOverview(){
  const steps=[["plan",X("Cadrer","Scope"),X("Business case, organisation, planning : la note de cadrage fixe le périmètre.","Business case, organisation, plan: the project charter sets the scope.")],
    ["plan",X("Concevoir","Design"),X("Ateliers avec les métiers ; dimensions, règles, flux.","Workshops with the business; dimensions, rules, data flows.")],
    ["plan",X("Réaliser","Build"),X("Paramétrage EPBCS et FCCS en CRP (conference room pilots) revus avec les utilisateurs clés ; flux ERP, rapports, sécurité.","EPBCS and FCCS build in conference room pilots (CRPs) reviewed with key users; ERP flows, reports, security.")],
    ["uat",X("Recetter","Test"),X("Tests d'intégration (SIT) puis recette utilisateurs (UAT).","System integration testing (SIT), then user acceptance testing (UAT).")],
    ["go",X("Décider et basculer","Decide and cut over"),X("Comité go/no-go, formation, mise en production.","Go/no-go committee, training, go-live.")],
    ["dash",X("Stabiliser et clore","Stabilise and close"),X("Assistance post-démarrage, leçons apprises.","Hypercare, lessons learned.")]];
  const vs=[[X("Pilotage","Steering"),X("Un planning Excel que personne ne met à jour","An Excel plan nobody updates"),X("Planning de référence, prévision et chemin critique","Baseline, forecast and critical path")],
    [X("Responsabilités","Responsibilities"),X("« Je croyais que c'était toi »","“I thought you were doing it”"),X("Matrice RACI validée au démarrage","RACI matrix agreed at the start")],
    [X("Risques","Risks"),X("Découverts quand ils arrivent","Discovered when they happen"),X("Journal RAID suivi en comité, avec propriétaires","RAID log reviewed in committee, with owners")],
    [X("Changements","Changes"),X("Le périmètre grossit au fil des demandes","Scope grows with every side request"),X("Demandes chiffrées, décidées au bon niveau","Requests costed and decided at the right level")],
    [X("Qualité","Quality"),X("Tests informels, recette « à l'œil »","Informal testing, sign-off by feel"),X("Cas de test, anomalies et critères de sortie","Test cases, defects and exit criteria")],
    [X("Mise en production","Go-live"),X("On part parce que la date est arrivée","You go live because the date has come"),X("Go/no-go fondé sur des critères","Criteria-based go/no-go")]];
  return `<div class="ov">
  <div class="ov-hero"><div>
    <p class="ov-eyebrow">${X("Qu'est-ce qu'un projet de déploiement EPM ?","What is an EPM rollout project?")}</p>
    <h2>${X("Mettre en place l'outil est la partie facile. Le projet, c'est tout le reste.","Configuring the tool is the easy part. The project is everything else.")}</h2>
    <p class="lead">${X("Déployer Oracle EPM (planification EPBCS et consolidation FCCS), c'est changer la façon dont une direction financière travaille : ses données, ses processus, ses calendriers de clôture et de budget. Ces projets échouent rarement pour des raisons techniques ; ils échouent sur la qualité des données, la disponibilité des utilisateurs et une mise en production décidée trop tôt. Une démarche structurée (cadrage, conception, réalisation, recette, mise en production) découpe le projet en phases, avec des rôles clairs, des risques suivis et des décisions prises en comité de pilotage.","Deploying Oracle EPM (EPBCS planning and FCCS consolidation) changes how a finance team works: its data, processes, and close and budget calendars. These projects rarely fail for technical reasons; they fail on data quality, user availability and a go-live decided too early. A structured approach (scoping, design, build, testing, go-live) splits the project into phases, with clear roles, tracked risks and decisions taken by the steering committee.")}</p></div>
    <div class="ov-vals">
      <div class="ov-val"><b>${X("Des décisions au bon niveau","Decisions at the right level")}</b><span>${X("Le comité tranche, le chef de projet pilote, les équipes réalisent.","The committee decides, the project manager steers, teams deliver.")}</span></div>
      <div class="ov-val"><b>${X("Des risques anticipés","Risks anticipated")}</b><span>${X("Chaque risque a un propriétaire et une réponse avant d'arriver.","Every risk has an owner and a response before it happens.")}</span></div>
      <div class="ov-val"><b>${X("Une mise en production maîtrisée","A controlled go-live")}</b><span>${X("La date se mérite par des critères remplis.","The date is earned by meeting criteria.")}</span></div></div></div>
  <div><h3 class="sec">${X("Ce qui change avec une méthode","What a method changes")}</h3><p class="sec">${X("Les mêmes équipes, le même outil ; la différence est dans le pilotage.","Same teams, same tool; the difference is in how the project is run.")}</p>
    <div class="vs" role="table"><div class="h k0"></div><div class="h">${X("Sans méthode","Without a method")}</div><div class="h good">${X("Avec une démarche structurée","With a structured approach")}</div>${vs.map(r=>`<div class="k">${r[0]}</div><div class="bad">${esc(r[1])}</div><div>${esc(r[2])}</div>`).join("")}</div></div>
  <div><h3 class="sec">${X("Le cycle du projet","The project lifecycle")}</h3><p class="sec">${X("Six phases, chacune close par une décision du COPIL. Cliquez pour voir l'outil correspondant.","Six phases, each closed by a steering committee decision. Click to see the matching tool.")}</p>
    <div class="cycle">${steps.map((s,i)=>`<button data-goto="${s[0]}"><span class="n">${String(i+1).padStart(2,"0")}</span><span class="t">${s[1]}</span><span class="d">${s[2]}</span><span class="go">${X("Voir l'outil →","See the tool →")}</span></button>`).join("")}</div>
    <p class="loop">${X("Le projet déploie les deux applications de mes autres démos : Lumen Plan (EPBCS) et Lumen Consol (FCCS).","The project deploys the two applications from my other demos: Lumen Plan (EPBCS) and Lumen Consol (FCCS).")}</p></div>
  <div class="built"><div>
    <p class="ov-eyebrow">${X("Ce que j'ai construit","What I built")}</p>
    <h3>${X("Lumen Rollout, le kit de pilotage d'un projet EPM","Lumen Rollout, the steering kit for an EPM project")}</h3>
    <p>${X("Une étude de cas interactive : le projet de Maison Lumen, fin septembre 2026, en pleine recette. Tous les outils sont reliés : un retard dans le planning, une anomalie critique ou un risque réévalué change le tableau de bord et la décision de mise en production.","An interactive case study: the Maison Lumen project, late September 2026, in the middle of testing. All the tools are linked: a delay in the plan, a critical defect or a reassessed risk changes the dashboard and the go-live decision.")}</p>
    <ul><li>${X("Tableau de bord avec statuts calculés, valeur acquise (SPI, CPI, TCPI), tolérances et rapport d'exception.","Dashboard with calculated statuses, earned value (SPI, CPI, TCPI), tolerances and exception report.")}</li><li>${X("Planning en jours ouvrés avec chemin critique, matrice RACI contrôlée, journal RAID.","Working-day plan with critical path, checked RACI matrix, RAID log.")}</li><li>${X("Contrôle des changements : demandes chiffrées, délégation du chef de projet, décisions du COPIL.","Change control: costed requests, project manager's delegation, steering committee decisions.")}</li><li>${X("Recette avec critères de sortie, et go/no-go calculé.","Testing with exit criteria, and a calculated go/no-go.")}</li></ul>
    <div class="ctas"><button class="btn primary" id="tour-start-3">${X(`Lancer la visite guidée (${TOUR.length} étapes)`,`Start the guided tour (${TOUR.length} steps)`)}</button><button class="btn" data-goto="dash">${X("Voir le tableau de bord","See the dashboard")}</button></div>
    <p class="byline" style="margin-top:14px">${X("Conçu et développé par","Designed and built by")} <strong>Gaurav Sharma</strong> · ${X("Chef de projet IT, PRINCE2 et PSPO I","IT project manager, PRINCE2 and PSPO I")}</p></div>
    <div class="facts"><div><b>${X("6 phases","6 phases")}</b>${X("Mars 2026 → janvier 2027","March 2026 → January 2027")}</div><div><b>${keur(BAC)}</b>${X(`Budget de réalisation, plus ${CONTINGENCY} k€ de provision pour aléas (hors licences)`,`Work budget, plus ${CONTINGENCY} k€ contingency (excl. licences)`)}</div><div><b>${X("2 mises en production","2 go-lives")}</b>${X("EPBCS en novembre, FCCS en janvier","EPBCS in November, FCCS in January")}</div><div><b>${X("24 cas de test","24 test cases")}</b>${X("5 domaines, 6 anomalies","5 areas, 6 defects")}</div><div><b>${X("Journal RAID","RAID log")}</b>${X("8 risques, 4 hypothèses, 3 problèmes, 4 dépendances","8 risks, 4 assumptions, 3 issues, 4 dependencies")}</div><div><b>${X("5 demandes de changement","5 change requests")}</b>${X("Projet et données fictifs","Fictional project and data")}</div></div></div>
  </div>`;
}

/* ---------- dashboard ---------- */
function viewDash(){
  const R=rags(),e=R.e,u=R.u,f=R.f,g=goNoGo();
  const tile=(lab,r,txt,big)=>`<div class="ragtile${big?" big":""}"><span class="lab">${lab}</span>${ragChip(r)}<p>${txt}</p></div>`;
  const slipTxt=d=>d>0?X(`+${d} j ouvrés`,`+${d} working days`):d<0?X(`${d} j ouvrés`,`${d} working days`):X("à l'heure","on time");
  const ms=TASKS.filter(t=>t.ms&&f[t.id].es>=TODAY);
  const late=TASKS.filter(t=>!t.ms&&BASE[t.id].ef<TODAY&&S.pct[t.id]<100);
  const tl=R.tl,pend=S.crs.filter(c=>c.st==="submitted");
  const asks=[];
  pend.filter(c=>c.auth==="COPIL").forEach(c=>asks.push(X(`Décider la ${c.id} : ${c.fr}.`,`Decide ${c.id}: ${c.en}.`)));
  if(R.slipE>0&&!pend.some(c=>c.eff&&c.eff.rebase))asks.push(X(`Arbitrer le décalage du go-live EPBCS (${slipTxt(R.slipE)}) : réduire le périmètre de la recette ou décaler le lancement du budget.`,`Decide on the EPBCS go-live slip (${slipTxt(R.slipE)}): reduce test scope or delay the budget launch.`));
  late.forEach(t=>asks.push(X(`Relancer « ${t.fr} » : ${S.pct[t.id]} % au lieu de 100 %, propriétaire ${roleL(t.own)}.`,`Chase “${t.en}”: ${S.pct[t.id]}% instead of 100%, owner ${roleL(t.own)}.`)));
  if(u.crit)asks.push(X(`${u.crit} anomalie(s) critique(s) ouvertes en recette : prioriser la correction avant le comité go/no-go.`,`${u.crit} critical defect(s) open in testing: prioritise fixes before the go/no-go committee.`));
  if(raciIssues().length)asks.push(X("Corriger le RACI : une activité a deux responsables finaux et une autre aucun réalisateur.","Fix the RACI: one activity has two accountable roles and another has no one responsible."));
  const narr=X(`Au 25 septembre, le projet est en phase de recette (SIT et UAT). Le go-live EPBCS est prévu le ${fd(f.M5.es)} (${slipTxt(R.slipE)}) et celui de FCCS le ${fd(f.M6.es)} (${slipTxt(R.slipF)}). ${u.pass} cas de test sur ${u.n} sont réussis. La valeur acquise est de ${keur(e.EV)} pour ${keur(e.AC)} dépensés (CPI ${nf(e.CPI,2)}). Décision de mise en production calculée à ce jour : ${{go:"GO",cond:"GO sous conditions",nogo:"NO GO"}[g.v]}.`,
    `At 25 September, the project is in the testing phase (SIT and UAT). The EPBCS go-live is forecast on ${fd(f.M5.es)} (${slipTxt(R.slipE)}) and FCCS on ${fd(f.M6.es)} (${slipTxt(R.slipF)}). ${u.pass} of ${u.n} test cases have passed. Earned value is ${keur(e.EV)} for ${keur(e.AC)} spent (CPI ${nf(e.CPI,2)}). Go-live decision as of today: ${{go:"GO",cond:"GO with conditions",nogo:"NO GO"}[g.v]}.`);
  // PRINCE2 exception report: raised by the project manager as soon as a tolerance is forecast to be exceeded
  let exc="";
  if(tl.exc){const crit=criticalSet(),parts=[];
    if(!tl.cost.ok){const cr=pend.find(c=>c.eff&&c.eff.rel);
      parts.push(`<li><b>${X("Coûts","Cost")}</b> · ${X(`prévision à terminaison ${keur(e.EAC)} pour un budget autorisé de ${keur(e.AUTH)}, soit ${sgnPct(tl.cost.v)} (tolérance +${nf(TOL.cost*100)} %).`,`estimate at completion ${keur(e.EAC)} against an authorised budget of ${keur(e.AUTH)}, ${sgnPct(tl.cost.v)} (tolerance +${nf(TOL.cost*100)}%).`)}
        <div class="muted" style="font-size:12.5px">${X(`Cause : CPI de ${nf(e.CPI,2)}, surtout sur les flux ERP (retard et chargements manuels). Options : A. débloquer de la provision pour aléas (recommandé, ${keur(CONTINGENCY-released())} disponibles) ; B. réduire le périmètre ; C. accepter le dépassement.`,`Cause: CPI of ${nf(e.CPI,2)}, mainly on the ERP flows (delay and manual loads). Options: A. release contingency (recommended, ${keur(CONTINGENCY-released())} available); B. reduce scope; C. accept the overrun.`)}</div>
        ${cr?`<button class="btn" data-goto="chg" style="margin-top:6px">${X(`Voir la ${cr.id} en attente de décision`,`See ${cr.id}, awaiting decision`)}</button>`:`<button class="btn primary" data-newcr="cost" style="margin-top:6px">${X("Créer la demande de changement","Raise a change request")}</button>`}</li>`)}
    if(!tl.time.ok){const t=tl.time.t,cr=pend.find(c=>c.eff&&c.eff.rebase&&c.eff.rebase[t.id]),drivers=TASKS.filter(x=>crit.has(x.id)&&(S.slip[x.id]||0)>0).map(x=>tname(x));
      parts.push(`<li><b>${X("Délais","Schedule")}</b> · ${X(`${tname(t)} prévu le ${fd(f[t.id].es)}, soit ${slipTxt(tl.time.d)} par rapport à la date engagée du ${fd(committed(t.id))} (tolérance ±${TOL.days} jours ouvrés).`,`${tname(t)} forecast on ${fd(f[t.id].es)}, ${slipTxt(tl.time.d)} against the committed date of ${fd(committed(t.id))} (tolerance ±${TOL.days} working days).`)}
        <div class="muted" style="font-size:12.5px">${X(`Cause : retard sur le chemin critique (${drivers.join(", ")||"—"}). Options : A. décaler la date engagée par une demande de changement (recommandé) ; B. renforcer l'équipe sur les tâches critiques ; C. réduire le périmètre de la recette.`,`Cause: delay on the critical path (${drivers.join(", ")||"—"}). Options: A. move the committed date through a change request (recommended); B. add people to the critical tasks; C. reduce testing scope.`)}</div>
        ${cr?`<button class="btn" data-goto="chg" style="margin-top:6px">${X(`Voir la ${cr.id} en attente de décision`,`See ${cr.id}, awaiting decision`)}</button>`:`<button class="btn primary" data-newcr="time" style="margin-top:6px">${X("Créer la demande de changement","Raise a change request")}</button>`}</li>`)}
    exc=`<div class="panelcard" style="margin-top:14px;border-color:var(--bad)"><h3 style="color:var(--bad)">${X("Rapport d'exception · tolérance dépassée","Exception report · tolerance exceeded")}</h3><ul class="cmts">${parts.join("")}</ul>${why("En PRINCE2, le chef de projet gère par exception : tant que la prévision reste dans les tolérances fixées par le COPIL, il agit seul ; dès qu'elle en sort, il présente les options et le COPIL décide.","In PRINCE2 the project manager manages by exception: while the forecast stays within the tolerances set by the steering committee, they act alone; once it goes beyond them, they present the options and the committee decides.")}</div>`}
  return `
  <div class="ragrow">
    ${tile(X("Statut global","Overall"),R.ov,X("Pire des quatre dimensions","Worst of the four dimensions"),1)}
    ${tile(X("Délais","Schedule"),R.sch,X(`SPI ${nf(e.SPI,2)} · go-live EPBCS ${slipTxt(R.slipE)}`,`SPI ${nf(e.SPI,2)} · EPBCS go-live ${slipTxt(R.slipE)}`))}
    ${tile(X("Coûts","Cost"),R.cost,X(`CPI ${nf(e.CPI,2)} · fin estimée ${keur(e.EAC)}`,`CPI ${nf(e.CPI,2)} · estimate at completion ${keur(e.EAC)}`))}
    ${tile(X("Qualité","Quality"),R.q,X(`${u.crit} anomalie(s) critique(s), ${u.maj} majeure(s) ouvertes`,`${u.crit} critical, ${u.maj} major defect(s) open`))}
    ${tile(X("Risques","Risks"),R.rk,X(`Score maximal ${R.mx} / 25`,`Highest score ${R.mx} / 25`))}
  </div>
  <div class="narr"><p>${esc(narr)}</p></div>
  ${exc}
  <div class="kpis">
    <div class="kpi"><span class="lab">${X("Go-live EPBCS","EPBCS go-live")}</span><span class="big">${fd(f.M5.es)}</span><span class="sub">${X("Date engagée","Committed")} ${fd(committed("M5"))} · <b class="${R.slipE>0?"late":""}">${slipTxt(R.slipE)}</b></span></div>
    <div class="kpi"><span class="lab">${X("Go-live FCCS","FCCS go-live")}</span><span class="big">${fd(f.M6.es)}</span><span class="sub">${X("Date engagée","Committed")} ${fd(committed("M6"))} · <b class="${R.slipF>0?"late":""}">${slipTxt(R.slipF)}</b></span></div>
    <div class="kpi"><span class="lab">${X("Budget","Budget")}</span><span class="big">${keur(e.AC)}</span><span class="sub">${X(`dépensés sur ${keur(e.AUTH)} autorisés · valeur acquise ${keur(e.EV)}`,`spent of ${keur(e.AUTH)} authorised · earned value ${keur(e.EV)}`)}</span></div>
  </div>
  <div class="two">
    <div class="chartcard"><div class="head"><h3>${X("Valeur acquise","Earned value")}</h3><span class="note">${X("Cumul en k€, au 25 septembre","Cumulative k€, at 25 September")}</span></div>
      <div class="legend"><span><i style="background:var(--s-act)"></i>${X("Valeur planifiée (PV)","Planned value (PV)")}</span><span><i style="background:var(--s-bud)"></i>${X("Valeur acquise (EV)","Earned value (EV)")}</span><span><i style="background:var(--ink-2)"></i>${X("Coût réel (AC)","Actual cost (AC)")}</span></div>
      <div id="evm"></div>
      <table class="calc-table" style="width:100%;margin-top:6px"><tbody>
        <tr><td>SPI = EV / PV</td><td class="r">${nf(e.EV)} / ${nf(e.PV)} = <b>${nf(e.SPI,2)}</b></td></tr>
        <tr><td>CPI = EV / AC</td><td class="r">${nf(e.EV)} / ${nf(e.AC)} = <b>${nf(e.CPI,2)}</b></td></tr>
        <tr><td>SV = EV − PV · CV = EV − AC</td><td class="r">${nf(e.SV)} · ${nf(e.CV)} k€</td></tr>
        <tr><td>EAC = BAC / CPI</td><td class="r">${nf(BAC)} / ${nf(e.CPI,2)} = <b>${keur(e.EAC)}</b></td></tr>
        <tr><td>${X("TCPI = (BAC − EV) / (budget autorisé − AC)","TCPI = (BAC − EV) / (authorised budget − AC)")}</td><td class="r">${nf(BAC-e.EV)} / ${nf(e.AUTH-e.AC)} = <b class="${e.TCPI>1.1?"late":""}">${isFinite(e.TCPI)?nf(e.TCPI,2):"—"}</b></td></tr></tbody></table>
      <p class="muted" style="margin:6px 0 0;font-size:12.5px">${X(`TCPI : l'efficacité nécessaire sur le reste à faire pour tenir le budget autorisé. Au-dessus de 1,10, la cible n'est plus réaliste : il faut une décision du COPIL.`,`TCPI: the efficiency needed on the remaining work to meet the authorised budget. Above 1.10 the target is no longer realistic and needs a steering committee decision.`)}</p></div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="panelcard"><h3>${X("Tolérances du projet","Project tolerances")}</h3><table class="tbl"><tbody>
        <tr><td style="padding-left:0">${X(`Délais : go-lives ±${TOL.days} jours ouvrés`,`Time: go-lives ±${TOL.days} working days`)}</td><td class="r mono">${slipTxt(tl.time.d)}</td><td style="padding-right:0">${tl.time.ok?`<span class="sev ok">OK</span>`:`<span class="sev e">${X("Dépassée","Exceeded")}</span>`}</td></tr>
        <tr><td style="padding-left:0">${X(`Coûts : +${nf(TOL.cost*100)} % du budget autorisé`,`Cost: +${nf(TOL.cost*100)}% of authorised budget`)}</td><td class="r mono">${sgnPct(tl.cost.v)}</td><td style="padding-right:0">${tl.cost.ok?`<span class="sev ok">OK</span>`:`<span class="sev e">${X("Dépassée","Exceeded")}</span>`}</td></tr></tbody></table>
        <p class="muted" style="margin:0;font-size:12.5px">${X(`Provision pour aléas : ${keur(CONTINGENCY)}, dont ${keur(released())} débloqués par changement ; ${keur(CONTINGENCY-released())} restants. Budget autorisé = ${keur(BAC)} + provision débloquée.`,`Contingency: ${keur(CONTINGENCY)}, of which ${keur(released())} released through change control; ${keur(CONTINGENCY-released())} left. Authorised budget = ${keur(BAC)} + released contingency.`)}</p></div>
      <div class="panelcard"><h3>${X("Prochains jalons","Upcoming milestones")}</h3><table class="tbl"><tbody>${ms.map(t=>{const d=f[t.id].es-(t.key?committed(t.id):BASE[t.id].es);return `<tr><td style="padding-left:0">${esc(tname(t))}</td><td class="r mono">${fd(f[t.id].es)}</td><td class="r mono ${d>0?"late":""}" style="padding-right:0">${d>0?"+"+d+X(" j"," d"):"✓"}</td></tr>`}).join("")}</tbody></table></div>
      <div class="panelcard"><h3>${X("Décisions demandées au comité","Decisions requested from the committee")}</h3>${asks.length?`<ul class="cmts">${asks.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>`:`<p class="muted" style="margin:0">${X("Aucune décision en attente.","No decision pending.")}</p>`}</div>
    </div>
  </div>`;
}
const tip=document.getElementById("tip");
function showTip(h,x,y){tip.innerHTML=h;tip.hidden=false;const w=tip.offsetWidth,ht=tip.offsetHeight;let lx=x+14,ly=y-ht-10;if(lx+w>innerWidth-8)lx=x-w-14;if(ly<8)ly=y+16;tip.style.left=lx+"px";tip.style.top=ly+"px"}
function hideTip(){tip.hidden=true}
function drawEVM(){
  const el=document.getElementById("evm");if(!el)return;const e=evm();
  const end=Math.max(...Object.values(BASE).map(x=>x.ef))+1,W=560,H=230,pl=48,pr=14,pt=10,pb=26;
  const Xp=d=>pl+d/end*(W-pl-pr),Y=v=>pt+(1-v/BAC)*(H-pt-pb);
  let g=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${X("Courbe de valeur acquise","Earned value curve")}">`;
  for(let v=0;v<=BAC;v+=120)g+=`<line class="gridline" x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${pl-6}" y="${Y(v)+4}" text-anchor="end">${nf(v)}</text>`;
  for(let m=0;m<12;m++){const d=m?wdOnOrAfter(new Date(2026,2+m,1)):0;if(d<0||d>end)continue;g+=`<text class="axis" x="${Xp(d)}" y="${H-8}" text-anchor="middle">${new Date(2026,2+m,1).toLocaleDateString(loc(),{month:"short"}).replace(".","")}</text>`}
  let path="";for(let d=0;d<=end;d+=3)path+=`${d?"L":"M"}${Xp(d).toFixed(1)},${Y(pvAt(d)).toFixed(1)}`;
  g+=`<path d="${path}" fill="none" stroke="var(--s-act)" stroke-width="2"/>`;
  g+=`<line x1="${Xp(TODAY)}" x2="${Xp(TODAY)}" y1="${pt}" y2="${H-pb}" stroke="var(--line-2)" stroke-dasharray="3 3"/>`;
  g+=`<circle cx="${Xp(TODAY)}" cy="${Y(e.PV)}" r="4.5" fill="var(--s-act)" stroke="var(--surface)" stroke-width="2"/><circle cx="${Xp(TODAY)}" cy="${Y(e.EV)}" r="5" fill="var(--s-bud)" stroke="var(--surface)" stroke-width="2"/><rect x="${Xp(TODAY)-5}" y="${Y(e.AC)-5}" width="10" height="10" fill="var(--ink-2)" stroke="var(--surface)" stroke-width="2"/>`;
  g+=`<text x="${Xp(TODAY)+10}" y="${Y(e.AC)-6}" style="font-size:11px;fill:var(--ink-2);font-family:var(--f-num)">AC ${nf(e.AC)}</text><text x="${Xp(TODAY)+10}" y="${Y(e.EV)+14}" style="font-size:11px;fill:var(--ink-2);font-family:var(--f-num)">EV ${nf(e.EV)} · PV ${nf(e.PV)}</text>`;
  g+=`<rect id="evhit" x="${pl}" y="${pt}" width="${W-pl-pr}" height="${H-pt-pb}" fill="transparent"/></svg>`;
  el.innerHTML=g;
  const svg=el.querySelector("svg");el.querySelector("#evhit").addEventListener("mousemove",ev=>{const r=svg.getBoundingClientRect(),d=Math.max(0,Math.min(end,Math.round(((ev.clientX-r.left)*W/r.width-pl)/(W-pl-pr)*end)));
    showTip(`<strong>${fd(d)}</strong><br>PV <span class="tv">${keur(pvAt(d))}</span>${d===TODAY?`<br>EV <span class="tv">${keur(e.EV)}</span><br>AC <span class="tv">${keur(e.AC)}</span>`:""}`,ev.clientX,ev.clientY)});
  el.querySelector("#evhit").addEventListener("mouseleave",hideTip);
}

/* ---------- plan (Gantt) ---------- */
function viewPlan(){
  const f=forecast(),fl=floats(),crit=new Set(Object.keys(fl).filter(id=>fl[id]!=null&&fl[id]<=0)),end=Math.max(...Object.values(f).map(x=>x.ef),...Object.values(BASE).map(x=>x.ef))+4;
  const pos=d=>(d/end*100).toFixed(3)+"%";
  const months=[];for(let m=0;m<12;m++){const d=m?wdOnOrAfter(new Date(2026,2+m,1)):0;if(d>=0&&d<end)months.push([d,new Date(2026,2+m,1).toLocaleDateString(loc(),{month:"short"}).replace(".","")])}
  const mhd=months.map(([d,l])=>`<span class="mhd" style="left:${pos(d)}">${l}</span>`).join("");
  const today=`<span class="today" style="left:${pos(TODAY)}"></span>`;
  const rows=STAGES.map(([sid,lab])=>{const ts=TASKS.filter(t=>t.st===sid);
    return `<tr class="stage"><td class="nm">${X(lab[0],lab[1])}</td><td colspan="6"></td><td class="tl">${today}</td></tr>`+ts.map(t=>{const b=BASE[t.id],c=f[t.id];
      if(t.ms){const moved=c.es>b.es;return `<tr><td class="nm" title="${esc(tname(t))}">◆ ${esc(tname(t))}</td><td class="mono">${fd(c.es)}</td><td></td><td></td><td></td><td class="mono ${moved?"late":""}">${moved?"+"+(c.es-b.es)+X(" j"," d"):""}</td><td></td><td class="tl">${today}${moved?`<span class="ms bms" style="left:${pos(b.es)}"></span>`:""}<span class="ms ${moved?"moved":""}" style="left:${pos(c.es)}" data-tt="${t.id}"></span></td></tr>`}
      const late=b.ef<TODAY&&S.pct[t.id]<100,isC=crit.has(t.id),done=S.pct[t.id]>=100;
      return `<tr><td class="nm" title="${esc(tname(t))}">${esc(tname(t))}${isC?` <span class="tag-crit">${X("critique","critical")}</span>`:""}</td><td class="mono">${fd(c.es)}</td><td class="mono ${c.ef>b.ef?"late":""}">${fd(c.ef)}</td>
        <td><input id="pct-${t.id}" data-pct="${t.id}" value="${S.pct[t.id]}" inputmode="numeric" aria-label="% ${esc(tname(t))}"> %</td>
        <td><input id="slip-${t.id}" data-slip="${t.id}" value="${S.slip[t.id]||0}" inputmode="numeric" ${done?"disabled":""} aria-label="${X("Glissement","Slip")} ${esc(tname(t))}"></td>
        <td class="mono ${isC?"late":""}">${fl[t.id]==null?"—":fl[t.id]}</td>
        <td class="mono ${late?"late":""}" title="${esc(roleL(t.own))}">${roleS(t.own)}</td>
        <td class="tl">${today}<span class="bl" style="left:${pos(b.es)};width:${pos(b.ef-b.es+1)}"></span><span class="bar${isC?" crit":""}" style="left:${pos(c.es)};width:${pos(c.ef-c.es+1)}" data-tt="${t.id}"><span class="pg" style="width:${S.pct[t.id]}%"></span></span></td></tr>`}).join("")}).join("");
  return `
  <div class="presets" style="margin-top:0"><span class="lab">${X("Scénarios","Scenarios")}</span><button class="btn" data-scn="uat">${X("Recette +2 semaines","Testing +2 weeks")}</button><button class="btn" data-scn="erp">${X("Flux ERP +4 semaines","ERP flows +4 weeks")}</button><button class="btn" data-scn="train">${X("Formation +1 semaine","Training +1 week")}</button><button class="btn ghost" data-scn="reset">${X("Glissements d'origine","Original slips")}</button></div>
  <div class="gridbox" style="margin-top:10px"><table class="gantt"><thead><tr><th class="nm" style="position:sticky;left:0;z-index:3">${X("Tâche","Task")}</th><th>${X("Début","Start")}</th><th>${X("Fin","End")}</th><th>${X("Avancement","Progress")}</th><th>${X("Glissement (j. ouvrés)","Slip (work. days)")}</th><th>${X("Marge (j. ouvrés)","Float (work. days)")}</th><th>${X("Resp.","Owner")}</th><th class="tl" style="position:relative">${mhd}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="legend-cells"><span><i style="border:1px dashed var(--line-2);background:transparent"></i>${X("Référence validée","Approved baseline")}</span><span><i style="background:var(--s-act)"></i>${X("Prévision","Forecast")}</span><span><i style="background:var(--bad)"></i>${X("Chemin critique (marge ≤ 0)","Critical path (float ≤ 0)")}</span><span><i style="background:var(--s-bud);width:3px"></i>${X("Aujourd'hui (25 sept.)","Today (25 Sep)")}</span><span>${X("Partie foncée d'une barre : avancement","Dark part of a bar: progress")}</span></div>
  ${fl.T06!=null?why(`Le flux ERP a quatre semaines de retard mais garde ${fl.T06} jour(s) ouvré(s) de marge avant les tests de performance : ${fl.T06>0?"il n'est pas encore critique. Au-delà de sa marge, il décalerait le go-live.":"il est désormais critique : chaque jour de retard décale le go-live."}`,`The ERP flow is four weeks late but keeps ${fl.T06} working day(s) of float before performance testing: ${fl.T06>0?"it is not critical yet. Beyond its float, it would push the go-live.":"it is now critical: every extra day moves the go-live."}`):""}`;
}

/* ---------- RACI ---------- */
function viewRaci(){
  const iss=raciIssues(),bad=new Set(iss.map(i=>i.a));
  return `<div class="gridbox"><table class="raci"><thead><tr><th style="text-align:left">${X("Activité","Activity")}</th>${ROLES.map(r=>`<th>${roleL(r[0])}</th>`).join("")}<th>${X("Contrôle","Check")}</th></tr></thead><tbody>
    ${ACTS.map(a=>`<tr class="${bad.has(a.id)?"bad":""}"><td class="act">${esc(X(a.fr,a.en))}</td>${ROLES.map(r=>{const v=S.raci[a.id][r[0]]||"";return `<td><button class="${v}" data-raci="${a.id}|${r[0]}" aria-label="${esc(X(a.fr,a.en))} · ${roleL(r[0])}">${v||"·"}</button></td>`}).join("")}<td>${bad.has(a.id)?`<span class="sev e">${X("À corriger","Fix")}</span>`:`<span class="sev ok">OK</span>`}</td></tr>`).join("")}</tbody></table></div>
  <div class="legend-cells"><span><b>R</b>&nbsp;${X("Réalise","Responsible")}</span><span><b>A</b>&nbsp;${X("Rend compte (un seul)","Accountable (only one)")}</span><span><b>C</b>&nbsp;${X("Consulté","Consulted")}</span><span><b>I</b>&nbsp;${X("Informé","Informed")}</span><span>${X("Cliquez pour passer à la lettre suivante","Click to cycle to the next letter")}</span></div>
  <div class="issues"><h3>${X("Contrôles de cohérence","Consistency checks")}</h3>${iss.length?`<ul>${iss.map(i=>`<li><span class="sev e">${X("Erreur","Error")}</span><span class="where">${esc(X(ACTS.find(a=>a.id===i.a).fr,ACTS.find(a=>a.id===i.a).en))}</span><span>${esc(i.msg)}</span></li>`).join("")}</ul>`:`<ul><li><span class="sev ok">OK</span><span>${X("Chaque activité a exactement un « A » et au moins un « R ».","Every activity has exactly one “A” and at least one “R”.")}</span></li></ul>`}</div>`;
}

/* ---------- RAID log ---------- */
const whoL=w=>typeof w==="string"?w:L(w);
function depStatus(d){
  if(!d.task)return {st:d.ext,got:null,need:null};
  const f=forecast(),got=f[d.task].ef,need=BASE[d.need].es-1;
  return {st:got<need?"ok":got===need?"risk":"late",got,need};
}
function viewRaid(){return viewRisk()+viewRaidMore()}
function viewRaidMore(){
  const stc={ok:`<span class="sev ok">${X("Dans les temps","On track")}</span>`,risk:`<span class="sev w">${X("Juste à temps","Just in time")}</span>`,late:`<span class="sev e">${X("En retard","Late")}</span>`};
  const asc={ok:`<span class="sev ok">${X("Confirmée","Confirmed")}</span>`,ko:`<span class="sev e">${X("Fausse → problème I1","Proved false → issue I1")}</span>`};
  const log=S.log.slice().sort((a,b)=>a.ts<b.ts?1:-1);
  return `
  <div class="twocol">
    <div class="panelcard"><h3>${X("Hypothèses","Assumptions")}</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="padding-left:0">ID</th><th>${X("Hypothèse","Assumption")}</th><th>${X("À vérifier avant","Check by")}</th><th style="padding-right:0">${X("Statut","Status")}</th></tr></thead><tbody>
      ${ASSUMPTIONS.map(a=>`<tr><td class="mono" style="padding-left:0">${a.id}</td><td style="font-size:12.5px">${esc(X(a.fr,a.en))}<div class="muted" style="font-size:11.5px">${roleL(a.own)}</div></td><td class="mono" style="white-space:nowrap">${fd(wd(a.by))}</td><td style="padding-right:0">${asc[a.st]}</td></tr>`).join("")}</tbody></table></div>
      ${why("Une hypothèse est un risque qu'on a choisi de ne pas traiter : on la date et on la vérifie, sinon elle devient un problème, comme AS4.","An assumption is a risk you chose not to treat: you date it and check it, or it turns into an issue, like AS4.")}</div>
    <div class="panelcard"><h3>${X("Dépendances","Dependencies")}</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="padding-left:0">ID</th><th>${X("Dépendance","Dependency")}</th><th style="padding-right:0">${X("Statut","Status")}</th></tr></thead><tbody>
      ${DEPENDENCIES.map(d=>{const s=depStatus(d);return `<tr><td class="mono" style="padding-left:0">${d.id}</td><td style="font-size:12.5px">${esc(X(d.fr,d.en))}<div class="muted" style="font-size:11.5px">${roleL(d.own)}${s.got!=null?X(` · prévu le ${fd(s.got)}, nécessaire au plus tard le ${fd(s.need)}`,` · forecast ${fd(s.got)}, needed by ${fd(s.need)}`):""}</div></td><td style="padding-right:0">${stc[s.st]}</td></tr>`}).join("")}</tbody></table></div>
      ${why("DP1 est calculée à partir du planning : si le flux ERP glisse encore, elle passe en retard sans que personne n'ait à mettre le journal à jour.","DP1 is calculated from the plan: if the ERP flow slips further, it turns late without anyone having to update the log.")}</div></div>
  <div class="sectitle"><h2>${X("Journal des décisions","Decision log")}</h2><p>${X("COPIL et délégation du chef de projet","Steering committee and project manager's delegation")}</p></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>${X("Date","Date")}</th><th>${X("Instance","Forum")}</th><th>${X("Décision","Decision")}</th></tr></thead><tbody>
    ${log.map(d=>`<tr><td class="mono" style="white-space:nowrap">${showTs(d.ts)}</td><td style="white-space:nowrap">${esc(whoL(d.who))}</td><td style="font-size:12.5px">${esc(X(d.fr,d.en))}</td></tr>`).join("")}</tbody></table></div>`;
}
function viewRisk(){
  const open=S.risks.filter(r=>r.open);
  let heat=`<div class="heat" role="img" aria-label="${X("Carte de chaleur des risques","Risk heat map")}"><div></div>${[1,2,3,4,5].map(i=>`<div class="ax">${i}</div>`).join("")}`;
  for(let p=5;p>=1;p--){heat+=`<div class="ax">${p}</div>`;for(let i=1;i<=5;i++){const s=p*i;heat+=`<div class="c z${zone(s)}">${open.filter(r=>r.p===p&&r.i===i).map(r=>`<span class="rid" title="${esc(X(r.fr,r.en))}">${r.id}</span>`).join("")}</div>`}}
  heat+=`</div><div class="muted" style="font-size:11.5px;margin-top:4px">${X(`Vertical : probabilité · horizontal : impact · faible 1–${RISK.low}, moyen ${RISK.low+1}–${RISK.high-1}, élevé ${RISK.high}–25 (condition du go-live), ${RISK.block} et plus bloque le go-live`,`Vertical: probability · horizontal: impact · low 1–${RISK.low}, medium ${RISK.low+1}–${RISK.high-1}, high ${RISK.high}–25 (a go-live condition), ${RISK.block} or more blocks go-live`)}</div>`;
  const sel=(id,f,v)=>`<select class="mini" data-risk="${id}|${f}" aria-label="${f} ${id}">${[1,2,3,4,5].map(n=>`<option ${v===n?"selected":""}>${n}</option>`).join("")}</select>`;
  return `<div class="twocol" style="margin-top:0"><div class="panelcard"><h3>${X("Carte de chaleur (risques ouverts)","Heat map (open risks)")}</h3>${heat}</div>
    <div class="panelcard"><h3>${X("Problèmes ouverts","Open issues")}</h3><ul class="cmts">${ISSUES.map(i=>`<li><div class="meta">${i.id} · ${X({h:"Priorité haute",m:"Priorité moyenne"}[i.pr],{h:"High priority",m:"Medium priority"}[i.pr])} · ${roleL(i.own)}</div><b>${esc(X(i.fr,i.en))}</b><div class="muted" style="font-size:12.5px">${esc(X(i.act[0],i.act[1]))}</div></li>`).join("")}</ul>
    ${why("Un problème est un risque qui s'est produit : il ne se gère plus par la probabilité, mais par une action et une échéance.","An issue is a risk that has happened: it is no longer managed by probability, but by an action and a deadline.")}</div></div>
  <div class="sectitle"><h2>${X("Registre des risques","Risk register")}</h2><p>${X("Score = probabilité × impact","Score = probability × impact")}</p></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>ID</th><th>${X("Risque","Risk")}</th><th>P</th><th>I</th><th>Score</th><th>${X("Réponse","Response")}</th><th>${X("Propriétaire","Owner")}</th><th>${X("Action","Action")}</th><th>${X("Statut","Status")}</th></tr></thead><tbody>
  ${S.risks.map(r=>{const s=score(r);return `<tr${r.open?"":' style="opacity:.55"'}><td class="mono">${r.id}</td><td>${esc(X(r.fr,r.en))}</td><td>${sel(r.id,"p",r.p)}</td><td>${sel(r.id,"i",r.i)}</td><td><span class="sc z${zone(s)}">${s}</span></td><td><select class="mini" data-risk="${r.id}|resp">${Object.keys(RESP).map(k=>`<option value="${k}" ${r.resp===k?"selected":""}>${X(RESP[k][0],RESP[k][1])}</option>`).join("")}</select></td><td>${roleL(r.own)}</td><td class="muted" style="font-size:12.5px">${esc(X(r.act[0],r.act[1]))}</td><td><button class="btn ghost" data-rclose="${r.id}" style="padding:4px 10px">${r.open?X("Clore","Close"):X("Rouvrir","Reopen")}</button></td></tr>`}).join("")}</tbody></table></div>`;
}

/* ---------- change control ---------- */
const crType=t=>X({scope:"Périmètre",cost:"Coûts",time:"Délais"}[t],{scope:"Scope",cost:"Cost",time:"Time"}[t]);
const crSt=s=>`<span class="chip ${{submitted:"st-submitted",approved:"st-approved",rejected:"st-fail"}[s]}">${X({submitted:"En attente",approved:"Approuvée",rejected:"Rejetée"}[s],{submitted:"Pending",approved:"Approved",rejected:"Rejected"}[s])}</span>`;
function crImpact(c){const out=[];
  if(c.eff&&c.eff.rel)out.push(X(`+${keur(c.eff.rel)} de provision débloquée`,`+${keur(c.eff.rel)} of contingency released`));
  else if(c.cost)out.push(`+${keur(c.cost)}`);
  if(c.eff&&c.eff.descope)out.push(X(`cas ${c.eff.descope} retiré de la recette`,`case ${c.eff.descope} removed from testing`));
  if(c.eff&&c.eff.rebase)Object.entries(c.eff.rebase).forEach(([m,d])=>out.push(X(`${tname(tById[m])} : +${d} j ouvrés`,`${tname(tById[m])}: +${d} working days`)));
  else if(c.days)out.push(X(`+${c.days} j ouvrés`,`+${c.days} working days`));
  return out.join(" · ")||X("Sans impact coût ni délai","No cost or time impact")}
function viewChg(){
  const e=evm(),tl=tolerance(),pend=S.crs.filter(c=>c.st==="submitted");
  return `<div class="kpis" style="margin-top:0">
    <div class="kpi"><span class="lab">${X("Budget autorisé","Authorised budget")}</span><span class="big">${keur(e.AUTH)}</span><span class="sub">${X(`${keur(BAC)} de réalisation + ${keur(released())} de provision débloquée`,`${keur(BAC)} work budget + ${keur(released())} contingency released`)}</span></div>
    <div class="kpi"><span class="lab">${X("Provision restante","Contingency left")}</span><span class="big">${keur(CONTINGENCY-released())}</span><span class="sub">${X(`sur ${keur(CONTINGENCY)} approuvés dans la note de cadrage`,`of ${keur(CONTINGENCY)} approved in the charter`)}</span></div>
    <div class="kpi"><span class="lab">${X("Tolérance coûts","Cost tolerance")}</span><span class="big">${sgnPct(tl.cost.v)}</span><span class="sub">${X(`prévision ${keur(e.EAC)} · limite +${nf(TOL.cost*100)} %`,`forecast ${keur(e.EAC)} · limit +${nf(TOL.cost*100)}%`)} ${tl.cost.ok?`<span class="sev ok">OK</span>`:`<span class="sev e">${X("Dépassée","Exceeded")}</span>`}</span></div></div>
  <div class="tblbox" style="margin-top:14px"><table class="tbl"><thead><tr><th>ID</th><th>${X("Demande","Request")}</th><th>${X("Type","Type")}</th><th>${X("Impact","Impact")}</th><th>${X("Décideur","Change authority")}</th><th>${X("Statut","Status")}</th><th></th></tr></thead><tbody>
    ${S.crs.map(c=>`<tr><td class="mono" style="white-space:nowrap">${c.id}<div class="muted" style="font-size:11px">${fd(wd(c.date))}</div></td><td>${esc(X(c.fr,c.en))}<div class="muted" style="font-size:12px">${X("Demandée par","Requested by")} ${roleL(c.by)}${c.note?` · ${esc(X(c.note[0],c.note[1]))}`:""}</div></td><td>${crType(c.type)}</td><td style="font-size:12.5px">${crImpact(c)}</td><td style="white-space:nowrap">${c.auth==="CP"?X("Chef de projet","Project manager"):"COPIL"}</td><td>${crSt(c.st)}</td>
      <td style="white-space:nowrap">${c.st==="submitted"?`<button class="btn primary" data-crok="${c.id}" style="padding:4px 10px">${X("Approuver","Approve")}</button> <button class="btn ghost" data-crko="${c.id}" style="padding:4px 10px">${X("Rejeter","Reject")}</button>`:""}</td></tr>`).join("")}</tbody></table></div>
  ${pend.length?`<p class="muted" style="margin:8px 0 0;font-size:12.5px">${X("Vous jouez ici le rôle du COPIL : approuver une demande met à jour la référence (budget autorisé, dates engagées ou périmètre de recette) et l'inscrit au journal des décisions.","Here you act as the steering committee: approving a request updates the baseline (authorised budget, committed dates or test scope) and records it in the decision log.")}</p>`:""}
  ${why("Le seuil de délégation évite de réunir le COPIL pour 8 k€, tout en gardant les vrais arbitrages au niveau du sponsor. Une demande rejetée reste au journal : elle explique plus tard pourquoi une fonction manque.","The delegation threshold avoids calling the committee for 8 k€, while keeping real trade-offs at sponsor level. A rejected request stays in the log: it later explains why a feature is missing.")}`;
}

/* ---------- UAT ---------- */
const MODS={EPBCS:["Planification (EPBCS)","Planning (EPBCS)"],FCCS:["Consolidation (FCCS)","Consolidation (FCCS)"],DATA:["Intégration des données","Data integration"],REP:["Rapports","Reports"],SEC:["Sécurité","Security"]};
const tst=s=>X({pass:"Réussi",fail:"En échec",block:"Bloqué",nr:"Non joué"}[s],{pass:"Passed",fail:"Failed",block:"Blocked",nr:"Not run"}[s]);
function viewUat(){
  const u=uat(),w=k=>u[k]/u.n*100;
  const sevL=s=>X({crit:"Critique",maj:"Majeure",min:"Mineure"}[s],{crit:"Critical",maj:"Major",min:"Minor"}[s]);
  const dst=s=>X({open:"Ouverte",fixed:"Corrigée, à retester",closed:"Close"}[s],{open:"Open",fixed:"Fixed, to retest",closed:"Closed"}[s]);
  return `<div class="kpis" style="margin-top:0">
    <div class="kpi"><span class="lab">${X("Exécution","Execution")}</span><span class="big">${pctF((u.pass+u.fail)/u.n)}</span><span class="sub">${u.pass+u.fail} / ${u.n} ${X("cas joués","cases run")}</span></div>
    <div class="kpi"><span class="lab">${X("Taux de réussite","Pass rate")}</span><span class="big">${pctF(u.pass/u.n)}</span><span class="sub">${u.pass} ${X("réussis","passed")} · ${u.fail} ${X("en échec","failed")} · ${u.block} ${X("bloqués","blocked")}</span></div>
    <div class="kpi"><span class="lab">${X("Anomalies ouvertes","Open defects")}</span><span class="big">${u.openD.length}</span><span class="sub"><span class="sev-crit">${u.crit} ${X("critiques","critical")}</span> · <span class="sev-maj">${u.maj} ${X("majeures","major")}</span></span></div></div>
  <div style="margin-top:12px"><div class="stack" role="img" aria-label="${X("Répartition des cas de test","Test case breakdown")}"><i style="width:${w("pass")}%;background:var(--good)"></i><i style="width:${w("fail")}%;background:var(--bad)"></i><i style="width:${w("block")}%;background:var(--warn)"></i></div>
    <div class="legend-cells"><span><i style="background:var(--good)"></i>${tst("pass")}</span><span><i style="background:var(--bad)"></i>${tst("fail")}</span><span><i style="background:var(--warn)"></i>${tst("block")}</span><span><i style="background:var(--cell-calc)"></i>${tst("nr")}</span></div></div>
  <div class="twocol">
    <div class="panelcard"><h3>${X("Critères de sortie de recette","Test exit criteria")}</h3><ul class="crit-list">${u.crits.map(c=>`<li><span class="sev ${c.ok?"ok":c.cond?"w":"e"}">${c.ok?"OK":c.cond?"!":"✕"}</span><span>${esc(X(c.fr,c.en))}${c.val!=null?` <span class="muted mono">(${pctF(c.val)})</span>`:c.n!=null?` <span class="muted mono">(${c.n})</span>`:""}</span></li>`).join("")}</ul>
      ${why("Les critères sont signés avant la recette : ils évitent de rediscuter la barre au moment de décider.","The criteria are signed before testing starts: they avoid re-arguing the bar when it is time to decide.")}
      <div><button class="btn" id="run-rest" ${u.nr?"":"disabled"}>${X(`Simuler l'exécution des ${u.nr} cas non joués`,`Simulate running the ${u.nr} cases not yet run`)}</button></div></div>
    <div class="panelcard"><h3>${X("Anomalies","Defects")}</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="padding-left:0">ID</th><th>${X("Gravité","Severity")}</th><th>${X("Description","Description")}</th><th>${X("Statut","Status")}</th><th></th></tr></thead><tbody>
      ${S.defects.map(d=>`<tr${d.st==="closed"?' style="opacity:.55"':""}><td class="mono" style="padding-left:0">${d.id}<div class="muted" style="font-size:11px">${d.t}</div></td><td class="sev-${d.sev}">${sevL(d.sev)}</td><td style="font-size:12.5px">${esc(X(d.fr,d.en))}</td><td style="font-size:12.5px;white-space:nowrap">${dst(d.st)}</td><td style="padding-right:0">${d.st==="open"?`<button class="btn" data-dfix="${d.id}" style="padding:4px 10px">${X("Corriger","Fix")}</button>`:d.st==="fixed"?`<button class="btn primary" data-dretest="${d.id}" style="padding:4px 10px">${X("Retest OK","Retest OK")}</button>`:""}</td></tr>`).join("")}</tbody></table></div></div></div>
  <div class="sectitle"><h2>${X("Cas de test","Test cases")}</h2><p>${X("Changez un statut pour simuler l'avancement","Change a status to simulate progress")}</p></div>
  <div class="tblbox"><table class="tbl"><thead><tr><th>ID</th><th>${X("Domaine","Area")}</th><th>${X("Cas de test","Test case")}</th><th>${X("Anomalie","Defect")}</th><th>${X("Statut","Status")}</th></tr></thead><tbody>
    ${S.tests.map(t=>{const d=S.defects.filter(x=>x.t===t.id&&x.st!=="closed"),out=descoped().has(t.id);return `<tr${out?' style="opacity:.55"':""}><td class="mono">${t.id}</td><td>${X(MODS[t.mod][0],MODS[t.mod][1])}</td><td>${esc(X(t.fr,t.en))}</td><td class="mono">${d.map(x=>`<span class="sev-${x.sev}">${x.id}</span>`).join(" ")||"—"}</td><td>${out?`<span class="muted" style="font-size:12.5px">${X("Hors périmètre (phase 2)","Descoped (phase 2)")}</span>`:`<select class="mini chip st-${t.st}" data-test="${t.id}" style="border:0">${["pass","fail","block","nr"].map(s=>`<option value="${s}" ${t.st===s?"selected":""}>${tst(s)}</option>`).join("")}</select>`}</td></tr>`}).join("")}</tbody></table></div>`;
}

/* ---------- go-live ---------- */
function viewGo(){
  const g=goNoGo(),vl={go:"GO",cond:X("GO sous conditions","GO with conditions"),nogo:"NO GO"}[g.v],vc={go:"v-go",cond:"v-cond",nogo:"v-nogo"}[g.v];
  const done=S.checks.filter(k=>k.done).length;
  return `<div class="decision"><div class="verdict ${vc}">${vl}</div><div>
    <b>${X("Décision calculée pour le go-live EPBCS","Calculated decision for the EPBCS go-live")}</b>
    ${g.blockers.length?`<p style="margin:6px 0 0"><span class="sev e">${g.blockers.length} ${X("point(s) bloquant(s)","blocking point(s)")}</span></p><ul class="crit-list" style="margin-top:6px">${g.blockers.map(b=>`<li><span class="sev e">✕</span><span>${esc(b)}</span></li>`).join("")}</ul>`:""}
    ${g.conds.length?`<p style="margin:8px 0 0"><span class="sev w">${g.conds.length} ${X("condition(s)","condition(s)")}</span></p><ul class="crit-list" style="margin-top:6px">${g.conds.map(b=>`<li><span class="sev w">!</span><span>${esc(b)}</span></li>`).join("")}</ul>`:""}
    ${g.v==="go"?`<p style="margin:6px 0 0" class="muted">${X("Tous les critères sont remplis.","All criteria are met.")}</p>`:""}
    <div style="margin-top:12px"><button class="btn primary" id="committee">${X("Réunir le comité go/no-go","Hold the go/no-go committee")}</button></div></div></div>
  <div class="sectitle"><h2>${X("Checklist de bascule","Cutover checklist")}</h2><p>${done} / ${S.checks.length} ${X("actions réalisées","actions completed")}</p></div>
  <div class="twocol" style="margin-top:0">${[["data","tech","users"],["support","gov"]].map(col=>`<div class="ck">${col.map(cat=>`<div class="muted" style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:6px">${X(CATS[cat][0],CATS[cat][1])}</div>${S.checks.filter(k=>k.cat===cat).map(k=>`<label class="${k.done?"done":""}"><input type="checkbox" data-ck="${k.id}" ${k.done?"checked":""}><span><span class="t">${esc(X(k.fr,k.en))}</span>${k.crit?`<span class="tag-crit">${X("critique","critical")}</span>`:""}</span><span class="meta">${roleL(k.own)}</span></label>`).join("")}`).join("")}</div>`).join("")}</div>
  ${S.decisions.length?`<div class="sectitle"><h2>${X("Décisions du comité","Committee decisions")}</h2></div><div class="tblbox"><table class="tbl"><thead><tr><th>${X("Date","Date")}</th><th>${X("Décision","Decision")}</th><th>${X("Motifs","Reasons")}</th></tr></thead><tbody>${S.decisions.slice().reverse().map(d=>`<tr><td class="mono" style="white-space:nowrap">${showTs(d.ts)}</td><td><span class="verdict ${{go:"v-go",cond:"v-cond",nogo:"v-nogo"}[d.v]}" style="font-size:12px;padding:2px 10px;border-radius:99px">${{go:"GO",cond:X("GO sous conditions","GO with conditions"),nogo:"NO GO"}[d.v]}</span></td><td style="font-size:12.5px">${d.n} ${X("point(s) bloquant(s)","blocking")} · ${d.c} ${X("condition(s)","condition(s)")}</td></tr>`).join("")}</tbody></table></div>`:""}`;
}

/* ---------- about ---------- */
function viewAbout(){
  const map=[["Business Case / PID",X("Phase de cadrage et note de cadrage","Scoping phase and project charter")],["Plans (stage & project)",X("Planning par phase, référence et prévision","Plan by phase, baseline and forecast")],["Tolerances",X("Délais et coûts fixés par le COPIL dans la note de cadrage","Time and cost set by the steering committee in the charter")],["Organisation",X("Matrice RACI et rôles du comité","RACI matrix and committee roles")],["Risk Register",X("Journal RAID : risques, réponses, carte de chaleur","RAID log: risks, responses, heat map")],["Issue Register",X("Problèmes ouverts et demandes de changement","Open issues and change requests")],["Quality Register",X("Cas de test, anomalies, critères de sortie","Test cases, defects, exit criteria")],["Highlight Report",X("Météo projet (tableau de bord)","Status report (dashboard)")],["Exception Report",X("Rapport d'exception quand une tolérance est dépassée","Exception report when a tolerance is exceeded")],["End Stage Report",X("Revue de fin de phase, comité go/no-go","End-of-phase review, go/no-go committee")],["Lessons Log",X("Phase de clôture du projet","Project closure phase")]];
  return `<div class="about"><article>
    <h2>${X("Notes techniques","Technical notes")}</h2>
    <p class="byline">${X("Projet de portfolio de","Portfolio project by")} <strong>Gaurav Sharma</strong> · ${X("Chef de projet IT, PRINCE2 et PSPO I","IT project manager, PRINCE2 and PSPO I")}</p>
    <h3>${X("Calculs","Calculations")}</h3>
    <ul><li>${X("Planning en jours ouvrés (lundi à vendredi, hors jours fériés français). Chaque tâche démarre au plus tôt à sa date de référence et après ses prédécesseurs (fin-début). Méthode du chemin critique : passe avant, puis passe arrière depuis les dates de go-live engagées (échéances) ; marge totale = fin au plus tard − fin prévue. Une tâche est critique si sa marge est nulle ou négative.","Working-day schedule (Monday to Friday, excluding French public holidays). Each task starts no earlier than its baseline date and after its predecessors (finish-to-start). Critical path method: forward pass, then backward pass from the committed go-live dates (deadlines); total float = latest finish − forecast finish. A task is critical when its float is zero or negative.")}</li>
    <li>${X("Valeur acquise : PV répartie linéairement sur la durée de référence, EV = coût × avancement, SPI = EV/PV, CPI = EV/AC, SV = EV − PV, CV = EV − AC, EAC = BAC/CPI, TCPI = (BAC − EV) / (budget autorisé − AC). Budget autorisé = budget de réalisation + provision pour aléas débloquée par changement.","Earned value: PV spread linearly over the baseline duration, EV = cost × progress, SPI = EV/PV, CPI = EV/AC, SV = EV − PV, CV = EV − AC, EAC = BAC/CPI, TCPI = (BAC − EV) / (authorised budget − AC). Authorised budget = work budget + contingency released through change control.")}</li>
    <li>${X(`Tolérances : ±${TOL.days} jours ouvrés sur les go-lives, +${nf(TOL.cost*100)} % sur le coût. Rouge = hors tolérance (rapport d'exception), orange = dans la tolérance mais hors plan, vert = conforme. Qualité rouge dès une anomalie critique.`,`Tolerances: ±${TOL.days} working days on go-lives, +${nf(TOL.cost*100)}% on cost. Red = outside tolerance (exception report), amber = within tolerance but off plan, green = on plan. Quality red with any critical defect.`)}</li>
    <li>${X(`Risques : une seule échelle (faible 1–${RISK.low}, moyen ${RISK.low+1}–${RISK.high-1}, élevé ${RISK.high}–25) pour la carte de chaleur, le tableau de bord et le go/no-go. NO GO si un critère de recette bloquant, une action critique ou un risque ≥ ${RISK.block} reste ouvert ; GO sous conditions pour les points non bloquants, dont les risques élevés.`,`Risks: one scale (low 1–${RISK.low}, medium ${RISK.low+1}–${RISK.high-1}, high ${RISK.high}–25) for the heat map, the dashboard and the go/no-go. NO GO if a blocking test criterion, a critical action or a risk ≥ ${RISK.block} is still open; GO with conditions for non-blocking points, including high risks.`)}</li></ul>
    <h3>${X("Méthode","Method")}</h3>
    <p>${X("Démarche hybride, courante chez les intégrateurs EPM : des phases séquentielles closes par un jalon de validation (cadrage, conception, réalisation, recette, mise en production, hypercare), et une réalisation en CRP (conference room pilots) revus avec les utilisateurs clés. C'est aussi l'esprit de la méthode d'Oracle pour ses applications cloud, le True Cloud Method : partir des fonctions standard (« adopt, not adapt ») et n'ajouter que ce qu'un besoin documenté justifie. Gouvernance à deux niveaux : COPIL mensuel (sponsor, DAF) et comité projet hebdomadaire, avec un journal RAID et un contrôle des changements. Le vocabulaire PRINCE2 7 ou PMI peut s'y superposer si le client l'impose (voir la correspondance). L'analyse de la valeur acquise et la matrice RACI sont des pratiques générales de gestion de projet, pas propres à une méthode. Les rôles et les seuils sont ceux que j'utilise en mission ; le projet, l'entreprise et les personnes sont fictifs.","A hybrid approach, common among EPM integrators: sequential phases each closed by a sign-off gate (scoping, design, build, testing, go-live, hypercare), with the build run as conference room pilots (CRPs) reviewed with key users. It is also the spirit of Oracle's own method for its cloud applications, the True Cloud Method: start from standard functionality (“adopt, not adapt”) and add only what a documented need justifies. Two-level governance: a monthly steering committee (sponsor, CFO) and a weekly project committee, with a RAID log and change control. PRINCE2 7 or PMI vocabulary can be layered on top if the client requires it (see the mapping). Earned value and the RACI matrix are general project-management practices, not specific to one method. Roles and thresholds are the ones I use on assignments; the project, company and people are fictional.")}</p>
    <h3>${X("Choix techniques","Technical choices")}</h3>
    <p>${X("JavaScript natif, sans backend ni bibliothèque ; le diagramme de Gantt et la courbe de valeur acquise sont dessinés à la main. Les données restent dans votre navigateur.","Plain JavaScript, no backend or library; the Gantt chart and the earned value curve are drawn by hand. Data stays in your browser.")}</p>
    <div class="formbar" style="margin-top:22px"><button class="btn" id="tour-start-2">${X("Lancer la visite guidée","Start the guided tour")}</button><button class="btn danger" id="reset">${X("Réinitialiser la démo","Reset demo")}</button></div></article>
  <aside><div class="card"><h3>${X("Si le client impose PRINCE2","If the client requires PRINCE2")}</h3><table class="tbl"><tbody>${map.map(r=>`<tr><td style="font-weight:600;padding-left:0">${r[0]}</td><td style="color:var(--ink-2);padding-right:0">${r[1]}</td></tr>`).join("")}</tbody></table></div></aside></div>`;
}

/* ---------- events ---------- */
function intIn(raw){const v=parseInt(String(raw).replace(/[^\d-]/g,""),10);return isNaN(v)?null:v}
// Share the language choice with the main site (same origin, same key)
function setLang(l){S.lang=l;try{localStorage.setItem("preferredLang",l)}catch(e){}render()}
document.getElementById("lang-fr").onclick=()=>setLang("fr");
document.getElementById("lang-en").onclick=()=>setLang("en");
document.addEventListener("click",ev=>{
  const b=ev.target.closest("button");if(!b||b.disabled)return;
  if(b.dataset.tab){if(S.tab!==b.dataset.tab)EXPLAIN=null;S.tab=b.dataset.tab;hideTip();render();return}
  if(b.dataset.goto){EXPLAIN=null;S.tab=b.dataset.goto;render();scrollTo(0,0);return}
  if(b.dataset.scn){const k=b.dataset.scn,f0=forecast();
    if(k==="reset"){S.slip={};TASKS.forEach(t=>{if(t.slip0)S.slip[t.id]=t.slip0})}
    else{const id={uat:"T09",erp:"T06",train:"T11"}[k],d={uat:10,erp:20,train:5}[k];S.slip[id]=(S.slip[id]||0)+d}
    const f1=forecast(),dE=f1.M5.es-f0.M5.es,dF=f1.M6.es-f0.M6.es;
    explain(()=>({title:X("Scénario appliqué","Scenario applied"),body:k==="reset"?X("Retour aux glissements d'origine : seul le flux ERP a un mois de retard.","Back to the original slips: only the ERP flow is a month late."):X(`Go-live EPBCS : ${dE?`${dE>0?"+":""}${dE} jours ouvrés (${fd(f1.M5.es)})`:"inchangé"} · go-live FCCS : ${dF?`${dF>0?"+":""}${dF} jours ouvrés (${fd(f1.M6.es)})`:"inchangé"}. ${!dE&&!dF?"La tâche n'est pas sur le chemin critique : sa marge absorbe le retard.":"La tâche est sur le chemin critique : le retard se reporte sur les dates promises au métier."}`,`EPBCS go-live: ${dE?`${dE>0?"+":""}${dE} working days (${fd(f1.M5.es)})`:"unchanged"} · FCCS go-live: ${dF?`${dF>0?"+":""}${dF} working days (${fd(f1.M6.es)})`:"unchanged"}. ${!dE&&!dF?"The task is not on the critical path: its float absorbs the delay.":"The task is on the critical path: the delay carries through to the dates promised to the business."}`)}));
    render();return}
  if(b.dataset.raci){const [a,r]=b.dataset.raci.split("|"),cyc=["","R","A","C","I"],cur=S.raci[a][r]||"",nx=cyc[(cyc.indexOf(cur)+1)%cyc.length];if(nx)S.raci[a][r]=nx;else delete S.raci[a][r];
    const before=raciIssues().length;EXPLAIN=null;render();return}
  if(b.dataset.rclose){const r=S.risks.find(x=>x.id===b.dataset.rclose);r.open=!r.open;explain(()=>({title:X(`${r.id} ${r.open?"rouvert":"clos"}`,`${r.id} ${r.open?"reopened":"closed"}`),body:r.open?X("Le risque revient dans la carte de chaleur et dans le calcul du statut.","The risk is back in the heat map and in the status calculation."):X("Un risque se clôt quand il ne peut plus survenir ou que sa réponse l'a neutralisé. Il sort de la carte de chaleur, mais reste dans le registre pour l'historique.","A risk is closed when it can no longer happen or its response has neutralised it. It leaves the heat map but stays in the register for the record.")}));render();return}
  if(b.dataset.dfix){const d=S.defects.find(x=>x.id===b.dataset.dfix);d.st="fixed";explain(()=>({title:X(`${d.id} corrigée`,`${d.id} fixed`),body:X(`Le consultant a livré une correction. L'anomalie n'est pas close tant que l'utilisateur n'a pas rejoué le cas ${d.t} avec succès : cliquez sur « Retest OK ».`,`The consultant delivered a fix. The defect is not closed until the user has replayed case ${d.t} successfully: click “Retest OK”.`)}));render();return}
  if(b.dataset.dretest){const d=S.defects.find(x=>x.id===b.dataset.dretest);d.st="closed";const t=S.tests.find(x=>x.id===d.t);if(t&&!S.defects.some(x=>x.t===t.id&&x.st!=="closed"))t.st="pass";
    const u=uat();explain(()=>({title:X(`${d.id} close`,`${d.id} closed`),body:X(`Le cas ${d.t} passe en réussi. Il reste ${u.crit} anomalie(s) critique(s) et ${u.maj} majeure(s) ouvertes ; taux de réussite ${pctF(u.pass/u.n)}.`,`Case ${d.t} moves to passed. ${u.crit} critical and ${u.maj} major defect(s) remain open; pass rate ${pctF(u.pass/u.n)}.`)}));render();return}
  if(b.id==="run-rest"){let n=0;const ds=descoped();S.tests.forEach(t=>{if(t.st==="nr"&&!ds.has(t.id)){t.st="pass";n++}});const u=uat();
    explain(()=>({title:X("Cas restants exécutés","Remaining cases run"),body:X(`${n} cas joués et réussis dans cette simulation. Exécution : ${pctF((u.pass+u.fail)/u.n)} ; ${u.block} cas restent bloqués par des anomalies, qu'il faut corriger avant de pouvoir les jouer.`,`${n} cases run and passed in this simulation. Execution: ${pctF((u.pass+u.fail)/u.n)}; ${u.block} cases remain blocked by defects, which must be fixed before they can be run.`)}));render();return}
  if(b.id==="committee"){const g=goNoGo(),vv={go:["GO","GO"],cond:["GO sous conditions","GO with conditions"],nogo:["NO GO","NO GO"]}[g.v];S.decisions.push({ts:stamp(),v:g.v,n:g.blockers.length,c:g.conds.length});
    S.log.push({ts:stamp(),who:"COPIL",fr:`Comité go/no-go EPBCS : ${vv[0]} (${g.blockers.length} point(s) bloquant(s), ${g.conds.length} condition(s))`,en:`EPBCS go/no-go committee: ${vv[1]} (${g.blockers.length} blocking point(s), ${g.conds.length} condition(s))`});
    explain(()=>({title:X(`Décision du comité : ${{go:"GO",cond:"GO sous conditions",nogo:"NO GO"}[g.v]}`,`Committee decision: ${{go:"GO",cond:"GO with conditions",nogo:"NO GO"}[g.v]}`),body:g.v==="nogo"?X(`${g.blockers.length} point(s) bloquant(s) empêchent la mise en production. Le comité fixe une nouvelle date de décision et le chef de projet présente un plan d'action ; si l'écart dépasse la marge de délai accordée au chef de projet, le point est remonté formellement au sponsor.`,`${g.blockers.length} blocking point(s) prevent go-live. The committee sets a new decision date and the project manager presents an action plan; if the delay exceeds the tolerance granted to the project manager, it is formally escalated to the sponsor.`):g.v==="cond"?X(`Mise en production autorisée, avec ${g.conds.length} condition(s) à lever pendant la période d'assistance, chacune avec un responsable et une échéance.`,`Go-live authorised, with ${g.conds.length} condition(s) to clear during hypercare, each with an owner and a deadline.`):X("Tous les critères sont remplis : la bascule peut commencer selon le plan de cutover.","All criteria are met: cutover can start according to plan.")}));render();return}
  if(b.dataset.crok||b.dataset.crko){const ok=!!b.dataset.crok,c=S.crs.find(x=>x.id===(b.dataset.crok||b.dataset.crko)),t0=tolerance(),e0=evm();c.st=ok?"approved":"rejected";
    S.log.push({ts:stamp(),who:c.auth==="CP"?X0("Chef de projet","Project manager"):"COPIL",fr:`${c.id} ${ok?"approuvée":"rejetée"} : ${c.fr}`,en:`${c.id} ${ok?"approved":"rejected"}: ${c.en}`});
    const t1=tolerance(),e1=evm(),u=uat();
    explain(()=>({title:X(`${c.id} ${ok?"approuvée":"rejetée"}`,`${c.id} ${ok?"approved":"rejected"}`),body:!ok?X("La demande est rejetée et reste au journal avec sa décision : rien ne change dans la référence.","The request is rejected and stays in the log with its decision: nothing changes in the baseline."):
      c.eff&&c.eff.rel?X(`Budget autorisé : ${keur(e0.AUTH)} → ${keur(e1.AUTH)}. Prévision à terminaison ${keur(e1.EAC)}, soit ${sgnPct(t1.cost.v)} : ${t1.cost.ok?"la tolérance coûts est respectée":"toujours hors tolérance"}. TCPI ${nf(e0.TCPI,2)} → ${nf(e1.TCPI,2)}. Provision restante : ${keur(CONTINGENCY-released())}.`,`Authorised budget: ${keur(e0.AUTH)} → ${keur(e1.AUTH)}. Estimate at completion ${keur(e1.EAC)}, ${sgnPct(t1.cost.v)}: ${t1.cost.ok?"the cost tolerance is met":"still outside tolerance"}. TCPI ${nf(e0.TCPI,2)} → ${nf(e1.TCPI,2)}. Contingency left: ${keur(CONTINGENCY-released())}.`):
      c.eff&&c.eff.descope?X(`Le cas ${c.eff.descope} sort du périmètre de la recette : ${u.n} cas restent à réussir, taux de réussite ${pctF(u.pass/u.n)}.`,`Case ${c.eff.descope} leaves the test scope: ${u.n} cases remain, pass rate ${pctF(u.pass/u.n)}.`):
      c.eff&&c.eff.rebase?X(`La date engagée est décalée : la référence est mise à jour et l'écart revient dans la tolérance (${t1.time.ok?"respectée":"toujours dépassée"}).`,`The committed date moves: the baseline is updated and the variance is back within tolerance (${t1.time.ok?"met":"still exceeded"}).`):
      X("Décision enregistrée au journal.","Decision recorded in the log.")}));
    render();return}
  if(b.dataset.newcr){const k=b.dataset.newcr,e=evm(),tl=tolerance(),id="CR-"+String(S.crs.length+1).padStart(2,"0");let c;
    if(k==="cost"){const amt=Math.min(CONTINGENCY-released(),Math.max(5,Math.ceil((e.EAC-e.AUTH)/5)*5));
      c={id,fr:`Débloquer ${nf(amt)} k€ de la provision pour aléas`,en:`Release ${nf(amt)} k€ of contingency`,type:"cost",by:"CP",date:"2026-09-25",cost:amt,days:0,auth:amt>10?"COPIL":"CP",st:"submitted",eff:{rel:amt},note:["Issue du rapport d'exception","Raised from the exception report"]}}
    else{const t=tl.time.t,d=tl.time.d;
      const nd=forecast()[t.id].es,fdL=l=>dayDate(nd).toLocaleDateString(LOCALE[l],{day:"numeric",month:"short",year:"numeric"});
      c={id,fr:`Décaler la date engagée « ${t.fr} » de ${d} jours ouvrés (au ${fdL("fr")})`,en:`Move the committed date “${t.en}” by ${d} working days (to ${fdL("en")})`,type:"time",by:"CP",date:"2026-09-25",cost:0,days:d,auth:"COPIL",st:"submitted",eff:{rebase:{[t.id]:d}},note:["Issue du rapport d'exception ; impacte un go-live, donc décision du COPIL","Raised from the exception report; it affects a go-live, so the steering committee decides"]}}
    S.crs.push(c);S.tab="chg";explain(()=>({title:X(`${c.id} créée`,`${c.id} raised`),body:X(`La demande est chiffrée et attend la décision du ${c.auth==="CP"?"chef de projet":"COPIL"}. Approuvez-la ou rejetez-la dans le journal ci-dessous.`,`The request is costed and awaits the ${c.auth==="CP"?"project manager's":"steering committee's"} decision. Approve or reject it in the log below.`)}));render();scrollTo(0,0);return}
  if(b.id==="explain-close"){EXPLAIN=null;render();return}
  if(b.id==="notes-toggle"){S.notes=!S.notes;render();return}
  if(b.id==="tour-start"||b.id==="tour-start-2"||b.id==="tour-start-3"){EXPLAIN=null;goTour(0);return}
  if(b.dataset.tour){const a=b.dataset.tour;goTour(a==="end"?null:a==="next"?S.tour+1:S.tour-1);return}
  if(b.id==="reset"){const l=S.lang;S=freshState();S.lang=l;S.tab="about";S.tour=null;EXPLAIN=null;render();toast(X("Données de démonstration réinitialisées","Demo data reset"));return}
});
document.addEventListener("change",ev=>{
  const el=ev.target;
  if(el.dataset.slip){const v=intIn(el.value);if(v==null||v<0||v>120){toast(X("Glissement entre 0 et 120 jours","Slip between 0 and 120 days"));render();return}
    const f0=forecast();S.slip[el.dataset.slip]=v;const f1=forecast(),t=tById[el.dataset.slip],dE=f1.M5.es-f0.M5.es,dF=f1.M6.es-f0.M6.es;
    explain(()=>({title:X(`Glissement de « ${t.fr} » : ${v} jour(s) ouvré(s)`,`“${t.en}” slip: ${v} working day(s)`),body:(dE||dF)?X(`La tâche est sur le chemin critique : go-live EPBCS ${dE>0?"+":""}${dE} jour(s) ouvré(s) (${fd(f1.M5.es)}), go-live FCCS ${dF>0?"+":""}${dF} jour(s) ouvré(s) (${fd(f1.M6.es)}). Le tableau de bord passe à jour.`,`The task is on the critical path: EPBCS go-live ${dE>0?"+":""}${dE} working day(s) (${fd(f1.M5.es)}), FCCS go-live ${dF>0?"+":""}${dF} working day(s) (${fd(f1.M6.es)}). The dashboard updates.`):X("Aucun go-live ne bouge : la tâche dispose de marge. Elle apparaîtra en rouge si le retard dépasse cette marge.","No go-live moves: the task has float. It will turn red if the delay exceeds that float.")}));render();return}
  if(el.dataset.pct){const v=intIn(el.value);if(v==null||v<0||v>100){toast(X("Avancement entre 0 et 100 %","Progress between 0 and 100%"));render();return}
    const e0=evm();S.pct[el.dataset.pct]=v;const e1=evm();explain(()=>({title:X("Avancement mis à jour","Progress updated"),body:X(`Valeur acquise : ${keur(e0.EV)} → ${keur(e1.EV)}. SPI ${nf(e1.SPI,2)}, CPI ${nf(e1.CPI,2)}. Le coût réel ne change pas : avancer plus vite sans dépenser plus améliore le CPI.`,`Earned value: ${keur(e0.EV)} → ${keur(e1.EV)}. SPI ${nf(e1.SPI,2)}, CPI ${nf(e1.CPI,2)}. Actual cost does not change: progressing faster without spending more improves CPI.`)}));render();return}
  if(el.dataset.risk){const [id,f]=el.dataset.risk.split("|"),r=S.risks.find(x=>x.id===id),old=score(r);r[f]=f==="resp"?el.value:+el.value;const nw=score(r);
    if(f!=="resp")explain(()=>({title:X(`${id} réévalué`,`${id} reassessed`),body:X(`Score ${old} → ${nw} (${["","faible","modéré","élevé"][zone(nw)]}). ${nw>=20?"Au-delà de 20, le risque bloque la mise en production.":nw>=15?"Entre 15 et 19, il devient une condition du go/no-go.":"Il ne pèse plus sur la décision de mise en production."}`,`Score ${old} → ${nw} (${["","low","moderate","high"][zone(nw)]}). ${nw>=20?"At 20 or more, the risk blocks go-live.":nw>=15?"Between 15 and 19, it becomes a go/no-go condition.":"It no longer weighs on the go-live decision."}`)}));
    render();return}
  if(el.dataset.test){const t=S.tests.find(x=>x.id===el.dataset.test);t.st=el.value;EXPLAIN=null;render();return}
  if(el.dataset.ck){const k=S.checks.find(x=>x.id===el.dataset.ck);k.done=el.checked;EXPLAIN=null;render();return}
});
render();
