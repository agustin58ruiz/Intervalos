// Generadores de ejercicios. Cada ejercicio sabe dibujarse, corregirse, explicar el
// procedimiento, diagnosticar el error más probable y generar otro parecido.
(function(){
  const M = window.Musica, V = window.Visual;
  const E = {};
  const {azar, entre, mezclar} = M;
  const op = (id, html) => ({id: String(id), html});
  const n = (x, o) => M.nombre(x, o);          // nombre según el sistema elegido
  const esc = (l, o, acc = null) => ({l, o, acc});

  // Resultado estándar para preguntas de opción múltiple
  function resultado(q, resp, extra){
    const ok = String(resp) === String(q.correcta);
    const tu = (q.opciones || []).find(o => o.id === String(resp));
    const cor = (q.opciones || []).find(o => o.id === String(q.correcta));
    return Object.assign({ok, tu: tu ? tu.html : String(resp), correcta: cor ? cor.html : String(q.correcta), habs: [[q.hab, ok]]}, extra(ok));
  }

  // ======================================================================
  // Intervalos: explicación paso a paso y diagnóstico
  // ======================================================================
  // x, y: notas escritas {l, o, acc}; arm: armadura (número de ♯ o −♭)
  E.analizar = (x, y, arm = 0) => {
    const rx = M.altura(x, arm), ry = M.altura(y, arm);
    const iv = M.intervalo(rx, ry);
    const [elo, ehi] = iv.lo === rx ? [x, y] : [y, x];
    const sinArm = M.intervalo(M.altura(x, 0), M.altura(y, 0));
    const sinAcc = M.intervalo(M.altura({l:x.l, o:x.o, acc:null}, arm), M.altura({l:y.l, o:y.o, acc:null}, arm));
    const afectadas = [elo, ehi].filter(e => arm && M.alteracionArmadura(arm, e.l) !== 0);
    const conAcc = [elo, ehi].filter(e => e.acc !== null && e.acc !== undefined);
    return {x, y, arm, rx, ry, iv, elo, ehi, sinArm, sinAcc, afectadas, conAcc,
            num: iv.simple, cal: iv.cal, semis: iv.semis};
  };
  const letras = (a) => {
    const out = [];
    for (let p = M.paso(a.iv.lo); p <= M.paso(a.iv.hi); p++) out.push(M.corto(M.desdePaso(p)));
    return out;
  };
  const cadenaSemitonos = a => {
    const lo = M.midi(a.iv.lo), hi = M.midi(a.iv.hi), out = [M.corto(a.iv.lo)];
    for (let m = lo + 1; m < hi; m++) out.push(M.corto(M.deMidi(m)));
    if (hi > lo) out.push(M.corto(a.iv.hi));
    return out;
  };
  const accTexto = acc => acc === 0 ? 'un becuadro (♮)' : acc > 0 ? 'un sostenido (♯)' : 'un bemol (♭)';
  // Pasos del procedimiento, en el orden en que se enseñan
  E.pasosIntervalo = a => {
    const L = letras(a), pasos = [];
    pasos.push({t: 'Identificar las notas escritas', d: `Sin mirar alteraciones ni armadura, las notas escritas son <b>${M.corto(M.desdePaso(M.paso(a.elo)))}</b> y <b>${M.corto(M.desdePaso(M.paso(a.ehi)))}</b>.`});
    pasos.push({t: 'Determinar el número', d: `Contamos las letras desde la más grave, incluyendo la primera y la última: ${L.map((x, i) => `${x}<sub>${i + 1}</sub>`).join(' → ')}. Son ${L.length} letras: <b>${M.NUMERO[a.num]}</b>.`});
    if (a.arm){
      const k = M.armadura(a.arm);
      const d = a.afectadas.length
        ? `La armadura de ${M.nombreTonalidad(k)} tiene ${M.describirArmadura(a.arm)}. ${a.afectadas.filter((e, i, s) => s.findIndex(x => x.l === e.l) === i).map(e => `Todos los ${M.corto(M.desdePaso(M.paso(e)))} se leen <b>${M.corto({l: e.l, a: M.alteracionArmadura(a.arm, e.l)})}</b>`).join('. ')}.`
        : `La armadura de ${M.nombreTonalidad(k)} (${M.describirArmadura(a.arm)}) no afecta a estas dos notas.`;
      pasos.push({t: 'Aplicar la armadura', d});
    }
    if (a.conAcc.length){
      pasos.push({t: 'Aplicar las alteraciones accidentales', d: a.conAcc.map(e => `Delante de ${M.corto(M.desdePaso(M.paso(e)))} hay ${accTexto(e.acc)}${a.arm && e.acc === 0 ? ', que anula la armadura' : ''}: la nota es <b>${M.corto({l: e.l, a: e.acc})}</b>.`).join(' ')});
    } else if (a.arm){
      pasos.push({t: 'Aplicar las alteraciones accidentales', d: 'No hay alteraciones escritas junto a las notas, así que queda lo que indica la armadura.'});
    }
    const C = cadenaSemitonos(a);
    pasos.push({t: 'Contar los semitonos', d: `De <b>${n(a.iv.lo)}</b> a <b>${n(a.iv.hi)}</b>: ${C.join(' → ')}. En total, <b>${M.plural(a.semis, 'semitono')}</b>.`});
    const fam = M.calidadesPosibles(a.num).map(c => `${M.nombreCalidad(c, a.num)} = ${M.semitonos(a.num, c)}`).join(', ');
    pasos.push({t: 'Determinar la calidad', d: `Para una ${M.NUMERO[a.num]}: ${fam} semitonos. Con ${a.semis}, la calidad es <b>${M.nombreCalidad(a.cal, a.num)}</b>.`});
    pasos.push({t: 'Nombrar el intervalo', d: `Número + calidad: <b>${M.nombreIntervalo(a.num, a.cal)}</b>${a.iv.sube ? '' : ' (descendente)'}.`});
    return pasos;
  };
  const listaPasos = pasos => `<ol class="proc">${pasos.map(p => `<li><b>${p.t}.</b> ${p.d}</li>`).join('')}</ol>`;

  // Diagnóstico de una respuesta {num, cal} a un intervalo
  E.diagnosticarIntervalo = (a, r) => {
    if (r.num === a.num && r.cal === a.cal) return null;
    if (r.num !== a.num){
      const s = r.cal && M.calidadesPosibles(r.num).includes(r.cal) ? M.semitonos(r.num, r.cal) : null;
      return s === a.semis ? 'numero-semis' : 'numero';
    }
    if (!M.calidadesPosibles(a.num).includes(r.cal)) return 'familia';
    if (a.arm && a.afectadas.length && a.sinArm.cal === r.cal && a.sinArm.cal !== a.cal) return 'armadura';
    if (a.arm && a.conAcc.length && a.sinAcc.cal === r.cal && a.sinAcc.cal !== a.cal) return 'accidental';
    if (['A','d'].includes(a.cal) || ['A','d'].includes(r.cal)) return 'aum-dis';
    return 'calidad';
  };
  E.dondeError = (a, r, diag) => {
    const L = letras(a);
    switch (diag){
      case 'numero': return r.num === a.num - 1
        ? `Probablemente no contaste una de las puntas. Se cuentan las dos: ${L.join(' – ')} son ${L.length} letras.`
        : `El número se obtiene contando letras: ${L.join(' – ')} son ${L.length}, así que es una ${M.NUMERO[a.num]}, no una ${M.NUMERO[r.num]}.`;
      case 'numero-semis': return `Tu respuesta tiene los mismos ${a.semis} semitonos, así que suena igual. Pero el número no sale de los semitonos: sale de contar letras (${L.join(' – ')}), y eso da una ${M.NUMERO[a.num]}. Primero el número, después la calidad.`;
      case 'familia': return `Una ${M.NUMERO[a.num]} no puede ser ${M.nombreCalidad(r.cal, a.num)}: los unísonos, cuartas, quintas y octavas son justos; las segundas, terceras, sextas y séptimas son mayores o menores.`;
      case 'armadura': return `Tu respuesta corresponde a leer las notas sin la armadura. ${a.afectadas.filter((e, i, s) => s.findIndex(x => x.l === e.l) === i).map(e => `${M.corto(M.desdePaso(M.paso(e)))} está en la armadura, así que se lee ${M.corto({l: e.l, a: M.alteracionArmadura(a.arm, e.l)})}${e.acc !== null && e.acc !== undefined ? ` (salvo que tenga una alteración escrita delante, como acá: ${M.corto({l: e.l, a: e.acc})})` : ''}`).join('. ')}.`;
      case 'accidental': return `Tu respuesta ignora la alteración escrita: ${a.conAcc.map(e => `el ${accTexto(e.acc).replace(/^un /, '')} delante de ${M.corto(M.desdePaso(M.paso(e)))}`).join(' y ')}. Las alteraciones accidentales mandan sobre la armadura.`;
      default: {
        const s = M.calidadesPosibles(r.num).includes(r.cal) ? M.semitonos(r.num, r.cal) : null;
        return `El número estaba bien: ${L.join('–')} ${L.length === 1 ? 'es' : 'son'} ${M.plural(L.length, 'letra')}, así que es una ${M.NUMERO[a.num]}. El error está en la calidad: de ${M.corto(a.iv.lo)} a ${M.corto(a.iv.hi)} hay ${M.plural(a.semis, 'semitono')}${s !== null ? `, y una ${M.nombreIntervalo(r.num, r.cal)} tendría ${s}` : ''}. Por eso es una ${M.nombreIntervalo(a.num, a.cal)}.`;
      }
    }
  };
  // Pregunta de intervalo (respuesta: número + calidad)
  function preguntaIntervalo(a, base){
    const q = Object.assign({
      modo: 'intervalo', correcta: {num: a.num, cal: a.cal}, analisis: a,
      visual(el){ V.pentagrama(el, {clave: base.clave || 'treble', armadura: a.arm, notas: [Object.assign({color:'a'}, a.x), Object.assign({color:'b'}, a.y)]}); },
      escuchar(){ Sonido.intervalo(M.midi(a.rx), M.midi(a.ry)); },
      evaluar(r){
        const diag = E.diagnosticarIntervalo(a, r);
        const ok = !diag;
        const habs = [['int-numero', r.num === a.num]];
        if (r.num === a.num) habs.push(['int-calidad', r.cal === a.cal]);
        if (a.arm && a.afectadas.length) habs.push(['arm-leer', diag !== 'armadura']);
        if (a.conAcc.length) habs.push(['accidentales', diag !== 'accidental']);
        if (['A','d'].includes(a.cal) && r.num === a.num) habs.push(['int-aum-dis', ok]);
        if (base.hab && !habs.some(h => h[0] === base.hab)) habs.push([base.hab, ok]);
        return {ok, diag, habs,
          tu: M.calidadesPosibles(r.num).includes(r.cal) || r.cal ? M.nombreIntervalo(r.num, r.cal) : M.NUMERO[r.num],
          correcta: M.nombreIntervalo(a.num, a.cal),
          explicacion: listaPasos(E.pasosIntervalo(a)),
          donde: ok ? '' : E.dondeError(a, r, diag),
          alMostrar(el){ V.pentagrama(el, {clave: base.clave || 'treble', armadura: a.arm, notas: [Object.assign({color:'a', texto: M.corto(a.rx)}, a.x), Object.assign({color:'b', texto: M.corto(a.ry)}, a.y)]}); }};
      }
    }, base);
    q.guia = guiaIntervalo(a, q);
    return q;
  }
  // Versión guiada: la persona decide cada paso del procedimiento
  function guiaIntervalo(a, q){
    const pasos = E.pasosIntervalo(a);
    const paso = t => pasos.find(p => p.t === t);
    const g = [];
    const lx = M.desdePaso(M.paso(a.elo)), ly = M.desdePaso(M.paso(a.ehi));
    const par = (x, y) => `${M.corto(x)} y ${M.corto(y)}`;
    const opsNotas = [par(lx, ly), par(M.desdePaso(M.paso(lx) + 1), M.desdePaso(M.paso(ly) + 1)), par(M.desdePaso(M.paso(lx) - 1), ly), par(lx, M.desdePaso(M.paso(ly) - 1))];
    g.push({pregunta: '1. ¿Qué notas están escritas? (Todavía no mires alteraciones ni armadura.)', opciones: mezclar([...new Set(opsNotas)]).map(t => op(t, t)), correcta: opsNotas[0], explica: paso('Identificar las notas escritas').d});
    const nums = [...new Set([a.num - 1, a.num, a.num + 1, a.num + 2].filter(x => x >= 2 && x <= 8))].sort((x, y) => x - y);
    g.push({pregunta: '2. Contá las letras desde la nota de abajo, incluyendo las dos puntas. ¿Qué número es?', opciones: nums.map(x => op(x, M.NUMERO[x])), correcta: String(a.num), explica: paso('Determinar el número').d, contar: true});
    if (a.arm){
      const k = M.armadura(a.arm);
      const opts = [op('ninguna', 'No afecta a ninguna')];
      [a.elo, a.ehi].forEach(e => { const d = M.desdePaso(M.paso(e)); const al = a.arm > 0 ? 1 : -1; opts.push(op('l' + e.l, `Afecta a ${M.corto(d)}: se lee ${M.corto({l: e.l, a: al})}`)); });
      if (a.elo.l !== a.ehi.l) opts.push(op('ambas', 'Afecta a las dos'));
      const af = a.afectadas.map(e => e.l);
      const cor = !af.length ? 'ninguna' : af.length === 2 && af[0] !== af[1] ? 'ambas' : 'l' + af[0];
      g.push({pregunta: `3. La armadura es la de ${M.nombreTonalidad(k)} (${M.describirArmadura(a.arm)}). ¿A cuál de las dos notas afecta?`, opciones: [...new Map(opts.map(o => [o.id, o])).values()], correcta: cor, explica: paso('Aplicar la armadura').d});
    }
    a.conAcc.forEach(e => {
      const d = M.desdePaso(M.paso(e));
      const opts = [-1, 0, 1].map(x => op(x, M.corto({l: e.l, a: x})));
      g.push({pregunta: `${g.length + 1}. Delante de ${M.corto(d)} hay ${accTexto(e.acc)}. ¿Qué nota queda?`, opciones: opts, correcta: String(e.acc), explica: paso('Aplicar las alteraciones accidentales').d});
    });
    const ss = [...new Set([a.semis - 1, a.semis, a.semis + 1, a.semis + 2].filter(x => x >= 0))];
    g.push({pregunta: `${g.length + 1}. ¿Cuántos semitonos hay de ${n(a.iv.lo)} a ${n(a.iv.hi)}? (Contá las teclas que avanzás.)`, opciones: ss.map(x => op(x, String(x))), correcta: String(a.semis), explica: paso('Contar los semitonos').d, teclado: true});
    g.push({pregunta: `${g.length + 1}. Una ${M.NUMERO[a.num]} con ${M.plural(a.semis, 'semitono')}, ¿de qué calidad es?`, opciones: M.calidadesPosibles(a.num).map(c => op(c, `${M.nombreCalidad(c, a.num)} (${M.semitonos(a.num, c)})`)), correcta: a.cal, explica: paso('Determinar la calidad').d});
    return g;
  }

  // Generador de pares de notas escritas que forman un intervalo válido
  function generarIntervalo(o){
    const calOk = o.calidades || ['m','M','J','d','A'];
    for (let intento = 0; intento < 200; intento++){
      const arm = o.armadura ? azar(o.armaduras || [-4,-3,-2,-1,1,2,3,4]) : 0;
      const pLo = entre(o.pasoMin || 29, o.pasoMax || 34);
      const num = azar(o.numeros || [2,3,4,5,6,7,8]);
      const pHi = pLo + num - 1;
      const x = esc(M.desdePaso(pLo).l, M.desdePaso(pLo).o), y = esc(M.desdePaso(pHi).l, M.desdePaso(pHi).o);
      if (!arm && o.alteraciones){
        // alteraciones escritas (solo ♯ o ♭)
        if (Math.random() < 0.45) x.acc = azar([-1, 1]);
        if (Math.random() < 0.55) y.acc = azar([-1, 1]);
      }
      if (arm && o.accidentales && Math.random() < 0.35){
        const e = azar([x, y]);
        const k = M.alteracionArmadura(arm, e.l);
        e.acc = k !== 0 ? 0 : (arm > 0 ? 1 : -1);
      }
      const a = E.analizar(x, y, arm);
      if (!a.cal || !calOk.includes(a.cal)) continue;
      if ([a.rx, a.ry].some(r => Math.abs(r.a) > 1)) continue;
      if (arm && o.forzarArmadura !== false && !a.afectadas.length && Math.random() < 0.75) continue;
      if (o.descendente && Math.random() < 0.3){ a.x = y; a.y = x; const t = a.rx; a.rx = a.ry; a.ry = t; }
      return a;
    }
    return E.analizar(esc(0, 4), esc(2, 4), 0);
  }

  // ======================================================================
  // Catálogo de ejercicios
  // ======================================================================
  E.TIPOS = {};
  const tipo = (id, def) => { E.TIPOS[id] = Object.assign({id}, def); };
  E.generar = (id, o = {}) => {
    const t = E.TIPOS[id];
    const q = t.gen(o);
    q.tipo = id; q.hab = q.hab || t.hab;
    q.parecido = () => E.generar(id, o);
    return q;
  };

  // ---------- Notas ----------
  tipo('nombres', {nombre: 'Orden de las notas', hab: 'nombres', leccion: 'n-nombres', gen(){
    const l = entre(0, 6), despues = Math.random() < 0.6;
    const cor = (l + (despues ? 1 : -1) + 7) % 7;
    const opts = mezclar([cor, (cor + 2) % 7, (cor + 5) % 7, (l + 3) % 7].filter((v, i, s) => s.indexOf(v) === i && v !== l)).slice(0, 4);
    if (!opts.includes(cor)) opts[0] = cor;
    const q = {modo: 'opciones', enunciado: `¿Qué nota viene <b>${despues ? 'después' : 'antes'}</b> de <b>${M.LATINO[l]}</b>?`,
      opciones: mezclar(opts).map(x => op(x, M.LATINO[x])), correcta: String(cor)};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'nombres',
      explicacion: `Las notas son siete y se repiten en ciclo: ${M.LATINO.map((x, i) => i === l ? `<b>${x}</b>` : i === cor ? `<u>${x}</u>` : x).join(' – ')} – Do… ${despues ? 'Después' : 'Antes'} de ${M.LATINO[l]} viene <b>${M.LATINO[cor]}</b>.${l === 6 && despues ? ' Después de Si se vuelve a empezar desde Do.' : ''}${l === 0 && !despues ? ' Antes de Do está el Si de la octava de abajo.' : ''}`,
      donde: ok ? '' : 'Recitá la escala en voz alta desde Do hasta llegar a la nota; la siguiente (o la anterior) es la respuesta.'}));
    return q;
  }});

  tipo('anglo', {nombre: 'Notación anglosajona', hab: 'anglo', leccion: 'n-anglo', gen(){
    const l = entre(0, 6), haciaAnglo = Math.random() < 0.55;
    const nom = x => haciaAnglo ? M.ANGLO[x] : M.LATINO[x];
    const opts = mezclar([l, ...mezclar([0,1,2,3,4,5,6].filter(x => x !== l)).slice(0, 3)]);
    const q = {modo: 'opciones', enunciado: haciaAnglo ? `¿Qué letra corresponde a <b>${M.LATINO[l]}</b>?` : `¿Cómo se llama <b>${M.ANGLO[l]}</b> en el sistema Do-Re-Mi?`,
      opciones: opts.map(x => op(x, nom(x))), correcta: String(l)};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'anglo',
      explicacion: `<table class="eq"><tr>${M.LATINO.map((x, i) => `<td${i === l ? ' class="on"' : ''}>${x}</td>`).join('')}</tr><tr>${M.ANGLO.map((x, i) => `<td${i === l ? ' class="on"' : ''}>${x}</td>`).join('')}</tr></table><p>El sistema de letras empieza en La = A y sigue en orden: A B C D E F G. Por eso Do es C.</p>`,
      donde: ok ? '' : 'Un truco: ubicá La = A y avanzá por el abecedario al mismo tiempo que por las notas.'}));
    return q;
  }});

  tipo('teclado', {nombre: 'Encontrar notas en el teclado', hab: 'teclado', leccion: 'n-teclado', gen(){
    const l = entre(0, 6);
    const q = {modo: 'teclado', teclado: {desde: 60, hasta: 83, etiquetas: 'ninguna'},
      enunciado: `Tocá un <b>${n(M.nota(l))}</b> en el teclado (cualquier octava).`, correcta: M.PC[l]};
    q.evaluar = m => {
      const ok = ((m % 12) + 12) % 12 === M.PC[l];
      const tu = M.deMidi(m);
      return {ok, diag: ok ? null : 'teclado', habs: [['teclado', ok]], tu: M.esNegra(m) ? 'una tecla negra' : n(tu), correcta: n(M.nota(l)),
        marcar: {[60 + M.PC[l]]: {c: 'ok', t: M.corto(M.nota(l))}, [72 + M.PC[l]]: {c: 'ok', t: M.corto(M.nota(l))}, ...(ok ? {} : {[m]: {c: 'bad', t: '✕'}})},
        explicacion: `Las teclas negras vienen en grupos de dos y de tres. ${['Do está justo a la izquierda del grupo de dos negras.','Re está en el medio del grupo de dos negras.','Mi está justo a la derecha del grupo de dos negras.','Fa está justo a la izquierda del grupo de tres negras.','Sol está entre la 1.ª y la 2.ª negra del grupo de tres.','La está entre la 2.ª y la 3.ª negra del grupo de tres.','Si está justo a la derecha del grupo de tres negras.'][l]}`,
        donde: ok ? '' : 'Buscá primero el grupo de negras que te sirve de referencia y después contá teclas blancas.'};
    };
    return q;
  }});

  tipo('tonos', {nombre: 'Tonos y semitonos', hab: 'tonos', leccion: 'n-tonos', gen(){
    const lo = azar([60, 62, 64, 65, 67, 69, 71, 64, 71]);
    const d = azar([1, 2, 1, 2, 1]);
    const hi = lo + d;
    const q = {modo: 'opciones', enunciado: '¿Qué distancia hay entre las dos teclas marcadas?',
      visualTeclado: {desde: 60, hasta: 76, etiquetas: 'blancas', marcas: {[lo]: {c: 'a'}, [hi]: {c: 'b'}}},
      escuchar(){ Sonido.intervalo(lo, hi); },
      opciones: [op(1, 'Un semitono'), op(2, 'Un tono')], correcta: String(d)};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'tonos',
      explicacion: `De ${M.corto(M.deMidi(lo))} a ${M.corto(M.deMidi(hi))} ${d === 1 ? 'se pasa directamente a la tecla de al lado' : `hay una tecla en el medio (${M.corto(M.deMidi(lo + 1))})`}: ${d === 1 ? '<b>un semitono</b>' : '<b>un tono</b> (dos semitonos)'}.${d === 1 && !M.esNegra(lo) && !M.esNegra(hi) ? ' Mi–Fa y Si–Do son los dos pares de teclas blancas sin negra en el medio: son semitonos naturales.' : ''}`,
      donde: ok ? '' : 'No cuentes solo teclas blancas: contá todas las teclas, incluidas las negras.'}));
    return q;
  }});

  tipo('alteraciones', {nombre: 'Sostenidos y bemoles', hab: 'alteraciones', leccion: 'n-alteraciones', gen(o){
    let l, a;
    do { l = entre(0, 6); a = azar([-1, 1]); } while (!o.raras && ((a > 0 && [2, 6].includes(l)) || (a < 0 && [0, 3].includes(l))));
    const nota = {l, a, o: l === 0 && a < 0 ? 5 : 4};
    const m = M.midi(nota);
    const q = {modo: 'teclado', teclado: {desde: 60, hasta: 76, etiquetas: 'blancas'},
      enunciado: `¿Qué tecla suena para <b>${n(nota)}</b>? Tocala.`,
      visual(el){ V.pentagrama(el, {notas: [{l, o: nota.o, acc: a, color: 'a'}]}); },
      correcta: m};
    q.evaluar = t => {
      const ok = t === m;
      const nat = M.midi({l, a: 0, o: nota.o});
      return {ok, diag: ok ? null : 'alteraciones', habs: [['alteraciones', ok]], tu: t === nat ? `${M.corto({l, a: 0})} (sin alterar)` : `otra tecla`, correcta: `${M.corto(nota)}`,
        marcar: {[nat]: {c: 'a', t: M.corto({l, a: 0})}, [m]: {c: 'ok', t: M.corto(nota)}, ...(ok || t === nat ? {} : {[t]: {c: 'bad', t: '✕'}})},
        explicacion: `El ${a > 0 ? 'sostenido (♯) sube' : 'bemol (♭) baja'} la nota <b>medio tono</b>: se toca la tecla de al lado hacia la ${a > 0 ? 'derecha' : 'izquierda'}. ${M.corto({l, a: 0})} → ${M.corto(nota)}.${M.esNegra(m) ? ` Esa misma tecla negra también se llama ${M.corto(M.deMidi(m, -a))}: son nombres enarmónicos.` : ' Acá la tecla de al lado es blanca, porque entre esas dos notas no hay tecla negra.'}`,
        donde: ok ? '' : t === nat ? 'Tocaste la nota natural: te faltó aplicar la alteración.' : `Fijate para qué lado mueve la alteración: el ♯ va hacia la derecha (más agudo) y el ♭ hacia la izquierda (más grave).`};
    };
    return q;
  }});

  function lecturaPentagrama(clave){
    return function(o){
      const [pMin, pMax] = clave === 'bass' ? [16, 26] : [28, 38];   // Do2–La3 / Do4–La5
      const p = entre(pMin, pMax);
      const nota = M.desdePaso(p);
      const ops = mezclar([0, ...mezclar([-2, -1, 1, 2]).slice(0, 3)]).map(d => M.desdePaso(p + d));
      const ref = clave === 'bass' ? M.nota(3, 0, 3) : M.nota(4, 0, 4);
      const lineas = clave === 'bass' ? 'Sol – Si – Re – Fa – La' : 'Mi – Sol – Si – Re – Fa';
      const espacios = clave === 'bass' ? 'La – Do – Mi – Sol' : 'Fa – La – Do – Mi';
      const q = {modo: 'opciones', hab: clave === 'bass' ? 'pent-fa' : 'pent-sol',
        enunciado: `¿Qué nota es? (Clave de ${clave === 'bass' ? 'Fa' : 'Sol'})`,
        visual(el){ V.pentagrama(el, {clave, notas: [{l: nota.l, o: nota.o, color: 'a'}]}); },
        escuchar(){ Sonido.tocar(M.midi(nota)); },
        opciones: ops.map(x => op(M.paso(x), M.corto(x))), correcta: String(p)};
      q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : (clave === 'bass' ? 'lectura-fa' : 'lectura-sol'),
        explicacion: `En clave de ${clave === 'bass' ? 'Fa, la clave marca la 4.ª línea: ahí está <b>Fa</b>' : 'Sol, la clave se enrosca en la 2.ª línea: ahí está <b>Sol</b>'}. Líneas (de abajo hacia arriba): ${lineas}. Espacios: ${espacios}. La nota es <b>${n(nota)}</b>.`,
        donde: ok ? '' : Math.abs(+r - p) === 1 ? 'Confundiste la línea con el espacio de al lado: las notas se suceden línea, espacio, línea…' : 'Partí de la nota que marca la clave y contá línea-espacio hasta la nota.',
        alMostrar(el){ V.pentagrama(el, {clave, notas: [{l: ref.l, o: ref.o, color: 'suave', texto: M.corto(ref)}, {l: nota.l, o: nota.o, color: 'ok', texto: M.corto(nota)}]}); }}));
      return q;
    };
  }
  tipo('pent-sol', {nombre: 'Leer en clave de Sol', hab: 'pent-sol', leccion: 'n-sol', gen: lecturaPentagrama('treble')});
  tipo('pent-fa', {nombre: 'Leer en clave de Fa', hab: 'pent-fa', leccion: 'n-fa', gen: lecturaPentagrama('bass')});

  tipo('pent-teclado', {nombre: 'Del pentagrama al teclado', hab: 'pent-teclado', leccion: 'n-puente', gen(o){
    const p = entre(28, 37);
    const nota = M.desdePaso(p, o.alteraciones && Math.random() < 0.35 ? azar([-1, 1]) : 0);
    const m = M.midi(nota);
    const q = {modo: 'teclado', teclado: {desde: 60, hasta: 79, etiquetas: 'do'},
      enunciado: 'Tocá en el teclado la nota escrita (en su octava).',
      visual(el){ V.pentagrama(el, {notas: [{l: nota.l, o: nota.o, acc: nota.a || null, color: 'a'}]}); },
      correcta: m};
    q.evaluar = t => {
      const ok = t === m;
      const cerca = Math.abs(M.paso(M.deMidi(t)) - p) === 1;
      return {ok, diag: ok ? null : (t % 12 === m % 12 ? 'teclado' : cerca ? 'lectura-sol' : 'teclado'), habs: [['pent-teclado', ok]],
        tu: `${M.corto(M.deMidi(t), {oct: true})}`, correcta: M.corto(nota, {oct: true}),
        marcar: {[m]: {c: 'ok', t: M.corto(nota)}, ...(ok ? {} : {[t]: {c: 'bad', t: '✕'}})},
        explicacion: `La nota escrita es <b>${n(nota, {oct: true})}</b>. El Do de la primera línea adicional (debajo del pentagrama) es el <b>Do central</b> (Do4), el primer Do marcado en el teclado. Desde ahí, cada línea o espacio que subís es una tecla blanca más.`,
        donde: ok ? '' : t % 12 === m % 12 ? 'Encontraste la nota correcta pero en otra octava: ubicá primero el Do central.' : 'Contá desde el Do central: cada posición del pentagrama es una tecla blanca.'};
    };
    return q;
  }});

  // ---------- Intervalos ----------
  tipo('int-numero', {nombre: 'Número del intervalo', hab: 'int-numero', leccion: 'i-numero', gen(o){
    const a = generarIntervalo({calidades: ['m','M','J'], descendente: o.descendente});
    const q = {modo: 'opciones', enunciado: '¿Qué <b>número</b> de intervalo forman estas dos notas? (Contá letras.)',
      visual(el){ V.pentagrama(el, {notas: [Object.assign({color:'a'}, a.x), Object.assign({color:'b'}, a.y)]}); },
      escuchar(){ Sonido.intervalo(M.midi(a.rx), M.midi(a.ry)); },
      opciones: [2,3,4,5,6,7,8].map(x => op(x, M.NUMERO[x])), correcta: String(a.num)};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'numero', habs: [['int-numero', ok]],
      explicacion: listaPasos(E.pasosIntervalo(a).slice(0, 2)),
      donde: ok ? '' : E.dondeError(a, {num: +r}, 'numero'),
      contar: a}));
    return q;
  }});

  tipo('int-calidad', {nombre: 'Calidad del intervalo', hab: 'int-calidad', leccion: 'i-calidad', gen(o){
    const a = generarIntervalo({alteraciones: true, calidades: o.aumdis ? ['m','M','J','A','d'] : ['m','M','J'], numeros: o.numeros});
    const q = {modo: 'opciones', enunciado: `Estas dos notas forman una <b>${M.NUMERO[a.num]}</b>. ¿De qué <b>calidad</b>?`,
      visual(el){ V.pentagrama(el, {notas: [Object.assign({color:'a'}, a.x), Object.assign({color:'b'}, a.y)]}); },
      escuchar(){ Sonido.intervalo(M.midi(a.rx), M.midi(a.ry)); },
      opciones: M.calidadesPosibles(a.num).map(c => op(c, M.nombreCalidad(c, a.num))), correcta: a.cal};
    q.evaluar = r => {
      const diag = E.diagnosticarIntervalo(a, {num: a.num, cal: r});
      return resultado(q, r, ok => ({diag: ok ? null : diag, habs: [['int-calidad', ok], ...(['A','d'].includes(a.cal) ? [['int-aum-dis', ok]] : [])],
        explicacion: listaPasos(E.pasosIntervalo(a).filter(x => ['Contar los semitonos', 'Determinar la calidad', 'Nombrar el intervalo'].includes(x.t))),
        donde: ok ? '' : E.dondeError(a, {num: a.num, cal: r}, diag)}));
    };
    return q;
  }});

  tipo('int-completo', {nombre: 'Intervalos con alteraciones', hab: 'int-aum-dis', leccion: 'i-aumdis', gen(o){
    const a = generarIntervalo({alteraciones: true, calidades: o.calidades || ['m','M','J','A','d'], descendente: true});
    return preguntaIntervalo(a, {hab: 'int-aum-dis', enunciado: '¿Qué intervalo forman estas dos notas? Elegí el <b>número</b> y la <b>calidad</b>.'});
  }});

  tipo('int-construir', {nombre: 'Construir intervalos', hab: 'int-construir', leccion: 'i-construir', gen(o){
    for (;;){
      const base = M.desdePaso(entre(29, 33), Math.random() < 0.25 ? azar([-1, 1]) : 0);
      const num = azar(o.numeros || [2,3,4,5,6,7]);
      const cal = azar(M.calidadesPosibles(num).filter(c => o.aumdis || !['A','d'].includes(c)));
      const cor = M.construir(base, num, cal);
      if (!cor || Math.abs(cor.a) > 1) continue;
      const enar = M.deMidi(M.midi(cor), cor.a > 0 ? -1 : 1);
      const otraCal = Object.assign({}, cor, {a: cor.a + azar([-1, 1])});
      const otroNum = M.desdePaso(M.paso(cor) + azar([-1, 1]), 0);
      otroNum.a = M.midi(cor) - M.midi(Object.assign({}, otroNum, {a: 0}));
      const cand = [cor, enar, otraCal, otroNum].filter(x => Math.abs(x.a) <= 1);
      const unicos = []; cand.forEach(x => { if (!unicos.some(u => M.mismoNombre(u, x))) unicos.push(x); });
      while (unicos.length < 4){ const x = M.desdePaso(M.paso(cor) + azar([-2, 2, 1, -1]), azar([-1, 0, 1])); if (!unicos.some(u => M.mismoNombre(u, x))) unicos.push(x); }
      const id = x => `${x.l}:${x.a}`;
      const nombreIv = M.nombreIntervalo(num, cal);
      const q = {modo: 'opciones', enunciado: `¿Qué nota está una <b>${nombreIv}</b> por encima de <b>${n(base)}</b>?`,
        visual(el){ V.pentagrama(el, {notas: [{l: base.l, o: base.o, acc: base.a || null, color: 'a'}]}); },
        opciones: mezclar(unicos).map(x => op(id(x), n(x))), correcta: id(cor)};
      q.evaluar = r => {
        const [l, aa] = r.split(':').map(Number);
        const elegido = {l, a: aa};
        let diag = null;
        if (id(elegido) !== id(cor)){
          const mismoSonido = ((M.PC[l] + aa - M.PC[cor.l] - cor.a) % 12 + 12) % 12 === 0;
          diag = l !== cor.l ? (mismoSonido ? 'enarmonia' : 'numero') : 'calidad';
        }
        const L = []; for (let p = M.paso(base); p <= M.paso(cor); p++) L.push(M.corto(M.desdePaso(p)));
        return resultado(q, r, ok => ({diag, habs: [['int-construir', ok]],
          explicacion: listaPasos([
            {t: 'Primero la letra (número)', d: `Una ${M.NUMERO[num]} desde ${M.corto(base)}: ${L.join(' → ')}. La letra tiene que ser <b>${M.corto(M.desdePaso(M.paso(cor)))}</b>.`},
            {t: 'Después la alteración (calidad)', d: `Una ${nombreIv} tiene ${M.plural(M.semitonos(num, cal), 'semitono')}. Desde ${M.corto(base)}, eso cae en <b>${M.corto(cor)}</b>.`}]),
          donde: ok ? '' : diag === 'enarmonia' ? `${n(elegido)} suena igual que ${n(cor)}, pero tiene otra letra: formaría otro número de intervalo.` : diag === 'numero' ? `${n(elegido)} tiene la letra equivocada: contá ${num} letras desde ${M.corto(base)}.` : `La letra es correcta, pero la alteración no: contá los semitonos.`,
          alMostrar(el){ V.pentagrama(el, {notas: [{l: base.l, o: base.o, acc: base.a || null, color: 'a', texto: M.corto(base)}, {l: cor.l, o: cor.o, acc: cor.a || null, color: 'ok', texto: M.corto(cor)}]}); Sonido.intervalo(M.midi(base), M.midi(cor)); }}));
      };
      return q;
    }
  }});

  // ---------- Armaduras ----------
  tipo('arm-altura', {nombre: 'Leer notas con armadura', hab: 'arm-leer', leccion: 'a-que-es', gen(o){
    const arm = azar(o.armaduras || [1,2,3,4,-1,-2,-3,-4]);
    const k = M.armadura(arm);
    const enArm = k.alts.map(x => x.l);
    const l = Math.random() < 0.65 ? azar(enArm) : entre(0, 6);
    const oct = l >= 5 ? 4 : azar([4, 5]);
    const e = esc(l, oct);
    if (o.accidentales && Math.random() < 0.4) e.acc = enArm.includes(l) ? 0 : (arm > 0 ? 1 : -1);
    const real = M.altura(e, arm);
    const q = {modo: 'opciones', hab: e.acc !== null ? 'accidentales' : 'arm-leer',
      enunciado: `Armadura de ${M.describirArmadura(arm).replace(/:.*/, '')}. ¿Qué nota suena realmente?`,
      visual(el){ V.pentagrama(el, {armadura: arm, notas: [Object.assign({color: 'a'}, e)]}); },
      escuchar(){ Sonido.tocar(M.midi(real)); },
      opciones: [-1, 0, 1].map(x => op(x, n({l, a: x}))), correcta: String(real.a)};
    q.evaluar = r => {
      const r0 = +r, kacc = M.alteracionArmadura(arm, l);
      let diag = null;
      if (r0 !== real.a) diag = e.acc !== null && r0 === kacc ? 'accidental' : kacc !== 0 && r0 === 0 && e.acc === null ? 'armadura' : 'alteraciones';
      const habs = [['arm-leer', diag !== 'armadura']];
      if (e.acc !== null) habs.push(['accidentales', diag !== 'accidental']);
      return resultado(q, r, ok => ({diag, habs,
        explicacion: `La armadura (${M.describirArmadura(arm)}) corresponde a ${M.nombreTonalidad(k)}. ${enArm.includes(l) ? `El ${M.LATINO[l]} está en la armadura: <b>todos los ${M.LATINO[l]}</b> de la pieza, en cualquier octava, se leen ${M.corto({l, a: kacc})}` : `El ${M.LATINO[l]} no está en la armadura: se lee natural`}${e.acc !== null ? `, pero delante de la nota hay ${accTexto(e.acc)}: una alteración accidental manda sobre la armadura (hasta el final del compás). Queda <b>${M.corto(real)}</b>.` : `. Suena <b>${M.corto(real)}</b>.`}`,
        donde: ok ? '' : diag === 'armadura' ? `Leíste la nota como si no hubiera armadura. Revisá siempre qué letras aparecen al principio del pentagrama.` : diag === 'accidental' ? 'Aplicaste la armadura, pero la alteración escrita junto a la nota la reemplaza.' : 'Revisá qué alteración tiene la armadura (sostenidos o bemoles).'}));
    };
    return q;
  }});

  tipo('arm-orden', {nombre: 'Orden de sostenidos y bemoles', hab: 'arm-orden', leccion: 'a-orden', gen(){
    const sost = Math.random() < 0.5;
    const orden = sost ? M.ORDEN_SOSTENIDOS : M.ORDEN_BEMOLES;
    const i = entre(1, 6);
    const cor = orden[i];
    const opts = mezclar([cor, orden[(i + 1) % 7], orden[i - 1], orden[(i + 3) % 7]].filter((v, j, s) => s.indexOf(v) === j));
    const q = {modo: 'opciones', enunciado: `¿Cuál es el <b>${i + 1}.º ${sost ? 'sostenido' : 'bemol'}</b> de la armadura?`,
      opciones: opts.map(x => op(x, M.corto({l: x, a: sost ? 1 : -1}))), correcta: String(cor)};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'orden',
      explicacion: `Orden de los ${sost ? 'sostenidos' : 'bemoles'}: ${orden.map((x, j) => j === i ? `<b>${M.corto({l: x, a: sost ? 1 : -1})}</b>` : M.corto({l: x, a: sost ? 1 : -1})).join(' – ')}. ${sost ? 'Cada uno está una quinta arriba del anterior.' : 'Es el orden de los sostenidos al revés; cada uno está una cuarta arriba del anterior.'}`,
      donde: ok ? '' : `Recitá la serie completa: ${sost ? '“Fa Do Sol Re La Mi Si”' : '“Si Mi La Re Sol Do Fa”'} y contá hasta la posición ${i + 1}.`,
      alMostrar(el){ V.pentagrama(el, {armadura: sost ? i + 1 : -(i + 1)}); }}));
    return q;
  }});

  tipo('arm-tonalidad', {nombre: 'Tonalidad mayor de una armadura', hab: 'arm-tonalidad', leccion: 'a-tonalidad', gen(o){
    const arm = azar(o.armaduras || [1,2,3,4,5,-1,-2,-3,-4,-5]);
    const k = M.armadura(arm);
    const opts = [arm, arm + 1, arm - 1, -arm].filter((v, i, s) => Math.abs(v) <= 7 && s.indexOf(v) === i);
    const q = {modo: 'opciones', enunciado: '¿De qué tonalidad <b>mayor</b> es esta armadura?',
      visual(el){ V.pentagrama(el, {armadura: arm}); },
      opciones: mezclar(opts).map(x => op(x, M.nombreTonalidad(M.armadura(x)))), correcta: String(arm)};
    const ult = k.alts[k.alts.length - 1];
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'tonalidad', habs: [['arm-tonalidad', ok], ['arm-orden', ok || Math.abs(+r) === Math.abs(arm)]],
      explicacion: arm > 0
        ? `Con sostenidos: el último sostenido (${M.corto(ult)}) está <b>medio tono por debajo de la tónica</b>. Medio tono arriba de ${M.corto(ult)} está <b>${M.corto(k.mayor)}</b>: ${M.nombreTonalidad(k)}.`
        : arm === -1 ? `Un solo bemol (Si♭) es la armadura de <b>Fa mayor</b>: hay que recordarla de memoria.`
        : `Con bemoles: el <b>penúltimo bemol</b> es la tónica. Los bemoles son ${k.alts.map(x => M.corto(x)).join(', ')}; el penúltimo es ${M.corto(k.alts[k.alts.length - 2])}: <b>${M.nombreTonalidad(k)}</b>.`,
      donde: ok ? '' : 'Contá cuántas alteraciones hay y aplicá el truco del último sostenido o del penúltimo bemol.'}));
    return q;
  }});

  tipo('arm-relativa', {nombre: 'Relativa menor', hab: 'arm-relativa', leccion: 'a-relativa', gen(o){
    const arm = azar(o.armaduras || [0,1,2,3,4,-1,-2,-3,-4]);
    const k = M.armadura(arm);
    const opts = [arm, arm + 1, arm - 1, arm + 3].filter((v, i, s) => Math.abs(v) <= 6 && s.indexOf(v) === i);
    const conArm = Math.random() < 0.5;
    const q = {modo: 'opciones',
      enunciado: conArm ? '¿Qué tonalidad <b>menor</b> usa esta armadura?' : `¿Cuál es la relativa menor de <b>${M.nombreTonalidad(k)}</b>?`,
      visual: conArm ? (el => V.pentagrama(el, {armadura: arm})) : null,
      opciones: mezclar(opts).map(x => op(x, M.nombreTonalidad(M.armadura(x), 'menor'))), correcta: String(arm)};
    const baja = M.construir(k.mayor, 3, 'm', true);
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'relativa', habs: [['arm-relativa', ok]],
      explicacion: `${conArm ? `La armadura (${M.describirArmadura(arm)}) es la de ${M.nombreTonalidad(k)}. ` : ''}La relativa menor comparte la misma armadura y está <b>una tercera menor por debajo</b> de la tónica mayor: ${M.corto(k.mayor)} → ${M.corto(M.construir(k.mayor, 2, 'M', true))} → <b>${M.corto(baja)}</b> (3 semitonos, 3 letras). Es <b>${M.nombreTonalidad(k, 'menor')}</b>.`,
      donde: ok ? '' : 'Primero encontrá la tonalidad mayor; después bajá tres letras y tres semitonos.'}));
    return q;
  }});

  // ---------- Ejercicio principal: intervalos con armadura ----------
  tipo('int-armadura', {nombre: 'Intervalos con armadura', hab: 'int-armadura', leccion: 'x-procedimiento', gen(o){
    const a = generarIntervalo({armadura: true, accidentales: o.accidentales !== false, armaduras: o.armaduras, calidades: o.calidades || ['m','M','J','A','d'], descendente: true});
    return preguntaIntervalo(a, {hab: 'int-armadura', enunciado: '¿Qué intervalo forman estas dos notas? Tené en cuenta la armadura. Elegí el <b>número</b> y la <b>calidad</b>.'});
  }});

  // ---------- Oído ----------
  const OIDO = [[2,'m'],[2,'M'],[3,'m'],[3,'M'],[4,'J'],[4,'A'],[5,'J'],[6,'m'],[6,'M'],[7,'m'],[7,'M'],[8,'J']];
  tipo('oido', {nombre: 'Reconocer intervalos de oído', hab: 'oido', leccion: 'i-que-es', gen(o){
    const i = entre(0, OIDO.length - 1);
    const [num, cal] = OIDO[i];
    let base, top;
    do { base = M.desdePaso(entre(28, 32), 0); top = M.construir(base, num, cal); } while (!top || Math.abs(top.a) > 1);
    const vecinos = mezclar([i - 1, i + 1, i + 2, i - 2].filter(x => x >= 0 && x < OIDO.length)).slice(0, 3);
    const opts = mezclar([i, ...vecinos]);
    const q = {modo: 'opciones', auditivo: true, enunciado: 'Escuchá y elegí el intervalo. (Podés repetirlo.)',
      escuchar(){ Sonido.intervalo(M.midi(base), M.midi(top)); }, autoEscuchar: true,
      opciones: opts.map(x => op(x, M.nombreIntervalo(...OIDO[x]))), correcta: String(i)};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'oido', habs: [['oido', ok]],
      explicacion: `Sonó <b>${M.nombreIntervalo(num, cal)}</b>: ${M.plural(M.semitonos(num, cal), 'semitono')}, de ${n(base)} a ${n(top)}.`,
      donde: ok ? '' : `Tu respuesta tiene ${M.semitonos(...OIDO[+r])} semitonos y el intervalo que sonó, ${M.semitonos(num, cal)}. Escuchalos uno después del otro para compararlos.`,
      comparar: () => { const t2 = M.construir(base, ...OIDO[+r]); Sonido.intervalo(M.midi(base), M.midi(top)); setTimeout(() => t2 && Sonido.intervalo(M.midi(base), M.midi(t2)), 2600); },
      alMostrar(el){ V.pentagrama(el, {notas: [{l: base.l, o: base.o, acc: base.a || null, color: 'a', texto: M.corto(base)}, {l: top.l, o: top.o, acc: top.a || null, color: 'b', texto: M.corto(top)}]}); }}));
    return q;
  }});

  E.analizarPar = E.analizar;
  window.Ejercicios = E;
})();
