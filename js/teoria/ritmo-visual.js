// Componentes visuales de ritmo: pentagrama rítmico de una línea (VexFlow), reproducción
// con cuenta previa y resaltado de cada figura, metrónomo, y línea de tiempo que compara
// los toques de la persona con el ritmo escrito.
(function(){
  const R = window.Ritmo, V = window.Visual;
  const {cssVar, color} = V;

  // Reproducciones y metrónomos en curso: Sonido.parar() también los corta
  const activos = new Set();
  if (window.Sonido){
    const parar = Sonido.parar;
    Sonido.parar = () => { const fs = [...activos]; activos.clear(); fs.forEach(f => f()); parar(); };
  }

  // ---------- Pentagrama rítmico ----------
  // op: {cifra (por defecto sí), textos: [uno por evento], conteo, colores: [uno por evento],
  //      ocultos: [índices que se dibujan invisibles con “?”], compacto, ancho, sinBarras, final, etiqueta,
  //      libre (figuras sueltas: sin cifra ni barras de compás)}
  // Devuelve {grupos: [elemento SVG de cada figura], marcar(i), limpiar()}
  V.ritmo = (el, p, op = {}) => {
    el.innerHTML = '';
    el.classList.add('pg', 'rit');
    const c = R.compas(p.compas);
    let grupos = [];
    const vista = {
      get grupos(){ return grupos; },
      marcar(i, cls = 'rit-on'){ grupos.forEach((g, k) => g.classList.toggle(cls, k === i)); },
      limpiar(cls = 'rit-on'){ grupos.forEach(g => g.classList.remove(cls)); }
    };
    if (!window.Vex || !Vex.Flow){ el.textContent = R.describir(p.ev); return vista; }
    try {
      const VF = Vex.Flow;
      const textos = op.textos || (op.conteo ? R.conteo(p) : null);
      const barras = op.libre ? [] : R.barras(p), ini = R.inicios(p);
      const cifra = op.cifra !== false && !op.libre;
      const paso = op.compacto ? 24 : 34;
      const W = op.ancho || Math.round(Math.max(op.compacto ? 150 : 200, (cifra ? 58 : 28) + barras.length*16 +
        p.ev.reduce((s, e) => s + paso*(e.f === 'w' ? 1.7 : e.f === 'h' ? 1.3 : 1) + (e.p ? 6 : 0), 0)));
      const H = (op.compacto ? 84 : 96) + (textos ? 20 : 0);
      const r = new VF.Renderer(el, VF.Renderer.Backends.SVG); r.resize(W, H);
      const ctx = r.getContext();
      const ink = cssVar('--ink');
      ctx.setFillStyle(ink); ctx.setStrokeStyle(ink);
      const st = new VF.Stave(4, op.compacto ? -12 : -4, W - 8);
      st.setConfigForLines([0, 1, 2, 3, 4].map(i => ({visible: i === 2})));
      st.setStyle({strokeStyle: cssVar('--muted'), fillStyle: ink});
      st.setBegBarType(VF.Barline.type.NONE);
      st.setEndBarType(op.libre ? VF.Barline.type.NONE : op.final ? VF.Barline.type.END : VF.Barline.type.SINGLE);
      if (cifra) st.addTimeSignature(c.id);
      st.setContext(ctx).draw();

      const notas = p.ev.map((e, i) => {
        const oculto = op.ocultos && op.ocultos.includes(i);
        const sn = new VF.StaveNote({keys: ['b/4'], duration: e.f + (e.p ? 'd' : '') + (e.s ? 'r' : ''), stem_direction: 1, auto_stem: false});
        if (e.p) VF.Dot.buildAndAttach([sn], {all: true});
        const col = oculto ? 'transparent' : op.colores && op.colores[i] ? color(op.colores[i]) : null;
        if (col){ sn.setStyle({fillStyle: col, strokeStyle: col}); if (sn.setLedgerLineStyle) sn.setLedgerLineStyle({strokeStyle: col}); }
        const tx = !oculto && textos && textos[i];
        if (tx){
          const an = new VF.Annotation(String(tx)).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
          an.setFont('Figtree, system-ui, sans-serif', 12, 'bold');
          const ac = op.colores && op.colores[i] ? color(op.colores[i]) : cssVar('--muted');
          an.setStyle({fillStyle: ac, strokeStyle: ac});
          sn.addModifier(an, 0);
        }
        return sn;
      });

      // Tresillos (antes de armar la voz: cambian la duración de las figuras)
      const porGrupo = {};
      p.ev.forEach((e, i) => { if (e.tres) (porGrupo[e.tres] = porGrupo[e.tres] || []).push(i); });
      const tresillos = Object.values(porGrupo).map(ix => new VF.Tuplet(ix.map(i => notas[i]), {num_notes: 3, notes_occupied: 2,
        bracketed: op.sinBarras || ix.some(i => p.ev[i].s || !['8', '16'].includes(p.ev[i].f))}));

      // Voz con barras de compás intercaladas
      const tick = [], porCompas = [[]];
      let bi = 0;
      notas.forEach((sn, i) => {
        while (bi < barras.length && barras[bi] <= ini[i] + 1e-6){ tick.push(new VF.BarNote()); porCompas.push([]); bi++; }
        tick.push(sn); porCompas[porCompas.length - 1].push(sn);
      });
      const voz = new VF.Voice({num_beats: c.num, beat_value: c.den}).setMode(VF.Voice.Mode.SOFT).addTickables(tick);
      const grupo = c.tipo === 'compuesto' ? new VF.Fraction(3, 8) : new VF.Fraction(1, 4);
      const barrasUnion = op.sinBarras || op.libre ? [] : porCompas.flatMap(ns => ns.length ? VF.Beam.generateBeams(ns, {groups: [grupo], stem_direction: 1}) : []);
      const ligaduras = [];
      p.ev.forEach((e, i) => { if (e.lig && notas[i + 1]) ligaduras.push(new VF.StaveTie({first_note: notas[i], last_note: notas[i + 1], first_indices: [0], last_indices: [0]})); });

      new VF.Formatter().joinVoices([voz]).format([voz], W - st.getNoteStartX() - 16);
      voz.draw(ctx, st);
      barrasUnion.forEach(b => b.setContext(ctx).draw());
      tresillos.forEach(t => t.setContext(ctx).draw());
      ligaduras.forEach(t => t.setContext(ctx).draw());
      // Las figuras ocultas dejan su lugar marcado con un signo de pregunta
      (op.ocultos || []).forEach(i => {
        if (!notas[i]) return;
        ctx.save(); ctx.setFont('Figtree, system-ui, sans-serif', 20, 'bold'); ctx.setFillStyle(cssVar('--first'));
        ctx.fillText('?', notas[i].getAbsoluteX() + 1, st.getYForLine(2) + 7); ctx.restore();
      });

      const svg = el.querySelector('svg');
      if (svg){
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.removeAttribute('width'); svg.removeAttribute('height');
        svg.style.maxWidth = W*(op.compacto ? 1.15 : 1.35) + 'px';
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', op.etiqueta || `Ritmo en ${c.id}: ${R.describir(p.ev)}`);
        const gs = [...svg.querySelectorAll('.vf-stavenote')];
        if (gs.length === notas.length) grupos = gs;
      }
    } catch(e){ el.textContent = R.describir(p.ev); }
    return vista;
  };
  // El mismo pentagrama como texto SVG (para usarlo dentro de un botón de opción)
  V.ritmoHTML = (p, op = {}) => { const d = document.createElement('div'); V.ritmo(d, p, Object.assign({compacto: true}, op)); return `<span class="rit-op">${d.innerHTML}</span>`; };

  // ---------- Reproducción ----------
  // op: {bpm, cuenta (compases de cuenta previa; 1 por defecto), metronomo (clic en cada pulso mientras suena),
  //      midi o alturas [una por ataque], sinNotas (solo los clics), vista (lo que devuelve V.ritmo, para resaltar cada figura),
  //      alPulso({numero, fuerte, previa}), alTerminar()}
  // Devuelve {inicio: segundo (reloj del audio) en que empieza el ritmo, spu: segundos por unidad, spp: segundos por pulso, fin, parar()}
  V.tocarRitmo = (p, op = {}) => {
    Sonido.parar();
    const c = R.compas(p.compas);
    const bpm = op.bpm || 80, spp = 60/bpm, spu = spp/c.pulso;
    const cuenta = op.cuenta === undefined ? 1 : op.cuenta;
    const a = p.anacrusa || 0, L = R.largo(p);
    const t0 = Sonido.ahora() + 0.15;
    const inicio = t0 + Math.max(0, cuenta*c.largo - a)*spu;
    const fin = inicio + L*spu;
    const timers = [];
    const en = (t, fn) => timers.push(setTimeout(fn, Math.max(0, Sonido.aMs(t) - performance.now())));
    const acentos = op.acento === false ? R.acentos(c).map(() => 0) : R.acentos(c);
    // Clics alineados con el primer tiempo fuerte: la cuenta previa (que abarca la anacrusa, si hay)
    // y, si se pide, el metrónomo mientras suena el ritmo
    const tFuerte = inicio + a*spu;
    const kIni = -(cuenta ? cuenta*c.pulsos : Math.ceil(a/c.pulso - 1e-6));
    for (let k = kIni; ; k++){
      const t = tFuerte + k*spp;
      if (t > fin - 0.02) break;
      const previa = k < 0 && cuenta > 0;
      if (!previa && (!op.metronomo || t < inicio - 1e-3)) continue;
      const i = ((k % c.pulsos) + c.pulsos) % c.pulsos;
      Sonido.clic(t, acentos[i] === 2, acentos[i] === 1 ? 1.15 : 1);
      if (op.alPulso) en(t, () => op.alPulso({numero: i + 1, fuerte: i === 0, previa}));
    }
    const at = R.ataques(p);
    if (!op.sinNotas) at.forEach((x, j) => Sonido.nota(op.alturas ? op.alturas[j] : (op.midi || 72), inicio + x.t*spu, Math.max(0.08, x.d*spu*0.9)));
    if (op.vista){
      R.inicios(p).forEach((t, i) => en(inicio + t*spu, () => op.vista.marcar(i)));
      en(fin, () => op.vista.limpiar());
    }
    let terminado = false;
    const parar = () => { timers.forEach(clearTimeout); if (op.vista) op.vista.limpiar(); activos.delete(parar); };
    en(fin + 0.05, () => { activos.delete(parar); if (!terminado && op.alTerminar){ terminado = true; op.alTerminar(); } });
    activos.add(parar);
    return {inicio, spu, spp, fin, parar};
  };

  // ---------- Metrónomo ----------
  // op: {bpm, compas, min, max, acento (por defecto sí), alPulso(numero, fuerte), alIniciar(), sinTempo (oculta el control de tempo)}
  V.metronomo = (el, op = {}) => {
    let bpm = op.bpm || 80, compas = op.compas || '4/4', timer = null, prox = 0, k = 0;
    const d = document.createElement('div'); d.className = 'met';
    d.innerHTML = `<button type="button" class="btn secondary met-play">▶ Metrónomo</button>
      ${op.sinTempo ? '' : `<label class="met-bpm"><span>♩ = <output>${bpm}</output></span><input type="range" min="${op.min || 40}" max="${op.max || 200}" value="${bpm}" aria-label="Tempo en pulsaciones por minuto"></label>`}
      <span class="met-term"></span><span class="met-dots" aria-hidden="true"></span>`;
    el.appendChild(d);
    const btn = d.querySelector('.met-play'), dots = d.querySelector('.met-dots');
    const pintar = () => {
      dots.innerHTML = R.acentos(R.compas(compas)).map(a => `<span class="a${op.acento === false ? 0 : a}"></span>`).join('');
      const t = R.tempoDe(bpm);
      d.querySelector('.met-term').textContent = `${bpm} BPM · ${t.nombre} (${t.desc})`;
      const o = d.querySelector('output'); if (o) o.textContent = bpm;
    };
    function programar(){
      const c = R.compas(compas), ac = op.acento === false ? R.acentos(c).map(() => 0) : R.acentos(c);
      while (prox < Sonido.ahora() + 0.12){
        const i = k % c.pulsos, cuando = prox;
        Sonido.clic(cuando, ac[i] === 2, ac[i] === 1 ? 1.15 : 1);
        setTimeout(() => {
          if (!timer) return;
          [...dots.children].forEach((s, j) => s.classList.toggle('on', j === i));
          if (op.alPulso) op.alPulso(i + 1, i === 0);
        }, Math.max(0, Sonido.aMs(cuando) - performance.now()));
        prox += 60/bpm; k++;
      }
    }
    const parar = () => { clearInterval(timer); timer = null; activos.delete(parar); btn.textContent = '▶ Metrónomo'; [...dots.children].forEach(s => s.classList.remove('on')); };
    const iniciar = () => {
      Sonido.parar();
      prox = Sonido.ahora() + 0.1; k = 0;
      timer = setInterval(programar, 25); programar();
      activos.add(parar);
      btn.textContent = '■ Parar';
      if (op.alIniciar) op.alIniciar();
    };
    btn.addEventListener('click', () => timer ? parar() : iniciar());
    const rango = d.querySelector('input');
    if (rango) rango.addEventListener('input', () => { bpm = +rango.value; pintar(); if (op.alCambiar) op.alCambiar(bpm); });
    pintar();
    return {
      iniciar, parar,
      get activo(){ return !!timer; },
      bpm(v){ bpm = v; if (rango) rango.value = v; pintar(); },
      compas(v){ compas = v; k = 0; pintar(); }
    };
  };

  // ---------- Tocar un ritmo: cuenta previa y toques con la barra espaciadora o la pantalla ----------
  // op: {bpm, metronomo (valor inicial del interruptor), vista (para resaltar las figuras mientras pasan),
  //      escuchar (agrega “Escuchar primero”), textoBoton, alCambiarMetronomo(bool),
  //      alTerminar({golpes (s desde el comienzo del ritmo), spp, spu})}
  V.tapear = (el, p, op = {}) => {
    const c = R.compas(p.compas), bpm = op.bpm || 80;
    const d = document.createElement('div'); d.className = 'tap';
    d.innerHTML = `<div class="tap-ctrl"><button type="button" class="btn primary tap-go">${op.textoBoton || '▶ Empezar'}</button>
        ${op.escuchar ? '<button type="button" class="btn secondary tap-oir">▶ Escuchar primero</button>' : ''}
        <label class="chk"><input type="checkbox" class="tap-met"${op.metronomo === false ? '' : ' checked'}> <span>Clic del metrónomo mientras tocás</span></label></div>
      <p class="tap-info">♩ = ${bpm}${c.tipo === 'compuesto' ? ' (el clic marca cada negra con puntillo)' : ''}. Primero suena un compás de cuenta; después tocá al comienzo de cada figura, con la <kbd>barra espaciadora</kbd> o en el recuadro.</p>
      <button type="button" class="tap-pad" disabled aria-label="Recuadro para tocar el ritmo"><span class="tap-cuenta" aria-live="off"></span><span class="tap-hint">Tocá «Empezar»</span></button>`;
    el.appendChild(d);
    const go = d.querySelector('.tap-go'), pad = d.querySelector('.tap-pad'), cuenta = d.querySelector('.tap-cuenta'), hint = d.querySelector('.tap-hint');
    let abierto = false, golpes = [], base = 0, desde = 0, h = null, cierre = null;
    const tocar = ts => {
      if (!abierto) return;
      golpes.push(ts);
      Sonido.golpe();
      pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit');
    };
    const tecla = e => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown' && !e.repeat) tocar(e.timeStamp || performance.now());
    };
    const soltar = () => { document.removeEventListener('keydown', tecla, true); document.removeEventListener('keyup', tecla, true); };
    pad.addEventListener('pointerdown', e => { e.preventDefault(); tocar(e.timeStamp || performance.now()); });
    const cerrar = () => {
      abierto = false; soltar(); clearTimeout(cierre); activos.delete(detener);
      pad.disabled = true; cuenta.textContent = ''; hint.textContent = 'Listo';
      if (!document.body.contains(d)) return;
      const rel = golpes.map(g => (g - base)/1000).filter(t => t >= desde);
      if (op.alTerminar) op.alTerminar({golpes: rel, spp: h.spp, spu: h.spu});
    };
    go.addEventListener('click', () => {
      go.disabled = true; golpes = [];
      const oir = d.querySelector('.tap-oir'); if (oir) oir.disabled = true;
      if (document.activeElement) document.activeElement.blur();
      h = V.tocarRitmo(p, {bpm, sinNotas: true, metronomo: d.querySelector('.tap-met').checked, vista: op.vista, cuenta: 1,
        alPulso: x => { cuenta.textContent = x.previa ? x.numero : ''; }});
      base = Sonido.aMs(h.inicio);
      desde = -Math.min(0.3, h.spp/2);
      abierto = true; pad.disabled = false; pad.focus({preventScroll: true});
      hint.textContent = 'Escuchá la cuenta…';
      setTimeout(() => { if (abierto) hint.textContent = '¡Ahora!'; }, Math.max(0, Sonido.aMs(h.inicio) - performance.now()));
      setTimeout(() => { if (abierto) cuenta.textContent = ''; }, Math.max(0, Sonido.aMs(h.inicio + (p.anacrusa || 0)*h.spu) - performance.now()) + 150);
      document.addEventListener('keydown', tecla, true); document.addEventListener('keyup', tecla, true);
      cierre = setTimeout(cerrar, Math.max(0, Sonido.aMs(h.fin) - performance.now()) + Math.max(350, h.spp*500));
      activos.add(detener);
    });
    const detener = () => { if (abierto){ abierto = false; soltar(); clearTimeout(cierre); pad.disabled = true; go.disabled = false; hint.textContent = 'Tocá «Empezar»'; cuenta.textContent = ''; } };
    d.querySelector('.tap-met').addEventListener('change', e => { if (op.alCambiarMetronomo) op.alCambiarMetronomo(e.target.checked); });
    const oir = d.querySelector('.tap-oir');
    if (oir) oir.addEventListener('click', () => V.tocarRitmo(p, {bpm, metronomo: true, vista: op.vista}));
    return {reiniciar(){ go.disabled = false; if (oir) oir.disabled = false; hint.textContent = 'Tocá «Empezar»'; }};
  };

  // ---------- Línea de tiempo: ritmo escrito contra los toques ----------
  // d: {total, pulsos: [s], barras: [s], esperados: [{t, estado: 'ok'|'cerca'|'mal'|'falta'}], golpes: [{t, estado: 'ok'|'cerca'|'mal'|'extra', de}]}
  // (tiempos en segundos desde el comienzo del ritmo; golpe.de = índice del esperado que le corresponde)
  V.lineaTiempo = (el, d) => {
    const W = 600, H = 92, pad = 16;
    const tmin = Math.min(0, ...d.golpes.map(g => g.t)) - 0.08;
    const tmax = Math.max(d.total, ...d.golpes.map(g => g.t)) + 0.08;
    const x = t => (pad + (t - tmin)/(tmax - tmin)*(W - 2*pad)).toFixed(1);
    const y1 = 30, y2 = 68;
    const col = {ok: 'var(--ok)', cerca: 'var(--first)', mal: 'var(--bad)', falta: 'var(--bad)', extra: 'var(--bad)'};
    const partes = [];
    d.pulsos.forEach(t => partes.push(`<line x1="${x(t)}" x2="${x(t)}" y1="${y1 - 12}" y2="${y2 + 10}" class="lt-pulso"/>`));
    d.barras.forEach(t => partes.push(`<line x1="${x(t)}" x2="${x(t)}" y1="${y1 - 14}" y2="${y2 + 12}" class="lt-barra"/>`));
    partes.push(`<line x1="${pad}" x2="${W - pad}" y1="${y1}" y2="${y1}" class="lt-eje"/><line x1="${pad}" x2="${W - pad}" y1="${y2}" y2="${y2}" class="lt-eje"/>`);
    partes.push(`<text x="${pad}" y="${y1 - 17}" class="lt-lab">Escrito</text><text x="${pad}" y="${y2 + 22}" class="lt-lab">Tus toques</text>`);
    d.golpes.forEach(g => { if (g.de !== undefined && g.de !== null) partes.push(`<line x1="${x(d.esperados[g.de].t)}" y1="${y1 + 6}" x2="${x(g.t)}" y2="${y2 - 6}" class="lt-une" style="stroke:${col[g.estado]}"/>`); });
    d.esperados.forEach(e => partes.push(`<circle cx="${x(e.t)}" cy="${y1}" r="6" class="lt-esp${e.estado === 'falta' ? ' falta' : ''}"/>`));
    d.golpes.forEach(g => partes.push(g.estado === 'extra'
      ? `<path d="M${x(g.t) - 5} ${y2 - 5}l10 10m0 -10l-10 10" class="lt-x"/>`
      : `<circle cx="${x(g.t)}" cy="${y2}" r="5.5" style="fill:${col[g.estado]}"/>`));
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="lt" role="img" aria-label="Comparación entre el ritmo escrito y tus toques">${partes.join('')}</svg>
      <p class="lt-ley"><span style="--c:var(--ok)">a tiempo</span><span style="--c:var(--first)">cerca</span><span style="--c:var(--bad)">fuera de tiempo</span><span class="x">toque de más</span><span class="o">nota que faltó</span></p>`;
  };

  // ---------- Evaluar toques ----------
  // esperados y golpes en segundos desde el comienzo del ritmo. Devuelve el emparejamiento y la calidad de cada toque.
  // Se descuenta un retraso constante (latencia del audio o de los auriculares) de hasta 150 ms.
  V.compararToques = (esperados, golpes, spp) => {
    const tol = Math.min(0.1, Math.max(0.05, 0.12*spp));
    const emparejar = corr => {
      const usados = new Set(), pares = esperados.map(() => null);
      esperados.forEach((t, i) => {
        const antes = i > 0 ? (t - esperados[i - 1])/2 : 0.35, despues = i < esperados.length - 1 ? (esperados[i + 1] - t)/2 : 0.35;
        let mejor = null, dist = Infinity;
        golpes.forEach((g, j) => {
          if (usados.has(j)) return;
          const dd = g - corr - t;
          if (dd >= -Math.min(antes, 0.35) && dd <= Math.min(despues, 0.35) && Math.abs(dd) < dist){ mejor = j; dist = Math.abs(dd); }
        });
        if (mejor !== null){ usados.add(mejor); pares[i] = mejor; }
      });
      return pares;
    };
    let pares = emparejar(0);
    const difs = pares.map((j, i) => j === null ? null : golpes[j] - esperados[i]).filter(x => x !== null).sort((a, b) => a - b);
    const med = difs.length ? difs[Math.floor(difs.length/2)] : 0;
    const corr = Math.abs(med) <= 0.15 ? med : 0;
    if (corr) pares = emparejar(corr);
    const esp = esperados.map((t, i) => {
      const j = pares[i];
      if (j === null) return {t, estado: 'falta', j: null, dif: null};
      const dif = golpes[j] - corr - t;
      return {t, j, dif, estado: Math.abs(dif) <= tol ? 'ok' : Math.abs(dif) <= 2*tol ? 'cerca' : 'mal'};
    });
    const de = {}; esp.forEach((e, i) => { if (e.j !== null) de[e.j] = i; });
    const gol = golpes.map((g, j) => de[j] === undefined ? {t: g - corr, estado: 'extra', de: null} : {t: g - corr, estado: esp[de[j]].estado, de: de[j]});
    return {esperados: esp, golpes: gol, corr, tol,
      bien: esp.filter(e => e.estado === 'ok').length, cerca: esp.filter(e => e.estado === 'cerca').length,
      mal: esp.filter(e => e.estado === 'mal').length, faltan: esp.filter(e => e.estado === 'falta').length,
      extras: gol.filter(g => g.estado === 'extra').length};
  };
})();
