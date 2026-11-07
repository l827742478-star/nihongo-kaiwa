// 首页大地图：中间「五十音环线」，N5–N1 五条线从环线放射出去，交叉处是换乘站
// 坐标系 0–1000，用 viewBox 拖动、缩放；学会的站亮灯
const MAP = (() => {
  const C = [500, 480], RAD = 190;
  // 每条线的折线（第一个点接在环线上）和站数
  const PATHS = {
    N5: [[[690, 480], [800, 480], [880, 560], [880, 860]], 24],
    N4: [[[500, 290], [500, 180], [610, 70], [830, 70]], 30],
    N3: [[[310, 480], [190, 480], [90, 580], [90, 860]], 36],
    N2: [[[500, 670], [500, 780], [400, 880], [140, 880]], 42],
    N1: [[[634, 614], [730, 710], [930, 710]], 48],
  };
  const along = (pts, n) => {  // 折线上平均取 n 个点（第一个点是换乘站，不算）
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = seg.reduce((a, b) => a + b);
    return Array.from({length: n}, (_, k) => { let d = tot * (k + 1) / n, i = 0; while (d > seg[i] && i < seg.length - 1) d -= seg[i++];
      const a = pts[i], b = pts[i + 1], t = d / seg[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; });
  };
  function svg(lines, S) {
    const kana = lines.filter(l => !l.off), loopSt = kana.flatMap(l => l.st.map(s => ({l, s})));
    const pt = i => { const a = -Math.PI / 2 + i / loopSt.length * Math.PI * 2; return [C[0] + RAD * Math.cos(a), C[1] + RAD * Math.sin(a)]; };
    let lit = 0, total = loopSt.length;
    let g = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="city" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#1d2b48"/><stop offset="1" stop-color="#0a101c"/></radialGradient></defs>
      <rect x="-500" y="-500" width="2000" height="2000" fill="url(#city)" class="sea"/>`;
    // 背景：城市的微光
    for (let i = 0; i < 260; i++) { const x = (i * 137.5) % 1000, y = (i * 263.1 + (i % 7) * 41) % 1000; g += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(i % 3) * .5 + .6}" class="dust"/>`; }
    // 放射线
    lines.filter(l => l.off).forEach(l => { const [pts, n] = PATHS[l.code]; total += n;
      g += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="ln" style="--c:${l.color}"/>`;
      along(pts, n).forEach(([x, y], k) => { g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" class="st off" style="--c:${l.color}"/>`; });
      const e = pts[pts.length - 1]; g += `<g class="lbadge" style="--c:${l.color}" transform="translate(${e[0]},${e[1]})"><circle r="17"/><text dy="5">${l.code}</text></g>`;
      g += `<rect x="${pts[0][0] - 10}" y="${pts[0][1] - 6}" width="20" height="12" rx="6" class="xf"/>`;
    });
    // 换乘站（两条线交叉的地方）
    [[880, 710], [90, 880]].forEach(([x, y]) => g += `<rect x="${x - 10}" y="${y - 6}" width="20" height="12" rx="6" class="xf"/>`);
    // 五十音环线
    const half = kana[0].st.length / loopSt.length, arc = (a0, a1, c) => { const p0 = [C[0] + RAD * Math.cos(a0), C[1] + RAD * Math.sin(a0)], p1 = [C[0] + RAD * Math.cos(a1), C[1] + RAD * Math.sin(a1)];
      return `<path d="M${p0.join(',')} A${RAD},${RAD} 0 0 1 ${p1.join(',')}" class="loop" style="--c:${c}"/>`; };
    const A0 = -Math.PI / 2 - Math.PI / loopSt.length, A1 = A0 + half * Math.PI * 2;
    g += arc(A0, A1, kana[0].color) + arc(A1, A0 + Math.PI * 2, kana[1].color);
    loopSt.forEach(({l, s}, i) => { const [x, y] = pt(i), on = S[s.no], a = -Math.PI / 2 + i / loopSt.length * Math.PI * 2;
      if (on) lit++;
      g += `<a href="#/s/${s.no}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" class="st${on ? ' on' : ''}" style="--c:${l.color}"/>
        <text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" class="sk${on ? ' on' : ''}">${s.kana[0][0]}</text>
        <text x="${(C[0] + (RAD + 32) * Math.cos(a)).toFixed(1)}" y="${(C[1] + (RAD + 32) * Math.sin(a) + 4).toFixed(1)}" class="sn">${s.name}</text></a>`; });
    g += `<text x="${C[0]}" y="${C[1] - 8}" class="loopname">五十音環状線</text><text x="${C[0]}" y="${C[1] + 16}" class="loopsub">ひらがな ⇄ カタカナ</text>`;
    return {g, lit, total};
  }
  function mount(el, lines, S) {
    const {g, lit, total} = svg(lines, S);
    el.innerHTML = `<div class="mapwrap night" id="mw"><svg id="msv" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">${g}</svg>
      <div class="mhead"><small>JLPT N5–N1 · 五十音から N1 まで</small><b>日本語の路線図</b><span>把 15 年 JLPT 真题，修成一张日语地铁网</span></div>
      <div class="mstat"><div><b>${lines.length}</b>条线路</div><div><b>${total}</b>个车站</div><div><b>${(lit / total * 100).toFixed(1)}%</b>已点亮</div></div>
      <div class="mtool"><button data-z="1.4">＋</button><button data-z="0.7">－</button><button data-z="0">⤢</button><button id="dn">☀︎</button></div></div>`;
    const sv = el.querySelector('#msv'), mw = el.querySelector('#mw');
    let vb = [0, 0, 1000, 1000];
    const set = () => sv.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
    const zoom = (k, cx = .5, cy = .5) => { if (!k) { vb = [0, 0, 1000, 1000]; return set(); }
      const w = Math.min(1000, Math.max(160, vb[2] / k)), x = vb[0] + (vb[2] - w) * cx, y = vb[1] + (vb[3] - w) * cy; vb = [x, y, w, w]; set(); };
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(+b.dataset.z));
    el.querySelector('#dn').onclick = e => { mw.classList.toggle('night'); e.target.textContent = mw.classList.contains('night') ? '☀︎' : '☾'; };
    // 拖动、双指缩放
    const P = new Map(); let last = null, dist = 0;
    sv.addEventListener('pointerdown', e => { P.set(e.pointerId, e); sv.setPointerCapture(e.pointerId); last = e; if (P.size === 2) { const [a, b] = [...P.values()]; dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
    sv.addEventListener('pointermove', e => { if (!P.has(e.pointerId)) return; const r = sv.getBoundingClientRect(), k = vb[2] / Math.min(r.width, r.height);
      if (P.size === 1 && last) { vb[0] -= (e.clientX - last.clientX) * k; vb[1] -= (e.clientY - last.clientY) * k; set(); last = e; }
      P.set(e.pointerId, e);
      if (P.size === 2) { const [a, b] = [...P.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (dist) zoom(d / dist); dist = d; } });
    const up = e => { P.delete(e.pointerId); last = P.size ? [...P.values()][0] : null; dist = 0; };
    sv.addEventListener('pointerup', up); sv.addEventListener('pointercancel', up);
    sv.addEventListener('wheel', e => { e.preventDefault(); const r = sv.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : .87, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, {passive: false});
    sv.addEventListener('click', e => { const a = e.target.closest('.st.off'); if (a) toast('这条线正在铺轨，很快开通'); });
  }
  return {mount};
})();
