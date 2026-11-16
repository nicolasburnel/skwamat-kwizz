/* Skwamat Kwizz — le jeu frère de Krapo Kwizz, pour les reptiles de Guyane.
   Application sans dépendance ni outil de compilation.
   - data/especes.csv : la liste des espèces et le contenu des fiches (c'est ce fichier qu'on modifie)
   - data/medias.json : photos de présentation (iNaturalist, licences libres) et localités pour les cartes
   - data/inat.json   : photos de terrain en Guyane (iNaturalist, qualité recherche) pour le quiz */
'use strict';

const CFG = {
  serieLength: 20,
  chronoSeconds: 60,
  lives: 3,
  basePoints: 100,
  hintCost: 20,
  storeKey: 'skwamatkwizz.v1',
  fauneGuyane: 'https://www.faune-guyane.fr',
  email: 'nicolasburnel2005@gmail.com',
  dailyLength: 10,
  revealSeconds: 10,
  revealBlur: 26,
};

/* ---------------- utilitaires ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/\b(cf|aff)\b\.?/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function sciHTML(name) { return esc(name).split(' ').map(t => /^(aff\.|cf\.|sp\.|\d+)$/.test(t) ? t : `<i class="sp">${t}</i>`).join(' '); }
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({length: n + 1}, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const seededShuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function todayStr(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const siteURL = () => location.origin + location.pathname;
async function shareText(text) {
  const full = text + '\n' + siteURL();
  if (navigator.share) { try { await navigator.share({ title: 'Skwamat Kwizz', text: full }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(full); toast('Copié ! Colle-le dans un message ou une story.'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = full; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copié ! Colle-le dans un message ou une story.'); } catch (e2) { toast('Impossible de copier automatiquement.'); } ta.remove(); }
}
const list = s => (s || '').split('|').map(x => x.trim()).filter(Boolean);
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

const ICON = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  name: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  snake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19c3 0 4-2 4-4s1-4 4-4 4 2 4 4-1 4 2 4 2-3 2-3"/><path d="M12 11c-2.5 0-4-1.5-4-3.5S9.5 4 12 4s4 1.5 4 3.5"/><path d="M14 5.5h.01"/></svg>',
};

/* ---------------- stockage local ---------------- */
const Store = {
  data: { m: {}, best: {}, last: null, totals: { games: 0, answers: 0, correct: 0 }, badges: {}, daily: {}, carnet: {}, rec: {} },
  load() { try { const d = JSON.parse(localStorage.getItem(CFG.storeKey)); if (d) this.data = Object.assign(this.data, d); } catch (e) {} ['badges', 'daily', 'carnet', 'rec', 'm', 'best'].forEach(k => { this.data[k] = this.data[k] || {}; }); },
  bump(k, v) { this.data.rec[k] = Math.max(this.data.rec[k] || 0, v); this.save(); },
  save() { try { localStorage.setItem(CFG.storeKey, JSON.stringify(this.data)); } catch (e) {} },
  mastery(id) { return (this.data.m[id] && this.data.m[id].p) || { n: 0, c: 0, b: 0 }; },
  record(id, ok) {
    const m = this.data.m[id] || (this.data.m[id] = {}); const s = m.p || (m.p = { n: 0, c: 0, b: 0 });
    s.n++; if (ok) { s.c++; s.b = Math.min(5, s.b + 1); } else s.b = Math.max(0, s.b - 2);
    this.data.totals.answers++; if (ok) this.data.totals.correct++;
    this.save();
  },
};

/* ---------------- données ---------------- */
const GROUPES = { serpent: 'Serpents', amphisbene: 'Amphisbènes', lezard: 'Lézards', tortue: 'Tortues', croco: 'Caïmans' };
const GROUPE_1 = { serpent: 'serpent', amphisbene: 'amphisbène', lezard: 'lézard', tortue: 'tortue', croco: 'caïman' };
let SP = [], BYID = {}, FAMS = [], MEDIA = {}, LOCAL = [];
async function loadData() {
  const [res, med, loc] = await Promise.all([fetch('data/especes.csv', { cache: 'no-cache' }), fetch('data/medias.json', { cache: 'no-cache' }).catch(() => null), fetch('data/photos.csv', { cache: 'no-cache' }).catch(() => null)]);
  const rows = parseCSV(await res.text());
  try { LOCAL = loc && loc.ok ? parseCSV(await loc.text()) : []; } catch (e) { LOCAL = []; }
  try { MEDIA = med && med.ok ? await med.json() : {}; } catch (e) { MEDIA = {}; }
  SP = rows.map(r => ({
    id: r.id, name: r.nom, vern: r.nom_vernaculaire, group: r.groupe, family: r.famille, old: r.ancien_nom, inat: r.inat_id,
    habitat: r.habitat, size: r.taille, ab: r.abondance || '', mo: list(r.moeurs.replace(/\s*\/\s*/g, '|')), act: r.activite || '', ui: r.uicn || '', pr: r.protection || '', dg: r.venin || '', exo: r.exotique === 'oui',
    crit: list(r.criteres), confNames: list(r.confusions), comment: r.commentaire, src: r.source,
  })).filter(s => s.id && s.name);
  SP.forEach(s => {
    const m = MEDIA[s.id] || {}, own = LOCAL.filter(l => l.id === s.id && l.fichier);
    const mine = own.map(l => ({ local: l.fichier, attr: l.auteur, lic: 'perm' }));
    s.noInat = own.some(l => l.remplace_inat === 'oui');
    s.photos = mine.concat(s.noInat ? [] : (m.ph || []).map(p => ({ id: p[0], ext: p[1], attr: p[2], lic: p[3], obs: p[4] })));
    s.pts = s.noInat ? [] : m.pt || [];
  });
  BYID = Object.fromEntries(SP.map(s => [s.id, s]));
  const byName = {}; SP.forEach(s => { byName[norm(s.name)] = s.id; if (s.old) list(s.old.replace(/\s*\/\s*/g, '|')).forEach(o => byName[norm(o)] = s.id); });
  SP.forEach(s => { s.genus = s.name.split(' ')[0]; s.conf = s.confNames.map(n => byName[norm(n.replace(/\(.*?\)/g, ''))]).filter(id => id && id !== s.id); });
  FAMS = [...new Set(SP.map(s => s.family))].sort((a, b) => a.localeCompare(b));
}
const LIC = { perm: 'avec son autorisation', 'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-nc': 'CC BY-NC', 'cc-by-sa': 'CC BY-SA', 'cc-by-nc-sa': 'CC BY-NC-SA' };
const imgURL = (p, size = 'medium') => p.local ? `assets/photos/${['square', 'small'].includes(size) ? p.local.replace(/\.jpg$/, '-mini.jpg') : p.local}` : `https://inaturalist-open-data.s3.amazonaws.com/photos/${p.id}/${size}.${p.ext}`;
const hasPhoto = s => s.photos.length > 0;
const credit = p => p.local ? `© ${p.attr}` : `© ${p.attr} · ${LIC[p.lic] || p.lic}`;
const photoLink = p => p.local ? '' : p.obs ? 'https://www.inaturalist.org/observations/' + p.obs : 'https://www.inaturalist.org/photos/' + p.id;
const creditTxt = p => credit(p) + (p.local ? '' : ' · iNaturalist');

/* ---------------- statuts et pictogrammes ---------------- */
const STATUTS = {
  ab: { titre: 'Abondance', v: { TC: ['Très commun', '#1679c5'], C: ['Commun', '#22a35a'], PF: ['Peu fréquent', '#ee7a1b'], R: ['Rare', '#b3242c'], TR: ['Très rare', '#9b1d5c'] } },
  mo: { titre: 'Mœurs', v: { T: ['Terrestre', '#6b6f6d'], A: ['Arboricole', '#6b6f6d'], Aq: ['Aquatique', '#6b6f6d'], F: ['Fouisseur', '#6b6f6d'] } },
  act: { titre: 'Activité', v: { J: ['Diurne', '#d99a00'], N: ['Nocturne', '#3b4a8c'], JN: ['Diurne et nocturne', '#6a5a9c'] } },
  ui: { titre: 'Liste rouge UICN (Guyane)', v: { CR: ['En danger critique', '#d81e05'], EN: ['En danger', '#fc7f3f'], VU: ['Vulnérable', '#f9e814'], NT: ['Quasi menacée', '#cce226'], LC: ['Préoccupation mineure', '#60c659'], DD: ['Données insuffisantes', '#d1d1c6'], NA: ['Non applicable', '#ffffff'], NE: ['Non évaluée', '#ffffff'] } },
  pr: { titre: 'Protection', v: { P: ['Protégée', '#5aae2e'], H: ['Protégée avec son habitat', '#0b7a2a'] } },
  dg: { titre: 'Venin', v: { N: ['Non venimeux', '#8a8f8c'], NM: ['Venimeux, non mordeur', '#1f8f2e'], L: ['Venimeux, venin léger', '#ee7a1b'], F: ['Venimeux, venin fort', '#e0230c'] } },
};
const MOEURS_ICON = {
  T: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19h18"/><path d="M6 19c0-2 1-3.5 3-4M12 19c0-3 1.2-5 3.5-6M18 19c0-1.6-.6-2.8-1.6-3.6"/><circle cx="9.5" cy="9" r="2.2"/></svg>',
  A: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-7"/><path d="M12 14c-4 0-6.5-2.4-6.5-5.5S8.4 3 12 3s6.5 2.4 6.5 5.5S16 14 12 14z"/><path d="M12 11l-2.5-2.5M12 9.5l2.5-2"/></svg>',
  Aq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c3 3.6 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5.4 5-9z"/><path d="M3 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/></svg>',
  F: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h18"/><path d="M6 8c0 4 2 6 5 6s4 2 4 4"/><circle cx="15" cy="18.5" r="1"/></svg>',
};
const SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.4-3.1 8-7.5 9.5-4.4-1.5-7.5-5.1-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.6"/></svg>';
const FANGS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6c2 2 5 3 8 3s6-1 8-3"/><path d="M8 8.5l1.5 8 1.5-7.5M16 8.5l-1.5 8-1.5-7.5"/></svg>';
function statutChip(kind, code, withLabel) {
  const d = STATUTS[kind].v[code]; if (!d) return '';
  const [label, col] = d, light = ['VU', 'NT', 'DD', 'NA', 'NE'].includes(code);
  const inner = kind === 'mo' ? MOEURS_ICON[code] : kind === 'pr' ? SHIELD : kind === 'dg' ? FANGS : kind === 'act' ? (code === 'J' ? ICON.sun : code === 'N' ? ICON.moon : `<i class="jn">${ICON.sun}${ICON.moon}</i>`) : `<b>${code}</b>`;
  return `<span class="st st-${kind}${light ? ' light' : ''}${['NA', 'NE'].includes(code) ? ' outline' : ''}" style="--c:${col}" title="${esc(STATUTS[kind].titre)} : ${esc(label)}">${inner}${withLabel ? `<span>${esc(label)}</span>` : ''}</span>`;
}
function statutsHTML(s) {
  const cells = [];
  if (s.dg) cells.push(['dg', statutChip('dg', s.dg, true)]);
  if (s.ab) cells.push(['ab', statutChip('ab', s.ab, true)]);
  if (s.mo.length) cells.push(['mo', `<span class="st-multi">${s.mo.map(m => statutChip('mo', m, true)).join('')}</span>`]);
  if (s.act) cells.push(['act', statutChip('act', s.act, true)]);
  if (s.exo) cells.push(['ui', '<span class="st st-exo" style="--c:#7b4a1f"><b>EXO</b><span>Espèce introduite</span></span>']);
  else if (s.ui) cells.push(['ui', statutChip('ui', s.ui, true)]);
  cells.push(['pr', s.pr ? statutChip('pr', s.pr, true) : '<span class="st st-none"><span>Non protégée</span></span>']);
  return `<div class="statuts">${cells.map(([k, h]) => `<div class="stt"><span class="stt-k">${STATUTS[k].titre}</span>${h}</div>`).join('')}</div>`;
}
function tagChips(s) { return `${s.dg && s.dg !== 'N' ? statutChip('dg', s.dg) : ''}${s.mo[0] ? statutChip('mo', s.mo[0]) : ''}${s.exo ? '<span class="st light" style="--c:#e9d7c3" title="Espèce introduite"><b>EXO</b></span>' : s.ui ? statutChip('ui', s.ui) : ''}${s.pr ? statutChip('pr', s.pr) : ''}`; }

