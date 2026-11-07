// 首页大地图：日本夜景 + 新干线。东京是起点（山手線＝五十音），N5–N1 是五条新干线
// 学会的站亮灯；拖动、双指缩放；点东京进入山手線地图
const MAP = (() => {
  const HOME = [0, 0, 900, 960];
  const glow = (x, y, w, i) => { let g = '', s = 9301 + i * 77;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < w * 26; k++) { const a = rnd() * 6.283, r = Math.pow(rnd(), 1.8) * (8 + w * 4.5);
      g += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r * .9).toFixed(1)}" r="${(rnd() * .9 + .35).toFixed(2)}" class="lt"/>`; }
    return g; };
  function place(C, fs, cls) {
    const box = [], out = [], hit = b => box.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    [...C].sort((a, b) => b.p - a.p).forEach(c => { const w = c.n.length * fs * .98, h = fs, d = fs * .55 + 3;
      for (const [x, y, an] of [[c.x + d, c.y + h * .35, 'start'], [c.x - d, c.y + h * .35, 'end'], [c.x, c.y - d, 'middle'], [c.x, c.y + d + h * .8, 'middle']]) {
        const x0 = an === 'start' ? x : an === 'end' ? x - w : x - w / 2, b = [x0 - 1, y - h, x0 + w + 1, y + .25 * h];
        if (!hit(b)) { box.push(b); out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${an}" style="font-size:${fs}px">${c.n}</text>`); return; } } });
    return `<g class="${cls}">${out.join('')}</g>`;
  }
  let cache = {};
  function svg(lines, S) {
    let g = `<defs><radialGradient id="sky" cx="62%" cy="55%" r="75%"><stop offset="0" stop-color="#132341"/><stop offset=".6" stop-color="#0a1428"/><stop offset="1" stop-color="#050a15"/></radialGradient>
      <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16243c"/><stop offset="1" stop-color="#101b30"/></linearGradient></defs>
      <rect x="-900" y="-900" width="2700" height="2800" fill="url(#sky)"/>`;
    for (let i = 0; i < 160; i++) g += `<circle cx="${(i * 197.3) % 900}" cy="${(i * 331.7 + i % 9 * 53) % 960}" r="${i % 4 ? .5 : 1}" class="star"/>`;
    g += `<path d="${JP.coast}" class="land"/><path d="${JP.coast}" class="shore"/>`;
    JP.city.forEach(([n, x, y, w], i) => g += glow(x, y, w, i));
    let lit = 0, total = 0; const labs = [];
    const kana = lines.find(l => l.loop), [tx, ty] = JP.tokyo;
    lines.filter(l => !l.loop).forEach(l => { const pts = l.geo.map(p => p[1] + ',' + p[2]).join(' ');
      g += `<polyline points="${pts}" class="lnglow" style="--c:${l.color}"/><polyline points="${pts}" class="ln${l.off ? ' off' : ''}" style="--c:${l.color}"/>`; });
    lines.filter(l => !l.loop).forEach(l => l.geo.forEach(([n, x, y], i) => { const s = l.st[i], on = s && S[s.no]; total++; if (on) lit++;
      if (n === '東京') return;
      g += `<a ${!l.off && s ? `href="#/s/${s.no}"` : ''}>${on ? `<circle cx="${x}" cy="${y}" r="7" class="halo"/>` : ''}<circle cx="${x}" cy="${y}" r="${i === l.geo.length - 1 ? 4.6 : 3.2}" class="st${on ? ' on' : ''}${l.off ? ' off' : ''}" style="--c:${l.color}"/></a>`;
      labs.push({n, x, y, p: i === l.geo.length - 1 ? 3 : ['名古屋', '京都', '広島', '博多', '仙台', '金沢', '札幌', '函館', '長野', '盛岡', '熊本', '岡山', '富山', '軽井沢', '熱海', '新函館北斗'].includes(n) ? 2 : 0}); }));
    // 东京：山手線 = 五十音环
    const done = kana.st.filter(s => S[s.no]).length; total += kana.st.length; lit += done;
    g += `<a href="#tokyo" id="tk"><circle cx="${tx}" cy="${ty}" r="22" class="tkglow"/><circle cx="${tx}" cy="${ty}" r="11" class="tkring" style="--c:${kana.color}"/>
      <circle cx="${tx}" cy="${ty}" r="11" class="tkpro" style="--c:${kana.color};stroke-dasharray:${(done / kana.st.length * 69.1).toFixed(1)} 69.1"/><text x="${tx}" y="${ty + 3.4}" class="tkt">東京</text></a>`;
    lines.filter(l => !l.loop).forEach(l => { const [n, x, y] = l.geo[l.geo.length - 1];
      const dx = {N5: -58, N4: 70, N3: -70, N2: 78, N1: 66}[l.code], dy = {N5: 34, N4: -24, N3: -16, N2: 34, N1: 18}[l.code];
      g += `<g class="lbadge" style="--c:${l.color}" transform="translate(${x + dx},${y + dy})"><rect x="-44" y="-15" width="88" height="30" rx="15"/><text dy="-1">${l.code}</text><text dy="10" class="lbn">${l.name.replace('・特急北斗', '')}</text></g>`; });
    g += place(labs.filter(c => c.p), 13, 'lab1') + place(labs, 8, 'lab2');
    return {g, lit, total};
  }
  function mount(el, lines, S) {
    const key = JSON.stringify(S); if (cache.key !== key) cache = {key, ...svg(lines, S)};
    const {g, lit, total} = cache;
    el.innerHTML = `<div class="mapwrap night jpmap" id="mw"><svg id="msv" viewBox="${HOME.join(' ')}" preserveAspectRatio="xMidYMid slice">${g}</svg>
      <div class="mhead"><small>JLPT 五十音 → N1 · 東京から日本一周</small><b>日本語の路線図</b><span>从东京上车，坐新干线到北海道，你就是 N1</span></div>
      <div class="mstat"><div><b>${lines.length}</b>条线路</div><div><b>${total}</b>个车站</div><div><b>${(lit / total * 100).toFixed(1)}%</b>已点亮</div></div>
      <div class="mtool"><button data-z="1.5">＋</button><button data-z="0.67">－</button><button data-z="0">⤢</button></div></div>`;
    const sv = el.querySelector('#msv'), mw = el.querySelector('#mw');
    let vb = [...HOME];
    const set = () => { sv.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); sv.classList.toggle('zin', vb[2] < 560); mw.classList.toggle('zin', vb[2] < 560); };
    const zoom = (k, cx = .5, cy = .5) => { if (!k) { vb = [...HOME]; return set(); }
      const w = Math.min(1200, Math.max(300, vb[2] / k)), h = w * HOME[3] / HOME[2]; vb = [vb[0] + (vb[2] - w) * cx, vb[1] + (vb[3] - h) * cy, w, h]; set(); };
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(+b.dataset.z));
    el.querySelector('#tk').onclick = e => { e.preventDefault(); MAP_TOKYO.mount(el, lines, S); };
    const P = new Map(); let last = null, dist = 0, moved = 0;
    sv.addEventListener('pointerdown', e => { P.set(e.pointerId, e); last = e; moved = 0; if (P.size === 2) { const [a, b] = [...P.values()]; dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
    sv.addEventListener('pointermove', e => { if (!P.has(e.pointerId)) return; const r = sv.getBoundingClientRect(), k = Math.min(vb[2] / r.width, vb[3] / r.height);
      if (P.size === 1 && last) { const dx = e.clientX - last.clientX, dy = e.clientY - last.clientY; moved += Math.abs(dx) + Math.abs(dy); vb[0] -= dx * k; vb[1] -= dy * k; set(); last = e; }
      P.set(e.pointerId, e);
      if (P.size === 2) { const [a, b] = [...P.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (dist) zoom(d / dist); dist = d; moved = 99; } });
    const up = e => { P.delete(e.pointerId); last = P.size ? [...P.values()][0] : null; dist = 0; };
    sv.addEventListener('pointerup', up); sv.addEventListener('pointercancel', up);
    sv.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); e.stopPropagation(); return; } if (e.target.closest('.st.off')) toast('这条新干线正在铺轨，很快开通'); }, true);
    sv.addEventListener('wheel', e => { e.preventDefault(); const r = sv.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : .87, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, {passive: false});
  }
  return {mount};
})();
