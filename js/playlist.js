// Playlist de intervalos: cada intervalo suena tres veces, queda una pausa para adivinarlo,
// una voz dice cuál era y, unos segundos después, sigue otro. Cada intervalo se renderiza a
// un WAV que se reproduce con un <audio>: así el navegador lo trata como un reproductor
// (sigue sonando con la pantalla bloqueada o en otra pestaña) y se maneja desde los
// controles multimedia del sistema (Media Session API).
(function(){
  const $ = id => document.getElementById(id);
  const M = window.Musica, V = window.Visual;
  // semitonos: [nombre, nombre corto, número, calidad]
  const INTERVALOS = {
    1: ['Segunda menor', '2ª menor', 2, 'm'], 2: ['Segunda mayor', '2ª mayor', 2, 'M'],
    3: ['Tercera menor', '3ª menor', 3, 'm'], 4: ['Tercera mayor', '3ª mayor', 3, 'M'],
    5: ['Cuarta justa', '4ª justa', 4, 'J'], 6: ['Tritono', 'Tritono', 4, 'A'],
    7: ['Quinta justa', '5ª justa', 5, 'J'], 8: ['Sexta menor', '6ª menor', 6, 'm'],
    9: ['Sexta mayor', '6ª mayor', 6, 'M'], 10: ['Séptima menor', '7ª menor', 7, 'm'],
    11: ['Séptima mayor', '7ª mayor', 7, 'M'], 12: ['Octava', 'Octava', 8, 'J']
  };
  const TODOS = Object.keys(INTERVALOS).map(Number);
  const FORMAS = [['up', 'Ascendente'], ['down', 'Descendente'], ['harm', 'Juntas'], ['mix', 'Una de cada']];
  const PAUSAS = [3, 5, 8];
  const ESPERA = 3;   // segundos entre la respuesta y el intervalo siguiente
  const ICONOS = [192, 512].map(n => ({src: `img/playlist-${n}.png`, sizes: `${n}x${n}`, type: 'image/png'}));

  let cfg = {forma: 'up', pausa: 5, enabled: TODOS.slice()};
  try { const g = JSON.parse(localStorage.getItem('playlist-config')); if (g) cfg = Object.assign(cfg, g); } catch(e){}
  const guardar = () => { try { localStorage.setItem('playlist-config', JSON.stringify(cfg)); } catch(e){} };

  // ---------- Pistas ----------
  function aWav(datos, sr){
    const n = datos.length, ab = new ArrayBuffer(44 + n*2), v = new DataView(ab);
    const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    txt(0, 'RIFF'); v.setUint32(4, 36 + n*2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr*2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    txt(36, 'data'); v.setUint32(40, n*2, true);
    for (let i = 0; i < n; i++){ const x = Math.max(-1, Math.min(1, datos[i])); v.setInt16(44 + i*2, x < 0 ? x*0x8000 : x*0x7FFF, true); }
    return new Blob([ab], {type: 'audio/wav'});
  }
  const SILENCIO = URL.createObjectURL(aWav(new Float32Array(1600), 8000));

  const voces = {};
  const vozDe = s => voces[s] || (voces[s] = window.VOCES_INTERVALOS && VOCES_INTERVALOS[s]
    ? Sonido.decodificar(VOCES_INTERVALOS[s]).catch(() => null) : Promise.resolve(null));
  const muestras = () => Promise.race([Sonido.muestras(), new Promise(r => setTimeout(r, 4000))]);

  // Las tres repeticiones empiezan en Do (Do5 al bajar, para quedar en un registro cómodo).
  // «Una de cada» usa las mismas dos notas: subiendo, bajando y juntas.
  async function crearPista(s){
    const mix = cfg.forma === 'mix';
    const formas = mix ? ['up', 'down', 'harm'] : [cfg.forma, cfg.forma, cfg.forma];
    const lo = cfg.forma === 'down' ? 72 - s : 60, hi = lo + s;
    const notas = [], reps = [];
    let t = 0.2;
    formas.forEach(f => {
      reps.push(t);
      if (f === 'harm'){ notas.push({midi: lo, t, dur: 1.5}, {midi: hi, t, dur: 1.5}); t += 2.1; }
      else { const [a, b] = f === 'down' ? [hi, lo] : [lo, hi]; notas.push({midi: a, t, dur: 0.9}, {midi: b, t: t + 0.8, dur: 1.1}); t += 2.4; }
    });
    await muestras();
    const voz = await vozDe(s);
    const marcas = {reps, finReps: t, voz: t + cfg.pausa};
    marcas.finVoz = marcas.voz + (voz ? voz.duration : 0.8);
    marcas.dur = marcas.finVoz + ESPERA;
    const buf = await Sonido.renderizar(notas, voz ? [{buffer: voz, t: marcas.voz, vol: 0.6}] : [], marcas.dur);
    return {s, formas, forma: cfg.forma, marcas, url: URL.createObjectURL(aWav(buf.getChannelData(0), buf.sampleRate))};
  }

  // Al azar entre los elegidos; los que más se fallan en «Adivinar intervalos» salen un poco más seguido
  function elegir(evitar){
    const lista = cfg.enabled.length ? cfg.enabled : TODOS;
    let pesos = {};
    try { pesos = JSON.parse(localStorage.getItem('intervalos-pesos')) || {}; } catch(e){}
    const dirs = cfg.forma === 'mix' ? ['up', 'down', 'harm'] : [cfg.forma];
    const peso = s => 1 + 0.5*(dirs.reduce((a, d) => a + (pesos[d + ':' + s] || 1), 0)/dirs.length - 1);
    const cands = lista.length > 1 ? lista.filter(s => s !== evitar) : lista;
    let r = Math.random()*cands.reduce((a, s) => a + peso(s), 0);
    for (const s of cands){ r -= peso(s); if (r <= 0) return s; }
    return cands[cands.length - 1];
  }

  // ---------- Reproductor ----------
  const el = new Audio();
  el.preload = 'auto';
  let pista = null, proxima = null, preparando = null, gen = 0, numero = 0, escuchados = 0, revelada = false, ui = null, raf = 0;

  function preparar(){
    if (proxima) return Promise.resolve(proxima);
    if (preparando) return preparando;
    const g = gen;
    preparando = crearPista(elegir(pista ? pista.s : null)).then(p => {
      preparando = null;
      if (g !== gen){ URL.revokeObjectURL(p.url); return preparar(); }   // cambiaron los ajustes mientras se armaba
      proxima = p;
      return p;
    }, e => { preparando = null; throw e; });
    return preparando;
  }
  function cargar(p){
    const vieja = pista;
    pista = p; proxima = null; revelada = false; numero++;
    el.src = p.url;
    if (vieja) URL.revokeObjectURL(vieja.url);
    pintar(); metadatos();
  }
  const empezar = () => el.play().catch(() => { if (ui) ui.fase.textContent = 'Tocá ▶ para seguir escuchando'; });
  async function siguiente(){
    try {
      const p = await preparar();
      cargar(p);
      await empezar();
      preparar();
    } catch(e){ if (ui) ui.fase.textContent = 'No se pudo preparar el audio en este navegador'; }
  }
  function reproducir(){
    if (pista){ empezar(); return; }
    if (proxima){ cargar(proxima); empezar(); preparar(); return; }
    // Todavía se está armando la primera pista: se habilita el audio ahora (dentro del toque) y se espera
    el.src = SILENCIO; el.play().catch(() => {});
    if (ui) ui.fase.textContent = 'Preparando…';
    siguiente();
  }
  const pausar = () => el.pause();
  function repetir(){ if (!pista) return; el.currentTime = 0; revelada = false; pintar(); metadatos(); empezar(); }
  function cambiarAjustes(){
    guardar(); gen++;
    if (proxima){ URL.revokeObjectURL(proxima.url); proxima = null; }
    preparar().catch(() => {});
  }

  el.addEventListener('ended', () => { if (pista) siguiente(); });
  el.addEventListener('timeupdate', fase);
  el.addEventListener('play', () => { estado(); bucle(); });
  el.addEventListener('pause', estado);
  document.addEventListener('visibilitychange', bucle);
  function bucle(){ cancelAnimationFrame(raf); if (el.paused || document.hidden) return; fase(); raf = requestAnimationFrame(bucle); }

  if ('mediaSession' in navigator){
    const accion = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch(e){} };
    accion('play', reproducir);
    accion('pause', pausar);
    accion('nexttrack', siguiente);
    accion('previoustrack', repetir);
    accion('stop', () => { el.pause(); if (pista) el.currentTime = 0; });
  }
  function metadatos(){
    if (!('mediaSession' in navigator) || !pista || !window.MediaMetadata) return;
    const forma = FORMAS.find(f => f[0] === pista.forma)[1].toLowerCase();
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: revelada ? INTERVALOS[pista.s][0] : '¿Qué intervalo es?',
        artist: `Intervalo ${numero} · ${forma}`, album: 'Playlist de intervalos', artwork: ICONOS});
    } catch(e){}
  }
  function estado(){
    const sonando = !el.paused && !!pista;
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = sonando ? 'playing' : 'paused';
    if (!ui) return;
    ui.play.textContent = sonando ? '⏸ Pausa' : pista ? '▶ Seguir' : '▶ Reproducir';
    ui.play.setAttribute('aria-pressed', String(sonando));
    ui.rep.disabled = ui.sig.disabled = !pista;
  }

  // ---------- Pantalla ----------
  // Notas escritas del intervalo, desde Do (para el pentagrama y los nombres)
  function escritas(p){
    const [, , num, cal] = INTERVALOS[p.s];
    if (p.forma === 'down'){ const d = M.nota(0, 0, 5); return {a: d, b: M.construir(d, num, cal, true)}; }
    const d = M.nota(0, 0, 4);
    return {a: d, b: M.construir(d, num, cal)};
  }
  function pintar(){
    if (!ui || !pista) return;
    const m = pista.marcas;
    ui.barra.style.setProperty('--a', (100*m.finReps/m.dur).toFixed(1) + '%');
    ui.barra.style.setProperty('--b', (100*m.voz/m.dur).toFixed(1) + '%');
    ui.nombre.classList.toggle('oculto', !revelada);
    ui.nombre.textContent = revelada ? INTERVALOS[pista.s][0] : '?';
    const {a, b} = escritas(pista);
    const juntas = pista.forma === 'harm';
    ui.det.textContent = revelada ? `${juntas ? `${M.corto(a)} y ${M.corto(b)}, juntas` : `${M.corto(a)} → ${M.corto(b)}`} · ${M.plural(pista.s, 'semitono')}` : 'Pensá qué intervalo es antes de que lo diga la voz.';
    if (revelada && V) V.pentagrama(ui.staff, {armonico: juntas, notas: [{l: a.l, o: a.o, acc: a.a || null, color: 'a'}, {l: b.l, o: b.o, acc: b.a || null, color: 'b'}]});
    else ui.staff.innerHTML = '';
    ui.cont.textContent = `${M.plural(escuchados, 'intervalo')} en esta sesión`;
  }
  function fase(){
    if (!pista) return;
    const t = el.currentTime, m = pista.marcas;
    const rev = t >= m.voz - 0.05;
    if (rev !== revelada){
      revelada = rev;
      if (rev && !pista.contado){ pista.contado = true; escuchados++; }
      pintar(); metadatos();
    }
    if (!ui) return;
    ui.fase.textContent = t < m.finReps ? `Escuchá · ${Math.max(1, m.reps.filter(x => t >= x - 0.05).length)} de 3`
      : !rev ? `¿Qué intervalo es? · ${Math.ceil(m.voz - t)}`
      : t < m.finVoz + 0.3 ? 'Era…' : `Siguiente en ${Math.max(1, Math.ceil(m.dur - t))}`;
    ui.prog.style.width = Math.min(100, 100*t/m.dur).toFixed(2) + '%';
  }

  function construir(){
    const s = $('playlistView');
    const seg = (nombre, items, valor) => `<div class="seg">${items.map(([v, t]) => `<label><input type="radio" name="${nombre}" value="${v}"${String(v) === String(valor) ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
    s.innerHTML = `
      <div class="pl-card">
        <p class="pl-fase" id="plFase" aria-live="polite">Tocá ▶ para empezar</p>
        <p class="pl-nombre oculto" id="plNombre">?</p>
        <p class="pl-det" id="plDet">Cada intervalo suena tres veces; después tenés ${cfg.pausa} segundos para adivinarlo antes de que la voz lo diga.</p>
        <div class="pl-staff" id="plStaff"></div>
        <div class="pl-barra" id="plBarra" aria-hidden="true"><span id="plProg"></span></div>
        <div class="pl-ctrl">
          <button type="button" class="btn secondary pl-ico" id="plRep" aria-label="Repetir este intervalo" title="Repetir este intervalo" disabled>⟲</button>
          <button type="button" class="btn primary pl-play" id="plPlay" aria-pressed="false">▶ Reproducir</button>
          <button type="button" class="btn secondary pl-ico" id="plSig" aria-label="Siguiente intervalo" title="Siguiente intervalo" disabled>⏭</button>
        </div>
        <p class="pl-cont" id="plCont"></p>
      </div>
      <div class="clefbar"><span>Sonido</span>${seg('plForma', FORMAS, cfg.forma)}</div>
      <div class="clefbar"><span>Para adivinar</span>${seg('plPausa', PAUSAS.map(x => [x, x + ' segundos']), cfg.pausa)}</div>
      <details class="pl-aj" open>
        <summary>Intervalos que entran</summary>
        <div class="chips" id="plChips">${TODOS.map(x => `<label><input type="checkbox" value="${x}"${cfg.enabled.includes(x) ? ' checked' : ''}><span>${INTERVALOS[x][1]}</span></label>`).join('')}</div>
        <button type="button" class="mini" id="plTodos">Todos</button><button type="button" class="mini" id="plBasicos">Solo 3ª, 5ª y 8ª</button>
        <p class="stats-note">Salen al azar. Los que más fallás en «Adivinar intervalos» aparecen un poco más seguido. Los cambios se aplican desde el próximo intervalo.</p>
      </details>
      <p class="stats-note">Podés bloquear la pantalla o cambiar de pestaña: la playlist sigue sonando y se maneja desde los controles multimedia del sistema (pantalla de bloqueo, auriculares o teclas ⏯ y ⏭). ⏮ repite el intervalo actual.</p>`;
    ui = {fase: $('plFase'), nombre: $('plNombre'), det: $('plDet'), staff: $('plStaff'), barra: $('plBarra'), prog: $('plProg'),
          play: $('plPlay'), rep: $('plRep'), sig: $('plSig'), cont: $('plCont')};
    ui.play.addEventListener('click', () => el.paused || !pista ? reproducir() : pausar());
    ui.rep.addEventListener('click', repetir);
    ui.sig.addEventListener('click', siguiente);
    s.querySelectorAll('input[name=plForma]').forEach(i => i.addEventListener('change', () => { cfg.forma = i.value; cambiarAjustes(); }));
    s.querySelectorAll('input[name=plPausa]').forEach(i => i.addEventListener('change', () => { cfg.pausa = +i.value; cambiarAjustes(); }));
    const chips = () => { cfg.enabled = [...s.querySelectorAll('#plChips input:checked')].map(i => +i.value); cambiarAjustes(); };
    s.querySelectorAll('#plChips input').forEach(i => i.addEventListener('change', chips));
    const marcar = lista => { s.querySelectorAll('#plChips input').forEach(i => i.checked = lista.includes(+i.value)); chips(); };
    $('plTodos').addEventListener('click', () => marcar(TODOS));
    $('plBasicos').addEventListener('click', () => marcar([3, 4, 7, 12]));
    pintar(); fase(); estado();
  }
  function mostrar(){
    if (!ui) construir();
    preparar().catch(() => {});   // la primera pista queda lista antes de tocar ▶
  }

  window.Playlist = {mostrar};
  if (window.Oido && Oido.vista() === 'playlist') mostrar();
})();
