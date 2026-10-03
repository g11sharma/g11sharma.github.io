/* ============================================================
   Paris Market AI — public page
   Reads data.json, exported every weekday morning from the AI running on
   Gaurav's Mac (Mistral via Ollama + a scikit-learn model). Real market data.
   No backend, no tracking. Experimental project, not investment advice.
   ============================================================ */
"use strict";
const S = { lang: "en", tab: "today", signal: "ALL", sector: "", search: "", stock: null, q: 0 };
const X = (fr, en) => (S.lang === "fr" ? fr : en);
let D = null;

/* ---------- language (same rules as the rest of the site) ---------- */
(function initLang() {
  try { const q = new URLSearchParams(location.search).get("lang"); if (q === "fr" || q === "en") { S.lang = q; return; } } catch (e) {}
  try { const v = localStorage.getItem("preferredLang"); if (v === "fr" || v === "en") { S.lang = v; return; } } catch (e) {}
  if ((navigator.language || "").toLowerCase().startsWith("fr")) S.lang = "fr";
})();
function setLang(l) {
  S.lang = l;
  try { localStorage.setItem("preferredLang", l); } catch (e) {}
  render();
}

/* ---------- formatting ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const loc = () => (S.lang === "fr" ? "fr-FR" : "en-GB");
const nf = (x, d = 2) => x == null ? "—" : x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 1, sign = true) => x == null ? "—" : (sign && x > 0 ? "+" : "") + (x * 100).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
const cls = x => x == null ? "" : x >= 0 ? "up" : "down";
const dateL = s => s ? new Date(s + "T12:00:00").toLocaleDateString(loc(), { day: "numeric", month: "long", year: "numeric" }) : "—";
const SIG = { BUY: ["ACHAT", "BUY"], HOLD: ["NEUTRE", "HOLD"], SELL: ["VENTE", "SELL"] };
const badge = s => s ? `<span class="badge ${s}">${X(SIG[s][0], SIG[s][1])}</span>` : "";
const probBar = p => p == null ? "—" : `<div class="prob"><div class="track"><div class="fill" style="width:${Math.round(p * 100)}%"></div></div><span class="num">${Math.round(p * 100)}%</span></div>`;
const byT = t => D.stocks.find(s => s.t === t);
function md(text) {   // tiny, safe markdown: escape first, then headings, bullets, bold
  const lines = esc(text || "").split(/\n/); let out = "", inList = false;
  for (let l of lines) {
    l = l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    if (/^\s*[-*]\s+/.test(l)) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + l.replace(/^\s*[-*]\s+/, "") + "</li>"; continue; }
    if (/^\s*\d+\.\s+/.test(l)) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + l.replace(/^\s*\d+\.\s+/, "") + "</li>"; continue; }
    if (inList) { out += "</ul>"; inList = false; }
    if (/^#{1,6}\s/.test(l)) out += "<h3>" + l.replace(/^#{1,6}\s/, "") + "</h3>";
    else if (l.trim()) out += "<p>" + l + "</p>";
  }
  return out + (inList ? "</ul>" : "");
}

/* ---------- tooltip ---------- */
const tip = document.getElementById("tip");
function showTip(e, html) { tip.innerHTML = html; tip.hidden = false; const x = Math.min(e.clientX + 14, innerWidth - 300); tip.style.left = x + "px"; tip.style.top = (e.clientY + 14) + "px"; }
function hideTip() { tip.hidden = true; }

/* ---------- charts (plain SVG, no library) ---------- */
function niceTicks(lo, hi, n = 5) {
  const raw = (hi - lo) / (n - 1), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= raw) || 10 * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}
