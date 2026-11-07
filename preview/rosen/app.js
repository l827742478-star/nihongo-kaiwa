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
// 线路：山手線（五十音）+ 五条新干线（N5–N1）。N5 有内容，其余先只有站名
const LINES = [...KANA.map(l => ({...l, level: '五十音'})),
  ...Object.entries(JP.lines).map(([code, l]) => code === 'N5' && window.N5
    ? {code, level: code, name: l.name, color: l.color, geo: l.st, st: N5.st}
    : {code, level: code, name: l.name, color: l.color, geo: l.st, off: true, st: l.st.map(([n], i) => ({no: code + String(i + 1).padStart(2, '0'), name: n, theme: i === l.st.length - 1 ? code + ' 毕业考' : ''}))})];
const yomi = n => (TOKYO.S[n] || [])[2] || JP.yomi[n] || '';
const RB = t => esc(t).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
const mark = s => s.kana ? s.kana[0][0].slice(0, 2) : s.name[0];
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
const IMG = no => /^N5(0[1-9]|1[0-7])$/.test(no) ? `img/st/${no}.jpg` : null;
function home() {
  const B = window.BANK || [], nQ = B.reduce((a, b) => a + b[2], 0), nL = B.reduce((a, b) => a + (b[3] || 0), 0);
  $app.innerHTML = `<section class="hero"><div class="hero-in"><small>— 基于 2010–2026 历年 JLPT 真题 —</small><h1>日本語の<em>銀河鉄道</em></h1>
      <p class="hero-en">NIHONGO NO GINGA TETSUDŌ · JLPT KNOWLEDGE RAILWAY</p><p class="hero-t">从五十音出发，坐上银河里的列车，<br>一站一站开到 N1</p>
      <p class="hero-s">覆盖 五十音・N5–N1 · 词汇 / 文法 / 读解 / 听力 · 真题考频</p>
      <a class="hero-b w" href="#map">开始乘车</a><a class="hero-b" href="#/bank">进入真题库</a><a class="hero-b g" href="#/trains">🚄 按列车种别刷题</a>
      <div class="hero-k"><div><b>${B.length}</b>套真题</div><div><b>${nQ}</b>道题</div><div><b>${(window.WORDS || []).length}</b>个词</div><div><b>${(window.GRAMS || []).length}</b>个文法</div></div></div></section>
    <div id="map"></div><div id="bigmap"></div>` + icCard() + timetable() + `<div class="kb"><a href="#/bank"><span>📚</span><b>真题库</b><small>${B.length} 套 · ${B.reduce((a, b) => a + b[2], 0)} 题</small></a><a href="#/words"><span>✦</span><b>单词星系</b><small>${(window.WORDS || []).length} 词 · 连真题原句</small></a>
    <a href="#/grams"><span>△</span><b>语法星系</b><small>${(window.GRAMS || []).length} 个文法 · 连真题</small></a><a href="#/data"><span>📊</span><b>数据看板</b><small>高频词 · 考点</small></a>
    <a href="#/mine"><span>⭐</span><b>我的收藏</b><small>难题 · 易混 · 想再看</small></a><a href="#/wrong"><span>📕</span><b>错题本</b><small>做错自动收录</small></a></div>` + `<h3>🚉 各条线路 <small style="font-size:12px;color:var(--mute);font-weight:600">每到一站盖一个章</small></h3>` + LINES.map(route).join('');
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
  const head = `<div style="--c:${l.color}"><a class="back" href="#/">‹ 路线图</a>${IMG(s.no) ? `<div class="st-hero" style="background-image:url(${IMG(s.no)})"></div>` : ''}
    <div class="sign"><span class="num">${l.code}<em>${s.no.slice(-2)}</em></span><small class="yomi">${esc(yomi(s.name))}</small><b>${esc(s.name)}</b><small>${esc(l.name)} · 这一站学 <em class="theme">${esc(s.theme)}</em></small>
      <div class="band">${prev ? `<a href="#/s/${prev.no}">‹ ${esc(prev.name)}</a>` : '<span></span>'}${nx ? `<a href="#/s/${nx.no}">${esc(nx.name)} ›</a>` : '<span>终点站</span>'}</div></div>
    <div class="ann"><button id="annb">🔊</button><div><div class="jp">${esc(s.ann)}</div><small>车内广播：下一站，${esc(s.name)}（${esc(s.theme)}）</small></div></div>`;
  if (s.exam) { const E = l.code === 'N5' && window.EXAM_N5, Q = E ? examQs(E) : [], best = store.get('exam_' + s.no, null);
    $app.innerHTML = head + `<div class="card ex-intro"><div style="font-size:44px">🎓</div><h2>${esc(l.level)} 毕业考</h2>
      <p>用一整套真题来考，考过就能换乘下一条线。</p>
      ${E ? `<div class="ex-box"><b>${esc(E.title)}</b>${E.parts.map(pt => `<span>${esc(pt.name)} ${examQs({parts: [pt]}).length} 题</span>`).join('')}<span>及格线：60%</span></div>
        ${best ? `<p class="ex-best">上次成绩：${best.r} / ${best.n}（${Math.round(best.r / best.n * 100)}%）</p>` : ''}
        <button class="btn go" id="ex">📝 开始考试 · ${Q.length} 题</button>` : '<p style="font-weight:800;color:var(--c)">真题题库正在接入</p>'}</div>
      ${store.get('wrong', []).length ? `<a class="btn" href="#/wrong">📕 错题本 ${store.get('wrong', []).length} 题</a>` : ''}</div>`;
    document.getElementById('annb').onclick = () => play(s.aa);
    const b = document.getElementById('ex'); if (b) b.onclick = () => exam(x, E, Q); return; }
  if (s.words && !s.kana) { const hit = s.words.filter(w => w[3]).length;
    $app.innerHTML = head + `<h3>这一站的单词 <small style="font-size:12px;color:var(--mute);font-weight:600">${s.words.length} 个，${hit} 个在真题里出现过</small></h3>
      ${s.words.map(([w, rd, zh, n, a, ex, exzh, ea]) => `<div class="vw"><button class="pl" data-a="${a}">▶</button><span class="vw-w"><b class="jp">${esc(w)}</b>${rd ? `<small>${esc(rd)}</small>` : ''}</span><span class="vw-zh">${esc(zh)}</span>${n ? `<em class="hot${n >= 8 ? ' h' : ''}">真题 ${n} 场</em>` : ''}
        ${ex ? `<button class="vw-ex" data-a="${ea}"><span class="jp">${RB(ex)}</span><small>${esc(exzh)}</small></button>` : ''}</div>`).join('')}
      ${s.gram && s.gram.length ? `<h3>这一站的文法 <small style="font-size:12px;color:var(--mute);font-weight:600">${s.gram.length} 个</small></h3>
      ${s.gram.map(([g, how, mean, ex, exzh, n, a]) => `<div class="gm"><div class="gm-h"><b class="jp">${esc(g)}</b>${n ? `<em class="hot${n >= 8 ? ' h' : ''}">真题 ${n} 场</em>` : ''}</div>
        <div class="gm-m">${esc(mean)}</div><div class="gm-how"><span>接续</span>${esc(how)}</div>
        <button class="gm-ex" data-a="${a}"><span class="pl">▶</span><span><span class="jp">${RB(ex)}</span><small>${esc(exzh)}</small></span></button></div>`).join('')}` : ''}
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
  const Q = pool.slice(0, s.gram && s.gram.length ? 8 : 10).map((t, n) => { const mode = ['hear', 'mean', 'pick'][n % 3], o = new Set([t]);
    while (o.size < Math.min(4, W.length)) o.add(pick(W)); return {t, mode, opts: [...o].sort(() => Math.random() - .5)}; });
  const G = s.gram || [], allG = l.st.flatMap(x => x.gram || []);
  [...G].sort(() => Math.random() - .5).slice(0, 2).forEach(g => { const o = new Set([g]); while (o.size < 4) o.add(pick(allG));
    Q.push({t: [g[0], '', g[2], 0, g[6]], g, mode: 'gram', opts: [...o].map(x => [x[0], '', x[2], 0, x[6]]).sort(() => Math.random() - .5)}); });
  Q.forEach(q => { if (q.mode === 'gram') q.t = q.opts.find(o => o[0] === q.g[0]); });
  Q.sort(() => Math.random() - .5);
  let i = 0, right = 0;
  const draw = () => {
    if (i >= Q.length) return arrive(l, s, right);
    const q = Q[i], lab = o => q.mode === 'pick' ? esc(o[0]) : esc(o[2]);
    $app.innerHTML = `<div style="--c:${l.color}"><a class="back" href="#/s/${s.no}">‹ ${esc(s.name)}</a>
      <div class="qtop"><span>${l.code}${s.no.slice(-2)} ${esc(s.name)} · 过关小测</span><span>${i + 1} / ${Q.length}</span></div><div class="bar"><i style="width:${i / Q.length * 100}%"></i></div>
      <div class="qbox">${q.mode === 'hear' ? `<button class="spk" id="spk">🔊</button><small>听一听，是什么意思？</small>`
        : q.mode === 'mean' ? `<div class="kana" style="font-size:42px">${esc(q.t[0])}</div>${q.t[1] ? `<small>${esc(q.t[1])}</small>` : ''}<small>是什么意思？</small>`
        : q.mode === 'gram' ? `<div class="jp" style="font-size:19px;font-weight:700;line-height:2">${RB(q.g[3])}</div><small>${esc(q.g[4])}</small><small>句子里的「${esc(q.g[0])}」是什么意思？</small>`
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
// ---------- 毕业考：一整套真题，每题看解析，错题进错题本 ----------
function examQs(E) {
  const Q = [];
  E.parts.forEach(pt => pt.secs.forEach(sec => {
    [[sec.passage, sec.items], [sec.passage2, sec.items2]].forEach(([ps, its]) => (its || []).forEach(it => Q.push({...it, part: pt.name, h: sec.h, ps, table: sec.table, id: E.id + '|' + Q.length}))); }));
  return Q;
}
const U = t => RB(t).replace(/\[u\]/g, '<u>').replace(/\[\/u\]/g, '</u>').replace(/\n/g, '<br>');
function exam({l, s}, E, Q, only) {
  let i = 0, right = 0; const W = new Set(store.get('wrong', []).map(w => w.id));
  const draw = () => {
    if (i >= Q.length) return only ? wrongBook() : examEnd(l, s, E, right, Q.length);
    const q = Q[i];
    $app.innerHTML = `<div style="--c:${l.color}"><a class="back" href="${only ? '#/wrong' : '#/s/' + s.no}">‹ ${only ? '错题本' : '退出考试'}</a>
      <div class="qtop"><span>${esc(q.part)}</span><span>${i + 1} / ${Q.length}</span></div><div class="bar"><i style="width:${i / Q.length * 100}%"></i></div>
      <div class="ex-h jp">${U(q.h)}</div>
      ${q.ps ? `<details class="ex-ps" open><summary>阅读文章</summary><div class="jp">${U(q.ps)}</div></details>` : ''}
      ${q.table ? `<div class="ex-tb jp"><b>${U(q.table.title)}</b>${q.table.rows.map(r => `<div>${r.map(c => `<span>${U(c)}</span>`).join('')}</div>`).join('')}</div>` : ''}
      <div class="ex-q jp">${U(q.q)}</div>
      <div class="ex-o">${q.o.map((o, j) => `<button class="opt r jp" data-j="${j}"><em>${j + 1}</em>${U(o)}</button>`).join('')}</div><div id="why"></div></div>`;
    $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if ($app.querySelector('.opt.ok')) return;
      const j = +b.dataset.j, good = j === q.a;
      $app.querySelectorAll('.opt')[q.a].classList.add('ok'); if (!good) b.classList.add('no');
      if (good) { right++; OK(); } else { NG(); }
      let wr = store.get('wrong', []); wr = wr.filter(w => w.id !== q.id); if (!good) wr.unshift({id: q.id, st: s.no}); store.set('wrong', wr.slice(0, 500));
      document.getElementById('why').innerHTML = `<div class="ex-why ${good ? 'g' : 'b'}"><b>${good ? '⭕ 答对了' : '❌ 正确答案是 ' + (q.a + 1)}</b><p>${esc(q.why)}</p></div>
        <button class="btn go" id="nx">${i + 1 < Q.length ? '下一题 ›' : '看成绩'}</button>`;
      document.getElementById('nx').onclick = () => { i++; draw(); scrollTo(0, 0); };
    });
  };
  draw();
}
function examEnd(l, s, E, r, n) {
  const pct = Math.round(r / n * 100), pass = pct >= 60, S = stars(), st = pct >= 90 ? 3 : pct >= 75 ? 2 : pass ? 1 : 0;
  store.set('exam_' + s.no, {r, n});
  if (st > (S[s.no] || 0)) { S[s.no] = st; store.set('stars', S); }
  const nl = LINES[LINES.indexOf(l) + 1];
  $app.innerHTML = `<div class="arrive" style="--c:${l.color}">${pass ? `<div class="stamp new"><span class="kana">合格</span><b>${esc(s.name)}駅</b><small>${esc(l.level)} 毕业 · ${new Date().getMonth() + 1}.${new Date().getDate()}</small></div>` : '<div style="font-size:60px;margin-top:20px">💪</div>'}
    <h2>${pass ? `${esc(l.level)} 毕业了！` : '还差一点'}</h2><div class="stars">${[1, 2, 3].map(k => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</div>
    <p style="color:var(--mute);font-size:14px">${esc(E.title)}：答对 ${r} / ${n}（${pct}%）　及格线 60%</p>
    ${pass && nl ? `<a class="btn go" href="#/">🔁 换乘：${esc(nl.name)} · ${esc(nl.level)}</a>` : ''}
    <a class="btn" href="#/wrong">📕 看错题本</a><a class="btn" href="#/s/${s.no}">再考一次</a><a class="btn" href="#/">回到路线图</a></div>`;
  pass ? BELL() : NG(); scrollTo(0, 0);
}
function wrongBook() {
  const all = window.EXAM_N5 ? examQs(EXAM_N5) : [], wr = store.get('wrong', []), Q = wr.map(w => all.find(q => q.id === w.id)).filter(Boolean);
  const x = findSt('N517');
  $app.innerHTML = `<div style="--c:#e8857a"><a class="back" href="#/">‹ 路线图</a><h2>📕 错题本</h2>
    <p style="color:var(--mute);font-size:13.5px">真题里做错的题都在这里，再做对一次就会自动移出。</p>
    ${store.get('wrong2', []).length ? `<h3>真题库错题 ${store.get('wrong2', []).length} 题</h3>` + store.get('wrong2', []).slice(0, 120).map(q => `<div class="gm" style="margin-top:10px"><small style="color:var(--mute)">${q.lv} ${sessName(q.sess)} · 問題${q.m}</small><div class="jp" style="margin:4px 0">${U(q.q)}</div><div style="font-size:13.5px">正确答案：<b class="jp">${q.a + 1}. ${U(q.o[q.a])}</b></div><div style="font-size:13px;color:#5a514b;margin-top:4px">${esc(q.why)}</div></div>`).join('') : ''}
    ${Q.length ? `<h3>N5 毕业考错题</h3><button class="btn go" id="rw">把 ${Q.length} 道错题再做一遍</button>` + Q.map(q => `<div class="gm" style="margin-top:10px"><small style="color:var(--mute)">${esc(q.part)} · ${esc(q.id.split('|')[0])}</small><div class="jp" style="margin:4px 0">${U(q.q)}</div><div style="font-size:13.5px">正确答案：<b class="jp">${U(q.o[q.a])}</b></div><div style="font-size:13px;color:#5a514b;margin-top:4px">${esc(q.why)}</div></div>`).join('')
      : store.get('wrong2', []).length ? '' : '<div class="card" style="text-align:center;margin-top:14px">还没有错题 👍</div>'}</div>`;
  const b = document.getElementById('rw'); if (b) b.onclick = () => exam(x, EXAM_N5, Q, true);
}
// ---------- 真题库：按级别列出每一场，严格模式（计时、交卷后看答案）/ 学习模式（一题一解析） ----------
const AUD = 'https://ginga-audio-1527476037.cos.ap-guangzhou.myqcloud.com/listen/';
const LVC = {N1: '#7b5bb6', N2: '#2fa94e', N3: '#b7a66e', N4: '#ee7b1a', N5: '#1f6fb8'};
function bankList(lv) {
  const B = window.BANK || [], lvs = ['N1', 'N2', 'N3', 'N4', 'N5'].filter(x => B.some(b => b[0] === x)); lv = lv || lvs[0];
  const done = store.get('bank_done', {});
  $app.innerHTML = `<div style="--c:${LVC[lv]}"><a class="back" href="#/">‹ 首页</a><h2>📚 真题库</h2>
    <p style="color:var(--mute);font-size:13.5px">历年 JLPT 真题，答案逐题对照标准答案，每题都有中文解析。共 ${B.length} 套、${B.reduce((a, b) => a + b[2], 0)} 题。</p>
    <div class="bk-tabs">${lvs.map(x => `<a href="#/bank/${x}" class="${x === lv ? 'on' : ''}" style="--c:${LVC[x]}">${x}<small>${B.filter(b => b[0] === x).length} 套</small></a>`).join('')}</div>
    <div class="bk-grid">${B.filter(b => b[0] === lv).sort((a, b) => b[1].localeCompare(a[1])).map(([l, ss, n]) => { const d = done[l + '_' + ss];
      return `<a class="bk-card" href="#/exam/${l}_${ss}"><small>${l} · ${n} 题</small><b>${sessName(ss)}</b>${(window.BANK.find(b => b[0] === l && b[1] === ss) || [])[3] ? '<small class="bk-l">🎧 含听力</small>' : ''}${d ? `<em>上次 ${d.r}/${d.n}</em>` : '<em class="new">未做</em>'}</a>`; }).join('')}</div></div>`;
}
async function bankLoad(id) { try { const r = await fetch('bank/' + id + '.json'); return await r.json(); } catch (e) { toast('加载失败，检查一下网络'); return null; } }
async function bankIntro(id) {
  const d = await bankLoad(id); if (!d) return; const c = LVC[d.lv];
  const ms = [...new Set(d.qs.map(q => q.m))];
  $app.innerHTML = `<div style="--c:${c}"><a class="back" href="#/bank/${d.lv}">‹ 真题库</a>
    <div class="card ex-intro"><div style="font-size:40px">📖</div><h2>${sessName(d.sess)} JLPT ${d.lv}</h2>
    <p>整套 ${d.qs.length} 题 · 文字词汇 / 文法 / 读解${d.qs.some(q => q.au) ? ' / 听力' : ''}</p><div class="ex-box">${ms.map(m => `<span>${m > 20 ? '' : /N[345]/.test(d.lv) ? (m > 10 ? '文法・読解 ' : '文字・語彙 ') : ''}問題${m > 20 ? m - 20 : /N[345]/.test(d.lv) && m > 10 ? m - 10 : m}　${esc(d.mondai[m] || '')}　${d.qs.filter(q => q.m === m).length} 题</span>`).join('')}</div></div>
    <button class="bk-mode" id="m1"><em>严格模式</em><b>模拟真实考试</b><span>全卷计时、统一交卷，做的时候不看答案，交卷后看成绩和每题解析。</span></button>
    <button class="bk-mode g" id="m2"><em>学习模式</em><b>边做题，边看解析</b><span>不计时，每做完一题马上看正确答案、为什么选、四个选项逐项解析。</span></button></div>`;
  document.getElementById('m1').onclick = () => bankRun(d, true);
  document.getElementById('m2').onclick = () => bankRun(d, false);
}
function bankRun(d, strict) {
  const c = LVC[d.lv], Q = d.qs, ans = {}, t0 = Date.now(); let i = 0, tick;
  const mn = m => (m > 20 ? m - 20 : /N[345]/.test(d.lv) && m > 10 ? m - 10 : m), head = q => `問題${mn(q.m)}　${esc(d.mondai[q.m] || '')}`;
  const optsHtml = (q, show, pick) => q.o.map((o, j) => `<button class="opt r jp${show && j === q.a ? ' ok' : ''}${show && pick === j && j !== q.a ? ' no' : ''}${!show && pick === j ? ' sel' : ''}" data-j="${j}"><em>${j + 1}</em>${U(o)}</button>`).join('');
  const scHtml = q => q.sc ? `<details class="ex-ps"><summary>📜 听力原文</summary><div class="jp">${esc(q.sc).replace(/\n/g, '<br>')}</div></details>` : '';
  const whyHtml = (q, pick) => scHtml(q) + `<div class="ex-why ${pick === q.a ? 'g' : 'b'}"><b>${pick === undefined ? '正确答案是 ' + (q.a + 1) : pick === q.a ? '⭕ 答对了' : '❌ 正确答案是 ' + (q.a + 1)}</b><p>${esc(q.why)}</p>
    ${q.ow.length === 4 ? `<div class="ow">${q.ow.map((w, j) => `<div class="${j === q.a ? 'ok' : ''}"><em>${j + 1}</em>${esc(w)}</div>`).join('')}</div>` : ''}</div>`;
  const record = (q, pick) => { let wr = store.get('wrong2', []); const id = d.lv + '_' + d.sess + '|' + q.n; wr = wr.filter(w => w.id !== id);
    if (pick !== q.a) wr.unshift({id, lv: d.lv, sess: d.sess, m: q.m, q: q.q, o: q.o, a: q.a, why: q.why, ow: q.ow}); store.set('wrong2', wr.slice(0, 800)); };
  const draw = () => {
    if (i >= Q.length) return finish();
    const q = Q[i], ps = q.p && d.ps[q.p];
    $app.innerHTML = `<div style="--c:${c}"><a class="back" href="#/exam/${d.lv}_${d.sess}">‹ 退出</a>
      <div class="qtop"><span>${d.lv} ${sessName(d.sess)} · ${strict ? '严格模式' : '学习模式'}</span><span>${strict ? `<b id="tm">00:00</b>　` : ''}${i + 1} / ${Q.length}</span></div>
      <div class="bar"><i style="width:${i / Q.length * 100}%"></i></div>
      <div class="ex-h jp">${head(q)}</div>${ps ? `<details class="ex-ps" ${q.p !== (Q[i - 1] || {}).p ? 'open' : ''}><summary>阅读文章</summary><div class="jp">${U(ps)}</div></details>` : ''}
      ${q.au ? `<div class="au"><span>🎧 听一遍再作答，可以反复播放</span><audio controls preload="auto" src="${AUD + q.au}"></audio></div>` : ''}
      <div class="ex-q jp"><small>${q.d || q.n}.</small> ${U(q.q)}</div><div class="ex-o">${optsHtml(q, false, ans[q.n])}</div><div id="why"></div>
      ${strict ? `<div class="bk-nav"><button class="btn" id="pv" ${i ? '' : 'disabled'}>‹ 上一题</button><button class="btn go" id="nx">${i + 1 < Q.length ? '下一题 ›' : '交卷'}</button></div>` : ''}</div>`;
    if (strict) { document.getElementById('pv').onclick = () => { i--; draw(); }; document.getElementById('nx').onclick = () => { if (i + 1 >= Q.length && Object.keys(ans).length < Q.length && !confirm2()) return; i++; draw(); scrollTo(0, 0); }; }
    $app.querySelectorAll('.opt').forEach(b => b.onclick = () => { const j = +b.dataset.j;
      if (strict) { ans[q.n] = j; $app.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', +x.dataset.j === j)); return; }
      if (ans[q.n] !== undefined) return; ans[q.n] = j; record(q, j); j === q.a ? OK() : NG();
      $app.querySelector('.ex-o').innerHTML = optsHtml(q, true, j);
      document.getElementById('why').innerHTML = whyHtml(q, j) + kNodes(q) + markBar(d, q) + `<button class="btn go" id="nx">${i + 1 < Q.length ? '下一题 ›' : '看成绩'}</button>`; bindMarks($app, d);
      document.getElementById('nx').onclick = () => { i++; draw(); scrollTo(0, 0); }; });
  };
  const confirm2 = () => { toast(`还有 ${Q.length - Object.keys(ans).length} 题没做，再点一次「交卷」就交`); const k = confirm2.k; confirm2.k = true; return k; };
  if (strict) tick = setInterval(() => { const e = document.getElementById('tm'); if (!e) return; const s = (Date.now() - t0) / 1000 | 0; e.textContent = `${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);
  const finish = () => { clearInterval(tick); const r = Q.filter(q => ans[q.n] === q.a).length, D = store.get('bank_done', {}); D[d.lv + '_' + d.sess] = {r, n: Q.length}; store.set('bank_done', D);
    if (strict) Q.forEach(q => record(q, ans[q.n]));
    const ms = [...new Set(Q.map(q => q.m))], min = (Date.now() - t0) / 60000 | 0;
    $app.innerHTML = `<div style="--c:${c}"><a class="back" href="#/bank/${d.lv}">‹ 真题库</a><div class="card ex-intro"><div style="font-size:44px">${r / Q.length >= .6 ? '🎉' : '💪'}</div>
      <h2>${r} / ${Q.length}（${Math.round(r / Q.length * 100)}%）</h2><p>${sessName(d.sess)} ${d.lv}${strict ? ` · 用时 ${min} 分钟` : ''}</p>
      <div class="ex-box">${ms.map(m => { const qs = Q.filter(q => q.m === m), ok = qs.filter(q => ans[q.n] === q.a).length; return `<span>問題${m} ${esc(d.mondai[m] || '')}　${ok}/${qs.length}</span>`; }).join('')}</div></div>
      ${strict ? `<h3>逐题解析</h3>` + Q.map(q => `<div class="gm"><div class="jp" style="font-weight:700">${q.n}. ${U(q.q)}</div><div style="font-size:13px;color:var(--mute);margin:4px 0">你选：${ans[q.n] === undefined ? '没做' : ans[q.n] + 1}</div>${whyHtml(q, ans[q.n])}${kNodes(q)}${markBar(d, q)}</div>`).join('') : ''}
      <a class="btn go" href="#/wrong">📕 错题本</a><a class="btn" href="#/bank/${d.lv}">回到真题库</a></div>`; bindMarks($app, d); scrollTo(0, 0); };
  draw();
}
// ---------- 单词星系：每个词连到真题原句 ----------
const say = t => { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} };
const known = () => new Set(store.get('known', []));
const sessName = s => s.includes('.') ? s.replace('.', '年') + '月' : s + '年';
function wordList(lv, sort, kw, page) {
  const W = window.WORDS || [], K = known(); lv = lv || '全部'; sort = sort || 'cnt';
  let L = W.filter(r => (lv === '全部' || r[3] === lv) && (!kw || r[0].includes(kw) || r[1].includes(kw) || r[2].includes(kw)));
  if (sort === 'kao') L = [...L].sort((a, b) => b[5] - a[5] || b[4] - a[4]);
  const n = (page || 1) * 60, hide = store.get('hide', '');
  $app.innerHTML = `<div style="--c:#c9a24a"><a class="back" href="#/">‹ 首页</a><h2>✦ 单词星系</h2>
    <p style="color:var(--mute);font-size:13.5px">N5–N1 共 ${W.length} 个词，${W.filter(r => r[4]).length} 个在真题里出现过，${W.filter(r => r[5]).length} 个直接当考点考过。点进去看它出现过的每一句真题。</p>
    <div class="wl-hide"><b>一键遮挡</b><button data-h="ja" class="${hide === 'ja' ? 'on' : ''}">遮挡日文</button><button data-h="zh" class="${hide === 'zh' ? 'on' : ''}">遮挡中文</button></div>
    <input id="kw" class="wl-kw" placeholder="搜索单词 / 读音 / 中文" value="${esc(kw || '')}">
    <div class="wl-f">${['全部', 'N1', 'N2', 'N3', 'N4', 'N5'].map(x => `<button data-lv="${x}" class="${x === lv ? 'on' : ''}">${x}</button>`).join('')}
      <select id="so"><option value="cnt" ${sort === 'cnt' ? 'selected' : ''}>按出现次数</option><option value="kao" ${sort === 'kao' ? 'selected' : ''}>按考点次数</option></select></div>
    <p class="wl-n">${L.length} 个词</p>
    <div class="wl ${hide ? 'hide-' + hide : ''}">${L.slice(0, n).map(r => `<a class="wl-r" href="#/w/${encodeURIComponent(r[0])}"><span class="wl-w"><b class="jp">${esc(r[0])}</b><small>${esc(r[1])}</small></span><span class="wl-zh">${esc(r[2])}</span>
      <span class="wl-s"><em class="lv">${r[3]}</em>${r[4] ? `出现 ${r[4]} 次` : '真题未出现'}${r[5] ? ` · 考点 ${r[5]} 次` : ''}</span>${K.has(r[0]) ? '<i class="wl-k">✓</i>' : ''}</a>`).join('')}</div>
    ${L.length > n ? `<button class="btn" id="more">再看 60 个</button>` : ''}</div>`;
  const go2 = (a = lv, b = sort, c = kw, d = 1) => wordList(a, b, c, d);
  $app.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => go2(b.dataset.lv));
  $app.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { store.set('hide', hide === b.dataset.h ? '' : b.dataset.h); go2(); });
  document.getElementById('so').onchange = e => go2(lv, e.target.value);
  const k = document.getElementById('kw'); k.onchange = () => go2(lv, sort, k.value.trim());
  const m = document.getElementById('more'); if (m) m.onclick = () => { const y = scrollY; go2(lv, sort, kw, (page || 1) + 1); scrollTo(0, y); };
}
async function wordPage(w) {
  const r = (window.WORDS || []).find(x => x[0] === w); if (!r) return wordList();
  let C = [], CO = []; try { const x = (await (await fetch(`nodes/ctx_${r[3]}.json`)).json())[w] || {}; C = x.c || []; CO = x.co || []; } catch (e) {}
  const K = known(), hl = t => esc(t).replace(new RegExp(esc(w.split('/')[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), m => `<mark>${m}</mark>`);
  $app.innerHTML = `<div style="--c:#c9a24a"><a class="back" href="#/words">‹ 单词星系</a>
    <div class="wn"><div class="wn-h"><span>✦</span><div><small>WORD NODE</small><b>单词详情</b></div><em>${r[3]}</em></div>
      <div class="wn-w jp">${esc(r[0])}</div><div class="wn-r">${esc(r[1])}</div>
      <div class="wn-zh"><small>中文释义</small>${esc(r[2])}</div>
      <div class="wn-b"><button id="sp">🔊 听发音</button><button id="kn" class="${K.has(w) ? 'on' : ''}">${K.has(w) ? '✓ 已掌握' : '☐ 已掌握'}</button></div>
      <div class="wn-g"><div><small>累计出现</small><b>${r[4]} 次</b></div><div><small>作为考点</small><b>${r[5]} 次</b></div><div><small>首次</small><b>${r[6] ? sessName(r[6]) : '—'}</b></div><div><small>最近</small><b>${r[7] ? sessName(r[7]) : '—'}</b></div></div></div>
    <h3>① 真题原文语境 <small style="font-size:12px;color:var(--mute);font-weight:600">${C.length ? `最近的 ${C.length} 句` : '真题里还没出现过'}</small></h3>
    ${C.map(([sid, n, m, kind, t]) => `<div class="wc"><small>${sid.split('_')[0]} · ${sessName(sid.split('_')[1])} · 問題${m} · 第${n}题${kind === 'p' ? ' · 文章' : kind === 'o' ? ' · 选项' : ''}</small><div class="jp">${hl(t)}</div><a href="#/q/${sid}/${n}">独立做题 ›</a></div>`).join('')}
    <h3>② 所属级别</h3><a class="wc-tag" href="#/words">${r[3]} 单词星系</a>
    ${CO.length ? `<h3>③ 真题共现单词 <small style="font-size:12px;color:var(--mute);font-weight:600">在同一道题里一起出现，按次数排</small></h3><div class="kn">${CO.map(([x, n]) => `<a href="#/w/${encodeURIComponent(x)}">${esc(x)} · ${n}题</a>`).join('')}</div>` : ''}</div>`;
  document.getElementById('sp').onclick = () => say(r[1] || r[0]);
  document.getElementById('kn').onclick = () => { const k = known(); k.has(w) ? k.delete(w) : k.add(w); store.set('known', [...k]); wordPage(w); };
}
async function oneQ(id, n) {
  const d = await bankLoad(id); if (!d) return; const i = d.qs.findIndex(q => q.n === +n); if (i < 0) return bankIntro(id);
  bankRun({...d, qs: [d.qs[i]]}, false);
}
const kNodes = q => (q.k && q.k.length) || (q.g && q.g.length) ? `<div class="kn"><small>本题知识节点 · 点击查看</small>${(q.g || []).map(g => `<a class="g" href="#/g/${encodeURIComponent(g)}">文法 · ${esc(g.split('|')[1])}</a>`).join('')}${(q.k || []).map(w => `<a href="#/w/${encodeURIComponent(w)}">词 · ${esc(w)}</a>`).join('')}</div>` : '';
// 加入我的收藏：难题 / 易混题 / 想再看（错题自动收）
const MK = {hard: '难题', mix: '易混题', again: '想再看'};
const marks = () => store.get('marks', {});
const markBar = (d, q) => { const id = d.lv + '_' + d.sess + '|' + q.n, m = marks()[id] || [];
  return `<div class="mk" data-id="${id}"><small>☆ 加入我的收藏（再点一次取消）</small>${Object.entries(MK).map(([k, n]) => `<button data-k="${k}" class="${m.includes(k) ? 'on' : ''}">${m.includes(k) ? '★' : '☆'} ${n}</button>`).join('')}</div>`; };
function bindMarks(root, d) {
  root.querySelectorAll('.mk button').forEach(b => b.onclick = () => { const id = b.parentElement.dataset.id, n = +id.split('|')[1], q = d.qs.find(x => x.n === n), M = marks(), m = M[id] || [], k = b.dataset.k;
    M[id] = m.includes(k) ? m.filter(x => x !== k) : [...m, k]; if (!M[id].length) delete M[id]; store.set('marks', M);
    const S = store.get('marked', {}); if (M[id]) S[id] = {lv: d.lv, sess: d.sess, m: q.m, q: q.q, o: q.o, a: q.a, why: q.why}; else delete S[id]; store.set('marked', S);
    b.classList.toggle('on'); b.textContent = (b.classList.contains('on') ? '★ ' : '☆ ') + MK[k]; });
}
function mine(tab) {
  tab = tab || 'hard'; const M = marks(), S = store.get('marked', {}), L = Object.keys(M).filter(id => M[id].includes(tab) && S[id]);
  $app.innerHTML = `<div style="--c:#c9a24a"><a class="back" href="#/">‹ 首页</a><h2>⭐ 我的收藏</h2>
    <div class="bk-tabs">${Object.entries(MK).map(([k, n]) => `<a href="#/mine/${k}" class="${k === tab ? 'on' : ''}">${n}<small>${Object.keys(M).filter(id => M[id].includes(k)).length} 题</small></a>`).join('')}<a href="#/wrong">错题<small>${store.get('wrong2', []).length} 题</small></a></div>
    ${L.length ? L.map(id => { const q = S[id], [sid, n] = id.split('|'); return `<div class="gm" style="margin-top:10px"><small style="color:var(--mute)">${q.lv} ${sessName(q.sess)} · 問題${q.m} · 第${n}题</small><div class="jp" style="margin:4px 0">${U(q.q)}</div><div style="font-size:13.5px">正确答案：<b class="jp">${q.a + 1}. ${U(q.o[q.a])}</b></div><a class="wc-a" href="#/q/${sid}/${n}">再做一次 ›</a></div>`; }).join('')
      : '<div class="card" style="text-align:center;margin-top:14px">还没有收藏。做题时点「☆ 难题 / 易混题 / 想再看」就会存到这里。</div>'}</div>`;
}
// ---------- 语法星系 ----------
function gramList(lv, sort, kw) {
  const G = window.GRAMS || []; lv = lv || '全部'; sort = sort || 'cnt'; const hide = store.get('hide', '');
  let L = G.filter(r => (lv === '全部' || r[1] === lv) && (!kw || r[0].includes(kw) || r[2].includes(kw)));
  L = [...L].sort(sort === 'kao' ? (a, b) => b[8] - a[8] || b[7] - a[7] : (a, b) => b[11] - a[11] || b[7] - a[7]);
  $app.innerHTML = `<div style="--c:#d98aa8"><a class="back" href="#/">‹ 首页</a><h2>△ 语法星系</h2>
    <p style="color:var(--mute);font-size:13.5px">共 ${G.length} 个文法，${G.filter(r => r[7]).length} 个在真题里出现过，${G.filter(r => r[8]).length} 个当正确答案考过。</p>
    <div class="wl-hide"><b>一键遮挡</b><button data-h="ja" class="${hide === 'ja' ? 'on' : ''}">遮挡日文</button><button data-h="zh" class="${hide === 'zh' ? 'on' : ''}">遮挡中文</button></div>
    <input id="kw" class="wl-kw" placeholder="搜索文法，比如 ざるを得ない、について" value="${esc(kw || '')}">
    <div class="wl-f">${['全部', 'N1', 'N2', 'N3', 'N4', 'N5'].map(x => `<button data-lv="${x}" class="${x === lv ? 'on' : ''}">${x}</button>`).join('')}
      <select id="so"><option value="cnt" ${sort === 'cnt' ? 'selected' : ''}>按出现场次</option><option value="kao" ${sort === 'kao' ? 'selected' : ''}>按考查次数</option></select></div>
    <p class="wl-n">${L.length} 个文法${lv === 'N4' && !L.length ? '（N4 文法正在整理）' : ''}</p>
    <div class="wl ${hide ? 'hide-' + hide : ''}">${L.slice(0, 120).map(r => `<a class="wl-r" href="#/g/${encodeURIComponent(r[1] + '|' + r[0])}"><span class="wl-w"><b class="jp">${esc(r[0])}</b></span><span class="wl-zh">${esc(r[2])}</span>
      <span class="wl-s"><em class="lv">${r[1]}</em>${r[11] ? `${r[11]} 场出现` : '真题未出现'}${r[8] ? ` · 考查 ${r[8]} 次` : ''}</span></a>`).join('')}</div></div>`;
  $app.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => gramList(b.dataset.lv, sort, kw));
  $app.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { store.set('hide', hide === b.dataset.h ? '' : b.dataset.h); gramList(lv, sort, kw); });
  document.getElementById('so').onchange = e => gramList(lv, e.target.value, kw);
  const k = document.getElementById('kw'); k.onchange = () => gramList(lv, sort, k.value.trim());
}
async function gramPage(key) {
  const [lv, g] = key.split('|'), r = (window.GRAMS || []).find(x => x[1] === lv && x[0] === g); if (!r) return gramList();
  let C = []; try { C = (await (await fetch('nodes/gctx.json')).json())[key] || []; } catch (e) {}
  $app.innerHTML = `<div style="--c:#d98aa8"><a class="back" href="#/grams">‹ 语法星系</a>
    <div class="wn"><div class="wn-h"><span style="color:#e9a6c0;background:rgba(233,166,192,.15)">△</span><div><small>GRAMMAR NODE</small><b>文法详情</b></div><em style="color:#e9a6c0;border-color:#e9a6c0">${lv}</em></div>
      <div class="wn-w jp" style="font-size:36px">${esc(r[0])}</div>${r[6] ? `<div class="wn-r">${esc(r[6])}</div>` : ''}
      <div class="wn-zh"><small>中文意思</small>${esc(r[2])}</div>
      ${r[3] ? `<div class="wn-zh"><small>接续</small>${esc(r[3])}</div>` : ''}
      ${r[4] ? `<div class="wn-zh"><small>例句</small><span class="jp">${RB(r[4])}</span>${r[5] ? `<br><span style="font-size:13px;color:#b9c4d6">${esc(r[5])}</span>` : ''}</div>` : ''}
      <div class="wn-g"><div><small>真题出现</small><b>${r[11]} 场</b></div><div><small>当正确答案考过</small><b>${r[8]} 次</b></div><div><small>首次</small><b>${r[9] ? sessName(r[9]) : '—'}</b></div><div><small>最近</small><b>${r[10] ? sessName(r[10]) : '—'}</b></div></div></div>
    <h3>① 真题原文语境 <small style="font-size:12px;color:var(--mute);font-weight:600">${C.length ? `最近的 ${C.length} 句` : '真题库里还没出现'}</small></h3>
    ${C.map(([sid, n, m, kind, t]) => `<div class="wc"><small>${sid.split('_')[0]} · ${sessName(sid.split('_')[1])} · 問題${m} · 第${n}题${kind === 'p' ? ' · 文章' : kind === 'o' ? ' · 选项' : ''}</small><div class="jp">${esc(t)}</div><a href="#/q/${sid}/${n}">独立做题 ›</a></div>`).join('')}</div>`;
}
// ---------- 数据看板 ----------
function dashboard() {
  const W = window.WORDS || [], B = window.BANK || [], STOP = new Set(['こと', 'もの', 'ため', 'よう', 'とき', 'ところ', 'わけ', 'はず', '思う', '考える', '言う', '人間', '自分', '社会', '必要', '筆者', '問題', '場合', 'いく', 'さん', '良い', '一部']),
    top = W.filter(r => (r[3] === 'N1' || r[3] === 'N2') && r[0].length > 1 && !STOP.has(r[0])).sort((a, b) => b[8] - a[8] || b[4] - a[4]).slice(0, 15), kt = [...W].sort((a, b) => b[5] - a[5]).slice(0, 15);
  const bar = (L, f, c) => { const mx = Math.max(...L.map(f)); return L.map(r => `<a class="db-r" href="#/w/${encodeURIComponent(r[0])}"><span class="jp">${esc(r[0])}</span><i style="width:${f(r) / mx * 100}%;background:${c}"></i><b>${f(r)}</b></a>`).join(''); };
  $app.innerHTML = `<div style="--c:#5f8fd0"><a class="back" href="#/">‹ 首页</a><h2>📊 考点数据看板</h2>
    <div class="db-k"><div><b>${B.length}</b>套真题</div><div><b>${B.reduce((a, b) => a + b[2], 0)}</b>道题</div><div><b>${W.length}</b>个词</div><div><b>${W.filter(r => r[4]).length}</b>个真题词</div><div><b>${W.filter(r => r[5]).length}</b>个考点词</div></div>
    <div class="card db"><h3>🔥 N1・N2 高频词（按在几场真题里出现过）</h3>${bar(top, r => r[8], '#7fc79a')}</div>
    <div class="card db"><h3>🎯 直接考过的词（N1 文字词汇，按考过的次数）</h3>${bar(kt, r => r[5], '#f2c45a')}</div>
    <div class="card db"><h3>📚 各级别真题</h3>${['N1', 'N2', 'N3', 'N4', 'N5'].map(l => { const x = B.filter(b => b[0] === l); return `<div class="db-l"><b>${l}</b><span>${x.length} 套 · ${x.reduce((a, b) => a + b[2], 0)} 题</span></div>`; }).join('')}</div></div>`;
}
// ---------- 列车种别：按题型集中刷（对应星图的「六种能力」） ----------
const TRAINS = [
  ['kakueki', '各駅停車', '短篇读解', '一站一停，200 字左右的短文，练抓主旨', {N1: [8], N2: [10], N3: [14], N4: [14], N5: [14]}],
  ['kaisoku', '快速', '中篇读解', '跳过小站，500 字左右的中篇，练找原因和观点', {N1: [9], N2: [11], N3: [15], N4: [15], N5: [15]}],
  ['tokkyu', '特急', '长篇・主张读解', '一口气跑完长文，练作者的主张和全文结构', {N1: [10, 12], N2: [13], N3: [16]}],
  ['shinkansen', '新幹線', '综合理解・信息检索', '两篇对比、海报传单，最快找到需要的信息', {N1: [11, 13], N2: [12, 14], N3: [17], N4: [16], N5: [16]}],
  ['shindai', '寝台列車', '听力', '夜行列车上戴上耳机，课题理解、要点理解、即时应答', {N1: [21, 22, 23, 24, 25], N2: [21, 22, 23, 24, 25], N3: [21, 22, 23, 24, 25], N4: [21, 22, 23, 24], N5: [21, 22, 23, 24]}],
];
function trains() {
  $app.innerHTML = `<div style="--c:#c9a24a"><a class="back" href="#/">‹ 首页</a><h2>🚄 列车种别</h2>
    <p style="color:var(--mute);font-size:13.5px">把所有真题里同一种题集中起来练。选一种列车、一个级别，每次随机发车 15 题。</p>
    ${TRAINS.map(([id, n, k, desc, M]) => `<div class="tr"><div class="tr-img" style="background-image:url(img/train/${id}.jpg)"><b>${n}</b><span>${k}</span></div>
      <p>${desc}</p><div class="tr-lv">${Object.keys(M).map(lv => `<a href="#/train/${id}/${lv}" style="--c:${LVC[lv]}">${lv}</a>`).join('')}</div></div>`).join('')}</div>`;
}
async function trainRun(id, lv) {
  const T = TRAINS.find(t => t[0] === id); if (!T || !T[4][lv]) return trains();
  $app.innerHTML = '<p style="text-align:center;margin-top:40px;color:var(--mute)">🚄 发车准备中…</p>';
  const ids = (window.BANK || []).filter(b => b[0] === lv).map(b => b[0] + '_' + b[1]); const ms = T[4][lv];
  const all = await Promise.all(ids.map(i => fetch('bank/' + i + '.json').then(r => r.json()).catch(() => null)));
  const ps = {}, pool = [];
  all.filter(Boolean).forEach(d => d.qs.filter(q => ms.includes(q.m)).forEach(q => { if (q.p) ps[d.sess + '/' + q.p] = d.ps[q.p];
    pool.push({...q, p: q.p ? d.sess + '/' + q.p : null, src: d.sess}); }));
  if (!pool.length) { $app.innerHTML = '<p style="text-align:center;margin-top:40px">这个级别还没有这类题</p>'; return; }
  // 按文章成组抽，同一篇文章的题放在一起
  const groups = {}; pool.forEach(q => (groups[q.p || q.src + q.n] = groups[q.p || q.src + q.n] || []).push(q));
  const G = Object.values(groups).sort(() => Math.random() - .5), qs = [];
  for (const g of G) { if (qs.length >= 15) break; qs.push(...g); }
  qs.forEach((q, i) => { q.d = q.d || q.n; q.n = i + 1; });
  const m0 = all.find(Boolean);
  bankRun({lv, sess: T[1], mondai: m0 ? m0.mondai : {}, ps, qs, train: true}, false);
}
function arrive(l, s, right) {
  const st = right >= 10 ? 3 : right >= 9 ? 2 : right >= 8 ? 1 : 0, S = stars(), first = !S[s.no] && st;
  if (st > (S[s.no] || 0)) { S[s.no] = st; store.set('stars', S); store.set('pt', store.get('pt', 0) + st * 5); }
  const nx = l.st[l.st.indexOf(s) + 1], nl = LINES[LINES.indexOf(l) + 1];
  $app.innerHTML = `<div class="arrive" style="--c:${l.color}">
    ${st ? `<div class="stamp${first ? ' new' : ''}${IMG(s.no) ? ' pic' : ''}" ${IMG(s.no) ? `style="background-image:url(img/st/${s.no}_s.jpg)"` : ''}><span class="kana">${esc(mark(s))}</span><b>${esc(s.name)}駅</b><small>${esc(s.theme)} · ${new Date().getMonth() + 1}.${new Date().getDate()}</small></div>` : ''}
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
    <div class="sbook" style="--c:${l.color}">${l.st.map(s => `<a href="#/s/${s.no}" class="stamp${S[s.no] ? '' : ' no'}${S[s.no] && IMG(s.no) ? ' pic' : ''}" ${S[s.no] && IMG(s.no) ? `style="background-image:url(img/st/${s.no}_s.jpg)"` : ''}><span class="kana">${S[s.no] ? esc(mark(s)) : '?'}</span><b>${esc(s.name)}</b><small>${S[s.no] ? '★'.repeat(S[s.no]) : l.code + s.no.slice(-2)}</small></a>`).join('')}</div>`).join('');
}
function go() {
  if (location.hash === '#map') { const m = document.getElementById('bigmap'); if (m) { m.scrollIntoView({behavior: 'smooth'}); return; } }
  au.pause(); const m = location.hash.match(/^#\/s\/(\w+)/);
  if (m) station(m[1]); else if (location.hash === '#/stamps') stampBook(); else if (location.hash === '#/wrong') wrongBook();
  else if (location.hash.startsWith('#/words')) wordList();
  else if (location.hash.startsWith('#/w/')) wordPage(decodeURIComponent(location.hash.slice(4)));
  else if (location.hash.startsWith('#/q/')) oneQ(...location.hash.slice(4).split('/'));
  else if (location.hash === '#/data') dashboard();
  else if (location.hash === '#/trains') trains();
  else if (location.hash.startsWith('#/train/')) trainRun(...location.hash.slice(8).split('/'));
  else if (location.hash.startsWith('#/grams')) gramList();
  else if (location.hash.startsWith('#/g/')) gramPage(decodeURIComponent(location.hash.slice(4)));
  else if (location.hash.startsWith('#/mine')) mine(location.hash.split('/')[2]);
  else if (location.hash.startsWith('#/bank')) bankList(location.hash.split('/')[2]);
  else if (location.hash.startsWith('#/exam/')) bankIntro(location.hash.slice(7)); else home();
  scrollTo(0, 0);
}
addEventListener('hashchange', go);
// 链接指向当前网址时（比如小测里的「‹ 渋谷」），浏览器不会触发 hashchange，这里手动重新打开
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); go(); } });
go();
