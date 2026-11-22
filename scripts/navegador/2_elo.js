// Roda DENTRO da página do procyclingstats.com, depois de 1_coleta_resultados.js.
// Calcula a força de cada ciclista por tipo de prova, só com confrontos entre os 180.
// Método: Bradley-Terry ponderado (o "Elo de uma vez só": resolve todos os confrontos
// juntos, sem depender da ordem das provas).
//
// Regras:
// - Tipo: crono = contrarrelógio individual; voltas = classificação geral final;
//   pave = clássicas de pavê; senão pelo percurso do PCS: p1 = sprint,
//   p3 (e p2 em prova de um dia) = colinas/explosão, p4/p5 = montanha. Etapa p2 fica fora.
// - Em cada prova, até o TOPN a ordem conta. Quem chegou depois perde para todos do
//   topo, mas não briga entre si.
// - Peso do confronto = peso da prova × peso do ano / raiz(nº de rivais na prova).
//   Classificação geral de Grande Volta vale GT_GC vezes mais.
// - Nota = força − Z × erro padrão (menos provas = mais incerteza = nota menor).
// - Fora da conta: criterium, contrarrelógio por equipes, DNF/DNS/OTL.
//
// Atenção: para Izagirre e Sparfel, /rider/<slug>/<ano> mostra resultados de
// ciclocross. A coleta deles usou rider.php?id=<id>&sportid=1&p=results&xseason=<ano>.
window.runBT = (P = {}) => {
  const PAVE = ["ronde-van-vlaanderen", "paris-roubaix", "e3-harelbeke", "gent-wevelgem",
    "dwars-door-vlaanderen", "omloop-het-nieuwsblad", "kuurne-brussel-kuurne",
    "a-travers-le-flandres", "classic-brugge-de-panne", "le-samyn", "nokere-koerse"];
  const GT = ["tour-de-france", "giro-d-italia", "vuelta-a-espana"];
  const TOPN = P.TOPN || { crono: 40, voltas: 25, sprint: 25, colinas: 25, montanha: 25, pave: 25 };
  const PESO_ANO = P.PESO_ANO || { 2023: 0.4, 2024: 0.6, 2025: 0.8, 2026: 1.0 };
  const TAU = P.TAU || 250, Z = P.Z ?? 1.0, GT_GC = P.GTGC || 2;
  const C = window.COLETA;
  const pesoClasse = (cls, slug) => GT.includes(slug) ? 1.5 : !cls ? 0.3 : /^(WC|OG|Olympics)$/.test(cls) ? 1.5
    : /UWT/.test(cls) ? 1.0 : /Pro/.test(cls) ? 0.7 : /^\d\.1$|^CC$/.test(cls) ? 0.5 : cls === "NC" ? 0.4 : 0.3;
  const categoria = (x) => {
    const slug = x.race.split("|")[0];
    if (x.ttt || /criterium|kermesse/i.test(x.nome) || x.cls === "NAT") return null;
    if (x.itt) return "crono";
    if (x.tipo === "gc") return "voltas";
    if (PAVE.includes(slug)) return "pave";
    const prof = C.profiles[x.race] || {};
    const p = x.tipo === "um_dia" ? prof.um_dia : prof[x.ev];
    if (p === "1") return "sprint";
    if (p === "3" || (p === "2" && x.tipo === "um_dia")) return "colinas";
    if (p === "4" || p === "5") return "montanha";
    return null;
  };
  const ev = {};
  for (const x of C.rows) {
    const pos = parseInt(x.pos, 10);
    if (!Number.isFinite(pos)) continue;
    const cat = categoria(x);
    if (!cat) continue;
    const slug = x.race.split("|")[0];
    const w = pesoClasse(x.cls, slug) * (cat === "voltas" && GT.includes(slug) ? GT_GC : 1) * (PESO_ANO[x.s] || 1);
    const e = (ev[x.ev] = ev[x.ev] || { cat, w, res: [] });
    if (!e.res.some((y) => y.r === x.r)) e.res.push({ r: x.r, pos });
  }
  const slugs = window.RANK.map((x) => x.slug);
  const idx = Object.fromEntries(slugs.map((s, i) => [s, i]));
  const n = slugs.length, L = Math.LN10 / 400, cats = Object.keys(TOPN);
  const out = {}, nEv = {};
  for (const c of cats) {
    const W = Array.from({ length: n }, () => new Float64Array(n));
    const cnt = new Int32Array(n);
    for (const e of Object.values(ev)) {
      const T = TOPN[c];
      if (e.cat !== c || e.res.length < 2 || !e.res.some((y) => y.pos <= T)) continue;
      nEv[c] = (nEv[c] || 0) + 1;
      const M = e.res.length - 1;
      for (const y of e.res) cnt[idx[y.r]]++;
      for (const a of e.res) for (const b of e.res)
        if (a.pos < b.pos && a.pos <= T) W[idx[a.r]][idx[b.r]] += e.w / Math.sqrt(M);
    }
    const r = new Float64Array(n).fill(1500), H = new Float64Array(n);
    for (let it = 0; it < 300; it++) {
      for (let i = 0; i < n; i++) {
        let g = 0, h = 0;
        for (let j = 0; j < n; j++) {
          const t = W[i][j] + W[j][i];
          if (!t) continue;
          const p = 1 / (1 + Math.pow(10, (r[j] - r[i]) / 400));
          g += W[i][j] - t * p;
          h += t * p * (1 - p);
        }
        g = L * g - (r[i] - 1500) / (TAU * TAU);
        h = L * L * h + 1 / (TAU * TAU);
        r[i] += g / h;
        H[i] = h;
      }
    }
    out[c] = slugs.map((s, i) => ({ R: Math.round(r[i]), se: Math.round(1 / Math.sqrt(H[i])), n: cnt[i],
      nota: Math.round(r[i] - Z / Math.sqrt(H[i])) }));
  }
  const ratings = {};
  slugs.forEach((s, i) => { ratings[s] = {}; for (const c of cats) ratings[s][c] = out[c][i]; });
  window.ELO = { ratings, resumo: { eventos: nEv } };
  return nEv;
};
window.runBT();
