const D = window.DATA, $app = document.getElementById('app'), P = document.getElementById('player');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const src = k => 'audio/' + k + '.mp3';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('ky_' + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ky_' + k, JSON.stringify(v)); } catch (e) {} }
};
let rate = store.get('rate', 1);
// 假名注音：数据里是 {漢字|かんじ}
const R = (o, k) => o[k + 'R'] ? esc(o[k + 'R']).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>') : esc(o[k]);
const setFuri = on => { store.set('furi', on); document.body.classList.toggle('nofuri', !on); };
setFuri(store.get('furi', true));
const setRoma = on => { store.set('roma', on); document.body.classList.toggle('roma', on); };
setRoma(store.get('roma', false));
const furiBtn = () => `<span class="tgl"><button class="furi${store.get('roma', false) ? ' on' : ''}" id="roma">Ro 罗马音</button><button class="furi${store.get('furi', true) ? ' on' : ''}" id="furi">あ 假名</button></span>`;
const bindFuri = () => { const b = document.getElementById('furi'), r = document.getElementById('roma');
  if (b) b.onclick = () => { setFuri(!store.get('furi', true)); b.classList.toggle('on'); };
  if (r) r.onclick = () => { setRoma(!store.get('roma', false)); r.classList.toggle('on'); }; };
// 罗马音：读音来自假名注音，按词断开；助词 は/へ/を 读 wa/e/o
const KR = (() => { const m = {}, A = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょゎ',
  B = 'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa o n ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po a i u e o ya yu yo wa'.split(' ');
  [...A].forEach((c, i) => m[c] = B[i]); return m; })();
