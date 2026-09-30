// Ejercicios de ritmo, con el mismo contrato que ejercicios.js: cada ejercicio sabe
// dibujarse, corregirse, explicar el procedimiento, diagnosticar el error más probable
// y generar otro parecido. Incluye dictado rítmico y tocar un ritmo (modo 'propio').
(function(){
  const M = window.Musica, V = window.Visual, E = window.Ejercicios, R = window.Ritmo, G = window.Glosario, P = window.Progreso;
  const {azar, entre, mezclar} = M;
  const {op, resultado, tipo} = E;
  const tiempos = x => `${R.fmt(x)} ${x === 1 ? 'tiempo' : 'tiempos'}`;
  const unicos = (vals, n = 4) => { const out = []; vals.forEach(v => { if (out.length < n && !out.some(y => Math.abs(y - v) < 1e-6)) out.push(v); }); return out; };
  const def = id => `<p class="gl-def"><b>${G.porId[id].t}:</b> ${G.porId[id].def}</p>`;

  // Si el ejercicio no fija nivel ni compases, se usan los temas de las lecciones ya vistas
  const nivelActual = () => P.leccionHecha('r-especiales') ? 4 : P.leccionHecha('r-puntillo') ? 3 : 2;
  const compasesVistos = () => P.leccionHecha('r-compuesto') ? ['2/4', '3/4', '4/4', '6/8'] : ['2/4', '3/4', '4/4'];
  // o.compas: un compás o 'mezcla'; o.lista: compases posibles
  const elegirCompas = o => o.compas && o.compas !== 'mezcla' ? o.compas : azar(o.lista || compasesVistos());
  // Unidad para contar: tiempos en los compases simples, corcheas en los compuestos
  const medida = c => c.tipo === 'compuesto' ? {u: 6, s: 'corchea', pl: 'corcheas'} : {u: c.pulso, s: 'tiempo', pl: 'tiempos'};
  const cant = (x, m) => `${R.fmt(x)} ${x === 1 ? m.s : m.pl}`;

  // ======================================================================
  // Figuras y silencios
  // ======================================================================
  const FORMA = {w: 'cabeza hueca y sin plica', h: 'cabeza hueca con plica', q: 'cabeza rellena con plica', '8': 'cabeza rellena, plica y un corchete', '16': 'cabeza rellena, plica y dos corchetes'};
  const FORMA_S = {w: 'un rectángulo que cuelga debajo de la línea', h: 'un rectángulo apoyado sobre la línea', q: 'un zigzag vertical', '8': 'un gancho con un punto, como un 7', '16': 'dos ganchos con punto'};
  const tablaValores = f => `<table class="eq"><tr>${R.FIGURAS.map(x => `<td${x.id === f ? ' class="on"' : ''}>${x.nombre}</td>`).join('')}</tr><tr>${R.FIGURAS.map(x => `<td${x.id === f ? ' class="on"' : ''}>${R.fmt(x.u/12)}</td>`).join('')}</tr></table><p class="lz-nota">Tiempos que dura cada figura en compases de denominador 4. Cada una dura la mitad que la anterior.</p>`;
  const ev = (f, o = {}) => Object.assign({f, p: 0, s: false, lig: false, tres: null}, o);
  const suelto = evs => ({compas: '4/4', ev: evs, anacrusa: 0});

  function leerFigura(silencio){
    return o => {
      const puntillo = !!o.puntillo && Math.random() < 0.5;
      const f = azar((o.figuras || R.FIGURAS.map(x => x.id)).filter(x => !(puntillo && x === '16')));
      const e = ev(f, {p: puntillo ? 1 : 0, s: silencio});
      const visual = el => V.ritmo(el, suelto([e]), {libre: true});
      const valor = o.valor !== undefined ? o.valor : Math.random() < 0.4;
      if (!valor){
        const hab = silencio ? 'r-silencios' : 'r-figuras';
        const otros = mezclar(R.FIGURAS.map(x => x.id).filter(x => x !== f)).slice(0, 3);
        const q = {modo: 'opciones', hab, enunciado: silencio ? '¿Qué <b>silencio</b> es?' : '¿Qué <b>figura</b> es?', visual,
          opciones: mezclar([f, ...otros]).map(x => op(x, R.nombre(ev(x, {p: e.p, s: silencio})))), correcta: f};
        q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : silencio ? 'r-silencio' : 'r-figura', habs: [[hab, ok]],
          explicacion: `<p>${silencio ? `El ${R.nombre(e)} es <b>${FORMA_S[f]}</b> y dura lo mismo que una ${R.fig(f).nombre}` : `La ${R.nombre(e)} tiene <b>${FORMA[f]}</b>`}.</p>${tablaValores(f)}`,
          donde: ok ? '' : silencio
            ? `El silencio de ${R.fig(r).nombre} es ${FORMA_S[r]}; el dibujado es ${FORMA_S[f]}.${['w', 'h'].includes(f) && ['w', 'h'].includes(r) ? ' Para no confundirlos: la redonda «pesa» más, por eso su silencio cuelga.' : ''}`
            : `La ${R.fig(r).nombre} tiene ${FORMA[r]}; la figura dibujada tiene ${FORMA[f]}. Mirá en orden: si la cabeza es hueca o rellena, si tiene plica y cuántos corchetes.`,
          alMostrar(el){ V.ritmo(el, suelto(ok ? [e] : [e, ev(r, {p: e.p, s: silencio})]), {libre: true, colores: ['ok', 'bad'], textos: ok ? [R.fig(f).nombre] : [R.fig(f).nombre, R.fig(r).nombre]}); }}));
        return q;
      }
      // ¿Cuánto dura?
      const x = R.dur(e)/12, base = R.fig(f).u/12;
      const vals = unicos([x, ...mezclar([x*2, x/2, base, base + 1, 2*base, 3, 1.5, 1, 0.5]).filter(v => v > 0 && v <= 6)]).sort((a, b) => a - b);
      const hab = e.p ? 'r-puntillo' : 'r-valores';
      const q = {modo: 'opciones', hab, enunciado: `En un compás de 4/4 (la negra vale un tiempo), ¿cuánto dura ${silencio ? 'este silencio' : 'esta figura'}?`, visual,
        opciones: vals.map(v => op(v, tiempos(v))), correcta: String(x)};
      q.evaluar = r => resultado(q, r, ok => {
        const rv = +r;
        return {diag: ok ? null : e.p ? 'r-puntillo' : 'r-valor', habs: [[hab, ok]],
          explicacion: e.p
            ? `<p>La ${R.fig(f).nombre} vale ${tiempos(base)}. El puntillo le suma la mitad de su valor (${R.fmt(base/2)}): ${R.fmt(base)} + ${R.fmt(base/2)} = <b>${tiempos(x)}</b>.</p>`
            : `<p>${silencio ? `El ${R.nombre(e)} dura lo mismo que una ${R.fig(f).nombre}` : `La ${R.fig(f).nombre}`}: <b>${tiempos(x)}</b>.</p>${tablaValores(f)}`,
          donde: ok ? '' : e.p
            ? Math.abs(rv - base) < 1e-6 ? 'Te olvidaste del puntillo: suma la mitad del valor de la figura.'
              : Math.abs(rv - (base + 1)) < 1e-6 ? `El puntillo no suma un tiempo entero: suma la mitad del valor de la figura (${R.fmt(base/2)}).`
              : Math.abs(rv - 2*base) < 1e-6 ? 'El puntillo no duplica la figura: le suma la mitad.' : `Primero el valor de la figura (${R.fmt(base)}), después sumale la mitad.`
            : rv > x ? `Le diste el valor de una figura más larga. Contá en el árbol: redonda 4, blanca 2, negra 1, corchea ½, semicorchea ¼.` : `Le diste el valor de una figura más corta. Contá en el árbol: redonda 4, blanca 2, negra 1, corchea ½, semicorchea ¼.`};
      });
      return q;
    };
  }
  tipo('r-figura', {nombre: 'Leer figuras', hab: 'r-figuras', leccion: 'r-figuras', gen: leerFigura(false)});
  tipo('r-silencio', {nombre: 'Leer silencios', hab: 'r-silencios', leccion: 'r-silencios', gen: leerFigura(true)});

  tipo('r-equivalencia', {nombre: 'Equivalencias entre figuras', hab: 'r-valores', leccion: 'r-figuras', gen(){
    let a, b;
    do { a = entre(0, 3); b = entre(a + 1, 4); } while (b - a > 3);
    const A = R.FIGURAS[a], B = R.FIGURAS[b], n = A.u/B.u;
    const pideFigura = Math.random() < 0.4;
    const q = pideFigura
      ? {modo: 'opciones', enunciado: `¿Qué figura dura lo mismo que <b>${n} ${B.plural}</b>?`,
         opciones: mezclar([A, ...mezclar(R.FIGURAS.filter(x => x !== A && x !== B)).slice(0, 3)]).map(x => op(x.id, x.nombre)), correcta: A.id,
         visual: el => V.ritmo(el, suelto(Array.from({length: n}, () => ev(B.id))), {libre: true, sinBarras: true})}
      : {modo: 'opciones', enunciado: `¿Cuántas <b>${B.plural}</b> duran lo mismo que una <b>${A.nombre}</b>?`,
         opciones: unicos([n, ...mezclar([n*2, n/2, n + 1, n - 1, 3, 6].filter(v => v >= 1 && v <= 16))]).sort((x, y) => x - y).map(v => op(v, String(v))), correcta: String(n),
         visual: el => V.ritmo(el, suelto([ev(A.id)]), {libre: true})};
    const cadena = R.FIGURAS.slice(a, b + 1).map((x, i) => `${2**i} ${2**i === 1 ? x.nombre : x.plural}`).join(' = ');
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-valor', habs: [['r-valores', ok]],
      explicacion: `<p>Cada figura dura la mitad que la anterior, así que cada paso duplica la cantidad: ${cadena}.</p>`,
      donde: ok ? '' : `De ${A.nombre} a ${B.nombre} hay ${M.plural(b - a, 'paso')} en el árbol de figuras; en cada paso la cantidad se duplica: ${cadena}.`,
      alMostrar(el){ V.ritmo(el, suelto([ev(A.id), ...Array.from({length: n}, () => ev(B.id))]), {libre: true, colores: ['a', ...Array(n).fill('b')], textos: [`1 ${A.nombre}`, `= ${n} ${B.plural}`]}); }}));
    return q;
  }});

  // ======================================================================
  // Compás
  // ======================================================================
  const FIG_DUR = [[48, 'w', 0], [36, 'h', 1], [24, 'h', 0], [18, 'q', 1], [12, 'q', 0], [9, '8', 1], [6, '8', 0], [3, '16', 0]];
  const eventoDe = u => { const x = FIG_DUR.find(y => Math.abs(y[0] - u) < 1e-6); return x ? ev(x[1], {p: x[2]}) : null; };
  const describirCifra = c => c.tipo === 'compuesto'
    ? `tiene ${c.num} corcheas, agrupadas en ${c.pulsos} pulsos de negra con puntillo`
    : `tiene ${c.num} tiempos de ${R.fig(R.DEN_FIGURA[c.den]).nombre}`;

  tipo('r-completar', {nombre: 'Completar compases', hab: 'r-completar', leccion: 'r-compas', gen(o){
    for (let intento = 0; intento < 100; intento++){
      const compas = elegirCompas(o), c = R.compas(compas), mm = medida(c);
      const nivel = Math.min(o.nivel || nivelActual(), 3);
      const vale = u => { const e = eventoDe(u); return e && (nivel >= 3 || !e.p) && u <= 48; };   // sin puntillo antes de verlo
      const p = R.generar({compas, nivel, compases: 1, exigirNivel: false});
      const ini = R.inicios(p);
      const ks = p.ev.map((e, k) => k).filter(k => k > 0 && c.largo - ini[k] >= 6 && vale(c.largo - ini[k]) && !p.ev[k - 1].lig && !(p.ev[k].tres && p.ev[k].tres === p.ev[k - 1].tres));
      if (!ks.length) continue;
      const k = azar(ks), falta = c.largo - ini[k], fe = eventoDe(falta);
      const escrito = p.ev.slice(0, k), suma = ini[k];
      if (escrito.every(e => e.s)) continue;
      const figura = Math.random() < 0.6;
      const completo = {compas, ev: [...escrito, fe], anacrusa: 0};
      let opciones, correcta;
      if (figura){
        const cands = [falta*2, falta/2, falta*1.5, falta*2/3, falta - 6, falta + 12, falta + 6].filter(vale);
        opciones = unicos([falta, ...mezclar(cands), ...mezclar(FIG_DUR.map(x => x[0]).filter(vale))]).map(u => op(u, R.nombre(eventoDe(u))));
        correcta = String(falta);
      } else {
        const v = falta/mm.u;
        opciones = unicos([v, ...mezclar([v + 1, v - 1, v + 0.5, v*2, v/2, v + 2].filter(x => x > 0))]).sort((a, b) => a - b).map(x => op(x, cant(x, mm)));
        correcta = String(v);
      }
      const q = {modo: 'opciones', enunciado: figura ? `Compás de <b>${compas}</b>. ¿Qué figura falta al final para completarlo?` : `Compás de <b>${compas}</b>. ¿Cuánto falta para completarlo?`,
        visual: el => V.ritmo(el, completo, {ocultos: [k]}), opciones: figura ? mezclar(opciones) : opciones, correcta};
      q.evaluar = r => resultado(q, r, ok => {
        const ru = figura ? +r : +r*mm.u;
        let diag = null;
        if (!ok){
          diag = 'r-completar';
          if (c.id !== '4/4' && Math.abs(ru - (48 - suma)) < 1e-6) diag = 'r-compas';
          else if (Math.abs(ru*1.5 - falta) < 1e-6 || Math.abs(ru - falta*1.5) < 1e-6) diag = 'r-puntillo';
        }
        return {diag, habs: [['r-completar', ok], ...(diag === 'r-compas' ? [['r-compas', false]] : diag === 'r-puntillo' ? [['r-puntillo', false]] : [])],
          explicacion: `<ol class="proc"><li><b>Cuánto tiene el compás.</b> ${compas} ${describirCifra(c)}: en total, ${cant(c.largo/mm.u, mm)}.</li>
            <li><b>Cuánto hay escrito.</b> ${escrito.map(e => R.fmt(R.dur(e)/mm.u)).join(' + ')} = ${cant(suma/mm.u, mm)}.</li>
            <li><b>Cuánto falta.</b> ${R.fmt(c.largo/mm.u)} − ${R.fmt(suma/mm.u)} = <b>${cant(falta/mm.u, mm)}</b>: ${figura ? `una <b>${R.nombre(fe)}</b>` : `por ejemplo, una ${R.nombre(fe)}`}.</li></ol>`,
          donde: ok ? '' : diag === 'r-compas' ? `Contaste como si el compás fuera de 4/4. En ${compas} el total es ${cant(c.largo/mm.u, mm)}: mirá el número de arriba de la cifra.`
            : diag === 'r-puntillo' ? `Te confundiste con el puntillo: lo que elegiste dura ${cant(ru/mm.u, mm)} y faltan ${cant(falta/mm.u, mm)}. El puntillo suma la mitad del valor de la figura.`
            : `Sumá de nuevo figura por figura: lo escrito ocupa ${cant(suma/mm.u, mm)} y el compás tiene ${cant(c.largo/mm.u, mm)}.`,
          alMostrar(el){ V.ritmo(el, completo, {colores: escrito.map(() => null).concat('ok'), conteo: true}); }};
      });
      return q;
    }
    return E.generar('r-cifra', o);
  }});

  const SIMPLES = ['2/4', '3/4', '4/4'], COMPUESTOS = ['6/8', '9/8', '12/8'];
  tipo('r-cifra', {nombre: '¿Qué compás es?', hab: 'r-compas', leccion: 'r-compas', gen(o){
    const lista = o.lista || compasesVistos();
    if (Math.random() < 0.3){
      // Qué significan los números
      const [n, d] = azar([[2, 4], [3, 4], [4, 4], [2, 2]]);
      const fig = x => R.fig(R.DEN_FIGURA[x]).nombre;
      const txt = (a, b) => `${a} tiempos; cada uno vale una ${fig(b)}`;
      const cands = [[n, d], [n + 1, d], [n, d === 4 ? 2 : 4], [n, 8], [Math.max(2, n - 1), d]].filter(([a, b]) => R.DEN_FIGURA[b] && a >= 2);
      const vistos = new Set(), opts = [];
      cands.forEach(([a, b]) => { const id = `${a}-${b}`; if (!vistos.has(id) && opts.length < 4){ vistos.add(id); opts.push(op(id, txt(a, b))); } });
      const ejemplo = R.generar({compas: `${n}/${d}` === '2/2' ? '2/4' : `${n}/${d}`, nivel: 2, compases: 1});
      const q = {modo: 'opciones', enunciado: `¿Qué indica la cifra <b>${n}/${d}</b>?`, opciones: mezclar(opts), correcta: `${n}-${d}`,
        visual: `${n}/${d}` === '2/2' ? null : el => V.ritmo(el, ejemplo)};
      q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-compas', habs: [['r-compas', ok]],
        explicacion: `<p>El número de <b>arriba</b> (numerador) dice cuántos tiempos tiene cada compás: <b>${n}</b>. El de <b>abajo</b> (denominador) dice qué figura vale un tiempo: <b>${d} = ${fig(d)}</b>, porque una ${fig(d)} es ${d === 2 ? 'la mitad (½)' : d === 4 ? 'la cuarta parte (¼)' : 'la octava parte (⅛)'} de una redonda.</p>`,
        donde: ok ? '' : 'Arriba: cuántos tiempos. Abajo: qué figura vale un tiempo (2 = blanca, 4 = negra, 8 = corchea).'}));
      return q;
    }
    const compas = elegirCompas(Object.assign({}, o, {lista})), c = R.compas(compas);
    const p = R.generar({compas, nivel: Math.min(o.nivel || nivelActual(), 3), compases: 2});
    const pool = [...SIMPLES, ...(lista.some(x => COMPUESTOS.includes(x)) ? COMPUESTOS : [])].filter(x => x !== compas && R.compas(x).largo !== c.largo);
    const opts = mezclar([compas, ...mezclar(pool).slice(0, 3)]);
    const mm = medida(c), ini = R.inicios(p);
    const primer = p.ev.filter((e, i) => ini[i] < c.largo - 1e-6);
    const q = {modo: 'opciones', enunciado: 'A este ritmo le borramos la cifra indicadora. ¿En qué compás está escrito?',
      visual: el => V.ritmo(el, p, {cifra: false}), opciones: opts.map(x => op(x, x)), correcta: compas};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-compas', habs: [['r-compas', ok]],
      explicacion: `<p>Sumamos lo que hay entre dos barras de compás: ${primer.map(e => R.fmt(R.dur(e)/mm.u)).join(' + ')} = <b>${cant(c.largo/mm.u, mm)}</b>${c.tipo === 'compuesto' ? `, agrupadas de a tres (fijate en las barras de unión): son ${c.pulsos} pulsos de negra con puntillo. Es <b>${compas}</b>${c.largo === 36 ? '. Si las corcheas estuvieran agrupadas de a dos, sería 3/4' : ''}.` : `. Es <b>${compas}</b>: ${describirCifra(c)}.`}</p>`,
      donde: ok ? '' : `Entre dos barras hay una duración de ${R.fmt(c.largo/12)} ${c.largo === 12 ? 'negra' : 'negras'}; un compás de ${r} ocuparía ${R.fmt(R.compas(r).largo/12)}. Sumá las figuras de un solo compás.`,
      alMostrar(el){ V.ritmo(el, p, {conteo: true}); }}));
    return q;
  }});

  // ======================================================================
  // Puntillo y ligadura
  // ======================================================================
  const LIGADAS = [['h~ q', 3], ['q~ 8', 1.5], ['q~ q', 2], ['h~ h', 4], ['h~ 8', 2.5], ['8~ 16', 0.75], ['q.~ 8', 2], ['h~ q.', 3.5]];
  const EQUIV = {h: ['h~ q', 'h~ h', 'h~ 8', 'q~ q'], q: ['q~ 8', 'q~ q', 'q~ 16', '8~ 8'], '8': ['8~ 16', '8~ 8', 'q~ 16', '16~ 16']};
  tipo('r-puntillo', {nombre: 'Puntillo y ligadura', hab: 'r-puntillo', leccion: 'r-puntillo', gen(o){
    const v = o.variante || azar(['valor', 'valor', 'ligadura', 'equivale']);
    let q;
    if (v === 'ligadura'){
      const [txt, x] = azar(LIGADAS);
      const p = R.patron('4/4', txt);
      q = {modo: 'opciones', enunciado: 'En 4/4, ¿cuánto dura este sonido? (Las figuras están ligadas.)',
        visual: el => V.ritmo(el, p, {libre: true}),
        opciones: unicos([x, ...mezclar([x + 1, x - 1, x + 0.5, x - 0.5, x*2].filter(y => y > 0))]).sort((a, b) => a - b).map(y => op(y, tiempos(y))), correcta: String(x)};
      q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-puntillo', habs: [['r-puntillo', ok]],
        explicacion: `<p>La ligadura une las figuras en un solo sonido y <b>suma sus duraciones</b>: ${p.ev.map(e => `${R.nombre(e)} (${R.fmt(R.dur(e)/12)})`).join(' + ')} = <b>${tiempos(x)}</b>. Se toca una sola vez.</p>`,
        donde: ok ? '' : `Sumá el valor de cada figura${p.ev.some(e => e.p) ? ' (y acordate de que el puntillo suma la mitad)' : ''}: ${p.ev.map(e => R.fmt(R.dur(e)/12)).join(' + ')}.`}));
    } else if (v === 'equivale'){
      const f = azar(['h', 'q', '8']);
      const e = ev(f, {p: 1});
      const lista = EQUIV[f];
      const idx = mezclar([0, 1, 2, 3]);
      q = {modo: 'opciones', enunciado: `¿Qué ritmo dura lo mismo que una <b>${R.nombre(e)}</b>?`,
        visual: el => V.ritmo(el, suelto([e]), {libre: true}),
        opciones: idx.map(i => op(i, V.ritmoHTML(R.patron('4/4', lista[i]), {libre: true}))), correcta: '0'};
      const base = R.fig(f).u/12;
      q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-puntillo', habs: [['r-puntillo', ok]],
        tu: R.describir(lista[+r]), correcta: R.describir(lista[0]),
        explicacion: `<p>${R.nombre(e)} = ${R.fmt(base)} + ${R.fmt(base/2)} = ${tiempos(base*1.5)}. La mitad de una ${R.fig(f).nombre} es una ${R.FIGURAS[R.FIGURAS.indexOf(R.fig(f)) + 1].nombre}, así que <b>${R.describir(lista[0])}</b> dura lo mismo. El puntillo es una forma abreviada de escribir esa ligadura.</p>`,
        donde: ok ? '' : `Lo que elegiste dura ${tiempos(R.largo(R.patron('4/4', lista[+r]))/12)}; la ${R.nombre(e)} dura ${tiempos(base*1.5)}. El puntillo suma la mitad del valor de la figura.`,
        alMostrar(el){ V.ritmo(el, R.patron('4/4', `${f}. ${lista[0]}`), {libre: true, colores: ['a', 'ok', 'ok'], textos: [R.fmt(base*1.5), `${R.fmt(base)} + ${R.fmt(base/2)}`]}); }}));
    } else {
      const f = azar(['h', 'q', 'q', '8']);
      const e = ev(f, {p: 1, s: Math.random() < 0.2});
      const base = R.fig(f).u/12, x = base*1.5;
      q = {modo: 'opciones', enunciado: `En 4/4, ¿cuántos tiempos dura ${e.s ? 'este silencio' : 'esta figura'} con puntillo?`,
        visual: el => V.ritmo(el, suelto([e]), {libre: true}),
        opciones: unicos([x, base, base + 1, 2*base, x + 1, x/2].filter(y => y > 0)).sort((a, b) => a - b).map(y => op(y, tiempos(y))), correcta: String(x)};
      q.evaluar = r => resultado(q, r, ok => {
        const rv = +r;
        return {diag: ok ? null : 'r-puntillo', habs: [['r-puntillo', ok]],
          explicacion: `<p>La ${R.fig(f).nombre} vale ${tiempos(base)}. El puntillo suma la <b>mitad de ese valor</b> (${R.fmt(base/2)}): ${R.fmt(base)} + ${R.fmt(base/2)} = <b>${tiempos(x)}</b>.</p>`,
          donde: ok ? '' : Math.abs(rv - base) < 1e-6 ? 'Te olvidaste del puntillo: suma la mitad del valor de la figura.'
            : Math.abs(rv - (base + 1)) < 1e-6 ? `El puntillo no suma un tiempo entero: suma la mitad del valor de la figura. En una ${R.fig(f).nombre}, ${R.fmt(base/2)}.`
            : Math.abs(rv - 2*base) < 1e-6 ? 'El puntillo no duplica la figura: le suma la mitad.' : `Primero el valor de la figura (${R.fmt(base)}), después sumale la mitad.`,
          alMostrar(el){ V.ritmo(el, suelto([e, ev(f, {s: e.s, lig: !e.s}), ev(R.FIGURAS[R.FIGURAS.indexOf(R.fig(f)) + 1].id, {s: e.s})]), {libre: true, colores: ['a', 'ok', 'ok'], textos: [R.fmt(x), R.fmt(base), `+ ${R.fmt(base/2)}`]}); }};
      });
    }
    return q;
  }});

  // ======================================================================
  // Compases compuestos
  // ======================================================================
  const CLASES = ['Simple binario', 'Simple ternario', 'Simple cuaternario', 'Compuesto binario', 'Compuesto ternario', 'Compuesto cuaternario'];
  const clase = c => `${c.tipo === 'compuesto' ? 'Compuesto' : 'Simple'} ${R.CARACTER[c.pulsos]}`;
  const UNIDADES = {q: 'negra', 'q.': 'negra con puntillo', '8': 'corchea', h: 'blanca', 'h.': 'blanca con puntillo'};
  const unidadDe = c => c.tipo === 'compuesto' ? 'q.' : R.DEN_FIGURA[c.den];
  tipo('r-compuesto', {nombre: 'Compases compuestos', hab: 'r-compuesto', leccion: 'r-compuesto', gen(o){
    const v = o.variante || azar(['clase', 'unidad', 'pulsos', 'oido']);
    const expl = c => `<p>${c.id}: ${c.tipo === 'compuesto'
      ? `compás <b>compuesto</b>. El pulso se divide en tres corcheas, así que la unidad de tiempo es la <b>negra con puntillo</b>. ${c.num} corcheas ÷ 3 = <b>${c.pulsos} pulsos</b> (${R.CARACTER[c.pulsos]}).`
      : `compás <b>simple</b>. El pulso se divide en dos; la unidad de tiempo es la <b>${UNIDADES[unidadDe(c)]}</b> y hay <b>${c.pulsos} pulsos</b> (${R.CARACTER[c.pulsos]}).`}</p>`;
    let q;
    if (v === 'oido'){
      const compas = azar(['3/4', '6/8']), c = R.compas(compas);
      const p = R.patron(compas, '8 8 8 8 8 8 | 8 8 8 8 8 8');
      const alturas = R.ataques(p).map(a => R.posicion(p, a.t).resto < 1e-6 ? (R.posicion(p, a.t).pulso === 1 ? 79 : 76) : 72);
      q = {modo: 'opciones', auditivo: true, autoEscuchar: true, enunciado: 'Escuchá doce corcheas: las notas más agudas marcan el comienzo de cada pulso. ¿Cómo se agrupan?',
        escuchar(){ V.tocarRitmo(p, {bpm: compas === '3/4' ? 92 : 62, cuenta: 0, alturas}); },
        opciones: [op('3/4', '3/4: tres pulsos de a dos corcheas'), op('6/8', '6/8: dos pulsos de a tres corcheas')], correcta: compas};
      q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-compuesto', habs: [['r-compuesto', ok]],
        explicacion: `${expl(c)}<p>Los dos tienen seis corcheas por compás; lo que cambia es cómo se agrupan y dónde caen los acentos: 3/4 = <b>1</b> y <b>2</b> y <b>3</b> y; 6/8 = <b>1</b> y a <b>2</b> y a.</p>`,
        donde: ok ? '' : 'Contá cuántas corcheas hay entre dos notas agudas: dos corcheas por pulso es 3/4; tres, 6/8.',
        alMostrar(el){ V.ritmo(el, p, {conteo: true}); }}));
      return q;
    }
    const compas = v === 'pulsos' && Math.random() < 0.7 ? azar(COMPUESTOS) : azar([...SIMPLES, ...COMPUESTOS, ...(v === 'unidad' ? ['2/2'] : [])]);
    const c = R.compas(compas);
    const ejemplo = compas === '2/2' ? null : R.generar({compas, nivel: 2, compases: 1});
    const visual = ejemplo ? el => V.ritmo(el, ejemplo) : null;
    if (v === 'clase'){
      const cor = clase(c);
      const otroTipo = `${c.tipo === 'compuesto' ? 'Simple' : 'Compuesto'} ${R.CARACTER[c.pulsos]}`;
      const trampa = c.tipo === 'compuesto' && R.CARACTER[c.num] ? `Simple ${R.CARACTER[c.num]}` : null;
      const opts = unicosTxt([cor, otroTipo, trampa, ...mezclar(CLASES)].filter(Boolean));
      q = {modo: 'opciones', enunciado: `¿Qué clase de compás es <b>${compas}</b>?`, visual, opciones: mezclar(opts).map(x => op(x, x)), correcta: cor};
    } else if (v === 'unidad'){
      const cor = unidadDe(c);
      const opts = unicosTxt([cor, c.tipo === 'compuesto' ? R.DEN_FIGURA[c.den] : 'q.', ...mezclar(Object.keys(UNIDADES))]);
      q = {modo: 'opciones', enunciado: `¿Cuál es la <b>unidad de tiempo</b> (la figura que dura un pulso) en <b>${compas}</b>?`, visual, opciones: mezclar(opts).map(x => op(x, UNIDADES[x])), correcta: cor};
    } else {
      const opts = unicos([c.pulsos, c.num, ...mezclar([2, 3, 4, 6, 9, 12])]).sort((a, b) => a - b);
      q = {modo: 'opciones', enunciado: `¿Cuántos <b>pulsos</b> (tiempos que se sienten) tiene un compás de <b>${compas}</b>?`, visual, opciones: opts.map(x => op(x, String(x))), correcta: String(c.pulsos)};
    }
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-compuesto', habs: [['r-compuesto', ok]],
      explicacion: expl(c),
      donde: ok ? '' : c.tipo === 'compuesto' ? `En los compases de denominador 8 con numerador 6, 9 o 12, el número de arriba no es la cantidad de pulsos: dividilo por 3 (${c.num} ÷ 3 = ${c.pulsos}).` : `En ${compas} el pulso se divide en dos: es un compás simple, y el número de arriba sí es la cantidad de tiempos.`,
      alMostrar: ejemplo ? el => V.ritmo(el, ejemplo, {conteo: true}) : null}));
    return q;
  }});
  function unicosTxt(xs, n = 4){ const out = []; xs.forEach(x => { if (out.length < n && !out.includes(x)) out.push(x); }); return out; }

  // ======================================================================
  // Tempo
  // ======================================================================
  tipo('r-tempo', {nombre: 'Pulso y tempo', hab: 'r-tempo', leccion: 'r-pulso', gen(o){
    const v = o.variante || azar(['orden', 'bpm', 'bpm', 'oido']);
    const tabla = `<table class="lz-tabla"><tr><th>Indicación</th><th>Carácter</th><th>BPM aprox.</th></tr>${R.TEMPOS.map(t => `<tr><td><b>${t.nombre}</b></td><td>${t.desc}</td><td>${t.desde}–${t.hasta}</td></tr>`).join('')}</table>`;
    let q;
    if (v === 'orden'){
      const rapida = Math.random() < 0.5;
      const ts = mezclar(R.TEMPOS).slice(0, 4);
      const cor = ts.reduce((a, b) => (rapida ? b.tipico > a.tipico : b.tipico < a.tipico) ? b : a);
      q = {modo: 'opciones', enunciado: `¿Cuál de estas indicaciones de tempo es la más <b>${rapida ? 'rápida' : 'lenta'}</b>?`, opciones: ts.map(t => op(t.id, t.nombre)), correcta: cor.id};
    } else if (v === 'bpm'){
      const i = entre(0, R.TEMPOS.length - 1), t = R.TEMPOS[i];
      const bpm = t.tipico + entre(-3, 3);
      const otros = mezclar(R.TEMPOS.filter((x, j) => Math.abs(j - i) >= 2)).slice(0, 3);
      q = {modo: 'opciones', enunciado: `Al principio de una obra dice <b>♩ = ${bpm}</b>. ¿Qué indicación de tempo le corresponde?`, opciones: mezclar([t, ...otros]).map(x => op(x.id, x.nombre)), correcta: t.id};
    } else {
      const bpm = azar([50, 72, 100, 132, 176]);
      const opts = [bpm, ...mezclar([50, 72, 100, 132, 176].filter(x => x !== bpm)).slice(0, 3)].sort((a, b) => a - b);
      q = {modo: 'opciones', auditivo: true, autoEscuchar: true, enunciado: 'Escuchá el pulso. ¿A qué tempo va, más o menos? (Un pulso por segundo es 60 BPM.)',
        escuchar(){ V.tocarRitmo(R.patron('4/4', 'wr wr'), {bpm, cuenta: 0, metronomo: true, sinNotas: true, acento: false}); },
        opciones: opts.map(x => op(x, `♩ = ${x}`)), correcta: String(bpm)};
    }
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-tempo', habs: [['r-tempo', ok]],
      explicacion: `${v === 'oido' ? '<p>Para estimar un tempo, compará con un segundo: 60 BPM es un pulso por segundo; 120 BPM, dos por segundo.</p>' : ''}${tabla}<p class="lz-nota">Los rangos son orientativos: cambian un poco según el libro o el metrónomo.</p>`,
      donde: ok ? '' : 'Ordená las indicaciones de lento a rápido: Largo, Adagio, Andante, Moderato, Allegro, Presto.'}));
    return q;
  }});

  // ======================================================================
  // Síncopa, contratiempo, tresillo y anacrusa
  // ======================================================================
  const ESPECIALES = [
    ['sincopa', '4/4', 'q 8 q 8 q', [2]], ['sincopa', '2/4', '8 q 8', [1]], ['sincopa', '3/4', '8 q q 8', [1]], ['sincopa', '4/4', '8 q 8 h', [1]], ['sincopa', '4/4', 'q 8 8~ 8 8 q', [2, 3]],
    ['contratiempo', '2/4', '8r 8 8r 8', [1, 3]], ['contratiempo', '4/4', 'q 8r 8 q 8r 8', [2, 5]], ['contratiempo', '3/4', '8r 8 8r 8 q', [1, 3]], ['contratiempo', '4/4', 'h 8r 8 8r 8', [3, 5]],
    ['tresillo', '2/4', '3(8 8 8) q', [0, 1, 2]], ['tresillo', '4/4', 'q 3(8 8 8) h', [1, 2, 3]], ['tresillo', '3/4', '8 8 3(8 8 8) q', [2, 3, 4]],
    ['anacrusa', '4/4', 'q | q q q q | h h', [0], 12], ['anacrusa', '3/4', '8. 16 | q q q | h.', [0, 1], 12], ['anacrusa', '2/4', '8 8 | q q | q 8 8 | h', [0, 1], 12], ['anacrusa', '4/4', '8 | q q q 8 8 | h. 8', [0], 6]
  ];
  const NOMBRE_ESP = {sincopa: 'Síncopa', contratiempo: 'Contratiempo', tresillo: 'Tresillo', anacrusa: 'Anacrusa'};
  tipo('r-especial', {nombre: 'Síncopa, contratiempo, tresillo y anacrusa', hab: 'r-especiales', leccion: 'r-especiales', gen(o){
    const [cual, compas, txt, marcadas, anacrusa] = azar(ESPECIALES.filter(x => !o.solo || o.solo.includes(x[0])));
    const p = R.patron(compas, txt, {anacrusa});
    const colores = p.ev.map((e, i) => marcadas.includes(i) ? 'a' : null);
    const ini = R.inicios(p), i0 = marcadas[0];
    let vista = null;
    const q = {modo: 'opciones', enunciado: '¿Cómo se llama lo que está <b>resaltado</b>?',
      visual(el){ vista = V.ritmo(el, p, {colores}); },
      escuchar(){ V.tocarRitmo(p, {bpm: 72, metronomo: true, vista}); },
      opciones: Object.keys(NOMBRE_ESP).map(x => op(x, NOMBRE_ESP[x])), correcta: cual};
    const detalle = {
      sincopa: () => { const pu = R.compas(compas).pulso; return `La figura resaltada empieza en ${R.describirPos(p, ini[i0])} (parte débil) y se prolonga sobre ${R.describirPos(p, Math.floor(ini[i0]/pu + 1)*pu)}, que es más fuerte. Por eso es una síncopa.`; },
      contratiempo: () => `Hay un silencio en la parte fuerte y la nota suena en ${R.describirPos(p, ini[i0])}, sin prolongarse sobre el tiempo siguiente: es un contratiempo.`,
      tresillo: () => 'Tres corcheas con un 3 encima ocupan el lugar de dos: el pulso se divide en tres partes iguales.',
      anacrusa: () => 'Las notas resaltadas están antes de la primera barra de compás: la música empieza antes del primer tiempo fuerte. El último compás completa lo que le faltó al primero.'
    };
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'r-especial', habs: [['r-especiales', ok]],
      explicacion: `<p>${detalle[cual]()}</p>${def(cual)}`,
      donde: ok ? '' : cual === 'sincopa' && r === 'contratiempo' ? 'En el contratiempo la nota no se prolonga sobre la parte fuerte; acá sí se prolonga: es una síncopa.'
        : cual === 'contratiempo' && r === 'sincopa' ? 'En la síncopa la nota se prolonga sobre la parte fuerte siguiente; acá la nota es corta y viene después de un silencio: es un contratiempo.'
        : def(r).replace(/<\/?p[^>]*>/g, ''),
      alMostrar(el){ vista = V.ritmo(el, p, {colores, conteo: true}); }}));
    return q;
  }});

  // ======================================================================
  // Dictado rítmico
  // ======================================================================
  // o: {compas | 'mezcla', lista, nivel, nCompases, bpm, metronomo}
  // o.bpm es el tempo de la negra; en los compuestos se toma la negra con puntillo a la misma velocidad de corcheas
  const bpmDe = (o, c, def) => o.bpm ? (c.tipo === 'compuesto' ? Math.round(o.bpm*2/3) : o.bpm) : def;
  tipo('r-dictado', {nombre: 'Dictado rítmico', hab: 'r-dictado', leccion: 'r-leer', gen(o){
    const compas = elegirCompas(o), c = R.compas(compas);
    const nivel = o.nivel || nivelActual();
    const n = o.nCompases || (c.pulsos <= 3 ? 2 : 1);
    let p, vars;
    for (let intento = 0; intento < 20; intento++){
      p = R.generar({compas, nivel, compases: n});
      vars = [];
      for (let k = 0; k < 30 && vars.length < 3; k++){
        const v = R.variante(p, {nivel});
        if (v && ![p, ...vars].some(x => R.firma(x) === R.firma(v))) vars.push(v);
      }
      if (vars.length === 3) break;
    }
    const bpm = bpmDe(o, c, c.tipo === 'compuesto' ? 56 : nivel >= 3 ? 70 : 80);
    const todos = [p, ...vars];
    const q = {modo: 'opciones', auditivo: true, autoEscuchar: true,
      enunciado: `Escuchá el ritmo (primero suena un compás de cuenta) y elegí cuál sonó. Compás de <b>${compas}</b>.`,
      escuchar(){ V.tocarRitmo(p, {bpm, metronomo: o.metronomo !== false}); },
      opciones: mezclar(todos.map((x, i) => op(i, V.ritmoHTML(x)))), correcta: '0'};
    q.evaluar = r => resultado(q, r, ok => {
      const elegido = todos[+r];
      const cam = elegido && elegido.cambio;
      let donde = '';
      if (!ok && cam){
        const pos = `${cam.pulsos > 1 ? `los tiempos ${cam.pulso + 1} a ${cam.pulso + cam.pulsos}` : `el tiempo ${cam.pulso + 1}`}${n > 1 ? ` del compás ${cam.compas + 1}` : ''}`;
        donde = `La diferencia está en ${pos}: sonó <b>${R.describir(R.tramo(p, cam.compas, cam.pulso, cam.pulsos))}</b> y elegiste <b>${R.describir(R.tramo(elegido, cam.compas, cam.pulso, cam.pulsos))}</b>. Escuchá los dos contando el pulso.`;
      }
      const colores = cam ? (() => { const ini = R.inicios(p), t0 = cam.compas*c.largo + cam.pulso*c.pulso, t1 = t0 + cam.pulsos*c.pulso; return ini.map(t => t >= t0 - 1e-6 && t < t1 - 1e-6 ? 'a' : null); })() : null;
      return {diag: ok ? null : 'r-dictado', habs: [['r-dictado', ok]],
        explicacion: `<p>Sonó el ritmo que ahora aparece arriba, con el conteo${ok ? '' : ' (resaltado, el lugar donde está la diferencia)'}. Escuchalo de nuevo contando en voz alta: los números son los pulsos; la «y», la mitad de cada pulso.</p>`,
        donde,
        comparar: ok ? null : () => { const h = V.tocarRitmo(p, {bpm, metronomo: true}); setTimeout(() => V.tocarRitmo(elegido, {bpm, metronomo: true, cuenta: 0}), Math.max(0, Sonido.aMs(h.fin) - performance.now()) + 700); },
        alMostrar(el){ V.ritmo(el, p, {conteo: true, colores: ok ? null : colores}); }};
    });
    return q;
  }});

  // ======================================================================
  // Tocar un ritmo
  // ======================================================================
  tipo('r-tocar', {nombre: 'Tocar ritmos', hab: 'r-tocar', leccion: 'r-leer', gen(o){
    const compas = elegirCompas(o), c = R.compas(compas);
    const nivel = o.nivel || nivelActual();
    const p = o.patron || R.generar({compas, nivel, compases: o.nCompases || (c.pulsos <= 2 ? 2 : 1)});
    const bpm = bpmDe(o, c, c.tipo === 'compuesto' ? 50 : nivel >= 3 ? 66 : 76);
    const at = R.ataques(p);
    let vista = null, guiado = false;
    const q = {modo: 'propio', enunciado: o.reintento ? 'Probá de nuevo el mismo ritmo. Contá en voz alta mientras tocás.' : `Tocá este ritmo en <b>${compas}</b>: marcá el comienzo de cada figura.`,
      visual(el){ vista = V.ritmo(el, p); },
      montar(box, responder, ctx){
        guiado = ctx.modo === 'guiado';
        if (guiado && ctx.vis) vista = V.ritmo(ctx.vis, p, {conteo: true});
        V.tapear(box, p, {bpm, metronomo: o.metronomo, vista: guiado ? vista : null, escuchar: guiado, alTerminar: responder, alCambiarMetronomo: o.alCambiarMetronomo});
      }};
    q.evaluar = r => {
      const esperados = at.map(x => x.t*r.spu);
      const cmp = V.compararToques(esperados, r.golpes, r.spp);
      const n = esperados.length, aTiempo = cmp.bien + cmp.cerca;
      const ok = cmp.faltan === 0 && cmp.extras === 0 && cmp.mal === 0 && cmp.bien >= Math.ceil(n*0.6);
      // Qué pasó con los toques de más: ¿cayeron en silencios o en notas largas?
      const ini = R.inicios(p);
      const evEn = t => { let k = 0; ini.forEach((x, i) => { if (x <= t/r.spu + 1e-6) k = i; }); return k; };
      let enSilencio = 0, enLarga = 0;
      cmp.golpes.filter(g => g.estado === 'extra').forEach(g => {
        const k = evEn(g.t), e = p.ev[k];
        if (!e) return;
        const ligada = e.lig || (k > 0 && p.ev[k - 1].lig);
        if (e.s) enSilencio++;
        else if ((ligada || R.dur(e) >= c.pulso) && g.t - ini[k]*r.spu > cmp.tol) enLarga++;
      });
      const diag = ok ? null : enSilencio ? 'r-tocar-silencio' : enLarga ? 'r-tocar-largas' : 'r-tocar';
      const primerMal = cmp.esperados.findIndex(e => e.estado === 'mal' || e.estado === 'falta');
      const colAt = {ok: 'ok', cerca: 'a', mal: 'bad', falta: 'bad'};
      const colores = p.ev.map(() => null);
      at.forEach((x, j) => { for (let k = x.i; k <= x.hasta; k++) colores[k] = colAt[cmp.esperados[j].estado]; });
      const ms = s => `${Math.round(Math.abs(s)*1000)} ms`;
      let donde = '';
      if (!ok){
        const partes = [];
        if (primerMal >= 0){
          const e = cmp.esperados[primerMal], x = at[primerMal];
          partes.push(e.estado === 'falta' ? `Faltó tocar la ${R.nombre(p.ev[x.i])} que cae en ${R.describirPos(p, x.t, true)}.` : `La ${R.nombre(p.ev[x.i])} que cae en ${R.describirPos(p, x.t, true)} llegó ${ms(e.dif)} ${e.dif > 0 ? 'tarde' : 'antes de tiempo'}.`);
        }
        if (enSilencio) partes.push(`Tocaste ${enSilencio === 1 ? 'una vez' : enSilencio + ' veces'} en un silencio: el silencio se cuenta, pero no se toca.`);
        if (enLarga) partes.push(`Tocaste de más durante una nota larga o ligada: se toca una sola vez y se mantiene.`);
        if (!partes.length) partes.push(`Algunas notas quedaron cerca pero no del todo a tiempo. Contá en voz alta y probá otra vez.`);
        donde = partes.join(' ');
      }
      const lt = document.createElement('div');
      V.lineaTiempo(lt, {total: R.largo(p)*r.spu, esperados: cmp.esperados, golpes: cmp.golpes,
        pulsos: Array.from({length: Math.round(R.largo(p)/c.pulso)}, (x, k) => (k*c.pulso + (p.anacrusa ? (p.anacrusa % c.pulso) : 0))*r.spu),
        barras: R.barras(p).map(t => t*r.spu)});
      return {ok, diag, habs: [['r-tocar', ok], ...(enSilencio ? [['r-silencios', false]] : []), ...(enLarga ? [['r-puntillo', false]] : [])],
        tu: `${aTiempo} de ${n} ${n === 1 ? 'nota' : 'notas'} a tiempo${cmp.faltan ? `, ${cmp.faltan} sin tocar` : ''}${cmp.extras ? `, ${M.plural(cmp.extras, 'toque')} de más` : ''}`,
        correcta: `${n} ${n === 1 ? 'nota' : 'notas'} a tiempo, sin toques de más`,
        explicacion: `<div class="lt-box">${lt.innerHTML}</div><p>Cada círculo de arriba es una nota escrita; los puntos de abajo son tus toques. Un toque cuenta «a tiempo» si cae a menos de ${ms(cmp.tol)} de la nota.${Math.abs(cmp.corr) > 0.04 ? ` Tus toques llegaron en promedio ${ms(cmp.corr)} ${cmp.corr > 0 ? 'tarde' : 'antes'}; eso se descontó, porque puede deberse a la demora del audio o de los auriculares.` : ''}</p>`,
        donde,
        acciones: [['▶ Escuchar cómo suena', () => V.tocarRitmo(p, {bpm, metronomo: true, vista})]],
        alMostrar(el){ vista = V.ritmo(el, p, {colores, conteo: true}); }};
    };
    if (!o.reintento) q.parecido = () => E.generar('r-tocar', Object.assign({}, o, {patron: p, reintento: true}));
    else q.parecido = () => E.generar('r-tocar', Object.assign({}, o, {patron: null, reintento: false}));
    return q;
  }});
})();