function lineChart(series, dates, opt = {}) {
  // series: [{name, color, values}] ; one y-axis, shared x
  const W = 880, H = opt.h || 300, L = 52, R = 14, T = 12, B = 28;
  const all = series.flatMap(s => s.values).filter(v => v != null);
  const tk = niceTicks(Math.min(...all), Math.max(...all)); const lo = tk[0], hi = tk[tk.length - 1];
  const n = dates.length, x = i => L + (W - L - R) * (n < 2 ? 0 : i / (n - 1)), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || "")}"><g class="grid">`;
  tk.forEach(v => { svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${opt.fmt ? opt.fmt(v) : nf(v, 0)}</text>`; });
  svg += "</g>";
  const step = Math.max(1, Math.ceil(n / 7));
  for (let i = 0; i < n; i += step) svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${new Date(dates[i] + "T12:00:00").toLocaleDateString(loc(), { month: "short", year: "2-digit" })}</text>`;
  series.forEach(s => {
    const pts = s.values.map((v, i) => v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean).join(" ");
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  svg += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--line-2)" stroke-width="1" visibility="hidden"/>`;
  svg += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="hit"/></svg>`;
  const id = "c" + Math.random().toString(36).slice(2);
  setTimeout(() => {
    const el = document.getElementById(id); if (!el) return;
    const sv = el.querySelector("svg"), hit = sv.querySelector(".hit"), xh = sv.querySelector(".xh");
    hit.addEventListener("mousemove", e => {
      const r = sv.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
      const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / (W - L - R) * (n - 1))));
      xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.setAttribute("visibility", "visible");
      showTip(e, `<b>${dateL(dates[i])}</b><br>` + series.map(s => `${esc(s.name)}: <span class="tv">${opt.fmt ? opt.fmt(s.values[i]) : nf(s.values[i])}</span>`).join("<br>"));
    });
    hit.addEventListener("mouseleave", () => { hideTip(); xh.setAttribute("visibility", "hidden"); });
  });
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span style="--c:${s.color}">${esc(s.name)}</span>`).join("")}</div>` : "";
  return `<div id="${id}">${legend}${svg}</div>`;
}
function scatter(points, highlight) {
  const W = 880, H = 380, L = 52, R = 14, T = 12, B = 36;
  const xs = points.map(p => p.v), ys = points.map(p => p.y1);
  const xt = niceTicks(0, Math.max(...xs)), yt = niceTicks(Math.min(...ys, -0.2), Math.max(...ys));
  const x0 = xt[0], x1 = xt[xt.length - 1], y0 = yt[0], y1 = yt[yt.length - 1];
  const x = v => L + (W - L - R) * (v - x0) / (x1 - x0), y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${X("Carte risque / rendement", "Risk / return map")}"><g class="grid">`;
  yt.forEach(v => { svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${pct(v, 0)}</text>`; });
  xt.forEach(v => { svg += `<text x="${x(v)}" y="${H - 18}" text-anchor="middle">${pct(v, 0, false)}</text>`; });
  svg += `</g><line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-2)"/>`;
  svg += `<text x="${(W + L) / 2}" y="${H - 2}" text-anchor="middle">${X("Volatilité annuelle →", "Yearly volatility →")}</text>`;
  const sorted = [...points].sort((a, b) => highlight.has(a.t) - highlight.has(b.t));
  sorted.forEach(p => {
    const hl = highlight.has(p.t);
    svg += `<circle cx="${x(p.v).toFixed(1)}" cy="${y(p.y1).toFixed(1)}" r="${hl ? 7 : 5}" fill="${hl ? "var(--s1)" : "var(--dot)"}" stroke="var(--surface)" stroke-width="2" data-t="${esc(p.t)}"/>`;
  });
  svg += "</svg>";
  const id = "s" + Math.random().toString(36).slice(2);
  setTimeout(() => {
    const el = document.getElementById(id); if (!el) return;
    el.querySelectorAll("circle").forEach(c => {
      const s = byT(c.dataset.t);
      c.addEventListener("mousemove", e => showTip(e, `<b>${esc(s.n)}</b><br>${esc(s.s)}<br>${X("1 an", "1 year")}: <span class="tv">${pct(s.y1)}</span><br>${X("Volatilité", "Volatility")}: <span class="tv">${pct(s.v, 0, false)}</span>`));
      c.addEventListener("mouseleave", hideTip);
      c.style.cursor = "pointer";
      c.addEventListener("click", () => { hideTip(); S.stock = s.t; S.tab = "explore"; render(); });
    });
  });
  return `<div id="${id}"><div class="legend"><span class="dot" style="--c:var(--dot)">${X("Autres actions", "Other stocks")}</span><span class="dot" style="--c:var(--s1)">${X("Top 10 long terme", "Long-term top 10")}</span></div>${svg}</div>`;
}

/* ---------- tabs ---------- */
const TABS = [
  ["today", "Aujourd'hui", "Today"], ["signals", "Signaux", "Signals"], ["explore", "Explorer une action", "Stock explorer"],
  ["ranks", "Long terme et risque", "Long term & risk"], ["record", "Résultats", "Track record"],
  ["ask", "Demander à l'IA", "Ask the AI"], ["how", "Comment ça marche", "How it works"],
];

function viewToday() {
  const m = D.market, mac = D.macro, mod = D.model;
  const rs = mac ? mac.risk_score : null;
  let h = `<div class="intro"><div class="card"><h2>${X("Une IA qui lit les marchés chaque matin", "An AI that reads the market every morning")}</h2>
    <p class="lead">${X("Chaque jour ouvré à 8 h, une IA locale (Mistral) lit l'actualité financière française et mondiale, et un modèle de machine learning classe les", "Every weekday at 8:00, a local AI (Mistral) reads French financial and world news, and a machine-learning model ranks the")} ${D.stocks.length} ${X("actions les plus échangées d'Euronext Paris.", "most traded stocks on Euronext Paris.")}</p>
    <p>${X("Données de marché réelles. Le modèle tourne sur mon Mac ; cette page affiche ses résultats du jour.", "Real market data. The model runs on my Mac; this page shows its latest results.")}</p></div>
    <div class="card"><h2>${X("À retenir", "Keep in mind")}</h2><p>${X("Projet expérimental : le pouvoir prédictif mesuré du modèle est modeste. Rien ici n'est un conseil en investissement.", "Experimental project: the model's measured predictive power is modest. Nothing here is investment advice.")}</p>
    <p class="muted">${X("Mis à jour le", "Updated")} ${esc(D.generated)} · ${X("cours du", "prices of")} ${dateL(D.date)}</p></div></div>`;
  h += `<div class="kpis">
    <div class="kpi"><div class="v num ${cls(m.cac_day)}">${pct(m.cac_day, 2)}</div><div class="l">CAC 40 · ${nf(m.cac, 0)} pts</div></div>
    <div class="kpi"><div class="v num ${cls(m.cac_1m)}">${pct(m.cac_1m)}</div><div class="l">${X("CAC 40 sur 1 mois", "CAC 40 over 1 month")}</div></div>
    <div class="kpi"><div class="v num ${rs == null ? "" : rs > .15 ? "up" : rs < -.15 ? "down" : ""}">${rs == null ? "—" : (rs > 0 ? "+" : "") + nf(rs, 1)}</div><div class="l">${X("Risque mondial lu par l'IA (−1 à +1)", "World risk read by the AI (−1 to +1)")}</div></div>
    <div class="kpi"><div class="v num">${D.news_count}</div><div class="l">${X("sociétés dont l'IA a lu l'actualité", "companies whose news the AI read")}</div></div>
    <div class="kpi"><div class="v num">${mod ? nf(mod.auc, 3) : "—"}</div><div class="l">${X("Pouvoir prédictif (AUC, 0,5 = hasard)", "Predictive power (AUC, 0.5 = chance)")}</div></div></div>`;
  h += `<div class="grid g2"><div class="card"><h2>${X("Note de marché écrite par l'IA", "Market brief written by the AI")}</h2>
    ${S.lang === "fr" ? '<p class="muted">Rédigée en anglais par l\'IA.</p>' : ""}<div class="md">${D.brief ? md(D.brief.replace(/^# .*\n/, "")) : "—"}</div></div>
    <div class="card"><h2>${X("Contexte mondial", "World context")}</h2>`;
  if (mac) {
    h += `<p>${esc(mac.summary)}</p>` + (mac.themes || []).map(t => `<p><b>${esc(t.theme)}${X(" :", ":")}</b> ${esc(t.impact)}</p>`).join("");
    h += `<h3>${X("Secteurs soutenus", "Sectors helped")}</h3><div class="chips">${(mac.sectors_positive || []).map(s => `<span class="chip good">${esc(s)}</span>`).join("") || "—"}</div>`;
    h += `<h3>${X("Secteurs pénalisés", "Sectors hurt")}</h3><div class="chips">${(mac.sectors_negative || []).map(s => `<span class="chip bad">${esc(s)}</span>`).join("") || "—"}</div>`;
  } else h += `<p class="muted">—</p>`;
  h += `</div></div>`;
  h += `<div class="card" style="margin-top:16px"><h2>CAC 40 · ${X("12 derniers mois", "last 12 months")}</h2>${lineChart([{ name: "CAC 40", color: "var(--s1)", values: D.cac_weekly.values }], D.cac_weekly.dates, { h: 240, fmt: v => nf(v, 0), label: "CAC 40" })}</div>`;
  return h;
}

function viewSignals() {
  const sectors = [...new Set(D.stocks.map(s => s.s).filter(s => s && s !== "—"))].sort();
  let rows = D.stocks.filter(s => s.pr != null).sort((a, b) => b.pr - a.pr);
  if (S.signal !== "ALL") rows = rows.filter(s => s.sg === S.signal);
  if (S.sector) rows = rows.filter(s => s.s === S.sector);
  if (S.search) rows = rows.filter(s => s.n.toLowerCase().includes(S.search.toLowerCase()));
  let h = `<p>${X("Pour chaque action, le modèle estime la probabilité de faire mieux que le CAC 40 sur les 5 prochaines séances. Les 20 % les mieux classées sont ACHAT, les 20 % les moins bien classées VENTE. Cliquez sur une ligne pour le détail.", "For each stock, the model estimates the chance of beating the CAC 40 over the next 5 trading days. The top 20% are BUY, the bottom 20% SELL. Click a row for details.")}</p>
  <div class="bar"><label>${X("Signal", "Signal")}<select id="f-sig">${["ALL", "BUY", "HOLD", "SELL"].map(v => `<option value="${v}" ${S.signal === v ? "selected" : ""}>${v === "ALL" ? X("Tous", "All") : X(SIG[v][0], SIG[v][1])}</option>`).join("")}</select></label>
  <label>${X("Secteur", "Sector")}<select id="f-sec"><option value="">${X("Tous", "All")}</option>${sectors.map(s => `<option ${S.sector === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
  <label>${X("Rechercher", "Search")}<input id="f-q" type="search" value="${esc(S.search)}" placeholder="${X("Nom de la société", "Company name")}"></label>
  <span class="muted">${rows.length} ${X("actions", "stocks")}</span></div>
  <div class="tbl-wrap"><table><thead><tr><th>${X("Société", "Company")}</th><th>${X("Secteur", "Sector")}</th><th class="r">${X("Cours €", "Price €")}</th><th class="r">${X("Jour", "Day")}</th><th>Signal</th><th>${X("Chance de battre le CAC 40", "Chance to beat CAC 40")}</th><th class="r">${X("Actu IA", "AI news")}</th><th>${X("Ce que le modèle a vu", "What the model saw")}</th></tr></thead><tbody>`;
  rows.forEach(s => {
    h += `<tr class="click" data-t="${esc(s.t)}"><td class="name">${esc(s.n)}</td><td>${esc(s.s)}</td><td class="r num">${nf(s.p)}</td><td class="r num ${cls(s.d)}">${pct(s.d)}</td><td>${badge(s.sg)}</td><td>${probBar(s.pr)}</td><td class="r num ${s.se ? cls(s.se) : ""}">${s.se == null ? "—" : (s.se > 0 ? "+" : "") + nf(s.se, 1)}</td><td class="facts">${esc(s.f)}</td></tr>`;
  });
  return h + `</tbody></table></div>`;
}

function viewExplore() {
  const list = [...D.stocks].sort((a, b) => a.n.localeCompare(b.n));
  if (!S.stock) S.stock = (D.lists.short_buy[0]) || list[0].t;
  const s = byT(S.stock) || list[0];
  const cacScaled = D.cac_weekly.values.map(v => v / D.cac_weekly.values[0] * s.h[0]);
  let h = `<div class="bar"><label>${X("Société", "Company")}<select id="f-stock">${list.map(x => `<option value="${esc(x.t)}" ${x.t === s.t ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select></label><span class="muted">${esc(s.t)} · ${esc(s.s)}</span></div>
  <div class="stats">
    <div class="stat"><div class="v">${nf(s.p)} €</div><div class="l">${X("Cours", "Price")} · <span class="${cls(s.d)}">${pct(s.d, 2)}</span></div></div>
    <div class="stat"><div class="v ${cls(s.y1)}">${pct(s.y1)}</div><div class="l">${X("Sur 1 an", "1 year")}</div></div>
    <div class="stat"><div class="v">${pct(s.v, 0, false)}</div><div class="l">${X("Volatilité", "Volatility")}</div></div>
    <div class="stat"><div class="v">${nf(s.b)}</div><div class="l">${X("Bêta vs CAC 40", "Beta vs CAC 40")}</div></div>
    <div class="stat"><div class="v down">${pct(s.dd)}</div><div class="l">${X("Pire baisse (1 an)", "Worst drop (1y)")}</div></div>
    <div class="stat"><div class="v">${badge(s.sg) || "—"}</div><div class="l">${s.pr == null ? "" : Math.round(s.pr * 100) + X(" % de chance", "% chance")}</div></div></div>
  <div class="card">${lineChart([{ name: s.n, color: "var(--s1)", values: s.h }, { name: X("CAC 40 (même base)", "CAC 40 (same start)"), color: "var(--s2)", values: cacScaled }], D.week_dates, { h: 300, fmt: v => nf(v), label: s.n })}</div>
  <div class="grid g2e" style="margin-top:16px"><div class="card"><h2>${X("Lecture du modèle", "The model's reading")}</h2>
    <p>${esc(s.f)}</p><p class="muted">P/E ${s.pe ? nf(s.pe, 0) : "—"} · ${X("Dividende", "Dividend")} ${pct(s.dy, 1, false)} · RSI ${nf(s.rsi, 0)}</p>
    <h3>${X("L'IA a lu l'actualité", "The AI read the news")}</h3><p>${s.se == null ? X("Pas d'actualité récente.", "No recent news.") : `<b>${s.se > 0 ? "+" : ""}${nf(s.se, 1)}</b> · ${esc(s.ns)}`}</p></div>
    <div class="card"><h2>${X("Titres récents", "Recent headlines")}</h2>${s.news.length ? `<ul class="heads">${s.news.map(n => `<li><a href="${esc(n[2])}" target="_blank" rel="noopener noreferrer">${esc(n[0])}</a> <small>· ${esc(n[1])}</small></li>`).join("")}</ul>` : `<p class="muted">—</p>`}</div></div>`;
  return h;
}

function table(tickers, cols) {
  return `<div class="tbl-wrap"><table><thead><tr><th>#</th>${cols.map(c => `<th class="${c[2] || ""}">${c[0]}</th>`).join("")}</tr></thead><tbody>${tickers.map((t, i) => { const s = byT(t); return s ? `<tr class="click" data-t="${esc(t)}"><td class="num">${i + 1}</td>${cols.map(c => `<td class="${c[2] || ""}">${c[1](s)}</td>`).join("")}</tr>` : ""; }).join("")}</tbody></table></div>`;
}
function viewRanks() {
  const name = [X("Société", "Company"), s => `<span class="name">${esc(s.n)}</span>`];
  let h = `<div class="card"><h2>${X("Long terme (6-12 mois) : top 10", "Long term (6-12 months): top 10")}</h2><p class="muted">${X("Score : rendement par unité de risque 35 %, faibles baisses 25 %, au-dessus de la moyenne 200 jours 15 %, P/E bas 15 %, dividende 10 %.", "Score: return per unit of risk 35%, small drawdowns 25%, above 200-day average 15%, lower P/E 15%, dividend 10%.")}</p>
  ${table(D.lists.long_term, [name, [X("Secteur", "Sector"), s => esc(s.s)], [X("1 an", "1 year"), s => `<span class="num ${cls(s.y1)}">${pct(s.y1)}</span>`, "r"], ["P/E", s => `<span class="num">${s.pe ? nf(s.pe, 0) : "—"}</span>`, "r"], [X("Dividende", "Dividend"), s => `<span class="num">${pct(s.dy, 1, false)}</span>`, "r"], [X("Pourquoi", "Why"), s => `<span class="facts">${esc(s.lf)}</span>`]])}</div>`;
  const riskCols = [name, [X("Volatilité", "Volatility"), s => `<span class="num">${pct(s.v, 0, false)}</span>`, "r"], [X("Bêta", "Beta"), s => `<span class="num">${nf(s.b)}</span>`, "r"], [X("1 an", "1 year"), s => `<span class="num ${cls(s.y1)}">${pct(s.y1)}</span>`, "r"], [X("Rendement / risque", "Return / risk"), s => `<span class="num">${nf(s.rr)}</span>`, "r"]];
  h += `<div class="grid g2e" style="margin-top:16px"><div class="card"><h2>${X("Profil moins risqué", "Lower-risk profile")}</h2><p class="muted">${X("Tiers le moins volatil, bêta < 1, classé par rendement ÷ volatilité.", "Calmest third, beta < 1, ranked by return ÷ volatility.")}</p>${table(D.lists.low_risk, riskCols)}</div>
  <div class="card"><h2>${X("Profil plus risqué", "Higher-risk profile")}</h2><p class="muted">${X("Tiers le plus volatil, classé par rendement ÷ volatilité. Fortes variations dans les deux sens.", "Most volatile third, ranked by return ÷ volatility. Large moves both ways.")}</p>${table(D.lists.high_risk, riskCols)}</div></div>`;
  h += `<div class="card" style="margin-top:16px"><h2>${X("Carte risque / rendement sur 12 mois", "Risk vs return over 12 months")}</h2><p class="muted">${X("Chaque point est une action ; l'idéal est en haut à gauche. Cliquez sur un point pour le détail.", "Each dot is a stock; the ideal is top-left. Click a dot for details.")}</p>${scatter(D.stocks.filter(s => s.v != null && s.y1 != null), new Set(D.lists.long_term))}</div>`;
  return h;
}

function viewRecord() {
  let h = "";
  const bt = D.backtest;
  if (bt) {
    const mt = bt.metrics, info = mt._info;
    h += `<div class="card"><h2>${X("Simulation (backtest) : le modèle aurait-il gagné ?", "Simulation (backtest): would the model have made money?")}</h2>
    <p class="muted">${X("Du", "From")} ${dateL(info.start)} ${X("au", "to")} ${dateL(info.end)}${X(" :", ":")} ${X("le modèle est réentraîné chaque mois sur le passé uniquement, achète ses 10 meilleures actions toutes les 5 séances et paie 0,10 % de frais par ordre.", "the model is retrained monthly on past data only, buys its top 10 stocks every 5 trading days and pays 0.10% per trade.")}</p>
    ${lineChart([{ name: X("Top 10 du modèle (après frais)", "Model top 10 (after costs)"), color: "var(--s1)", values: bt.strategy }, { name: X("Toutes les actions liquides", "All liquid stocks"), color: "var(--s3)", values: bt.equal_weight }, { name: "CAC 40", color: "var(--s2)", values: bt.cac40 }], bt.dates, { h: 300, fmt: v => nf(v, 1), label: "Backtest" })}
    <div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th></th><th class="r">Total</th><th class="r">${X("Par an", "Per year")}</th><th class="r">${X("Volatilité", "Volatility")}</th><th class="r">Sharpe</th><th class="r">${X("Pire baisse", "Worst drop")}</th></tr></thead><tbody>
    ${[["Model top 10 (after costs)", "Top 10 du modèle (après frais)"], ["All liquid stocks (equal weight)", "Toutes les actions liquides"], ["CAC 40", "CAC 40"]].map(([k, fr]) => { const r = mt[k]; return r ? `<tr><td class="name">${X(fr, k)}</td><td class="r num ${cls(r.total_return)}">${pct(r.total_return)}</td><td class="r num">${pct(r.annual_return)}</td><td class="r num">${pct(r.annual_volatility, 1, false)}</td><td class="r num">${nf(r.sharpe)}</td><td class="r num down">${pct(r.max_drawdown)}</td></tr>` : ""; }).join("")}</tbody></table></div>
    <div class="note"><b>${X("Lecture honnête :", "Honest reading:")}</b> ${X(`le top 10 n'a battu le CAC 40 que ${Math.round(info.beat_cac40_share * 100)} % des semaines ; le gain vient surtout de quelques grosses semaines et d'actions plus volatiles. Test court (~40 semaines) et biais du survivant (liste d'actions actuelle). Les résultats simulés ne garantissent rien.`, `the top 10 beat the CAC 40 in only ${Math.round(info.beat_cac40_share * 100)}% of weeks; most of the gain came from a few big weeks and from more volatile stocks. Short test (~40 weeks) and survivorship bias (today's stock list). Simulated results guarantee nothing.`)}</div></div>`;
  }
  const p = D.paper;
  h += `<div class="card" style="margin-top:16px"><h2>${X("Trading fictif en direct : 100 000 € virtuels", "Live paper trading: €100,000 of virtual money")}</h2>
  <p class="muted">${X("Le système suit ses propres signaux ACHAT avec des règles de sécurité : 10 % maximum par action, frais inclus, arrêt des achats après une perte de 3 % en un jour, bouton d'arrêt d'urgence. Aucun argent réel.", "The system follows its own BUY signals with safety rules: max 10% per stock, costs included, no new buying after a 3% daily loss, a kill switch. No real money.")}</p>`;
  if (p && p.dates.length) {
    const eq = p.equity, last = eq[eq.length - 1];
    h += `<div class="stats"><div class="stat"><div class="v">${nf(last, 0)} €</div><div class="l">${X("Valeur", "Value")}</div></div><div class="stat"><div class="v ${cls(last / 100000 - 1)}">${pct(last / 100000 - 1, 2)}</div><div class="l">${X("Depuis le", "Since")} ${dateL(p.start)}</div></div><div class="stat"><div class="v ${cls(p.cac40[p.cac40.length - 1] / p.cac40[0] - 1)}">${pct(p.cac40[p.cac40.length - 1] / p.cac40[0] - 1, 2)}</div><div class="l">${X("CAC 40, même période", "CAC 40, same period")}</div></div><div class="stat"><div class="v">${p.positions.length}</div><div class="l">${X("Positions", "Positions")}</div></div></div>`;
    if (p.dates.length > 1) h += lineChart([{ name: X("Portefeuille fictif", "Paper portfolio"), color: "var(--s1)", values: eq.map(v => v / eq[0] * 100) }, { name: "CAC 40", color: "var(--s2)", values: p.cac40.map(v => v / p.cac40[0] * 100) }], p.dates, { h: 240, fmt: v => nf(v, 1), label: "Paper trading" });
    else h += `<p class="muted">${X("La courbe apparaîtra après quelques jours.", "The curve appears after a few days.")}</p>`;
    h += `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>${X("Société", "Company")}</th><th class="r">${X("Acheté à", "Bought at")}</th><th class="r">${X("Cours", "Price")}</th><th class="r">${X("Résultat", "P/L")}</th><th>${X("Depuis", "Since")}</th></tr></thead><tbody>${p.positions.map(x => `<tr><td class="name">${esc(x.n)}</td><td class="r num">${nf(x.e)}</td><td class="r num">${nf(x.p)}</td><td class="r num ${cls(x.p / x.e - 1)}">${pct(x.p / x.e - 1)}</td><td>${dateL(x.since)}</td></tr>`).join("")}</tbody></table></div>`;
  } else h += `<p class="muted">${X("Démarre avec les prochaines exécutions quotidiennes.", "Starts with the next daily runs.")}</p>`;
  return h + `</div>`;
}

function viewAsk() {
  const qa = D.qa || [];
  if (!qa.length) return `<div class="card"><p class="muted">${X("Les réponses de l'IA apparaîtront après la prochaine exécution quotidienne.", "The AI's answers will appear after the next daily run.")}</p></div>`;
  const cur = qa[Math.min(S.q, qa.length - 1)];
  return `<p>${X("Chaque matin, l'IA (Mistral, sur mon Mac) répond à ces questions à partir des données du jour uniquement. Choisissez une question :", "Every morning the AI (Mistral, running on my Mac) answers these questions using only that day's data. Pick a question:")}</p>
  <div class="grid g2"><div class="card answer"><div class="who"><b>Mistral</b> · ${X("réponse du", "answer of")} ${esc(D.generated.slice(0, 10))}</div><p><b>${esc(X(cur.q_fr, cur.q_en))}</b></p><div class="md">${md(X(cur.a_fr, cur.a_en))}</div></div>
  <div class="qs">${qa.map((x, i) => `<button class="q" data-q="${i}" aria-pressed="${i === S.q}">${esc(X(x.q_fr, x.q_en))}</button>`).join("")}
  <p class="muted" style="font-size:12.5px;margin-top:6px">${X("La conversation libre avec l'IA fonctionne dans le tableau de bord privé, sur mon ordinateur : l'IA tourne en local, sans envoyer de données dans le cloud.", "Free conversation with the AI works in the private dashboard on my computer: the AI runs locally and sends no data to the cloud.")}</p></div></div>`;
}

function viewHow() {
  const steps = [
    ["1", X("Cours", "Prices"), X("771 actions cotées à Paris, filtrées sur les plus échangées (≥ 1 M€/jour)", "771 Paris-listed stocks, filtered to the most traded (≥ €1M/day)")],
    ["2", X("Actualité", "News"), X("Google Actualités France, bruit filtré (warrants, comptes rendus de séance)", "Google News France, noise filtered (warrants, price recaps)")],
    ["3", X("IA locale", "Local AI"), X("Mistral (via Ollama) note l'actualité de chaque société et le contexte mondial", "Mistral (via Ollama) scores each company's news and the world context")],
    ["4", X("Modèle", "Model"), X("Gradient boosting (scikit-learn) sur 10 indicateurs, horizon 5 jours", "Gradient boosting (scikit-learn) on 10 indicators, 5-day horizon")],
    ["5", "Backtest", X("Réentraînement mensuel, sans regarder le futur, frais inclus", "Monthly retraining, no look-ahead, costs included")],
    ["6", X("Trading fictif", "Paper trading"), X("100 000 € virtuels, règles de sécurité et arrêt d'urgence", "€100,000 virtual, safety rules and kill switch")],
    ["7", X("Rapport", "Report"), X("Rapport PowerPoint de 10 diapositives chaque matin", "10-slide PowerPoint report every morning")],
    ["8", X("Publication", "Publishing"), X("Export des résultats vers cette page, mise à jour quotidienne", "Results exported to this page, updated daily")]];
  const mod = D.model;
  return `<div class="card"><h2>${X("Le pipeline, chaque jour ouvré à 8 h", "The pipeline, every weekday at 8:00")}</h2><div class="steps">${steps.map(s => `<div class="step"><i>${s[0]}</i><b>${s[1]}</b><span>${s[2]}</span></div>`).join("")}</div></div>
  <div class="grid g2e" style="margin-top:16px"><div class="card"><h2>${X("Ce que j'ai mesuré honnêtement", "What I measured honestly")}</h2>
  ${mod ? `<p>${X("Test sur des mois jamais vus par le modèle", "Test on months the model never saw")} (${dateL(mod.test_start)} – ${dateL(mod.test_end)})${X(" :", ":")} ${X("précision", "accuracy")} <b class="num">${pct(mod.accuracy, 1, false)}</b> ${X("contre", "vs")} ${pct(mod.baseline, 1, false)} ${X("en répondant toujours pareil ; AUC", "by always giving the same answer; AUC")} <b class="num">${nf(mod.auc, 3)}</b> (${X("0,500 = hasard", "0.500 = chance")}).</p>` : ""}
  <p>${X("Avec les seuls indicateurs de prix, le marché est presque imprévisible : c'est ce que dit aussi la recherche. Le score d'actualité de l'IA est ajouté au modèle après 20 jours d'historique, pour mesurer s'il apporte un vrai plus.", "With price indicators alone, the market is close to unpredictable, which is also what research finds. The AI's news score is added to the model after 20 days of history, to measure whether it adds real value.")} (${D.sentiment_days} ${X("jour(s) à ce jour", "day(s) so far")}).</p>
  <p><a class="btn" href="Paris-Market-AI-latest-report.pptx" download>${X("Télécharger le rapport PowerPoint du jour", "Download today's PowerPoint report")}</a></p></div>
  <div class="card"><h2>${X("Technologies", "Tech stack")}</h2><div class="chips">${["Python", "pandas", "scikit-learn", "Ollama", "Mistral 7B", "yfinance", "Google News RSS", "Streamlit", "python-pptx", "launchd", "Netlify"].map(t => `<span class="chip">${t}</span>`).join("")}</div>
  <h3>${X("Choix de conception", "Design choices")}</h3><ul class="heads"><li>${X("IA locale : aucune donnée envoyée à un service cloud, aucun coût par requête.", "Local AI: no data sent to a cloud service, no cost per request.")}</li><li>${X("Les chiffres des rapports sont calculés par le code, jamais inventés par l'IA.", "Numbers in reports are computed by code, never written by the AI.")}</li><li>${X("Filtre de liquidité pour écarter les « penny stocks » qui faussent les classements.", "Liquidity filter to exclude penny stocks that distort rankings.")}</li><li>${X("Résultats présentés avec leurs limites.", "Results shown with their limits.")}</li></ul></div></div>`;
}

const VIEWS = { today: viewToday, signals: viewSignals, explore: viewExplore, ranks: viewRanks, record: viewRecord, ask: viewAsk, how: viewHow };

function render() {
  document.documentElement.lang = S.lang;
  document.getElementById("lang-fr").setAttribute("aria-pressed", S.lang === "fr");
  document.getElementById("lang-en").setAttribute("aria-pressed", S.lang === "en");
  document.getElementById("subtitle").textContent = X("L'IA qui lit la Bourse de Paris chaque matin", "The AI that reads the Paris stock market every morning");
  document.getElementById("back-home").href = "../../?lang=" + S.lang + "#projects";
  document.getElementById("footnote").textContent = X("Projet expérimental de Gaurav Sharma, à but de démonstration. Données de marché réelles (Yahoo Finance, Google Actualités) ; aucun conseil en investissement. Les performances passées ou simulées ne préjugent pas des performances futures.", "Experimental project by Gaurav Sharma, for demonstration. Real market data (Yahoo Finance, Google News); not investment advice. Past or simulated performance does not guarantee future results.");
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = TABS.map(t => `<button role="tab" data-tab="${t[0]}" aria-selected="${S.tab === t[0]}">${X(t[1], t[2])}</button>`).join("");
  if (!D) return;
  hideTip();
  document.getElementById("main").innerHTML = `<section class="panel" role="tabpanel">${VIEWS[S.tab]()}</section>`;
  bind();
}

function bind() {
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  on("f-sig", "change", e => { S.signal = e.target.value; render(); });
  on("f-sec", "change", e => { S.sector = e.target.value; render(); });
  on("f-q", "input", e => { S.search = e.target.value; const pos = e.target.selectionStart; render(); const f = document.getElementById("f-q"); f.focus(); f.setSelectionRange(pos, pos); });
  on("f-stock", "change", e => { S.stock = e.target.value; render(); });
  document.querySelectorAll("tr.click").forEach(tr => tr.addEventListener("click", () => { S.stock = tr.dataset.t; S.tab = "explore"; render(); scrollTo({ top: 0, behavior: "smooth" }); }));
  document.querySelectorAll(".q").forEach(b => b.addEventListener("click", () => { S.q = +b.dataset.q; render(); }));
}

document.getElementById("tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) { S.tab = b.dataset.tab; render(); } });
document.getElementById("lang-fr").addEventListener("click", () => setLang("fr"));
document.getElementById("lang-en").addEventListener("click", () => setLang("en"));
render();
fetch("data.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => { D = d; render(); })
  .catch(() => { document.getElementById("main").innerHTML = `<p class="loading">${X("Les données du jour ne sont pas disponibles pour le moment.", "Today's data is not available right now.")}</p>`; });
