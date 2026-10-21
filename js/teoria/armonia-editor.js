// Editor interactivo a cuatro voces (SATB) en sistema de dos pentagramas.
// Se puede tocar el pentagrama para escribir o elegir una nota, moverla con las flechas y
// alterarla; el acorde, los intervalos, los movimientos y los problemas de conducción se
// actualizan en el momento. Se puede escuchar todo, un acorde, un enlace o cada voz.
(function(){
  const M = window.Musica, V = window.Visual, A = window.Armonia;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const boton = (texto, cls, fn, titulo) => { const b = h('button', 'btn ' + (cls || 'secondary'), texto); b.type = 'button'; if (titulo){ b.title = titulo; b.setAttribute('aria-label', titulo); } if (fn) b.addEventListener('click', fn); return b; };
  const VF_ACC = {'-2': 'bb', '-1': 'b', '0': 'n', '1': '#', '2': '##'};
  const BASE = {treble: 30, bass: 18};               // paso de la línea inferior: Mi4 / Sol2
  const MIEMBRO = {F: 'fundamental', '3': 'tercera', '5': 'quinta', '7': 'séptima', '9': 'novena', '♭6': '♭6 (sexta menor)', '1': 'tónica', '♯4': '♯4 (cuarta aumentada)', '2': '2 (segunda)', '♭3': '♭3 (tercera menor)'};
  const SEV = {error: 'Error de conducción', aviso: 'Estilo', info: 'Excepción o consejo'};
  const TIPO = {regla: 'Regla general', estilo: 'Preferencia de estilo', consejo: 'Excepción aceptada / consejo'};
  const INICIO = {S: 35, A: 32, T: 28, B: 21};       // paso donde aparece una voz vacía al usar las flechas
  const copia = cols => cols.map(c => { const o = {}; A.VOCES.forEach(v => o[v] = c[v] ? {l: c[v].l, a: c[v].a, o: c[v].o} : null); return o; });
  const rgba = (hex, al) => { const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${al})` : hex; };
  const ED = {};

  // op: {K, cols, fijas: [{S: true…}] voces dadas, cifrado: [acorde|null] pedido, mostrarCifrado,
  //      soloLectura, panel (true), onCambio(analisis), sinCifra (no mostrar numerales),
  //      sinMarcas (no colorear errores), resaltar: {voces, cols} (destacar notas), audioVoces (true)}
  ED.crear = (el, op) => {
    const K = op.K;
    let cols = copia(op.cols);
    const fijas = op.fijas || cols.map(() => ({}));
    const editable = (c, v) => !op.soloLectura && !(fijas[c] && fijas[c][v]);
    let sel = {c: 0, v: (A.VOCES.find(v => editable(0, v)) || 'S')};
    let foco = null;            // problema resaltado
    let sonando = -1, timers = [];
    let an = null, geo = null;
    let previa = null;          // acorde que se está tocando en el teclado MIDI, todavía sin confirmar
    let api = null;
    el.innerHTML = '';
    const raiz = h('div', 'ae' + (op.soloLectura ? ' ae-lectura' : '')); el.appendChild(raiz);

    // ---------- Barra de edición ----------
    let chips = {};
    const barra = h('div', 'ae-barra');
    if (!op.soloLectura){
      const g = h('div', 'ae-voces'); g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', 'Voz a editar');
      A.VOCES.forEach(v => {
        const b = boton('', 'ae-chip', () => { sel.v = v; pintar(); }, A.NOMBRE_VOZ_M[v]);
        b.setAttribute('role', 'radio');
        chips[v] = b; g.appendChild(b);
      });
      barra.appendChild(g);
      const mv = h('div', 'ae-mover');
      mv.append(
        boton('▲', 'ae-ic', () => mover(1), 'Subir un grado (flecha arriba)'),
        boton('▼', 'ae-ic', () => mover(-1), 'Bajar un grado (flecha abajo)'),
        boton('♭', 'ae-ic', () => alterar(-1), 'Bemol'),
        boton('♮', 'ae-ic', () => alterar(0), 'Becuadro (natural)'),
        boton('♯', 'ae-ic', () => alterar(1), 'Sostenido'),
        boton('⌫', 'ae-ic', () => borrar(), 'Borrar la nota'));
      barra.appendChild(mv);
      raiz.appendChild(barra);
    }
    const lienzo = h('div', 'ae-pg'); lienzo.tabIndex = 0;
    lienzo.setAttribute('role', 'application');
    lienzo.setAttribute('aria-label', op.soloLectura ? 'Acordes a cuatro voces' : 'Editor a cuatro voces. Tocá el pentagrama para escribir una nota. Flechas: mover la nota o cambiar de acorde. Teclas S, A, T, B: elegir voz. Espacio: escuchar el acorde.');
    raiz.appendChild(lienzo);
    const ayuda = h('p', 'ae-ayuda', op.soloLectura ? '' : 'Tocá el pentagrama para escribir o elegir una nota. Con el teclado: ↑ ↓ mueven la nota (con Mayús, una octava), ← → cambian de acorde, S A T B eligen la voz, espacio hace sonar el acorde.');
    if (!op.soloLectura) raiz.appendChild(ayuda);

    // ---------- Audio ----------
    const audio = h('div', 'ae-audio');
    audio.append(
      boton('▶ Todo', 'secondary', () => tocarTodo()),
      boton('▶ Acorde', 'secondary', () => tocarAcorde(sel.c)),
      boton('▶ Enlace', 'secondary', () => tocarTodo(Math.min(sel.c, cols.length - 2), 2)));
    const vz = h('span', 'ae-audio-voces', '<span>Voz sola:</span>');
    A.VOCES.forEach(v => vz.appendChild(boton(v, 'ae-ic', () => tocarVoz([v]), `Escuchar solo ${A.NOMBRE_VOZ[v]}`)));
    vz.appendChild(boton('S+B', 'ae-ic', () => tocarVoz(['S', 'B']), 'Escuchar soprano y bajo (voces extremas)'));
    if (op.audioVoces !== false) audio.appendChild(vz);
    raiz.appendChild(audio);
    const panel = h('div', 'ae-panel'); panel.setAttribute('aria-live', 'polite');
    if (op.panel !== false) raiz.appendChild(panel);

    // ---------- Edición ----------
    function cambiar(){ foco = null; pintar(); if (op.onCambio) op.onCambio(an, cols); }
    function setNota(c, v, n){ if (!editable(c, v)) return false; cols[c][v] = n; return true; }
    function mover(d, octava){
      const {c, v} = sel;
      if (!editable(c, v)) return avisar(`El ${A.NOMBRE_VOZ[v]} de este acorde está dado.`);
      const n = cols[c][v];
      let p = n ? M.paso(n) : INICIO[v];
      if (n) p += octava ? 7*d : d;
      const nn = M.desdePaso(p);
      nn.a = A.alteracionPorDefecto(K, nn.l);
      setNota(c, v, nn);
      cambiar();
      Sonido.tocar(M.midi(nn), 0.6);
    }
    function alterar(a){
      const {c, v} = sel; const n = cols[c][v];
      if (!n) return;
      if (!editable(c, v)) return avisar(`El ${A.NOMBRE_VOZ[v]} de este acorde está dado.`);
      n.a = a; cambiar(); Sonido.tocar(M.midi(n), 0.6);
    }
    function borrar(){ const {c, v} = sel; if (editable(c, v)){ cols[c][v] = null; cambiar(); } }
    function avisar(t){ ayuda.textContent = t; ayuda.classList.add('ae-alerta'); setTimeout(() => ayuda.classList.remove('ae-alerta'), 1500); }

    lienzo.addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowUp' || k === 'ArrowDown'){ e.preventDefault(); if (!op.soloLectura) mover(k === 'ArrowUp' ? 1 : -1, e.shiftKey); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight'){ e.preventDefault(); sel.c = Math.max(0, Math.min(cols.length - 1, sel.c + (k === 'ArrowRight' ? 1 : -1))); pintar(); }
      else if (/^[satbSATB]$/.test(k) && !e.ctrlKey && !e.metaKey){ sel.v = k.toUpperCase(); pintar(); }
      else if (k === ' '){ e.preventDefault(); tocarAcorde(sel.c); }
      else if (k === 'Enter'){ e.preventDefault(); tocarTodo(); }
      else if (!op.soloLectura && (k === 'Backspace' || k === 'Delete')){ e.preventDefault(); borrar(); }
      else if (!op.soloLectura && (k === '+' || k === '#')) alterar(1);
      else if (!op.soloLectura && k === '-') alterar(-1);
      else if (!op.soloLectura && (k === 'n' || k === 'N')) alterar(0);
    });

    // Clic en el pentagrama: elegir una nota o escribirla
    lienzo.addEventListener('click', e => {
      if (!geo) return;
      const svg = lienzo.querySelector('svg'); if (!svg) return;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const c = geo.cols.findIndex(g => p.x >= g.x0 && p.x <= g.x1);
      if (c < 0) return;
      const pent = p.y < geo.medio ? 'treble' : 'bass';
      const paso = BASE[pent] + Math.round((geo.yBase[pent] - p.y)/5);
      const vocesP = pent === 'treble' ? ['S', 'A'] : ['T', 'B'];
      // ¿tocó una nota existente? Entonces se elige esa voz
      const cerca = vocesP.filter(v => cols[c][v] && M.paso(cols[c][v]) === paso);
      if (cerca.length && !(sel.c === c && cerca.includes(sel.v))){
        const v = cerca.find(x => editable(c, x)) || cerca[0];
        sel = {c, v}; pintar(); Sonido.tocar(M.midi(cols[c][v]), 0.6); lienzo.focus({preventScroll: true});
        return;
      }
      if (cerca.length){ Sonido.tocar(M.midi(cols[c][sel.v]), 0.6); return; }
      lienzo.focus({preventScroll: true});
      if (op.soloLectura){ sel.c = c; pintar(); return; }
      // voz destino: la elegida si está en este pentagrama; si no, la editable más cercana
      let v = sel.v;
      if (!(vocesP.includes(v) && editable(c, v))){
        const ed = vocesP.filter(x => editable(c, x));
        if (!ed.length){ sel.c = c; pintar(); return avisar('Las voces de este pentagrama están dadas en este acorde.'); }
        v = ed.slice().sort((x, y) => dist(c, x, paso) - dist(c, y, paso))[0];
      }
      const nn = M.desdePaso(paso); nn.a = A.alteracionPorDefecto(K, nn.l);
      sel = {c, v};
      setNota(c, v, nn);
      cambiar();
      Sonido.tocar(M.midi(nn), 0.6);
    });
    const dist = (c, v, paso) => cols[c][v] ? Math.abs(M.paso(cols[c][v]) - paso) : Math.abs(INICIO[v] - paso) + 3;

    // ---------- Dibujo ----------
    function dibujar(){
      lienzo.innerHTML = '';
      if (!window.Vex || !Vex.Flow) return;
      const VF = Vex.Flow;
      const n = cols.length;
      const ancho0 = 70 + Math.abs(K.arm)*10, w = op.ancho || 78;
      const W = ancho0 + n*w + 14, yT = 24, yB = 124, H = 268;
      const r = new VF.Renderer(lienzo, VF.Renderer.Backends.SVG); r.resize(W, H);
      const ctx = r.getContext();
      const ink = V.cssVar('--ink'), muted = V.cssVar('--muted');
      const colorSev = {error: V.cssVar('--bad'), aviso: V.cssVar('--first'), info: V.cssVar('--ok')};
      // marcas por nota según los problemas
      const marca = {};
      if (!op.sinMarcas) an.problemas.forEach(p => { if (p.sev === 'info') return; p.cols.forEach(c => p.voces.forEach(v => { const k = c + v; if (!marca[k] || A.SEV_ORDEN[p.sev] < A.SEV_ORDEN[marca[k]]) marca[k] = p.sev; })); });
      const enFoco = foco ? new Set(foco.cols.flatMap(c => foco.voces.map(v => c + v))) : null;
      geo = {cols: [], medio: 0, yBase: {}};
      const staves = [];
      let x = 6;
      for (let i = 0; i < n; i++){
        const wi = i === 0 ? ancho0 + w : w;
        const t = new VF.Stave(x, yT, wi), b = new VF.Stave(x, yB, wi);
        [t, b].forEach(s => s.setStyle({strokeStyle: muted, fillStyle: ink}));
        if (i === 0){ t.addClef('treble'); b.addClef('bass'); if (K.arm){ t.addKeySignature(M.vfArmadura(K.arm)); b.addKeySignature(M.vfArmadura(K.arm)); } }
        if (i === n - 1){ t.setEndBarType(VF.BarlineType.END); b.setEndBarType(VF.BarlineType.END); }
        if (i === 0){ const sx = Math.max(t.getNoteStartX(), b.getNoteStartX()); t.setNoteStartX(sx); b.setNoteStartX(sx); }
        // fondo del acorde elegido (o del que está sonando)
        if (i === sel.c && !op.soloLectura || i === sonando){
          const x0 = i === 0 ? t.getNoteStartX() - 8 : x + 2;
          ctx.save(); ctx.setFillStyle(rgba(V.cssVar('--second'), i === sonando ? 0.16 : 0.08));
          ctx.fillRect(x0, 8, x + wi - x0 - 2, 220); ctx.restore();
        }
        t.setContext(ctx).draw(); b.setContext(ctx).draw();
        if (i === 0){
          new VF.StaveConnector(t, b).setType('brace').setContext(ctx).draw();
          new VF.StaveConnector(t, b).setType('singleLeft').setContext(ctx).draw();
        }
        new VF.StaveConnector(t, b).setType(i === n - 1 ? 'boldDoubleRight' : 'singleRight').setContext(ctx).draw();
        staves.push({t, b, x0: i === 0 ? t.getNoteStartX() - 4 : x, x1: x + wi});
        x += wi;
      }
      geo.yBase.treble = staves[0].t.getYForLine(4);
      geo.yBase.bass = staves[0].b.getYForLine(4);
      geo.medio = (staves[0].t.getYForLine(4) + staves[0].b.getYForLine(0))/2;
      const notasVF = [];
      staves.forEach((s, i) => {
        const hacer = (v, clave, dir) => {
          const prev = previa && i === sel.c && previa[v] && editable(i, v);
          const nt = prev ? previa[v] : cols[i][v];
          if (!nt) return new VF.GhostNote({duration: 'h'});
          const sn = new VF.StaveNote({clef: clave, keys: ['cdefgab'[nt.l] + '/' + nt.o], duration: 'h', stem_direction: dir});
          if (nt.a !== M.alteracionArmadura(K.arm, nt.l)) sn.addModifier(new VF.Accidental(VF_ACC[nt.a]), 0);
          const k = i + v;
          let col = ink;
          if (marca[k]) col = colorSev[marca[k]];
          if (i === sel.c && v === sel.v && !op.soloLectura) col = V.cssVar('--second');
          if (enFoco && enFoco.has(k)) col = colorSev[foco.sev] || col;
          if (op.resaltar && op.resaltar.voces.includes(v) && (!op.resaltar.cols || op.resaltar.cols.includes(i))) col = V.cssVar('--first');
          if (prev) col = rgba(V.cssVar('--second'), 0.55);
          sn.setStyle({fillStyle: col, strokeStyle: col});
          sn.setLedgerLineStyle({strokeStyle: ink});
          return sn;
        };
        const ns = {S: hacer('S', 'treble', 1), A: hacer('A', 'treble', -1), T: hacer('T', 'bass', 1), B: hacer('B', 'bass', -1)};
        const voz = t => new VF.Voice({num_beats: 2, beat_value: 4}).setMode(VF.Voice.Mode.SOFT).addTickables([t]);
        const vs = {S: voz(ns.S), A: voz(ns.A), T: voz(ns.T), B: voz(ns.B)};
        const f = new VF.Formatter();
        f.joinVoices([vs.S, vs.A]); f.joinVoices([vs.T, vs.B]);
        f.format([vs.S, vs.A, vs.T, vs.B], Math.max(20, s.t.getNoteEndX() - s.t.getNoteStartX() - 24));
        vs.S.draw(ctx, s.t); vs.A.draw(ctx, s.t); vs.T.draw(ctx, s.b); vs.B.draw(ctx, s.b);
        notasVF.push(ns);
        let cx = (s.t.getNoteStartX() + s.t.getNoteEndX())/2;
        const real = A.VOCES.map(v => ns[v]).find(t => t instanceof VF.StaveNote);
        if (real) cx = real.getAbsoluteX() + 6;
        geo.cols.push({x0: s.x0, x1: s.x1, cx});
      });
      // líneas que muestran el problema resaltado (paralelas, saltos…)
      if (foco && foco.cols.length === 2){
        ctx.save();
        ctx.setStrokeStyle(colorSev[foco.sev]); ctx.setLineWidth(1.6);
        foco.voces.forEach(v => {
          const a = notasVF[foco.cols[0]][v], b = notasVF[foco.cols[1]][v];
          if (!(a instanceof VF.StaveNote) || !(b instanceof VF.StaveNote)) return;
          ctx.beginPath(); ctx.moveTo(a.getAbsoluteX() + 14, a.getYs()[0]); ctx.lineTo(b.getAbsoluteX() - 3, b.getYs()[0]); ctx.stroke();
        });
        ctx.restore();
      }
      // cifrado: el pedido (si se muestra) o el que forman las notas
      ctx.save();
      ctx.setFont('Figtree, system-ui, sans-serif', 14, 'bold');
      if (!op.sinCifra) geo.cols.forEach((g, i) => {
        const id = an.ids[i];
        const pedido = op.cifrado && op.cifrado[i] && op.mostrarCifrado ? op.cifrado[i] : null;
        let t = '', color = ink;
        if (pedido) t = A.romanoTexto(K, pedido);
        else if (id && an.acordes[i].lleno && !id.ajenas.length) t = A.romanoTexto(K, id.acorde);
        else if (id && id.ajenas.length && an.acordes[i].lleno){ t = '?'; color = V.cssVar('--bad'); }
        if (t){ ctx.setFillStyle(color); ctx.fillText(t, g.cx - t.length*3.6, H - 26); }
        const fn = pedido ? A.info(K, pedido).funcion : (id && an.acordes[i].lleno && !id.ajenas.length ? id.info.funcion : '');
        if (fn){ ctx.setFont('Figtree, system-ui, sans-serif', 11, 'normal'); ctx.setFillStyle(muted); ctx.fillText(fn, g.cx - 3, H - 10); ctx.setFont('Figtree, system-ui, sans-serif', 14, 'bold'); }
      });
      ctx.restore();
      const svg = lienzo.querySelector('svg');
      if (svg){ svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.maxWidth = (W*1.25) + 'px'; svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', descripcion()); }
    }
    function descripcion(){
      return cols.map((c, i) => `Acorde ${i + 1}: ` + A.VOCES.map(v => c[v] ? `${A.NOMBRE_VOZ[v]} ${M.corto(c[v], {oct: true})}` : `${A.NOMBRE_VOZ[v]} vacío`).join(', ')).join('. ');
    }

    // ---------- Panel de análisis ----------
    function pintarPanel(){
      if (op.panel === false) return;
      panel.innerHTML = '';
      const c = sel.c, col = cols[c], id = an.ids[c], ac = an.acordes[c];
      const cab = h('div', 'ae-resumen');
      const est = an.errores ? `<b class="bad">${M.plural(an.errores, 'error', 'errores')}</b>` : (an.completos ? '<b class="ok">Sin errores de conducción</b>' : '<b>Faltan notas</b>');
      cab.innerHTML = `${est}${an.avisos ? ` · ${M.plural(an.avisos, 'observación', 'observaciones')} de estilo` : ''}${an.cadencia && an.completos ? ` · <span title="${an.cadencia.desc}">${an.cadencia.nombre}</span>` : ''}`;
      panel.appendChild(cab);
      // acorde elegido
      const ficha = h('div', 'ae-ficha');
      let titulo = `Acorde ${c + 1}`;
      if (id && ac.lleno && !id.ajenas.length){
        const a = id.acorde;
        const pos = id.info.aumentada ? `${M.corto(col.B)} en el bajo` : A.INVERSION[a.inv];
        titulo += `: <b>${A.romano(K, a)}</b> — ${A.nombreAcorde(K, a)}, ${pos} · función de ${A.NOMBRE_FUNCION[id.info.funcion]}${id.tipo64 ? ` · ⁶₄ ${A.TIPOS64[id.tipo64]}` : ''}`;
      } else if (id && ac.lleno) titulo += ': <span class="bad">las notas no forman un acorde de la tonalidad</span>';
      else titulo += ': incompleto';
      if (op.cifrado && op.cifrado[c] && op.mostrarCifrado) titulo += `<br><small>Pedido: ${A.romanoTexto(K, op.cifrado[c])}</small>`;
      ficha.appendChild(h('p', 'ae-ficha-t', titulo));
      const t = h('table', 'ae-tabla');
      t.innerHTML = '<thead><tr><th>Voz</th><th>Nota</th><th>Del acorde</th><th>Al siguiente</th></tr></thead>';
      const tb = h('tbody'); t.appendChild(tb);
      A.VOCES.forEach(v => {
        const nn = col[v], sig = cols[c + 1] && cols[c + 1][v];
        let mov = '';
        if (nn && sig){ const d = M.midi(sig) - M.midi(nn); mov = d === 0 ? 'se mantiene' : `${d > 0 ? '↑' : '↓'} ${M.intervalo(nn, sig).nombre}`; }
        const tr = h('tr', v === sel.v ? 'on' : '', `<td>${A.NOMBRE_VOZ_M[v]}${fijas[c] && fijas[c][v] ? ' <small>(dada)</small>' : ''}</td><td>${nn ? M.corto(nn, {oct: true}) : '—'}</td><td>${nn && id && id.miembro[v] ? MIEMBRO[id.miembro[v]] : nn ? '<span class="bad">ajena</span>' : ''}</td><td>${mov}</td>`);
        tr.addEventListener('click', () => { sel.v = v; pintar(); });
        tb.appendChild(tr);
      });
      ficha.appendChild(t);
      // intervalos entre voces
      const iv = [['S','A'], ['A','T'], ['T','B'], ['S','B']].filter(([x, y]) => col[x] && col[y]).map(([x, y]) => `${x}–${y}: ${A.intervaloVoces(col[y], col[x]).nombre}`);
      if (iv.length) ficha.appendChild(h('p', 'ae-iv', iv.join(' · ')));
      if (ac.lleno && id && !id.ajenas.length){
        const cnt = {}; A.VOCES.forEach(v => { const m = id.miembro[v]; (cnt[m] = cnt[m] || []).push(v); });
        const dup = Object.entries(cnt).filter(([, vs]) => vs.length > 1).map(([m, vs]) => `${MIEMBRO[m]} duplicada (${vs.join(' y ')})`).join(', ') || 'sin duplicaciones';
        const disp = M.midi(col.S) - M.midi(col.T) <= 12 ? 'cerrada (soprano y tenor dentro de una octava)' : 'abierta';
        ficha.appendChild(h('p', 'ae-iv', `Duplicación: ${dup}. Disposición ${disp}.`));
      }
      // movimientos hacia el acorde siguiente
      if (an.enlaces[c] && Object.keys(an.enlaces[c].movs).length){
        const m = an.enlaces[c].movs;
        ficha.appendChild(h('p', 'ae-iv', `Movimiento al acorde ${c + 2}: ` + Object.entries(m).map(([k, t]) => `<span class="mov mov-${t}">${k[0]}–${k[1]} ${A.TIPO_MOV[t]}</span>`).join(' ')));
      }
      panel.appendChild(ficha);
      // problemas
      if (an.problemas.length){
        const lista = h('ul', 'ae-problemas');
        an.problemas.forEach(p => {
          const d = A.describir(K, p);
          const li = h('li', 'ae-p sev-' + p.sev + (foco === p ? ' on' : ''));
          const b = h('button', 'ae-p-cab', `<span class="ae-sev">${SEV[p.sev]}</span> <b>${d.titulo}</b> <small>${d.donde}${d.det ? ' · ' + d.det : ''}</small>`);
          b.type = 'button';
          b.addEventListener('click', () => { foco = foco === p ? null : p; if (foco) sel.c = p.cols[0]; pintar(true); });
          li.appendChild(b);
          if (foco === p){
            const det = h('div', 'ae-p-det', `<p><b>Por qué:</b> ${d.porque}</p><p><b>Cómo corregirlo:</b> ${d.como}</p>${d.excepcion ? `<p><b>Excepción:</b> ${d.excepcion}</p>` : ''}<p class="ae-tag">${TIPO[d.tipo]}</p>`);
            const acc = h('div', 'lz-botones');
            acc.appendChild(boton('▶ Escuchar este enlace', 'secondary', () => tocarTodo(p.cols[0], p.cols.length)));
            if (p.voces.length) acc.appendChild(boton(`▶ Solo ${p.voces.map(v => A.NOMBRE_VOZ[v]).join(' y ')}`, 'secondary', () => tocarVoz(p.voces, p.cols[0], p.cols.length)));
            det.appendChild(acc);
            li.appendChild(det);
          }
          lista.appendChild(li);
        });
        panel.appendChild(lista);
        panel.appendChild(h('p', 'ae-leyenda', '<span class="sev-error">●</span> regla general · <span class="sev-aviso">●</span> preferencia de estilo · <span class="sev-info">●</span> excepción aceptada o consejo. Tocá un problema para ver por qué ocurre y cómo corregirlo.'));
      } else if (an.completos) panel.appendChild(h('p', 'ae-ok', 'La conducción es correcta. Recordá que suele haber más de una solución válida.'));
    }

    function pintar(sinCambio){
      an = A.analizar(K, cols, {cifrado: op.cifrado});
      dibujar();
      if (!op.soloLectura) A.VOCES.forEach(v => {
        const nn = cols[sel.c][v];
        chips[v].innerHTML = `<b>${v}</b><small>${nn ? M.corto(nn, {oct: true}) : '—'}</small>`;
        chips[v].setAttribute('aria-checked', String(sel.v === v));
        chips[v].classList.toggle('dada', !editable(sel.c, v));
      });
      pintarPanel();
    }

    // ---------- Sonido ----------
    function parar(){ timers.forEach(clearTimeout); timers = []; sonando = -1; Sonido.parar(); }
    function tocarTodo(desde = 0, cuantos = cols.length, voces = A.VOCES){
      parar();
      const dur = 1.05, t0 = Sonido.ahora() + 0.08;
      const hasta = Math.min(cols.length, desde + cuantos);
      for (let i = desde; i < hasta; i++){
        voces.forEach(v => { const nn = cols[i][v]; if (nn) Sonido.nota(M.midi(nn), t0 + (i - desde)*dur, dur*0.95); });
        timers.push(setTimeout(() => { sonando = i; dibujar(); }, (i - desde)*dur*1000 + 80));
      }
      timers.push(setTimeout(() => { sonando = -1; dibujar(); }, (hasta - desde)*dur*1000 + 120));
    }
    function tocarAcorde(c){ parar(); const ms = A.VOCES.map(v => cols[c][v]).filter(Boolean).map(M.midi); if (ms.length) Sonido.acorde(ms); }
    function tocarVoz(voces, desde = 0, cuantos = cols.length){ tocarTodo(desde, cuantos, voces); }

    // ---------- Entrada MIDI ----------
    // Las notas sostenidas se ven tenues en el acorde actual; al confirmar el acorde (al soltar
    // o al mantenerlo, según la configuración) se escribe y se pasa al siguiente.
    const midiInfo = h('p', 'ae-midi'); midiInfo.setAttribute('aria-live', 'polite');
    let raf = 0;
    const redibujar = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; dibujar(); }); };
    const fijasDe = c => { const o = {}; A.VOCES.forEach(v => { if (!editable(c, v) && cols[c][v]) o[v] = cols[c][v]; }); return o; };
    const esperado = c => (op.cifrado && op.cifrado[c]) || null;
    const vocesLibres = c => A.VOCES.filter(v => editable(c, v));
    function siguienteColumna(c){
      for (let j = c + 1; j < cols.length; j++) if (vocesLibres(j).length) return j;
      if (op.grabar && op.grabar()){ cols.push({S: null, A: null, T: null, B: null}); fijas.push({}); return cols.length - 1; }
      return null;
    }
    function vistaPrevia(teclas){
      if (!teclas.size){ previa = null; redibujar(); return; }
      const r = MidiCaptura.asignar([...teclas], {fijas: fijasDe(sel.c), anterior: cols[sel.c - 1]});
      previa = r.voces ? MidiCaptura.columna(K, r.voces, esperado(sel.c)) : null;
      redibujar();
    }
    function recibir(a){
      previa = null;
      const c = sel.c;
      if (!vocesLibres(c).length){ midiInfo.textContent = 'En este acorde todas las voces están dadas: pasá al siguiente con →.'; dibujar(); return; }
      let texto;
      if (a.notas.length === 1){
        // una sola nota: va a la voz elegida (para escribir voz por voz)
        const v = editable(c, sel.v) ? sel.v : vocesLibres(c)[0];
        const nn = MidiCaptura.deletrear(K, a.notas[0], {notas: esperado(c) ? A.notasAcorde(K, esperado(c)) : null});
        cols[c][v] = nn;
        texto = `${A.NOMBRE_VOZ_M[v]} del acorde ${c + 1}: ${M.corto(nn, {oct: true})}`;
        const vacia = vocesLibres(c).find(x => !cols[c][x]);
        if (vacia) sel.v = vacia;
        else { const sig = siguienteColumna(c); if (sig !== null){ sel.c = sig; sel.v = vocesLibres(sig)[0]; } }
        cambiar();
      } else {
        const r = MidiCaptura.asignar(a.notas, {fijas: fijasDe(c), anterior: cols[c - 1]});
        if (!r.voces){ midiInfo.textContent = r.avisos.join(' '); dibujar(); return; }
        const col = MidiCaptura.columna(K, r.voces, esperado(c));
        vocesLibres(c).forEach(v => { cols[c][v] = col[v]; });
        const durs = Object.values(a.dur || {}).filter(Boolean);
        const dur = durs.length ? ` · duración ${(durs.reduce((x, y) => x + y, 0)/durs.length/1000).toFixed(2).replace('.', ',')} s` : '';
        texto = `Acorde ${c + 1}: ${A.VOCES.map(v => cols[c][v] ? M.corto(cols[c][v], {oct: true}) : '—').join(' · ')}${dur}${r.avisos.length ? ' — ' + r.avisos.join(' ') : ''}`;
        const sig = siguienteColumna(c);
        if (sig !== null){ sel.c = sig; sel.v = vocesLibres(sig)[0] || sel.v; }
        cambiar();
      }
      midiInfo.innerHTML = texto;
      if (op.alIngresar) op.alIngresar(c, an, copia(cols));
    }
    if (!op.soloLectura && window.Midi && window.MidiCaptura){
      lienzo.after(midiInfo);
      const cap = MidiCaptura.crear({modo: Midi.config.captura, estableMs: Midi.config.estableMs,
        esperadas: () => Math.max(1, vocesLibres(sel.c).length), alCambio: vistaPrevia, alAcorde: recibir});
      let fuera = [];
      const vivo = () => { if (!raiz.isConnected){ fuera.forEach(f => f()); return false; } return ED.activo === api; };
      fuera = [Midi.on('nota', ev => { if (vivo()) cap.nota(ev); }), Midi.on('pedal', ev => { if (vivo()) cap.pedal(ev.abajo); }),
               Midi.on('estado', () => { if (raiz.isConnected) pintarMidi(); })];
      raiz.addEventListener('pointerdown', () => { ED.activo = api; pintarMidi(); });
      raiz.addEventListener('focusin', () => { ED.activo = api; pintarMidi(); });
    }
    function pintarMidi(){
      if (op.soloLectura || !window.Midi) return;
      const listo = Midi.estado() === 'listo';
      midiInfo.hidden = !listo;
      if (listo && !midiInfo.innerHTML) midiInfo.innerHTML = `🎹 Tocá el acorde ${sel.c + 1} en el teclado (o una nota para la voz elegida).`;
    }

    pintar();
    api = {
      cols: () => copia(cols),
      analisis: () => an,
      set(nuevas){ cols = copia(nuevas); foco = null; pintar(); },
      setNota(c, v, n){ cols[c][v] = n ? {l: n.l, a: n.a, o: n.o} : null; pintar(); },
      enfocar(p){ foco = p; if (p) sel.c = p.cols[0]; pintar(); },
      seleccionar(c, v){ sel = {c, v: v || sel.v}; pintar(); },
      tocarTodo, parar,
      columnaActual: () => sel.c,
      // escribe un acorde (voces → notas MIDI o escritas) en la columna c, como si se hubiera tocado
      ingresarAcorde(c, voces){ sel.c = c; recibir({notas: A.VOCES.filter(v => voces[v] !== null && voces[v] !== undefined).map(v => typeof voces[v] === 'number' ? voces[v] : M.midi(voces[v])), dur: {}}); },
      agregarColumna(){ cols.push({S: null, A: null, T: null, B: null}); fijas.push({}); sel.c = cols.length - 1; pintar(); },
      quitarColumna(){ if (cols.length > 1){ cols.pop(); fijas.pop(); sel.c = Math.min(sel.c, cols.length - 1); cambiar(); } },
      raiz
    };
    if (!op.soloLectura) ED.activo = api;
    pintarMidi();
    return api;
  };
  ED.activo = null;

  window.ArmoniaEditor = ED;
})();
