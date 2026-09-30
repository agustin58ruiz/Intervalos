(function(){
  const NAMES = ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
  const INTERVALS = [
    {s:0, name:'Unísono', short:'Unísono'},
    {s:1, name:'Segunda menor', short:'2ª menor'},
    {s:2, name:'Segunda mayor', short:'2ª mayor'},
    {s:3, name:'Tercera menor', short:'3ª menor'},
    {s:4, name:'Tercera mayor', short:'3ª mayor'},
    {s:5, name:'Cuarta justa', short:'4ª justa'},
    {s:6, name:'Tritono', short:'Tritono'},
    {s:7, name:'Quinta justa', short:'5ª justa'},
    {s:8, name:'Sexta menor', short:'6ª menor'},
    {s:9, name:'Sexta mayor', short:'6ª mayor'},
    {s:10, name:'Séptima menor', short:'7ª menor'},
    {s:11, name:'Séptima mayor', short:'7ª mayor'},
    {s:12, name:'Octava', short:'Octava'}
  ];
  const RANGES = {treble:[60,84], bass:[36,60], both:[48,72]};
  let LOW = 60, HIGH = 84;
  const WHITE_PCS = [0,2,4,5,7,9,11];
  const $ = id => document.getElementById(id);

  const noteName = m => NAMES[m%12] + (Math.floor(m/12)-1);
  const intervalName = s => s <= 12 ? INTERVALS[s].name : INTERVALS[s-12].name.toLowerCase() + ' más una octava';

  // ---------- Estado ----------
  let settings = {mode:'up', reps:2, clef:'treble', autoNext:true, rootMode:'random', rootPc:0, enabled:[1,2,3,4,5,6,7,8,9,10,11,12]};
  try { const saved = JSON.parse(localStorage.getItem('intervalos-settings')); if (saved && Array.isArray(saved.enabled)) settings = Object.assign(settings, saved); } catch(e){}
  const saveSettings = () => { try { localStorage.setItem('intervalos-settings', JSON.stringify(settings)); } catch(e){} };

  let q = null;            // pregunta actual
  let pick = null;         // primera tecla elegida en modo exploración
  const score = {ok:0,total:0,streak:0};
  try { Object.assign(score, JSON.parse(localStorage.getItem('intervalos-puntaje')) || {}); } catch(e){}

  // ---------- Audio ----------
  let ctx = null, master = null;
  function audio(){
    if (!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function initAudio(){
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      loadSamples();
    } catch(e){}
  }
  // Samples de piano Salamander Grand (Alexander Holm, CC BY 3.0)
  const SAMPLE_DATA = window.MUESTRAS_PIANO || {};
  const buffers = {};
  let active = [];
  function track(src, g){
    const v = {src, g}; active.push(v);
    src.onended = () => { active = active.filter(x=>x!==v); };
  }
  function stopAll(){
    if (!ctx) return;
    const now = ctx.currentTime;
    active.forEach(({src,g})=>{
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now+0.03);
        src.stop(now+0.05);
      } catch(e){}
    });
    active = [];
  }
  let samplesReady = false;
  function loadSamples(){
    const entries = Object.entries(SAMPLE_DATA);
    let done = 0;
    entries.forEach(([m,b64])=>{
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
      const onOk = buf => { buffers[m] = buf; if (++done === entries.length) samplesReady = true; };
      const p = ctx.decodeAudioData(bytes.buffer, onOk, ()=>{ done++; });
      if (p && p.catch) p.catch(()=>{});
    });
  }
  function synth(midi, when, dur){
    const f = 440 * Math.pow(2,(midi-69)/12);
    [[1,1],[2,.45],[3,.18],[4,.08]].forEach(([h,amp])=>{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f*h;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(amp*0.5, when+0.008);
      g.gain.exponentialRampToValueAtTime(0.0008, when+dur);
      o.connect(g); g.connect(master); o.start(when); o.stop(when+dur+0.05); track(o,g);
    });
  }
  function tone(midi, when, dur){
    const keys = Object.keys(buffers).map(Number);
    if (!keys.length){ synth(midi, when, dur); return; }
    const sm = keys.reduce((a,b)=>Math.abs(b-midi)<Math.abs(a-midi)?b:a);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[sm];
    src.playbackRate.value = Math.pow(2,(midi-sm)/12);
    const ring = dur + 0.5;
    g.gain.setValueAtTime(1.6, when);
    g.gain.setValueAtTime(1.6, when+ring-0.35);
    g.gain.exponentialRampToValueAtTime(0.001, when+ring);
    src.connect(g); g.connect(master);
    src.start(when); src.stop(when+ring+0.05); track(src,g);
  }
  // Nota que dura exactamente dur segundos (para ritmos: los silencios tienen que oírse)
  function held(midi, when, dur){
    const keys = Object.keys(buffers).map(Number);
    const fin = when + Math.max(dur, 0.08);
    if (!keys.length){ synth(midi, when, Math.max(dur, 0.12)); return; }
    const sm = keys.reduce((a,b)=>Math.abs(b-midi)<Math.abs(a-midi)?b:a);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[sm];
    src.playbackRate.value = Math.pow(2,(midi-sm)/12);
    g.gain.setValueAtTime(1.6, when);
    g.gain.setValueAtTime(1.6, fin - 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, fin + 0.03);
    src.connect(g); g.connect(master);
    src.start(when); src.stop(fin + 0.06); track(src,g);
  }
  // Clic de metrónomo: más agudo en el primer tiempo del compás
  function click(when, strong, vol = 1){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = strong ? 1760 : 1175;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime((strong ? 0.9 : 0.6)*vol, when+0.002);
    g.gain.exponentialRampToValueAtTime(0.001, when+0.06);
    o.connect(g); g.connect(master); o.start(when); o.stop(when+0.08); track(o,g);
  }
  // Golpe corto de madera para devolver cada toque
  function knock(when){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(820, when);
    o.frequency.exponentialRampToValueAtTime(420, when+0.05);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.7, when+0.002);
    g.gain.exponentialRampToValueAtTime(0.001, when+0.09);
    o.connect(g); g.connect(master); o.start(when); o.stop(when+0.1); track(o,g);
  }
  let playTimer = null;
  function playInterval(a, b, harmonic, reps){
    audio();
    stopAll();
    const t0 = ctx.currentTime + 0.06;
    let t = t0;
    for (let i=0;i<reps;i++){
      if (harmonic){ tone(a,t,1.5); tone(b,t,1.5); t += 2.1; }
      else { tone(a,t,0.9); tone(b,t+0.8,1.1); t += 2.4; }
    }
    return (t - t0) * 1000;
  }

  // ---------- Teclado ----------
  const kb = $('keyboard');
  let keyEls = {};
  function buildKeyboard(){
    [LOW, HIGH] = RANGES[settings.clef] || RANGES.treble;
    kb.innerHTML = ''; keyEls = {};
    kb.setAttribute('aria-label', `Teclado de ${noteName(LOW)} a ${noteName(HIGH)}`);
    const whites = []; for (let m=LOW;m<=HIGH;m++) if (WHITE_PCS.includes(m%12)) whites.push(m);
    const W = whites.length, ww = 100/W, bw = ww*0.62;
    let wi = -1;
    for (let m=LOW;m<=HIGH;m++){
      const isWhite = WHITE_PCS.includes(m%12);
      const el = document.createElement('button');
      el.className = 'key ' + (isWhite ? 'white' : 'black');
      el.setAttribute('aria-label', noteName(m));
      if (isWhite){
        wi++;
        el.style.left = (wi*ww)+'%'; el.style.width = ww+'%';
        if (m%12===0) el.textContent = noteName(m);
      } else {
        el.style.left = ((wi+1)*ww - bw/2)+'%'; el.style.width = bw+'%';
      }
      el.addEventListener('click', () => onKey(m));
      kb.appendChild(el); keyEls[m] = el;
    }
  }
  function clearKeys(){ Object.values(keyEls).forEach(el=>el.classList.remove('first','second','pick')); }
  function lightKeys(a,b){ clearKeys(); keyEls[a].classList.add('first'); if (b!==a) keyEls[b].classList.add('second'); else keyEls[a].classList.add('second'); }

  function onKey(m){
    audio(); cancelAuto();
    if (view === 'notes'){ tone(m, ctx.currentTime+0.02, 1.1); return; }
    // Durante una pregunta sin responder, la tecla solo suena (sin revelar nada)
    if (view === 'practice' && q && !q.answered){ tone(m, ctx.currentTime+0.02, 1.1); return; }
    if (pick === null){
      pick = m; clearKeys(); keyEls[m].classList.add('pick'); $('staff').hidden = true; invState = null; $('inv').hidden = true;
      tone(m, ctx.currentTime+0.02, 1.1);
      setStatus(`<small>${noteName(m)} elegida. Tocá la segunda nota.</small>`);
    } else {
      const a = pick, b = m; pick = null;
      const s = Math.abs(b-a);
      lightKeys(a,b);
      playInterval(a,b,false,settings.reps);
      drawStaff(a,b,false);
      setInversion(a,b,false);
      const dir = s===0 ? '' : (b>a ? ', subiendo' : ', bajando');
      setStatus(`<strong>${intervalName(s).charAt(0).toUpperCase()+intervalName(s).slice(1)}</strong><small>De ${noteName(a)} a ${noteName(b)}${dir}, ${s} ${s===1?'semitono':'semitonos'}.</small>`);
    }
  }

  // ---------- Pentagrama ----------
  const staffEl = document.getElementById('staff');
  function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#18203A'; }
  function vfKey(m){ return ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'][m%12] + '/' + (Math.floor(m/12)-1); }
  function drawStaff(a, b, harmonic){
    if (!staffEl) return;
    if (!window.Vex || !Vex.Flow){ staffEl.hidden = true; return; }
    try {
      const VF = Vex.Flow;
      staffEl.innerHTML = '';
      const clef = settings.clef, grand = clef === 'both';
      const W = 280, H = grand ? 215 : 150;
      const r = new VF.Renderer(staffEl, VF.Renderer.Backends.SVG);
      r.resize(W, H);
      const c = r.getContext();
      const ink = cssVar('--ink'), muted = cssVar('--muted');
      const cols = [cssVar('--first'), cssVar('--second')];
      c.setFillStyle(ink); c.setStrokeStyle(ink);
      const x0 = grand ? 26 : 6;
      const clefs = grand ? ['treble','bass'] : [clef];
      const staves = clefs.map((cl,i)=>{
        const st = new VF.Stave(x0, grand ? 12 + i*95 : 18, W - x0 - 6);
        st.setStyle({strokeStyle: muted, fillStyle: ink});
        st.addClef(cl);
        return st;
      });
      const startX = Math.max(...staves.map(s=>s.getNoteStartX()));
      staves.forEach(s=>{ s.setNoteStartX(startX); s.setContext(c).draw(); });
      if (grand){
        new VF.StaveConnector(staves[0], staves[1]).setType('brace').setContext(c).draw();
        new VF.StaveConnector(staves[0], staves[1]).setType('singleLeft').setContext(c).draw();
      }
      const staffOf = m => grand ? (m >= 60 ? 0 : 1) : 0;
      const colorOf = (m, slotIdx) => harmonic ? cols[m===a ? 0 : 1] : cols[slotIdx];
      const slots = harmonic ? [[a,b]] : [[a],[b]];
      const slotNotes = slots.map(()=>null);
      const voices = staves.map((st, si)=>{
        const ticks = slots.map((slot, k)=>{
          const ms = [...new Set(slot.filter(m=>staffOf(m)===si))].sort((x,y)=>x-y);
          if (!ms.length) return new VF.GhostNote({duration:'w'});
          const n = new VF.StaveNote({clef: clefs[si], keys: ms.map(vfKey), duration:'w'});
          ms.forEach((m,i)=>{
            if (vfKey(m).includes('#')) n.addModifier(new VF.Accidental('#'), i);
            const col = colorOf(m, k);
            n.setKeyStyle(i, {fillStyle: col, strokeStyle: col});
          });
          n.setLedgerLineStyle({strokeStyle: ink});
          if (!slotNotes[k]) slotNotes[k] = n;
          return n;
        });
        return new VF.Voice({num_beats: 4*slots.length, beat_value: 4}).addTickables(ticks);
      });
      const avail = staves[0].getNoteEndX() - startX - 30;
      const fmt = new VF.Formatter();
      voices.forEach(v=>fmt.joinVoices([v]));
      fmt.format(voices, avail);
      voices.forEach((v,i)=>v.draw(c, staves[i]));
      c.setFont('Figtree, system-ui, sans-serif', 13, 600);
      const labelY = H - 8;
      if (harmonic){
        const x = slotNotes[0].getAbsoluteX() + 7;
        const t = a === b ? noteName(a) : `${noteName(a)} y ${noteName(b)}`;
        c.setFillStyle(ink);
        c.fillText(t, x - t.length*3.3, labelY);
      } else {
        slotNotes.forEach((n,i)=>{
          const t = noteName(i ? b : a);
          c.setFillStyle(cols[i]);
          c.fillText(t, n.getAbsoluteX() + 7 - t.length*3.6, labelY);
        });
      }
      const svg = staffEl.querySelector('svg');
      if (svg){ svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.removeAttribute('width'); svg.removeAttribute('height'); }
      staffEl.hidden = false;
    } catch(e){ staffEl.hidden = true; }
  }

  // ---------- Inversión ----------
  const invEl = document.getElementById('inv');
  let invState = null; // {a, b, harmonic, showing}
  function inversionOf(a, b){
    let lo = Math.min(a,b), hi = Math.max(a,b);
    const s = hi - lo;
    if (s > 12) hi = lo + (s % 12 === 0 ? 12 : s % 12);
    let nLo = hi, nHi = lo + 12;
    if (nLo === hi && hi === lo){ nLo = lo; nHi = lo + 12; }
    if (nHi > HIGH){ nLo = hi - 12; nHi = lo; }
    return {lo: nLo, hi: nHi, s: nHi - nLo};
  }
  function setInversion(a, b, harmonic){
    invState = {a, b, harmonic, showing: 'orig'};
    renderInv();
  }
  function renderInv(){
    if (!invState){ invEl.hidden = true; return; }
    const {a, b} = invState;
    const inv = inversionOf(a, b);
    const s = Math.abs(b-a), sRed = s > 12 ? (s % 12 || 12) : s;
    const showingInv = invState.showing === 'inv';
    const txt = showingInv
      ? `Original: <b>${intervalName(sRed).toLowerCase()}</b> (${sRed} + ${inv.s} = 12 semitonos)`
      : `Inversión: <b>${intervalName(inv.s).toLowerCase()}</b>, de ${noteName(inv.lo)} a ${noteName(inv.hi)}`;
    invEl.innerHTML = `<p>${txt}</p><button class="btn secondary" id="invBtn">${showingInv ? 'Escuchar original' : 'Escuchar inversión'}</button>`;
    invEl.hidden = false;
    document.getElementById('invBtn').addEventListener('click', toggleInversion);
  }
  function toggleInversion(){
    if (!invState) return;
    cancelAuto();
    const {a, b, harmonic} = invState;
    let x, y;
    if (invState.showing === 'orig'){
      const inv = inversionOf(a, b);
      const down = b < a;
      x = down ? inv.hi : inv.lo; y = down ? inv.lo : inv.hi;
      invState.showing = 'inv';
    } else { x = a; y = b; invState.showing = 'orig'; }
    lightKeys(x, y);
    drawStaff(x, y, harmonic);
    playInterval(x, y, harmonic, settings.reps);
    renderInv();
  }


  // ---------- Pesos adaptativos ----------
  const DIR_LABEL = {up:'ascendente', down:'descendente', harm:'armónica'};
  let weights = {};
  try { weights = JSON.parse(localStorage.getItem('intervalos-pesos')) || {}; } catch(e){ weights = {}; }
  const saveWeights = () => { try { localStorage.setItem('intervalos-pesos', JSON.stringify(weights)); } catch(e){} };
  const wKey = (d, s) => d + ':' + s;
  const getW = (d, s) => weights[wKey(d,s)] || 1;
  function dirsFor(mode){
    return mode==='mix' ? ['up','down','harm'] : mode==='updown' ? ['up','down'] : [mode];
  }
  let lastKey = null;
  function pickWeighted(){
    const combos = [];
    dirsFor(settings.mode).forEach(d => settings.enabled.forEach(s => {
      let w = getW(d, s);
      if (wKey(d,s) === lastKey && settings.enabled.length * dirsFor(settings.mode).length > 1) w *= 0.25;
      combos.push({d, s, w});
    }));
    const total = combos.reduce((t,c)=>t+c.w, 0);
    let r = Math.random() * total;
    for (const c of combos){ r -= c.w; if (r <= 0) return c; }
    return combos[combos.length-1];
  }
  function registerResult(d, s, guess){
    const k = wKey(d, s);
    if (guess === s) weights[k] = Math.max(1, getW(d,s) * 0.6);
    else {
      weights[k] = Math.min(12, getW(d,s) + 2);
      if (guess !== undefined) weights[wKey(d,guess)] = Math.min(12, getW(d,guess) + 1);
    }
    Object.keys(weights).forEach(x => { if (weights[x] <= 1.001) delete weights[x]; });
    saveWeights(); renderReview();
  }
  function renderReview(){
    const el = $('review');
    const top = Object.entries(weights).filter(([,w]) => w >= 2).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (!top.length){ el.hidden = true; return; }
    el.innerHTML = 'Para repasar: ' + top.map(([k]) => {
      const [d, s] = k.split(':');
      return `<b>${INTERVALS[+s].short} ${DIR_LABEL[d]}</b>`;
    }).join(', ');
    el.hidden = false;
  }


  // ---------- Avance automático ----------
  let autoTimer = null, autoTick = null;
  function cancelAuto(){
    clearTimeout(autoTimer); clearInterval(autoTick); autoTimer = autoTick = null;
    const b = $('newBtn'); b.classList.remove('counting'); b.textContent = 'Nuevo intervalo';
  }
  function startAuto(){
    cancelAuto();
    if (!settings.autoNext) return;
    const b = $('newBtn');
    let left = 3;
    b.textContent = `Siguiente en ${left}`;
    void b.offsetWidth; b.classList.add('counting');
    autoTick = setInterval(()=>{ left--; if (left > 0) b.textContent = `Siguiente en ${left}`; }, 1000);
    autoTimer = setTimeout(()=>{ cancelAuto(); newQuestion(); }, 3000);
  }


  // ---------- Estadísticas ----------
  const DIRS = ['up','down','harm'];
  const DIR_SHORT = {up:'Asc.', down:'Desc.', harm:'Juntas'};
  let stats = {};
  try { stats = JSON.parse(localStorage.getItem('intervalos-stats')) || {}; } catch(e){ stats = {}; }
  const saveStats = () => { try { localStorage.setItem('intervalos-stats', JSON.stringify(stats)); } catch(e){} };
  let selectedCell = null;
  function recordStat(d, s, guess, secs){
    const k = d + ':' + s;
    const st = stats[k] || (stats[k] = {n:0, ok:0, t:0, tn:0, conf:{}});
    st.n++;
    if (guess === s) st.ok++;
    else if (guess !== undefined) st.conf[guess] = (st.conf[guess] || 0) + 1;
    if (guess !== undefined && secs > 0 && secs < 60){ st.t += secs; st.tn++; }
    saveStats(); renderStats();
  }
  const fmtSecs = x => x.toFixed(1).replace('.', ',') + ' s';
  function topConfusion(st){
    const e = Object.entries(st.conf).sort((a,b)=>b[1]-a[1])[0];
    return e ? {s:+e[0], n:e[1]} : null;
  }
  function describe(k){
    const [d, s] = k.split(':'); const st = stats[k];
    const pct = Math.round(100*st.ok/st.n);
    let txt = `<b>${INTERVALS[+s].short} ${DIR_LABEL[d]}</b>: ${st.ok} de ${st.n} (${pct}%).`;
    if (st.tn) txt += ` Tardás ${fmtSecs(st.t/st.tn)} en promedio.`;
    const conf = Object.entries(st.conf).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if (conf.length) txt += ' La confundís con ' + conf.map(([g,n])=>`${INTERVALS[+g].short} (${n})`).join(', ') + '.';
    return txt;
  }
  function renderStats(){
    const body = $('statsBody'); if (!body) return;
    const keys = Object.keys(stats).filter(k => stats[k].n > 0);
    if (!keys.length){
      body.innerHTML = '<p class="stats-note">Todavía no hay respuestas. Practicá un rato y acá vas a ver en qué intervalos fallás más y cuánto tardás en reconocerlos.</p>';
      return;
    }
    // más difíciles: menor % de acierto (con al menos 3 intentos), desempata el tiempo
    const ranked = keys.filter(k => stats[k].n >= 3 && stats[k].ok < stats[k].n)
      .map(k => ({k, rate: stats[k].ok/stats[k].n, t: stats[k].tn ? stats[k].t/stats[k].tn : 0}))
      .sort((a,b) => a.rate - b.rate || b.t - a.t).slice(0,3);
    let html = '';
    if (ranked.length){
      html += '<ul class="stats-hard">' + ranked.map(r => {
        const [d, s] = r.k.split(':'); const st = stats[r.k]; const c = topConfusion(st);
        return `<li><b>${INTERVALS[+s].short} ${DIR_LABEL[d]}</b>: ${Math.round(r.rate*100)}% de aciertos${c ? `, la confundís con ${INTERVALS[c.s].short}` : ''}</li>`;
      }).join('') + '</ul>';
    } else {
      html += '<p class="stats-note">Sin puntos débiles claros todavía (se necesitan al menos 3 intentos por intervalo).</p>';
    }
    const usedDirs = DIRS.filter(d => keys.some(k => k.startsWith(d+':')));
    const usedS = INTERVALS.filter(i => usedDirs.some(d => stats[d+':'+i.s]));
    html += '<p class="stats-note">Porcentaje de aciertos. Tocá una casilla para ver el detalle.</p>';
    html += '<div class="grid-wrap"><table class="sgrid"><thead><tr><th></th>' + usedDirs.map(d=>`<th scope="col">${DIR_SHORT[d]}</th>`).join('') + '</tr></thead><tbody>';
    usedS.forEach(i => {
      html += `<tr><th scope="row">${i.short}</th>`;
      usedDirs.forEach(d => {
        const k = d+':'+i.s, st = stats[k];
        if (!st){ html += '<td><button class="cell empty" disabled aria-label="Sin datos">–</button></td>'; return; }
        const pct = Math.round(100*st.ok/st.n);
        const bg = `color-mix(in srgb, color-mix(in srgb, var(--ok) ${pct}%, var(--bad)) 28%, var(--surface))`;
        html += `<td><button class="cell" data-k="${k}" aria-pressed="${k===selectedCell}" style="background:${bg}"><b>${pct}%</b><em>${st.n} ${st.n===1?'vez':'veces'}</em></button></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += `<p class="stats-detail" id="statsDetail">${selectedCell && stats[selectedCell] ? describe(selectedCell) : ''}</p>`;
    html += '<button class="mini" id="resetStats">Borrar estadísticas</button>';
    body.innerHTML = html;
    body.querySelectorAll('.cell[data-k]').forEach(b => b.addEventListener('click', () => { selectedCell = b.dataset.k; renderStats(); }));
    $('resetStats').addEventListener('click', () => { stats = {}; selectedCell = null; saveStats(); renderStats(); });
  }

  // ---------- Práctica ----------
  function setStatus(html){ $('status').innerHTML = html; }
  function renderAnswers(){
    const box = $('answers'); box.innerHTML = '';
    INTERVALS.filter(i=>settings.enabled.includes(i.s)).forEach(i=>{
      const b = document.createElement('button');
      b.className = 'ans'; b.dataset.s = i.s;
      b.innerHTML = `<b>${i.short}</b><em>${i.s} ${i.s===1?'semitono':'semitonos'}</em>`;
      b.disabled = !q || q.answered;
      b.addEventListener('click', ()=>answer(i.s));
      box.appendChild(b);
    });
  }
  function newQuestion(){
    cancelAuto();
    const pool = settings.enabled;
    if (!pool.length){ setStatus('<small>Elegí al menos un intervalo en Ajustes.</small>'); return; }
    audio(); pick = null; clearKeys(); $('staff').hidden = true; invState = null; $('inv').hidden = true;
    const pickd = pickWeighted();
    const s = pickd.s, mode = pickd.d;
    lastKey = wKey(mode, s);
    let first, second;
    if (settings.rootMode === 'fixed'){
      // la nota elegida es siempre la primera; se busca una octava donde entren las dos
      const cands = [];
      for (let m=LOW; m<=HIGH; m++){
        if (m%12 !== settings.rootPc) continue;
        const other = mode==='down' ? m - s : m + s;
        if (other >= LOW && other <= HIGH) cands.push(m);
      }
      const root = cands[Math.floor(Math.random()*cands.length)];
      first = root; second = mode==='down' ? root - s : root + s;
    } else {
      const low = LOW + Math.floor(Math.random()*(HIGH - LOW - s + 1));
      first = mode==='down' ? low+s : low;
      second = mode==='down' ? low : low+s;
    }
    q = {s, first, second, mode, answered:false, t0: Date.now()};
    renderAnswers();
    $('repeatBtn').disabled = false; $('skipBtn').hidden = false;
    setStatus(`<small>Escuchando… ${mode==='harm'?'las dos notas juntas':'dos notas seguidas'}. ¿Qué intervalo es?</small>`);
    playInterval(first, second, mode==='harm', settings.reps);
  }
  function reveal(guess){
    q.answered = true; $('skipBtn').hidden = true;
    lightKeys(q.first, q.second);
    drawStaff(q.first, q.second, q.mode==='harm');
    setInversion(q.first, q.second, q.mode==='harm');
    document.querySelectorAll('.ans').forEach(b=>{
      const s = +b.dataset.s; b.disabled = true;
      if (s===q.s) b.classList.add('correct');
      else if (s===guess) b.classList.add('wrong');
    });
    const dir = q.mode==='harm' ? ', juntas' : (q.s===0 ? '' : q.mode==='down' ? ', bajando' : ', subiendo');
    const detail = `De ${noteName(q.first)} a ${noteName(q.second)}${dir}, ${q.s} ${q.s===1?'semitono':'semitonos'}.`;
    let head;
    if (guess === undefined) head = `<strong>Era ${intervalName(q.s).toLowerCase()}</strong>`;
    else if (guess === q.s) head = `<strong class="ok">¡Bien! ${intervalName(q.s)}</strong>`;
    else head = `<strong class="bad">Era ${intervalName(q.s).toLowerCase()}</strong>`;
    setStatus(head + `<small>${detail}</small>`);
  }
  function answer(s){
    if (!q || q.answered) return;
    score.total++;
    if (s===q.s){ score.ok++; score.streak++; } else score.streak = 0;
    registerResult(q.mode, q.s, s);
    recordStat(q.mode, q.s, s, (Date.now() - q.t0)/1000);
    updateScore(); reveal(s);
    startAuto();
  }
  function updateScore(){ try { localStorage.setItem('intervalos-puntaje', JSON.stringify(score)); } catch(e){} $('ok').textContent = score.ok; $('total').textContent = score.total; $('streak').textContent = score.streak; }

  $('newBtn').addEventListener('click', newQuestion);
  $('repeatBtn').addEventListener('click', ()=>{ cancelAuto(); if (q) playInterval(q.first, q.second, q.mode==='harm', settings.reps); });
  $('skipBtn').addEventListener('click', ()=>{ if (q && !q.answered){ score.total++; score.streak=0; registerResult(q.mode, q.s); recordStat(q.mode, q.s); updateScore(); reveal(); startAuto(); } });

  // ---------- Aprender ----------
  const LEARN = {
    1:  {feel:'Muy tensa, con roce. Es la distancia más chica entre dos teclas.', up:'Tiburón (John Williams)', down:'Para Elisa (Beethoven), las dos primeras notas', tip:'Dos teclas vecinas, sin ninguna en el medio.', confuse:[2]},
    2:  {feel:'Un paso de escala: suena a caminar, no a saltar.', up:'Fray Santiago / Martinillo (“Fray San-”)', down:'Yesterday (The Beatles), “Yes-ter-”', tip:'Es el paso de Do a Re: dos semitonos, un tono entero.', confuse:[1,3]},
    3:  {feel:'Triste, oscura. Es la base del acorde menor.', up:'Greensleeves, las dos primeras notas', down:'Hey Jude (The Beatles), “Hey Jude”', tip:'Un tono y medio. Cantá el comienzo de un acorde menor: la segunda nota está a esta distancia.', confuse:[4,2]},
    4:  {feel:'Luminosa, alegre. Es la base del acorde mayor.', up:'When the Saints Go Marching In (“Oh when”)', down:'Quinta sinfonía de Beethoven (“ta-ta-ta-tán”)', tip:'Dos tonos enteros: Do-Re-Mi. Medio tono más que la tercera menor.', confuse:[3,5]},
    5:  {feel:'Abierta y firme, como un llamado o el comienzo de un himno.', up:'Marcha nupcial de Wagner (“Aquí viene la novia”)', down:'Pequeña serenata nocturna (Mozart), las dos primeras notas', tip:'Suena “en suspenso”, como si quisiera volver. Es la quinta al revés: 5 + 7 = 12.', confuse:[7,6]},
    6:  {feel:'Inestable e inquieta: pide moverse a otra nota.', up:'Los Simpsons (“The Simp-”) o María (West Side Story)', down:'Black Sabbath (Black Sabbath), el riff', tip:'Tres tonos exactos: parte la octava justo a la mitad. Su inversión es otro tritono.', confuse:[5,7]},
    7:  {feel:'Hueca, estable, muy consonante. Es el “power chord” de la guitarra.', up:'Estrellita, ¿dónde estás? (entre “-tre-” y “-lli-”)', down:'Los Picapiedras (“Flint-stones”)', tip:'La consonancia más fuerte después de la octava. Si suena “vacía”, probablemente es una quinta.', confuse:[5,6]},
    8:  {feel:'Dulce pero con un tono melancólico.', up:'The Entertainer (Scott Joplin), el salto del comienzo', down:null, tip:'Un semitono más que la quinta. Es la tercera mayor invertida: 8 + 4 = 12.', confuse:[9,7]},
    9:  {feel:'Cálida, abierta, romántica.', up:'My Bonnie (“My Bon-”)', down:'Nobody Knows the Trouble I’ve Seen', tip:'Es la tercera menor invertida: 9 + 3 = 12. Más “brillante” que la sexta menor.', confuse:[8,10]},
    10: {feel:'Tensión suave, con sabor a blues; queda pidiendo seguir.', up:'Somewhere (West Side Story), “There’s a place”', down:'Un americano en París (Gershwin)', tip:'Una octava menos un tono. Es la nota que convierte un acorde mayor en “dominante”.', confuse:[11,9]},
    11: {feel:'Muy tensa y brillante: se “choca” contra la octava.', up:'Take On Me (a-ha), el salto del estribillo', down:null, tip:'Una octava a la que le falta un semitono. Si sentís que la nota de arriba “quiere subir”, es esta.', confuse:[12,10]},
    12: {feel:'La misma nota, más aguda: las dos se funden en una.', up:'Somewhere Over the Rainbow (“Some-where”)', down:null, tip:'Las dos notas tienen el mismo nombre. Doce semitonos, seis tonos.', confuse:[11,7]}
  };
  const STEPS = [
    {name:'Los pilares', s:[7,12], txt:'Quinta y octava, las más estables.'},
    {name:'Terceras', s:[3,4], txt:'Menor y mayor: triste y alegre.'},
    {name:'Segundas', s:[1,2], txt:'Los pasos de la escala.'},
    {name:'Cuarta y sextas', s:[5,8,9], txt:'Parientes invertidos de la quinta y las terceras.'},
    {name:'Séptimas y tritono', s:[6,10,11], txt:'Las más tensas.'}
  ];
  let view = 'practice';
  let learnS = null, learnLo = null, cmpTimer = null;
  const tonesText = s => {
    const t = Math.floor(s/2), h = s % 2;
    if (!t) return 'medio tono';
    return `${t} ${t===1?'tono':'tonos'}${h ? ' y medio' : ''}`;
  };
  function accuracyOf(s){
    let n = 0, ok = 0;
    DIRS.forEach(d => { const st = stats[d+':'+s]; if (st){ n += st.n; ok += st.ok; } });
    return n ? {n, ok, pct: Math.round(100*ok/n)} : null;
  }
  function renderLearnStat(){
    if (learnS === null) return;
    const acc = accuracyOf(learnS);
    $('lStat').textContent = acc ? `En la práctica acertaste ${acc.ok} de ${acc.n} (${acc.pct}%).` : 'Todavía no lo practicaste.';
  }
  function renderLearnPick(){
    const box = $('learnPick'); box.innerHTML = '';
    INTERVALS.filter(i => i.s > 0).forEach(i => {
      const b = document.createElement('button');
      const acc = accuracyOf(i.s);
      b.className = 'ans'; b.dataset.s = i.s;
      b.setAttribute('aria-pressed', String(i.s === learnS));
      b.innerHTML = `${acc ? `<i class="pct">${acc.pct}%</i>` : ''}<b>${i.short}</b><em>${i.s} ${i.s===1?'semitono':'semitonos'}</em>`;
      b.addEventListener('click', () => showLearn(i.s, true));
      box.appendChild(b);
    });
  }
  function learnRoot(s){
    // nota de abajo: la de inicio si está fija, si no una al azar donde entre el intervalo
    const cands = [];
    for (let m = LOW; m + s <= HIGH; m++){
      if (settings.rootMode === 'fixed' ? m % 12 === settings.rootPc : true) cands.push(m);
    }
    if (!cands.length) return LOW;
    let pickM = cands[Math.floor(Math.random()*cands.length)];
    if (cands.length > 1 && pickM === learnLo) pickM = cands[(cands.indexOf(pickM)+1) % cands.length];
    return pickM;
  }
  function playLearn(kind){
    if (learnS === null) return;
    clearTimeout(cmpTimer);
    const lo = learnLo, hi = learnLo + learnS;
    const [a, b] = kind === 'down' ? [hi, lo] : [lo, hi];
    lightKeys(a, b);
    drawStaff(a, b, kind === 'harm');
    playInterval(a, b, kind === 'harm', 1);
  }
  function showLearn(s, newRoot){
    audio(); stopAll(); clearTimeout(cmpTimer); pick = null;
    const changed = s !== learnS;
    learnS = s;
    if (newRoot || changed || learnLo === null) learnLo = learnRoot(s);
    const info = LEARN[s], iv = INTERVALS[s];
    renderLearnPick();
    $('learnCard').hidden = false;
    $('lTitle').textContent = iv.name;
    $('lMeta').textContent = `${s} ${s===1?'semitono':'semitonos'} · ${tonesText(s)}`;
    $('lFeel').textContent = info.feel;
    $('lSongs').innerHTML = `<dt>Subiendo</dt><dd>${info.up}</dd>` + (info.down ? `<dt>Bajando</dt><dd>${info.down}</dd>` : '');
    $('lTip').textContent = info.tip;
    $('lCompare').innerHTML = '<span>Se confunde con (suena primero este y después el otro):</span>' + info.confuse.map(c =>
      `<button class="btn secondary" data-cmp="${c}">${INTERVALS[c].short} ▶</button>`).join('');
    $('lCompare').querySelectorAll('[data-cmp]').forEach(b => b.addEventListener('click', () => compareWith(+b.dataset.cmp)));
    renderLearnStat();
    setInversion(learnLo, learnLo + s, false);
    playLearn('up');
  }
  function compareWith(c){
    // toca el intervalo elegido y después el que se confunde, desde la misma nota
    clearTimeout(cmpTimer);
    let lo = learnLo;
    if (lo + Math.max(learnS, c) > HIGH) lo = HIGH - Math.max(learnS, c);
    const hi1 = lo + learnS, hi2 = lo + c;
    lightKeys(lo, hi1); drawStaff(lo, hi1, false);
    const ms = playInterval(lo, hi1, false, 1);
    cmpTimer = setTimeout(() => {
      if (view !== 'learn') return;
      lightKeys(lo, hi2); drawStaff(lo, hi2, false);
      audio(); const t = ctx.currentTime + 0.06;
      tone(lo, t, 0.9); tone(hi2, t + 0.8, 1.1);
    }, ms - 200);
  }
  function renderSteps(){
    const ol = $('lSteps'); ol.innerHTML = '';
    STEPS.forEach((st, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<div><b>${st.name}: ${st.s.map(x => INTERVALS[x].short).join(', ')}</b><small>${st.txt}</small></div><button class="btn secondary">Practicar</button>`;
      li.querySelector('button').addEventListener('click', () => {
        const set = new Set(); STEPS.slice(0, i+1).forEach(x => x.s.forEach(v => set.add(v)));
        settings.enabled = [...set].sort((a,b) => a-b); saveSettings();
        renderChips(); renderAnswers();
        setView('practice');
        newQuestion();
      });
      ol.appendChild(li);
    });
  }
  const LEDE = {
    practice: 'Escuchá dos notas y adiviná la distancia entre ellas. También podés tocar dos teclas para oír y nombrar cualquier intervalo.',
    learn: 'Conocé cada intervalo: cómo suena subiendo, bajando y junto, qué canción lo empieza y con cuál se suele confundir.',
    notes: 'Leé la nota en el pentagrama y elegí su nombre. Las notas que más te cuestan salen más seguido.'
  };
  function setView(v){
    if (v === view) return;
    view = v;
    try { localStorage.setItem('intervalos-vista', v); } catch(e){}
    cancelAuto(); stopAll(); clearTimeout(cmpTimer); clearTimeout(nTimer); pick = null; clearKeys();
    staffEl.hidden = true; invState = null; invEl.hidden = true;
    const learn = v === 'learn', notes = v === 'notes';
    [['tabPractice','practice'],['tabLearn','learn'],['tabNotes','notes']].forEach(([id, x]) => $(id).setAttribute('aria-selected', String(v === x)));
    $('practiceView').hidden = v !== 'practice'; $('learnView').hidden = !learn; $('notesView').hidden = !notes;
    $('modeBar').hidden = v !== 'practice'; $('rootBar').hidden = notes; $('kbLegend').hidden = notes;
    $('lede').textContent = LEDE[v];
    if (!notes) $(learn ? 'learnStaffSlot' : 'practiceStaffSlot').append(staffEl, invEl);
    if (notes){
      if (!nq) newNote(); else { drawNote(); renderNoteMap(); if (nq.answered) keyEls[nq.midi] && keyEls[nq.midi].classList.add(nq.guess === nq.name ? 'first' : 'second'); }
    } else if (learn){
      renderLearnPick(); renderLearnStat();
      if (learnS !== null){ $('learnCard').hidden = false; setInversion(learnLo, learnLo + learnS, false); lightKeys(learnLo, learnLo + learnS); drawStaff(learnLo, learnLo + learnS, false); }
    } else if (q && q.answered){
      lightKeys(q.first, q.second); drawStaff(q.first, q.second, q.mode==='harm'); setInversion(q.first, q.second, q.mode==='harm');
    }
  }
  $('tabPractice').addEventListener('click', () => setView('practice'));
  $('tabLearn').addEventListener('click', () => setView('learn'));
  $('tabNotes').addEventListener('click', () => setView('notes'));
  document.querySelectorAll('.lplay [data-play]').forEach(b => b.addEventListener('click', () => playLearn(b.dataset.play)));
  $('lOther').addEventListener('click', () => { if (learnS !== null) showLearn(learnS, true); });

  // ---------- Notas ----------
  const LETTERS = ['Do','Re','Mi','Fa','Sol','La','Si'];
  const LETTER_PC = [0,2,4,5,7,9,11];
  const SHARP_ORDER = [3,0,4,1,5,2,6], FLAT_ORDER = [6,2,5,1,4,0,3];
  const KEYSIGS = [
    {vf:'G', name:'Sol mayor', n:1}, {vf:'D', name:'Re mayor', n:2}, {vf:'A', name:'La mayor', n:3},
    {vf:'E', name:'Mi mayor', n:4}, {vf:'B', name:'Si mayor', n:5},
    {vf:'F', name:'Fa mayor', n:-1}, {vf:'Bb', name:'Si♭ mayor', n:-2}, {vf:'Eb', name:'Mi♭ mayor', n:-3},
    {vf:'Ab', name:'La♭ mayor', n:-4}, {vf:'Db', name:'Re♭ mayor', n:-5}
  ];
  const keyAcc = (ks, letter) => !ks ? 0 : ks.n > 0 ? (SHARP_ORDER.slice(0, ks.n).includes(letter) ? 1 : 0) : (FLAT_ORDER.slice(0, -ks.n).includes(letter) ? -1 : 0);
  const accSign = a => a > 0 ? '♯' : a < 0 ? '♭' : '';
  const nName = (letter, acc) => LETTERS[letter] + accSign(acc);
  const nMidi = (letter, oct, acc) => 12*(oct+1) + LETTER_PC[letter] + acc;
  // ♯/♭ que caen en teclas negras (sin Mi♯, Si♯, Do♭ ni Fa♭)
  const plainAcc = (letter, acc) => acc === 0 || (acc > 0 ? ![2,6].includes(letter) : ![0,3].includes(letter));

  let nAcc = 'none';
  try { nAcc = localStorage.getItem('intervalos-notas-alt') || 'none'; } catch(e){}
  if (!['none','acc','key'].includes(nAcc)) nAcc = 'none';
  let beta = {};
  try { beta = JSON.parse(localStorage.getItem('intervalos-notas-beta')) || {}; } catch(e){ beta = {}; }
  const saveBeta = () => { try { localStorage.setItem('intervalos-notas-beta', JSON.stringify(beta)); } catch(e){} };
  const nScore = {ok:0, total:0, streak:0};
  try { Object.assign(nScore, JSON.parse(localStorage.getItem('intervalos-notas-puntaje')) || {}); } catch(e){}
  let nq = null, nTimer = null, nLastKey = null;

  // Muestreo de Beta a partir de dos Gamma (Marsaglia y Tsang)
  function randn(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v); }
  function randGamma(k){
    if (k < 1) return randGamma(k + 1) * Math.pow(Math.random(), 1/k);
    const d = k - 1/3, c = 1/Math.sqrt(9*d);
    for (;;){
      let x, v; do { x = randn(); v = 1 + c*x; } while (v <= 0);
      v = v*v*v; const u = Math.random();
      if (u < 1 - 0.0331*x*x*x*x || Math.log(u) < 0.5*x*x + d*(1 - v + Math.log(v))) return d*v;
    }
  }
  function randBeta(a, b){ const x = randGamma(a), y = randGamma(b); return x/(x+y); }
  const betaOf = k => beta[k] || [1,1];
  function updateBeta(k, ok){
    let [a, b] = betaOf(k);
    if (ok) a++; else b++;
    const n = a + b - 2, MAX = 20;
    if (n > MAX){ a = 1 + (a-1)*MAX/n; b = 1 + (b-1)*MAX/n; }
    beta[k] = [+a.toFixed(3), +b.toFixed(3)]; saveBeta();
  }
  function betaSummary(a, b){
    const xs = []; for (let i = 0; i < 400; i++) xs.push(randBeta(a, b));
    xs.sort((x,y) => x-y);
    return {mean: a/(a+b), lo: xs[20], hi: xs[379]};
  }

  // Notas posibles según la clave y el tipo de alteraciones
  function noteClefs(){
    const c = settings.clef;
    // en Sol y Fa: Do3–Do4 en clave de Fa, Do4–Do5 en clave de Sol
    return c === 'both' ? [['bass',3,0,4,0],['treble',4,0,5,0]] : c === 'bass' ? [['bass',2,0,4,0]] : [['treble',4,0,6,0]];
  }
  function candidates(ks){
    const out = [];
    noteClefs().forEach(([clef, o1, l1, o2, l2]) => {
      for (let oct = o1; oct <= o2; oct++) for (let letter = 0; letter < 7; letter++){
        if (oct === o1 && letter < l1) continue;
        if (oct === o2 && letter > l2) break;
        const accs = nAcc === 'acc' ? [-1,0,1].filter(a => plainAcc(letter, a)) : [nAcc === 'key' ? keyAcc(ks, letter) : 0];
        accs.forEach(acc => {
          const midi = nMidi(letter, oct, acc);
          if (midi < LOW || midi > HIGH) return;
          const name = nName(letter, acc);
          out.push({clef, letter, oct, acc, midi, name, key: `${clef}|${name}${oct}`});
        });
      }
    });
    return out;
  }
  function distractors(n, ks){
    const pool = [];
    const add = (letter, acc) => { const nm = nName(((letter % 7) + 7) % 7, acc); if (nm !== n.name && !pool.includes(nm)) pool.push(nm); };
    const shuffle = a => a.sort(() => Math.random() - 0.5);
    if (nAcc === 'key'){
      if (n.acc !== 0) add(n.letter, 0);                         // olvidarse de la armadura
      else if (ks) add(n.letter, ks.n > 0 ? 1 : -1);             // aplicarla donde no va
      shuffle([-1,1,-2,2]).forEach(d => { const l = ((n.letter + d) % 7 + 7) % 7; add(l, keyAcc(ks, l)); });
    } else if (nAcc === 'acc'){
      const same = shuffle([-1,0,1].filter(a => a !== n.acc && plainAcc(n.letter, a)));
      if (same.length) add(n.letter, same[0]);
      shuffle([-1,1,-2,2]).forEach(d => { const l = ((n.letter + d) % 7 + 7) % 7; add(l, plainAcc(l, n.acc) ? n.acc : 0); });
      if (same[1] !== undefined) add(n.letter, same[1]);
    } else {
      shuffle([-1,1,-2,2]).forEach(d => add(n.letter + d, 0));
    }
    return pool.slice(0, 3);
  }
  function newNote(){
    clearTimeout(nTimer);
    const ks = nAcc === 'key' ? KEYSIGS[Math.floor(Math.random()*KEYSIGS.length)] : null;
    const cands = candidates(ks);
    if (!cands.length) return;
    let best = null, bestP = 2;
    cands.forEach(c => {
      const [a, b] = betaOf(c.key);
      let p = randBeta(a, b);
      if (c.key === nLastKey && cands.length > 1) p += 0.5;   // no repetir la misma nota seguida
      if (p < bestP){ bestP = p; best = c; }
    });
    nLastKey = best.key;
    const opts = [best.name, ...distractors(best, ks)].sort(() => Math.random() - 0.5);
    nq = Object.assign({}, best, {ks, opts, answered:false, guess:null});
    clearKeys(); drawNote(); renderNoteOpts();
    $('nStatus').innerHTML = `<small>${ks ? `Armadura de ${ks.name}. ` : ''}¿Qué nota es?</small>`;
    renderNoteMap();
  }
  function drawNote(){
    const el = $('nStaff');
    if (!nq || !window.Vex || !Vex.Flow){ el.innerHTML = ''; return; }
    try {
      const VF = Vex.Flow; el.innerHTML = '';
      const W = 300, H = 150;
      const r = new VF.Renderer(el, VF.Renderer.Backends.SVG); r.resize(W, H);
      const c = r.getContext();
      const ink = cssVar('--ink'), muted = cssVar('--muted');
      c.setFillStyle(ink); c.setStrokeStyle(ink);
      const st = new VF.Stave(6, 18, W - 12);
      st.setStyle({strokeStyle: muted, fillStyle: ink});
      st.addClef(nq.clef);
      if (nq.ks) st.addKeySignature(nq.ks.vf);
      st.setContext(c).draw();
      const vk = 'cdefgab'[nq.letter] + (nq.ks ? '' : nq.acc > 0 ? '#' : nq.acc < 0 ? 'b' : '') + '/' + nq.oct;
      const n = new VF.StaveNote({clef: nq.clef, keys: [vk], duration: 'w'});
      if (!nq.ks && nq.acc) n.addModifier(new VF.Accidental(nq.acc > 0 ? '#' : 'b'), 0);
      const col = !nq.answered ? ink : cssVar(nq.guess === nq.name ? '--ok' : '--bad');
      n.setKeyStyle(0, {fillStyle: col, strokeStyle: col});
      n.setLedgerLineStyle({strokeStyle: ink});
      const v = new VF.Voice({num_beats: 4, beat_value: 4}).addTickables([n]);
      new VF.Formatter().joinVoices([v]).format([v], W - st.getNoteStartX() - 40);
      v.draw(c, st);
      if (nq.answered){
        c.setFont('Figtree, system-ui, sans-serif', 14, 600); c.setFillStyle(ink);
        const t = nq.name + nq.oct;
        c.fillText(t, n.getAbsoluteX() + 7 - t.length*3.8, H - 8);
      }
      const svg = el.querySelector('svg');
      if (svg){ svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('role','img'); svg.setAttribute('aria-label', nq.answered ? `Nota ${nq.name}${nq.oct}` : 'Nota a identificar'); }
    } catch(e){ el.textContent = ''; }
  }
  function renderNoteOpts(){
    const box = $('nOpts'); box.innerHTML = '';
    nq.opts.forEach((name, i) => {
      const b = document.createElement('button');
      b.className = 'nopt'; b.dataset.name = name;
      b.innerHTML = `<kbd>${i+1}</kbd>${name}`;
      b.disabled = nq.answered;
      b.addEventListener('click', () => answerNote(name));
      box.appendChild(b);
    });
  }
  function answerNote(name){
    if (!nq || nq.answered) return;
    audio();
    const ok = name === nq.name;
    nq.answered = true; nq.guess = name;
    updateBeta(nq.key, ok);
    nScore.total++; if (ok){ nScore.ok++; nScore.streak++; } else nScore.streak = 0;
    updateNoteScore();
    document.querySelectorAll('.nopt').forEach(b => {
      b.disabled = true;
      if (b.dataset.name === nq.name) b.classList.add('correct');
      else if (b.dataset.name === name) b.classList.add('wrong');
    });
    drawNote();
    clearKeys(); if (keyEls[nq.midi]) keyEls[nq.midi].classList.add(ok ? 'first' : 'second');
    tone(nq.midi, ctx.currentTime + 0.03, 1.2);
    let why = '';
    if (nq.ks && nq.acc) why = ` ${LETTERS[nq.letter]} lleva ${accSign(nq.acc)} por la armadura de ${nq.ks.name}.`;
    else if (nq.ks) why = ` En ${nq.ks.name}, ${LETTERS[nq.letter]} no lleva alteración.`;
    $('nStatus').innerHTML = ok
      ? `<strong class="ok">¡Bien! ${nq.name}${nq.oct}</strong><small>${why.trim() || '&nbsp;'}</small>`
      : `<strong class="bad">Era ${nq.name}${nq.oct}</strong><small>Elegiste ${name}.${why}</small>`;
    renderNoteMap();
    if (ok) nTimer = setTimeout(() => { if (view === 'notes') newNote(); }, 1300);
  }
  function updateNoteScore(){
    try { localStorage.setItem('intervalos-notas-puntaje', JSON.stringify(nScore)); } catch(e){}
    $('nOk').textContent = nScore.ok; $('nTotal').textContent = nScore.total; $('nStreak').textContent = nScore.streak;
  }
  function renderNoteMap(){
    const box = $('nMap');
    // notas de la configuración actual (sin repetir entre armaduras)
    const seen = new Map();
    (nAcc === 'key' ? [null, ...KEYSIGS] : [null]).forEach(ks => candidates(ks).forEach(c => seen.set(c.key, c)));
    const rows = [...seen.values()].filter(c => beta[c.key])
      .map(c => { const [a, b] = betaOf(c.key); return Object.assign({a, b, n: Math.round(a+b-2)}, c, betaSummary(a, b)); })
      .sort((x, y) => x.mean - y.mean || x.midi - y.midi);
    if (!rows.length){ box.innerHTML = '<p class="stats-note">Todavía no respondiste ninguna nota con esta clave y estas alteraciones.</p>'; return; }
    const more = rows.filter(r => r.mean < 0.75).slice(0, 5);
    const known = rows.filter(r => r.lo >= 0.6).sort((x,y) => y.lo - x.lo).slice(0, 5);
    const lbl = r => `${r.name}${r.oct}${settings.clef === 'both' ? (r.clef === 'bass' ? ' (Fa)' : ' (Sol)') : ''}`;
    const pct = x => Math.round(x*100);
    let html = `<div class="nlists"><div><h4>Practicá más</h4><p>${more.length ? more.map(lbl).join(', ') : 'Nada urgente.'}</p></div>`
      + `<div><h4>Ya las sabés</h4><p>${known.length ? known.map(lbl).join(', ') : 'Todavía ninguna con seguridad.'}</p></div></div>`;
    html += rows.map(r => {
      const col = `color-mix(in srgb, var(--ok) ${pct(r.mean)}%, var(--bad))`;
      const tip = `${lbl(r)}: acierto esperado ${pct(r.mean)}%, entre ${pct(r.lo)}% y ${pct(r.hi)}% (Beta(${+r.a.toFixed(1)}, ${+r.b.toFixed(1)}), ${r.n} respuestas)`;
      return `<div class="brow" title="${tip}"><span class="lab">${lbl(r)}</span><div class="btrack" role="img" aria-label="${tip}"><span class="g" style="left:50%"></span>`
        + `<span class="brange" style="left:${pct(r.lo)}%;width:${Math.max(1, pct(r.hi) - pct(r.lo))}%"></span>`
        + `<span class="bdot" style="left:${pct(r.mean)}%;background:${col}"></span></div><span class="val">${pct(r.mean)}%</span></div>`;
    }).join('');
    html += '<div class="baxis"><span></span><div><span>0%</span><span>50%</span><span>100%</span></div><span></span></div>';
    box.innerHTML = html;
  }
  document.querySelectorAll('input[name=nacc]').forEach(r => {
    r.checked = r.value === nAcc;
    r.addEventListener('change', () => { nAcc = r.value; try { localStorage.setItem('intervalos-notas-alt', nAcc); } catch(e){} nLastKey = null; newNote(); });
  });
  $('nNext').addEventListener('click', () => { audio(); newNote(); });
  $('nPlay').addEventListener('click', () => { if (!nq) return; audio(); stopAll(); tone(nq.midi, ctx.currentTime + 0.03, 1.2); });
  $('nReset').addEventListener('click', () => { beta = {}; saveBeta(); nScore.ok = nScore.total = nScore.streak = 0; updateNoteScore(); renderNoteMap(); });
  document.addEventListener('keydown', e => {
    if (view !== 'notes' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-4]$/.test(e.key) && nq && !nq.answered){ const b = document.querySelectorAll('.nopt')[+e.key - 1]; if (b) answerNote(b.dataset.name); }
    else if ((e.key === 'Enter' || e.key === ' ') && nq && nq.answered && !(e.target instanceof HTMLButtonElement)){ e.preventDefault(); audio(); newNote(); }
  });
  updateNoteScore();

  // ---------- Ajustes ----------
  document.querySelectorAll('input[name=clef]').forEach(r=>{
    r.checked = r.value===settings.clef;
    r.addEventListener('change', ()=>{
      settings.clef = r.value; saveSettings(); cancelAuto();
      stopAll(); q = null; pick = null; invState = null;
      $('staff').hidden = true; $('inv').hidden = true; $('skipBtn').hidden = true; $('repeatBtn').disabled = true;
      buildKeyboard(); renderAnswers();
      setStatus('<small>Tocá “Nuevo intervalo” o dos teclas.</small>');
      if (view === 'learn' && learnS !== null) showLearn(learnS, true);
      if (view === 'notes'){ nLastKey = null; newNote(); }
    });
  });
  document.querySelectorAll('input[name=mode]').forEach(r=>{
    r.checked = r.value===settings.mode;
    r.addEventListener('change', ()=>{ settings.mode = r.value; saveSettings(); cancelAuto(); });
  });
  document.querySelectorAll('input[name=reps]').forEach(r=>{
    r.checked = +r.value===settings.reps;
    r.addEventListener('change', ()=>{ settings.reps = +r.value; saveSettings(); });
  });
  function renderChips(){
    const box = $('chips'); box.innerHTML = '';
    INTERVALS.forEach(i=>{
      const l = document.createElement('label');
      l.innerHTML = `<input type="checkbox" ${settings.enabled.includes(i.s)?'checked':''}><span>${i.short}</span>`;
      l.querySelector('input').addEventListener('change', e=>{
        settings.enabled = e.target.checked ? [...settings.enabled, i.s].sort((a,b)=>a-b) : settings.enabled.filter(x=>x!==i.s);
        saveSettings(); renderAnswers();
      });
      box.appendChild(l);
    });
  }
  $('allBtn').addEventListener('click', ()=>{ settings.enabled=[1,2,3,4,5,6,7,8,9,10,11,12]; saveSettings(); renderChips(); renderAnswers(); });
  $('basicBtn').addEventListener('click', ()=>{ settings.enabled=[3,4,7,12]; saveSettings(); renderChips(); renderAnswers(); });

  if (!RANGES[settings.clef]) settings.clef = 'treble';
  if (!['up','down','updown','harm','mix'].includes(settings.mode)) settings.mode = 'up';
  document.querySelectorAll('input[name=rootMode]').forEach(r=>{
    r.checked = r.value === settings.rootMode;
    r.addEventListener('change', ()=>{ settings.rootMode = r.value; $('rootPc').disabled = r.value !== 'fixed'; saveSettings(); cancelAuto(); });
  });
  $('rootPc').value = String(settings.rootPc);
  $('rootPc').disabled = settings.rootMode !== 'fixed';
  $('rootPc').addEventListener('change', e=>{
    settings.rootPc = +e.target.value; saveSettings(); cancelAuto();
    if (settings.rootMode !== 'fixed'){ settings.rootMode = 'fixed'; document.querySelector('input[name=rootMode][value=fixed]').checked = true; }
    $('rootPc').disabled = false;
    if (view === 'learn' && learnS !== null) showLearn(learnS, true);
  });
  $('autoNext').checked = settings.autoNext !== false;
  $('autoNext').addEventListener('change', e=>{ settings.autoNext = e.target.checked; saveSettings(); if (!settings.autoNext) cancelAuto(); });
  $('resetWeights').addEventListener('click', ()=>{ weights = {}; saveWeights(); renderReview(); });
  renderReview();
  renderStats();
  $('resetScore').addEventListener('click', ()=>{ score.ok = score.total = score.streak = 0; updateScore(); });
  $('ok').textContent = score.ok; $('total').textContent = score.total; $('streak').textContent = score.streak;
  buildKeyboard();
  initAudio();
  renderChips(); renderAnswers();
  renderSteps();
  // API de sonido compartida con los módulos de teoría
  window.Sonido = {
    tocar(m, dur = 1.1){ audio(); tone(m, ctx.currentTime + 0.03, dur); },
    intervalo(a, b, armonico = false, veces = 1){ return playInterval(a, b, armonico, veces); },
    secuencia(ms, paso = 0.55){ audio(); stopAll(); const t = ctx.currentTime + 0.05; ms.forEach((m, i) => tone(m, t + i*paso, paso + 0.5)); return ms.length*paso*1000; },
    acorde(ms){ audio(); stopAll(); const t = ctx.currentTime + 0.05; ms.forEach(m => tone(m, t, 1.6)); },
    parar(){ stopAll(); },
    // Para ritmos: todo se programa en el reloj del audio (segundos)
    ahora(){ audio(); return ctx.currentTime; },
    nota(m, cuando, dur){ audio(); held(m, cuando, dur); },
    clic(cuando, fuerte, vol){ audio(); click(cuando, fuerte, vol); },
    golpe(){ audio(); knock(ctx.currentTime); },
    // Momento (en el reloj de performance.now(), ms) en que se oye un instante del reloj del audio
    aMs(t){
      audio();
      if (ctx.getOutputTimestamp){ const ts = ctx.getOutputTimestamp(); if (ts.performanceTime) return ts.performanceTime + (t - ts.contextTime)*1000; }
      return performance.now() + (t - ctx.currentTime + (ctx.outputLatency || 0) + (ctx.baseLatency || 0))*1000;
    }
  };
  window.Oido = { setView: v => setView(v), vista: () => view };
  try { const v0 = localStorage.getItem('intervalos-vista'); if (v0 === 'learn' || v0 === 'notes') setView(v0); } catch(e){}
})();
