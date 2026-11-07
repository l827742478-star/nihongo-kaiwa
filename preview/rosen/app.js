const $app = document.getElementById('app'), au = new Audio();
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('rz_' + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rz_' + k, JSON.stringify(v)); } catch (e) {} }
};
const play = a => { au.src = 'audio/' + a + '.mp3'; au.play().catch(() => {}); };
const toast = t => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1900); };

// ---------- 声音：IC 卡「嘀」、发车铃（自己写的旋律）、答对答错 ----------
let ac;
function tone(seq) {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); let t = ac.currentTime + .02;
    seq.forEach(([f, d, v = .08, type = 'sine']) => { if (f) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); } t += d * .9; }); } catch (e) {}
}
const PI = () => tone([[2000, .09, .06, 'square'], [2000, .14, .06, 'square']]);
const BELL = () => tone([[784, .22], [988, .22], [1175, .22], [988, .22], [1319, .3], [1175, .22], [1568, .5, .1]]);
const OK = () => tone([[1320, .1], [1760, .14]]);
const NG = () => tone([[300, .2, .08, 'triangle']]);

// ---------- 线路：假名两条 + N5–N1（内容陆续接入） ----------
const LINES = [...KANA.map(l => ({...l, level: '五十音'})),
  ...TOKYO.L.map(l => l.code === 'G' && window.N5 ? {...l, st: N5.st} :
    ({...l, off: true, st: l.st.map((n, i) => ({no: l.code + String(i + 1).padStart(2, '0'), name: n, theme: i === l.st.length - 1 ? l.level + ' 毕业考' : ''}))}))];
const mark = s => s.kana ? s.kana[0][0].slice(0, 2) : s.name[0];
const yomi = n => (TOKYO.S[n] || [])[2] || '';
const stars = () => store.get('stars', {});
const allSt = () => LINES.flatMap(l => l.st.map(s => ({l, s})));
const findSt = no => allSt().find(x => x.s.no === no);
const nextSt = () => allSt().find(x => !x.l.off && !stars()[x.s.no]);