function kana2ro(k) {
  k = k.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 96));
  let o = '';
  for (let i = 0; i < k.length; i++) {
    const c = k[i], n = k[i + 1] === ' ' ? k[i + 2] : k[i + 1];
    if (c === 'っ') { const r = KR[n] || ''; o += r === 'chi' || r.startsWith('ch') ? 't' : r[0] || ''; continue; }
    if (c === 'ー') { o += o.slice(-1); continue; }
    if ('ゃゅょ'.includes(n) && KR[c] && 'きしちにひみりぎじびぴ'.includes(c)) { const b = KR[c], y = KR[n];
      o += (b === 'shi' || b === 'chi' || b === 'ji') ? b.slice(0, -1) + y.slice(1) : b.slice(0, -1) + y; i++; continue; }
    if ('ぁぃぅぇぉ'.includes(n) && KR[c]) { o += KR[c].slice(0, -1) + KR[n]; i++; continue; }
    o += KR[c] ?? (/[ぁ-ん]/.test(c) ? '' : c);
  }
  return o;
}
function RM(o) {
  const U = [], src = o.jaR || o.ja, re = /\{([^|{}]+)\|([^{}]+)\}|([\s\S])/g; let m;
  while ((m = re.exec(src))) U.push(m[1] ? {s: m[1], k: m[2]} : {s: m[3], k: m[3]});
  const tok = []; let p = 0;
  (WD.t[o.tk] || '').split(' ').forEach(x => { if (!x) return; const [len, w] = x.split('.'); tok.push({p, w: w === undefined ? null : WD.w[+w], k: ''}); p += +len; });
  if (!tok.length) return '';
  let pos = 0, ti = 0;
  U.forEach(u => { while (ti + 1 < tok.length && tok[ti + 1].p <= pos) ti++; tok[ti].k += u.k; pos += u.s.length; });
  const P = {'、': ',', '。': '.', '？': '?', '！': '!'};
  let out = '';
  tok.forEach((t, n) => { if (!t.k) return;
    const W = t.w, prev = n ? tok[n - 1].w : null;
    let k = t.k.replace(/[、。？！]/g, c => P[c]);
    if (W && W[1] === '助词') { if (k === 'は') k = 'わ'; if (k === 'へ') k = 'え'; }
    const glue = !out || !W || !/[ぁ-んァ-ヶa-zA-Z]/.test(k) || /^[,.?!…]/.test(k) || (prev && prev[1] === '前缀')
      || (W[1] === '助动词' && !['です', 'だ'].includes(W[0])) || W[1] === '后缀' || (W[1] === '助词' && ['て', 'ば', 'たり'].includes(W[0]));
    out += (glue ? '' : ' ') + k; });
  return kana2ro(out).replace(/\s+([,.?!])/g, '$1').trim();
}
const RMh = o => { const r = RM(o); return r ? `<span class="rm">${esc(r)}</span>` : ''; };
// 点词看讲解：会话「这段要注意」里的说法 + 本站词汇，句子里出现就标下划线
function kwList(sc, d) {
  if (d.kw) return d.kw;
  const K = [];
  d.notes.forEach(n => { const m = n.match(/^「([^」]+)」[：:]?\s*(.*)$/); if (!m) return;
    const p = m[1].split(/[〜～…]/).filter(Boolean).sort((a, b) => b.length - a.length)[0];
    if (p && p.length >= 2) K.push({p, t: m[1], x: m[2]}); });
  sc.vocab.forEach(v => { if (v.w.length >= 2 && !/[〜～]/.test(v.w)) K.push({p: v.w, t: v.w, kana: v.kana, x: v.zh, a: v.a1}); });
  return d.kw = K;
}
// 每个词都能点：words.js 里每句的分词「长度.词号」，词号对应 WD.w = [原形, 词性, 中文, 读音]
const WD = window.WD || {w: [], t: {}};
D.forEach(s => s.dialogues.forEach((d, di) => d.lines.forEach((l, i) => { l.tk = s.no + '|' + di + '|' + i; })));
function RK(o, K) {
  K = K || [];
  const U = [], src = o.jaR || o.ja, re = /\{([^|{}]+)\|([^{}]+)\}|([\s\S])/g; let m;
  while ((m = re.exec(src))) U.push(m[1] ? {s: m[1], h: `<ruby>${esc(m[1])}<rt>${esc(m[2])}</rt></ruby>`} : {s: m[3], h: esc(m[3])});
  const plain = U.map(u => u.s).join(''), tag = new Array(plain.length).fill('');
  K.forEach((k, i) => { let j = plain.indexOf(k.p);
    while (j >= 0) { if (tag.slice(j, j + k.p.length).every(x => !x)) tag.fill('k' + i, j, j + k.p.length); j = plain.indexOf(k.p, j + k.p.length); } });
  let at = 0;
  (WD.t[o.tk] || '').split(' ').forEach((x, n) => { if (!x) return; const [len, w] = x.split('.');
    if (w !== undefined) for (let j = at; j < at + +len; j++) if (!tag[j]) tag[j] = 'w' + w + '_' + n;
    at += +len; });
  let out = '', pos = 0, cur = '';
  const open = t => t[0] === 'k' ? `<u class="kw${K[+t.slice(1)].a ? ' w' : ''}" data-k="${t.slice(1)}">` : `<u class="wd" data-w="${t.slice(1).split('_')[0]}">`;
  U.forEach(u => { const t = tag[pos]; pos += u.s.length;
    if (t !== cur) { if (cur) out += '</u>'; if (t) out += open(t); cur = t; }
    out += u.h; });
  return out + (cur ? '</u>' : '');
}
function bindKw(root, K) {
  root.querySelectorAll('.kw[data-k]').forEach(u => u.onclick = e => { e.stopPropagation(); e.preventDefault(); showKw(K[+u.dataset.k]); });
  root.querySelectorAll('.wd[data-w]').forEach(u => u.onclick = e => { e.stopPropagation(); e.preventDefault();
    const [b, pz, zh, rd] = WD.w[+u.dataset.w], sf = u.textContent.replace(/\s/g, '');
    const t = u.cloneNode(true); t.querySelectorAll('rt').forEach(r => r.remove()); const surf = t.textContent;
    showKw({t: b, kana: rd, x: zh || '（这个词暂时没有讲解）', tag: pz, surf: surf !== b ? surf : ''}); });
}
function showKw(k) {
  let p = document.getElementById('pop');
  if (!p) { p = document.createElement('div'); p.id = 'pop'; document.body.appendChild(p); p.onclick = e => { if (e.target === p) p.classList.remove('on'); }; }
  p.innerHTML = `<div class="pop-in"><div class="pop-h">${k.a ? pl(k.a) : ''}<b>${esc(k.t)}</b>${k.kana ? `<small>${esc(k.kana)}</small>` : ''}${k.tag ? `<i class="pop-t">${k.tag}</i>` : ''}<span class="pop-x" role="button">×</span></div>
    <p>${esc(k.x)}</p><small class="pop-f">${k.tag ? (k.surf ? `句子里是「${esc(k.surf)}」，原形是「${esc(k.t)}」` : '点句子里的任何一个词都能看') : k.a ? '场景词汇' : '这段要注意'}</small></div>`;
  p.querySelector('.pop-x').onclick = () => p.classList.remove('on');
  p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => play(b.dataset.a));
  requestAnimationFrame(() => p.classList.add('on'));
}
// 收藏：key = 站|类型|序号
const favs = () => store.get('fav', []);
const isFav = k => favs().includes(k);
const star = k => `<span class="star${isFav(k) ? ' on' : ''}" data-f="${k}" role="button" aria-label="收藏">${isFav(k) ? '★' : '☆'}</span>`;
function bindStar(root) {
  root.querySelectorAll('[data-f]').forEach(b => b.onclick = e => {
    e.stopPropagation(); e.preventDefault();
    const k = b.dataset.f, f = favs(), i = f.indexOf(k);
    i >= 0 ? f.splice(i, 1) : f.unshift(k); store.set('fav', f);
    root.querySelectorAll(`[data-f="${k}"]`).forEach(x => { x.classList.toggle('on', i < 0); x.textContent = i < 0 ? '★' : '☆'; });
  });
}
// 打卡：学过的日子
const day = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
function checkin() { const d = store.get('days', []), t = day(); if (!d.includes(t)) { d.push(t); store.set('days', d.slice(-400)); } }
function streak() {
  const d = new Set(store.get('days', [])), t = new Date(); let n = 0;
  if (!d.has(day(t))) t.setDate(t.getDate() - 1);
  while (d.has(day(t))) { n++; t.setDate(t.getDate() - 1); }
  return n;
}

// ---------- icons (lucide 风格线条图标) ----------
const I = {
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>',
  ear: '<path d="M6 8.5a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7.5a3 3 0 0 1-6 0"/><path d="M15 8.5a3 3 0 0 0-6 0"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  eye: '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
  slow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  loop: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
};
const ic = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

