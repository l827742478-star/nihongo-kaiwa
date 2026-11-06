const D = window.DATA, $app = document.getElementById('app'), P = document.getElementById('player');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const src = k => 'audio/' + k + '.mp3';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('ky_' + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ky_' + k, JSON.stringify(v)); } catch (e) {} }
};
let rate = store.get('rate', 1);

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
function play(k, done, r) {
  onEnd = done || null;
  P.src = src(k); P.playbackRate = r || rate; P.play().catch(() => {});
}
P.addEventListener('ended', () => { const f = onEnd; onEnd = null; f && f(); });
function stop() { onEnd = null; P.pause(); }

// ---------- router ----------
function route() {
  stop(); stopRec();
  const v = location.hash.match(/^#\/v\/(\d+)/);
  const vv = v && (window.VLOG || []).find(x => x.no === v[1]);
  if (vv) { vlogPage(vv); window.scrollTo(0, 0); return; }
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
  </section>${vlogShelf()}<div class="route">`;
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
  const c = lineOf(sc);
  let h = `<div class="scene" style="--c:${c}"><a class="back" href="#/">${ic('left', 16)}全部场景</a>
  <div class="sh"><small>第 ${+sc.no} 站　${esc(gname(sc.group))}</small><h2>${esc(sc.name)}</h2></div>
  <nav class="tabs">`;
  sc.dialogues.forEach((d, i) => h += `<a class="tab${tab === 'd' && di === i ? ' on' : ''}" href="#/s/${sc.no}/d/${i}">会话 ${i + 1}</a>`);
  [['x', '日本人怎么说'], ['l', '听不懂的日语'], ['v', '场景词汇']].forEach(([k, n]) => h += `<a class="tab${tab === k ? ' on' : ''}" href="#/s/${sc.no}/${k}">${n}</a>`);
  const done = store.get('done', {});
  h += `</nav><div id="body"></div>
  <button class="btn done-btn${done[sc.no] ? ' is' : ''}" id="markDone">${done[sc.no] ? ic('check', 18) + '这一站已学完' : '这一站学完了'}</button></div>`;
  $app.innerHTML = h;
  document.getElementById('markDone').onclick = () => {
    const d = store.get('done', {}); d[sc.no] ? delete d[sc.no] : d[sc.no] = 1; store.set('done', d); route();
  };
  const B = document.getElementById('body');
  if (tab === 'd') dialogue(B, sc, sc.dialogues[di] ? di : 0);
  if (tab === 'x') xv(B, sc);
  if (tab === 'l') listen(B, sc);
  if (tab === 'v') vocab(B, sc);
}

// ---------- 会话：精听 / 跟读 / 听写 ----------
let mode = 'listen';
function dialogue(B, sc, di) {
  const d = sc.dialogues[di];
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
  el.innerHTML = i >= 0 ? `<span class="sw">${esc(d.lines[i].who)}</span>${hide ? '' : `<div class="sj">${esc(d.lines[i].ja)}</div><div class="sz">${esc(d.lines[i].zh)}</div>`}` : '';
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
    ${d.lines.map((l, i) => `<button class="ln${l.who === d.lines[0].who ? '' : ' r'}" data-i="${i}"><span class="who">${esc(l.who)}</span><span class="bub"><span class="ja">${esc(l.ja)}</span><span class="zh">${esc(l.zh)}</span></span></button>`).join('')}</div>
    ${d.notes.length ? `<div class="notes"><h3>这段要注意</h3><ul>${d.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}`;
    const lns = M.querySelectorAll('.ln');
    const mark = i => { lns.forEach((x, j) => x.classList.toggle('cur', j === i)); sub(d, i, view === 'none'); };
    const one = i => { mark(i); play(d.lines[i].a, () => loop1 ? setTimeout(() => one(i), 600) : mark(-1)); };
    const all = i => { if (i >= d.lines.length) return mark(-1); mark(i); play(d.lines[i].a, () => setTimeout(() => all(i + 1), 450)); };
    lns.forEach(x => x.onclick = () => one(+x.dataset.i));
    M.querySelector('#all').onclick = () => { document.getElementById('stage').scrollIntoView({behavior: 'smooth', block: 'start'}); all(0); };
    M.querySelector('#loop').onclick = () => { loop1 = !loop1; draw(); };
    M.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; draw(); });
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
      <div class="who-tag">${esc(l.who)}</div>
      ${dict ? `<textarea id="ta" rows="3" placeholder="听完把这句写下来，汉字、假名都可以"></textarea><div id="res"></div>`
             : `<div class="line"><div class="ja">${esc(l.ja)}</div><div class="zh">${esc(l.zh)}</div></div>`}
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
      $('#ans').onclick = () => { $('#res').innerHTML = `<div class="res">${esc(l.ja)}</div><div class="score">${esc(l.zh)}</div>`; sub(d, i); };
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
    sc.xv.map(x => `<article class="card">
    <h3 class="sit">${esc(x.sit)}</h3>
    <div class="cmp"><div class="book"><span class="lab b">课本</span><s>${esc(x.book)}</s></div>
    <div class="nat"><span class="lab n">日本人</span><div class="row">${pl(x.a1)}<span class="ja">${esc(x.nat)}</span></div></div></div>
    <p class="why">${esc(x.why)}</p>
    <div class="row ex">${pl(x.a2, 1)}<div><div class="ja">${esc(x.ex)}</div><div class="zh">${esc(x.exzh)}</div></div></div></article>`).join('');
  bindPl(B);
}

// ---------- 听不懂的日语 ----------
function listen(B, sc) {
  B.innerHTML = `<p class="intro">日本人说话会省略、会连读。先只听不看，猜猜说的是什么，再点开对答案。</p>` +
    sc.listen.map((x, i) => `<article class="card quiz"><div class="row">${pl(x.a)}<div style="flex:1">
    <div class="qh"><span class="lab k">${esc(x.kind)}</span>第 ${i + 1} 句</div>
    <details><summary>听完了，对答案</summary>
    <div class="ja">${esc(x.ex)}</div><div class="zh">${esc(x.exzh)}</div>
    <p class="why">听到的「${esc(x.hear)}」，完整说法是「${esc(x.full)}」，意思是：${esc(x.zh)}</p></details></div></div></article>`).join('');
  bindPl(B);
}

// ---------- 场景词汇 ----------
function vocab(B, sc) {
  B.innerHTML = `<div class="vgrid">` + sc.vocab.map(v => `<article class="card word">
    <div class="row">${pl(v.a1)}<div><div class="w">${esc(v.w)}</div><div class="kana">${esc(v.kana)}</div></div><div class="mean">${esc(v.zh)}</div></div>
    <div class="row vex">${pl(v.a2, 1)}<div><div class="ja">${esc(v.ex)}</div><div class="zh">${esc(v.exzh)}</div></div></div></article>`).join('') + `</div>`;
  bindPl(B);
}
function bindPl(B) { B.querySelectorAll('[data-a]').forEach(b => b.onclick = () => play(b.dataset.a)); }

route();