// ---------- 打卡 ----------
const day = (t = new Date()) => `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
function streak() { const d = new Set(store.get('days', [])), t = new Date(); let n = 0; if (!d.has(day(t))) t.setDate(t.getDate() - 1);
  while (d.has(day(t))) { n++; t.setDate(t.getDate() - 1); } return n; }
function checkin() { const d = store.get('days', []); if (d.includes(day())) return false; d.push(day()); store.set('days', d.slice(-400)); store.set('pt', store.get('pt', 0) + 10); return true; }

function icCard() {
  const d = new Set(store.get('days', [])), t = new Date(), w = (t.getDay() + 6) % 7, done = d.has(day());
  const wk = '一二三四五六日'.split('').map((n, i) => { const x = new Date(t); x.setDate(t.getDate() - w + i); return `<span>${n}<i class="${d.has(day(x)) ? 'ok' : ''}">${d.has(day(x)) ? '✓' : ''}</i></span>`; }).join('');
  return `<div class="ic${done ? ' done' : ''}" id="ic"><small>MANABU CARD</small><div class="ic-n">まなぶカード</div><span class="ic-tap">${done ? '今天已乘车 ✓' : '点一下 · 刷卡打卡'}</span>
    <div class="ic-row"><div><small>连续乘车</small><b>${streak()} 天</b></div><div><small>里程积分</small><b>${store.get('pt', 0)}</b></div><div><small>集到印章</small><b>${Object.keys(stars()).length} 个</b></div></div>
    <div class="week">${wk}</div></div>`;
}
function timetable() {
  const S = stars(), n = nextSt(), weak = allSt().filter(x => S[x.s.no] && S[x.s.no] < 3).sort((a, b) => S[a.s.no] - S[b.s.no])[0];
  const rows = [];
  if (n) rows.push(['09:00', n, '新站', '发车 ›']);
  const A = allSt(), n2 = n && A[A.findIndex(x => x.s.no === n.s.no) + 1];
  if (n2 && !n2.l.off) rows.push(['12:30', n2, '新站', '发车 ›']);
  if (weak) rows.push(['20:00', weak, `复习 · ${'★'.repeat(S[weak.s.no])}`, '再坐一次 ›']);
  return `<div class="tt"><div class="tt-h"><span>今日の時刻表</span><span>${new Date().getMonth() + 1}月${new Date().getDate()}日</span></div>
    ${rows.map(([tm, x, tag, go]) => `<a href="#/s/${x.s.no}"><time>${tm}</time><span class="ln" style="background:${x.l.color}">${x.s.no}</span><span>${esc(x.s.name)} <em>${esc(x.s.theme || '')} · ${tag}</em></span><span class="go">${go}</span></a>`).join('') || '<a>全部坐完啦 🎉</a>'}</div>`;
}
function route(l) {
  const S = stars(), cur = nextSt(), ok = l.st.filter(s => S[s.no]).length;
  return `<div class="line${l.off ? ' off' : ''}" style="--c:${l.color}"><div class="line-h"><span class="badge">${l.code}</span><div><b>${l.name} · ${l.level}</b><small>${l.off ? '内容接入中' : `${l.st.length} 站 · 已到 ${ok} 站`}</small></div><span class="pct">${l.off ? '' : Math.round(ok / l.st.length * 100) + '%'}</span></div>
    <div class="route">${l.st.map((s, i) => `<a class="stn${S[s.no] ? ' ok' : ''}${cur && cur.s.no === s.no ? ' cur' : ''}" ${l.off ? '' : `href="#/s/${s.no}"`}><i>${s.no.slice(-2)}</i><span>${esc(s.name)}</span><small class="th">${esc(s.theme || '')}</small>
      <small>${S[s.no] ? '★'.repeat(S[s.no]) : ''}</small>${i === l.st.length - 1 && LINES[LINES.indexOf(l) + 1] ? `<em class="xfer">换乘</em>` : ''}</a>`).join('')}</div></div>`;
}
function home() {
  $app.innerHTML = `<div id="bigmap"></div>` + icCard() + timetable() + `<h3>🚉 各条线路 <small style="font-size:12px;color:var(--mute);font-weight:600">每到一站盖一个章</small></h3>` + LINES.map(route).join('');
  MAP.mount(document.getElementById('bigmap'), LINES, stars());
  const ic = document.getElementById('ic');
  ic.onclick = () => { ic.classList.remove('pi'); void ic.offsetWidth; ic.classList.add('pi'); PI();
    if (checkin()) { toast('ピッ！打卡成功 +10 积分'); setTimeout(home, 600); } else toast('ピッ！今天已经乘过车了'); };
  const c = document.querySelector('.stn.cur'); if (c) c.parentElement.scrollLeft = c.offsetLeft - 120;
}

// ---------- 车站 ----------
function station(no) {
  const x = findSt(no); if (!x || x.l.off) return home();
  const {l, s} = x, i = l.st.indexOf(s), prev = l.st[i - 1], nx = l.st[i + 1];
  const many = s.kana && s.kana.length > 10;
  const head = `<div style="--c:${l.color}"><a class="back" href="#/">‹ 路线图</a>
    <div class="sign"><span class="num">${l.code}<em>${s.no.slice(-2)}</em></span><small class="yomi">${esc(yomi(s.name))}</small><b>${esc(s.name)}</b><small>${esc(l.name)} · 这一站学 <em class="theme">${esc(s.theme)}</em></small>
      <div class="band">${prev ? `<a href="#/s/${prev.no}">‹ ${esc(prev.name)}</a>` : '<span></span>'}${nx ? `<a href="#/s/${nx.no}">${esc(nx.name)} ›</a>` : '<span>终点站</span>'}</div></div>
    <div class="ann"><button id="annb">🔊</button><div><div class="jp">${esc(s.ann)}</div><small>车内广播：下一站，${esc(s.name)}（${esc(s.theme)}）</small></div></div>`;
  if (s.exam) { $app.innerHTML = head + `<div class="card" style="text-align:center;padding:30px 18px"><div style="font-size:44px">🎓</div><h2>${esc(l.level)} 毕业考</h2>
      <p style="color:var(--mute);font-size:14px;line-height:1.7">用一整套真题来考：文字词汇、文法、读解、听力。<br>考过就能换乘下一条线。</p><p style="margin-top:12px;font-weight:800;color:var(--c)">真题题库正在接入</p></div></div>`;
    document.getElementById('annb').onclick = () => play(s.aa); return; }
  if (s.words && !s.kana) { const hit = s.words.filter(w => w[3]).length;
    $app.innerHTML = head + `<h3>这一站的单词 <small style="font-size:12px;color:var(--mute);font-weight:600">${s.words.length} 个，${hit} 个在真题里出现过</small></h3>
      ${s.words.map(([w, rd, zh, n, a]) => `<button class="vw" data-a="${a}"><span class="pl">▶</span><span class="vw-w"><b class="jp">${esc(w)}</b>${rd ? `<small>${esc(rd)}</small>` : ''}</span><span class="vw-zh">${esc(zh)}</span>${n ? `<em class="hot${n >= 8 ? ' h' : ''}">真题 ${n} 场</em>` : ''}</button>`).join('')}
      <button class="btn go" id="go">🚃 出发 · 过关小测</button></div>`;
    document.getElementById('annb').onclick = () => play(s.aa); setTimeout(() => play(s.aa), 300);
    $app.querySelectorAll('[data-a]').forEach(b => b.onclick = () => play(b.dataset.a));
    document.getElementById('go').onclick = () => vquiz(x); return; }
  $app.innerHTML = head + `
    <h3>这一站的假名 <small style="font-size:12px;color:var(--mute);font-weight:600">点一下听发音</small></h3>
    <div class="kgrid">${s.kana.map(([k, r, a]) => `<button class="kc" data-a="${a}"><div class="kana" style="${many ? 'font-size:26px' : ''}">${k}</div><small>${r}</small></button>`).join('')}</div>
    <h3>用这一站的假名读单词</h3>
    ${s.words.map(([w, zh, a]) => `<button class="wd" data-a="${a}"><span class="pl">▶</span><b>${esc(w)}</b><span>${esc(zh)}</span></button>`).join('')}
    <button class="btn go" id="go">🚃 出发 · 过关小测</button></div>`;
  document.getElementById('annb').onclick = () => play(s.aa);
  setTimeout(() => play(s.aa), 300);
  $app.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { play(b.dataset.a); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 400); });
  document.getElementById('go').onclick = () => quiz(x);
}

// ---------- 过关小测：听音选假名 + 看假名选读音，10 题 ----------
function quiz({l, s}) {
  const pool = s.kana, pick = a => a[Math.random() * a.length | 0];
  const sameLine = l.st.flatMap(t => t.kana);
  const Q = Array.from({length: 10}, (_, n) => {
    const t = pool[n % pool.length] && (n < pool.length ? pool[n] : pick(pool)), mode = n % 2 ? 'read' : 'hear';
    const key = mode === 'read' ? 1 : 0, o = new Map([[t[key], t]]);
    const src = pool.length >= 4 ? pool : sameLine;
    while (o.size < 4) { const y = pick(Math.random() < .7 ? src : sameLine); if (!o.has(y[key])) o.set(y[key], y); }
    return {t, mode, opts: [...o.values()].sort(() => Math.random() - .5)};
  }).sort(() => Math.random() - .5);
  let i = 0, right = 0;
  const draw = () => {
    if (i >= Q.length) return arrive(l, s, right);
    const q = Q[i];
    $app.innerHTML = `<div style="--c:${l.color}"><a class="back" href="#/s/${s.no}">‹ ${esc(s.name)}</a>
      <div class="qtop"><span>${l.code}${s.no.slice(-2)} ${esc(s.name)} · 过关小测</span><span>${i + 1} / ${Q.length}</span></div><div class="bar"><i style="width:${i / Q.length * 100}%"></i></div>
      <div class="qbox">${q.mode === 'hear' ? `<button class="spk" id="spk">🔊</button><small>听发音，选出对应的假名</small>` : `<div class="kana">${q.t[0]}</div><small>这个假名怎么读？</small>`}</div>
      <div class="opts">${q.opts.map((o, j) => `<button class="opt${q.mode === 'read' ? ' r' : ''}" data-j="${j}">${q.mode === 'read' ? o[1] : o[0]}</button>`).join('')}</div></div>`;
    const sp = document.getElementById('spk'); if (sp) { sp.onclick = () => play(q.t[2]); setTimeout(() => play(q.t[2]), 250); }
    $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if ($app.querySelector('.opt.ok')) return;
      const o = q.opts[+b.dataset.j], good = o === q.t || o[q.mode === 'read' ? 1 : 0] === q.t[q.mode === 'read' ? 1 : 0];
      $app.querySelectorAll('.opt').forEach((c, j) => { if (q.opts[j] === q.t) c.classList.add('ok'); });
      if (good) { right++; OK(); } else { b.classList.add('no'); NG(); }
      play(q.t[2]); i++; setTimeout(draw, good ? 800 : 1500);
    });
  };
  draw();
}
// ---------- 单词小测：听音选意思 / 看词选意思 / 看意思选词 ----------
function vquiz({l, s}) {
  const W = s.words, pick = a => a[Math.random() * a.length | 0];
  const pool = [...W].sort((a, b) => b[3] - a[3] + (Math.random() - .5) * 6).slice(0, 10);
  const Q = pool.map((t, n) => { const mode = ['hear', 'mean', 'pick'][n % 3], o = new Set([t]);
    while (o.size < Math.min(4, W.length)) o.add(pick(W)); return {t, mode, opts: [...o].sort(() => Math.random() - .5)}; });
  let i = 0, right = 0;
  const draw = () => {
    if (i >= Q.length) return arrive(l, s, right);
    const q = Q[i], lab = o => q.mode === 'pick' ? esc(o[0]) : esc(o[2]);
    $app.innerHTML = `<div style="--c:${l.color}"><a class="back" href="#/s/${s.no}">‹ ${esc(s.name)}</a>
      <div class="qtop"><span>${l.code}${s.no.slice(-2)} ${esc(s.name)} · 过关小测</span><span>${i + 1} / ${Q.length}</span></div><div class="bar"><i style="width:${i / Q.length * 100}%"></i></div>
      <div class="qbox">${q.mode === 'hear' ? `<button class="spk" id="spk">🔊</button><small>听一听，是什么意思？</small>`
        : q.mode === 'mean' ? `<div class="kana" style="font-size:42px">${esc(q.t[0])}</div>${q.t[1] ? `<small>${esc(q.t[1])}</small>` : ''}<small>是什么意思？</small>`
        : `<div style="font-size:26px;font-weight:900">${esc(q.t[2])}</div><small>日语怎么说？</small>`}</div>
      <div class="opts">${q.opts.map((o, j) => `<button class="opt r${q.mode === 'pick' ? ' jp' : ''}" style="font-size:${q.mode === 'pick' ? 21 : 16}px" data-j="${j}">${lab(o)}</button>`).join('')}</div></div>`;
    const sp = document.getElementById('spk'); if (sp) { sp.onclick = () => play(q.t[4]); setTimeout(() => play(q.t[4]), 250); }
    $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if ($app.querySelector('.opt.ok')) return;
      const good = q.opts[+b.dataset.j] === q.t;
      $app.querySelectorAll('.opt').forEach((c, j) => { if (q.opts[j] === q.t) c.classList.add('ok'); });
      if (good) { right++; OK(); } else { b.classList.add('no'); NG(); }
      play(q.t[4]); i++; setTimeout(draw, good ? 900 : 1700);
    });
  };
  draw();
}
function arrive(l, s, right) {
  const st = right >= 10 ? 3 : right >= 9 ? 2 : right >= 8 ? 1 : 0, S = stars(), first = !S[s.no] && st;
  if (st > (S[s.no] || 0)) { S[s.no] = st; store.set('stars', S); store.set('pt', store.get('pt', 0) + st * 5); }
  const nx = l.st[l.st.indexOf(s) + 1], nl = LINES[LINES.indexOf(l) + 1];
  $app.innerHTML = `<div class="arrive" style="--c:${l.color}">
    ${st ? `<div class="stamp${first ? ' new' : ''}"><span class="kana">${esc(mark(s))}</span><b>${esc(s.name)}駅</b><small>${esc(s.theme)} · ${new Date().getMonth() + 1}.${new Date().getDate()}</small></div>` : ''}
    <h2>${st ? '到站了！' : '差一点点…'}</h2><div class="stars">${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</div>
    <p style="color:var(--mute);font-size:14px">答对 ${right} / 10　${st ? `+${st * 5} 积分` : '答对 8 题才能到站'}</p>
    ${st && nx ? `<a class="btn go" href="#/s/${nx.no}">🚃 下一站：${esc(nx.name)}</a>` : ''}
    ${st && !nx && nl ? `<a class="btn go" href="#/">🔁 换乘：${esc(nl.name)}</a>` : ''}
    <a class="btn" href="#/s/${s.no}">${st ? '再坐一次，拿 3 颗星' : '回到这一站再看看'}</a><a class="btn" href="#/">回到路线图</a></div>`;
  if (st) { BELL(); checkin(); } else NG();
  scrollTo(0, 0);
}
function stampBook() {
  const S = stars();
  $app.innerHTML = `<a class="back" href="#/">‹ 路线图</a><h2>🎫 印章册</h2><p style="color:var(--mute);font-size:13.5px;margin-bottom:6px">每到一站盖一个章，集满一条线就毕业了。</p>` +
    LINES.filter(l => !l.off).map(l => `<h3><span class="badge" style="--c:${l.color};width:26px;height:26px;border-width:4px;font-size:11px">${l.code}</span>${l.name}　${l.st.filter(s => S[s.no]).length}/${l.st.length}</h3>
    <div class="sbook" style="--c:${l.color}">${l.st.map(s => `<a href="#/s/${s.no}" class="stamp${S[s.no] ? '' : ' no'}"><span class="kana">${S[s.no] ? esc(mark(s)) : '?'}</span><b>${esc(s.name)}</b><small>${S[s.no] ? '★'.repeat(S[s.no]) : l.code + s.no.slice(-2)}</small></a>`).join('')}</div>`).join('');
}
function go() {
  au.pause(); const m = location.hash.match(/^#\/s\/(\w+)/);
  if (m) station(m[1]); else if (location.hash === '#/stamps') stampBook(); else home();
  scrollTo(0, 0);
}
addEventListener('hashchange', go); go();
