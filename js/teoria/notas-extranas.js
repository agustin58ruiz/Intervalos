// Notas extrañas al acorde (de paso, bordadura, apoyatura, retardo, anticipación, escapada):
// una melodía con ritmo sobre un bajo, generada a partir de una progresión realizada.
// Incluye el dibujo (dos pentagramas con figuras y ligaduras), el sonido y la clasificación.
(function(){
  const M = window.Musica, V = window.Visual, A = window.Armonia;
  const NE = {};
  const VF_ACC = {'-2': 'bb', '-1': 'b', '0': 'n', '1': '#', '2': '##'};
  const igual = (x, y) => x.l === y.l && x.a === y.a;

  NE.TIPOS = {
    paso:        {nombre: 'Nota de paso', corto: 'P', def: 'Une por grado conjunto dos notas del acorde que están a distancia de tercera (o más), moviéndose siempre en la misma dirección. Suele caer en tiempo débil.'},
    bordadura:   {nombre: 'Bordadura', corto: 'B', def: 'Sale por grado de una nota del acorde y vuelve a la misma nota (de arriba o de abajo). Adorna una nota que se repite.'},
    apoyatura:   {nombre: 'Apoyatura', corto: 'Ap', def: 'Llega por salto a una nota ajena, casi siempre en tiempo fuerte, y resuelve por grado (en general en dirección contraria al salto). Es expresiva: el choque cae en el acento.'},
    retardo:     {nombre: 'Retardo', corto: 'R', def: 'Una nota del acorde anterior se prolonga (preparación) sobre el acorde nuevo, donde ya no pertenece (suspensión, en tiempo fuerte), y después baja por grado a una nota del acorde (resolución). Se nombra por los intervalos con el bajo: 4–3, 7–6, 9–8.'},
    anticipacion:{nombre: 'Anticipación', corto: 'Ant', def: 'Adelanta, en tiempo débil, una nota del acorde que viene; cuando llega el acorde, la nota se repite. Muy común en la cadencia final.'},
    escapada:    {nombre: 'Escapada (nota escapada)', corto: 'E', def: 'Sale por grado de una nota del acorde y abandona la nota extraña por salto, en general en dirección contraria. Es lo contrario de la apoyatura.'},
    pedal:       {nombre: 'Pedal', corto: 'Ped', def: 'Una nota sostenida (casi siempre en el bajo, sobre la tónica o la dominante) mientras arriba cambian los acordes, aunque choquen con ella.'},
    cambiata:    {nombre: 'Doble bordadura (notas cambiadas)', corto: 'DB', def: 'Dos notas extrañas seguidas que rodean una nota del acorde: primero la de arriba y después la de abajo (o al revés), antes de llegar a la nota.'}
  };

  // ---------- Dibujo: soprano con ritmo sobre el bajo ----------
  // ej: {K, compases: [{sop: [{n, dur: 'h'|'q', color, texto}], bajo: {n, dur: 'h'}, cifra}], ligaduras: [[ci, ni, cj, nj]]}
  NE.dibujar = (el, ej, op = {}) => {
    el.innerHTML = '';
    el.classList.add('pg');
    if (!window.Vex || !Vex.Flow) return;
    const VF = Vex.Flow, K = ej.K;
    const n = ej.compases.length;
    const ancho0 = 70 + Math.abs(K.arm)*10, w = 92;
    const W = ancho0 + n*w + 14, H = 250;
    const r = new VF.Renderer(el, VF.Renderer.Backends.SVG); r.resize(W, H);
    const ctx = r.getContext();
    const ink = V.cssVar('--ink'), muted = V.cssVar('--muted');
    let x = 6;
    const notasSop = [];
    ej.compases.forEach((cm, i) => {
      const wi = i === 0 ? ancho0 + w : w;
      const t = new VF.Stave(x, 20, wi), b = new VF.Stave(x, 120, wi);
      [t, b].forEach(s => s.setStyle({strokeStyle: muted, fillStyle: ink}));
      if (i === 0){ t.addClef('treble'); b.addClef('bass'); if (K.arm){ t.addKeySignature(M.vfArmadura(K.arm)); b.addKeySignature(M.vfArmadura(K.arm)); } const sx = Math.max(t.getNoteStartX(), b.getNoteStartX()); t.setNoteStartX(sx); b.setNoteStartX(sx); }
      if (i === n - 1){ t.setEndBarType(VF.BarlineType.END); b.setEndBarType(VF.BarlineType.END); }
      t.setContext(ctx).draw(); b.setContext(ctx).draw();
      if (i === 0){ new VF.StaveConnector(t, b).setType('brace').setContext(ctx).draw(); new VF.StaveConnector(t, b).setType('singleLeft').setContext(ctx).draw(); }
      new VF.StaveConnector(t, b).setType(i === n - 1 ? 'boldDoubleRight' : 'singleRight').setContext(ctx).draw();
      const nota = (nn, clave, dur, color, texto) => {
        const sn = new VF.StaveNote({clef: clave, keys: ['cdefgab'[nn.l] + '/' + nn.o], duration: dur, auto_stem: true});
        if (nn.a !== M.alteracionArmadura(K.arm, nn.l)) sn.addModifier(new VF.Accidental(VF_ACC[nn.a]), 0);
        const col = color ? V.color(color) : ink;
        sn.setStyle({fillStyle: col, strokeStyle: col});
        if (texto){ const an = new VF.Annotation(texto).setVerticalJustification(VF.Annotation.VerticalJustify.TOP); an.setFont('Figtree, system-ui, sans-serif', 12, 'bold'); an.setStyle({fillStyle: col, strokeStyle: col}); sn.addModifier(an, 0); }
        return sn;
      };
      const ss = cm.sop.map(s => nota(s.n, 'treble', s.dur, s.color, s.texto));
      const bb = [nota(cm.bajo.n, 'bass', cm.bajo.dur || 'h', cm.bajo.color, cm.bajo.texto)];
      const vS = new VF.Voice({num_beats: 2, beat_value: 4}).setMode(VF.Voice.Mode.SOFT).addTickables(ss);
      const vB = new VF.Voice({num_beats: 2, beat_value: 4}).setMode(VF.Voice.Mode.SOFT).addTickables(bb);
      new VF.Formatter().joinVoices([vS]).joinVoices([vB]).format([vS, vB], Math.max(30, t.getNoteEndX() - t.getNoteStartX() - 16));
      vS.draw(ctx, t); vB.draw(ctx, b);
      notasSop.push(ss);
      if (cm.cifra && !op.sinCifra){ ctx.save(); ctx.setFont('Figtree, system-ui, sans-serif', 13, 'bold'); ctx.setFillStyle(ink); ctx.fillText(cm.cifra, bb[0].getAbsoluteX() + 2, H - 14); ctx.restore(); }
      x += wi;
    });
    (ej.ligaduras || []).forEach(([ci, ni, cj, nj]) => {
      new VF.StaveTie({first_note: notasSop[ci][ni], last_note: notasSop[cj][nj], first_indices: [0], last_indices: [0]}).setContext(ctx).draw();
    });
    const svg = el.querySelector('svg');
    if (svg){ svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.maxWidth = (W*1.25) + 'px'; svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', op.etiqueta || 'Melodía con notas extrañas sobre el bajo'); }
  };

  // ---------- Sonido ----------
  NE.tocar = (ej, negra = 0.55) => {
    Sonido.parar();
    const t0 = Sonido.ahora() + 0.08;
    let t = t0;
    const durS = d => d === 'h' ? 2 : d === 'q' ? 1 : d === '8' ? 0.5 : 2;
    const ligadas = new Set((ej.ligaduras || []).map(([, , cj, nj]) => `${cj}:${nj}`));
    ej.compases.forEach((cm, i) => {
      Sonido.nota(M.midi(cm.bajo.n), t, 2*negra*0.95);
      (cm.acorde || []).forEach(m => Sonido.nota(m, t, 2*negra*0.9));
      let u = t;
      cm.sop.forEach((s, k) => {
        let d = durS(s.dur);
        if (!ligadas.has(`${i}:${k}`)){
          // si la nota sigue ligada, suena hasta el final de la ligadura
          const lig = (ej.ligaduras || []).find(([ci, ni]) => ci === i && ni === k);
          const extra = lig ? durS(ej.compases[lig[2]].sop[lig[3]].dur) : 0;
          Sonido.nota(M.midi(s.n), u, (d + extra)*negra*0.95);
        }
        u += d*negra;
      });
      t += 2*negra;
    });
    return (t - t0)*1000;
  };

  // ---------- Generación ----------
  const paso = n => M.paso(n);
  const deGrado = (K, p) => { const n = M.desdePaso(p); n.a = A.alteracionPorDefecto(K, n.l); return n; };
  const enAcorde = (K, c, n) => A.notasAcorde(K, c).some(x => igual(x, n));
  // Genera un ejemplo con una nota extraña del tipo pedido. Devuelve {K, compases, ligaduras, foco: [ci, ni], tipo, prog}
  NE.generar = (tipo, op = {}) => {
    for (let intento = 0; intento < 60; intento++){
      const K = op.K || M.azar(A.TONALIDADES.filter(k => Math.abs(k.arm) <= 2 && k.modo === 'mayor'));
      const prog = op.prog || A.generarProgresion(4, 'autentica');
      const r = A.realizar(K, prog, [], {azar: 8, finTonica: true, ancho: 40, haz: 25});
      if (!r) continue;
      const S = r.cols.map(c => c.S), B = r.cols.map(c => c.B);
      const acordeMidis = r.cols.map(c => ['A', 'T'].map(v => M.midi(c[v])));
      // se prueban todas las posiciones de esta realización antes de generar otra
      for (const i of M.mezclar([...Array(S.length - 1).keys()])){
        const compases = S.map((s, k) => ({sop: [{n: s, dur: 'h'}], bajo: {n: B[k]}, cifra: A.romanoTexto(K, prog[k]), acorde: acordeMidis[k]}));
        const ligaduras = [];
        const a = S[i], b = S[i + 1], da = paso(b) - paso(a);
        let foco = null;
        if (tipo === 'paso'){
          if (Math.abs(da) !== 2) continue;
          const x = deGrado(K, paso(a) + Math.sign(da));
          if (enAcorde(K, prog[i], x)) continue;
          compases[i].sop = [{n: a, dur: 'q'}, {n: x, dur: 'q'}]; foco = [i, 1];
        } else if (tipo === 'bordadura'){
          if (da !== 0) continue;
          const x = deGrado(K, paso(a) + M.azar([1, -1]));
          if (enAcorde(K, prog[i], x)) continue;
          compases[i].sop = [{n: a, dur: 'q'}, {n: x, dur: 'q'}]; foco = [i, 1];
        } else if (tipo === 'anticipacion'){
          if (Math.abs(da) !== 1 || enAcorde(K, prog[i], b)) continue;
          compases[i].sop = [{n: a, dur: 'q'}, {n: b, dur: 'q'}]; foco = [i, 1];
        } else if (tipo === 'retardo'){
          if (da !== -1 || enAcorde(K, prog[i + 1], a)) continue;
          compases[i + 1].sop = [{n: a, dur: 'q'}, {n: b, dur: 'q'}]; ligaduras.push([i, 0, i + 1, 0]); foco = [i + 1, 0];
        } else if (tipo === 'apoyatura'){
          const x = deGrado(K, paso(b) + (da >= 0 ? 1 : -1));
          if (enAcorde(K, prog[i + 1], x) || Math.abs(paso(x) - paso(a)) < 2) continue;
          compases[i + 1].sop = [{n: x, dur: 'q'}, {n: b, dur: 'q'}]; foco = [i + 1, 0];
        } else if (tipo === 'escapada'){
          const x = deGrado(K, paso(a) + (da > 0 ? -1 : 1));
          if (enAcorde(K, prog[i], x) || Math.abs(paso(b) - paso(x)) < 2) continue;
          compases[i].sop = [{n: a, dur: 'q'}, {n: x, dur: 'q'}]; foco = [i, 1];
        } else return null;
        return {K, compases, ligaduras, foco, tipo, prog, i};
      }
    }
    return null;
  };
  // Marca la nota extraña con color y su abreviatura
  NE.marcar = (ej, color = 'a', texto = true) => {
    const [ci, ni] = ej.foco;
    const s = ej.compases[ci].sop[ni];
    s.color = color; if (texto) s.texto = NE.TIPOS[ej.tipo].corto;
    return ej;
  };
  // Explicación: cómo se llega y cómo se deja la nota extraña
  NE.explicar = ej => {
    const [ci, ni] = ej.foco;
    const sop = ej.compases.flatMap((c, k) => c.sop.map((s, j) => ({s, k, j})));
    const idx = sop.findIndex(x => x.k === ci && x.j === ni);
    const ant = sop[idx - 1], nota = sop[idx].s.n, sig = sop[idx + 1];
    const mov = (x, y) => { const d = paso(y) - paso(x); return d === 0 ? 'repitiendo la nota' : Math.abs(d) === 1 ? `por grado ${d > 0 ? 'ascendente' : 'descendente'}` : `por salto ${d > 0 ? 'ascendente' : 'descendente'}`; };
    const acorde = ej.prog[ci];
    const notasAc = A.notasAcorde(ej.K, acorde).map(x => M.corto(x)).join(', ');
    let t = `<p>Sobre el acorde ${A.romanoTexto(ej.K, acorde)} (${notasAc}), la nota <b>${M.corto(nota)}</b> no pertenece al acorde.`;
    if (ant) t += ` Se llega desde ${M.corto(ant.s.n)} ${mov(ant.s.n, nota)}`;
    if (sig) t += ` y se deja hacia ${M.corto(sig.s.n)} ${mov(nota, sig.s.n)}`;
    t += `.</p><p><b>${NE.TIPOS[ej.tipo].nombre}:</b> ${NE.TIPOS[ej.tipo].def}</p>`;
    return t;
  };

  window.NotasExtranas = NE;
})();
