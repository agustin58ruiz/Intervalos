// Armonía tonal a cuatro voces (sin interfaz). Toma como referencia conceptual los
// principios de «Harmony» de Walter Piston: acordes sobre los grados de la escala,
// duplicación y disposición, conducción de voces, progresiones de fundamentales y cadencias.
//
// Una nota de una voz es {l, a, o} como en musica.js. Una columna (un acorde a cuatro
// voces) es {S, A, T, B}; cualquier voz puede ser null mientras se escribe.
(function(){
  const M = window.Musica;
  const A = {};

  // ---------- Voces ----------
  A.VOCES = ['S', 'A', 'T', 'B'];
  A.NOMBRE_VOZ = {S: 'soprano', A: 'contralto', T: 'tenor', B: 'bajo'};
  A.NOMBRE_VOZ_M = {S: 'Soprano', A: 'Contralto', T: 'Tenor', B: 'Bajo'};
  // Registros habituales de cada voz (MIDI)
  A.RANGO = {S: [60, 79], A: [55, 74], T: [48, 67], B: [40, 62]};
  A.PENTA = {S: 'treble', A: 'treble', T: 'bass', B: 'bass'};
  const PARES = [['S','A'], ['S','T'], ['S','B'], ['A','T'], ['A','B'], ['T','B']];
  A.PARES = PARES;

  // ---------- Tonalidades ----------
  // {modo: 'mayor'|'menor', arm, tonica: {l, a}, nombre}
  A.tonalidad = (arm, modo = 'mayor') => {
    const k = M.armadura(arm);
    const t = modo === 'mayor' ? k.mayor : k.menor;
    return {modo, arm, tonica: {l: t.l, a: t.a}, nombre: `${M.nombre({l: t.l, a: t.a})} ${modo}`};
  };
  A.TONALIDADES = [
    [0,'mayor'],[1,'mayor'],[-1,'mayor'],[2,'mayor'],[-2,'mayor'],[3,'mayor'],[-3,'mayor'],
    [0,'menor'],[1,'menor'],[-1,'menor'],[-2,'menor'],[2,'menor'],[-3,'menor']
  ].map(([n, m]) => A.tonalidad(n, m));
  A.claveTon = K => `${K.arm}:${K.modo}`;

  // Nota (letra + alteración) de un grado (0 = tónica). En menor, el 7.º grado se eleva
  // (sensible) cuando se pide.
  A.notaGrado = (K, g, elevar = false) => {
    const l = (K.tonica.l + g) % 7;
    let a = M.alteracionArmadura(K.arm, l);
    if (K.modo === 'menor' && ((g % 7) + 7) % 7 === 6 && elevar) a += 1;
    return {l, a};
  };
  A.gradoDe = (K, l) => ((l - K.tonica.l) % 7 + 7) % 7;
  // Alteración que se pone por defecto al escribir una letra en esta tonalidad
  // (en menor se usa la menor armónica: sensible elevada).
  A.alteracionPorDefecto = (K, l) => A.notaGrado(K, A.gradoDe(K, l), true).a;

  // ---------- Acordes ----------
  // Un acorde es {g: grado 0–6, inv: 0–3, sept: bool, nov: bool} (diatónico) o un acorde
  // cromático con esp:
  //   'sec' dominante secundaria: {esp, base: 'V'|'V7'|'vii'|'vii7'|'viiø7', de: grado destino}
  //   'mix' acorde de intercambio modal (del modo paralelo): {esp, g, sept}
  //   'N' sexta napolitana (♭II), 'It' | 'Fr' | 'Al' sextas aumentadas
  const ROMANO = ['I','II','III','IV','V','VI','VII'];
  const elevaSensible = (K, g) => K.modo === 'menor' && (g === 4 || g === 6);
  A.MIEMBROS = ['F', '3', '5', '7', '9'];
  const SEXTAS = {It: 'italiana', Fr: 'francesa', Al: 'alemana'};
  const pc = n => ((M.PC[n.l] + n.a) % 12 + 12) % 12;
  const rel = (n, num, cal, abajo) => { const x = M.construir({l: n.l, a: n.a, o: 4}, num, cal, abajo); return {l: x.l, a: x.a}; };
  const triada = (f, q) => [f, rel(f, 3, q === 'M' || q === 'A' ? 'M' : 'm'), rel(f, 5, q === 'd' ? 'd' : q === 'A' ? 'A' : 'J')];
  A.paralela = K => ({modo: K.modo === 'mayor' ? 'menor' : 'mayor', arm: K.arm + (K.modo === 'mayor' ? -3 : 3), tonica: K.tonica});
  // Calidad a partir de las notas: M, m, d, A (+ tipo de séptima: 7, maj7, ø7, °7)
  function calidadNotas(ns){
    const [f, t, q, s] = ns;
    const i3 = (pc(t) - pc(f) + 12) % 12, i5 = (pc(q) - pc(f) + 12) % 12;
    const tri = i3 === 4 && i5 === 7 ? 'M' : i3 === 3 && i5 === 7 ? 'm' : i3 === 3 && i5 === 6 ? 'd' : i3 === 4 && i5 === 8 ? 'A' : '?';
    if (!s) return {tri, sep: null};
    const i7 = (pc(s) - pc(f) + 12) % 12;
    return {tri, sep: i7 === 10 ? (tri === 'd' ? 'ø7' : '7') : i7 === 11 ? 'maj7' : i7 === 9 ? '°7' : '?'};
  }
  const numeral = (g, q, sep, bemol) => {
    let r = (bemol ? '♭' : '') + ROMANO[g];
    if (q.tri === 'm' || q.tri === 'd') r = r.toLowerCase();
    if (sep === '°7' || (q.tri === 'd' && !sep)) r += '°';
    else if (sep === 'ø7') r += 'ø';
    if (q.tri === 'A') r += '+';
    return r;
  };
  // Toda la información de un acorde (notas, miembros, numeral, función, notas con tendencia)
  A.info = (K, c) => {
    let notas, miembros, g, funcion, base, sufijo = '', nombreEsp = '', bemol = false;
    if (!c.esp){
      const el = elevaSensible(K, c.g);
      notas = [0, 2, 4].map(d => A.notaGrado(K, c.g + d, el));
      if (c.sept || c.nov) notas.push(A.notaGrado(K, c.g + 6, el));
      if (c.nov) notas.push(A.notaGrado(K, c.g + 8, el));
      miembros = A.MIEMBROS.slice(0, notas.length);
      g = c.g; funcion = A.FUNCION[c.g];
    } else if (c.esp === 'sec'){
      const dest = A.notaGrado(K, c.de, false);
      if (c.base[0] === 'V'){ const f = rel(dest, 5, 'J'); notas = triada(f, 'M'); if (c.base === 'V7') notas.push(rel(f, 7, 'm')); g = (c.de + 4) % 7; }
      else { const f = rel(dest, 2, 'm', true); notas = triada(f, 'd'); if (c.base === 'vii7') notas.push(rel(f, 7, 'd')); if (c.base === 'viiø7') notas.push(rel(f, 7, 'm')); g = (c.de + 6) % 7; }
      miembros = A.MIEMBROS.slice(0, notas.length);
      funcion = 'D';
      sufijo = '/' + numeral(c.de, calidadNotas(A.info(K, {g: c.de, inv: 0}).notas), null);
      nombreEsp = `dominante secundaria de ${A.nombreAcorde(K, {g: c.de, inv: 0})}`;
    } else if (c.esp === 'mix'){
      const P = A.paralela(K);
      const el = K.modo === 'mayor' ? (c.g === 6 && c.sept) : false;
      notas = [0, 2, 4].map(d => A.notaGrado(P, c.g + d, el));
      if (c.sept) notas.push(A.notaGrado(P, c.g + 6, el));
      miembros = A.MIEMBROS.slice(0, notas.length);
      g = c.g; funcion = A.FUNCION[c.g];
      bemol = notas[0].a < A.alteracionPorDefecto(K, notas[0].l);
      nombreEsp = K.modo === 'mayor' ? 'tomado del modo menor (intercambio modal)' : (c.g === 0 ? 'tercera de picardía' : 'tomado del modo mayor');
    } else if (c.esp === 'N'){
      const T = A.notaGrado(K, 0), f = rel(T, 2, 'm');
      notas = triada(f, 'M'); miembros = A.MIEMBROS.slice(0, 3);
      g = 1; funcion = 'S'; nombreEsp = 'sexta napolitana';
    } else {
      const T = A.notaGrado(K, 0);
      notas = [rel(T, 6, 'm'), T];
      miembros = ['♭6', '1'];
      if (c.esp === 'Fr'){ notas.push(rel(T, 2, 'M')); miembros.push('2'); }
      if (c.esp === 'Al'){ notas.push(rel(T, 3, 'm')); miembros.push('♭3'); }
      notas.push(rel(T, 4, 'A')); miembros.push('♯4');
      g = 5; funcion = 'S'; nombreEsp = `sexta aumentada ${SEXTAS[c.esp]}`;
    }
    const q = c.esp && SEXTAS[c.esp] ? {tri: '?', sep: null} : calidadNotas(notas);
    // notas con tendencia: las alteradas respecto de la tonalidad en acordes cromáticos
    const tendencias = {};
    if (c.esp) notas.forEach((n, i) => { const d = n.a - A.alteracionPorDefecto(K, n.l); if (d && !(K.modo === 'menor' && c.esp === 'mix' && A.gradoDe(K, n.l) === 6)) tendencias[i] = Math.sign(d); });
    let romano;
    if (c.esp && SEXTAS[c.esp]) romano = {It: 'It', Fr: 'Fr', Al: 'Al'}[c.esp];
    else if (c.esp === 'N') romano = 'N';
    else if (c.esp === 'sec') romano = c.base[0] === 'V' ? 'V' : c.base === 'viiø7' ? 'viiø' : 'vii°';
    else romano = numeral(g, q, q.sep, bemol);
    return {notas, miembros, g, funcion, q, romano, sufijo, nombreEsp, tendencias, nov: !!c.nov,
            sept: notas.length >= 4 && !(c.esp && SEXTAS[c.esp]), aumentada: !!(c.esp && SEXTAS[c.esp])};
  };
  A.notasAcorde = (K, c) => A.info(K, c).notas;
  A.calidad = (K, c) => A.info(K, c).q.tri;
  const SUP = {'6': '⁶', '7': '⁷', '4': '⁴', '5': '⁵', '3': '³', '2': '²', '9': '⁹', '+': '⁺'};
  A.CIFRA = {false: ['', '6', '64'], true: ['7', '65', '43', '42']};
  const cifraDe = (c, inf) => inf.aumentada ? '+6' : inf.nov ? '9' : c.esp === 'N' && c.inv === 1 ? '6' : (A.CIFRA[!!inf.sept][c.inv] || '');
  // Numeral romano con cifrado (V⁷, I⁶, ii⁶, vii°⁶, I⁶₄, V⁷/V, N⁶, It⁺⁶…)
  A.romano = (K, c, op = {}) => {
    const inf = A.info(K, c);
    if (op.sinCifra) return inf.romano + inf.sufijo;
    const cif = cifraDe(c, inf);
    if (op.texto) return inf.romano + cif + inf.sufijo;
    if (cif.length === 2 && cif !== '+6') return `${inf.romano}<span class="cif"><sup>${cif[0]}</sup><sub>${cif[1]}</sub></span>${inf.sufijo}`;
    return inf.romano + (cif ? `<sup>${cif}</sup>` : '') + inf.sufijo;
  };
  A.romanoTexto = (K, c) => { const inf = A.info(K, c); return inf.romano + cifraDe(c, inf).split('').map(x => SUP[x] || x).join('') + inf.sufijo; };
  const CAL_NOMBRE = {M: 'mayor', m: 'menor', d: 'disminuido', A: 'aumentado'};
  const SEP_NOMBRE = {'7': 'con séptima', 'maj7': 'con séptima mayor', 'ø7': 'semidisminuido (séptima menor)', '°7': 'disminuido (séptima disminuida)'};
  A.nombreAcorde = (K, c) => {
    const inf = A.info(K, c);
    if (inf.aumentada) return `Sexta aumentada ${SEXTAS[c.esp]} (${inf.notas.map(x => M.corto(x)).join('–')})`;
    const f = inf.notas[0];
    let t = `${M.nombre(f)} ${CAL_NOMBRE[inf.q.tri] || ''}`;
    if (inf.q.sep) t = `${M.nombre(f)} ${inf.q.sep === '7' && inf.q.tri === 'M' ? (inf.nov ? 'con séptima y novena (dominante)' : 'con séptima (dominante)') : inf.q.sep === '°7' || inf.q.sep === 'ø7' ? SEP_NOMBRE[inf.q.sep] : (CAL_NOMBRE[inf.q.tri] || '') + ' ' + SEP_NOMBRE[inf.q.sep]}`;
    return t.trim() + (inf.nombreEsp ? ` · ${inf.nombreEsp}` : '');
  };
  A.mismoAcorde = (a, b) => !!a && !!b && (a.esp || '') === (b.esp || '') && a.inv === b.inv &&
    (a.esp === 'sec' ? a.base === b.base && a.de === b.de : a.esp === 'N' || (a.esp && SEXTAS[a.esp]) ? true : a.g === b.g && !!a.sept === !!b.sept && !!a.nov === !!b.nov);
  A.INVERSION = ['estado fundamental', 'primera inversión', 'segunda inversión', 'tercera inversión'];

  // ---------- Funciones y progresiones ----------
  // Funciones tonales: T = tónica, S = subdominante (predominante), D = dominante
  A.FUNCION = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
  A.NOMBRE_FUNCION = {T: 'tónica', S: 'subdominante', D: 'dominante'};
  // Progresiones habituales de las fundamentales (tabla de Piston, resumida):
  // u = usual, a = a veces, r = poco frecuente. Índices = grados.
  A.PROG = [
    {u: [3, 4], a: [5], r: [1, 2]},          // I   → IV, V; a veces vi
    {u: [4], a: [3, 5], r: [0, 2]},          // ii  → V; a veces IV, vi
    {u: [5], a: [3], r: [0, 1, 4]},          // iii → vi; a veces IV
    {u: [4], a: [0, 1], r: [2, 5]},          // IV  → V; a veces I, ii
    {u: [0], a: [3, 5], r: [1, 2]},          // V   → I; a veces vi (y IV)
    {u: [1, 4], a: [2, 3], r: [0]},          // vi  → ii, V; a veces iii, IV
    {u: [0], a: [2], r: []}                  // vii°→ I; a veces iii
  ];
  A.frecuencia = (g1, g2) => g1 === g2 ? 'repeticion' : A.PROG[g1].u.includes(g2) ? 'usual' : A.PROG[g1].a.includes(g2) ? 'aveces' : A.PROG[g1].r.includes(g2) ? 'rara' : 'rara';
  // Movimiento de las fundamentales: cuarta/quinta, tercera o segunda
  A.movimientoFund = (g1, g2) => { const d = ((g2 - g1) % 7 + 7) % 7; return d === 3 || d === 4 ? 'quinta' : d === 2 || d === 5 ? 'tercera' : d === 1 || d === 6 ? 'segunda' : 'igual'; };

  // ---------- Identificación de un acorde a partir de sus voces ----------
  const igualNombre = (x, y) => x.l === y.l && x.a === y.a;
  // Acordes posibles en una tonalidad: diatónicos (tríadas, séptimas, novena de dominante)
  // y cromáticos (dominantes secundarias, intercambio modal, napolitana, sextas aumentadas)
  const cacheCand = {};
  A.candidatos = K => {
    const k = A.claveTon(K);
    if (cacheCand[k]) return cacheCand[k];
    const out = [];
    for (let g = 0; g < 7; g++) [false, true].forEach(sept => out.push({g, sept}));
    out.push({g: 4, sept: true, nov: true});
    const destinos = K.modo === 'mayor' ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6];
    destinos.forEach(de => ['V', 'V7', 'vii', 'vii7'].forEach(base => out.push({esp: 'sec', base, de})));
    if (K.modo === 'mayor') [[0, false], [1, false], [1, true], [2, false], [3, false], [5, false], [6, false], [6, true]].forEach(([g, sept]) => out.push({esp: 'mix', g, sept}));
    else [[0, false], [3, false]].forEach(([g, sept]) => out.push({esp: 'mix', g, sept}));
    ['N', 'It', 'Fr', 'Al'].forEach(esp => out.push({esp}));
    return (cacheCand[k] = out);
  };
  // Devuelve {acorde, miembro: {S,A,T,B}, presentes, ajenas, inv} o null si no hay notas
  A.identificar = (K, col, op = {}) => {
    const voces = A.VOCES.filter(v => col[v]);
    if (!voces.length) return null;
    let mejor = null;
    A.candidatos(K).forEach(c => {
      const inf = A.info(K, Object.assign({inv: 0}, c));
      const ns = inf.notas;
      const miembro = {}, idx = {};
      let ok = 0;
      voces.forEach(v => { const i = ns.findIndex(n => igualNombre(n, col[v])); if (i >= 0){ miembro[v] = inf.miembros[i]; idx[v] = i; ok++; } });
      const pres = new Set(Object.values(miembro));
      // un acorde de séptima (o novena) necesita la séptima (y la novena); una sexta aumentada, sus notas propias
      if (inf.sept && !inf.aumentada && !pres.has('7')) return;
      if (c.nov && !pres.has('9')) return;
      if (inf.aumentada && (!pres.has('♭6') || !pres.has('♯4') || (c.esp === 'Fr' && !pres.has('2')) || (c.esp === 'Al' && !pres.has('♭3')))) return;
      let punt = ok*10 + (pres.has('F') || inf.aumentada ? 3 : 0) + (pres.has('3') || inf.aumentada ? 2 : 0) + (col.B && idx.B === 0 ? 1 : 0) - (c.sept ? 1 : 0) - (c.nov ? 1 : 0);
      if (c.esp) punt -= c.esp === 'mix' && op.preferirMix ? 2.4 : 2.5;   // ante la duda, el diatónico
      if (!mejor || punt > mejor.punt) mejor = {punt, c, inf, miembro, idx, ok};
    });
    const ajenas = voces.filter(v => !mejor.miembro[v]);
    const inv = col.B && mejor.idx.B !== undefined ? Math.min(mejor.idx.B, 3) : 0;
    const acorde = Object.assign({}, mejor.c, {inv});
    const presentes = new Set(Object.values(mejor.miembro));
    // reconocido: al menos dos voces forman parte de un acorde de la tonalidad
    return {acorde, info: mejor.inf, miembro: mejor.miembro, presentes, ajenas, completo: voces.length === 4, reconocido: mejor.ok >= 2};
  };

  // ---------- Intervalos entre voces y movimiento ----------
  const midi = n => M.midi(n);
  A.midi = midi;
  const clase = s => ((s % 12) + 12) % 12;
  // Intervalo nombrado entre dos notas de un acorde (número simple + calidad)
  A.intervaloVoces = (x, y) => { const iv = M.intervalo(x, y); return {num: iv.num, simple: iv.simple, cal: iv.cal, semis: iv.semis, nombre: iv.cal ? `${M.ORDINAL[iv.simple]} ${M.nombreCalidad(iv.cal, iv.simple)}${iv.num > 8 ? ` (${M.ORDINAL[iv.num] || iv.num + '.ª'})` : ''}` : `${iv.semis} semitonos`}; };
  const esQuintaJ = (x, y) => { const iv = M.intervalo(x, y); return iv.simple === 5 && iv.cal === 'J'; };
  const esOctavaJ = (x, y) => { const iv = M.intervalo(x, y); return (iv.simple === 8 || iv.num === 1) && iv.cal === 'J'; };
  const esQuintaDis = (x, y) => { const iv = M.intervalo(x, y); return iv.simple === 5 && iv.cal === 'd'; };
  A.TIPO_MOV = {paralelo: 'paralelo', similar: 'similar (directo)', contrario: 'contrario', oblicuo: 'oblicuo', quieto: 'sin movimiento'};
  // Movimiento entre dos voces (grave → aguda) de un acorde al siguiente
  A.movimiento = (g1, a1, g2, a2) => {
    const dg = midi(g2) - midi(g1), da = midi(a2) - midi(a1);
    if (!dg && !da) return 'quieto';
    if (!dg || !da) return 'oblicuo';
    if (Math.sign(dg) !== Math.sign(da)) return 'contrario';
    // paralelo: se conserva el número del intervalo (aunque cambie la calidad, como 3.ª mayor → 3.ª menor)
    return Math.abs(M.paso(a2) - M.paso(g2)) === Math.abs(M.paso(a1) - M.paso(g1)) ? 'paralelo' : 'similar';
  };

  // ---------- Reglas ----------
  // severidad: 'error' (regla general del estilo), 'aviso' (preferencia de estilo, con
  // excepciones) e 'info' (excepción aceptada o consejo). tipo: 'regla' | 'estilo' | 'consejo'
  const R = {};
  const regla = (id, def) => { R[id] = Object.assign({id}, def); };
  regla('ajena',      {sev: 'error', tipo: 'regla',  titulo: 'Nota que no pertenece al acorde',
    porque: 'En este estilo cada voz canta una nota del acorde. Una nota ajena hace que el acorde no se pueda nombrar y suene como un choque sin preparar.',
    como: 'Llevá la voz a la fundamental, la tercera o la quinta del acorde (la que quede más cerca).'});
  regla('sin-fund',   {sev: 'error', tipo: 'regla',  titulo: 'Falta la fundamental',
    porque: 'Sin la fundamental el oído reinterpreta el acorde como otro distinto.', como: 'Poné la fundamental en alguna voz, en general duplicándola en lugar de la quinta.'});
  regla('sin-tercera',{sev: 'error', tipo: 'regla',  titulo: 'Falta la tercera',
    porque: 'La tercera dice si el acorde es mayor o menor. Sin ella el acorde suena hueco y ambiguo.', como: 'Cambiá una de las notas duplicadas por la tercera.'});
  regla('sin-septima',{sev: 'error', tipo: 'regla',  titulo: 'Falta la séptima',
    porque: 'El cifrado pide un acorde de séptima; sin la séptima es una tríada.', como: 'Agregá la séptima en lugar de la quinta o de la fundamental duplicada.'});
  regla('sin-quinta', {sev: 'info',  tipo: 'consejo', titulo: 'Quinta omitida',
    porque: 'La quinta es la nota menos necesaria del acorde: se puede omitir triplicando la fundamental (con la tercera simple). Es habitual en el acorde final de una cadencia o para conseguir una buena conducción.',
    como: 'No hace falta corregir nada. Si querés un sonido más lleno, cambiá una fundamental duplicada por la quinta.'});
  regla('cruce',      {sev: 'error', tipo: 'regla',  titulo: 'Cruce de voces',
    porque: 'Cuando una voz queda por encima de la que debería estar más aguda, el oído confunde las líneas y la textura pierde claridad.',
    como: 'Intercambiá las notas entre las dos voces o elegí otra nota del acorde para una de ellas.'});
  regla('espaciado',  {sev: 'error', tipo: 'regla',  titulo: 'Demasiada distancia entre voces superiores',
    porque: 'Entre soprano y contralto, y entre contralto y tenor, más de una octava deja un hueco que desequilibra el acorde. El bajo, en cambio, puede alejarse más del tenor.',
    como: 'Acercá las voces: bajá la más aguda o subí la más grave dentro del acorde.'});
  regla('espaciado-bajo', {sev: 'aviso', tipo: 'estilo', titulo: 'Bajo muy separado del tenor',
    porque: 'El bajo puede estar lejos del tenor, pero más de una duodécima suena desconectado.', como: 'Subí el bajo una octava o bajá el tenor.'});
  regla('registro',   {sev: 'aviso', tipo: 'estilo', titulo: 'Fuera del registro habitual',
    porque: 'Cada voz tiene un registro cómodo; fuera de él la nota suena forzada o se pierde.', como: 'Cambiá la octava o elegí otra nota del acorde dentro del registro.'});
  regla('dup-sensible', {sev: 'error', tipo: 'regla', titulo: 'Sensible duplicada',
    porque: 'La sensible (7.º grado) tiende con fuerza a subir a la tónica. Si está en dos voces, o las dos suben y forman octavas paralelas, o una tiene que contradecir esa tendencia.',
    como: 'Dejá la sensible en una sola voz y duplicá otra nota (en el V, la fundamental).'});
  regla('dup-septima', {sev: 'error', tipo: 'regla', titulo: 'Séptima duplicada',
    porque: 'La séptima es una disonancia que debe resolver bajando por grado; duplicada produciría octavas paralelas al resolver.',
    como: 'Dejá la séptima en una sola voz.'});
  regla('dup-tercera', {sev: 'aviso', tipo: 'estilo', titulo: 'Tercera duplicada en un acorde mayor',
    porque: 'En estado fundamental lo más habitual es duplicar la fundamental. Duplicar la tercera de un acorde mayor la hace demasiado prominente. En los acordes menores (ii, vi) es más aceptable, y en la cadencia rota (V–vi) es lo normal.',
    como: 'Si no hay un motivo de conducción, duplicá la fundamental.'});
  regla('dup-64',     {sev: 'aviso', tipo: 'estilo', titulo: 'En la segunda inversión se duplica el bajo',
    porque: 'En el acorde de sexta y cuarta (como el I⁶₄ cadencial) la nota que se duplica es la del bajo, que es la quinta del acorde.',
    como: 'Duplicá la nota del bajo.'});
  regla('paralelas-5', {sev: 'error', tipo: 'regla', titulo: 'Quintas paralelas',
    porque: 'Dos voces que se mueven juntas en quintas justas se funden en una sola: la quinta es tan consonante que el oído deja de percibirlas como líneas independientes, y la textura a cuatro voces se empobrece.',
    como: 'Mové una de las dos voces por movimiento contrario u oblicuo (por ejemplo, mantené la nota común), o cambiá la duplicación de uno de los acordes.'});
  regla('paralelas-8', {sev: 'error', tipo: 'regla', titulo: 'Octavas (o unísonos) paralelas',
    porque: 'Dos voces que van en octavas paralelas suenan como una sola voz duplicada: se pierde una de las cuatro partes.',
    como: 'Hacé que una de las dos voces vaya en otra dirección o a otra nota del acorde. Suele bastar con que la voz superior vaya por movimiento contrario al bajo.'});
  regla('contrarias', {sev: 'aviso', tipo: 'estilo', titulo: 'Quintas u octavas por movimiento contrario',
    porque: 'Llegar de una quinta (u octava) a otra por movimiento contrario evita el paralelismo literal, pero el efecto de fusión sigue presente. En la escritura coral estricta también se evita; aparece en cadencias finales entre bajo y soprano.',
    como: 'Si no es la cadencia final, buscá otra nota para una de las voces.'});
  regla('desiguales', {sev: 'aviso', tipo: 'estilo', titulo: 'Quinta disminuida a quinta justa',
    porque: 'Pasar de una quinta disminuida a una justa entre las mismas voces se acerca al efecto de las quintas paralelas, sobre todo con el bajo. De justa a disminuida, en cambio, es aceptable.',
    como: 'Evitalo entre el bajo y otra voz; en voces interiores es más tolerable.'});
  regla('directas',   {sev: 'aviso', tipo: 'estilo', titulo: 'Quinta u octava directa (oculta) entre las voces extremas',
    porque: 'Cuando bajo y soprano llegan a una quinta o una octava por movimiento similar, el oído «completa» el paralelismo y la consonancia resalta demasiado.',
    como: 'Se acepta si el soprano se mueve por grado conjunto. Si no, mové el soprano por movimiento contrario al bajo.', excepcion: 'Es aceptable cuando el soprano se mueve por grado conjunto.'});
  regla('salto-aum',  {sev: 'error', tipo: 'regla',  titulo: 'Salto melódico aumentado',
    porque: 'Los intervalos aumentados (como la segunda aumentada del modo menor) son difíciles de cantar y suenan extraños dentro de una línea vocal.',
    como: 'Elegí otra nota del acorde, o hacé que la voz se mueva en otra dirección.'});
  regla('salto-grande', {sev: 'error', tipo: 'regla', titulo: 'Salto mayor que una octava',
    porque: 'Un salto de más de una octava rompe la continuidad de la línea vocal.', como: 'Llevá la voz a una nota del acorde más cercana.'});
  regla('salto-interior', {sev: 'aviso', tipo: 'estilo', titulo: 'Salto amplio en una voz interior',
    porque: 'Contralto y tenor suelen moverse poco: lo más simple es mantener notas comunes y moverse por grado conjunto o por saltos pequeños.',
    como: 'Buscá la nota del acorde más cercana a la nota anterior.'});
  regla('salto-7',    {sev: 'aviso', tipo: 'estilo', titulo: 'Salto de séptima',
    porque: 'La séptima es un salto disonante y difícil de entonar.', como: 'Preferí un salto menor o el grado conjunto.'});
  regla('sensible',   {sev: 'error', tipo: 'regla',  titulo: 'La sensible no resuelve en el soprano',
    porque: 'Cuando el V va al I, la sensible en la voz más aguda se oye claramente y «pide» subir a la tónica. Si no lo hace, la cadencia se debilita.',
    como: 'Llevá la sensible a la tónica, medio tono arriba.'});
  regla('sensible-int', {sev: 'info', tipo: 'consejo', titulo: 'Sensible que baja en una voz interior',
    porque: 'En una voz interior se acepta que la sensible baje a la quinta del acorde de tónica para completar el acorde final (la «sensible frustrada»): el oído la sigue menos.',
    como: 'Es válido. Si preferís el acorde de tónica incompleto, la sensible puede subir y triplicar la fundamental.'});
  regla('sensible-otra', {sev: 'aviso', tipo: 'estilo', titulo: 'La sensible no resuelve',
    porque: 'La sensible tiende a subir a la tónica; si salta a otra nota, la resolución se debilita.', como: 'Llevala a la tónica (o, en voz interior, a la quinta).'});
  regla('septima',    {sev: 'error', tipo: 'regla',  titulo: 'La séptima no resuelve bajando',
    porque: 'La séptima del acorde es una disonancia que se resuelve bajando por grado conjunto a una nota del acorde siguiente.',
    como: 'Llevá la séptima un grado abajo.'});
  regla('nota-comun', {sev: 'info', tipo: 'consejo', titulo: 'Se puede mantener la nota común',
    porque: 'Una regla práctica de Piston para enlazar acordes cuyas fundamentales están a una cuarta o una quinta: mantener la nota común en la misma voz y llevar las otras a la nota más cercana. Da una conducción suave.',
    como: 'Probá dejar quieta la nota común y mover las otras voces lo mínimo. No es obligatorio: otras conducciones también son válidas.'});
  regla('segunda-contrario', {sev: 'info', tipo: 'consejo', titulo: 'Fundamentales por grado conjunto',
    porque: 'Cuando las fundamentales están a distancia de segunda (IV–V, V–vi) no hay nota común: lo más seguro es mover las tres voces superiores en dirección contraria al bajo, para evitar quintas y octavas paralelas.',
    como: 'Si el bajo sube, llevá soprano, contralto y tenor hacia abajo a las notas más cercanas (y al revés).'});
  regla('misma-dir',  {sev: 'aviso', tipo: 'estilo', titulo: 'Las cuatro voces en la misma dirección',
    porque: 'Si todas las voces suben o bajan a la vez se pierde la independencia entre ellas y es fácil caer en paralelas.',
    como: 'Mové alguna voz superior por movimiento contrario al bajo.'});
  regla('superposicion', {sev: 'aviso', tipo: 'estilo', titulo: 'Superposición de voces',
    porque: 'Una voz que salta más allá de donde estaba la voz vecina en el acorde anterior se confunde con ella al escuchar.',
    como: 'Mantené cada voz por debajo de la nota anterior de la voz superior (y por encima de la de la inferior).'});
  regla('retrogresion', {sev: 'aviso', tipo: 'estilo', titulo: 'Progresión poco frecuente',
    porque: 'Algunas sucesiones de fundamentales son raras en la armonía tonal (por ejemplo V–IV o V–ii): debilitan la dirección hacia la dominante y la tónica.',
    como: 'Probá con una progresión más habitual: hacia la dominante (ii–V, IV–V) o de la dominante a la tónica.'});
  regla('no-diatonico', {sev: 'error', tipo: 'regla', titulo: 'Acorde que no pertenece a la tonalidad',
    porque: 'Las notas no forman ninguno de los acordes de la tonalidad (en menor, el V y el vii° llevan la sensible elevada).',
    como: 'Revisá las alteraciones: usá las de la armadura (y la sensible elevada en menor).'});
  regla('cifrado',    {sev: 'error', tipo: 'regla', titulo: 'No es el acorde pedido',
    porque: 'El cifrado indica qué acorde y en qué inversión va en ese lugar.', como: 'Escribí las notas del acorde indicado, con la nota pedida en el bajo.'});
  regla('dup-tendencia', {sev: 'error', tipo: 'regla', titulo: 'Nota alterada duplicada',
    porque: 'Las notas alteradas cromáticamente (la sensible secundaria, el ♭6 y el ♯4 de las sextas aumentadas, el ♭2 napolitano) tienen una dirección obligada. Duplicadas, las dos voces irían al mismo lugar en octavas paralelas, o una tendría que contradecir su tendencia.',
    como: 'Dejá la nota alterada en una sola voz y duplicá otra (en general la fundamental, o en la napolitana, la tercera).'});
  regla('tendencia',  {sev: 'aviso', tipo: 'estilo', titulo: 'La nota alterada no sigue su tendencia',
    porque: 'Una nota elevada cromáticamente funciona como una sensible y tiende a subir medio tono; una nota bajada tiende a bajar. Si no lo hace, la alteración pierde sentido.',
    como: 'Llevá la nota elevada medio tono arriba y la bajada medio tono abajo (o mantenela si es nota común con el acorde siguiente).'});
  regla('falsa-relacion', {sev: 'aviso', tipo: 'estilo', titulo: 'Falsa relación',
    porque: 'Cuando una nota y su alteración cromática (por ejemplo Fa y Fa♯) aparecen en voces distintas de dos acordes seguidos, el choque se oye como un error. Si el cambio ocurre dentro de la misma voz, suena como un movimiento cromático natural.',
    como: 'Hacé que la misma voz que tenía la nota natural pase a la alterada (o al revés).'});
  regla('quintas-mozart', {sev: 'aviso', tipo: 'estilo', titulo: 'Quintas «de Mozart» (sexta alemana → V)',
    porque: 'La sexta aumentada alemana resuelve al V con quintas paralelas casi inevitables. En la práctica clásica se toleran (aparecen en Mozart), pero es más común evitarlas pasando por el I⁶₄ cadencial o usando la sexta italiana o francesa.',
    como: 'Interpolá un I⁶₄ entre la sexta alemana y el V, o cambiá a una sexta francesa.', excepcion: 'Se toleran en voces interiores o en tiempos débiles.'});
  regla('resolucion-irregular', {sev: 'info', tipo: 'consejo', titulo: 'Resolución irregular de una dominante secundaria',
    porque: 'Una dominante secundaria crea la expectativa de su acorde de resolución. Ir a otro acorde (por ejemplo, a otra dominante secundaria o a la cadencia rota) es una resolución irregular: válida, pero hay que escucharla con intención.',
    como: 'Si querés la resolución normal, el V/x va al acorde x.'});
  regla('seis-cuatro', {sev: 'aviso', tipo: 'estilo', titulo: 'Acorde de sexta y cuarta fuera de sus usos',
    porque: 'La segunda inversión es inestable: la cuarta con el bajo suena como una disonancia. En el estilo se usa en cuatro situaciones: cadencial (I⁶₄–V), de paso (el bajo pasa por grado), de bordadura o pedal (el bajo se queda) y arpegiada (el mismo acorde con el bajo moviéndose).',
    como: 'Usala como I⁶₄ antes del V, o con el bajo por grado conjunto o quieto; si no, preferí el estado fundamental o la primera inversión.'});
  regla('novena-pos', {sev: 'aviso', tipo: 'estilo', titulo: 'Novena demasiado cerca de la fundamental',
    porque: 'La novena suena como tal cuando está al menos una novena por encima de la fundamental, normalmente en el soprano. Por debajo o como segunda, choca con la fundamental.',
    como: 'Poné la novena en el soprano, por encima de la fundamental.'});
  regla('aum-incompleta', {sev: 'error', tipo: 'regla', titulo: 'Sexta aumentada incompleta',
    porque: 'Cada tipo de sexta aumentada se define por sus notas: la italiana tiene ♭6, 1 y ♯4 (con la tónica duplicada); la francesa agrega el 2; la alemana, el ♭3.',
    como: 'Agregá la nota que falta.'});
  A.REGLAS = R;
  A.SEV_ORDEN = {error: 0, aviso: 1, info: 2};

  // ---------- Análisis ----------
  const mk = (id, cols, voces, extra) => Object.assign({regla: id, sev: R[id].sev, cols, voces}, extra || {});
  const nombreVoz = v => A.NOMBRE_VOZ[v];
  const sensibleDe = K => A.notaGrado(K, 6, true);

  // Problemas dentro de un acorde
  function problemasAcorde(K, col, id, ci, opts){
    const out = [];
    const voces = A.VOCES.filter(v => col[v]);
    // registro
    voces.forEach(v => { const m = midi(col[v]); if (m < A.RANGO[v][0] || m > A.RANGO[v][1]) out.push(mk('registro', [ci], [v], {det: `${A.NOMBRE_VOZ_M[v]}: ${M.corto(col[v], {oct: true})}`})); });
    // cruces y espaciado
    const orden = ['S','A','T','B'];
    for (let i = 0; i < 3; i++){
      const a = orden[i], b = orden[i + 1];
      if (!col[a] || !col[b]) continue;
      if (midi(col[a]) < midi(col[b])) out.push(mk('cruce', [ci], [a, b], {det: `${A.NOMBRE_VOZ_M[a]} por debajo del ${nombreVoz(b)}`}));
      const d = midi(col[a]) - midi(col[b]);
      if (i < 2 && d > 12) out.push(mk('espaciado', [ci], [a, b], {det: `${A.NOMBRE_VOZ_M[a]}–${nombreVoz(b)}: ${d} semitonos`}));
      if (i === 2 && d > 19) out.push(mk('espaciado-bajo', [ci], [a, b]));
    }
    if (!id) return out;
    if (id.ajenas.length){
      out.push(mk(id.reconocido ? 'ajena' : 'no-diatonico', [ci], id.ajenas, {det: id.ajenas.map(v => `${A.NOMBRE_VOZ_M[v]}: ${M.corto(col[v])}`).join(', ')}));
      return out;
    }
    if (voces.length < 4) return out;
    const c = id.acorde, inf = id.info || A.info(K, c);
    const miembros = A.VOCES.map(v => id.miembro[v]);
    const cuenta = m => miembros.filter(x => x === m).length;
    if (inf.aumentada){
      if (inf.miembros.some(m => !cuenta(m))) out.push(mk('aum-incompleta', [ci], []));
    } else {
      if (!cuenta('F')) out.push(mk('sin-fund', [ci], []));
      if (!cuenta('3')) out.push(mk('sin-tercera', [ci], []));
      if (inf.sept && !cuenta('7')) out.push(mk('sin-septima', [ci], []));
      if (!inf.nov && cuenta('5') === 0 && cuenta('F') >= 2 && cuenta('3') === 1) out.push(mk('sin-quinta', [ci], []));
    }
    // duplicaciones
    const sens = sensibleDe(K);
    const conSensible = A.VOCES.filter(v => igualNombre(col[v], sens));
    const tieneSens = (!c.esp && (c.g === 4 || c.g === 6 || c.g === 2)) || (c.esp === 'mix' && c.g === 6 && c.sept);
    if (conSensible.length > 1 && tieneSens) out.push(mk('dup-sensible', [ci], conSensible));
    ['7', '9'].forEach(m => { if (cuenta(m) > 1) out.push(mk('dup-septima', [ci], A.VOCES.filter(v => id.miembro[v] === m))); });
    Object.keys(inf.tendencias).forEach(i => {
      const vs = A.VOCES.filter(v => igualNombre(col[v], inf.notas[i]));
      if (vs.length > 1 && inf.miembros[i] !== '7') out.push(mk('dup-tendencia', [ci], vs, {det: M.corto(inf.notas[i])}));
    });
    const q = inf.q.tri;
    if (!c.esp && !inf.sept && c.inv === 0 && cuenta('3') >= 2 && q === 'M' && !(opts && opts.rota)) out.push(mk('dup-tercera', [ci], A.VOCES.filter(v => id.miembro[v] === '3')));
    if (!c.esp && !inf.sept && c.inv === 2 && cuenta('5') < 2) out.push(mk('dup-64', [ci], ['B']));
    if (inf.nov){
      const v9 = A.VOCES.find(v => id.miembro[v] === '9'), fs = A.VOCES.filter(v => id.miembro[v] === 'F');
      if (v9 && fs.some(v => midi(col[v9]) - midi(col[v]) < 13)) out.push(mk('novena-pos', [ci], [v9]));
    }
    return out;
  }

  // Problemas en el enlace de dos acordes (columnas completas)
  function problemasEnlace(K, c1, c2, i1, i2, ci){
    const out = [];
    const v4 = A.VOCES.filter(v => c1[v] && c2[v]);
    // paralelas y directas
    PARES.forEach(([x, y]) => {
      if (!v4.includes(x) || !v4.includes(y)) return;
      const ax = c1[x], ay = c1[y], bx = c2[x], by = c2[y];
      const mov = A.movimiento(ay, ax, by, bx);   // y es la más grave
      const seMueven = midi(ax) !== midi(bx) && midi(ay) !== midi(by);
      if (!seMueven) return;
      const p5 = esQuintaJ(ax, ay) && esQuintaJ(bx, by);
      const p8 = esOctavaJ(ax, ay) && esOctavaJ(bx, by);
      if (p5 || p8){
        if (mov === 'contrario') out.push(mk('contrarias', [ci, ci + 1], [x, y], {det: `${A.NOMBRE_VOZ_M[x]} y ${nombreVoz(y)}`}));
        else out.push(mk(p5 ? 'paralelas-5' : 'paralelas-8', [ci, ci + 1], [x, y], {det: `entre ${nombreVoz(x)} y ${nombreVoz(y)}`}));
        return;
      }
      if (esQuintaDis(ax, ay) && esQuintaJ(bx, by) && y === 'B') out.push(mk('desiguales', [ci, ci + 1], [x, y], {det: `${A.NOMBRE_VOZ_M[x]} y bajo`}));
      if (x === 'S' && y === 'B' && mov === 'similar' && (esQuintaJ(bx, by) || esOctavaJ(bx, by))){
        const saltoS = Math.abs(midi(bx) - midi(ax));
        if (saltoS > 2) out.push(mk('directas', [ci, ci + 1], ['S', 'B'], {det: esQuintaJ(bx, by) ? 'quinta directa' : 'octava directa'}));
      }
    });
    // saltos melódicos
    v4.forEach(v => {
      const iv = M.intervalo(c1[v], c2[v]);
      const s = Math.abs(midi(c2[v]) - midi(c1[v]));
      if (s === 0) return;
      if (iv.cal === 'A' && iv.num <= 8) out.push(mk('salto-aum', [ci, ci + 1], [v], {det: `${A.NOMBRE_VOZ_M[v]}: ${M.nombreIntervalo(iv.simple, 'A')}`}));
      else if (s > 12) out.push(mk('salto-grande', [ci, ci + 1], [v], {det: `${A.NOMBRE_VOZ_M[v]}: ${s} semitonos`}));
      else if (iv.simple === 7) out.push(mk('salto-7', [ci, ci + 1], [v]));
      else if ((v === 'A' || v === 'T') && s > 7) out.push(mk('salto-interior', [ci, ci + 1], [v], {det: `${A.NOMBRE_VOZ_M[v]}: ${s} semitonos`}));
    });
    // superposición
    [['S','A'], ['A','T'], ['T','B']].forEach(([x, y]) => {
      if (!v4.includes(x) || !v4.includes(y)) return;
      if (midi(c2[y]) > midi(c1[x]) || midi(c2[x]) < midi(c1[y])) out.push(mk('superposicion', [ci, ci + 1], [x, y], {det: `${A.NOMBRE_VOZ_M[x]} y ${nombreVoz(y)}`}));
    });
    if (v4.length === 4){
      const dirs = A.VOCES.map(v => Math.sign(midi(c2[v]) - midi(c1[v])));
      if (dirs.every(d => d === 1) || dirs.every(d => d === -1)) out.push(mk('misma-dir', [ci, ci + 1], A.VOCES.slice()));
    }
    if (!i1 || !i2 || i1.ajenas.length || i2.ajenas.length) return out;
    const a1 = i1.acorde, a2 = i2.acorde;
    const f1 = i1.info || A.info(K, a1);
    const diat = !a1.esp && !a2.esp;
    // sensible: V o vii° hacia I o vi
    const sens = sensibleDe(K), ton = A.notaGrado(K, 0);
    const dom1 = (!a1.esp && (a1.g === 4 || a1.g === 6)) || (a1.esp === 'mix' && a1.g === 6 && a1.sept);
    if (dom1 && (a2.g === 0 || a2.g === 5) && a2.esp !== 'sec' && !(a2.esp && /It|Fr|Al|N/.test(a2.esp))){
      v4.forEach(v => {
        if (!igualNombre(c1[v], sens)) return;
        const d = midi(c2[v]) - midi(c1[v]);
        if (d === 1 && igualNombre(c2[v], ton)) return;
        if (v === 'S') out.push(mk('sensible', [ci, ci + 1], ['S']));
        else if (a2.g === 0 && d < 0 && d >= -4 && i2.miembro[v] === '5') out.push(mk('sensible-int', [ci, ci + 1], [v]));
        else if (a2.g === 0 && d !== 1 && v !== 'B') out.push(mk('sensible-otra', [ci, ci + 1], [v]));
      });
    }
    // séptima (y novena): resuelven bajando por grado
    v4.forEach(v => {
      if (i1.miembro[v] !== '7' && i1.miembro[v] !== '9') return;
      if (f1.aumentada) return;
      const d = midi(c2[v]) - midi(c1[v]);
      if (!(d === -1 || d === -2 || d === 0 && (a1.g === a2.g || A.notasAcorde(K, a2).some(n => igualNombre(n, c1[v]))))) out.push(mk('septima', [ci, ci + 1], [v]));
    });
    // notas alteradas: la elevada sube, la bajada baja
    Object.keys(f1.tendencias).forEach(i => {
      const dir = f1.tendencias[i];
      v4.forEach(v => {
        if (!igualNombre(c1[v], f1.notas[i]) || f1.miembros[i] === '7') return;
        const d = midi(c2[v]) - midi(c1[v]);
        const ok = d === 0 || (dir > 0 ? d >= 1 && d <= 2 : d <= -1 && d >= -3);
        if (!ok && v !== 'B') out.push(mk('tendencia', [ci, ci + 1], [v], {det: `${A.NOMBRE_VOZ_M[v]}: ${M.corto(c1[v])} ${dir > 0 ? 'tiende a subir' : 'tiende a bajar'}`}));
      });
    });
    // falsa relación: la alteración cromática aparece en otra voz
    const cromatica = v4.some(v => c1[v].l === c2[v].l && c1[v].a !== c2[v].a);
    if (!cromatica) v4.forEach(x => v4.forEach(y => {
      if (x === y) return;
      if (c1[x].l === c2[y].l && c1[x].a !== c2[y].a && !v4.some(z => c2[z].l === c1[x].l && c2[z].a === c1[x].a)) out.push(mk('falsa-relacion', [ci, ci + 1], [x, y], {det: `${M.corto(c1[x])} (${nombreVoz(x)}) y ${M.corto(c2[y])} (${nombreVoz(y)})`}));
    }));
    // sexta alemana → V: quintas de Mozart
    if (a1.esp === 'Al') out.forEach(p => { if (p.regla === 'paralelas-5'){ p.regla = 'quintas-mozart'; p.sev = R['quintas-mozart'].sev; } });
    // dominante secundaria que no va a su acorde
    if (a1.esp === 'sec' && !(a2.g === a1.de && a2.esp !== 'sec') && !(a2.esp === 'sec' && a2.de === a1.de)) out.push(mk('resolucion-irregular', [ci, ci + 1], [], {det: `${A.romanoTexto(K, a1)} → ${A.romanoTexto(K, a2)}`}));
    // progresión
    if (diat && a1.g !== a2.g){
      const f = A.frecuencia(a1.g, a2.g);
      // solo se señala la retrogresión de la dominante a la subdominante (V–IV, V–ii)
      if (f === 'rara' && A.FUNCION[a1.g] === 'D' && A.FUNCION[a2.g] === 'S' && !(a2.g === 3 && a2.inv === 1)) out.push(mk('retrogresion', [ci, ci + 1], [], {det: `${A.romanoTexto(K, a1)} → ${A.romanoTexto(K, a2)}`}));
    }
    // consejos de conducción (solo cuando hay algo que mejorar)
    if (diat && v4.length === 4 && a1.g !== a2.g){
      const mf = A.movimientoFund(a1.g, a2.g);
      if (mf === 'quinta' && a1.inv === 0 && a2.inv === 0){
        const comun = A.notasAcorde(K, a1).find(n1 => A.notasAcorde(K, a2).some(n2 => igualNombre(n1, n2)));
        const mantenida = comun && ['S','A','T'].some(v => igualNombre(c1[v], comun) && midi(c1[v]) === midi(c2[v]));
        if (comun && !mantenida && out.some(p => p.sev !== 'info')) out.push(mk('nota-comun', [ci, ci + 1], [], {det: `nota común: ${M.corto(comun)}`}));
      }
      if (mf === 'segunda' && a1.inv === 0 && a2.inv === 0 && out.some(p => p.regla === 'paralelas-5' || p.regla === 'paralelas-8')) out.push(mk('segunda-contrario', [ci, ci + 1], []));
    }
    return out;
  }

  // Tipo de acorde de sexta y cuarta según el contexto (Piston): cadencial, de paso,
  // de bordadura o pedal, arpegiado; null si no encaja en ninguno
  A.TIPOS64 = {cadencial: 'cadencial', paso: 'de paso', pedal: 'de bordadura (pedal)', arpegiado: 'arpegiado'};
  A.tipo64 = (K, cols, ids, i) => {
    const b = cols[i].B, pB = i > 0 && cols[i - 1].B, nB = i + 1 < cols.length && cols[i + 1].B;
    const p = i > 0 ? ids[i - 1] : null, n = i + 1 < ids.length ? ids[i + 1] : null;
    const a = ids[i].acorde;
    if (a.g === 0 && n && n.acorde.g === 4 && !n.acorde.esp && nB && midi(nB) % 12 === midi(b) % 12) return 'cadencial';
    if (pB && nB && midi(pB) === midi(b) && midi(nB) === midi(b)) return 'pedal';
    if (pB && nB){ const d1 = midi(b) - midi(pB), d2 = midi(nB) - midi(b); if (Math.abs(d1) <= 2 && Math.abs(d2) <= 2 && d1 && d2 && Math.sign(d1) === Math.sign(d2)) return 'paso'; }
    if ((p && p.acorde.g === a.g && !p.acorde.esp) || (n && n.acorde.g === a.g && !n.acorde.esp)) return 'arpegiado';
    return null;
  };

  // Cadencia formada por los dos últimos acordes
  A.cadencia = (K, i1, i2, c1, c2, final = true) => {
    if (!i1 || !i2) return null;
    const a = i1.acorde, b = i2.acorde;
    if (a.esp === 'sec' || b.esp === 'sec') return null;
    if (a.g === 4 && b.g === 0 && a.inv === 0){
      const perf = b.inv === 0 && c2 && c2.S && igualNombre(c2.S, A.notaGrado(K, 0));
      return {id: 'autentica', nombre: perf ? 'Cadencia auténtica perfecta' : 'Cadencia auténtica imperfecta',
              desc: perf ? 'V → I, los dos en estado fundamental y la tónica en el soprano: la conclusión más fuerte.' : 'V → I, pero sin la tónica en el soprano (o con algún acorde invertido): concluye, aunque con menos fuerza.'};
    }
    if (a.g === 6 && b.g === 0) return {id: 'autentica', nombre: 'Cadencia auténtica imperfecta', desc: 'vii° → I: el vii° cumple función de dominante, pero la conclusión es más débil que con el V.'};
    if (a.g === 3 && b.g === 0) return {id: 'plagal', nombre: 'Cadencia plagal', desc: 'IV → I: el «Amén». Concluye de forma suave, sin la tensión de la sensible.'};
    if (a.g === 4 && b.g === 5) return {id: 'rota', nombre: 'Cadencia rota (deceptiva)', desc: 'V → vi: el oído espera el I y llega el vi. Sorprende y prolonga la frase.'};
    if (K.modo === 'menor' && a.g === 3 && a.inv === 1 && !a.esp && b.g === 4 && !b.esp && final) return {id: 'semicadencia', nombre: 'Semicadencia frigia', desc: 'iv⁶ → V en modo menor: el bajo baja medio tono a la dominante, como en el modo frigio. Muy usada en el Barroco.'};
    if (b.g === 4 && !b.esp && b.inv === 0 && final) return {id: 'semicadencia', nombre: 'Semicadencia', desc: 'La frase se detiene en la dominante: queda en suspenso, como una pregunta.'};
    return null;
  };

  // Análisis completo. cols: columnas; opts.cifrado: lista opcional de acordes pedidos
  A.analizar = (K, cols, opts = {}) => {
    const ids = cols.map(c => A.identificar(K, c));
    // al final de la frase, el acorde mayor de tónica en menor es tercera de picardía (no V/iv)
    const ult = ids[ids.length - 1];
    if (ult && ult.acorde.esp === 'sec' && cols.length > 1){ const alt = A.identificar(K, cols[cols.length - 1], {preferirMix: true}); if (alt.acorde.esp === 'mix') ids[ids.length - 1] = alt; }
    const acordes = ids.map((id, i) => {
      const col = cols[i];
      const lleno = A.VOCES.every(v => col[v]);
      const rota = i > 0 && ids[i - 1] && ids[i - 1].acorde.g === 4 && !ids[i - 1].acorde.esp && id && id.acorde.g === 5;
      return {id, lleno, problemas: problemasAcorde(K, col, id, i, {rota})};
    });
    const enlaces = [];
    for (let i = 0; i + 1 < cols.length; i++){
      const movs = {};
      PARES.forEach(([x, y]) => { if (cols[i][x] && cols[i][y] && cols[i + 1][x] && cols[i + 1][y]) movs[x + y] = A.movimiento(cols[i][y], cols[i][x], cols[i + 1][y], cols[i + 1][x]); });
      enlaces.push({movs, problemas: problemasEnlace(K, cols[i], cols[i + 1], ids[i], ids[i + 1], i)});
    }
    // cifrado pedido
    if (opts.cifrado) opts.cifrado.forEach((c, i) => {
      if (!c || !ids[i] || !acordes[i].lleno || ids[i].ajenas.length) return;
      const a = ids[i].acorde;
      if (!A.mismoAcorde(a, Object.assign({inv: 0}, c))) acordes[i].problemas.push(mk('cifrado', [i], [], {det: `pedido ${A.romanoTexto(K, c)}, escrito ${A.romanoTexto(K, a)}`}));
    });
    // usos del acorde de sexta y cuarta
    ids.forEach((id, i) => {
      if (!id || id.acorde.esp || id.acorde.inv !== 2 || (id.info && id.info.sept) || !acordes[i].lleno || id.ajenas.length) return;
      const t = A.tipo64(K, cols, ids, i);
      id.tipo64 = t;
      if (!t) acordes[i].problemas.push(mk('seis-cuatro', [i], ['B']));
    });
    const n = cols.length;
    const cad = n >= 2 ? A.cadencia(K, ids[n - 2], ids[n - 1], cols[n - 2], cols[n - 1]) : null;
    const problemas = [...acordes.flatMap(a => a.problemas), ...enlaces.flatMap(e => e.problemas)]
      .sort((a, b) => A.SEV_ORDEN[a.sev] - A.SEV_ORDEN[b.sev] || a.cols[0] - b.cols[0]);
    const errores = problemas.filter(p => p.sev === 'error').length;
    const avisos = problemas.filter(p => p.sev === 'aviso').length;
    const completos = cols.every(c => A.VOCES.every(v => c[v]));
    return {ids, acordes, enlaces, cadencia: cad, problemas, errores, avisos, completos};
  };

  // ---------- Realización automática (para ejemplos, pistas y soluciones) ----------
  // Todas las notas posibles de una voz que pertenecen al acorde, dentro de su registro
  function notasVoz(K, notas, mbs, v, holgura = 0){
    const out = [];
    const [lo, hi] = A.RANGO[v];
    for (let o = 1; o <= 6; o++) notas.forEach((n, i) => {
      const x = {l: n.l, a: n.a, o}, m = midi(x);
      if (m >= lo - holgura && m <= hi + holgura) out.push(Object.assign(x, {mi: mbs[i], ix: i}));
    });
    return out;
  }
  const limpia = n => ({l: n.l, a: n.a, o: n.o});
  // Disposiciones válidas de un acorde (respetando las voces fijas)
  A.disposiciones = (K, c, fijas = {}) => {
    const inf = A.info(K, c);
    const notas = inf.notas, mbs = inf.miembros;
    const bajoMiembro = mbs[Math.min(c.inv || 0, mbs.length - 1)];
    const cand = {};
    A.VOCES.forEach(v => {
      if (fijas[v]){ const f = fijas[v]; const i = notas.findIndex(n => igualNombre(n, f)); cand[v] = i >= 0 ? [Object.assign(limpia(f), {mi: mbs[i], ix: i})] : []; }
      else cand[v] = notasVoz(K, notas, mbs, v).filter(x => v !== 'B' || x.mi === bajoMiembro);
    });
    const out = [];
    const sens = sensibleDe(K);
    const requeridos = inf.aumentada ? mbs : ['F', '3', ...(inf.sept ? ['7'] : []), ...(inf.nov ? ['9'] : []), ...(c.esp === 'N' ? ['5'] : [])];
    const sinDuplicar = new Set(['7', '9', ...Object.keys(inf.tendencias).map(i => mbs[i])]);
    const tieneSens = (!c.esp && (c.g === 4 || c.g === 6 || c.g === 2)) || (c.esp === 'mix' && c.g === 6 && c.sept);
    cand.B.forEach(b => cand.T.forEach(t => { if (midi(t) < midi(b) || midi(t) - midi(b) > 19) return;
      cand.A.forEach(a => { if (midi(a) < midi(t) || midi(a) - midi(t) > 12) return;
        cand.S.forEach(s => { if (midi(s) < midi(a) || midi(s) - midi(a) > 12) return;
          const ms = [s.mi, a.mi, t.mi, b.mi];
          const cnt = m => ms.filter(x => x === m).length;
          if (requeridos.some(m => !cnt(m))) return;
          if ([...sinDuplicar].some(m => cnt(m) > 1)) return;
          if ([s, a, t, b].filter(x => igualNombre(x, sens)).length > 1 && tieneSens) return;
          let costo = 0;
          if (inf.aumentada){ if (c.esp === 'It' && cnt('1') < 2) costo += 2; }
          else if (c.esp === 'N'){ if (cnt('3') < 2) costo += 3; }
          else if (inf.nov){ if (s.mi !== '9') costo += 15; if ([a, t, b].some(x => x.mi === 'F' && midi(s) - midi(x) < 13)) costo += 12; }
          else if (!inf.sept){
            if (c.inv === 0 && cnt('3') > 1) costo += A.calidad(K, c) === 'M' ? 6 : 2;
            if (c.inv === 0 && !cnt('5')) costo += 3;
            if (c.inv === 2 && cnt('5') < 2) costo += 6;
            if (c.inv === 1 && cnt('3') > 1) costo += 2;
          } else if (!cnt('5')) costo += 1;
          // registro central preferido; se evitan los unísonos (no se pueden tocar en el piano)
          costo += Math.abs(midi(s) - 70)*0.05 + Math.abs(midi(b) - 50)*0.05;
          if (midi(s) === midi(a) || midi(a) === midi(t) || midi(t) === midi(b)) costo += 5;
          out.push({col: {S: limpia(s), A: limpia(a), T: limpia(t), B: limpia(b)}, costo});
        });
      });
    }));
    return out;
  };
  const PESO = {error: 100, aviso: 9, info: 0.5};
  const cacheInfo = new Map();
  const infoC = (K, c) => { const k = A.claveTon(K) + JSON.stringify(c); if (!cacheInfo.has(k)) cacheInfo.set(k, A.info(K, c)); return cacheInfo.get(k); };
  function costoEnlace(K, c1, c2, cAc1, cAc2){
    const i1 = {acorde: cAc1, ajenas: [], miembro: miembrosDe(K, cAc1, c1), info: infoC(K, cAc1)};
    const i2 = {acorde: cAc2, ajenas: [], miembro: miembrosDe(K, cAc2, c2), info: infoC(K, cAc2)};
    let costo = 0;
    problemasEnlace(K, c1, c2, i1, i2, 0).forEach(p => { if (p.regla !== 'retrogresion' && p.regla !== 'nota-comun' && p.regla !== 'segunda-contrario' && p.regla !== 'resolucion-irregular') costo += p.regla === 'falsa-relacion' || p.regla === 'tendencia' ? 30 : PESO[p.sev]; });
    ['S','A','T'].forEach(v => { costo += Math.abs(midi(c2[v]) - midi(c1[v]))*(v === 'S' ? 0.5 : 0.8); });
    costo += Math.abs(midi(c2.B) - midi(c1.B))*0.15;
    return costo;
  }
  function miembrosDe(K, c, col){
    const inf = infoC(K, c), out = {};
    A.VOCES.forEach(v => { const i = inf.notas.findIndex(n => igualNombre(n, col[v])); if (i >= 0) out[v] = inf.miembros[i]; });
    return out;
  }
  // Realiza una sucesión de acordes. fijas: [{S?, B?, ...}] por columna. azar: ruido para variantes.
  A.realizar = (K, acordes, fijas = [], op = {}) => {
    const capas = acordes.map((c, i) => {
      let ds = A.disposiciones(K, c, fijas[i] || {});
      if (op.azar) ds.forEach(d => d.costo += Math.random()*op.azar);
      // el último acorde, con la tónica en el soprano (cadencia perfecta)
      if (op.finTonica && i === acordes.length - 1) ds.forEach(d => { if (!igualNombre(d.col.S, A.notaGrado(K, 0))) d.costo += 12; });
      ds.sort((x, y) => x.costo - y.costo);
      return ds.slice(0, op.ancho || 90);
    });
    if (capas.some(c => !c.length)) return null;
    let prev = capas[0].map(d => ({d, total: d.costo, atras: null}));
    const historia = [prev];
    for (let i = 1; i < capas.length; i++){
      const cur = capas[i].map(d => {
        let mejor = null;
        prev.forEach(p => { const t = p.total + d.costo + costoEnlace(K, p.d.col, d.col, acordes[i - 1], acordes[i]); if (!mejor || t < mejor.total) mejor = {d, total: t, atras: p}; });
        return mejor;
      });
      cur.sort((x, y) => x.total - y.total);
      prev = cur.slice(0, op.haz || 60);
      historia.push(prev);
    }
    let fin = prev[0];
    const out = [];
    while (fin){ out.unshift(fin.d.col); fin = fin.atras; }
    return {cols: out, costo: prev[0].total};
  };

  // ---------- Elección de acordes ----------
  // Acordes posibles para una nota del bajo (como fundamental o tercera; la 2.ª inversión
  // solo como I⁶₄ cadencial)
  A.acordesParaBajo = (K, n, sept = false) => {
    const out = [];
    for (let g = 0; g < 7; g++){
      const ns = A.notasAcorde(K, {g, inv: 0, sept: false});
      if (igualNombre(ns[0], n)) out.push({g, inv: 0, sept: false});
      if (igualNombre(ns[1], n) && g !== 2) out.push({g, inv: 1, sept: false});
      if (sept && g === 4 && igualNombre(ns[0], n)) out.push({g, inv: 0, sept: true});
    }
    return out;
  };
  A.acordesParaSoprano = (K, n) => {
    const out = [];
    for (let g = 0; g < 7; g++){
      if (g === 2) continue;
      const ns = A.notasAcorde(K, {g, inv: 0, sept: false});
      if (ns.some(x => igualNombre(x, n))){ out.push({g, inv: 0, sept: false}); if (g !== 6) out.push({g, inv: 1, sept: false}); else out[out.length - 1].inv = 1; }
    }
    return out;
  };
  const COSTO_FREC = {usual: 0, aveces: 4, rara: 25, repeticion: 6};
  // Elige acordes con programación dinámica según la tabla de progresiones y la cadencia
  A.elegirAcordes = (K, opciones, op = {}) => {
    const n = opciones.length;
    let prev = opciones[0].map(c => ({c, total: (c.g === 0 ? 0 : 6) + (c.inv ? 2 : 0), atras: null}));
    for (let i = 1; i < n; i++){
      prev = opciones[i].map(c => {
        let mejor = null;
        prev.forEach(p => {
          let t = p.total + COSTO_FREC[A.frecuencia(p.c.g, c.g)] + (c.inv ? 1.5 : 0) + (c.g === 2 || c.g === 6 && c.inv === 0 ? 5 : 0) + (op.azar ? Math.random()*op.azar : 0);
          if (i === n - 1) t += c.g === 0 && c.inv === 0 ? 0 : 30;
          if (i === n - 2) t += c.g === 4 ? 0 : 15;
          if (!mejor || t < mejor.total) mejor = {c, total: t, atras: p};
        });
        return mejor;
      });
    }
    prev.sort((a, b) => a.total - b.total);
    const out = []; let f = prev[0];
    while (f){ out.unshift(f.c); f = f.atras; }
    return out;
  };

  // ---------- Generación de progresiones ----------
  // Recorre la tabla de progresiones y termina en la cadencia pedida
  A.generarProgresion = (largo, cadencia = 'autentica', op = {}) => {
    const fin = {autentica: [4, 0], plagal: [3, 0], semicadencia: [null, 4], rota: [4, 5]}[cadencia];
    for (let intento = 0; intento < 300; intento++){
      const gs = [0];
      while (gs.length < largo - 2){
        const p = A.PROG[gs[gs.length - 1]];
        const pool = [...p.u, ...p.u, ...p.a].filter(g => g !== 2 && (op.vii || g !== 6));
        gs.push(M.azar(pool));
      }
      const [x, y] = fin;
      if (x === null){ const prevs = [1, 3, 0, 5].filter(g => A.frecuencia(gs[gs.length - 1], g) !== 'rara' && A.frecuencia(g, 4) !== 'rara'); if (!prevs.length) continue; gs.push(M.azar(prevs)); gs.push(4); }
      else { if (A.frecuencia(gs[gs.length - 1], x) === 'rara' || gs[gs.length - 1] === x) continue; gs.push(x, y); }
      if (gs.length !== largo) continue;
      return gs.map((g, i) => ({g, inv: 0, sept: false}));
    }
    return [0, 3, 4, 0].map(g => ({g, inv: 0, sept: false}));
  };
  // Agrega inversiones habituales (I⁶, ii⁶, IV⁶, V⁶) a una progresión en estado fundamental
  A.conInversiones = (acordes, prob = 0.35) => acordes.map((c, i) => {
    if (i === 0 || i === acordes.length - 1 || i === acordes.length - 2) return c;
    if ([0, 1, 3, 4].includes(c.g) && Math.random() < prob) return Object.assign({}, c, {inv: 1});
    return c;
  });

  // ---------- Modulación ----------
  // Tonalidades vecinas: las que difieren en a lo sumo una alteración (relativa, dominante,
  // subdominante y sus relativas)
  A.vecinas = K => {
    const out = [];
    [K.arm, K.arm + 1, K.arm - 1].forEach(n => ['mayor', 'menor'].forEach(m => { if (!(n === K.arm && m === K.modo) && Math.abs(n) <= 7) out.push(A.tonalidad(n, m)); }));
    return out;
  };
  const claveNotas = ns => ns.map(n => `${n.l}:${n.a}`).sort().join(',');
  // Acordes (tríadas diatónicas) comunes a dos tonalidades: los candidatos a acorde pivote
  A.acordesComunes = (K1, K2) => {
    const out = [];
    for (let g1 = 0; g1 < 7; g1++){
      const k1 = claveNotas(A.notasAcorde(K1, {g: g1, inv: 0}));
      for (let g2 = 0; g2 < 7; g2++) if (claveNotas(A.notasAcorde(K2, {g: g2, inv: 0})) === k1) out.push({g1, g2});
    }
    return out;
  };
  // Grado de una tonalidad respecto de otra (para nombrar la nueva tonalidad: «V», «vi»…)
  A.relacion = (K1, K2) => {
    const g = A.gradoDe(K1, K2.tonica.l);
    const n = A.notaGrado(K1, g);
    const base = ROMANO[g];
    return (n.a !== K2.tonica.a ? (K2.tonica.a > n.a ? '♯' : '♭') : '') + (K2.modo === 'mayor' ? base : base.toLowerCase());
  };

  // Texto de una lista de problemas, para las explicaciones
  A.describir = (K, p) => {
    const r = R[p.regla];
    const donde = p.cols.length === 2 ? `acordes ${p.cols[0] + 1} → ${p.cols[1] + 1}` : `acorde ${p.cols[0] + 1}`;
    return {titulo: r.titulo, donde, det: p.det || '', porque: r.porque, como: r.como, sev: r.sev, tipo: r.tipo, excepcion: r.excepcion};
  };

  window.Armonia = A;
})();