/* ---------------- carte de répartition (localités iNaturalist) ---------------- */
const GF = { x0: -54.61435, y1: 5.74510, S: 100, pad: 6, W: 309, H: 375, d: 'M6.0 347.9 L7.4 345.9 L8.9 345.7 L12.5 346.8 L14.3 346.4 L15.4 345.6 L18.2 338.8 L19.0 338.1 L20.0 337.6 L22.2 337.6 L24.0 337.5 L25.1 337.0 L29.8 332.1 L31.6 329.7 L35.5 319.9 L38.8 312.6 L46.3 302.9 L47.0 301.3 L48.5 296.6 L49.2 295.9 L50.3 295.3 L49.2 294.1 L48.5 293.4 L48.5 292.7 L48.5 291.7 L48.8 290.5 L50.3 288.5 L50.3 288.0 L51.0 285.0 L51.0 283.6 L50.6 283.4 L49.6 282.1 L48.8 280.7 L49.9 280.1 L50.6 279.4 L50.3 278.0 L49.6 275.7 L49.6 275.3 L48.5 274.7 L48.5 274.0 L49.2 273.6 L49.6 273.5 L49.6 273.3 L49.9 271.1 L49.6 268.9 L48.5 267.4 L46.3 267.7 L48.5 262.7 L49.9 260.5 L53.5 256.1 L56.0 252.0 L59.3 249.7 L59.3 249.5 L60.4 247.8 L61.1 245.8 L61.4 244.1 L61.8 242.7 L65.4 239.0 L67.2 235.0 L66.8 227.4 L67.6 223.2 L68.3 221.0 L68.6 219.4 L67.9 218.1 L66.5 216.7 L65.8 216.4 L64.7 216.6 L63.6 216.9 L62.5 217.1 L62.5 216.4 L60.0 212.9 L57.8 205.8 L57.1 204.7 L55.0 201.7 L53.9 200.9 L50.3 199.8 L49.2 199.3 L48.8 199.0 L47.8 197.8 L46.7 195.8 L46.0 194.6 L45.6 194.8 L45.2 193.9 L43.4 192.9 L40.9 188.2 L40.2 187.5 L38.8 186.5 L38.0 185.5 L37.0 182.1 L36.2 181.1 L33.0 178.1 L31.9 176.4 L31.9 173.8 L32.3 172.3 L33.7 168.8 L34.1 167.3 L33.7 165.2 L32.6 164.4 L29.0 163.5 L28.0 162.7 L26.9 161.3 L26.5 159.7 L27.6 157.8 L28.0 156.1 L28.0 153.6 L27.2 149.2 L24.0 142.9 L22.2 132.1 L22.6 129.6 L24.7 125.9 L25.1 124.2 L25.1 120.1 L25.1 119.0 L23.6 115.6 L23.6 113.2 L24.0 111.2 L24.0 109.5 L22.6 107.7 L21.8 107.1 L20.8 106.8 L20.0 106.3 L19.7 105.0 L19.7 92.6 L19.0 91.3 L18.6 90.3 L19.3 89.2 L21.8 87.4 L22.2 86.9 L22.6 85.4 L21.8 81.3 L21.8 79.6 L22.6 78.1 L24.4 75.2 L29.8 69.0 L30.1 68.5 L30.5 67.3 L30.8 66.6 L32.3 65.6 L33.0 64.9 L34.1 60.9 L35.5 59.2 L36.2 58.0 L40.6 53.6 L48.5 47.9 L50.3 45.7 L53.5 44.5 L56.8 42.5 L59.3 39.8 L61.4 36.9 L64.0 30.0 L66.1 26.4 L66.8 24.7 L68.3 14.4 L70.1 11.2 L71.9 7.9 L73.0 6.0 L74.0 6.0 L78.4 6.7 L81.6 7.2 L83.8 8.2 L85.9 8.9 L86.6 9.0 L86.3 8.5 L84.1 7.4 L84.8 7.2 L86.3 7.4 L89.9 9.0 L92.4 10.9 L94.2 12.1 L96.0 13.1 L97.8 14.1 L109.3 18.7 L112.6 20.5 L115.8 22.4 L118.0 23.2 L119.4 23.6 L122.6 24.4 L126.6 24.4 L133.8 26.1 L137.0 26.9 L139.6 26.8 L141.0 27.4 L142.8 29.5 L144.6 31.0 L146.8 30.3 L146.8 29.1 L145.0 28.8 L143.2 27.6 L141.0 25.9 L139.2 25.4 L138.5 25.6 L138.1 25.1 L139.2 24.4 L140.3 24.4 L142.4 25.6 L145.3 26.9 L149.6 28.1 L151.8 29.1 L154.3 30.0 L159.4 33.4 L163.0 34.5 L166.9 35.4 L167.3 34.7 L168.0 34.7 L170.9 36.1 L177.7 39.9 L184.6 46.4 L189.2 48.9 L192.1 53.8 L199.3 59.5 L213.4 72.5 L214.4 73.2 L214.8 73.4 L214.8 74.0 L214.8 74.7 L214.8 75.2 L215.2 75.2 L216.6 75.1 L217.0 75.2 L219.5 76.6 L227.0 83.2 L229.6 86.9 L228.5 90.9 L230.3 89.8 L232.8 86.2 L235.0 85.5 L237.5 86.0 L239.6 87.4 L241.1 89.2 L241.4 91.3 L239.6 94.7 L236.0 99.4 L233.2 104.4 L233.5 108.0 L233.9 108.0 L234.2 106.6 L235.0 105.6 L235.7 105.0 L236.0 104.3 L236.4 101.7 L237.5 99.2 L238.9 97.5 L243.2 94.8 L244.3 93.0 L246.1 93.8 L248.3 95.5 L249.7 97.5 L250.4 99.5 L251.5 100.9 L258.0 104.6 L261.2 107.5 L264.8 111.2 L267.7 115.3 L268.8 119.3 L269.5 123.4 L271.7 131.1 L272.4 135.2 L271.3 139.7 L268.4 141.9 L265.6 143.8 L262.7 147.2 L268.8 145.3 L272.4 143.5 L273.8 141.3 L273.8 140.2 L274.9 137.5 L275.3 135.9 L274.2 121.5 L274.9 118.0 L276.4 114.9 L277.8 114.1 L279.2 113.7 L281.0 114.1 L282.5 114.9 L287.2 119.3 L288.2 120.3 L287.5 121.5 L290.0 125.4 L290.8 127.6 L291.1 129.9 L291.5 132.8 L292.6 134.8 L294.4 134.8 L294.0 135.7 L293.6 136.5 L293.3 136.9 L292.9 136.9 L292.9 137.5 L293.6 139.2 L294.4 140.6 L296.2 140.9 L297.6 141.3 L298.3 141.9 L298.0 143.5 L297.2 144.1 L296.2 145.1 L295.8 147.2 L295.8 148.9 L296.5 150.5 L300.5 156.3 L301.9 158.8 L302.3 161.5 L302.6 165.2 L302.3 168.3 L300.1 174.4 L299.0 176.5 L291.5 180.3 L289.0 182.5 L287.5 185.5 L286.8 188.7 L285.7 191.4 L283.9 193.8 L277.4 200.9 L274.2 202.4 L273.5 203.2 L273.5 204.1 L273.5 206.3 L273.5 207.1 L272.4 208.0 L271.7 208.1 L271.0 208.0 L270.2 208.3 L268.4 210.0 L267.7 212.0 L267.0 216.2 L266.3 218.6 L262.0 224.8 L260.9 227.5 L260.2 228.9 L258.0 229.9 L258.0 230.6 L258.4 231.4 L258.0 232.4 L244.7 254.6 L243.6 255.6 L242.2 256.2 L241.4 256.2 L240.7 256.1 L239.6 256.2 L237.5 257.9 L235.3 262.7 L231.7 265.4 L231.4 267.4 L231.4 269.6 L232.4 274.0 L232.1 274.7 L225.6 286.3 L225.2 287.8 L225.6 289.0 L226.3 290.0 L226.7 290.7 L225.2 291.5 L224.2 291.9 L223.4 292.4 L222.7 293.1 L222.0 294.1 L214.1 311.5 L213.4 314.5 L213.0 315.3 L212.3 315.9 L210.1 316.7 L209.8 317.2 L210.1 318.2 L211.9 320.8 L212.3 321.9 L211.9 323.1 L211.6 324.0 L211.2 324.6 L210.5 325.5 L208.3 330.0 L205.4 334.1 L201.8 337.5 L199.7 341.5 L198.2 343.2 L196.8 344.6 L185.6 351.3 L181.3 353.0 L179.5 354.5 L178.1 356.9 L177.4 359.1 L176.6 360.1 L175.6 360.9 L175.2 361.1 L174.1 360.9 L173.4 360.9 L173.0 361.4 L172.0 362.6 L171.6 363.0 L169.4 363.1 L165.5 362.3 L161.2 362.0 L158.3 359.3 L156.1 358.6 L154.3 358.6 L142.1 360.9 L140.6 360.9 L139.6 360.1 L140.3 358.6 L142.1 357.1 L143.9 356.4 L143.9 355.4 L137.8 350.1 L135.2 346.6 L134.5 345.9 L133.1 345.6 L132.7 345.7 L132.4 346.4 L129.5 349.8 L128.4 350.6 L124.8 352.0 L121.2 354.7 L120.1 355.0 L116.2 355.4 L114.4 355.9 L112.6 355.4 L109.7 353.5 L107.9 353.2 L104.6 353.0 L102.8 352.7 L96.0 349.8 L93.1 349.6 L92.4 349.3 L92.8 348.6 L93.5 346.6 L93.8 345.6 L92.8 344.1 L91.0 343.7 L89.2 344.1 L87.4 345.1 L86.3 346.4 L85.2 348.1 L84.5 349.5 L83.0 349.8 L80.9 350.0 L79.4 351.5 L78.7 353.2 L77.3 354.0 L75.1 353.8 L74.0 353.5 L73.7 354.0 L73.7 356.5 L73.0 358.2 L71.2 359.6 L66.8 361.1 L66.1 361.4 L65.4 362.5 L64.7 362.6 L64.0 362.5 L63.2 361.8 L62.5 361.6 L60.4 361.6 L59.6 362.1 L58.9 363.6 L57.5 367.7 L56.4 369.0 L53.9 369.4 L52.8 369.0 L51.7 368.4 L48.5 364.3 L48.1 364.1 L46.3 364.3 L44.5 364.8 L42.7 365.3 L40.9 365.7 L35.9 365.0 L35.2 364.8 L34.1 364.1 L31.2 361.6 L30.1 360.9 L29.4 360.8 L28.7 360.9 L27.2 360.8 L26.2 360.6 L24.7 359.8 L24.0 359.6 L19.7 359.1 L18.2 358.2 L16.4 356.2 L12.8 353.7 L12.5 352.5 L14.6 352.3 L12.8 350.5 L11.0 349.0 L8.5 348.1 L6.0 347.9Z' };
function mapSVG(s, cls = 'gfmap') {
  const px = ([lon, lat]) => [((lon - GF.x0) * GF.S + GF.pad).toFixed(1), ((GF.y1 - lat) * GF.S + GF.pad).toFixed(1)];
  const dots = s.pts.map(p => { const [x, y] = px(p); return `<circle cx="${x}" cy="${y}" r="5.5"/>`; }).join('');
  return `<svg class="${cls}" viewBox="0 0 ${GF.W} ${GF.H}" role="img" aria-label="Localités connues de ${esc(s.name)} en Guyane"><path class="land" d="${GF.d}"/><g class="dots">${dots}</g></svg>`;
}