// 每个大类一条「线路色」
const LINE = ['#e8857a', '#e3a948', '#7fb27a', '#9b8fd6', '#6ea9c8', '#d98aa8', '#b8a06a', '#8aa39a'];
const groups = [...new Set(D.map(s => s.group))];
const lineOf = s => LINE[groups.indexOf(s.group) % LINE.length];
const gname = g => g.replace(/^[A-Z]\d*\s*/, '');

// ---------- audio ----------
let onEnd = null;
// 进到一站就把这站的音频先下载好，点的时候直接播放（GitHub 在国内一个文件要等 1～6 秒）
const blobs = {}, loading = {};
function fetchA(k, n = 2) {
  if (blobs[k]) return Promise.resolve(blobs[k]);
  return loading[k] || (loading[k] = fetch(src(k)).then(r => { if (!r.ok) throw 0; return r.blob(); })
    .then(b => blobs[k] = URL.createObjectURL(b))
    .catch(() => { delete loading[k]; if (n > 0) return fetchA(k, n - 1); throw 0; }));
}
function prefetch(ks) {
  ks = [...new Set(ks.filter(Boolean))]; let i = 0;
  const go = () => { if (i < ks.length) fetchA(ks[i++]).catch(() => {}).finally(go); };
  for (let j = 0; j < 4; j++) go();
}
const sceneKeys = sc => [...sc.dialogues.flatMap(d => d.lines.map(l => l.a)), ...sc.xv.flatMap(x => [x.a1, x.a2]), ...sc.listen.map(x => x.a), ...sc.vocab.flatMap(v => [v.a1, v.a2])];
const busy = on => document.body.classList.toggle('aload', on);
let tries = 0;
function play(k, done, r) {
  onEnd = done || null; tries = 0; checkin();
  P.src = blobs[k] || src(k); P.playbackRate = r || rate;
  if (!blobs[k]) { busy(true); fetchA(k).catch(() => {}); }
  P.play().catch(() => {});
}
P.addEventListener('playing', () => busy(false));
P.addEventListener('error', () => { if (P.src.startsWith('blob:') || tries++ > 1) return busy(false); const u = P.src.split('?')[0]; P.src = u + '?r=' + tries; P.play().catch(() => {}); });
P.addEventListener('ended', () => { const f = onEnd; onEnd = null; f && f(); });
function stop() { onEnd = null; P.pause(); busy(false); }

