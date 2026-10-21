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
  // Un acorde es {g: grado 0–6, inv: 0–3, sept: bool}
  const ROMANO = ['I','II','III','IV','V','VI','VII'];
  const elevaSensible = (K, g) => K.modo === 'menor' && (g === 4 || g === 6);
  A.MIEMBROS = ['F', '3', '5', '7'];
  // Notas del acorde, en orden: fundamental, tercera, quinta (y séptima)
  A.notasAcorde = (K, c) => {
    const el = elevaSensible(K, c.g);
    const out = [0, 2, 4].map(d => A.notaGrado(K, c.g + d, el));
    if (c.sept) out.push(A.notaGrado(K, c.g + 6, el));
    return out;
  };
  const pc = n => ((M.PC[n.l] + n.a) % 12 + 12) % 12;
  A.calidad = (K, c) => {
    const [f, t, q] = A.notasAcorde(K, c);
    const i3 = (pc(t) - pc(f) + 12) % 12, i5 = (pc(q) - pc(f) + 12) % 12;
    return i3 === 4 && i5 === 7 ? 'M' : i3 === 3 && i5 === 7 ? 'm' : i3 === 3 && i5 === 6 ? 'd' : i3 === 4 && i5 === 8 ? 'A' : '?';
  };
  const SUP = {'6': '⁶', '7': '⁷', '4': '⁴', '5': '⁵', '3': '³', '2': '²'};
  A.CIFRA = {false: ['', '6', '64'], true: ['7', '65', '43', '42']};
  // Numeral romano con cifrado (V⁷, I⁶, ii⁶, vii°⁶, I⁶₄…)
  A.romano = (K, c, op = {}) => {
    const q = A.calidad(K, c);
    let r = ROMANO[c.g];
    if (q === 'm' || q === 'd') r = r.toLowerCase();
    if (q === 'd') r += c.sept ? 'ø' : '°';
    if (q === 'A') r += '+';
    if (c.sept && q === 'd' && K.modo === 'menor' && c.g === 6) r = r.replace('ø', '°');
    if (op.sinCifra) return r;
    const cif = A.CIFRA[!!c.sept][c.inv] || '';
    if (op.texto) return r + cif;
    if (cif.length === 2) return `${r}<span class="cif"><sup>${cif[0]}</sup><sub>${cif[1]}</sub></span>`;
    return r + (cif ? `<sup>${cif}</sup>` : '');
  };
  A.romanoTexto = (K, c) => A.romano(K, c, {sinCifra: true}) + (A.CIFRA[!!c.sept][c.inv] || '').split('').map(x => SUP[x] || x).join('');
  const CAL_NOMBRE = {M: 'mayor', m: 'menor', d: 'disminuido', A: 'aumentado'};
  A.nombreAcorde = (K, c) => {
    const f = A.notasAcorde(K, c)[0];
    const q = A.calidad(K, c);
    if (c.sept) return `${M.nombre(f)} ${q === 'M' ? 'con séptima (dominante)' : q === 'd' ? 'disminuido con séptima' : 'con séptima'}`;
    return `${M.nombre(f)} ${CAL_NOMBRE[q] || ''}`;
  };
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
  A.candidatos = K => {
    const out = [];
    for (let g = 0; g < 7; g++) [false, true].forEach(sept => out.push({g, sept}));
    return out;
  };
  // Devuelve {acorde, miembro: {S,A,T,B}, presentes, ajenas, inv} o null si no hay notas
  A.identificar = (K, col) => {
    const voces = A.VOCES.filter(v => col[v]);
    if (!voces.length) return null;
    let mejor = null;
    A.candidatos(K).forEach(c => {
      const ns = A.notasAcorde(K, {g: c.g, inv: 0, sept: c.sept});
      const miembro = {};
      let ok = 0;
      voces.forEach(v => { const i = ns.findIndex(n => igualNombre(n, col[v])); if (i >= 0){ miembro[v] = A.MIEMBROS[i]; ok++; } });
      const tieneSept = Object.values(miembro).includes('7');
      if (c.sept && !tieneSept) return;            // un acorde de séptima necesita la séptima
      const pres = new Set(Object.values(miembro));
      const punt = ok*10 + (pres.has('F') ? 3 : 0) + (pres.has('3') ? 2 : 0) + (col.B && miembro.B === 'F' ? 1 : 0) - (c.sept ? 1 : 0);
      if (!mejor || punt > mejor.punt) mejor = {punt, g: c.g, sept: c.sept, miembro, ok};
    });
    const ajenas = voces.filter(v => !mejor.miembro[v]);
    const mb = col.B ? mejor.miembro.B : null;
    const inv = mb === 'F' ? 0 : mb === '3' ? 1 : mb === '5' ? 2 : mb === '7' ? 3 : 0;
    const acorde = {g: mejor.g, inv, sept: mejor.sept};
    const presentes = new Set(Object.values(mejor.miembro));
    // reconocido: al menos dos voces forman parte de un acorde de la tonalidad
    return {acorde, miembro: mejor.miembro, presentes, ajenas, completo: voces.length === 4, reconocido: mejor.ok >= 2};
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
    const c = id.acorde;
    const miembros = A.VOCES.map(v => id.miembro[v]);
    const cuenta = m => miembros.filter(x => x === m).length;
    if (!cuenta('F')) out.push(mk('sin-fund', [ci], []));
    if (!cuenta('3')) out.push(mk('sin-tercera', [ci], []));
    if (c.sept && !cuenta('7')) out.push(mk('sin-septima', [ci], []));
    if (cuenta('5') === 0 && cuenta('F') >= 2 && cuenta('3') === 1) out.push(mk('sin-quinta', [ci], []));
    // duplicaciones
    const sens = sensibleDe(K);
    const conSensible = A.VOCES.filter(v => igualNombre(col[v], sens));
    if (conSensible.length > 1 && (c.g === 4 || c.g === 6 || c.g === 2)) out.push(mk('dup-sensible', [ci], conSensible));
    if (c.sept && cuenta('7') > 1) out.push(mk('dup-septima', [ci], A.VOCES.filter(v => id.miembro[v] === '7')));
    const q = A.calidad(K, c);
    if (!c.sept && c.inv === 0 && cuenta('3') >= 2 && q === 'M' && !(opts && opts.rota)) out.push(mk('dup-tercera', [ci], A.VOCES.filter(v => id.miembro[v] === '3')));
    if (!c.sept && c.inv === 2 && cuenta('5') < 2) out.push(mk('dup-64', [ci], ['B']));
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
    // sensible: V o vii° hacia I o vi
    const sens = sensibleDe(K), ton = A.notaGrado(K, 0);
    if ((a1.g === 4 || a1.g === 6) && (a2.g === 0 || a2.g === 5)){
      v4.forEach(v => {
        if (!igualNombre(c1[v], sens)) return;
        const d = midi(c2[v]) - midi(c1[v]);
        if (d === 1 && igualNombre(c2[v], ton)) return;
        if (v === 'S') out.push(mk('sensible', [ci, ci + 1], ['S']));
        else if (a2.g === 0 && d < 0 && d >= -4 && i2.miembro[v] === '5') out.push(mk('sensible-int', [ci, ci + 1], [v]));
        else if (a2.g === 0 && d !== 1 && v !== 'B') out.push(mk('sensible-otra', [ci, ci + 1], [v]));
      });
    }
    // séptima: resuelve bajando por grado
    if (a1.sept){
      v4.forEach(v => {
        if (i1.miembro[v] !== '7') return;
        const d = midi(c2[v]) - midi(c1[v]);
        if (!(d === -1 || d === -2 || d === 0 && a1.g === a2.g)) out.push(mk('septima', [ci, ci + 1], [v]));
      });
    }
    // progresión
    if (a1.g !== a2.g){
      const f = A.frecuencia(a1.g, a2.g);
      // solo se señala la retrogresión de la dominante a la subdominante (V–IV, V–ii)
      if (f === 'rara' && A.FUNCION[a1.g] === 'D' && A.FUNCION[a2.g] === 'S' && !(a2.g === 3 && a2.inv === 1)) out.push(mk('retrogresion', [ci, ci + 1], [], {det: `${A.romanoTexto(K, a1)} → ${A.romanoTexto(K, a2)}`}));
    }
    // consejos de conducción (solo cuando hay algo que mejorar)
    if (v4.length === 4 && a1.g !== a2.g){
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

  // Cadencia formada por los dos últimos acordes
  A.cadencia = (K, i1, i2, c1, c2, final = true) => {
    if (!i1 || !i2) return null;
    const a = i1.acorde, b = i2.acorde;
    if (a.g === 4 && b.g === 0 && a.inv === 0){
      const perf = b.inv === 0 && c2 && c2.S && igualNombre(c2.S, A.notaGrado(K, 0));
      return {id: 'autentica', nombre: perf ? 'Cadencia auténtica perfecta' : 'Cadencia auténtica imperfecta',
              desc: perf ? 'V → I, los dos en estado fundamental y la tónica en el soprano: la conclusión más fuerte.' : 'V → I, pero sin la tónica en el soprano (o con algún acorde invertido): concluye, aunque con menos fuerza.'};
    }
    if (a.g === 6 && b.g === 0) return {id: 'autentica', nombre: 'Cadencia auténtica imperfecta', desc: 'vii° → I: el vii° cumple función de dominante, pero la conclusión es más débil que con el V.'};
    if (a.g === 3 && b.g === 0) return {id: 'plagal', nombre: 'Cadencia plagal', desc: 'IV → I: el «Amén». Concluye de forma suave, sin la tensión de la sensible.'};
    if (a.g === 4 && b.g === 5) return {id: 'rota', nombre: 'Cadencia rota (deceptiva)', desc: 'V → vi: el oído espera el I y llega el vi. Sorprende y prolonga la frase.'};
    if (b.g === 4 && b.inv === 0 && final) return {id: 'semicadencia', nombre: 'Semicadencia', desc: 'La frase se detiene en la dominante: queda en suspenso, como una pregunta.'};
    return null;
  };

  // Análisis completo. cols: columnas; opts.cifrado: lista opcional de acordes pedidos
  A.analizar = (K, cols, opts = {}) => {
    const ids = cols.map(c => A.identificar(K, c));
    const acordes = ids.map((id, i) => {
      const col = cols[i];
      const lleno = A.VOCES.every(v => col[v]);
      const rota = i > 0 && ids[i - 1] && ids[i - 1].acorde.g === 4 && id && id.acorde.g === 5;
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
      if (a.g !== c.g || a.inv !== c.inv || !!a.sept !== !!c.sept) acordes[i].problemas.push(mk('cifrado', [i], [], {det: `pedido ${A.romanoTexto(K, c)}, escrito ${A.romanoTexto(K, a)}`}));
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
  function notasVoz(K, notas, v, holgura = 0){
    const out = [];
    const [lo, hi] = A.RANGO[v];
    for (let o = 1; o <= 6; o++) notas.forEach((n, i) => {
      const x = {l: n.l, a: n.a, o}, m = midi(x);
      if (m >= lo - holgura && m <= hi + holgura) out.push(Object.assign(x, {mi: A.MIEMBROS[i]}));
    });
    return out;
  }
  const limpia = n => ({l: n.l, a: n.a, o: n.o});
  // Disposiciones válidas de un acorde (respetando las voces fijas)
  A.disposiciones = (K, c, fijas = {}) => {
    const notas = A.notasAcorde(K, c);
    const bajoMiembro = A.MIEMBROS[c.inv];
    const cand = {};
    A.VOCES.forEach(v => {
      if (fijas[v]){ const f = fijas[v]; const i = notas.findIndex(n => igualNombre(n, f)); cand[v] = i >= 0 ? [Object.assign(limpia(f), {mi: A.MIEMBROS[i]})] : []; }
      else cand[v] = notasVoz(K, notas, v).filter(x => v !== 'B' || x.mi === bajoMiembro);
    });
    const out = [];
    const sens = sensibleDe(K);
    cand.B.forEach(b => cand.T.forEach(t => { if (midi(t) < midi(b) || midi(t) - midi(b) > 19) return;
      cand.A.forEach(a => { if (midi(a) < midi(t) || midi(a) - midi(t) > 12) return;
        cand.S.forEach(s => { if (midi(s) < midi(a) || midi(s) - midi(a) > 12) return;
          const ms = [s.mi, a.mi, t.mi, b.mi];
          const cnt = m => ms.filter(x => x === m).length;
          if (!cnt('F') || !cnt('3') || (c.sept && !cnt('7'))) return;
          if (c.sept && cnt('7') > 1) return;
          if ([s, a, t, b].filter(x => igualNombre(x, sens)).length > 1 && (c.g === 4 || c.g === 6 || c.g === 2)) return;
          let costo = 0;
          if (!c.sept){
            if (c.inv === 0 && cnt('3') > 1) costo += A.calidad(K, c) === 'M' ? 6 : 2;
            if (c.inv === 0 && !cnt('5')) costo += 3;
            if (c.inv === 2 && cnt('5') < 2) costo += 6;
            if (c.inv === 1 && cnt('3') > 1) costo += 2;
          } else if (!cnt('5')) costo += 1;
          // registro central preferido
          costo += Math.abs(midi(s) - 70)*0.05 + Math.abs(midi(b) - 50)*0.05;
          out.push({col: {S: limpia(s), A: limpia(a), T: limpia(t), B: limpia(b)}, costo});
        });
      });
    }));
    return out;
  };
  const PESO = {error: 100, aviso: 9, info: 0.5};
  function costoEnlace(K, c1, c2, cAc1, cAc2){
    const i1 = {acorde: cAc1, ajenas: [], miembro: miembrosDe(K, cAc1, c1)};
    const i2 = {acorde: cAc2, ajenas: [], miembro: miembrosDe(K, cAc2, c2)};
    let costo = 0;
    problemasEnlace(K, c1, c2, i1, i2, 0).forEach(p => { if (p.regla !== 'retrogresion' && p.regla !== 'nota-comun' && p.regla !== 'segunda-contrario') costo += PESO[p.sev]; });
    ['S','A','T'].forEach(v => { costo += Math.abs(midi(c2[v]) - midi(c1[v]))*(v === 'S' ? 0.5 : 0.8); });
    costo += Math.abs(midi(c2.B) - midi(c1.B))*0.15;
    return costo;
  }
  function miembrosDe(K, c, col){
    const ns = A.notasAcorde(K, c), out = {};
    A.VOCES.forEach(v => { const i = ns.findIndex(n => igualNombre(n, col[v])); if (i >= 0) out[v] = A.MIEMBROS[i]; });
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

  // Texto de una lista de problemas, para las explicaciones
  A.describir = (K, p) => {
    const r = R[p.regla];
    const donde = p.cols.length === 2 ? `acordes ${p.cols[0] + 1} → ${p.cols[1] + 1}` : `acorde ${p.cols[0] + 1}`;
    return {titulo: r.titulo, donde, det: p.det || '', porque: r.porque, como: r.como, sev: r.sev, tipo: r.tipo, excepcion: r.excepcion};
  };

  window.Armonia = A;
})();
