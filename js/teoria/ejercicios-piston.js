// Ejercicios para el resto de los temas de «Harmony» de Piston: tríadas y escalas, usos del
// acorde de sexta y cuarta, notas extrañas, modulación (acorde pivote), séptimas,
// dominantes secundarias y acordes cromáticos. Mismo contrato que ejercicios.js.
(function(){
  const M = window.Musica, V = window.Visual, E = window.Ejercicios, A = window.Armonia, ED = window.ArmoniaEditor, P = window.Progreso, NE = window.NotasExtranas;
  const {azar, entre, mezclar} = M;
  const {op, resultado, tipo} = E;
  const ac = (g, inv = 0, sept = false) => ({g, inv, sept});
  const sec = (base, de, inv = 0) => ({esp: 'sec', base, de, inv});
  const ver = (K, cols, o = {}) => el => ED.crear(el, Object.assign({K, cols, soloLectura: true, panel: false, sinCifra: true, sinMarcas: true}, o));
  const analizado = (K, cols, o = {}) => el => ED.crear(el, Object.assign({K, cols, soloLectura: true, panel: false}, o));
  const sonar = (K, cols) => () => ED.crear(document.createElement('div'), {K, cols, soloLectura: true, panel: false}).tocarTodo();

  Object.assign(P.HABILIDADES, {
    'h-escalas':    {nombre: 'Escalas y modos',               leccion: 'pi-escalas',     paso: 0, ejercicio: 'h-escala'},
    'h-triadas':    {nombre: 'Tipos de tríada',               leccion: 'pi-triadas',     paso: 0, ejercicio: 'h-calidad'},
    'h-64':         {nombre: 'Usos del acorde de sexta y cuarta', leccion: 'pi-seis-cuatro', paso: 0, ejercicio: 'h-64'},
    'h-ne':         {nombre: 'Notas extrañas',                leccion: 'pi-ne-1',        paso: 0, ejercicio: 'h-ne'},
    'h-modulacion': {nombre: 'Modulación y acorde pivote',    leccion: 'pi-modulacion',  paso: 0, ejercicio: 'h-pivote'},
    'h-septimas':   {nombre: 'Acordes de séptima',            leccion: 'pi-v7',          paso: 0, ejercicio: 'h-septima'},
    'h-secundarias':{nombre: 'Dominantes secundarias',        leccion: 'pi-secundarias', paso: 0, ejercicio: 'h-secundaria'},
    'h-cromaticos': {nombre: 'Acordes alterados',             leccion: 'pi-sextas',      paso: 0, ejercicio: 'h-cromatico'}
  });
  Object.assign(P.DIAGNOSTICOS, {
    'h-ne':         {hab: 'h-ne',         msg: 'Las notas extrañas se están confundiendo. Repasemos: lo que define a cada una es cómo se llega a ella y cómo se la deja (por grado o por salto) y si cae en tiempo fuerte.'},
    'h-64':         {hab: 'h-64',         msg: 'Los usos del acorde de sexta y cuarta todavía no están claros. Repasemos: mirá qué hace el bajo antes y después.'},
    'h-secundarias':{hab: 'h-secundarias',msg: 'Te cuesta reconocer las dominantes secundarias. Repasemos: buscá la nota alterada, pensala como sensible y fijate a qué acorde lleva.'},
    'h-cromaticos': {hab: 'h-cromaticos', msg: 'Los acordes alterados se están mezclando. Repasemos cómo se construye cada uno a partir de la tónica.'}
  });

  const tonMayor = () => azar(A.TONALIDADES.filter(K => K.modo === 'mayor' && Math.abs(K.arm) <= 2));
  const ton = (max = 2) => azar(A.TONALIDADES.filter(K => Math.abs(K.arm) <= max));

  // ---------- Tipo de tríada ----------
  const CAL = {M: 'Mayor', m: 'Menor', d: 'Disminuida', A: 'Aumentada'};
  tipo('h-calidad', {nombre: 'Tipo de tríada', hab: 'h-triadas', leccion: 'pi-triadas', gen(){
    for (;;){
      const f = M.nota(entre(0, 6), azar([0, 0, 0, -1, 1]), 4);
      const q = azar(Object.keys(CAL));
      const t = M.construir(f, 3, q === 'M' || q === 'A' ? 'M' : 'm'), qn = M.construir(f, 5, q === 'd' ? 'd' : q === 'A' ? 'A' : 'J');
      if (!t || !qn || [t, qn].some(x => Math.abs(x.a) > 1)) continue;
      const ns = [f, t, qn];
      const qq = {modo: 'opciones', enunciado: '¿Qué tipo de tríada es?',
        visual(el){ V.pentagrama(el, {armonico: true, notas: ns.map(n => ({l: n.l, o: n.o, acc: n.a || null, color: 'a'}))}); },
        escuchar(){ Sonido.acorde(ns.map(M.midi)); },
        opciones: Object.keys(CAL).map(k => op(k, CAL[k])), correcta: q};
      const i3 = M.midi(t) - M.midi(f), i5 = M.midi(qn) - M.midi(f);
      qq.evaluar = r => resultado(qq, r, ok => ({diag: ok ? null : 'h-acordes', habs: [['h-triadas', ok]],
        explicacion: `<p>${ns.map(n => M.corto(n)).join(' – ')}: de la fundamental a la tercera hay ${i3} semitonos (${i3 === 4 ? 'tercera mayor' : 'tercera menor'}) y a la quinta, ${i5} (${i5 === 7 ? 'quinta justa' : i5 === 6 ? 'quinta disminuida' : 'quinta aumentada'}).</p><ul><li><b>Mayor:</b> 3.ª mayor + 5.ª justa.</li><li><b>Menor:</b> 3.ª menor + 5.ª justa.</li><li><b>Disminuida:</b> 3.ª menor + 5.ª disminuida (dos terceras menores).</li><li><b>Aumentada:</b> 3.ª mayor + 5.ª aumentada (dos terceras mayores).</li></ul>`,
        donde: ok ? '' : 'Medí por separado la tercera y la quinta desde la nota de abajo.'}));
      return qq;
    }
  }});

  // ---------- Escalas y modos ----------
  tipo('h-escala', {nombre: 'Escalas y modos', hab: 'h-escalas', leccion: 'pi-escalas', gen(o){
    const ids = o.escalas || ['mayor', 'menor-natural', 'menor-armonica', 'menor-melodica', 'dorico', 'frigio', 'lidio', 'mixolidio'];
    const id = azar(ids);
    const esc = E.ESCALAS[id];
    const t = M.nota(azar([0, 1, 2, 3, 4, 5]), 0, 4);
    const ns = E.notasEscala(t, esc.pasos).map((n, i) => Object.assign({}, n, {o: 4 + Math.floor((t.l + i)/7)}));
    const opciones = mezclar([id, ...mezclar(ids.filter(x => x !== id)).slice(0, 3)]);
    const q = {modo: 'opciones', enunciado: '¿Qué escala es?',
      visual(el){ V.pentagrama(el, {notas: ns.map(n => ({l: n.l, o: n.o, acc: n.a || null, color: 'a'})), junto: true}); },
      escuchar(){ Sonido.secuencia(ns.map(M.midi), 0.4); },
      opciones: opciones.map(x => op(x, E.ESCALAS[x].nombre[0].toUpperCase() + E.ESCALAS[x].nombre.slice(1))), correcta: id};
    const sem = esc.pasos.slice(1).map((p, i) => p - esc.pasos[i]).map(d => d === 1 ? 'S' : d === 2 ? 'T' : 'T½').join(' ');
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'alteraciones', habs: [['h-escalas', ok]],
      explicacion: `<p>Distancias entre notas: <b>${sem}</b>. Es la escala ${esc.nombre}.</p><p>Claves para reconocerlas: mayor (T T S T T T S); menor natural (T S T T S T T); armónica: como la natural pero con el 7.º elevado (tono y medio entre 6.º y 7.º); melódica ascendente: 6.º y 7.º elevados; dórico = menor con 6.ª mayor; frigio = menor con 2.ª menor; lidio = mayor con 4.ª aumentada; mixolidio = mayor con 7.ª menor.</p>`,
      donde: ok ? '' : 'Ubicá los semitonos: dónde caen define la escala.'}));
    return q;
  }});

  // ---------- Usos del acorde de sexta y cuarta ----------
  const CTX64 = {
    cadencial: [[ac(3), ac(0, 2), ac(4), ac(0)], [ac(1, 1), ac(0, 2), ac(4), ac(0)]],
    paso: [[ac(0), ac(4, 2), ac(0, 1)], [ac(3, 1), ac(0, 2), ac(1, 1)], [ac(0, 1), ac(4, 2), ac(0)]],
    pedal: [[ac(0), ac(3, 2), ac(0)], [ac(4), ac(0, 2), ac(4)]],
    arpegiado: [[ac(0), ac(0, 1), ac(0, 2), ac(4)], [ac(3), ac(3, 1), ac(3, 2), ac(4)]]
  };
  tipo('h-64', {nombre: 'Usos del acorde de sexta y cuarta', hab: 'h-64', leccion: 'pi-seis-cuatro', gen(){
    for (let k = 0; k < 40; k++){
      const K = tonMayor();
      const t = azar(Object.keys(CTX64));
      const p = azar(CTX64[t]);
      const r = A.realizar(K, p, [], {azar: 4});
      if (!r) continue;
      const an = A.analizar(K, r.cols);
      const i = p.findIndex(c => c.inv === 2);
      if (!an.ids[i] || an.ids[i].tipo64 !== t) continue;
      const q = {modo: 'opciones', enunciado: `¿Qué uso tiene el acorde de sexta y cuarta (${A.romanoTexto(K, p[i])}, resaltado)?`,
        visual: ver(K, r.cols, {sinCifra: false, resaltar: {voces: ['B'], cols: [i]}}), escuchar: sonar(K, r.cols),
        opciones: Object.keys(CTX64).map(x => op(x, A.TIPOS64[x][0].toUpperCase() + A.TIPOS64[x].slice(1))), correcta: t};
      q.evaluar = rr => resultado(q, rr, ok => ({diag: ok ? null : 'h-64', habs: [['h-64', ok]],
        explicacion: `<p>Lo decide el bajo:</p><ul><li><b>Cadencial:</b> I⁶₄ en tiempo fuerte antes del V, con el mismo bajo (la dominante). Suena como el V adornado.</li><li><b>De paso:</b> el bajo pasa por grado conjunto entre dos acordes (como I – V⁶₄ – I⁶).</li><li><b>De bordadura (pedal):</b> el bajo se queda quieto y las voces superiores bordan (I – IV⁶₄ – I).</li><li><b>Arpegiado:</b> el bajo recorre las notas de un mismo acorde.</li></ul><p>Acá es <b>${A.TIPOS64[t]}</b>: ${t === 'cadencial' ? 'va al V con el mismo bajo.' : t === 'paso' ? 'el bajo se mueve por grado en la misma dirección.' : t === 'pedal' ? 'el bajo no se mueve.' : 'el acorde es el mismo que el de al lado, con otra nota en el bajo.'}</p>`,
        donde: ok ? '' : 'Mirá solo la línea del bajo en los acordes de antes y de después.', alMostrar: analizado(K, r.cols, {resaltar: {voces: ['B'], cols: [i]}})}));
      return q;
    }
  }});

  // ---------- Notas extrañas ----------
  tipo('h-ne', {nombre: 'Notas extrañas', hab: 'h-ne', leccion: 'pi-ne-1', gen(o){
    const tipos = o.tipos || ['paso', 'bordadura', 'apoyatura', 'retardo', 'anticipacion', 'escapada'];
    let ej = null;
    while (!ej){ const t = azar(tipos); ej = NE.generar(t); }
    NE.marcar(ej, 'a', false);
    const opts = mezclar([ej.tipo, ...mezclar(tipos.filter(x => x !== ej.tipo)).slice(0, Math.min(3, tipos.length - 1))]);
    const q = {modo: 'opciones', enunciado: '¿Qué tipo de nota extraña es la nota resaltada?',
      visual(el){ NE.dibujar(el, ej); }, escuchar(){ NE.tocar(ej); },
      opciones: opts.map(x => op(x, NE.TIPOS[x].nombre)), correcta: ej.tipo};
    q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'h-ne', habs: [['h-ne', ok]],
      explicacion: NE.explicar(ej), donde: ok ? '' : 'Mirá cómo se llega a la nota (¿por grado, por salto, repitiendo?) y cómo se la deja.',
      alMostrar(el){ const e2 = JSON.parse(JSON.stringify(ej)); NE.marcar(e2, 'a', true); NE.dibujar(el, e2); }}));
    return q;
  }});

  // ---------- Acorde pivote ----------
  tipo('h-pivote', {nombre: 'Modulación: acorde pivote', hab: 'h-modulacion', leccion: 'pi-modulacion', gen(){
    for (;;){
      const K1 = ton(2);
      const K2 = azar(A.vecinas(K1).filter(k => Math.abs(k.arm) <= 3));
      const comunes = A.acordesComunes(K1, K2).filter(p => p.g1 !== 6 && p.g2 !== 6);
      if (!comunes.length) continue;
      const cor = azar(comunes);
      const malas = [];
      for (let g1 = 0; g1 < 7; g1++) if (g1 !== 6 && !comunes.some(p => p.g1 === g1)) malas.push(g1);
      const opts = mezclar([cor.g1, ...mezclar(malas).slice(0, 3)]);
      const nom = g => `${A.romanoTexto(K1, ac(g))} (${A.nombreAcorde(K1, ac(g))})`;
      const q = {modo: 'opciones', enunciado: `Para modular de <b>${K1.nombre}</b> a <b>${K2.nombre}</b> (${A.relacion(K1, K2)}), ¿qué acorde de ${K1.nombre} puede servir de <b>pivote</b>?`,
        opciones: opts.map(g => op(g, nom(g))), correcta: String(cor.g1)};
      q.evaluar = r => resultado(q, r, ok => ({diag: ok ? null : 'h-modulacion', habs: [['h-modulacion', ok]],
        explicacion: `<p>Un acorde pivote pertenece a las dos tonalidades: se escucha primero en la vieja y se reinterpreta en la nueva. Entre ${K1.nombre} y ${K2.nombre} los acordes comunes son: ${comunes.map(p => `<b>${A.romanoTexto(K1, ac(p.g1))}</b> = ${A.romanoTexto(K2, ac(p.g2))}`).join(', ')}.</p><p>Lo mejor es que en la nueva tonalidad el pivote tenga función de subdominante (ii o IV), porque lleva naturalmente a su V y a la cadencia que confirma la tonalidad.</p>`,
        donde: ok ? '' : `Comprobá si las tres notas del acorde están en las dos tonalidades (mirá las armaduras: ${M.describirArmadura(K1.arm)} y ${M.describirArmadura(K2.arm)}).`}));
      return q;
    }
  }});

  // ---------- Inversiones del V⁷ ----------
  tipo('h-septima', {nombre: 'Inversiones del V⁷', hab: 'h-septimas', leccion: 'pi-v7', gen(){
    for (;;){
      const K = ton(2);
      const inv = entre(0, 3);
      const p = [ac(0), ac(4, inv, true), ac(0, inv === 3 ? 1 : 0)];
      const r = A.realizar(K, p, [], {azar: 4});
      if (!r) continue;
      const opts = [0, 1, 2, 3].map(i => op(i, A.romanoTexto(K, ac(4, i, true))));
      const q = {modo: 'opciones', enunciado: `${K.nombre}: ¿en qué posición está el V⁷ (resaltado)?`,
        visual: ver(K, r.cols, {resaltar: {voces: ['S', 'A', 'T', 'B'], cols: [1]}}), escuchar: sonar(K, r.cols), opciones: opts, correcta: String(inv)};
      const ns = A.notasAcorde(K, p[1]);
      q.evaluar = rr => resultado(q, rr, ok => ({diag: ok ? null : 'h-acordes', habs: [['h-septimas', ok]],
        explicacion: `<p>El V⁷ es ${ns.map(x => M.corto(x)).join(' – ')}. Con ${['la fundamental', 'la tercera', 'la quinta', 'la séptima'][inv]} (${M.corto(ns[inv])}) en el bajo es <b>${A.romanoTexto(K, p[1])}</b>. Las cifras salen de los intervalos sobre el bajo: ⁷ (fundamental), ⁶₅ (tercera), ⁴₃ (quinta), ⁴₂ (séptima; resuelve a I⁶ porque la séptima del bajo baja).</p>`,
        donde: ok ? '' : 'Mirá qué nota del acorde está en el bajo.', alMostrar: analizado(K, r.cols)}));
      return q;
    }
  }});

  // ---------- Dominantes secundarias ----------
  tipo('h-secundaria', {nombre: 'Dominantes secundarias', hab: 'h-secundarias', leccion: 'pi-secundarias', gen(){
    for (;;){
      const K = tonMayor();
      const de = azar([1, 3, 4, 5]);
      const base = azar(['V', 'V7']);
      const p = [ac(0), sec(base, de), ac(de), ...(de === 4 ? [ac(0)] : [ac(4), ac(0)])];
      const r = A.realizar(K, p, [], {azar: 3, finTonica: true});
      if (!r) continue;
      const opts = mezclar([de, ...mezclar([1, 3, 4, 5].filter(x => x !== de)).slice(0, 3)]);
      const nom = x => A.romanoTexto(K, sec(base, x));
      const inf = A.info(K, p[1]);
      const sens = inf.notas[1];
      const q = {modo: 'opciones', enunciado: `${K.nombre}: ¿qué acorde es el resaltado?`,
        visual: ver(K, r.cols, {resaltar: {voces: ['S', 'A', 'T', 'B'], cols: [1]}}), escuchar: sonar(K, r.cols), opciones: opts.map(x => op(x, nom(x))), correcta: String(de)};
      q.evaluar = rr => resultado(q, rr, ok => ({diag: ok ? null : 'h-secundarias', habs: [['h-secundarias', ok]],
        explicacion: `<p>El acorde es ${inf.notas.map(x => M.corto(x)).join(' – ')}: un acorde mayor${base === 'V7' ? ' con séptima menor' : ''} que no pertenece a ${K.nombre}. La nota alterada, <b>${M.corto(sens)}</b>, funciona como sensible de <b>${M.corto(A.notaGrado(K, de))}</b>: el acorde es el ${base === 'V7' ? 'V⁷' : 'V'} de ${A.romanoTexto(K, ac(de))}, y por eso resuelve a ese acorde.</p>`,
        donde: ok ? '' : 'Buscá la nota alterada, subila medio tono y fijate qué grado de la escala es: ese es el acorde «tonicizado».', alMostrar: analizado(K, r.cols)}));
      return q;
    }
  }});

  // ---------- Acordes alterados ----------
  const CROM = {
    N: {nom: 'Sexta napolitana (N⁶)', prog: [ac(0), {esp: 'N', inv: 1}, ac(4), ac(0)]},
    It: {nom: 'Sexta aumentada italiana', prog: [ac(0), {esp: 'It'}, ac(4), ac(0)]},
    Fr: {nom: 'Sexta aumentada francesa', prog: [ac(0), {esp: 'Fr'}, ac(4), ac(0)]},
    Al: {nom: 'Sexta aumentada alemana', prog: [ac(0), {esp: 'Al'}, ac(0, 2), ac(4), ac(0)]},
    bVI: {nom: '♭VI (intercambio modal)', prog: [ac(0), {esp: 'mix', g: 5, inv: 0}, ac(4), ac(0)]},
    iv: {nom: 'iv (intercambio modal)', prog: [ac(0), {esp: 'mix', g: 3, inv: 0}, ac(4), ac(0)]},
    V7V: {nom: 'V⁷/V (dominante secundaria)', prog: [ac(0), sec('V7', 4), ac(4), ac(0)]}
  };
  tipo('h-cromatico', {nombre: 'Acordes alterados', hab: 'h-cromaticos', leccion: 'pi-sextas', gen(o){
    for (;;){
      const K = azar(A.TONALIDADES.filter(k => k.modo === 'mayor' && Math.abs(k.arm) <= 1));
      const ids = o.tipos || Object.keys(CROM);
      const id = azar(ids);
      const p = CROM[id].prog;
      const r = A.realizar(K, p, [], {azar: 2, finTonica: true});
      if (!r) continue;
      const opts = mezclar([id, ...mezclar(ids.filter(x => x !== id)).slice(0, 3)]);
      const inf = A.info(K, p[1]);
      const q = {modo: 'opciones', enunciado: `${K.nombre}: ¿qué acorde alterado es el resaltado?`,
        visual: ver(K, r.cols, {resaltar: {voces: ['S', 'A', 'T', 'B'], cols: [1]}}), escuchar: sonar(K, r.cols), opciones: opts.map(x => op(x, CROM[x].nom)), correcta: id};
      q.evaluar = rr => resultado(q, rr, ok => ({diag: ok ? null : 'h-cromaticos', habs: [['h-cromaticos', ok]],
        explicacion: `<p>Notas del acorde: <b>${inf.notas.map(x => M.corto(x)).join(' – ')}</b>. ${A.nombreAcorde(K, p[1])}.</p><ul><li><b>N⁶:</b> acorde mayor sobre el ♭2, en primera inversión.</li><li><b>Sextas aumentadas:</b> ♭6 en el bajo y ♯4 arriba (sexta aumentada); la italiana agrega solo la tónica, la francesa el 2 y la alemana el ♭3.</li><li><b>♭VI e iv:</b> acordes del modo menor usados en mayor.</li><li><b>V⁷/V:</b> acorde mayor con séptima sobre el 2.º grado, con el ♯4 como sensible de la dominante.</li></ul>`,
        donde: ok ? '' : 'Buscá las notas alteradas y su relación con la tónica: ♭2, ♭6, ♯4…', alMostrar: analizado(K, r.cols)}));
      return q;
    }
  }});
})();