/* ---------------- réglages ---------------- */
const DEFAULTS = { format: 'noms', level: 'inter', rythme: 'serie', groups: [], fams: [], revision: true, vern: true, reveal: false, terrain: true };
let S = {};
function loadSettings() { S = Object.assign({}, DEFAULTS, Store.data.last || {}); S.fams = (S.fams || []).filter(f => FAMS.includes(f)); S.groups = (S.groups || []).filter(g => GROUPES[g]); if (!['noms', 'photos'].includes(S.format)) S.format = 'noms'; }
function saveSettings() { Store.data.last = S; Store.save(); }
const LEVELS = {
  decouverte: ['Découverte', 'Propositions de groupes et de familles différents'],
  inter: ['Intermédiaire', 'Propositions de la même famille'],
  expert: ['Expert', 'Espèces confondables (liste des guides), puis même genre'],
  maitre: ['Maître', 'Aucune proposition : écris le nom exact'],
};
const FORMATS = { noms: ['Photo → nom', 'Une photo : trouve son nom parmi 4'], photos: ['Nom → photo', 'Un nom : trouve la bonne photo parmi 4'] };
const RYTHMES = { serie: ['Série', `${CFG.serieLength} questions`], chrono: ['Chrono', `${CFG.chronoSeconds} secondes`], survie: ['Survie', `${CFG.lives} vies`] };
const isFree = (c = S) => c.level === 'maitre';
function poolFor(cfg = S) { return SP.filter(s => hasPhoto(s) && (!cfg.groups.length || cfg.groups.includes(s.group)) && (!cfg.fams.length || cfg.fams.includes(s.family))); }
function configKey(cfg = S) { return ['photo', isFree(cfg) ? 'saisie' : cfg.format, cfg.level, cfg.rythme, cfg.groups.length ? cfg.groups.slice().sort().join('+') : 'tous', cfg.fams.length ? cfg.fams.slice().sort().join('+') : 'toutes'].join('/'); }
function configLabel(key) {
  if (key === 'daily') return 'Défi du jour';
  const [, format, level, rythme, groups, fams] = key.split('/');
  const parts = [];
  if (format !== 'saisie' && FORMATS[format]) parts.push(FORMATS[format][0]);
  parts.push(LEVELS[level] ? LEVELS[level][0] : level, RYTHMES[rythme] ? RYTHMES[rythme][0] : rythme);
  parts.push(groups === 'tous' ? 'tous les reptiles' : groups.split('+').map(g => GROUPES[g] || g).join(', '));
  if (fams && fams !== 'toutes') parts.push(fams.split('+').join(', '));
  return parts.join(' · ');
}

