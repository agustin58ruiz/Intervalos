// Ejercicios de opción múltiple de armonía, con el mismo contrato que ejercicios.js:
// reconocer acordes y su función, la duplicación, el tipo de movimiento, el error de
// conducción de un enlace y la cadencia. Al corregir se muestra el pentagrama analizado.
(function(){
  const M = window.Musica, E = window.Ejercicios, A = window.Armonia, ED = window.ArmoniaEditor, P = window.Progreso;
  const {azar, entre, mezclar} = M;
  const {op, resultado, tipo} = E;

  // Habilidades y diagnósticos de armonía (se suman a los del aula)
  Object.assign(P.HABILIDADES, {
    'h-satb':       {nombre: 'Voces y disposición',            leccion: 'h-satb',         paso: 0, ejercicio: 'h-duplicacion'},
    'h-acordes':    {nombre: 'Acordes e inversiones',          leccion: 'h-acordes',      paso: 0, ejercicio: 'h-grado'},
    'h-duplicacion':{nombre: 'Duplicación',                    leccion: 'h-duplicacion',  paso: 0, ejercicio: 'h-duplicacion'},
    'h-movimiento': {nombre: 'Tipos de movimiento',            leccion: 'h-movimiento',   paso: 0, ejercicio: 'h-movimiento'},
    'h-paralelas':  {nombre: 'Quintas y octavas paralelas',    leccion: 'h-paralelas',    paso: 0, ejercicio: 'h-error'},
    'h-reglas':     {nombre: 'Detectar errores de conducción', leccion: 'h-directas',     paso: 0, ejercicio: 'h-error'},
    'h-resolucion': {nombre: 'Sensible y séptima',             leccion: 'h-dominante',    paso: 0, ejercicio: 'h-error'},
    'h-enlace':     {nombre: 'Enlazar acordes',                leccion: 'h-enlace',       paso: 0, ejercicio: 'h-movimiento'},
    'h-funciones':  {nombre: 'Funciones tonales',              leccion: 'h-funciones',    paso: 0, ejercicio: 'h-funcion'},
    'h-cadencias':  {nombre: 'Cadencias',                      leccion: 'h-cadencias',    paso: 0, ejercicio: 'h-cadencia'},
    'h-armonizar':  {nombre: 'Armonizar bajos y melodías',     leccion: 'h-armonizar-bajo', paso: 0, ejercicio: 'h-cadencia'}
  });
  Object.assign(P.DIAGNOSTICOS, {
    'h-paralelas':  {hab: 'h-paralelas',  msg: 'Se te están escapando quintas u octavas paralelas. Repasemos por qué se evitan y cómo el movimiento contrario las previene.'},
    'h-reglas':     {hab: 'h-reglas',     msg: 'Te cuesta reconocer qué regla de conducción se rompe en un enlace. Repasemos la diferencia entre reglas generales y preferencias de estilo.'},
    'h-duplicacion':{hab: 'h-duplicacion',msg: 'La duplicación todavía no está firme. Repasemos qué nota conviene duplicar en cada posición del acorde, y por qué nunca la sensible.'},
    'h-resolucion': {hab: 'h-resolucion', msg: 'La resolución de la sensible y de la séptima te está costando. Repasemos hacia dónde tienden esas notas.'},
    'h-acordes':    {hab: 'h-acordes',    msg: 'Te cuesta nombrar los acordes con números romanos. Repasemos los acordes de la tonalidad y sus inversiones.'},
    'h-movimiento': {hab: 'h-movimiento', msg: 'Los tipos de movimiento se están mezclando. Repasemos la diferencia entre paralelo, similar, contrario y oblicuo.'},
    'h-funciones':  {hab: 'h-funciones',  msg: 'Las funciones tonales todavía no están claras. Repasemos tónica, subdominante y dominante.'},
    'h-cadencias':  {hab: 'h-cadencias',  msg: 'Las cadencias se están confundiendo. Repasemos cómo termina cada una.'}
  });

  const tonalidad = o => o.mayor ? A.TONALIDADES.filter(K => K.modo === 'mayor' && Math.abs(K.arm) <= 2)[entre(0, 4)] : azar(A.TONALIDADES.filter(K => Math.abs(K.arm) <= 3));
  const ver = (K, cols, o = {}) => el => ED.crear(el, Object.assign({K, cols, soloLectura: true, panel: false, sinCifra: true, sinMarcas: true}, o));
  const analizado = (K, cols, o = {}) => el => ED.crear(el, Object.assign({K, cols, soloLectura: true, panel: false}, o));
  const MIEMBRO = {F: 'la fundamental', '3': 'la tercera', '5': 'la quinta', '7': 'la séptima', '9': 'la novena'};

  // ---------- ¿Qué acorde es? ----------
  tipo('h-grado', {nombre: 'Nombrar acordes (numerales romanos)', hab: 'h-acordes', leccion: 'h-acordes', gen(o){
    const K = tonalidad(o);
    const g = azar([0, 1, 3, 4, 4, 5, 6, 0]);
    const inv = g === 6 ? 1 : (o.inversiones === false ? 0 : azar([0, 0, 1, 1, 2].filter(i => i < 2 || g === 0)));
    const c = {g, inv, sept: false};
    const r = A.realizar(K, [c], [], {azar: 4});
    const cand = [c, {g, inv: (inv + 1) % 2, sept: false}, {g: (g + 2) % 7, inv, sept: false}, {g: (g + 5) % 7, inv: 0, sept: false}, {g: (g + 4) % 7, inv: 0, sept: false}];
    const vistos = new Set(), opts = [];
    cand.forEach(x => { const k = `${x.g}:${x.inv}`; if (!vistos.has(k) && opts.length < 4 && !(x.g === 6 && x.inv === 0 && c.g !== 6)){ vistos.add(k); opts.push(x); } });
    const id = x => `${x.g}:${x.inv}`;
    const q = {modo: 'opciones', enunciado: `Tonalidad: <b>${K.nombre}</b>. ¿Qué acorde es? (Numeral romano y posición.)`,
      visual: ver(K, r.cols), escuchar(){ Sonido.acorde(A.VOCES.map(v => M.midi(r.cols[0][v]))); },
      opciones: mezclar(opts).map(x => op(id(x), A.romanoTexto(K, x))), correcta: id(c)};
    q.evaluar = resp => resultado(q, resp, ok => {
      const [rg, ri] = resp.split(':').map(Number);
      const ns = A.notasAcorde(K, c).map(x => M.corto(x));
      return {diag: ok ? null : 'h-acordes',
        explicacion: `<ol class="proc"><li><b>Juntar las notas:</b> las cuatro voces tienen ${[...new Set(A.VOCES.map(v => M.corto(r.cols[0][v])))].join(', ')}.</li><li><b>Ordenarlas por terceras:</b> ${ns.join(' – ')}. La fundamental es <b>${ns[0]}</b>, el ${['1.er','2.º','3.er','4.º','5.º','6.º','7.º'][g]} grado de ${K.nombre}: numeral <b>${A.romano(K, c, {sinCifra: true})}</b> (${A.nombreAcorde(K, c)}).</li><li><b>Mirar el bajo:</b> el bajo tiene ${M.corto(r.cols[0].B)}, que es ${MIEMBRO[A.MIEMBROS[inv]]}: ${A.INVERSION[inv]}${inv ? ` (cifrado ${A.CIFRA[false][inv].split('').join('/')})` : ''}.</li></ol>`,
        donde: ok ? '' : rg === g ? 'El grado está bien, pero la posición no: la inversión depende solo de qué nota del acorde está en el bajo.' : 'Para encontrar la fundamental, ordená las notas por terceras (como un muñeco de nieve): la de abajo es la fundamental, aunque no esté en el bajo.',
        alMostrar: analizado(K, r.cols)};
    });
    return q;
  }});

  // ---------- Función tonal ----------
  tipo('h-funcion', {nombre: 'Funciones tonales', hab: 'h-funciones', leccion: 'h-funciones', gen(o){
    const K = tonalidad(o);
    const g = azar([0, 1, 3, 4, 5, 6]);
    const c = {g, inv: 0, sept: false};
    const f = A.FUNCION[g];
    const r = A.realizar(K, [c], [], {azar: 4});
    const q = {modo: 'opciones', enunciado: `En ${K.nombre}, ¿qué función cumple el acorde de <b>${A.romanoTexto(K, c)}</b> (${A.nombreAcorde(K, c)})?`,
      visual: ver(K, r.cols), escuchar(){ Sonido.acorde(A.VOCES.map(v => M.midi(r.cols[0][v]))); },
      opciones: [op('T', 'Tónica (reposo)'), op('S', 'Subdominante (se aleja, prepara)'), op('D', 'Dominante (tensión, pide resolver)')], correcta: f};
    q.evaluar = resp => resultado(q, resp, ok => ({diag: ok ? null : 'h-funciones',
      explicacion: `<p>Los acordes se agrupan por lo que «hacen» en la frase:</p><ul><li><b>Tónica</b> (I, y también vi y iii): reposo, el punto de llegada.</li><li><b>Subdominante</b> (IV y ii): se aleja de la tónica y prepara la dominante.</li><li><b>Dominante</b> (V y vii°): tensión; contienen la sensible y piden resolver en la tónica.</li></ul><p>El ${A.romanoTexto(K, c)} tiene función de <b>${A.NOMBRE_FUNCION[f]}</b>.${g === 5 ? ' El vi comparte dos notas con el I: por eso puede reemplazarlo (como en la cadencia rota).' : g === 1 ? ' El ii comparte dos notas con el IV y lleva con naturalidad al V.' : g === 6 ? ' El vii° tiene la sensible y casi todas las notas del V⁷: funciona como una dominante.' : ''}</p>`,
      donde: ok ? '' : 'Pensá qué notas tiene el acorde: si tiene la sensible, es de dominante; si comparte notas con el IV, de subdominante; si comparte notas con el I, de tónica.'}));
    return q;
  }});

  // ---------- Duplicación ----------
  tipo('h-duplicacion', {nombre: 'Duplicación', hab: 'h-duplicacion', leccion: 'h-duplicacion', gen(o){
    for (;;){
      const K = tonalidad(o);
      const c = {g: azar([0, 3, 4, 1, 5]), inv: azar([0, 0, 1]), sept: false};
      const r = A.realizar(K, [c], [], {azar: 12});
      const id = A.identificar(K, r.cols[0]);
      const cnt = {}; A.VOCES.forEach(v => cnt[id.miembro[v]] = (cnt[id.miembro[v]] || 0) + 1);
      const dup = Object.keys(cnt).find(m => cnt[m] >= 2);
      if (!dup || cnt[dup] > 2) continue;
      const voces = A.VOCES.filter(v => id.miembro[v] === dup);
      const q = {modo: 'opciones', enunciado: `Tonalidad: ${K.nombre}. Este acorde es ${A.romanoTexto(K, c)}. ¿Qué nota del acorde está <b>duplicada</b>?`,
        visual: ver(K, r.cols), escuchar(){ Sonido.acorde(A.VOCES.map(v => M.midi(r.cols[0][v]))); },
        opciones: [op('F', 'La fundamental'), op('3', 'La tercera'), op('5', 'La quinta')], correcta: dup};
      q.evaluar = resp => resultado(q, resp, ok => ({diag: ok ? null : 'h-duplicacion', habs: [['h-duplicacion', ok], ['h-satb', ok]],
        explicacion: `<p>Las notas del ${A.romanoTexto(K, c)} son ${A.notasAcorde(K, c).map((x, i) => `${M.corto(x)} (${['fundamental', 'tercera', 'quinta'][i]})`).join(', ')}. Con cuatro voces y tres notas, una se repite: acá ${MIEMBRO[dup]} (${M.corto(r.cols[0][voces[0]])}) está en ${voces.map(v => A.NOMBRE_VOZ[v]).join(' y ')}.</p><p>${c.inv === 0 ? 'En estado fundamental lo más habitual es duplicar la fundamental; la quinta también se puede duplicar, y la tercera de un acorde mayor se evita.' : 'En primera inversión no hay una regla fija: se duplica la nota que permita la mejor conducción, salvo la sensible.'}</p>`,
        donde: ok ? '' : 'Nombrá la nota de cada voz y buscá cuál aparece dos veces (en cualquier octava).',
        alMostrar: analizado(K, r.cols, {resaltar: {voces}})}));
      return q;
    }
  }});

  // ---------- Tipo de movimiento ----------
  const NOM_MOV = {paralelo: 'Paralelo', similar: 'Similar (directo)', contrario: 'Contrario', oblicuo: 'Oblicuo'};
  tipo('h-movimiento', {nombre: 'Tipos de movimiento', hab: 'h-movimiento', leccion: 'h-movimiento', gen(o){
    for (let i = 0; i < 60; i++){
      const K = tonalidad(o);
      const prog = A.generarProgresion(4, 'autentica');
      const r = A.realizar(K, prog, [], {azar: 15});
      const c = entre(0, 2);
      const [x, y] = azar([['S','B'], ['S','B'], ['A','B'], ['S','A'], ['T','B'], ['S','T']]);
      const mov = A.movimiento(r.cols[c][y], r.cols[c][x], r.cols[c + 1][y], r.cols[c + 1][x]);
      if (mov === 'quieto') continue;
      if (mov === 'contrario' && Math.random() < 0.4) continue;   // que no sea siempre contrario
      const cols = r.cols.slice(c, c + 2);
      const q = {modo: 'opciones', enunciado: `¿Qué tipo de movimiento hacen el <b>${A.NOMBRE_VOZ[x]}</b> y el <b>${A.NOMBRE_VOZ[y]}</b> (resaltados) de un acorde al otro?`,
        visual: ver(K, cols, {resaltar: {voces: [x, y]}}), escuchar(){ ED.crear(document.createElement('div'), {K, cols, soloLectura: true, panel: false}).tocarTodo(0, 2, [x, y]); },
        opciones: Object.keys(NOM_MOV).map(k => op(k, NOM_MOV[k])), correcta: mov};
      const a1 = M.midi(cols[0][x]), a2 = M.midi(cols[1][x]), b1 = M.midi(cols[0][y]), b2 = M.midi(cols[1][y]);
      const dir = d => d > 0 ? 'sube' : d < 0 ? 'baja' : 'se queda';
      q.evaluar = resp => resultado(q, resp, ok => ({diag: ok ? null : 'h-movimiento',
        explicacion: `<p>El ${A.NOMBRE_VOZ[x]} ${dir(a2 - a1)} (${M.corto(cols[0][x])} → ${M.corto(cols[1][x])}) y el ${A.NOMBRE_VOZ[y]} ${dir(b2 - b1)} (${M.corto(cols[0][y])} → ${M.corto(cols[1][y])}).</p><ul><li><b>Contrario:</b> una sube y la otra baja.</li><li><b>Oblicuo:</b> una se queda y la otra se mueve.</li><li><b>Similar (directo):</b> las dos van en la misma dirección, cambiando el intervalo.</li><li><b>Paralelo:</b> las dos van en la misma dirección y mantienen el mismo intervalo.</li></ul><p>Acá: <b>${NOM_MOV[mov].toLowerCase()}</b>. ${mov === 'paralelo' ? 'Es el más «peligroso»: con quintas u octavas, se pierden voces.' : mov === 'contrario' ? 'Es el que más independiza las voces.' : ''}</p>`,
        donde: ok ? '' : (resp === 'paralelo' && mov === 'similar') || (resp === 'similar' && mov === 'paralelo') ? 'Las dos van en la misma dirección: fijate si el intervalo entre ellas se mantiene igual (paralelo) o cambia (similar).' : 'Mirá primero para dónde va cada voz (sube, baja o se queda).',
        alMostrar: analizado(K, cols, {resaltar: {voces: [x, y]}})}));
      return q;
    }
  }});

  // ---------- ¿Qué error tiene el enlace? ----------
  const ERRORES = {
    'paralelas-5': 'Quintas paralelas', 'paralelas-8': 'Octavas paralelas', 'dup-sensible': 'Sensible duplicada',
    'sensible': 'La sensible no resuelve', 'cruce': 'Cruce de voces', 'espaciado': 'Demasiada distancia entre voces', 'ninguno': 'Ningún error'
  };
  // Introduce un error cambiando una nota de una voz superior por otra nota del acorde
  A.conError = (K, prog, cols, buscados) => {
    for (let i = 0; i < 400; i++){
      const c = cols.map(x => Object.assign({}, x));
      const ci = entre(0, c.length - 1), v = azar(['S', 'A', 'T']);
      const notas = A.notasAcorde(K, prog[ci]);
      const n = azar(notas);
      const cand = {l: n.l, a: n.a, o: entre(3, 5)};
      if (M.midi(cand) < A.RANGO[v][0] - 2 || M.midi(cand) > A.RANGO[v][1] + 2) continue;
      c[ci] = Object.assign({}, c[ci], {[v]: cand});
      const an = A.analizar(K, c, {cifrado: prog});
      const errs = an.problemas.filter(p => p.sev === 'error');
      if (errs.length === 1 && buscados.includes(errs[0].regla) && !an.problemas.some(p => p.regla === 'registro')) return {cols: c, problema: errs[0]};
    }
    return null;
  };
  tipo('h-error', {nombre: 'Encontrar el error de conducción', hab: 'h-reglas', leccion: 'h-directas', gen(o){
    for (;;){
      const K = tonalidad(o);
      const pares = [[0, 3], [0, 4], [3, 4], [4, 0], [1, 4], [5, 1], [3, 0], [4, 5], [5, 3]];
      const [g1, g2] = azar(pares);
      const prog = [{g: g1, inv: 0, sept: false}, {g: g2, inv: 0, sept: false}];
      const r = A.realizar(K, prog, [], {azar: 6});
      if (!r) continue;
      const busc = o.buscados || ['paralelas-5', 'paralelas-8', 'dup-sensible', 'sensible', 'cruce', 'espaciado'];
      const conE = Math.random() < 0.85 ? A.conError(K, prog, r.cols, busc) : null;
      const cols = conE ? conE.cols : r.cols;
      const cor = conE ? conE.problema.regla : 'ninguno';
      const pool = mezclar(Object.keys(ERRORES).filter(k => k !== cor && k !== 'ninguno')).slice(0, 2);
      const opts = mezclar([cor, ...pool, ...(cor === 'ninguno' ? [mezclar(Object.keys(ERRORES).filter(k => k !== 'ninguno' && !pool.includes(k)))[0]] : ['ninguno'])]);
      const q = {modo: 'opciones', enunciado: `Tonalidad: ${K.nombre}. ¿Qué error de conducción hay en este enlace?`,
        visual: ver(K, cols, {sinCifra: false}), escuchar(){ ED.crear(document.createElement('div'), {K, cols, soloLectura: true, panel: false}).tocarTodo(); },
        opciones: opts.map(k => op(k, ERRORES[k])), correcta: cor};
      const reg = conE ? A.REGLAS[cor] : null;
      const hab = ['paralelas-5', 'paralelas-8'].includes(cor) ? 'h-paralelas' : ['sensible', 'dup-sensible'].includes(cor) ? 'h-resolucion' : 'h-reglas';
      q.evaluar = resp => resultado(q, resp, ok => ({diag: ok ? null : (['paralelas-5', 'paralelas-8'].includes(cor) || ['paralelas-5', 'paralelas-8'].includes(resp) ? 'h-paralelas' : 'h-reglas'),
        habs: [['h-reglas', ok], [hab, ok]],
        explicacion: conE ? `<p><b>${reg.titulo}</b> ${conE.problema.det ? `(${conE.problema.det})` : ''}.</p><p><b>Por qué se evita:</b> ${reg.porque}</p><p><b>Cómo corregirlo:</b> ${reg.como}</p>` : '<p>El enlace es correcto: no hay quintas ni octavas paralelas, la sensible (si está) resuelve, no hay duplicaciones problemáticas y las voces están bien espaciadas.</p>',
        donde: ok ? '' : 'Revisá en orden: 1) ¿cada par de voces forma quintas u octavas en los dos acordes? 2) ¿hay alguna nota repetida que no debería (la sensible)? 3) ¿la sensible sube a la tónica? 4) ¿las voces están ordenadas y a menos de una octava?',
        alMostrar: el => { const ed = ED.crear(el, {K, cols, soloLectura: true, panel: false}); if (conE) ed.enfocar(conE.problema); }}));
      return q;
    }
  }});

  // ---------- Cadencias ----------
  const CADS = {autentica: 'Auténtica', plagal: 'Plagal', semicadencia: 'Semicadencia', rota: 'Rota (deceptiva)'};
  tipo('h-cadencia', {nombre: 'Reconocer cadencias', hab: 'h-cadencias', leccion: 'h-cadencias', gen(o){
    for (;;){
      const K = tonalidad(o);
      const tipoC = azar(Object.keys(CADS));
      const prog = A.generarProgresion(4, tipoC);
      const r = A.realizar(K, prog, [], {azar: 4, finTonica: tipoC === 'autentica'});
      if (!r) continue;
      const an = A.analizar(K, r.cols);
      if (!an.cadencia || an.cadencia.id !== tipoC) continue;
      const q = {modo: 'opciones', auditivo: !!o.auditivo, enunciado: `${o.auditivo ? 'Escuchá la frase. ' : ''}¿Con qué cadencia termina?`,
        visual: o.auditivo ? null : ver(K, r.cols), autoEscuchar: !!o.auditivo,
        escuchar(){ ED.crear(document.createElement('div'), {K, cols: r.cols, soloLectura: true, panel: false}).tocarTodo(); },
        opciones: Object.keys(CADS).map(k => op(k, CADS[k])), correcta: tipoC};
      q.evaluar = resp => resultado(q, resp, ok => ({diag: ok ? null : 'h-cadencias',
        explicacion: `<p>Los dos últimos acordes son <b>${A.romanoTexto(K, prog[2])} → ${A.romanoTexto(K, prog[3])}</b>: ${an.cadencia.nombre.toLowerCase()}. ${an.cadencia.desc}</p><ul><li><b>Auténtica:</b> V → I.</li><li><b>Plagal:</b> IV → I.</li><li><b>Semicadencia:</b> termina en el V.</li><li><b>Rota:</b> V → vi.</li></ul>`,
        donde: ok ? '' : 'Mirá (o escuchá) solo el final: ¿el último acorde es la tónica? Si es así, ¿llega desde el V o desde el IV? Si termina en el V, es semicadencia; si el V va al vi, es rota.',
        alMostrar: analizado(K, r.cols)}));
      return q;
    }
  }});
})();
