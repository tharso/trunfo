// Roda DENTRO de uma página do procyclingstats.com (navegador embutido).
// Coleta os resultados de 2023 a 2026 dos 180 ciclistas (window.RANK) e o tipo
// de percurso de cada etapa/prova. Guarda tudo em window.COLETA.
// Ritmo: 1 página a cada 3 s; se vier 429 (excesso de pedidos), espera 60 s.
(async () => {
  const SEASONS = [2023, 2024, 2025, 2026];
  const sleep = (ms) => new Promise((z) => setTimeout(z, ms));
  const C = (window.COLETA = window.COLETA || { rows: [], done: {}, profiles: {}, log: [], fase: 1 });

  async function get(url) {
    for (let t = 0; t < 30; t++) {
      const r = await fetch(url);
      if (r.status === 200) return new DOMParser().parseFromString(await r.text(), "text/html");
      C.log.push([url, r.status]);
      if (r.status === 404) return null;
      await sleep(60000);
    }
    return null;
  }

  // Fase 1: páginas de temporada de cada ciclista.
  const KEY = /race\/(.+?)-(\d{4})-(stage-\d+[ab]?|prologue|result|gc)$/;
  for (const rider of window.RANK) {
    for (const season of SEASONS) {
      const id = rider.slug + "|" + season;
      if (C.done[id]) continue;
      const d = await get(`/rider/${rider.slug}/${season}`);
      if (d) {
        let cls = {};
        for (const tr of d.querySelectorAll("table tbody tr")) {
          const tds = tr.querySelectorAll("td");
          const a = tr.querySelector('a[href^="race/"]');
          if (!a || tds.length < 2) continue;
          const href = a.getAttribute("href");
          const name = a.innerText.replace(/\s+/g, " ").trim();
          const txt = tr.innerText.replace(/\s+/g, " ");
          const m = href.match(KEY);
          if (!m) continue;
          const race = m[1] + "|" + m[2];
          const c = txt.match(/\((\d\.[A-Za-z0-9.]+|WC|CC|NC|OG|Olympics)\)/);
          if (c) cls[race] = c[1];
          const pos = tds[1].innerText.trim();
          if (!pos) continue;
          let tipo = m[3].startsWith("stage") || m[3] === "prologue" ? "etapa" : m[3] === "gc" ? "gc" : "um_dia";
          if (/General classification/i.test(name)) tipo = "gc";
          else if (/classification/i.test(name)) continue; // pontos, montanha, jovem
          C.rows.push({
            r: rider.slug, s: season, race, ev: tipo === "gc" ? race + "|gc" : href,
            tipo, pos, d: tds[0].innerText.trim(), cls: cls[race] || null,
            itt: !!tr.querySelector(".svg-chrono") || /\(ITT\)|Prologue/i.test(name) || /- ITT/.test(name),
            ttt: /TTT/.test(name), nome: name,
          });
        }
      }
      C.done[id] = 1;
      await sleep(3000);
    }
  }

  // Fase 2: tipo de percurso (p1 plano ... p5 montanha com chegada no alto).
  C.fase = 2;
  const races = {};
  for (const x of C.rows) if (x.tipo !== "gc") (races[x.race] = races[x.race] || new Set()).add(x.tipo);
  for (const race of Object.keys(races)) {
    if (C.profiles[race]) continue;
    const [slug, year] = race.split("|");
    const prof = {};
    if (races[race].has("etapa")) {
      const d = await get(`/race/${slug}/${year}/stages`);
      if (d)
        for (const el of d.querySelectorAll('[class*="profile p"]')) {
          const row = el.closest("tr");
          const a = row && row.querySelector('a[href*="stage"], a[href*="prologue"]');
          if (a) prof[a.getAttribute("href").replace(/^\//, "").replace(/\/result$/, "")] = el.className.match(/p(\d)/)[1];
        }
    }
    if (races[race].has("um_dia")) {
      const d = await get(`/race/${slug}/${year}/result`);
      const el = d && d.querySelector('[class*="profile p"]');
      if (el) prof["um_dia"] = el.className.match(/p(\d)/)[1];
    }
    C.profiles[race] = prof;
    await sleep(3000);
  }
  C.fase = 3;
})();
"iniciado";
