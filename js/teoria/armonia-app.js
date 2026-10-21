// Sección «Armonía»: recorrido de lecciones, desafíos progresivos en el editor a cuatro
// voces (enlaces, inversiones, corregir errores, cadencias, bajos cifrados y sin cifrar,
// melodías, dominante séptima), editor libre y progreso.
(function(){
  const M = window.Musica, A = window.Armonia, ED = window.ArmoniaEditor, P = window.Progreso, L = window.Lecciones;
  const {azar, entre} = M;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const boton = (texto, cls, fn) => { const b = h('button', 'btn ' + (cls || 'secondary'), texto); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch(e){ return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const ac = (g, inv = 0, sept = false) => ({g, inv, sept});

  // ---------- Progreso propio del módulo ----------
  const prog = Object.assign({niveles: {}, reglas: {}, vista: 'recorrido'}, leer('armonia-progreso', {}));
  const guardarProg = () => guardar('armonia-progreso', prog);
  const nivelProg = id => prog.niveles[id] || (prog.niveles[id] = {resueltos: 0, intentos: 0, sinAyuda: 0});
  // Qué habilidad del aula refleja cada regla
  const HAB_REGLA = r => /paralelas|contrarias|desiguales/.test(r) ? 'h-paralelas' : /^sin-|^dup-/.test(r) ? 'h-duplicacion' : /sensible|septima/.test(r) ? 'h-resolucion' : /cruce|espaciado|registro/.test(r) ? 'h-satb' : /cifrado|no-diatonico|ajena/.test(r) ? 'h-acordes' : 'h-reglas';

  const tonalidad = (modos = ['mayor'], max = 2) => azar(A.TONALIDADES.filter(K => modos.includes(K.modo) && Math.abs(K.arm) <= max));
  const SOLO_B = c => ({B: !!c.B});

  // ======================================================================
  // Niveles de desafío
  // ======================================================================
  // Cada generador devuelve {K, cols, fijas, cifrado, mostrarCifrado, objetivo, solucion, cadencia?, final?}
  const NIVELES = [
    {id: 'enlace', titulo: 'Enlaces de dos acordes', nivel: 1,
     desc: 'Primer acorde escrito y bajo del segundo: completá soprano, contralto y tenor. Acordes en estado fundamental.',
     gen(){
       const K = tonalidad();
       const [g1, g2] = azar([[0, 3], [0, 4], [3, 4], [4, 0], [1, 4], [5, 1], [3, 0], [4, 5], [0, 5], [5, 3]]);
       const p = [ac(g1), ac(g2)];
       const r = A.realizar(K, p, [], {azar: 6});
       const mf = A.movimientoFund(g1, g2);
       const consejo = mf === 'quinta' ? 'Las fundamentales están a una cuarta o una quinta: hay una <b>nota común</b>. Probá mantenerla en la misma voz y mover las otras dos a la nota más cercana.'
         : mf === 'tercera' ? 'Las fundamentales están a una tercera: hay <b>dos notas comunes</b>. Mantenelas y mové solo una voz.'
         : 'Las fundamentales están a una segunda: no hay notas comunes. Mové las tres voces superiores en <b>dirección contraria al bajo</b>, a las notas más cercanas.';
       return {K, prog: p, cols: [r.cols[0], {S: null, A: null, T: null, B: r.cols[1].B}], fijas: [{S: true, A: true, T: true, B: true}, {B: true}],
               cifrado: p, mostrarCifrado: true, solucion: r.cols, objetivo: `Enlazá <b>${A.romanoTexto(K, p[0])} → ${A.romanoTexto(K, p[1])}</b> en ${K.nombre}. ${consejo}`};
     }},
    {id: 'inversiones', titulo: 'Enlaces con inversiones', nivel: 2,
     desc: 'Acordes en primera inversión (I⁶, ii⁶, IV⁶, V⁶, vii°⁶) y el I⁶₄ cadencial, también en menor.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 2);
       const pares = K.modo === 'mayor'
         ? [[ac(0), ac(1, 1)], [ac(1, 1), ac(4)], [ac(3, 1), ac(4)], [ac(0), ac(4, 1)], [ac(4, 1), ac(0)], [ac(0, 1), ac(3)], [ac(6, 1), ac(0)], [ac(0, 2), ac(4)], [ac(3), ac(0, 2)]]
         : [[ac(0), ac(3, 1)], [ac(3, 1), ac(4)], [ac(4, 1), ac(0)], [ac(6, 1), ac(0)], [ac(0, 2), ac(4)], [ac(0), ac(4, 1)]];
       const p = azar(pares);
       const r = A.realizar(K, p, [], {azar: 6});
       return {K, prog: p, cols: [r.cols[0], {S: null, A: null, T: null, B: r.cols[1].B}], fijas: [{S: true, A: true, T: true, B: true}, {B: true}],
               cifrado: p, mostrarCifrado: true, solucion: r.cols,
               objetivo: `Enlazá <b>${A.romanoTexto(K, p[0])} → ${A.romanoTexto(K, p[1])}</b> en ${K.nombre}. En primera inversión no dupliques la sensible; en el I⁶₄ cadencial, duplicá el bajo.`};
     }},
    {id: 'corregir', titulo: 'Encontrar y corregir errores', nivel: 3,
     desc: 'Una progresión con errores de conducción: identificalos, entendé por qué ocurren y corregilos.',
     gen(){
       for (;;){
         const K = tonalidad(['mayor', 'menor'], 2);
         const p = A.generarProgresion(4, 'autentica');
         const r = A.realizar(K, p, [], {azar: 5});
         const e1 = A.conError(K, p, r.cols, ['paralelas-5', 'paralelas-8', 'dup-sensible', 'sensible', 'cruce', 'espaciado']);
         if (!e1) continue;
         return {K, prog: p, cols: e1.cols, fijas: p.map(() => ({B: true})), cifrado: p, mostrarCifrado: true, solucion: r.cols,
                 objetivo: `Esta realización de <b>${p.map(c => A.romanoTexto(K, c)).join(' – ')}</b> en ${K.nombre} tiene un error de conducción marcado en rojo. Tocalo en la lista para ver por qué ocurre, escuchalo y corregilo moviendo las voces superiores (el bajo está dado).`};
       }
     }},
    {id: 'cadencias', titulo: 'Cadencias', nivel: 4,
     desc: 'Completá el final de una frase con la cadencia pedida: auténtica, plagal, semicadencia o rota.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 2);
       const tipoC = azar(['autentica', 'autentica', 'plagal', 'semicadencia', 'rota']);
       const p = A.generarProgresion(4, tipoC);
       const r = A.realizar(K, p, [], {azar: 5, finTonica: tipoC === 'autentica'});
       const nombre = {autentica: 'cadencia auténtica', plagal: 'cadencia plagal', semicadencia: 'semicadencia', rota: 'cadencia rota'}[tipoC];
       return {K, prog: p, cols: r.cols.map((c, i) => i < 2 ? c : {S: null, A: null, T: null, B: c.B}), fijas: p.map((c, i) => i < 2 ? {S: true, A: true, T: true, B: true} : {B: true}),
               cifrado: p, mostrarCifrado: true, solucion: r.cols, cadencia: tipoC,
               objetivo: `Completá los dos últimos acordes para formar una <b>${nombre}</b> (${A.romanoTexto(K, p[2])} → ${A.romanoTexto(K, p[3])}) en ${K.nombre}.${tipoC === 'autentica' ? ' Llevá la sensible a la tónica; si podés, terminá con la tónica en el soprano (cadencia perfecta).' : tipoC === 'rota' ? ' En V → vi, la sensible sube a la tónica y lo habitual es duplicar la tercera del vi.' : ''}`};
     }},
    {id: 'bajo-cifrado', titulo: 'Armonizar un bajo cifrado', nivel: 5,
     desc: 'Un bajo de 5 o 6 acordes con su cifrado: escribí las tres voces superiores.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 2);
       const p = A.conInversiones(A.generarProgresion(entre(5, 6), 'autentica'), 0.4);
       const r = A.realizar(K, p, [], {azar: 4, finTonica: true});
       return {K, prog: p, cols: r.cols.map((c, i) => i === 0 ? c : {S: null, A: null, T: null, B: c.B}), fijas: p.map((c, i) => i === 0 ? {S: true, A: true, T: true, B: true} : {B: true}),
               cifrado: p, mostrarCifrado: true, solucion: r.cols, final: true,
               objetivo: `Armonizá el bajo cifrado en ${K.nombre}. Método: primero escribí una línea de soprano que se mueva sobre todo por grado y en lo posible en dirección contraria al bajo; después completá contralto y tenor con las notas que falten, buscando la nota más cercana.`};
     }},
    {id: 'bajo', titulo: 'Armonizar un bajo sin cifrar', nivel: 6,
     desc: 'Solo el bajo: elegí los acordes (el bajo puede ser fundamental o tercera) y realizalos.',
     gen(){
       const K = tonalidad(['mayor'], 2);
       const p = A.conInversiones(A.generarProgresion(entre(5, 6), 'autentica'), 0.3);
       const r = A.realizar(K, p, [], {azar: 4, finTonica: true});
       return {K, prog: p, cols: r.cols.map(c => ({S: null, A: null, T: null, B: c.B})), fijas: p.map(() => ({B: true})),
               cifrado: null, mostrarCifrado: false, solucion: r.cols, final: true,
               objetivo: `Armonizá este bajo en ${K.nombre}. Para cada nota del bajo pensá qué acordes la contienen como fundamental (estado fundamental) o como tercera (primera inversión), elegí progresiones habituales (hacia la dominante y de la dominante a la tónica) y terminá con una cadencia auténtica. El numeral que formás aparece debajo del pentagrama.`};
     }},
    {id: 'melodia', titulo: 'Armonizar una melodía', nivel: 7,
     desc: 'La melodía del soprano está dada: elegí los acordes, escribí el bajo y completá las voces interiores.',
     gen(){
       const K = tonalidad(['mayor'], 2);
       const p = A.generarProgresion(entre(4, 5), 'autentica');
       const r = A.realizar(K, p, [], {azar: 4, finTonica: true});
       return {K, prog: p, cols: r.cols.map(c => ({S: c.S, A: null, T: null, B: null})), fijas: p.map(() => ({S: true})),
               cifrado: null, mostrarCifrado: false, solucion: r.cols, final: true,
               objetivo: `Armonizá la melodía en ${K.nombre}. Método: 1) empezá por la cadencia final (V → I); 2) para cada nota, elegí un acorde que la contenga; 3) escribí un bajo que se mueva en lo posible en dirección contraria a la melodía; 4) completá contralto y tenor.`};
     }},
    {id: 'septima', titulo: 'La dominante con séptima', nivel: 8,
     desc: 'Enlaces con V⁷: la séptima baja por grado y la sensible sube a la tónica.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 2);
       const p = azar([[ac(0), ac(3), ac(4, 0, true), ac(0)], [ac(0), ac(1, 1), ac(4, 0, true), ac(0)], [ac(0), ac(4, 0, true), ac(5)], [ac(0), ac(5), ac(1), ac(4, 0, true), ac(0)]])
         .map(c => K.modo === 'menor' && c.g === 1 ? Object.assign({}, c, {g: 3}) : c);
       const r = A.realizar(K, p, [], {azar: 4, finTonica: p[p.length - 1].g === 0});
       return {K, prog: p, cols: r.cols.map((c, i) => i === 0 ? c : {S: null, A: null, T: null, B: c.B}), fijas: p.map((c, i) => i === 0 ? {S: true, A: true, T: true, B: true} : {B: true}),
               cifrado: p, mostrarCifrado: true, solucion: r.cols,
               objetivo: `Realizá <b>${p.map(c => A.romanoTexto(K, c)).join(' – ')}</b> en ${K.nombre}. En el V⁷ la séptima resuelve bajando un grado y la sensible sube a la tónica; por eso el acorde de tónica que sigue suele quedar sin quinta (con la fundamental triplicada), o el V⁷ se escribe sin quinta.`};
     }}
    ,
    {id: 'tocar', titulo: 'Tocar progresiones', nivel: 9,
     desc: 'Con un teclado MIDI (o con el mouse): tocá cada acorde a cuatro voces y mirá el análisis de cada enlace al instante.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 2);
       const lista = K.modo === 'mayor'
         ? [[ac(0), ac(4), ac(0)], [ac(0), ac(3), ac(4), ac(0)], [ac(0), ac(5), ac(1), ac(4), ac(0)], [ac(0), ac(1, 1), ac(4, 0, true), ac(0)], [ac(0), ac(3), ac(0, 2), ac(4), ac(0)]]
         : [[ac(0), ac(4), ac(0)], [ac(0), ac(3), ac(4), ac(0)], [ac(0), ac(3, 1), ac(4)], [ac(0), ac(5), ac(3), ac(4, 0, true), ac(0)]];
       const p = azar(lista);
       const r = A.realizar(K, p, [], {azar: 3, finTonica: p[p.length - 1].g === 0});
       return {K, prog: p, cols: p.map(() => ({S: null, A: null, T: null, B: null})), fijas: p.map(() => ({})), cifrado: p, mostrarCifrado: true, solucion: r.cols,
               objetivo: `Tocá <b>${p.map(c => A.romanoTexto(K, c)).join(' – ')}</b> en ${K.nombre}, un acorde por vez, con cuatro notas (bajo con la mano izquierda, tres voces con la derecha). Cada acorde se escribe al soltar las teclas y el cursor pasa al siguiente. Sin teclado MIDI, escribilo con el mouse.`};
     }},
    {id: 'secundarias', titulo: 'Dominantes secundarias', nivel: 10,
     desc: 'Bajos cifrados con V/x, V⁷/x y vii°⁷/x: la sensible secundaria sube y la séptima baja.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 2);
       const sec = (base, de, inv = 0) => ({esp: 'sec', base, de, inv});
       const lista = K.modo === 'mayor'
         ? [[ac(0), sec('V7', 4), ac(4), ac(0)], [ac(0), sec('V', 5), ac(5), ac(1), ac(4), ac(0)], [ac(0), sec('V7', 3), ac(3), ac(4), ac(0)], [ac(0), sec('vii7', 4), ac(4), ac(0)], [ac(0), sec('V7', 1), ac(1), ac(4, 0, true), ac(0)], [ac(0), ac(1, 1), sec('V7', 4, 1), ac(4), ac(0)]]
         : [[ac(0), sec('V7', 2), ac(2), ac(3), ac(4), ac(0)], [ac(0), sec('V7', 3), ac(3), ac(4), ac(0)], [ac(0), sec('vii7', 4), ac(4), ac(0)]];
       const p = azar(lista);
       const r = A.realizar(K, p, [], {azar: 3, finTonica: true});
       return {K, prog: p, cols: r.cols.map((c, i) => i === 0 ? c : {S: null, A: null, T: null, B: c.B}), fijas: p.map((c, i) => i === 0 ? {S: true, A: true, T: true, B: true} : {B: true}),
               cifrado: p, mostrarCifrado: true, solucion: r.cols,
               objetivo: `Realizá <b>${p.map(c => A.romanoTexto(K, c)).join(' – ')}</b> en ${K.nombre}. Una dominante secundaria es el V (o el vii°) de otro grado: su tercera es la sensible de ese grado y sube medio tono; su séptima baja. Evitá la falsa relación: la alteración cromática conviene que aparezca en la misma voz que tenía la nota natural.`};
     }},
    {id: 'cromaticos', titulo: 'Napolitana y sextas aumentadas', nivel: 11,
     desc: 'Acordes alterados de subdominante que llevan con fuerza al V: N⁶, It⁺⁶, Fr⁺⁶ y Al⁺⁶.',
     gen(){
       const K = tonalidad(['mayor', 'menor'], 1);
       const lista = K.modo === 'mayor'
         ? [[ac(0), ac(3), {esp: 'N', inv: 1}, ac(4), ac(0)], [ac(0), ac(5), {esp: 'It', inv: 0}, ac(4), ac(0)], [ac(0), ac(5), {esp: 'Fr', inv: 0}, ac(4), ac(0)], [ac(0), ac(5), {esp: 'Al', inv: 0}, ac(0, 2), ac(4), ac(0)]]
         : [[ac(0), {esp: 'N', inv: 1}, ac(4), ac(0)], [ac(0), ac(3), {esp: 'It', inv: 0}, ac(4), ac(0)], [ac(0), ac(3), {esp: 'Fr', inv: 0}, ac(4), ac(0)], [ac(0), ac(5), {esp: 'Al', inv: 0}, ac(0, 2), ac(4), ac(0)]];
       const p = azar(lista);
       const r = A.realizar(K, p, [], {azar: 2, finTonica: true});
       return {K, prog: p, cols: r.cols.map((c, i) => i === 0 ? c : {S: null, A: null, T: null, B: c.B}), fijas: p.map((c, i) => i === 0 ? {S: true, A: true, T: true, B: true} : {B: true}),
               cifrado: p, mostrarCifrado: true, solucion: r.cols,
               objetivo: `Realizá <b>${p.map(c => A.romanoTexto(K, c)).join(' – ')}</b> en ${K.nombre}. En la napolitana se duplica la tercera (el bajo) y el ♭2 baja a la sensible. En las sextas aumentadas, el ♭6 (bajo) baja y el ♯4 sube: los dos se abren a la octava de la dominante.`};
     }}
  ];
  const NIVEL = Object.fromEntries(NIVELES.map(n => [n.id, n]));

  // Verifica un desafío: completo, acordes reconocibles, sin errores y con la cadencia pedida
  function verificar(ej, an){
    const motivos = [];
    if (!an.completos) motivos.push('Faltan notas: cada acorde necesita las cuatro voces.');
    an.ids.forEach((id, i) => { if (id && an.acordes[i].lleno && id.ajenas.length) motivos.push(`El acorde ${i + 1} tiene notas que no forman un acorde de ${ej.K.nombre}.`); });
    if (an.errores) motivos.push(`Hay ${M.plural(an.errores, 'error', 'errores')} de conducción (en rojo).`);
    if (an.completos && ej.cadencia && (!an.cadencia || an.cadencia.id !== ej.cadencia)) motivos.push(`La progresión no termina con la cadencia pedida${an.cadencia ? ` (formaste una ${an.cadencia.nombre.toLowerCase()})` : ''}.`);
    if (an.completos && ej.final){
      const n = an.ids.length, u = an.ids[n - 1], pu = an.ids[n - 2];
      if (!u || u.acorde.g !== 0 || u.acorde.inv !== 0) motivos.push('Una frase conclusiva termina en el acorde de tónica en estado fundamental.');
      else if (!pu || ![4, 6].includes(pu.acorde.g)) motivos.push('Para cerrar con una cadencia auténtica, el penúltimo acorde tiene que ser de dominante (V o vii°).');
    }
    return motivos;
  }

  // ======================================================================
  // Corredor de desafíos (también se usa dentro de las lecciones)
  // ======================================================================
  function desafio(el, nivelId, op = {}){
    const nivel = NIVEL[nivelId];
    let ej = null, ed = null, ayudas = 0, resuelto = false;
    el.innerHTML = '';
    if (window.Midi) Midi.panel(el);
    const caja = h('div', 'ar-desafio'); el.appendChild(caja);
    function nuevo(){
      ej = nivel.gen(); ayudas = 0; resuelto = false;
      caja.innerHTML = '';
      caja.appendChild(h('p', 'ar-obj', ej.objetivo));
      const zona = h('div'); caja.appendChild(zona);
      ed = ED.crear(zona, {K: ej.K, cols: ej.cols, fijas: ej.fijas, cifrado: ej.cifrado, mostrarCifrado: ej.mostrarCifrado,
        onCambio: () => { res.innerHTML = ''; }, alIngresar: (c, an) => alTocar(c, an)});
      const acc = h('div', 'fb-acc ar-acc');
      acc.append(boton('Comprobar', 'primary', comprobar), boton('Pista', 'secondary', pista), boton('Ver una solución', 'secondary', solucion), boton('Otro ejercicio', 'mini', nuevo));
      caja.appendChild(acc);
      const res = h('div', 'ar-res'); res.setAttribute('aria-live', 'polite'); caja.appendChild(res);
      const sol = h('div', 'ar-sol'); caja.appendChild(sol);
      caja._res = res; caja._sol = sol;
    }
    // Modo guiado con el teclado: al ingresar cada acorde, se evalúa enseguida su enlace con el
    // anterior y se propone una alternativa (la nota de la solución de referencia), sin bloquear.
    function alTocar(c, an){
      const res = caja._res; res.innerHTML = '';
      const ps = an.problemas.filter(p => p.cols.includes(c) && p.sev !== 'info');
      const id = an.ids[c];
      const nom = id && an.acordes[c].lleno && !id.ajenas.length ? A.romano(ej.K, id.acorde) : '?';
      if (!ps.length){ res.appendChild(h('div', 'ar-pista', `✓ Acorde ${c + 1} (${nom}): sin problemas${c > 0 ? ' en el enlace con el anterior' : ''}.`)); return; }
      const ul = h('ul', 'ar-motivos');
      ps.forEach(p => {
        const d = A.describir(ej.K, p);
        const sol = ej.solucion && ej.solucion[c];
        const alt = sol && p.voces.length ? p.voces.filter(v => ed.cols()[c][v] && sol[v] && M.midi(sol[v]) !== M.midi(ed.cols()[c][v])).map(v => `${A.NOMBRE_VOZ[v]} a ${M.corto(sol[v], {oct: true})}`).join(', ') : '';
        ul.appendChild(h('li', null, `<b>${d.titulo}</b> (${d.donde}${d.det ? ', ' + d.det : ''}). ${d.porque} <i>${d.como}</i>${alt ? ` Una alternativa: ${alt}.` : ''}`));
      });
      res.appendChild(h('div', 'fb-cab bad', `<strong>Acorde ${c + 1} (${nom})</strong>`));
      res.appendChild(ul);
      res.appendChild(h('p', 'stats-note', 'Podés seguir tocando: es solo una observación. Para corregir, elegí el acorde con ← → y volvé a tocarlo.'));
    }
    function comprobar(){
      const an = ed.analisis(), res = caja._res;
      const motivos = verificar(ej, an);
      const np = nivelProg(nivelId);
      np.intentos++;
      an.problemas.filter(p => p.sev === 'error').forEach(p => { prog.reglas[p.regla] = (prog.reglas[p.regla] || 0) + 1; P.registrar(HAB_REGLA(p.regla), false); });
      res.innerHTML = '';
      if (!motivos.length){
        if (!resuelto){
          resuelto = true; np.resueltos++; if (!ayudas) np.sinAyuda++;
          P.registrar(nivelId === 'cadencias' ? 'h-cadencias' : /bajo|melodia/.test(nivelId) ? 'h-armonizar' : 'h-enlace', true);
          ['h-paralelas', 'h-duplicacion', 'h-satb'].forEach(x => P.registrar(x, true, 0.5));
        }
        const obs = an.problemas.filter(p => p.sev === 'aviso');
        res.appendChild(h('div', 'fb-cab ok', `<strong>¡Resuelto!</strong> ${an.cadencia ? an.cadencia.nombre + '.' : ''}`));
        res.appendChild(h('p', null, obs.length ? `La conducción es válida. Hay ${M.plural(obs.length, 'observación', 'observaciones')} de estilo (en naranja): no son errores, pero mirá si podés mejorarlas.` : 'La conducción es correcta. Recordá que hay más de una solución válida: compará con la de «Ver una solución».'));
        const acc = h('div', 'fb-acc');
        acc.append(boton('▶ Escuchar', 'secondary', () => ed.tocarTodo()), boton('Otro ejercicio', 'primary', nuevo));
        res.appendChild(acc);
        guardarProg();
        if (op.alResolver) op.alResolver();
      } else {
        res.appendChild(h('div', 'fb-cab bad', '<strong>Todavía no</strong>'));
        res.appendChild(h('ul', 'ar-motivos', motivos.map(m => `<li>${m}</li>`).join('')));
        const err = an.problemas.find(p => p.sev === 'error');
        if (err){ ed.enfocar(err); res.appendChild(h('p', 'stats-note', 'Resalté el primer problema en el pentagrama; en la lista de abajo está la explicación.')); }
        guardarProg();
      }
    }
    // Pista: compara con una solución que respeta las voces dadas y las notas que ya están bien
    function pista(){
      ayudas++;
      const res = caja._res;
      const cols = ed.cols();
      const an = ed.analisis();
      const err = an.problemas.find(p => p.sev === 'error');
      res.innerHTML = '';
      if (err){
        const d = A.describir(ej.K, err);
        ed.enfocar(err);
        res.appendChild(h('div', 'ar-pista', `<b>Pista:</b> ${d.titulo.toLowerCase()} en ${d.donde}${d.det ? ` (${d.det})` : ''}. ${d.como}`));
        return;
      }
      const sol = ej.solucion;
      for (let i = 0; i < cols.length; i++) for (const v of ['S', 'A', 'T', 'B']){
        if (ej.fijas[i] && ej.fijas[i][v]) continue;
        if (!cols[i][v]){
          // proponer la nota de la solución si encaja con lo que ya escribió
          const n = sol[i][v];
          res.appendChild(h('div', 'ar-pista', `<b>Pista:</b> en el acorde ${i + 1}, el ${A.NOMBRE_VOZ[v]} puede ir a <b>${M.corto(n, {oct: true})}</b> (${A.romanoTexto(ej.K, ej.prog[i])}: ${A.notasAcorde(ej.K, ej.prog[i]).map(x => M.corto(x)).join(', ')}).`));
          ed.seleccionar(i, v);
          return;
        }
      }
      res.appendChild(h('div', 'ar-pista', '<b>Pista:</b> no veo errores. Tocá «Comprobar».'));
    }
    function solucion(){
      ayudas++;
      const s = caja._sol; s.innerHTML = '';
      s.appendChild(h('p', 'ar-obj', '<b>Una solución posible</b> (no la única). Compará cómo se mueve cada voz con tu versión.'));
      const z = h('div'); s.appendChild(z);
      const ref = ED.crear(z, {K: ej.K, cols: ej.solucion, soloLectura: true, cifrado: ej.cifrado, mostrarCifrado: ej.mostrarCifrado});
      comparar(s, ref);
      s.appendChild(boton('Copiar esta solución en mi pentagrama', 'mini', () => { ed.set(ej.solucion); s.innerHTML = ''; }));
    }
    // Comparación voz por voz entre mi solución y la de referencia
    function comparar(s, ref){
      const mia = ed.cols(), sol = ej.solucion;
      const mov = (a, b) => { if (!a || !b) return '—'; if (M.midi(a) === M.midi(b)) return '='; const iv = M.intervalo(a, b); return `${M.midi(b) > M.midi(a) ? '↑' : '↓'} ${M.ORDINAL[iv.simple]}${iv.cal ? ' ' + iv.cal : ''}`; };
      const t = h('table', 'ae-tabla ar-comp');
      let html = '<thead><tr><th>Voz</th>' + sol.slice(1).map((_, i) => `<th>${i + 1}→${i + 2}<br><small>mía · ref.</small></th>`).join('') + '<th>Escuchar</th></tr></thead><tbody>';
      A.VOCES.forEach(v => {
        html += `<tr><td>${A.NOMBRE_VOZ_M[v]}</td>` + sol.slice(1).map((_, i) => { const a = mov(mia[i][v], mia[i + 1][v]), b = mov(sol[i][v], sol[i + 1][v]); return `<td class="${a === b ? '' : 'dif'}">${a} · ${b}</td>`; }).join('') + `<td><button type="button" class="btn ae-ic" data-v="${v}" data-q="m">mía</button> <button type="button" class="btn ae-ic" data-v="${v}" data-q="r">ref.</button></td></tr>`;
      });
      t.innerHTML = html + '</tbody>';
      t.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => (b.dataset.q === 'm' ? ed : ref).tocarTodo(0, sol.length, [b.dataset.v])));
      s.appendChild(h('p', 'ar-obj', '<b>Comparación:</b> cómo se mueve cada voz en tu versión y en la de referencia (las diferencias, resaltadas). Las dos pueden ser correctas.'));
      const w = h('div', 'grid-wrap'); w.appendChild(t); s.appendChild(w);
      const acc = h('div', 'lz-botones');
      acc.append(boton('▶ Mi solución', 'secondary', () => ed.tocarTodo()), boton('▶ Referencia', 'secondary', () => ref.tocarTodo()),
        boton('▶ Alternar acorde por acorde', 'secondary', () => {
          Sonido.parar(); const t0 = Sonido.ahora() + 0.08;
          sol.forEach((c, i) => { [mia[i], c].forEach((col, k) => A.VOCES.forEach(v => { if (col[v]) Sonido.nota(M.midi(col[v]), t0 + (2*i + k)*1.0, 0.9); })); });
        }));
      s.appendChild(acc);
    }
    nuevo();
  }

  // ======================================================================
  // Sección
  // ======================================================================
  const VISTAS = [['recorrido', 'Recorrido'], ['desafios', 'Desafíos'], ['editor', 'Editor libre'], ['progreso', 'Progreso']];
  let raiz = null;
  function mostrar(el, vista){
    raiz = el;
    if (vista) prog.vista = vista;
    el.innerHTML = '';
    const tabs = h('div', 'tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Armonía');
    VISTAS.forEach(([id, t]) => {
      const b = h('button', null, t); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(prog.vista === id));
      b.addEventListener('click', () => { prog.vista = id; guardarProg(); Sonido.parar(); mostrar(el); });
      tabs.appendChild(b);
    });
    el.appendChild(tabs);
    const cuerpo = h('div'); el.appendChild(cuerpo);
    ({recorrido, desafios, editor: editorLibre, progreso: verProgreso}[prog.vista] || recorrido)(cuerpo);
  }

  function recorrido(el){
    el.appendChild(h('p', 'lede', 'Armonía tonal y conducción de voces a cuatro partes, tomando como referencia los principios de <i>Harmony</i> de Walter Piston. Se aprende haciendo: cada lección explica el razonamiento, lo muestra con ejemplos que se escuchan y lo practica en el editor.'));
    const u = L.unidades.find(x => x.id === 'armonia');
    if (!u) return;
    const hechas = u.lecciones.filter(l => P.leccionHecha(l.id)).length;
    const sig = u.lecciones.find(l => !P.leccionHecha(l.id));
    const c = h('div', 'continuar');
    c.innerHTML = `<p class="kicker">${hechas}/${u.lecciones.length} lecciones</p><h2>${sig ? sig.titulo : 'Recorrido completo'}</h2><p>${sig ? sig.resumen : 'Seguí con los desafíos de armonización.'}</p>`;
    c.appendChild(sig ? boton(hechas ? 'Continuar' : 'Empezar', 'primary', () => Aula.abrirLeccion(sig.id)) : boton('Ir a los desafíos', 'primary', () => mostrar(raiz, 'desafios')));
    el.appendChild(c);
    const ol = h('ol', 'lecs');
    u.lecciones.forEach(l => {
      const li = h('li'), hecha = P.leccionHecha(l.id);
      const b = h('button', 'lec' + (hecha ? ' hecha' : '') + (sig && sig.id === l.id ? ' actual' : ''), `<span class="lec-ic" aria-hidden="true">${hecha ? '✓' : ''}</span><span><b>${l.titulo}</b><small>${l.resumen}</small></span>`);
      b.type = 'button'; b.addEventListener('click', () => Aula.abrirLeccion(l.id));
      li.appendChild(b); ol.appendChild(li);
    });
    el.appendChild(ol);
    const rap = h('section', 'unidad');
    rap.appendChild(h('h2', null, 'Práctica rápida'));
    rap.appendChild(h('p', 'u-desc', 'Ejercicios de opción múltiple con explicación: reconocer acordes, funciones, duplicación, movimientos, errores y cadencias.'));
    const g = h('div', 'tipos');
    ['h-grado', 'h-funcion', 'h-duplicacion', 'h-movimiento', 'h-error', 'h-cadencia'].forEach(t => {
      const tp = window.Ejercicios.TIPOS[t];
      const d = h('div', 'tipo', `<b>${tp.nombre}</b>`);
      const a = h('div', 'tipo-acc'); a.appendChild(boton('Practicar', 'secondary', () => Aula.practicarTipo(t, {cantidad: 5})));
      d.appendChild(a); g.appendChild(d);
    });
    rap.appendChild(g);
    el.appendChild(rap);
  }

  function desafios(el, id){
    if (id){
      const n = NIVEL[id];
      el.appendChild(boton('← Todos los desafíos', 'mini', () => { Sonido.parar(); el.innerHTML = ''; desafios(el); }));
      el.appendChild(h('p', 'kicker', `Nivel ${n.nivel}`));
      el.appendChild(h('h2', 'lec-t', n.titulo));
      const z = h('div'); el.appendChild(z);
      desafio(z, id);
      return;
    }
    el.appendChild(h('p', 'lede', 'Desafíos en el editor, de menor a mayor dificultad. Se aceptan todas las soluciones que respeten la conducción: el análisis marca los errores (reglas generales) y, aparte, las observaciones de estilo.'));
    const g = h('div', 'ar-niveles');
    NIVELES.forEach(n => {
      const np = nivelProg(n.id);
      const c = h('div', 'tipo ar-nivel' + (np.resueltos ? ' hecho' : ''));
      c.innerHTML = `<p class="kicker">Nivel ${n.nivel}</p><b>${n.titulo}</b><small>${n.desc}</small><small class="ar-cuenta">${np.resueltos ? `${M.plural(np.resueltos, 'resuelto')}${np.sinAyuda ? `, ${np.sinAyuda} sin ayuda` : ''}` : 'Sin resolver todavía'}</small>`;
      const a = h('div', 'tipo-acc'); a.appendChild(boton(np.resueltos ? 'Otro' : 'Empezar', 'secondary', () => { el.innerHTML = ''; desafios(el, n.id); }));
      c.appendChild(a); g.appendChild(c);
    });
    el.appendChild(g);
  }

  const PRESETS = {
    'I–IV–V–I': [ac(0), ac(3), ac(4), ac(0)],
    'I–vi–ii–V–I': [ac(0), ac(5), ac(1), ac(4), ac(0)],
    'I–ii⁶–V⁷–I': [ac(0), ac(1, 1), ac(4, 0, true), ac(0)],
    'I–IV–I⁶₄–V–I': [ac(0), ac(3), ac(0, 2), ac(4), ac(0)],
    'I–IV–I (plagal)': [ac(0), ac(3), ac(0)],
    'I–IV–V–vi (rota)': [ac(0), ac(3), ac(4), ac(5)],
    'I–vi–IV–V (semicadencia)': [ac(0), ac(5), ac(3), ac(4)]
  };
  let libre = null;
  function editorLibre(el){
    el.appendChild(h('p', 'lede', 'Escribí lo que quieras y mirá el análisis en tiempo real: acorde, numeral, función, intervalos, movimientos y problemas de conducción. Podés partir de una progresión de ejemplo.'));
    if (!libre) libre = {K: A.tonalidad(0, 'mayor'), cols: A.realizar(A.tonalidad(0, 'mayor'), PRESETS['I–IV–V–I'], [], {finTonica: true}).cols};
    const barra = h('div', 'ar-barra');
    const sk = h('select'); sk.setAttribute('aria-label', 'Tonalidad');
    A.TONALIDADES.forEach(K => { const o = h('option', null, K.nombre); o.value = A.claveTon(K); if (A.claveTon(K) === A.claveTon(libre.K)) o.selected = true; sk.appendChild(o); });
    const sp = h('select'); sp.setAttribute('aria-label', 'Progresión de ejemplo');
    sp.appendChild(h('option', null, 'Cargar una progresión…'));
    Object.keys(PRESETS).forEach(k => { const o = h('option', null, k); o.value = k; sp.appendChild(o); });
    barra.append(h('label', null, 'Tonalidad '), sk, sp,
      boton('+ acorde', 'mini', () => { libre.cols = ed.cols(); libre.cols.push({S: null, A: null, T: null, B: null}); dibujar(); }),
      boton('− acorde', 'mini', () => { libre.cols = ed.cols(); if (libre.cols.length > 1) libre.cols.pop(); dibujar(); }),
      boton('Borrar voces superiores', 'mini', () => { libre.cols = ed.cols().map(c => ({S: null, A: null, T: null, B: c.B})); dibujar(); }));
    el.appendChild(barra);
    // grabar una progresión tocándola en el teclado MIDI
    if (window.Midi){
      Midi.panel(el);
      const g = h('div', 'lz-botones');
      const bg = boton('● Grabar con el teclado', 'secondary', () => {
        grabando = !grabando; bg.textContent = grabando ? '■ Detener la grabación' : '● Grabar con el teclado'; bg.classList.toggle('grabando', grabando);
        if (grabando){ libre.cols = [{S: null, A: null, T: null, B: null}]; dibujar(); }
      });
      g.append(bg, boton('Deshacer el último acorde', 'mini', () => ed.quitarColumna()));
      el.appendChild(g);
    }
    const z = h('div'); el.appendChild(z);
    let ed = null;
    let grabando = false;
    const dibujar = () => { ed = ED.crear(z, {K: libre.K, cols: libre.cols, onCambio: (an, cols) => { libre.cols = cols; }, grabar: () => grabando}); };
    sk.addEventListener('change', () => {
      const [arm, modo] = sk.value.split(':');
      libre.K = A.tonalidad(+arm, modo);
      const n = ed.cols().length;
      const base = Object.values(PRESETS).find(p => p.length === n) || PRESETS['I–IV–V–I'];
      libre.cols = (A.realizar(libre.K, base.map(c => libre.K.modo === 'menor' && c.g === 1 && c.inv === 0 ? ac(3) : c), [], {finTonica: true}) || {cols: libre.cols}).cols;
      dibujar();
    });
    sp.addEventListener('change', () => {
      const p = PRESETS[sp.value]; if (!p) return;
      const pp = libre.K.modo === 'menor' ? p.map(c => c.g === 1 && !c.inv ? ac(3) : c) : p;
      const r = A.realizar(libre.K, pp, [], {finTonica: true, azar: 2});
      if (r){ libre.cols = r.cols; dibujar(); }
      sp.selectedIndex = 0;
    });
    dibujar();
  }

  function verProgreso(el){
    el.appendChild(h('p', 'lede', 'Lo que ya resolviste y las reglas que más se te escapan. Cada habilidad lleva una distribución Beta de tu acierto, como en el resto del aula.'));
    const sec = h('section', 'unidad');
    sec.appendChild(h('h2', null, 'Desafíos'));
    sec.appendChild(h('div', null, NIVELES.map(n => { const np = nivelProg(n.id); const pct = Math.min(100, np.resueltos*100/3); return `<div class="brow ancha"><span class="lab">${n.nivel}. ${n.titulo}</span><div class="btrack"><span class="bfill" style="width:${pct}%"></span></div><span class="val">${np.resueltos}/3</span></div>`; }).join('')));
    sec.appendChild(h('p', 'stats-note', 'Con tres desafíos resueltos por nivel, el nivel cuenta como practicado.'));
    el.appendChild(sec);
    const habs = ['h-satb', 'h-acordes', 'h-duplicacion', 'h-movimiento', 'h-paralelas', 'h-reglas', 'h-resolucion', 'h-enlace', 'h-funciones', 'h-cadencias', 'h-armonizar'];
    const s2 = h('section', 'unidad'); s2.appendChild(h('h2', null, 'Habilidades'));
    s2.appendChild(h('div', null, habs.map(id => { const d = P.dominio(id); return `<div class="brow ancha"><span class="lab">${P.HABILIDADES[id].nombre}</span>${d.n ? `<div class="btrack"><span class="g" style="left:50%"></span><span class="brange" style="left:${Math.round(d.lo*100)}%;width:${Math.max(1, Math.round((d.hi - d.lo)*100))}%"></span><span class="bdot" style="left:${Math.round(d.media*100)}%;background:color-mix(in srgb, var(--ok) ${Math.round(d.media*100)}%, var(--bad))"></span></div><span class="val">${Math.round(d.media*100)}%</span>` : '<span class="dom-vacio">sin datos</span><span></span>'}</div>`; }).join('')));
    el.appendChild(s2);
    const s3 = h('section', 'unidad'); s3.appendChild(h('h2', null, 'Errores más frecuentes en los desafíos'));
    const top = Object.entries(prog.reglas).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!top.length) s3.appendChild(h('p', 'stats-note', 'Todavía no hay errores registrados.'));
    else {
      const max = top[0][1];
      top.forEach(([r, n]) => {
        const reg = A.REGLAS[r]; if (!reg) return;
        const d = h('div', 'ar-err', `<div class="brow ancha"><span class="lab">${reg.titulo}</span><div class="btrack"><span class="bfill" style="width:${n*100/max}%;background:var(--bad)"></span></div><span class="val">${n}</span></div><details><summary>Por qué se evita y cómo corregirlo</summary><p>${reg.porque}</p><p><b>Cómo corregirlo:</b> ${reg.como}</p></details>`);
        s3.appendChild(d);
      });
    }
    el.appendChild(s3);
  }

  window.ArmoniaApp = {mostrar, desafio, NIVELES};
})();
