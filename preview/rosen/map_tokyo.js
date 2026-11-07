// 首页大地图：按东京真实地理画。山手線 = 五十音，銀座線 N5、丸ノ内線 N4、日比谷線 N3、千代田線 N2、東西線 N1
// 学会的站亮灯；拖动、双指缩放；放大后显示全部站名
const MAP_TOKYO = (() => {
  const xy = n => { const [la, lo] = TOKYO.S[n]; return [(lo - 139.61) * 0.812 * 3000, (35.79 - la) * 3000]; };
  const HOME = [70, -10, 520, 615];
  // 站名避让：先试右边，再试左、上、下，都会撞到就不显示
  function place(C, fs, cls) {
    const box = [], out = [], hit = b => box.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    [...C].sort((a, b) => b.p - a.p).forEach(c => { const w = c.n.length * fs * .98, h = fs, d = fs * .55 + 2;
      const tries = [[c.x + d, c.y + h * .35, 'start'], [c.x - d, c.y + h * .35, 'end'], [c.x, c.y - d, 'middle'], [c.x, c.y + d + h * .8, 'middle']];
      for (const [x, y, an] of tries) { const x0 = an === 'start' ? x : an === 'end' ? x - w : x - w / 2, b = [x0 - .5, y - h, x0 + w + .5, y + .2 * h];
        if (!hit(b)) { box.push(b); out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${an}" style="font-size:${fs}px">${c.n}</text>`); return; } } });
    return `<g class="${cls}">${out.join('')}</g>`;
  }
  function svg(lines, S) {
    const cnt = {}; lines.forEach(l => l.st.forEach(s => cnt[s.name] = (cnt[s.name] || 0) + 1));
    let g = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="city" cx="40%" cy="45%" r="70%"><stop offset="0" stop-color="#1e2c4a"/><stop offset="1" stop-color="#090e19"/></radialGradient></defs>
      <rect x="-600" y="-600" width="2200" height="1800" fill="url(#city)" class="sea"/>`;
    // 东京湾和隅田川（示意）
    g += `<path d="M330,520 C420,505 520,540 640,520 C760,500 860,520 1100,480 L1100,900 L300,900 Z" class="bay"/>
      <path d="M560,60 C540,150 560,230 545,300 C535,360 520,420 470,470" class="river"/><text x="600" y="640" class="bayname">東京湾</text>`;
    for (let i = 0; i < 150; i++) { const x = (i * 137.5) % 900 - 20, y = (i * 263.1 + (i % 7) * 41) % 560 - 30; g += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(i % 3) * .35 + .4}" class="dust"/>`; }
    let lit = 0, total = 0; const labs = [];
    lines.forEach(l => { const P = l.st.map(s => xy(s.name)); if (l.loop) P.push(P[0]);
      const pts = P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
      g += `<polyline points="${pts}" class="lnglow" style="--c:${l.color}"/><polyline points="${pts}" class="ln${l.off ? ' off' : ''}" style="--c:${l.color}"/>`; });
    const done = new Set();
    lines.forEach(l => l.st.forEach(s => { total++; const [x, y] = xy(s.name), on = S[s.no], k = l.loop; if (on) lit++;
      if (cnt[s.name] > 1) { if (done.has(s.name)) return; done.add(s.name);
        g += `<a ${l.off ? '' : `href="#/s/${s.no}"`}><rect x="${(x - 6).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="12" height="8" rx="4" class="xf${on ? ' on' : ''}"/></a>`; }
      else if (k) g += `<a href="#/s/${s.no}">${on ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" class="halo"/>` : ''}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.6" class="st${on ? ' on' : ''}" style="--c:${l.color}"/><text x="${x.toFixed(1)}" y="${(y + 2.4).toFixed(1)}" class="sk${on ? ' on' : ''}">${s.kana[0][0].slice(0, 1)}</text></a>`;
      else if (!l.off) g += `<a href="#/s/${s.no}">${on ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" class="halo"/>` : ''}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="st${on ? ' on' : ''}" style="--c:${l.color}"/></a>`;
      else g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" class="st${l.off ? ' off' : ''}${on ? ' on' : ''}" style="--c:${l.color}"/>`;
      if (!done.has('L' + s.name)) { done.add('L' + s.name); labs.push({n: s.name, x, y, p: (cnt[s.name] > 1 ? 2 : 0) + (k ? 1 : 0)}); } }));
    g += place(labs.filter(c => c.p), 8.5, 'lab1') + place(labs, 4.6, 'lab2');
    lines.forEach(l => { const e = xy(l.st[l.loop ? 0 : l.st.length - 1].name), b = xy(l.st[0].name);
      (l.loop ? [[xy('大崎')[0], xy('大崎')[1] + 34]] : [b, e]).forEach(([x, y]) => {
        g += `<g class="lbadge" style="--c:${l.color}" transform="translate(${x.toFixed(1)},${(y - 16).toFixed(1)})"><rect x="-22" y="-8" width="44" height="16" rx="8"/><text dy="4">${l.loop ? 'JY 五十音' : l.code + ' ' + l.level}</text></g>`; }); });
    return {g, lit, total};
  }
  let cache = {};
  function mount(el, lines, S) {
    const key = JSON.stringify(S); if (cache.key !== key) cache = {key, ...svg(lines, S)};
    const {g, lit, total} = cache;
    el.innerHTML = `<div class="mapwrap night" id="mw"><svg id="msv" viewBox="${HOME.join(' ')}" preserveAspectRatio="xMidYMid slice">${g}</svg>
      <div class="mhead"><small>TOKYO · 山手線</small><b>東京・五十音</b><span>零基础从这里上车，绕山手線一圈学会假名</span></div>
      <div class="mstat"><div><b>${lines.length}</b>条线路</div><div><b>${total}</b>个车站</div><div><b>${(lit / total * 100).toFixed(1)}%</b>已点亮</div></div>
      <div class="mtool"><button id="tojp" title="返回全日本">🗾</button><button data-z="1.4">＋</button><button data-z="0.7">－</button><button data-z="0">⤢</button><button id="dn">☀︎</button></div></div>`;
    const sv = el.querySelector('#msv'), mw = el.querySelector('#mw');
    let vb = [...HOME];
    const set = () => { sv.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); sv.classList.toggle('zin', vb[2] < 330); mw.classList.toggle('zin', vb[2] < 330); };
    const zoom = (k, cx = .5, cy = .5) => { if (!k) { vb = [...HOME]; return set(); }
      const w = Math.min(1100, Math.max(250, vb[2] / k)), h = w * HOME[3] / HOME[2]; vb = [vb[0] + (vb[2] - w) * cx, vb[1] + (vb[3] - h) * cy, w, h]; set(); };
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(+b.dataset.z));
    el.querySelector('#tojp').onclick = () => MAP.mount(el, LINES, S);
    el.querySelector('#dn').onclick = e => { mw.classList.toggle('night'); e.target.textContent = mw.classList.contains('night') ? '☀︎' : '☾'; };
    const P = new Map(); let last = null, dist = 0, moved = 0;
    sv.addEventListener('pointerdown', e => { P.set(e.pointerId, e); last = e; moved = 0; if (P.size === 2) { const [a, b] = [...P.values()]; dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
    sv.addEventListener('pointermove', e => { if (!P.has(e.pointerId)) return; const r = sv.getBoundingClientRect(), k = Math.max(vb[2] / r.width, vb[3] / r.height);
      if (P.size === 1 && last) { const dx = e.clientX - last.clientX, dy = e.clientY - last.clientY; moved += Math.abs(dx) + Math.abs(dy); vb[0] -= dx * k; vb[1] -= dy * k; set(); last = e; }
      P.set(e.pointerId, e);
      if (P.size === 2) { const [a, b] = [...P.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (dist) zoom(d / dist); dist = d; moved = 99; } });
    const up = e => { P.delete(e.pointerId); last = P.size ? [...P.values()][0] : null; dist = 0; };
    sv.addEventListener('pointerup', up); sv.addEventListener('pointercancel', up);
    sv.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); return; } if (e.target.closest('.st.off') || (e.target.closest('a') && !e.target.closest('a').getAttribute('href'))) toast('这条线正在铺轨，很快开通'); }, true);
    sv.addEventListener('wheel', e => { e.preventDefault(); const r = sv.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : .87, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, {passive: false});
  }
  return {mount};
})();