/* ---------------- routeur ---------------- */
let Game = null;
function route() {
  const h = location.hash.replace(/^#/, '') || 'jouer';
  const [view, arg] = h.split('/');
  if (Game && view !== 'partie') endGame(true);
  const navKey = { apropos: 'progres', confidentialite: 'progres' }[view] || view;
  document.body.classList.toggle('in-game', view === 'partie');
  $$('.nav a').forEach(a => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  closeSheet();
  if (view === 'especes') viewSpecies(arg);
  else if (view === 'carnet') viewCarnet();
  else if (view === 'progres') viewProgress();
  else if (view === 'apropos') viewAbout();
  else if (view === 'confidentialite') viewPrivacy();
  else if (view === 'partie' && Game) {/* déjà affiché */}
  else viewHome();
  window.scrollTo(0, 0);
}

/* ---------------- accueil / réglages ---------------- */
function segHTML(id, opts, cur, cls = '') {
  return `<div class="seg ${cls}" id="${id}">` + Object.entries(opts).map(([k, [t, d]]) => `<button type="button" data-v="${k}" aria-pressed="${k === cur}">${t}${d && cls.includes('withsub') ? `<small>${d}</small>` : ''}</button>`).join('') + '</div>';
}
function viewHome() {
  const app = $('#app');
  const n = poolFor().length, best = Store.data.best[configKey()];
  const light = matchMedia('(prefers-color-scheme: light)').matches;
  const famsShown = FAMS.filter(f => SP.some(s => s.family === f && hasPhoto(s) && (!S.groups.length || S.groups.includes(s.group))));
  app.innerHTML = `
  <section class="hero">
    <h1 style="margin:0"><img class="hero-logo" src="assets/logo-sk-${light ? 'noir' : 'blanc'}.png" alt="Skwamat Kwizz"></h1>
    <p class="hero-tag">Reptiles de Guyane</p>
    <p class="lede">Serpents, lézards, amphisbènes, tortues et caïmans : apprends à les reconnaître sur photo, avant de les croiser en forêt.</p>
  </section>
  ${dailyCardHTML()}
  <div class="modes" role="group" aria-label="Type de jeu">
    <button type="button" class="mode" data-fmt="noms" aria-pressed="${S.format === 'noms' && !isFree()}"><span class="ico">${ICON.eye}</span><b>Photo</b><span>Une photo de terrain, à toi de nommer l'espèce.</span></button>
    <button type="button" class="mode alt" data-fmt="photos" aria-pressed="${S.format === 'photos' && !isFree()}"><span class="ico">${ICON.name}</span><b>Nom → photo</b><span>Un nom, à toi de trouver la bonne photo parmi 4.</span></button>
  </div>
  <section class="setup" aria-label="Réglages de la partie">
    <div class="opt"><span class="lbl">Difficulté</span>${segHTML('seg-level', S.format === 'photos' ? { decouverte: LEVELS.decouverte, inter: LEVELS.inter, expert: LEVELS.expert } : LEVELS, S.level, S.format === 'photos' ? '' : 'wrap4')}<p class="desc">${LEVELS[S.level][1]}.</p></div>
    <div class="opt"><span class="lbl">Rythme</span>${segHTML('seg-rythme', RYTHMES, S.rythme, 'withsub')}</div>
    <div class="opt"><span class="lbl">Groupes</span><div class="chips" id="grpchips">
      <button type="button" class="chip" data-g="" aria-pressed="${!S.groups.length}">Tous</button>
      ${Object.entries(GROUPES).map(([g, t]) => { const c = SP.filter(s => s.group === g && hasPhoto(s)).length; return c ? `<button type="button" class="chip" data-g="${g}" aria-pressed="${S.groups.includes(g)}">${t}<span class="n">${c}</span></button>` : ''; }).join('')}</div></div>
    <div class="opt"><details class="fams"${S.fams.length ? ' open' : ''}><summary><span class="lbl" style="font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Familles</span><span class="muted" style="font-weight:600;font-size:.9rem;margin-left:auto">${S.fams.length ? S.fams.length + ' sélectionnée(s)' : 'Toutes'}</span></summary>
      <div class="chips" id="famchips">${famsShown.map(f => { const c = poolFor({ ...S, fams: [f] }).length; return c ? `<button type="button" class="chip" data-f="${esc(f)}" aria-pressed="${S.fams.includes(f)}">${esc(f)}<span class="n">${c}</span></button>` : ''; }).join('')}</div>
      ${S.fams.length ? '<div style="margin-top:8px"><button type="button" class="btn ghost" id="famreset">Toutes les familles</button></div>' : ''}
    </details></div>
    <div class="toggles">
      <label class="toggle"><span>Photos de terrain<small>Photos variées d'iNaturalist prises en Guyane (qualité recherche)</small></span><input type="checkbox" class="switch" id="t-terrain"${S.terrain ? ' checked' : ''}></label>
      ${S.format === 'noms' ? `<label class="toggle"><span>Photo qui se dévoile<small>La photo est floue puis devient nette : plus tu réponds tôt, plus tu gagnes de points</small></span><input type="checkbox" class="switch" id="t-reveal"${S.reveal ? ' checked' : ''}></label>` : ''}
      ${!isFree() ? `<label class="toggle"><span>Noms vernaculaires<small>Afficher « Boa émeraude » sous le nom scientifique</small></span><input type="checkbox" class="switch" id="t-vern"${S.vern ? ' checked' : ''}></label>` : ''}
      <label class="toggle"><span>Révision ciblée<small>Les espèces que tu rates reviennent plus souvent</small></span><input type="checkbox" class="switch" id="t-rev"${S.revision ? ' checked' : ''}></label>
    </div>
    <div class="start"><div><div class="count">${n} espèce${n > 1 ? 's' : ''} dans cette partie</div>${best ? `<div class="best">Record : ${best} pts</div>` : ''}</div>
      <button type="button" class="btn primary big" id="go"${n < 4 && !isFree() ? ' disabled' : ''}>Jouer</button></div>
    ${n < 4 && !isFree() ? '<p class="desc">Ajoute un groupe ou une famille : il faut au moins 4 espèces pour les propositions.</p>' : ''}
  </section>`;
  $$('.mode', app).forEach(b => b.onclick = () => { S.format = b.dataset.fmt; if (S.format === 'photos' && S.level === 'maitre') S.level = 'expert'; saveSettings(); viewHome(); });
  bindDailyCard();
  const seg = (id, key) => { const el = $('#' + id); if (el) el.onclick = e => { const b = e.target.closest('button'); if (!b) return; S[key] = b.dataset.v; saveSettings(); viewHome(); }; };
  seg('seg-level', 'level'); seg('seg-rythme', 'rythme');
  $('#grpchips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; const g = b.dataset.g; S.groups = !g ? [] : S.groups.includes(g) ? S.groups.filter(x => x !== g) : [...S.groups, g]; S.fams = S.fams.filter(f => SP.some(s => s.family === f && (!S.groups.length || S.groups.includes(s.group)))); saveSettings(); viewHome(); };
  $('#famchips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; const f = b.dataset.f; S.fams = S.fams.includes(f) ? S.fams.filter(x => x !== f) : [...S.fams, f]; saveSettings(); viewHome(); $('details.fams').open = true; };
  const fr = $('#famreset'); if (fr) fr.onclick = () => { S.fams = []; saveSettings(); viewHome(); };
  const tg = (id, key) => { const el = $('#' + id); if (el) el.onchange = () => { S[key] = el.checked; saveSettings(); }; };
  tg('t-vern', 'vern'); tg('t-rev', 'revision'); tg('t-reveal', 'reveal'); tg('t-terrain', 'terrain');
  $('#go').onclick = () => startGame();
}

/* ---------------- photos de terrain (iNaturalist, Guyane) ---------------- */
const INAT = {
  data: null, loading: null, imgs: {},
  load() {
    if (this.data) return Promise.resolve(this.data);
    if (!this.loading) this.loading = fetch('data/inat.json').then(r => (r.ok ? r.json() : {})).then(d => (this.data = d)).catch(() => (this.data = {}));
    return this.loading;
  },
  list(s) { return s.noInat ? [] : (this.data && this.data[s.id]) || []; },
  toPhoto: q => ({ id: q[0], ext: q[1], obs: q[2], attr: q[3], lic: q[4] }),
  pick(s, cfg, avoid) { // photo de terrain si possible, sinon photo de présentation
    const L = cfg.terrain !== false ? this.list(s).map(this.toPhoto) : [];
    const src = L.length ? L : s.photos; if (!src.length) return null;
    const pool = src.filter(p => p.id !== avoid);
    return (pool.length ? pool : src)[Math.random() * (pool.length || src.length) | 0];
  },
  preload(url) {
    if (!this.imgs[url]) this.imgs[url] = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(true); im.onerror = () => res(false); im.src = url; setTimeout(() => res(false), 9000); });
    return this.imgs[url];
  },
};
function planFor(g, idx) { // photo choisie (et préchargée) pour la question idx
  g.plan = g.plan || {};
  const id = g.fixed ? g.fixed[idx] && g.fixed[idx].id : g.deck && g.deck[idx];
  if (!id) return null;
  const old = g.plan[idx]; if (old && old.sid === id) return old;
  const p = INAT.pick(BYID[id], g.cfg); if (!p) return null;
  const plan = { ...p, sid: id }; g.plan[idx] = plan; INAT.preload(imgURL(plan)); return plan;
}
function preloadAhead(g) { for (let k = 1; k <= 3; k++) planFor(g, g.idx + k); }

/* ---------------- moteur de jeu ---------------- */
function weight(s, cfg) { if (!cfg.revision) return 1; return 6 - Store.mastery(s.id).b; }
function weightedPick(pool, avoid, cfg) {
  const cand = pool.filter(s => !avoid.has(s.id)); const arr = cand.length ? cand : pool;
  let tot = arr.reduce((a, s) => a + weight(s, cfg), 0), r = Math.random() * tot;
  for (const s of arr) { r -= weight(s, cfg); if (r <= 0) return s; } return arr[arr.length - 1];
}
function buildDeck(pool, n, cfg) {
  const deck = [], used = new Set(); n = Math.min(n, pool.length);
  while (deck.length < n) { const s = weightedPick(pool, used, cfg); used.add(s.id); deck.push(s.id); }
  return deck;
}
function distractorOrder(cur, others, level) {
  if (level === 'decouverte') return [others.filter(s => s.group !== cur.group), others.filter(s => s.group === cur.group && s.family !== cur.family), others.filter(s => s.family === cur.family)];
  if (level === 'inter') return [others.filter(s => s.family === cur.family), others.filter(s => s.group === cur.group && s.family !== cur.family), others.filter(s => s.group !== cur.group)];
  return [others.filter(s => cur.conf.includes(s.id)), others.filter(s => s.genus === cur.genus && !cur.conf.includes(s.id)),
    others.filter(s => s.family === cur.family && s.genus !== cur.genus && !cur.conf.includes(s.id)), others.filter(s => s.group === cur.group && s.family !== cur.family), others.filter(s => s.group !== cur.group)];
}
function distractors(cur, pool, level) {
  const others = pool.filter(s => s.id !== cur.id);
  const out = []; for (const g of distractorOrder(cur, others, level)) for (const s of shuffle(g.slice())) { if (out.length >= 3) break; if (!out.includes(s)) out.push(s); }
  return shuffle([cur, ...out]);
}
function newGame(cfg, extra) {
  return Object.assign({ cfg, idx: -1, recent: [], score: 0, streak: 0, bestStreak: 0, correct: 0, answered: 0, lives: CFG.lives, misses: [], done: false,
    t0: 0, timer: 0, cur: null, choices: [], hints: 0, locked: false, revisit: false, grid: [], plan: {} }, extra);
}
function enterGame() {
  Store.data.totals.games++; Store.save();
  if (location.hash !== '#partie') history.pushState(null, '', '#partie');
  document.body.classList.add('in-game'); $$('.nav a').forEach(a => a.removeAttribute('aria-current'));
}
function startGame(onlyIds) {
  const full = poolFor();
  const pool = onlyIds ? full.filter(s => onlyIds.includes(s.id)) : full;
  if (!pool.length) return toast('Aucune espèce ne correspond à ces réglages.');
  const cfg = { ...S };
  Game = newGame(cfg, { key: configKey(), pool, distractPool: SP.filter(hasPhoto), deck: S.rythme === 'serie' ? buildDeck(pool, onlyIds ? pool.length : CFG.serieLength, cfg) : [], revisit: !!onlyIds });
  enterGame();
  for (let k = 0; k < 3; k++) planFor(Game, k);
  renderGameShell();
  if (S.rythme === 'chrono') { Game.t0 = performance.now(); Game.timer = setInterval(tick, 200); }
  nextQuestion();
}
function tick() {
  if (!Game) return;
  const left = Math.max(0, CFG.chronoSeconds - (performance.now() - Game.t0) / 1000);
  const bar = $('#gbar'); if (bar) bar.style.width = (left / CFG.chronoSeconds * 100) + '%';
  const m = $('#gleft'); if (m) m.textContent = Math.ceil(left) + ' s';
  if (left <= 0) finish();
}
function renderGameShell() {
  const g = Game;
  $('#app').innerHTML = `<section class="game">
    <div class="ghead">
      <button class="quit" type="button" id="quit" aria-label="Quitter la partie">${ICON.close}</button>
      <div class="gprog">
        <div class="bar${g.cfg.rythme === 'chrono' ? ' timer' : ''}"><div id="gbar" style="width:${g.cfg.rythme === 'chrono' ? 100 : 0}%"></div></div>
        <div class="meta"><span id="gcount"></span><span id="gleft"></span></div>
      </div>
      <div><div class="score" id="gscore">0</div><div class="combo" id="gcombo"></div></div>
    </div>
    <div class="stage" id="stage"></div>
    <div id="answers"></div>
    <div id="fb"></div>
    <p class="keys"><kbd>1</kbd>–<kbd>4</kbd> répondre · <kbd>H</kbd> indice · <kbd>Entrée</kbd> suivant</p>
  </section>`;
  $('#quit').onclick = () => finish();
}
function updateHUD() {
  const g = Game;
  $('#gscore').textContent = g.score;
  $('#gcombo').textContent = g.streak >= 3 ? `Série ×${g.streak}` : '';
  if (g.fixed) { $('#gcount').textContent = `${g.label || 'Défi du jour'} · ${Math.min(g.idx + 1, g.fixed.length)} / ${g.fixed.length}`; $('#gbar').style.width = (g.idx / g.fixed.length * 100) + '%'; }
  else if (g.cfg.rythme === 'serie') { $('#gcount').textContent = `Question ${Math.min(g.idx + 1, g.deck.length)} / ${g.deck.length}`; $('#gbar').style.width = (g.idx / g.deck.length * 100) + '%'; }
  else if (g.cfg.rythme === 'survie') { $('#gcount').innerHTML = `<span class="lives">${Array.from({ length: CFG.lives }, (_, i) => ICON.heart.replace('<svg', `<svg class="${i < g.lives ? '' : 'off'}"`)).join('')}</span>`; $('#gleft').textContent = `${g.correct} bonne${g.correct > 1 ? 's' : ''} réponse${g.correct > 1 ? 's' : ''}`; $('#gbar').style.width = (g.lives / CFG.lives * 100) + '%'; }
  else { $('#gcount').textContent = `${g.correct} bonne${g.correct > 1 ? 's' : ''} réponse${g.correct > 1 ? 's' : ''}`; }
}
function nextQuestion() {
  const g = Game; if (!g || g.done) return;
  g.idx++;
  let cur;
  if (g.fixed) {
    if (g.idx >= g.fixed.length) return finish();
    const q = g.fixed[g.idx]; g.cfg.format = q.format; cur = BYID[q.id]; g.choices = q.choices.map(id => BYID[id]);
  } else {
    if (g.cfg.rythme === 'serie') { if (g.idx >= g.deck.length) return finish(); cur = BYID[g.deck[g.idx]]; }
    else { cur = weightedPick(g.pool, new Set(g.recent), g.cfg); g.recent.push(cur.id); if (g.recent.length > Math.min(12, g.pool.length - 1)) g.recent.shift(); g.deck[g.idx] = cur.id; }
    if (!g.dpool) { const r = g.distractPool.filter(s => (!g.cfg.groups.length || g.cfg.groups.includes(s.group)) && (!g.cfg.fams.length || g.cfg.fams.includes(s.family))); g.dpool = r.length >= 4 ? r : g.distractPool; }
    g.choices = isFree(g.cfg) ? [] : distractors(cur, g.dpool, g.cfg.level);
  }
  g.cur = cur; g.hints = 0; g.locked = false;
  updateHUD(); renderStage(); renderAnswers(); $('#fb').innerHTML = '';
  g.qStart = performance.now();
}
function renderStage() {
  const g = Game, cur = g.cur, st = $('#stage');
  if (g.cfg.format === 'photos' && !isFree(g.cfg)) {
    st.innerHTML = `<div class="nameq"><span class="eyebrow">Trouve la photo de</span><div class="big">${sciHTML(cur.name)}</div>${g.cfg.vern ? `<div class="vn">${esc(cur.vern)}</div>` : ''}</div>` + hintBarHTML();
    $('#hintbtn').onclick = useHint; preloadAhead(g); return;
  }
  const rev = g.cfg.reveal && !g.fixed;
  let p = planFor(g, g.idx); if (!p || p.sid !== cur.id) p = INAT.pick(cur, g.cfg);
  st.innerHTML = `<div class="pic insitu loading${rev ? ' reveal' : ''}"><img alt="Photo de l'espèce à trouver"><button type="button" class="other" id="other">Autre photo</button><a class="pic-credit" target="_blank" rel="noopener" hidden></a></div>` + hintBarHTML();
  const im = $('.pic img'), box = $('.pic');
  const startReveal = () => { if (!rev) return; im.style.transition = 'none'; im.style.filter = `blur(${CFG.revealBlur}px)`; g.qStart = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { im.style.transition = `filter ${CFG.revealSeconds}s linear`; im.style.filter = 'blur(0px)'; })); };
  const show = async (ph, tries = 0) => {
    const q = g.idx, tok = g.photoTok = (g.photoTok || 0) + 1;
    if (!ph) { box.classList.remove('loading'); im.alt = 'Photo indisponible'; return; }
    if (rev) im.style.filter = `blur(${CFG.revealBlur}px)`;
    const url = imgURL(ph), ok = await INAT.preload(url);
    if (Game !== g || g.idx !== q || g.photoTok !== tok || g.cur !== cur || !$('.pic')) return;
    if (!ok && tries < 2) return show(INAT.pick(cur, g.cfg, ph.id), tries + 1);
    g.shown = ph; box.classList.remove('loading'); im.src = url; box.style.setProperty('--insitu', `url("${url}")`);
    const cr = $('.pic-credit'); const lk = photoLink(ph); if (lk) cr.href = lk; else cr.removeAttribute('href'); cr.textContent = creditTxt(ph); cr.hidden = false; startReveal();
  };
  show(p);
  $('#other').onclick = () => { box.classList.add('loading'); show(INAT.pick(cur, g.cfg, g.shown && g.shown.id)); };
  preloadAhead(g);
  $('#hintbtn').onclick = useHint;
}
function hintList(s) {
  const h = [['Groupe', `${GROUPES[s.group] || ''} · ${s.family}`]];
  if (s.pts.length) h.push(['Répartition', mapSVG(s, 'hint-map')]);
  if (s.habitat || s.size) h.push(['Milieu', [s.habitat, s.size].filter(Boolean).join(' · ')]);
  if (s.crit.length) h.push(['Critère', s.crit[0]]);
  h.push(['Genre', `<i class="sp">${esc(s.genus)}</i>`]);
  return h;
}
function hintBarHTML() {
  const g = Game, hl = hintList(g.cur);
  return `<div class="hintbar"><button type="button" class="hint-btn" id="hintbtn"${g.hints >= hl.length || g.locked ? ' disabled' : ''}>Indice${g.hints < hl.length ? ` (−${CFG.hintCost} pts)` : ''}</button>
    <div class="hints">${hl.slice(0, g.hints).map(([k, v]) => `<div${k === 'Répartition' ? ' class="hint-mapbox"' : ''}><b>${k}</b>${['Genre', 'Répartition'].includes(k) ? v + (k === 'Répartition' ? '<span class="hint-cap">Localités iNaturalist</span>' : '') : esc(v)}</div>`).join('')}</div></div>`;
}
function useHint() {
  const g = Game; if (g.locked) return; const hl = hintList(g.cur); if (g.hints >= hl.length) return;
  g.hints++; const bar = $('.hintbar'); bar.outerHTML = hintBarHTML(); $('#hintbtn').onclick = useHint;
}
function renderAnswers() {
  const g = Game, box = $('#answers');
  if (isFree(g.cfg)) {
    box.innerHTML = `<form class="free" id="freef" autocomplete="off"><input id="freein" list="sk-names" placeholder="Nom scientifique (ou vernaculaire)" aria-label="Ta réponse" autocapitalize="off" spellcheck="false"><button class="btn primary" type="submit">Valider</button><button class="btn ghost" type="button" id="pass">Je ne sais pas</button></form>`;
    $('#freef').onsubmit = e => { e.preventDefault(); const v = $('#freein').value; if (v.trim()) answerFree(v); };
    $('#pass').onclick = () => answer(null);
    setTimeout(() => { const i = $('#freein'); if (i && matchMedia('(hover:hover)').matches) i.focus(); }, 30);
    return;
  }
  const pics = g.cfg.format === 'photos';
  if (pics) g.choicePics = g.choices.map(s => INAT.pick(s, g.cfg) || s.photos[0]);
  box.innerHTML = `<div class="choices ${pics ? 'pics' : 'names'}">` + g.choices.map((s, i) => pics
    ? `<button type="button" class="choice" data-id="${s.id}"><span class="ph insitu-mini" style="--insitu:url('${imgURL(g.choicePics[i], 'small')}')"><img src="${imgURL(g.choicePics[i])}" alt="Proposition ${i + 1}"><span class="k">${i + 1}</span></span><span class="cap"></span></button>`
    : `<button type="button" class="choice" data-id="${s.id}"><span class="k">${i + 1}</span><span><span class="nm">${sciHTML(s.name)}</span>${g.cfg.vern ? `<span class="vn">${esc(s.vern)}</span>` : ''}</span></button>`).join('') + '</div>';
  box.onclick = e => { const b = e.target.closest('.choice'); if (b && !g.locked) answer(b.dataset.id); };
}
function answerFree(txt) {
  const c = Game.cur, t = norm(txt);
  const targets = [c.name, ...list((c.old || '').replace(/\s*\/\s*/g, '|')), c.vern].filter(Boolean).map(norm);
  if (targets.includes(t)) return answer(c.id, { exact: true });
  const close = targets.slice(0, -1).some(x => x.length > 8 && lev(x, t) <= 2);
  if (close) return answer(c.id, { typo: txt });
  if (norm(c.genus) === t.split(' ')[0]) return answer('__genus', { typed: txt });
  answer('__free', { typed: txt });
}
function answer(pick, info = {}) {
  const g = Game; if (!g || g.locked) return; g.locked = true;
  const c = g.cur, ok = pick === c.id, half = pick === '__genus';
  g.answered++;
  Store.record(c.id, ok);
  let pts = 0;
  if (ok || half) {
    let base = Math.max(20, CFG.basePoints - g.hints * CFG.hintCost) * (half ? .5 : 1);
    if (g.cfg.reveal && !g.fixed && g.cfg.format === 'noms') { const f = Math.min(1, (performance.now() - (g.qStart || 0)) / 1000 / CFG.revealSeconds); base *= 1.5 - f; }
    if (ok) { g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak); g.correct++; }
    pts = Math.round(base * (1 + Math.min(g.streak, 10) * .1));
    g.score += pts;
  }
  if (!ok) {
    g.streak = 0; if (!g.misses.includes(c.id)) g.misses.push(c.id);
    if (g.cfg.rythme === 'survie' && !half) g.lives--;
    if (!g.fixed && g.cfg.rythme === 'serie' && !g.revisit) { const at = Math.min(g.deck.length, g.idx + 3 + (Math.random() * 3 | 0)); g.deck.splice(at, 0, c.id); }
  }
  g.grid.push(ok ? '🟩' : half ? '🟨' : '🟥');
  const pim = $('.pic.reveal img'); if (pim) { pim.style.transition = 'filter .3s'; pim.style.filter = 'none'; }
  updateHUD();
  $$('.choice').forEach(b => {
    b.disabled = true;
    if (b.dataset.id === c.id) b.classList.add('right'); else if (b.dataset.id === pick) b.classList.add('wrong'); else b.classList.add('dim');
    const cap = $('.cap', b); if (cap) { const s = BYID[b.dataset.id]; cap.innerHTML = `<span class="nm">${sciHTML(s.name)}</span><span class="vn">${esc(s.vern)}</span>`; }
  });
  const fi = $('#freein'); if (fi) { fi.disabled = true; $$('#freef button').forEach(b => b.disabled = true); }
  const hb = $('#hintbtn'); if (hb) hb.disabled = true;
  showFeedback(ok, half, pick, info, pts);
  if (g.cfg.rythme === 'survie' && g.lives <= 0 && !g.fixed) { setTimeout(finish, 1600); return; }
  if (g.cfg.rythme === 'chrono' && !g.fixed) setTimeout(() => { if (Game === g && !g.done) nextQuestion(); }, ok ? 700 : 1700);
}
function showFeedback(ok, half, pick, info, pts) {
  const g = Game, c = g.cur;
  const verdict = ok ? (info.typo ? 'Correct, attention à l\'orthographe' : ['Bien vu !', 'Exact !', 'Bravo !', 'C\'est ça !'][Math.random() * 4 | 0]) : half ? 'Le genre est bon !' : 'Raté…';
  let detail = '';
  if (!ok && pick && BYID[pick]) detail = `Tu as répondu ${sciHTML(BYID[pick].name)}.`;
  else if (!ok && info.typed) detail = `Ta réponse : « ${esc(info.typed)} ».`;
  if (info.typo) detail = `Tu as écrit « ${esc(info.typo)} ».`;
  const showImg = g.cfg.format === 'photos' && c.photos.length;
  const fast = g.cfg.rythme === 'chrono' && !g.fixed;
  $('#fb').innerHTML = `<div class="fb ${ok ? 'ok' : half ? 'mid' : 'ko'}">
    <span class="verdict">${verdict}${pts ? ` +${pts}` : ''}</span>
    <div class="who">${showImg ? `<img src="${imgURL(c.photos[0], 'small')}" alt="">` : ''}<div>
      <div class="big">${sciHTML(c.name)}</div><div class="sub">${esc(c.vern)} · ${esc(c.family)}</div>
      ${c.old ? `<div class="sub" style="color:var(--glow)">Ancien nom : ${sciHTML(c.old)}</div>` : ''}
      ${c.dg && ['L', 'F'].includes(c.dg) ? `<div class="sub danger">${FANGS} ${c.dg === 'F' ? 'Venin fort' : 'Venin léger'}</div>` : ''}
      ${detail ? `<div class="sub">${detail}</div>` : ''}</div></div>
    ${fast ? '' : `<div class="row">
      <button type="button" class="btn primary" id="next">${g.cfg.rythme === 'survie' && g.lives <= 0 && !g.fixed ? 'Voir le résultat' : 'Suivant'}</button>
      <button type="button" class="btn ghost" id="fiche">Fiche</button></div>`}
  </div>`;
  const n = $('#next'); if (n) { n.onclick = () => nextQuestion(); if (matchMedia('(hover:hover)').matches) n.focus({ preventScroll: true }); }
  const f = $('#fiche'); if (f) f.onclick = () => openSheet(c.id);
  if (matchMedia('(max-width:720px)').matches) $('#fb').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function finish() {
  const g = Game; if (!g || g.done) return; g.done = true; clearInterval(g.timer);
  if (g.fixed) return finishDaily(g);
  if (g.cfg.rythme === 'survie') Store.bump('survie', g.correct);
  if (g.cfg.rythme === 'chrono') Store.bump('chrono', g.correct);
  Store.bump('streak', g.bestStreak);
  if (g.cfg.rythme === 'serie' && !g.revisit && g.answered >= CFG.serieLength && g.correct === g.answered) Store.bump('perfect', 1);
  if (isFree(g.cfg) && g.correct >= 10) Store.bump('maitre', g.correct);
  const prev = Store.data.best[g.key] || 0, record = g.score > prev && g.score > 0 && !g.revisit;
  if (record) { Store.data.best[g.key] = g.score; Store.save(); }
  const pct = g.answered ? Math.round(g.correct / g.answered * 100) : 0;
  $('#app').innerHTML = `<section class="end">
    <span class="eyebrow">${esc(configLabel(g.key))}</span>
    <div class="scorebig">${g.score}</div><div>points</div>
    ${record ? '<div class="record">Nouveau record !</div>' : prev ? `<div class="muted">Record : ${prev} pts</div>` : ''}
    <div class="stats3"><div><b>${g.correct}/${g.answered}</b><span>bonnes réponses</span></div><div><b>${pct} %</b><span>réussite</span></div><div><b>${g.bestStreak}</b><span>meilleure série</span></div></div>
    ${g.misses.length ? `<h2 style="text-align:left;margin-top:8px">À revoir</h2><div class="misslist">${g.misses.map(id => missRow(BYID[id])).join('')}</div>` : (g.answered ? '<p class="muted">Aucune erreur, chapeau.</p>' : '')}
    <div class="row" style="justify-content:center">
      ${g.misses.length ? '<button type="button" class="btn primary" id="redo">Rejouer mes erreurs</button>' : ''}
      <button type="button" class="btn${g.misses.length ? '' : ' primary'}" id="again">Rejouer</button>
      <a class="btn ghost" href="#jouer">Changer de jeu</a>
    </div>
    ${g.answered ? `<div class="row" style="justify-content:center"><button type="button" class="btn ghost" id="share">${ICON.share} Partager mon score</button></div>` : ''}
    </section>`;
  const misses = g.misses.slice();
  const sh = $('#share'); if (sh) sh.onclick = () => shareText(`🐍 Skwamat Kwizz · ${configLabel(g.key)}\n${g.score} pts · ${g.correct}/${g.answered} bonnes réponses${g.bestStreak >= 3 ? ` · série de ${g.bestStreak}` : ''}\nEt toi, tu reconnais les reptiles de Guyane ?`);
  setTimeout(checkBadges, 400);
  Game = null; document.body.classList.remove('in-game');
  const r = $('#redo'); if (r) r.onclick = () => { const keep = S.rythme; S.rythme = 'serie'; startGame(misses); S.rythme = keep; };
  $('#again').onclick = () => startGame();
  bindRows($('#app'));
}
function endGame() { if (!Game) return; clearInterval(Game.timer); Game.done = true; Game = null; document.body.classList.remove('in-game'); }
function thumb(s, size = 'small') { return s.photos.length ? `<img src="${imgURL(s.photos[0], size)}" alt="" loading="lazy">` : '<span class="noimg"></span>'; }
function missRow(s) {
  return `<div class="missrow">${thumb(s)}<div class="t"><b>${sciHTML(s.name)}</b><span>${esc(s.vern)}</span></div>
    <button type="button" class="btn ghost" data-sheet="${s.id}" style="min-height:40px;padding:6px 14px">Fiche</button></div>`;
}
function bindRows(root) { root.addEventListener('click', e => { const s = e.target.closest('[data-sheet]'); if (s) openSheet(s.dataset.sheet); }); }
document.addEventListener('keydown', e => {
  if (!Game || Game.done || e.target.tagName === 'INPUT' || $('.sheet-back')) return;
  if (/^[1-4]$/.test(e.key) && !Game.locked && Game.choices.length) answer(Game.choices[+e.key - 1].id);
  else if (e.key === 'Enter' && Game.locked && $('#next')) { e.preventDefault(); nextQuestion(); }
  else if ((e.key === 'h' || e.key === 'H') && !Game.locked) useHint();
});

/* ---------------- espèces ---------------- */
let libQ = '', libG = '', libF = '';
function viewSpecies(openId) {
  $('#app').innerHTML = `<span class="eyebrow">${SP.length} espèces · ${Object.entries(GROUPES).map(([g, t]) => `${SP.filter(s => s.group === g).length} ${t.toLowerCase()}`).join(' · ')}</span>
    <h1 class="display" style="font-size:clamp(2.2rem,8vw,3.4rem)">Espèces</h1>
    <p class="lede">Les fiches de toutes les espèces de reptiles de Guyane, avec les noms à jour, les critères des guides et les plus belles photos libres d'iNaturalist.</p>
    <div class="toolbar"><input type="search" id="q" placeholder="Nom, genre, famille…" aria-label="Chercher une espèce" value="${esc(libQ)}">
    <select id="fsel" aria-label="Famille"><option value="">Toutes les familles</option>${FAMS.map(f => `<option${f === libF ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
    <div class="chips" id="libgrp" style="margin-top:10px"><button type="button" class="chip" data-g="" aria-pressed="${!libG}">Tous</button>${Object.entries(GROUPES).map(([g, t]) => `<button type="button" class="chip" data-g="${g}" aria-pressed="${libG === g}">${t}</button>`).join('')}</div>
    <div id="lib"></div>`;
  $('#q').oninput = e => { libQ = e.target.value; renderLib(); };
  $('#fsel').onchange = e => { libF = e.target.value; renderLib(); };
  $('#libgrp').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; libG = b.dataset.g; $$('#libgrp .chip').forEach(x => x.setAttribute('aria-pressed', x === b)); renderLib(); };
  renderLib(); bindRows($('#app'));
  if (openId && BYID[openId]) openSheet(openId, true);
}
function renderLib() {
  const q = norm(libQ);
  const L = SP.filter(s => (!libF || s.family === libF) && (!libG || s.group === libG) && (!q || [s.name, s.old, s.vern, s.family, GROUPES[s.group]].some(x => x && norm(String(x)).includes(q))));
  const order = Object.keys(GROUPES);
  const fams = [...new Set(L.map(s => s.group + '|' + s.family))].sort((a, b) => order.indexOf(a.split('|')[0]) - order.indexOf(b.split('|')[0]) || a.localeCompare(b));
  $('#lib').innerHTML = fams.length ? fams.map(k => { const [g, f] = k.split('|'); const ss = L.filter(s => s.family === f && s.group === g).sort((a, b) => a.name.localeCompare(b.name));
    return `<section class="famblock"><h2>${esc(f)}<span>${GROUPE_1[g] ? esc(GROUPES[g]) + ' · ' : ''}${ss.length} espèce${ss.length > 1 ? 's' : ''}</span></h2><div class="grid">${ss.map(s => `
      <button type="button" class="card" data-sheet="${s.id}">
        <span class="ph${s.photos.length ? '' : ' none'}">${s.photos.length ? `<img src="${imgURL(s.photos[0])}" alt="" loading="lazy">` : 'Pas encore de photo libre'}</span>
        <span class="t"><b>${sciHTML(s.name)}</b><span>${esc(s.vern)}</span></span>
        <span class="tags"><span class="tag-st">${tagChips(s)}</span></span>
      </button>`).join('')}</div></section>`; }).join('') : '<p class="muted" style="padding:24px 0">Aucune espèce ne correspond à cette recherche.</p>';
}
function openSheet(id) {
  const s = BYID[id]; if (!s) return; closeSheet();
  const back = document.createElement('div'); back.className = 'sheet-back';
  const P = s.photos;
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(s.name)}">
    <div class="gal">${P.length ? `<div class="main insitu" id="galbox" style="--insitu:url('${imgURL(P[0], 'small')}')"><img id="galimg" src="${imgURL(P[0], 'large')}" alt="${esc(s.name)}"><a class="pic-credit" id="galcred" target="_blank" rel="noopener"${photoLink(P[0]) ? ` href="${photoLink(P[0])}"` : ''}>${esc(creditTxt(P[0]))}</a></div>
      ${P.length > 1 ? `<div class="thumbs">${P.map((p, i) => `<button type="button" data-ph="${i}" aria-pressed="${i === 0}" aria-label="Photo ${i + 1}"><img src="${imgURL(p, 'square')}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`
      : '<div class="main" style="aspect-ratio:3/1;color:#6d7f76;display:grid;place-items:center">Pas encore de photo sous licence libre</div>'}
      <button type="button" class="close" id="sclose" aria-label="Fermer">${ICON.close}</button></div>
    <div class="body">
      <div class="title"><span class="eyebrow">${esc(GROUPES[s.group] || '')} · ${esc(s.family)}</span><h2>${sciHTML(s.name)}</h2><span class="vn">${esc(s.vern)}</span>${s.old ? `<span class="old">Ancien nom : ${sciHTML(s.old)}</span>` : ''}</div>
      ${statutsHTML(s)}
      ${s.pts.length ? `<div class="sheet-map">${mapSVG(s)}<div><b>Répartition en Guyane</b><span>${s.pts.length} localité${s.pts.length > 1 ? 's' : ''} d'observations iNaturalist validées (qualité recherche). La carte est incomplète : pour une vision plus juste, consulte <a href="${CFG.fauneGuyane}" target="_blank" rel="noopener">Faune-Guyane</a>.</span></div></div>` : `<div class="sheet-map nomap"><div><b>Répartition en Guyane</b><span>${s.noInat ? 'Carte non affichée : les observations iNaturalist de cette espèce ne sont pas assez fiables.' : 'Pas encore d\'observation localisée sur iNaturalist en Guyane.'} Consulte <a href="${CFG.fauneGuyane}" target="_blank" rel="noopener">Faune-Guyane</a>.</span></div></div>`}
      <dl class="facts">${s.habitat ? `<dt>Habitat</dt><dd>${esc(s.habitat)}</dd>` : ''}${s.size ? `<dt>Taille</dt><dd>${esc(s.size)}</dd>` : ''}</dl>
      ${s.crit.length ? `<div><b>Critères d'identification</b><ul class="crit">${s.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
      ${s.conf.length ? `<div><b>Confusions possibles</b><div class="conf" style="margin-top:6px">${s.conf.map(c => `<button type="button" data-goto="${c}">${sciHTML(BYID[c].name)}</button>`).join('')}</div></div>` : ''}
      ${s.comment ? `<p style="margin:0">${esc(s.comment)}</p>` : ''}
      <p class="small" style="margin:0">${s.inat ? `<a href="https://www.inaturalist.org/taxa/${esc(s.inat)}" target="_blank" rel="noopener">Voir sur iNaturalist</a> · ` : ''}Texte d'après ${esc(s.src || 'les guides d\'identification de Guyane')}.</p>
    </div></div>`;
  document.body.appendChild(back);
  const close = () => { closeSheet(); if (location.hash.startsWith('#especes/')) history.replaceState(null, '', '#especes'); };
  back.onclick = e => {
    if (e.target === back || e.target.closest('#sclose')) return close();
    const ph = e.target.closest('[data-ph]'); if (ph) { const p = P[+ph.dataset.ph]; $('#galimg').src = imgURL(p, 'large'); $('#galbox').style.setProperty('--insitu', `url('${imgURL(p, 'small')}')`); const c = $('#galcred'); c.textContent = creditTxt(p); const lk = photoLink(p); if (lk) c.href = lk; else c.removeAttribute('href'); $$('[data-ph]', back).forEach(b => b.setAttribute('aria-pressed', b === ph)); }
    const go = e.target.closest('[data-goto]'); if (go) openSheet(go.dataset.goto);
  };
  back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $('#sclose').focus();
  if (!Game && location.hash.split('/')[0] === '#especes') history.replaceState(null, '', '#especes/' + id);
}
function closeSheet() { const b = $('.sheet-back'); if (b) b.remove(); }

/* ---------------- progrès ---------------- */
function viewProgress() {
  const sP = SP.filter(hasPhoto);
  const t = Store.data.totals, pct = t.answers ? Math.round(t.correct / t.answers * 100) : 0;
  const recs = Object.entries(Store.data.best).sort((a, b) => b[1] - a[1]).slice(0, 10);
  $('#app').innerHTML = `<span class="eyebrow">Sur cet appareil</span><h1 class="display" style="font-size:clamp(2.2rem,8vw,3.4rem)">Mes progrès</h1>
    <p class="lede">Une espèce est maîtrisée quand tu l'as reconnue plusieurs fois de suite. Rien n'est envoyé en ligne : tout reste sur ton téléphone ou ton ordinateur.</p>
    <div class="kpis">
      <div class="kpi"><b>${mastered(sP)}<small style="font-size:1rem;color:var(--muted)"> / ${sP.length}</small></b><span>espèces maîtrisées</span></div>
      <div class="kpi"><b>${carnetCount()}<small style="font-size:1rem;color:var(--muted)"> / ${SP.length}</small></b><span>espèces vues (carnet)</span></div>
      <div class="kpi"><b>${t.answers}</b><span>réponses données</span></div>
      <div class="kpi"><b>${pct} %</b><span>de bonnes réponses</span></div>
    </div>
    ${recapHTML()}
    ${weakList()}
    ${recs.length ? `<h2 style="margin-top:26px">Records</h2><div class="records">${recs.map(([k, v]) => `<div class="rec"><span>${esc(configLabel(k))}</span><b>${v}</b></div>`).join('')}</div>` : ''}
    ${badgesHTML()}
    <div class="row" style="margin-top:26px"><button type="button" class="btn ghost" id="reset">Effacer mes progrès</button><span class="small" id="resetmsg"></span></div>
    <div class="row links-foot"><a href="#apropos">À propos de Skwamat Kwizz</a><a href="#confidentialite">Confidentialité</a><a href="https://nicolasburnel.github.io/krapo-kwizz/" target="_blank" rel="noopener">Krapo Kwizz, le jeu des amphibiens</a></div>`;
  bindRows($('#app'));
  const r = $('#reset'); let armed = false;
  r.onclick = () => { if (!armed) { armed = true; r.textContent = 'Confirmer l\'effacement'; $('#resetmsg').textContent = 'Clique encore pour tout effacer.'; return; }
    const d = Store.data; Store.data = { m: {}, best: {}, last: d.last, totals: { games: 0, answers: 0, correct: 0 }, badges: {}, daily: {}, carnet: d.carnet || {}, rec: {} };
    Store.save(); viewProgress(); scrollTo(0, 0); toast('Progrès effacés (ton carnet est conservé)'); };
  const w = $('#weakgo'); if (w) w.onclick = () => { const keep = { ...S }; S.rythme = 'serie'; S.groups = []; S.fams = []; if (S.level === 'maitre') S.level = 'expert'; startGame(JSON.parse(w.dataset.ids)); S = keep; };
}
function recapHTML() {
  const line = (lbl, arr) => { let m = 0, w = 0, n = 0; for (const s of arr) { const x = Store.mastery(s.id); if (!x.n) n++; else if (x.b >= 3) m++; else w++; }
    return `<div class="recap-row"><b>${lbl}</b><div class="recap-bar" role="img" aria-label="${m} maîtrisées, ${w} à retravailler, ${n} jamais vues sur ${arr.length}"><i class="m" style="flex:${m}"></i><i class="w" style="flex:${w}"></i><i class="n" style="flex:${n}"></i></div>
    <div class="recap-leg"><span><i class="m"></i>${m} maîtrisée${m > 1 ? 's' : ''}</span><span><i class="w"></i>${w} à retravailler</span><span><i class="n"></i>${n} jamais vue${n > 1 ? 's' : ''}</span></div></div>`; };
  return `<section class="recap"><h2>Récapitulatif</h2>${Object.entries(GROUPES).map(([g, t]) => { const arr = SP.filter(s => s.group === g && hasPhoto(s)); return arr.length ? line(t, arr) : ''; }).join('')}</section>`;
}
function weakList() {
  const rows = [];
  for (const s of SP) { const m = Store.mastery(s.id); if (m.n && m.c < m.n) rows.push({ s, r: m.c / m.n, n: m.n, c: m.c }); }
  rows.sort((a, b) => a.r - b.r || b.n - a.n);
  const top = rows.slice(0, 10); if (!top.length) return '';
  return `<h2 style="margin-top:26px">Espèces à retravailler</h2><div class="misslist" style="margin-top:10px">${top.map(x => missRow(x.s).replace('<div class="t">', `<div class="t"><span class="tag wk ph">${x.c}/${x.n} bonnes réponses</span>`)).join('')}</div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn" id="weakgo" data-ids='${JSON.stringify(top.map(x => x.s.id))}'>Réviser ces espèces</button></div>`;
}

/* ---------------- à propos / confidentialité ---------------- */
function photographers() { const c = {}; for (const s of SP) for (const p of s.photos) if (!p.local) c[p.attr] = (c[p.attr] || 0) + 1; return Object.keys(c).sort((a, b) => a.localeCompare(b, 'fr')); }
function viewAbout() {
  const light = matchMedia('(prefers-color-scheme: light)').matches;
  const ph = photographers(), changed = SP.filter(s => s.old);
  $('#app').innerHTML = `<article class="prose">
    <div class="about-hero"><img class="kk" src="assets/logo-sk-${light ? 'noir' : 'blanc'}.png" alt="Logo de Skwamat Kwizz"><div><span class="eyebrow">À propos</span><h1 class="display" style="font-size:clamp(2.2rem,8vw,3.2rem)">Skwamat Kwizz</h1></div></div>
    <p>Skwamat Kwizz est le petit frère de <a href="https://nicolasburnel.github.io/krapo-kwizz/" target="_blank" rel="noopener">Krapo Kwizz</a>. Même idée, même esprit : rendre la connaissance accessible à tout le monde, gratuitement, et donner envie d'aller observer. Cette fois, place aux squamates et à leurs cousins : serpents, lézards, amphisbènes, tortues et caïmans de Guyane.</p>
    <p>Les fiches reprennent les critères des guides d'identification de Guyane, et toutes les photos viennent d'<a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a>, publiées par leurs auteurs sous licence libre. Les photos du quiz sont des observations validées (qualité recherche) faites en Guyane.</p>
    <h2>Partage tes observations</h2>
    <p>Chaque observation compte, même d'une espèce commune. <a href="${CFG.fauneGuyane}" target="_blank" rel="noopener">Faune-Guyane</a> est la base de données naturaliste participative de référence en Guyane : tes données y servent directement à la connaissance et à la protection des reptiles. Tu peux aussi publier tes photos sur iNaturalist.</p>
    <div class="callout"><b>Un serpent croisé en forêt ?</b> Garde tes distances, prends une photo, et saisis l'observation sur <a href="${CFG.fauneGuyane}" target="_blank" rel="noopener">faune-guyane.fr</a>. Pour une identification, le groupe Facebook « DFG - Détermination Faune Guyane » peut t'aider.</div>
    <h2>Une première version</h2>
    <p>Si tu repères une erreur, un critère à corriger, une photo mal identifiée ou un bug, écris-moi :</p>
    <p class="mail">${CFG.email}</p>
    <h2>Installer l'appli</h2>
    <p>Sur téléphone, ouvre le menu du navigateur et choisis « Ajouter à l'écran d'accueil ». Les photos déjà vues restent disponibles hors connexion.</p>
    <h2>Crédits</h2>
    <p><b>Textes, statuts et critères d'identification :</b> d'après E. Remérand (2024), <i>Guide d'identification des serpents de Guyane et amphisbènes</i> ; E. Remérand (2021), <i>Aide à l'identification des lézards de Guyane</i> ; M. Dewynter, T. Le Pape, E. Remérand & T. Frétey (2019), <i>L'identification des tortues terrestres, dulçaquicoles et marines de Guyane</i>, Les cahiers de la fondation Biotope 26 ; M. Dewynter, C. Marty & M. Blanc (2016), <i>L'identification des caïmans de Guyane</i>, Les cahiers de la fondation Biotope 2.</p>
    <p><b>Photos :</b> <a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a>, sous licences Creative Commons (CC0, CC BY, CC BY-NC, CC BY-SA, CC BY-NC-SA). L'auteur et la licence sont affichés sur chaque photo. Merci aux ${ph.length} photographes : ${ph.map(esc).join(', ')}.</p>
    <p><b>Autres photos :</b> ${[...new Set(LOCAL.map(l => l.auteur))].map(esc).join(', ')}, pour les espèces encore absentes ou mal identifiées sur iNaturalist.</p>
    <p><b>Cartes :</b> localités des observations iNaturalist de qualité recherche en Guyane (coordonnées non masquées). Contour de la Guyane : Natural Earth.</p>
    <p><b>Taxonomie :</b> noms mis à jour en 2026 (${changed.length} changements par rapport aux guides, l'ancien nom est indiqué sur chaque fiche), dont <i>Sibon nebulatus</i> et <i>S. nigralbus</i>, <i>Alopoglossus brevifrontalis</i>, <i>Micrurus diutius</i>, <i>Corallus hortulana</i> et <i>Podocnemis unifilis</i>.</p>
    <p><b>Licence :</b> chaque photo garde la licence choisie par son auteur. Le code de l'application est sous licence MIT.</p>
    <p class="small" style="opacity:.7;margin-top:2em">Skwamat Kwizz · conçu par Nicolas Burnel</p>
  </article>`;
}
function viewPrivacy() {
  $('#app').innerHTML = `<article class="prose"><span class="eyebrow">Confidentialité</span><h1 class="display" style="font-size:clamp(2.2rem,8vw,3.2rem)">Tes données</h1>
    <p>Skwamat Kwizz ne demande aucun compte et ne collecte aucune donnée personnelle. Tes scores, tes progrès, tes badges et ton carnet sont enregistrés uniquement dans le stockage local de ton navigateur, sur ton appareil. Rien n'est envoyé à un serveur.</p>
    <p>Les photos sont chargées depuis les serveurs d'iNaturalist (Amazon S3). Comme pour tout site web, ces serveurs reçoivent l'adresse IP de ton appareil au moment du téléchargement d'une image.</p>
    <p>Pour tout effacer : bouton « Effacer mes progrès » dans ton profil, ou suppression des données du site dans les réglages de ton navigateur.</p>
    <p>Une question : <span class="mail">${CFG.email}</span></p></article>`;
}

/* ---------------- défi du jour ---------------- */
function dailyQuestions(date) {
  const r = rng(hashStr('skwamat-kwizz:' + date)), pool = SP.filter(hasPhoto);
  const picks = seededShuffle(pool, r).slice(0, CFG.dailyLength);
  return picks.map((cur, i) => {
    const others = pool.filter(s => s.id !== cur.id);
    const ds = []; for (const g of distractorOrder(cur, others, 'inter')) for (const s of seededShuffle(g, r)) { if (ds.length >= 3) break; if (!ds.includes(s)) ds.push(s); }
    return { format: i % 3 === 2 ? 'photos' : 'noms', id: cur.id, choices: seededShuffle([cur, ...ds], r).map(s => s.id) };
  });
}
function dailyStreak() {
  let n = 0; const d = new Date();
  if (!Store.data.daily[todayStr(d)]) d.setDate(d.getDate() - 1);
  while (Store.data.daily[todayStr(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function dailyShareText(res, date) {
  const d = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `🐍 Skwamat Kwizz · défi du ${d}\n${res.grid.join('')}\n${res.correct}/${res.n} · ${res.score} pts`;
}
function dailyCardHTML() {
  const date = todayStr(), res = Store.data.daily[date], st = dailyStreak();
  return `<section class="daily" aria-label="Défi du jour">
    <div class="daily-ico">${ICON.sun}</div>
    <div class="daily-t"><b>Défi du jour</b>
      ${res ? `<span>${res.grid.join('')} · ${res.correct}/${res.n} · ${res.score} pts</span><span class="muted">Nouveau défi demain${st > 1 ? ` · ${st} jours d'affilée` : ''}</span>`
            : `<span>${CFG.dailyLength} photos à identifier, les mêmes pour tout le monde aujourd'hui.${st ? ` Série : ${st} jour${st > 1 ? 's' : ''}.` : ''}</span>`}
    </div>
    ${res ? `<button type="button" class="btn" id="dshare">${ICON.share} Partager</button>` : `<button type="button" class="btn primary" id="dgo">Relever le défi</button>`}
  </section>`;
}
function bindDailyCard() {
  const go = $('#dgo'); if (go) go.onclick = startDaily;
  const sh = $('#dshare'); if (sh) sh.onclick = () => { const d = todayStr(); shareText(dailyShareText(Store.data.daily[d], d)); };
}
function startDaily() {
  const date = todayStr(); if (Store.data.daily[date]) return toast('Tu as déjà relevé le défi du jour, reviens demain !');
  const fixed = dailyQuestions(date);
  Game = newGame({ ...S, format: 'noms', level: 'inter', rythme: 'serie', revision: false, groups: [], fams: [], reveal: false }, { key: 'daily', date, fixed, pool: [], deck: fixed.map(q => q.id), revisit: true });
  enterGame(); for (let k = 0; k < 3; k++) planFor(Game, k); renderGameShell(); nextQuestion();
}
function finishDaily(g) {
  const res = { score: g.score, correct: g.correct, n: g.fixed.length, grid: g.grid };
  Store.data.daily[g.date] = res; Store.bump('dailies', Object.keys(Store.data.daily).length); Store.bump('dailyStreak', dailyStreak()); Store.save();
  $('#app').innerHTML = `<section class="end">
    <span class="eyebrow">Défi du jour</span>
    <div class="scorebig">${g.correct}/${res.n}</div><div class="grid-emoji">${res.grid.join('')}</div>
    <div class="muted">${g.score} points${dailyStreak() > 1 ? ` · ${dailyStreak()} jours d'affilée` : ''}</div>
    ${g.misses.length ? `<h2 style="text-align:left;margin-top:8px">À revoir</h2><div class="misslist">${g.misses.map(id => missRow(BYID[id])).join('')}</div>` : '<p class="muted">Aucune erreur, chapeau.</p>'}
    <div class="row" style="justify-content:center"><button type="button" class="btn primary" id="share">${ICON.share} Partager mon résultat</button><a class="btn ghost" href="#jouer">Retour</a></div>
    <p class="small">Un nouveau défi t'attend demain.</p></section>`;
  Game = null; document.body.classList.remove('in-game');
  $('#share').onclick = () => shareText(dailyShareText(res, g.date));
  bindRows($('#app')); setTimeout(checkBadges, 400);
}

/* ---------------- badges ---------------- */
function mastered(arr) { return arr.filter(s => Store.mastery(s.id).b >= 3).length; }
function carnetCount() { return Object.keys(Store.data.carnet).filter(id => BYID[id]).length; }
function badgeDefs() {
  const sP = SP.filter(hasPhoto), R = Store.data.rec, grp = g => sP.filter(s => s.group === g);
  const venom = sP.filter(s => ['L', 'F'].includes(s.dg));
  const defs = [
    ['premier', 'Première mue', 'Donner sa première bonne réponse', () => Store.data.totals.correct >= 1],
    ['oeil10', 'Œil de lynx', 'Maîtriser 10 espèces', () => mastered(sP) >= 10],
    ['oeil50', "Regard d'expert", 'Maîtriser 50 espèces', () => mastered(sP) >= 50],
    ['oeil100', 'Herpéto confirmé', 'Maîtriser 100 espèces', () => mastered(sP) >= 100],
    ['all', 'Encyclopédie vivante', 'Maîtriser toutes les espèces', () => sP.length && mastered(sP) >= sP.length],
    ['venin', 'Sait à qui il a affaire', `Maîtriser les ${venom.length} serpents venimeux mordeurs`, () => venom.length && mastered(venom) >= venom.length],
    ['serpents', 'Charmeur de serpents', `Maîtriser les ${grp('serpent').length} serpents`, () => grp('serpent').length && mastered(grp('serpent')) >= grp('serpent').length],
    ['lezards', 'Roi des lézards', `Maîtriser les ${grp('lezard').length} lézards`, () => grp('lezard').length && mastered(grp('lezard')) >= grp('lezard').length],
    ['tortues', 'Pas si lent', `Maîtriser les ${grp('tortue').length} tortues`, () => grp('tortue').length && mastered(grp('tortue')) >= grp('tortue').length],
    ['caimans', 'Regard de caïman', 'Maîtriser les 4 caïmans', () => grp('croco').length && mastered(grp('croco')) >= grp('croco').length],
    ['serie10', 'Sur une lancée', '10 bonnes réponses de suite', () => (R.streak || 0) >= 10],
    ['sansfaute', 'Sans faute', `Une série de ${CFG.serieLength} questions sans erreur`, () => (R.perfect || 0) >= 1],
    ['maitre', 'Nomenclateur', '10 bonnes réponses en niveau Maître', () => (R.maitre || 0) >= 10],
    ['survie20', 'Survivant', '20 bonnes réponses en mode Survie', () => (R.survie || 0) >= 20],
    ['chrono15', 'Éclair', '15 bonnes réponses en Chrono', () => (R.chrono || 0) >= 15],
    ['defi1', 'Défi relevé', 'Terminer un défi du jour', () => (R.dailies || 0) >= 1],
    ['defi7', 'Assidu', '7 défis du jour d\'affilée', () => (R.dailyStreak || 0) >= 7],
    ['carnet10', 'Carnet de terrain', '10 espèces vues dans le carnet', () => carnetCount() >= 10],
    ['carnet50', 'Naturaliste de terrain', '50 espèces vues', () => carnetCount() >= 50],
  ];
  return defs;
}
function checkBadges() {
  const got = [];
  for (const [id, name, , test] of badgeDefs()) { if (!Store.data.badges[id]) { let ok = false; try { ok = test(); } catch (e) {} if (ok) { Store.data.badges[id] = todayStr(); got.push(name); } } }
  if (got.length) { Store.save(); toast(got.length === 1 ? `Badge débloqué : ${got[0]} !` : `${got.length} badges débloqués : ${got.join(', ')} !`); }
}
function badgesHTML() {
  const defs = badgeDefs(), n = defs.filter(d => Store.data.badges[d[0]]).length;
  return `<h2 style="margin-top:26px">Badges <span class="muted" style="font-size:.9rem;font-weight:600">${n} / ${defs.length}</span></h2>
    <div class="badges">${defs.map(([id, name, desc]) => { const on = Store.data.badges[id]; return `<div class="badge${on ? ' on' : ''}"><span class="medal">${on ? ICON.check : ''}</span><b>${esc(name)}</b><span>${esc(desc)}</span></div>`; }).join('')}</div>`;
}

/* ---------------- carnet de terrain ---------------- */
let carQ = '', carF = '';
function viewCarnet() {
  const tot = SP.length, vu = carnetCount();
  $('#app').innerHTML = `<span class="eyebrow">Mes observations</span>
    <h1 class="display" style="font-size:clamp(2.2rem,8vw,3.4rem)">Mon carnet</h1>
    <p class="lede">Coche les espèces que tu as vues sur le terrain. Ton carnet reste sur cet appareil.</p>
    <div class="carsum">
      <div><b>${vu}<small> / ${tot}</small></b><span>espèces vues</span></div>
      ${Object.entries(GROUPES).filter(([g]) => g !== 'amphisbene').map(([g, t]) => { const all = SP.filter(s => s.group === g); return `<div><b>${all.filter(s => Store.data.carnet[s.id]).length}<small> / ${all.length}</small></b><span>${t.toLowerCase()}</span></div>`; }).join('')}
      <div class="meter wide"><div style="width:${vu / tot * 100}%"></div></div>
    </div>
    <div class="toolbar"><input type="search" id="cq" placeholder="Chercher une espèce…" aria-label="Chercher une espèce" value="${esc(carQ)}">
      ${segHTML('seg-car', { '': ['Toutes', ''], vu: ['Vues', ''], reste: ['À trouver', ''] }, carF, 'carseg')}</div>
    <div id="carlist"></div>
    <div class="row" style="margin-top:22px"><button type="button" class="btn ghost" id="cshare">${ICON.share} Partager mon carnet</button></div>
    <p class="small" style="margin-top:14px">Une espèce vue sur le terrain ? Pense à la saisir sur <a href="${CFG.fauneGuyane}" target="_blank" rel="noopener">Faune-Guyane</a>.</p>`;
  $('#cq').oninput = e => { carQ = e.target.value; renderCarnet(); };
  $('#seg-car').onclick = e => { const b = e.target.closest('button'); if (!b) return; carF = b.dataset.v; $$('#seg-car button').forEach(x => x.setAttribute('aria-pressed', x === b)); renderCarnet(); };
  $('#cshare').onclick = () => shareText(`🐍 Mon carnet Skwamat Kwizz : ${carnetCount()} espèces de reptiles de Guyane vues, sur ${SP.length}.`);
  renderCarnet();
  $('#carlist').onclick = e => {
    const t = e.target.closest('[data-c]');
    if (t) { const id = t.dataset.id; if (Store.data.carnet[id]) delete Store.data.carnet[id]; else Store.data.carnet[id] = { s: 'vu', d: todayStr() };
      Store.save(); const y = window.scrollY; viewCarnet(); window.scrollTo(0, y); setTimeout(checkBadges, 300); return; }
    const s = e.target.closest('[data-sheet]'); if (s) openSheet(s.dataset.sheet);
  };
}
function renderCarnet() {
  const q = norm(carQ);
  const L = SP.filter(s => { const c = Store.data.carnet[s.id]; if (carF === 'vu' && !c) return false; if (carF === 'reste' && c) return false;
    return !q || [s.name, s.old, s.vern, s.family].some(x => x && norm(x).includes(q)); });
  const order = Object.keys(GROUPES);
  const fams = [...new Set(L.map(s => s.group + '|' + s.family))].sort((a, b) => order.indexOf(a.split('|')[0]) - order.indexOf(b.split('|')[0]) || a.localeCompare(b));
  $('#carlist').innerHTML = fams.length ? fams.map(k => { const [g, f] = k.split('|'); const ss = L.filter(s => s.family === f && s.group === g).sort((a, b) => a.name.localeCompare(b.name)); const all = SP.filter(s => s.family === f && s.group === g); const done = all.filter(s => Store.data.carnet[s.id]).length;
    return `<section class="famblock"><h2>${esc(f)}<span>${done} / ${all.length}</span></h2><div class="carrows">${ss.map(s => { const c = Store.data.carnet[s.id];
      return `<div class="carrow${c ? ' vu' : ''}"><button type="button" class="car-sp" data-sheet="${s.id}">${thumb(s, 'square')}<span><span class="nm">${sciHTML(s.name)}</span><span class="vn">${esc(s.vern)}</span></span></button>
        <div class="car-btns"><button type="button" class="cbox" data-id="${s.id}" data-c="vu" aria-pressed="${!!c}" title="Vue sur le terrain">${ICON.eye}<span>Vue</span></button></div></div>`; }).join('')}</div></section>`; }).join('') : '<p class="muted" style="padding:20px 0">Aucune espèce dans cette liste.</p>';
}

/* ---------------- démarrage ---------------- */
(async function boot() {
  Store.load();
  try { await loadData(); }
  catch (e) { $('#app').innerHTML = '<p class="loading">Impossible de charger les espèces. Vérifie ta connexion puis recharge la page.</p>'; return; }
  loadSettings();
  const dl = document.createElement('datalist'); dl.id = 'sk-names';
  dl.innerHTML = [...new Set(SP.map(s => s.name))].sort().map(n => `<option value="${esc(n)}">`).join(''); document.body.appendChild(dl);
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', () => { if (Game && location.hash !== '#partie') endGame(); });
  if (location.hash === '#partie') history.replaceState(null, '', '#jouer');
  route();
  setTimeout(checkBadges, 1500);
  INAT.load();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