// ---------- router ----------
function route() {
  stop(); stopRec();
  const v = location.hash.match(/^#\/v\/(\d+)/);
  const vv = v && (window.VLOG || []).find(x => x.no === v[1]);
  if (vv) { vlogPage(vv); window.scrollTo(0, 0); return; }
  if (location.hash === '#/fav/c') { cardPage(); window.scrollTo(0, 0); return; }
  if (location.hash.startsWith('#/fav')) { favPage(location.hash === '#/fav/p'); window.scrollTo(0, 0); return; }
  const m = location.hash.match(/^#\/s\/(\d+)(?:\/(\w+))?(?:\/(\d+))?/);
  const sc = m && D.find(s => s.no === m[1]);
  sc ? scene(sc, m[2] || 'd', +(m[3] || 0)) : home();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

// ---------- home: 一条路线图 ----------
function home() {
  const done = store.get('done', {});
  const nDone = D.filter(s => done[s.no]).length;
  const nDia = D.reduce((a, s) => a + s.dialogues.length, 0);
  const next = D.find(s => !done[s.no]) || D[0];
  let h = `<section class="hero">
    <h1>跟着小雨和阿哲<br><span>在日本生活 ${D.length} 天</span></h1>
    <p>从下飞机到交朋友，${nDia} 期会话，每句都有原声。看画面听原音，跟读打分，再听写核对。</p>
    <a class="next" href="#/s/${next.no}" style="--c:${lineOf(next)}">
      <span class="next-pic" style="background-image:url(img/${next.no}-1.jpg)"></span>
      <span class="next-txt"><small>${nDone ? '接着学' : '第一站'}</small><b>${esc(next.name)}</b></span>
      <span class="next-go">${ic('right', 18)}</span>
    </a>
    <div class="meter"><span style="width:${nDone / D.length * 100}%"></span></div>
    <div class="meter-t">已经走过 ${nDone} 站，还剩 ${D.length - nDone} 站</div>
    ${cal()}
    <a class="next" href="#/fav" style="--c:#e3a948;margin-top:14px">
      <span class="next-pic" style="display:flex;align-items:center;justify-content:center;font-size:30px;background:#fbefd2">⭐</span>
      <span class="next-txt"><small>收藏的句子和单词，随时复习</small><b>我的收藏　${favs().length} 条</b></span>
      <span class="next-go">${ic('right', 18)}</span>
    </a>
    <div class="games"><div class="games-h">🎁 赠送 3 个小游戏<small>学累了来玩一局</small></div><div class="games-row">
      <a href="game/" style="--g:#fbe3e1"><i>🏪</i><b>便利店模拟</b><small>当店员，顾客只说日语</small></a>
      <a href="game/kuiz.html" style="--g:#dceaf2"><i>⚡</i><b>听力抢答</b><small>8 秒听出意思</small></a>
      <a href="game/pin.html" style="--g:#dcefd8"><i>🧩</i><b>拼句子</b><small>拼出日本人的说法</small></a>
    </div></div>
  </section><div class="route">`;
  let g = '';
  D.forEach(s => {
    if (s.group !== g) { g = s.group; h += `<div class="line-name" style="--c:${lineOf(s)}"><span>${esc(gname(g))}</span></div>`; }
    h += `<a class="stop${done[s.no] ? ' done' : ''}${s === next ? ' here' : ''}" href="#/s/${s.no}" style="--c:${lineOf(s)}">
      <span class="dot"></span>
      <span class="pic" style="background-image:url(img/${s.no}-1.jpg)"></span>
      <span class="txt"><small>第 ${+s.no} 站${done[s.no] ? '　已学完' : ''}</small><b>${esc(s.name)}</b><em>会话 ${s.dialogues.length} 期　词汇 ${s.vocab.length} 个</em></span>
    </a>`;
  });
  $app.innerHTML = h + '</div>';
}

// ---------- scene ----------
function scene(sc, tab, di) {
  prefetch(sceneKeys(sc));
  const c = lineOf(sc);
  let h = `<div class="scene" style="--c:${c}"><a class="back" href="#/">${ic('left', 16)}全部场景</a>
  <div class="sh">${furiBtn()}<small>第 ${+sc.no} 站　${esc(gname(sc.group))}</small><h2>${esc(sc.name)}</h2></div>
  <nav class="tabs">`;
  sc.dialogues.forEach((d, i) => h += `<a class="tab${tab === 'd' && di === i ? ' on' : ''}" href="#/s/${sc.no}/d/${i}">会话 ${i + 1}</a>`);
  [['x', '日本人怎么说'], ['l', '听不懂的日语'], ['v', '场景词汇']].forEach(([k, n]) => h += `<a class="tab${tab === k ? ' on' : ''}" href="#/s/${sc.no}/${k}">${n}</a>`);
  const done = store.get('done', {});
  h += `</nav><div id="body"></div>
  <button class="btn done-btn${done[sc.no] ? ' is' : ''}" id="markDone">${done[sc.no] ? ic('check', 18) + '这一站已学完' : '这一站学完了'}</button></div>`;
  $app.innerHTML = h; bindFuri();
  document.getElementById('markDone').onclick = () => {
    const d = store.get('done', {}); d[sc.no] ? delete d[sc.no] : (d[sc.no] = 1, checkin()); store.set('done', d); route();
  };
  const B = document.getElementById('body');
  if (tab === 'd') dialogue(B, sc, sc.dialogues[di] ? di : 0, sc.no + '|d|' + (sc.dialogues[di] ? di : 0));
  if (tab === 'x') xv(B, sc);
  if (tab === 'l') listen(B, sc);
  if (tab === 'v') vocab(B, sc);
}

// ---------- 会话：精听 / 跟读 / 听写 ----------
let mode = 'listen';
function dialogue(B, sc, di, fk) {
  const d = sc.dialogues[di]; d.fk = fk; if (sc.vocab) kwList(sc, d);
  d.pic = d.pic || (() => `img/${sc.no}-${di + 1}.jpg`);
  B.innerHTML = `<div class="stage" id="stage">
      <img id="pic" src="${d.pic(0)}" alt="${esc(d.title)}" onerror="this.style.visibility='hidden'" onload="this.style.visibility=''">
      <div class="subs" id="subs"></div>
    </div>
    <div class="task"><b>${esc(d.title)}</b><p>${esc(d.prompt)}</p></div>
    <div class="seg" role="tablist"><button data-m="listen">精听</button><button data-m="shadow">跟读录音</button><button data-m="dict">听写</button></div>
    <div id="mode"></div>`;
  const segs = B.querySelectorAll('.seg button');
  const draw = () => {
    stop(); stopRec(); sub(d, -1);
    segs.forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    const M = document.getElementById('mode');
    if (mode === 'listen') listenMode(M, d);
    else drill(M, d, mode === 'dict');
  };
  segs.forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
  draw();
}
function sub(d, i, hide) {
  const el = document.getElementById('subs'); if (!el) return;
  const pic = document.getElementById('pic');
  if (pic && d.shots && i >= 0) { const u = d.pic(i); if (!pic.src.endsWith(u)) pic.src = u; }
  el.parentNode.classList.toggle('on', i >= 0);
  el.parentNode.classList.toggle('kb', i >= 0 && !hide);
  el.innerHTML = i >= 0 ? `<span class="sw">${esc(d.lines[i].who)}</span>${hide ? '' : `<div class="sj">${R(d.lines[i], 'ja')}</div><div class="sz">${esc(d.lines[i].zh)}</div>`}` : '';
}

const RATES = [[0.75, '慢速'], [1, '常速'], [1.25, '快速']];
function rateSeg() { return `<div class="rate">${RATES.map(([r, n]) => `<button class="${rate === r ? 'on' : ''}" data-rate="${r}">${n}</button>`).join('')}</div>`; }
function bindRate(root, redraw) {
  root.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { rate = +b.dataset.rate; store.set('rate', rate); P.playbackRate = rate; redraw(); });
}

let view = 'both', loop1 = false;
function listenMode(M, d) {
  const draw = () => {
    M.innerHTML = `<div class="bar">
      <button class="btn primary" id="all">${ic('play', 16)}播放全文</button>
      <button class="tog${loop1 ? ' on' : ''}" id="loop">${ic('loop', 16)}单句循环</button>
      ${rateSeg()}</div>
    <div class="views">${[['both', '日语+中文'], ['ja', '只看日语'], ['zh', '只看中文'], ['none', '盲听']].map(([k, n]) => `<button class="${view === k ? 'on' : ''}" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="chat ${view === 'zh' || view === 'none' ? 'hideja' : ''} ${view === 'ja' || view === 'none' ? 'hidezh' : ''}">
    ${d.lines.map((l, i) => `<button class="ln${l.who === d.lines[0].who ? '' : ' r'}" data-i="${i}"><span class="who">${esc(l.who)}</span><span class="bub"><span class="ja">${RK(l, d.kw)}</span>${RMh(l)}<span class="zh">${esc(l.zh)}</span></span>${d.fk ? star(d.fk + '|' + i) : ''}</button>`).join('')}</div>
    <p class="kw-tip">点句子里的<b>任何一个词</b>都能看讲解，<u class="kw">带下划线</u>的是这段要注意的说法</p>
    ${d.notes.length ? `<div class="notes"><h3>这段要注意</h3><ul>${d.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}`;
    const lns = M.querySelectorAll('.ln');
    const mark = i => { lns.forEach((x, j) => x.classList.toggle('cur', j === i)); sub(d, i, view === 'none'); };
    const one = i => { mark(i); play(d.lines[i].a, () => loop1 ? setTimeout(() => one(i), 600) : mark(-1)); };
    const all = i => { if (i >= d.lines.length) return mark(-1); mark(i); play(d.lines[i].a, () => setTimeout(() => all(i + 1), 450)); };
    lns.forEach(x => x.onclick = () => one(+x.dataset.i));
    M.querySelector('#all').onclick = () => { document.getElementById('stage').scrollIntoView({behavior: 'smooth', block: 'start'}); all(0); };
    M.querySelector('#loop').onclick = () => { loop1 = !loop1; draw(); };
    M.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; draw(); });
    bindStar(M); bindKw(M, d.kw);
    bindRate(M, draw);
  };
  draw();
}

// ---------- 录音 ----------
let rec = null, recUrl = null, recChunks = [];
function stopRec() { if (rec && rec.state === 'recording') rec.stop(); if (asr) { try { asr.stop(); } catch (e) {} } }
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let asr = null;
function startASR(onText) {
  if (!SR) return false;
  try {
    asr = new SR(); asr.lang = 'ja-JP'; asr.interimResults = false; asr.continuous = true; asr.maxAlternatives = 1;
    let txt = '';
    asr.onresult = e => { txt = [...e.results].map(r => r[0].transcript).join(''); };
    asr.onerror = e => { asr._err = e.error; };
    asr.onend = () => { const er = asr && asr._err; asr = null; onText(txt, er); };
    asr.start(); return true;
  } catch (e) { asr = null; return false; }
}
function scoreBox(l, txt, er) {
  if (!txt) return `<div class="sbox none">${er === 'not-allowed' || er === 'service-not-allowed' ? '这个浏览器不让用语音识别，没法自动打分。可以按「对比」自己听。' : '没听清你说的话，靠近手机再说一遍试试。'}</div>`;
  const r = diff(l.ja, txt);
  const lv = r.pct >= 90 ? ['说得很好', 'a'] : r.pct >= 70 ? ['不错，再练一遍', 'b'] : ['红色的地方再听听原音', 'c'];
  return `<div class="sbox ${lv[1]}"><div class="sc-n"><b>${r.pct}</b>分</div><div class="sc-t"><b>${lv[0]}</b><div class="res">${r.html}</div><small>识别到：${esc(txt)}</small></div></div>`;
}
async function startRec(onDone) {
  try {
    const st = await navigator.mediaDevices.getUserMedia({audio: true});
    rec = new MediaRecorder(st); recChunks = [];
    rec.ondataavailable = e => recChunks.push(e.data);
    rec.onstop = () => { st.getTracks().forEach(t => t.stop()); if (recUrl) URL.revokeObjectURL(recUrl); recUrl = URL.createObjectURL(new Blob(recChunks, {type: rec.mimeType})); onDone(); };
    rec.start(); return true;
  } catch (e) { const m = document.getElementById('msg'); if (m) m.textContent = '没有拿到麦克风权限。请在浏览器设置里允许这个网页使用麦克风，再点一次录音。'; return false; }
}
function playRec(done) { if (!recUrl) return; onEnd = done || null; P.src = recUrl; P.playbackRate = 1; P.play().catch(() => {}); }

// ---------- 听写核对 ----------
function norm(s) { return s.replace(/[\s　。、，,.！!？?「」『』（）()…・〜~ー－\-：:]/g, '').replace(/[ァ-ン]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
function diff(ans, inp) {
  const a = [...ans], b = [...norm(inp)], A = a.map(c => norm(c));
  const dp = Array.from({length: a.length + 1}, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = A[i] && A[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = '', ok = 0, tot = 0;
  while (i < a.length) {
    if (!A[i]) { out += esc(a[i]); i++; continue; }
    tot++;
    if (j < b.length && A[i] === b[j]) { out += `<span class="g">${esc(a[i])}</span>`; ok++; i++; j++; }
    else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) j++;
    else { out += `<span class="r">${esc(a[i])}</span>`; i++; }
  }
  return {html: out, pct: tot ? Math.round(ok / tot * 100) : 0};
}

// ---------- 跟读 / 听写：一次一句 ----------
function drill(M, d, dict) {
  let i = 0;
  const draw = () => {
    stopRec(); recUrl = null;
    const l = d.lines[i];
    sub(d, i, true);
    M.innerHTML = `<div class="drill">
      <div class="drill-top"><span>第 ${i + 1} 句，共 ${d.lines.length} 句</span>${rateSeg()}</div>
      <div class="steps">${d.lines.map((_, j) => `<i class="${j === i ? 'on' : j < i ? 'past' : ''}"></i>`).join('')}</div>
      <div class="who-tag">${esc(l.who)}${d.fk ? star(d.fk + '|' + i) : l.fk ? star(l.fk) : ''}</div>
      ${dict ? `<textarea id="ta" rows="3" placeholder="听完把这句写下来，汉字、假名都可以"></textarea><div id="res"></div>`
             : `<div class="line"><div class="ja">${RK(l, d.kw)}</div>${RMh(l)}<div class="zh">${esc(l.zh)}</div></div>`}
      <div class="pad">${dict
        ? `<button class="key" id="slow"><span>${ic('slow')}</span>慢放</button>
           <button class="key big blue" id="o"><span>${ic('play', 28)}</span>播放</button>
           <button class="key" id="chk"><span>${ic('check')}</span>核对</button>
           <button class="key" id="ans"><span>${ic('eye')}</span>看答案</button>`
        : `<button class="key" id="o"><span>${ic('play')}</span>原音</button>
           <button class="key big" id="r"><span>${ic('mic', 28)}</span>录音</button>
           <button class="key" id="me" disabled><span>${ic('ear')}</span>回听</button>
           <button class="key" id="cmp" disabled><span>${ic('swap')}</span>对比</button>`}</div>
      ${dict ? '' : '<div id="score"></div>'}
      <p class="hint" id="msg">${dict ? '可以反复播放。写完点核对：绿色是写对的字，红色是漏掉或写错的字。' : '先听原音，再按录音跟着说，说完再按一次停止。'}</p>
    </div>
    <div class="pager"><button class="btn" id="prev" ${i ? '' : 'disabled'}>${ic('left', 16)}上一句</button><button class="btn dark" id="next">${i < d.lines.length - 1 ? '下一句' + ic('right', 16) : '从第一句再来'}</button></div>`;
    const $ = s => M.querySelector(s);
    bindStar(M); bindKw(M, d.kw);
    $('#o').onclick = () => play(l.a);
    $('#prev').onclick = () => { i--; draw(); };
    $('#next').onclick = () => { i = (i + 1) % d.lines.length; draw(); if (dict) setTimeout(() => play(d.lines[i].a), 200); };
    bindRate(M, draw);
    if (dict) {
      $('#slow').onclick = () => play(l.a, null, 0.7);
      $('#chk').onclick = () => {
        const r = diff(l.ja, $('#ta').value);
        $('#res').innerHTML = `<div class="res">${r.html}</div><div class="score"><b>${r.pct}%</b> 写对了　${esc(l.zh)}</div>`;
        sub(d, i);
      };
      $('#ans').onclick = () => { $('#res').innerHTML = `<div class="res">${R(l, 'ja')}</div><div class="score">${esc(l.zh)}</div>`; sub(d, i); };
    } else {
      const r = $('#r');
      r.onclick = async () => {
        if (rec && rec.state === 'recording') { stopRec(); return; }
        stop();
        $('#score').innerHTML = '';
        if (await startRec(() => {
          r.classList.remove('recording'); r.innerHTML = `<span>${ic('mic', 28)}</span>重录`;
          $('#me').disabled = $('#cmp').disabled = false;
          $('#msg').textContent = '按对比：先放原音，再放你的录音，听听哪里不一样。';
        })) {
          r.classList.add('recording'); r.innerHTML = `<span>${ic('stop', 26)}</span>停止`; $('#msg').textContent = '正在录音，说完按停止。';
          if (!startASR((txt, er) => { const s = M.querySelector('#score'); if (s) s.innerHTML = scoreBox(l, txt, er); }))
            $('#score').innerHTML = '<div class="sbox none">这个浏览器不支持自动打分，用苹果手机的 Safari 打开就可以。现在可以按「对比」自己听。</div>';
        }
      };
      $('#me').onclick = () => playRec();
      $('#cmp').onclick = () => play(l.a, () => setTimeout(() => playRec(), 400));
    }
  };
  draw();
}

// ---------- 日本女生日常 vlog ----------
function vlogShelf() {
  const V = window.VLOG || []; if (!V.length) return '';
  return `<section class="shelf"><div class="shelf-h"><b>ゆいの日常</b><span>日本女生自己说的大白话</span></div><div class="shelf-row">` +
    V.map(v => `<a class="vcard" href="#/v/${v.no}"><span class="vpic" style="background-image:url(img/v${v.no}-1.jpg)"><i>${ic('play', 14)}</i></span><b>${esc(v.title)}</b><small>${esc(v.prompt)}　${v.lines.length} 句</small></a>`).join('') + `</div></section>`;
}
function vlogPage(v) {
  v.pic = i => `img/v${v.no}-${(v.lines[i] || v.lines[0]).s}.jpg`;
  $app.innerHTML = `<div class="scene" style="--c:#e8857a"><a class="back" href="#/">${ic('left', 16)}返回首页</a>
    <div class="sh"><small>ゆいの日常　第 ${+v.no} 期</small><h2>${esc(v.title)}</h2></div><div id="body"></div></div>`;
  mode = 'listen';
  dialogue(document.getElementById('body'), {no: 'v' + v.no, dialogues: [v]}, 0);
}

// ---------- 课本vs日本人 ----------
const pl = (a, small) => `<button class="pl${small ? ' s' : ''}" data-a="${a}" aria-label="播放">${ic('play', small ? 12 : 14)}</button>`;
function xv(B, sc) {
  B.innerHTML = `<p class="intro">课本上的说法没有错，只是日本人平时不这么说。先听日本人的说法，再跟着说一遍。</p>` +
    sc.xv.map((x, i) => `<article class="card">${star(sc.no + '|x|' + i)}
    <h3 class="sit">${esc(x.sit)}</h3>
    <div class="cmp"><div class="book"><span class="lab b">课本</span><s>${R(x, 'book')}</s></div>
    <div class="nat"><span class="lab n">日本人</span><div class="row">${pl(x.a1)}<span class="ja">${R(x, 'nat')}</span></div></div></div>
    <p class="why">${esc(x.why)}</p>
    <div class="row ex">${pl(x.a2, 1)}<div><div class="ja">${R(x, 'ex')}</div><div class="zh">${esc(x.exzh)}</div></div></div></article>`).join('');
  bindPl(B);
}

// ---------- 听不懂的日语 ----------
function listen(B, sc) {
  B.innerHTML = `<p class="intro">日本人说话会省略、会连读。先只听不看，猜猜说的是什么，再点开对答案。</p>` +
    sc.listen.map((x, i) => `<article class="card quiz">${star(sc.no + '|l|' + i)}<div class="row">${pl(x.a)}<div style="flex:1">
    <div class="qh"><span class="lab k">${esc(x.kind)}</span>第 ${i + 1} 句</div>
    <details><summary>听完了，对答案</summary>
    <div class="ja">${R(x, 'ex')}</div><div class="zh">${esc(x.exzh)}</div>
    <p class="why">听到的「${esc(x.hear)}」，完整说法是「${esc(x.full)}」，意思是：${esc(x.zh)}</p></details></div></div></article>`).join('');
  bindPl(B);
}

// ---------- 场景词汇 ----------
function vocab(B, sc) {
  B.innerHTML = `<div class="vgrid">` + sc.vocab.map((v, i) => `<article class="card word">${star(sc.no + '|v|' + i)}
    <div class="row">${pl(v.a1)}<div><div class="w">${esc(v.w)}</div><div class="kana">${esc(v.kana)}</div></div><div class="mean">${esc(v.zh)}</div></div>
    <div class="row vex">${pl(v.a2, 1)}<div><div class="ja">${R(v, 'ex')}</div><div class="zh">${esc(v.exzh)}</div></div></div></article>`).join('') + `</div>`;
  bindPl(B);
}
function bindPl(B) { B.querySelectorAll('[data-a]').forEach(b => b.onclick = () => play(b.dataset.a)); bindStar(B); }

// ---------- 打卡日历：这一周 ----------
function cal() {
  const d = new Set(store.get('days', [])), t = new Date(), w = (t.getDay() + 6) % 7, mon = new Date(t); mon.setDate(t.getDate() - w);
  const cells = '一二三四五六日'.split('').map((n, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); const k = day(x);
    return `<span class="${d.has(k) ? 'ok' : ''}${i === w ? ' today' : ''}"><small>${n}</small><i>${d.has(k) ? '✓' : x.getDate()}</i></span>`; }).join('');
  const s = streak(), today = d.has(day(t));
  return `<div class="cal"><div class="cal-h"><b>📅 已连续学习 ${s} 天</b><small>累计 ${d.size} 天${today ? '　今天已打卡 ✓' : '　今天还没学'}</small></div><div class="cal-w">${cells}</div></div>`;
}

// ---------- 我的收藏 ----------
function favItem(k) {
  const [no, t, a, b] = k.split('|'), sc = D.find(s => s.no === no); if (!sc) return null;
  if (t === 'd') { const d = sc.dialogues[+a], l = d && d.lines[+b]; return l && {k, t, sc, ja: R(l, 'ja'), zh: l.zh, a: l.a, line: l, go: `#/s/${no}/d/${a}`}; }
  if (t === 'x') { const x = sc.xv[+a]; return x && {k, t, sc, ja: R(x, 'nat'), zh: x.sit, a: x.a1, line: {who: '日本人怎么说', ja: x.nat, jaR: x.natR, zh: x.sit, a: x.a1}, go: `#/s/${no}/x`}; }
  if (t === 'l') { const x = sc.listen[+a]; return x && {k, t, sc, ja: R(x, 'ex'), zh: x.exzh, a: x.a, line: {who: '听不懂的日语', ja: x.ex, jaR: x.exR, zh: x.exzh, a: x.a}, go: `#/s/${no}/l`}; }
  if (t === 'v') { const v = sc.vocab[+a]; return v && {k, t, sc, ja: `${esc(v.w)}<small class="fk">${esc(v.kana)}</small>`, zh: v.zh, a: v.a1, ex: v, go: `#/s/${no}/v`}; }
}
function favPage(practice) {
  const F = favs().map(favItem).filter(Boolean), S = F.filter(x => x.line);
  let h = `<div class="scene" style="--c:#e3a948"><a class="back" href="${practice ? '#/fav' : '#/'}">${ic('left', 16)}${practice ? '我的收藏' : '返回首页'}</a>
    <div class="sh">${furiBtn()}<small>随时复习</small><h2>${practice ? '收藏的句子 · 跟读' : '我的收藏'}</h2></div>`;
  if (practice) {
    $app.innerHTML = h + '<div id="mode"></div></div>'; bindFuri();
    S.forEach(x => x.line.fk = x.k);
    drill(document.getElementById('mode'), {lines: S.map(x => x.line)}, false); return;
  }
  if (!F.length) h += `<p class="intro">还没有收藏。学的时候看到想记住的句子、单词，点旁边的 ☆ 就会存到这里。</p>`;
  else {
    h += `<div class="fav-btns"><a class="btn primary fav-go" href="#/fav/c">🃏 卡片复习 ${F.length} 个</a>${S.length ? `<a class="btn primary fav-go" href="#/fav/p">${ic('mic', 16)}拿 ${S.length} 句来跟读</a>` : ''}</div>`;
    [['d', '会话句子'], ['x', '日本人怎么说'], ['l', '听不懂的日语'], ['v', '场景词汇']].forEach(([t, n]) => {
      const L = F.filter(x => x.t === t); if (!L.length) return;
      h += `<h3 class="fav-h">${n}<span>${L.length}</span></h3>` + L.map(x => `<article class="card fav">${star(x.k)}
        <div class="row">${pl(x.a)}<div style="flex:1"><div class="ja">${x.ja}</div><div class="zh">${esc(x.zh)}</div>
        ${x.ex ? `<div class="ja s">${R(x.ex, 'ex')}</div><div class="zh">${esc(x.ex.exzh)}</div>` : ''}
        <a class="from" href="${x.go}">第 ${+x.sc.no} 站 · ${esc(x.sc.name)} ›</a></div></div></article>`).join('');
    });
  }
  $app.innerHTML = h + '</div>'; bindFuri();
  F.forEach(x => fetchA(x.a).catch(() => {}));
  bindPl($app);
  $app.querySelectorAll('.fav [data-f]').forEach(b => b.addEventListener('click', () => setTimeout(route, 250)));
}

// ---------- 卡片复习：正面日语，点一下翻到中文；没记住的下一轮再出 ----------
function cardPage() {
  const F = favs().map(favItem).filter(Boolean);
  if (!F.length) { location.hash = '#/fav'; return; }
  const ok = new Set(store.get('card_ok', []));
  let Q = [...F.filter(x => !ok.has(x.k)), ...F.filter(x => ok.has(x.k))], i = 0, got = 0, miss = [];
  const head = `<div class="scene" style="--c:#e3a948"><a class="back" href="#/fav">${ic('left', 16)}我的收藏</a>
    <div class="sh">${furiBtn()}<small>随时复习</small><h2>卡片复习</h2></div><div id="cd"></div></div>`;
  $app.innerHTML = head; bindFuri();
  const B = document.getElementById('cd');
  const draw = () => {
    if (i >= Q.length) {
      B.innerHTML = `<div class="card cd-end"><div class="cd-big">${miss.length ? '💪' : '🎉'}</div><b>这一轮：记住 ${got} 个，没记住 ${miss.length} 个</b>
        ${miss.length ? `<button class="btn primary" id="again">再看一遍没记住的 ${miss.length} 个</button>` : ''}<a class="btn" href="#/fav">回到我的收藏</a></div>`;
      const a = document.getElementById('again'); if (a) a.onclick = () => { Q = miss; miss = []; got = 0; i = 0; draw(); };
      return;
    }
    const x = Q[i];
    B.innerHTML = `<div class="cd-top"><span>第 ${i + 1} 张，共 ${Q.length} 张</span><span>${x.t === 'v' ? '场景词汇' : x.t === 'x' ? '日本人怎么说' : x.t === 'l' ? '听不懂的日语' : '会话句子'}</span></div>
      <div class="steps">${Q.map((_, j) => `<i class="${j === i ? 'on' : j < i ? 'past' : ''}"></i>`).join('')}</div>
      <div class="card cd" id="flip"><div class="cd-f"><div class="ja">${x.ja}</div>${pl(x.a)}</div>
        <div class="cd-b"><div class="zh">${esc(x.zh)}</div>${x.ex ? `<div class="ja s">${R(x.ex, 'ex')}</div><div class="zh">${esc(x.ex.exzh)}</div>` : ''}
        <small class="from">第 ${+x.sc.no} 站 · ${esc(x.sc.name)}</small></div><p class="cd-tip">先想一想意思，再点卡片翻过来</p></div>
      <div class="cd-btns"><button class="btn" id="no" disabled>😵 没记住</button><button class="btn primary" id="yes" disabled>😊 记住了</button></div>`;
    const c = document.getElementById('flip');
    c.onclick = e => { if (e.target.closest('[data-a]')) return; c.classList.add('on'); document.getElementById('no').disabled = document.getElementById('yes').disabled = false; };
    bindPl(B); play(x.a);
    const mark = y => { y ? (ok.add(x.k), got++) : (ok.delete(x.k), miss.push(x)); store.set('card_ok', [...ok]); i++; draw(); };
    document.getElementById('yes').onclick = () => mark(true);
    document.getElementById('no').onclick = () => mark(false);
  };
  draw();
}

route();
