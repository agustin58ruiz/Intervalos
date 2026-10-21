// El resto de los temas de «Harmony» de Walter Piston, en tres unidades: armonía diatónica
// (escalas, tríadas, tonalidad, sexta y cuarta, ritmo armónico, notas extrañas, modulación,
// secuencias, séptimas y novena), cromatismo (dominantes secundarias, resoluciones
// irregulares, intercambio modal, napolitana, sextas aumentadas, otros acordes cromáticos,
// modulación enarmónica, acordes de novena, oncena y trecena) y la armonía posterior.
// Los textos son propios: el libro es la referencia de los conceptos, no se copia.
(function(){
  const M = window.Musica, V = window.Visual, A = window.Armonia, ED = window.ArmoniaEditor, L = window.Lecciones, NE = window.NotasExtranas, E = window.Ejercicios;
  const {h, caja, botones, msg} = L.util;
  const ac = (g, inv = 0, sept = false) => ({g, inv, sept});
  const sec = (base, de, inv = 0) => ({esp: 'sec', base, de, inv});
  const n = (l, o, a = 0) => ({l, a, o});
  const DO = A.tonalidad(0, 'mayor'), LAm = A.tonalidad(0, 'menor'), DOm = A.tonalidad(-3, 'menor');
  const realizar = (K, p, o = {}) => (A.realizar(K, p, [], Object.assign({finTonica: p[p.length - 1].g === 0 && !p[p.length - 1].esp && !p.some(c => c.nov)}, o)) || {cols: []}).cols;
  const ver = (el, K, cols, o = {}) => ED.crear(caja(el), Object.assign({K, cols, soloLectura: true, panel: false}, o));
  // Botones que muestran y hacen sonar varios ejemplos en el mismo lugar
  function ejemplos(el, K, lista, o = {}){
    const z = caja(el);
    const mostrar = (k, sonar = true) => {
      const it = lista[k];
      const KK = it.K || K;
      const cols = it.cols || realizar(KK, it.prog, it.op);
      const ed = ED.crear(z, Object.assign({K: KK, cols, soloLectura: true, panel: !!o.panel}, it.ed || {}));
      if (sonar) ed.tocarTodo();
      if (it.texto) msg(el, it.texto);
    };
    botones(el, Object.keys(lista).map(k => [`▶ ${k}`, () => mostrar(k)]));
    mostrar(Object.keys(lista)[0], false);
  }
  // Un acorde o una sucesión de acordes con cualquier cantidad de notas (sin análisis)
  function acordes(el, lista, o = {}){
    const z = caja(el, 'lz-pg');
    const mostrar = (k, sonar = true) => {
      const it = lista[k];
      V.pentagrama(z, {armonico: true, notas: it.notas.map(x => ({l: x.l, o: x.o, acc: x.a ? x.a : (x.nat ? 0 : null), color: x.color})), clave: it.clave || 'treble'});
      if (sonar) Sonido.acorde(it.notas.map(M.midi));
      if (it.texto) msg(el, it.texto);
    };
    botones(el, Object.keys(lista).map(k => [`▶ ${k}`, () => mostrar(k)]));
    mostrar(Object.keys(lista)[0], false);
  }
  // Escala en el pentagrama con los pasos marcados
  function escala(el, lista){
    const z = caja(el, 'lz-pg');
    const mostrar = (k, sonar = true) => {
      const [t, id] = lista[k];
      const esc = E.ESCALAS[id];
      const ns = E.notasEscala(t, esc.pasos).map((x, i) => Object.assign({}, x, {o: t.o + Math.floor((t.l + i)/7)}));
      const pasos = esc.pasos.slice(1).map((p, i) => p - esc.pasos[i]);
      V.pentagrama(z, {junto: true, notas: ns.map((x, i) => ({l: x.l, o: x.o, acc: x.a || null, color: i && pasos[i - 1] === 1 ? 'b' : i && pasos[i - 1] === 3 ? 'bad' : 'a', texto: i ? (pasos[i - 1] === 1 ? 'S' : pasos[i - 1] === 2 ? 'T' : 'T½') : ''}))});
      if (sonar) Sonido.secuencia(ns.map(M.midi), 0.38);
      msg(el, `<b>${M.corto(t)} ${esc.nombre}</b>: ${pasos.map(d => d === 1 ? 'S' : d === 2 ? 'T' : 'T½').join(' ')}`);
    };
    botones(el, Object.keys(lista).map(k => [`▶ ${k}`, () => mostrar(k)]));
    mostrar(Object.keys(lista)[0], false);
  }
  // Ejemplo de nota extraña
  function notaExtrana(el, tipos){
    const z = caja(el, 'lz-pg');
    const mostrar = t => { const ej = NE.generar(t, {K: DO}); if (!ej) return; NE.marcar(ej, 'a', true); NE.dibujar(z, ej); NE.tocar(ej); msg(el, NE.explicar(ej)); };
    botones(el, tipos.map(t => [`▶ ${NE.TIPOS[t].nombre}`, () => mostrar(t)]));
    const ej = NE.generar(tipos[0], {K: DO}); if (ej){ NE.marcar(ej, 'a', true); NE.dibujar(z, ej); msg(el, NE.explicar(ej)); }
  }
  // Una progresión con ritmo armónico: [acordes (columnas), duraciones en negras]
  function ritmoArmonico(el, K, casos){
    const z = caja(el);
    const mostrar = k => {
      const [prog, durs] = casos[k];
      const cols = realizar(K, prog);
      ED.crear(z, {K, cols, soloLectura: true, panel: false, audioVoces: false});
      Sonido.parar();
      let t = Sonido.ahora() + 0.08;
      cols.forEach((c, i) => { const d = durs[i]*0.5; A.VOCES.forEach(v => Sonido.nota(M.midi(c[v]), t, d*0.95)); t += d; });
      msg(el, `Duraciones (en negras): ${durs.join(' – ')}`);
    };
    botones(el, Object.keys(casos).map(k => [`▶ ${k}`, () => mostrar(k)]));
    ED.crear(z, {K, cols: realizar(K, Object.values(casos)[0][0]), soloLectura: true, panel: false, audioVoces: false});
  }

  // =====================================================================================
  L.agregarUnidad('piston-diatonica', 'Piston I: armonía diatónica', 'Escalas, tríadas, tonalidad, el acorde de sexta y cuarta, ritmo armónico, notas extrañas, modulación, secuencias y acordes de séptima y novena.', [

    {id: 'pi-escalas', titulo: 'Escalas y modos', resumen: 'Mayor, las tres menores y los modos.', pasos: [
      {etapa: 'aprender', titulo: 'La escala mayor y las menores', texto: `<p>La armonía tonal se construye sobre dos escalas: la <b>mayor</b> y la <b>menor</b>. La menor tiene tres formas, porque sus grados 6.º y 7.º cambian según la función:</p><ul><li><b>Menor natural:</b> la de la armadura, sin cambios.</li><li><b>Menor armónica:</b> eleva el 7.º grado para tener sensible y un V mayor. Deja un salto de tono y medio entre el 6.º y el 7.º.</li><li><b>Menor melódica:</b> al subir eleva el 6.º y el 7.º (evita ese salto en las melodías); al bajar vuelve a la natural.</li></ul><p>Los semitonos (S) están en otro color; el tono y medio, en rojo.</p>`,
        visual(el){ escala(el, {'Do mayor': [n(0, 4), 'mayor'], 'La menor natural': [n(5, 4), 'menor-natural'], 'La menor armónica': [n(5, 4), 'menor-armonica'], 'La menor melódica': [n(5, 4), 'menor-melodica']}); }},
      {etapa: 'aprender', titulo: 'Los modos', texto: `<p>Los <b>modos</b> son escalas de siete notas con los semitonos en otros lugares. Se pueden pensar como variantes de la mayor o la menor con una nota cambiada:</p><ul><li><b>Dórico:</b> menor con la 6.ª mayor.</li><li><b>Frigio:</b> menor con la 2.ª menor.</li><li><b>Lidio:</b> mayor con la 4.ª aumentada.</li><li><b>Mixolidio:</b> mayor con la 7.ª menor.</li></ul><p>(El jónico es la mayor, el eólico la menor natural y el locrio, la escala que empieza en el 7.º grado.) Piston los estudia como base de la armonía posterior a la práctica común.</p>`,
        visual(el){ escala(el, {'Re dórico': [n(1, 4), 'dorico'], 'Mi frigio': [n(2, 4), 'frigio'], 'Fa lidio': [n(3, 4), 'lidio'], 'Sol mixolidio': [n(4, 4), 'mixolidio']}); }},
      {etapa: 'solo', titulo: '¿Qué escala es?', ejercicio: {tipo: 'h-escala', cantidad: 4}},
      {etapa: 'solo', titulo: 'En el piano', texto: '<p>Tocalas con tu teclado MIDI o en la pantalla.</p>', ejercicio: {tipo: 'p-escala', cantidad: 2}}
    ]},

    {id: 'pi-triadas', titulo: 'Tríadas y sus tipos', resumen: 'Mayor, menor, disminuida y aumentada.', pasos: [
      {etapa: 'aprender', titulo: 'Cuatro tipos', texto: `<p>Una <b>tríada</b> son tres notas superpuestas por terceras: fundamental, tercera y quinta. Según el tipo de terceras hay cuatro clases:</p><ul><li><b>Mayor:</b> 3.ª mayor + 5.ª justa.</li><li><b>Menor:</b> 3.ª menor + 5.ª justa.</li><li><b>Disminuida:</b> 3.ª menor + 5.ª disminuida.</li><li><b>Aumentada:</b> 3.ª mayor + 5.ª aumentada.</li></ul><p>Las mayores y menores son <b>consonantes</b> (estables). Las disminuidas y aumentadas son <b>disonantes</b>: su quinta no es justa y piden moverse.</p>`,
        visual(el){ acordes(el, {'Mayor': {notas: [n(0, 4), n(2, 4), n(4, 4)], texto: 'Do – Mi – Sol'}, 'Menor': {notas: [n(0, 4), n(2, 4, -1), n(4, 4)], texto: 'Do – Mi♭ – Sol'}, 'Disminuida': {notas: [n(0, 4), n(2, 4, -1), n(4, 4, -1)], texto: 'Do – Mi♭ – Sol♭'}, 'Aumentada': {notas: [n(0, 4), n(2, 4), n(4, 4, 1)], texto: 'Do – Mi – Sol♯'}}); }},
      {etapa: 'aprender', titulo: 'Sobre cada grado', texto: `<p>En mayor: I, IV y V son mayores; ii, iii y vi, menores; vii°, disminuido.</p><p>En menor (con la sensible de la menor armónica): i y iv menores; V y VI mayores; ii° y vii° disminuidos; y el III resulta <b>aumentado</b> (III+) si se usa la sensible, por eso en la práctica se usa más con el 7.º natural (III mayor).</p>`,
        visual(el){ ejemplos(el, DO, {'Grados en Do mayor': {cols: [0, 1, 2, 3, 4, 5, 6].map(g => realizar(DO, [ac(g, g === 6 ? 1 : 0)])[0])}, 'Grados en La menor': {K: LAm, cols: [0, 1, 3, 4, 5, 6].map(g => realizar(LAm, [ac(g, g === 1 || g === 6 ? 1 : 0)])[0])}}); }},
      {etapa: 'solo', titulo: '¿Qué tipo de tríada?', ejercicio: {tipo: 'h-calidad', cantidad: 5}}
    ]},

    {id: 'pi-acordes', titulo: 'Tocar acordes en el piano', resumen: 'Con un teclado MIDI o en la pantalla.', pasos: [
      {etapa: 'aprender', titulo: 'Del pentagrama a las manos', texto: `<p>En el piano, la escritura a cuatro voces se reparte así: el <b>bajo con la mano izquierda</b> y las otras <b>tres voces con la derecha</b> (posición cerrada, más cómoda). En los ejercicios de esta unidad podés tocar con un <b>teclado MIDI</b> conectado por USB (Chrome o Edge) o, si no tenés, tocando las teclas de la pantalla.</p><p>Para un acorde «en cualquier posición» alcanza con tocar sus notas. Cuando se pide una inversión, lo que importa es la <b>nota más grave</b>.</p>`},
      {etapa: 'solo', titulo: 'Tríadas', ejercicio: {tipo: 'p-acorde', cantidad: 4}},
      {etapa: 'solo', titulo: 'Con inversiones', ejercicio: {tipo: 'p-acorde', cantidad: 3, op: {inversiones: true}}},
      {etapa: 'solo', titulo: 'Con séptima', ejercicio: {tipo: 'p-acorde', cantidad: 3, op: {grados: [4], septimas: true, inversiones: true}}}
    ]},

    {id: 'pi-tonalidad', titulo: 'Tonalidad y modalidad', resumen: 'Grados tonales, grados modales y el modo menor.', pasos: [
      {etapa: 'aprender', titulo: 'Qué define la tonalidad', texto: `<p>Piston distingue entre <b>grados tonales</b> y <b>grados modales</b>:</p><ul><li><b>Tonales:</b> I, IV y V. Son iguales en mayor y en menor (salvo la tercera) y son los que <b>establecen la tonalidad</b>: una progresión I–IV–V–I deja clara la tónica.</li><li><b>Modales:</b> III y VI (y el 2.º grado). Cambian entre mayor y menor y le dan el <b>color del modo</b>.</li></ul><p>Por eso la cadencia V–I es tan importante: la sensible y la fundamental de la dominante señalan la tónica sin ambigüedad.</p>`,
        visual(el){ ejemplos(el, DO, {'I–IV–V–I en Do mayor': {prog: [ac(0), ac(3), ac(4), ac(0)]}, 'i–iv–V–i en Do menor': {K: DOm, prog: [ac(0), ac(3), ac(4), ac(0)]}, 'I–vi–IV–V–I': {prog: [ac(0), ac(5), ac(3), ac(4), ac(0)]}}); }},
      {etapa: 'aprender', titulo: 'El modo menor en la práctica', texto: `<p>En menor, el V y el vii° usan la <b>sensible elevada</b>. En las líneas melódicas, para no saltar una segunda aumentada entre el 6.º y el 7.º grado, se elevan los dos al subir (6.º y 7.º de la menor melódica) y se dejan naturales al bajar. En el editor, el análisis marca como error el <b>salto de segunda aumentada</b> en cualquier voz.</p>`},
      {etapa: 'solo', titulo: 'Funciones', ejercicio: {tipo: 'h-funcion', cantidad: 4}}
    ]},

    {id: 'pi-seis-cuatro', titulo: 'El acorde de sexta y cuarta', resumen: 'Cadencial, de paso, de bordadura y arpegiado.', pasos: [
      {etapa: 'aprender', titulo: 'Una posición inestable', texto: `<p>En la segunda inversión (⁶₄), la quinta del acorde está en el bajo y forma una <b>cuarta</b> con la fundamental. Entre el bajo y una voz, la cuarta se trata como disonancia: por eso el acorde ⁶₄ no se usa libremente, sino en <b>cuatro situaciones</b>, todas definidas por el bajo. En todas se duplica el bajo.</p><ul><li><b>Cadencial:</b> I⁶₄ en tiempo fuerte, antes del V y con el mismo bajo. Es el V con dos apoyaturas (6–5 y 4–3).</li><li><b>De paso:</b> el bajo pasa por grado (I – V⁶₄ – I⁶).</li><li><b>De bordadura o pedal:</b> el bajo se queda (I – IV⁶₄ – I).</li><li><b>Arpegiado:</b> el bajo recorre las notas de un mismo acorde.</li></ul>`,
        visual(el){ ejemplos(el, DO, {'Cadencial': {prog: [ac(0), ac(3), ac(0, 2), ac(4), ac(0)]}, 'De paso': {prog: [ac(0), ac(4, 2), ac(0, 1), ac(3), ac(4), ac(0)]}, 'De bordadura': {prog: [ac(0), ac(3, 2), ac(0), ac(4), ac(0)]}, 'Arpegiado': {prog: [ac(3), ac(3, 1), ac(3, 2), ac(4), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: '¿Qué uso tiene?', ejercicio: {tipo: 'h-64', cantidad: 4}}
    ]},

    {id: 'pi-ritmo-armonico', titulo: 'Ritmo armónico y frase', resumen: 'Cuándo cambian los acordes y cómo se cierra una frase.', pasos: [
      {etapa: 'aprender', titulo: 'El ritmo de los cambios de acorde', texto: `<p>El <b>ritmo armónico</b> es el ritmo con que cambian los acordes, independiente del ritmo de la melodía. Algunas pautas del estilo:</p><ul><li>Los cambios importantes de acorde caen en los <b>tiempos fuertes</b>.</li><li>Repetir un acorde desde un tiempo débil a uno fuerte (cruzando la barra) debilita el pulso: suena como un síncopa armónica.</li><li>El ritmo armónico suele <b>acelerar hacia la cadencia</b> (más cambios cerca del final).</li></ul><p>Escuchá la misma progresión con dos ritmos armónicos.</p>`,
        visual(el){ ritmoArmonico(el, DO, {'Regular (2 negras cada uno)': [[ac(0), ac(3), ac(1, 1), ac(4), ac(0)], [2, 2, 2, 2, 4]], 'Acelerando a la cadencia': [[ac(0), ac(3), ac(1, 1), ac(4), ac(0)], [4, 2, 1, 1, 4]]}); }},
      {etapa: 'aprender', titulo: 'Frase y período', texto: `<p>Una <b>frase</b> es una unidad musical que termina con una cadencia. Dos frases forman un <b>período</b> cuando la primera (<b>antecedente</b>) termina con una cadencia débil, casi siempre una <b>semicadencia</b>, y la segunda (<b>consecuente</b>) contesta con una cadencia <b>auténtica</b>. Es como una pregunta y su respuesta.</p>`,
        visual(el){ ejemplos(el, DO, {'Antecedente (semicadencia)': {prog: [ac(0), ac(5), ac(1), ac(4)]}, 'Consecuente (auténtica)': {prog: [ac(0), ac(3), ac(4), ac(0)]}}); }},
      {etapa: 'solo', titulo: 'Cadencias', ejercicio: {tipo: 'h-cadencia', cantidad: 3}}
    ]},

    {id: 'pi-ne-1', titulo: 'Notas extrañas I: paso, bordadura, anticipación y escapada', resumen: 'Notas ajenas al acorde que se mueven por grado.', pasos: [
      {etapa: 'aprender', titulo: 'Qué es una nota extraña', texto: `<p>Una <b>nota extraña</b> (no armónica) no pertenece al acorde que suena. No es un error: adorna las líneas y les da continuidad. Lo que la define es <b>cómo se llega a ella</b> y <b>cómo se la deja</b> (por grado o por salto), y si cae en tiempo fuerte o débil.</p><p>Probá cada tipo: la nota extraña está resaltada.</p>`,
        visual(el){ notaExtrana(el, ['paso', 'bordadura', 'anticipacion', 'escapada']); }},
      {etapa: 'solo', titulo: '¿Qué nota extraña es?', ejercicio: {tipo: 'h-ne', cantidad: 4, op: {tipos: ['paso', 'bordadura', 'anticipacion', 'escapada']}}}
    ]},

    {id: 'pi-ne-2', titulo: 'Notas extrañas II: apoyatura, retardo y pedal', resumen: 'Las notas extrañas en tiempo fuerte.', pasos: [
      {etapa: 'aprender', titulo: 'Disonancias acentuadas', texto: `<p>La <b>apoyatura</b> y el <b>retardo</b> caen en tiempo fuerte: la disonancia coincide con el acento y por eso son las más expresivas.</p><ul><li><b>Apoyatura:</b> llega por salto y resuelve por grado.</li><li><b>Retardo:</b> tiene tres momentos: <b>preparación</b> (la nota es parte del acorde anterior), <b>suspensión</b> (se mantiene ligada sobre el acorde nuevo, donde es ajena) y <b>resolución</b> (baja por grado). Los más comunes son 4–3, 7–6 y 9–8, nombrados por su intervalo con el bajo. En el bajo, el retardo típico es 2–3.</li></ul>`,
        visual(el){ notaExtrana(el, ['retardo', 'apoyatura']); }},
      {etapa: 'aprender', titulo: 'Pedal y doble bordadura', texto: `<p>El <b>pedal</b> es una nota sostenida (en general en el bajo, sobre la tónica o la dominante) mientras arriba cambian los acordes, aunque choquen con ella. Es típico al final de una obra (pedal de tónica) o antes de la reexposición (pedal de dominante).</p><p>La <b>doble bordadura</b> (o notas cambiadas) rodea una nota del acorde con sus dos vecinas antes de llegar a ella.</p>`,
        visual(el){ ver(el, DO, [{S: n(4, 4), A: n(2, 4), T: n(0, 4), B: n(0, 3)}, {S: n(5, 4), A: n(3, 4), T: n(0, 4), B: n(0, 3)}, {S: n(6, 4), A: n(3, 4), T: n(4, 3), B: n(0, 3)}, {S: n(0, 5), A: n(2, 4), T: n(4, 3), B: n(0, 3)}], {sinMarcas: true, sinCifra: true}); el.appendChild(h('p', 'lz-nota', 'Pedal de tónica: el bajo se queda en Do mientras arriba suenan I – IV – V⁷ – I.')); }},
      {etapa: 'solo', titulo: 'Todas las notas extrañas', ejercicio: {tipo: 'h-ne', cantidad: 5}}
    ]},

    {id: 'pi-modulacion', titulo: 'Modulación', resumen: 'Cambiar de tonalidad con un acorde pivote.', pasos: [
      {etapa: 'aprender', titulo: 'Tonalidades vecinas', texto: `<p><b>Modular</b> es establecer una tonalidad nueva. Las modulaciones más naturales van a las <b>tonalidades vecinas</b>: las que tienen a lo sumo una alteración de diferencia (la relativa, la dominante, la subdominante y sus relativas). Comparten muchos acordes, y eso facilita el pasaje.</p><p>Elegí una tonalidad para ver sus vecinas y qué acordes comparten.</p>`, requiere: true,
        visual(el, ctx){
          const sel = h('select'); sel.setAttribute('aria-label', 'Tonalidad');
          A.TONALIDADES.forEach(K => { const o = h('option', null, K.nombre); o.value = A.claveTon(K); sel.appendChild(o); });
          el.appendChild(sel);
          const t = caja(el);
          let vistos = 0;
          const pintar = () => {
            const [arm, modo] = sel.value.split(':'); const K = A.tonalidad(+arm, modo);
            t.innerHTML = `<table class="lz-tabla"><thead><tr><th>Vecina</th><th>Relación</th><th>Acordes comunes (pivotes)</th></tr></thead><tbody>${A.vecinas(K).map(K2 => `<tr><td>${K2.nombre}</td><td>${A.relacion(K, K2)}</td><td>${A.acordesComunes(K, K2).map(p => `${A.romanoTexto(K, ac(p.g1))} = ${A.romanoTexto(K2, ac(p.g2))}`).join(', ')}</td></tr>`).join('')}</tbody></table>`;
            if (++vistos >= 2) ctx.listo();
          };
          sel.addEventListener('change', pintar); pintar();
        }},
      {etapa: 'ejemplo', titulo: 'El procedimiento', texto: `<p>Una modulación por <b>acorde pivote</b> tiene tres pasos:</p><ol><li>Afirmar la tonalidad de partida.</li><li>Un <b>acorde pivote</b>, común a las dos, que se oye en la vieja y se reinterpreta en la nueva (idealmente como subdominante: ii o IV).</li><li>Una <b>cadencia</b> en la tonalidad nueva (con su V o V⁷), que la confirma.</li></ol><p>Ejemplo, de Do mayor a Sol mayor: I – IV – <b>vi</b> – V⁷/V – V. El vi de Do es el <b>ii</b> de Sol; el V⁷/V de Do es el <b>V⁷</b> de Sol, y el V de Do es la nueva tónica.</p>`,
        visual(el){ ver(el, DO, realizar(DO, [ac(0), ac(3), ac(5), sec('V7', 4), ac(4)], {finTonica: false}), {panel: false}); el.appendChild(h('p', 'lz-nota', 'Análisis doble: en Do: I – IV – vi – V⁷/V – V. En Sol: … – ii – V⁷ – I.')); }},
      {etapa: 'solo', titulo: 'Encontrá el pivote', ejercicio: {tipo: 'h-pivote', cantidad: 4}}
    ]},

    {id: 'pi-secuencias', titulo: 'Secuencias', resumen: 'Un modelo repetido en otros grados.', pasos: [
      {etapa: 'aprender', titulo: 'Repetir un modelo', texto: `<p>Una <b>secuencia</b> repite un modelo (melódico y armónico) en otros grados. Si se mantiene dentro de la tonalidad es <b>diatónica</b> (tonal): los intervalos cambian un poco de calidad. Si se transporta exacta, con alteraciones, es <b>real</b>, y puede modular.</p><p>La secuencia más usada es la de <b>quintas descendentes</b>: cada fundamental baja una quinta (sube una cuarta). Dentro de una secuencia se toleran cosas que fuera de ella se evitan, como el vii° en estado fundamental o la duplicación inusual, porque el oído sigue el patrón.</p>`,
        visual(el){ ejemplos(el, DO, {'Quintas descendentes': {prog: [ac(0), ac(3), ac(6), ac(2), ac(5), ac(1), ac(4), ac(0)], ed: {sinMarcas: true}}, 'Con dominantes secundarias': {prog: [ac(0), sec('V7', 5), ac(5), sec('V7', 1), ac(1), sec('V7', 4), ac(4), ac(0)]}}); }}
    ]},

    {id: 'pi-v7', titulo: 'El acorde de séptima de dominante', resumen: 'Estructura, inversiones y resolución.', pasos: [
      {etapa: 'aprender', titulo: 'El V con su séptima', texto: `<p>El <b>V⁷</b> agrega al V una séptima menor sobre la fundamental. Contiene un <b>tritono</b> (entre la sensible y la séptima) que resuelve hacia adentro: la sensible sube a la tónica y la séptima baja un grado.</p><ul><li>Completo, va a un I incompleto (fundamental triplicada); incompleto (sin quinta, fundamental duplicada), va a un I completo.</li><li>Inversiones: <b>V⁶₅</b> (tercera en el bajo) → I; <b>V⁴₃</b> (quinta) → I o I⁶; <b>V⁴₂</b> (séptima en el bajo) → <b>I⁶</b>, porque el bajo, que es la séptima, tiene que bajar.</li></ul>`,
        visual(el){ ejemplos(el, DO, {'V⁷ → I': {prog: [ac(0), ac(3), ac(4, 0, true), ac(0)]}, 'V⁶₅ → I': {prog: [ac(0), ac(4, 1, true), ac(0)]}, 'V⁴₃ → I⁶': {prog: [ac(0), ac(4, 2, true), ac(0, 1)]}, 'V⁴₂ → I⁶': {prog: [ac(0), ac(4, 3, true), ac(0, 1)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: '¿En qué posición está?', ejercicio: {tipo: 'h-septima', cantidad: 4}},
      {etapa: 'solo', titulo: 'Tocá el V⁷ y sus inversiones', ejercicio: {tipo: 'p-acorde', cantidad: 3, op: {grados: [4], septimas: true, inversiones: true}}},
      {etapa: 'guiado', titulo: 'Escribí el V⁷', requiere: true, visual(el, ctx){ const z = caja(el); window.ArmoniaApp.desafio(z, 'septima', {alResolver: () => ctx.listo()}); }}
    ]},

    {id: 'pi-vii7', titulo: 'La séptima de sensible', resumen: 'vii°⁷ y viiø⁷.', pasos: [
      {etapa: 'aprender', titulo: 'Dos acordes sobre la sensible', texto: `<p>Sobre el 7.º grado se forma un acorde de séptima con función de dominante:</p><ul><li>En <b>menor</b> es <b>disminuido</b> (vii°⁷): todas sus terceras son menores. Se usa también en mayor, tomado del menor.</li><li>En <b>mayor</b> es <b>semidisminuido</b> (viiø⁷): la séptima es menor.</li></ul><p>Tiene dos tritonos que resuelven hacia adentro: la sensible sube y la séptima baja. Funciona como un V⁹ sin fundamental. Una propiedad notable del vii°⁷: divide la octava en cuatro partes iguales, así que reescribiéndolo enarmónicamente puede ser la sensible de cuatro tonalidades distintas (se aprovecha para modular).</p>`,
        visual(el){ ejemplos(el, DO, {'vii°⁷ → i (La menor)': {K: LAm, prog: [ac(0), ac(6, 0, true), ac(0)]}, 'vii°⁷ → I (prestado, Do mayor)': {prog: [ac(0), {esp: 'mix', g: 6, sept: true, inv: 0}, ac(0)]}, 'viiø⁷ → I (Do mayor)': {prog: [ac(0), ac(1, 1), ac(6, 0, true), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: 'Tocalo', ejercicio: {tipo: 'p-acorde', cantidad: 2, op: {acordes: [{g: 6, inv: 0, sept: true}], modo: 'menor'}}}
    ]},

    {id: 'pi-septimas', titulo: 'Séptimas no dominantes', resumen: 'ii⁷, IV⁷, vi⁷ y las demás.', pasos: [
      {etapa: 'aprender', titulo: 'La séptima sobre otros grados', texto: `<p>Se pueden agregar séptimas a cualquier grado. Las más usadas son las de <b>subdominante</b>: <b>ii⁷</b> (sobre todo ii⁶₅) y <b>IV⁷</b>, que llevan al V. La séptima se trata como una disonancia:</p><ul><li>se <b>prepara</b>: aparece como nota común en el acorde anterior, en la misma voz;</li><li>se <b>resuelve</b> bajando un grado.</li></ul><p>En las secuencias de quintas descendentes es común encadenar séptimas, alternando acordes completos e incompletos.</p>`,
        visual(el){ ejemplos(el, DO, {'ii⁶₅ → V → I': {prog: [ac(0), ac(1, 1, true), ac(4), ac(0)]}, 'ii⁷ → V⁷ → I': {prog: [ac(0), ac(1, 0, true), ac(4, 0, true), ac(0)]}, 'IV⁷ → V → I': {prog: [ac(0), ac(3, 0, true), ac(4), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: 'Tocá séptimas', ejercicio: {tipo: 'p-acorde', cantidad: 3, op: {acordes: [{g: 1, inv: 0, sept: true}, {g: 3, inv: 0, sept: true}, {g: 5, inv: 0, sept: true}]}}}
    ]},

    {id: 'pi-novena', titulo: 'El acorde de novena de dominante', resumen: 'V⁹: la novena en el soprano.', pasos: [
      {etapa: 'aprender', titulo: 'Una tercera más', texto: `<p>El <b>V⁹</b> agrega una novena al V⁷: <b>mayor</b> en el modo mayor y <b>menor</b> en el menor. A cuatro voces se omite la quinta.</p><ul><li>La novena suena mejor en el <b>soprano</b>, al menos una novena por encima de la fundamental.</li><li>Resuelve <b>bajando un grado</b> (a la quinta del I), a veces antes de que cambie el acorde (y queda un V⁷).</li></ul><p>Sin fundamental, el V⁹ es el acorde de séptima de sensible (vii⁷).</p>`,
        visual(el){ ejemplos(el, DO, {'V⁹ → I': {prog: [ac(0), ac(3), {g: 4, sept: true, nov: true, inv: 0}, ac(0)]}, 'V⁹ en menor': {K: LAm, prog: [ac(0), ac(3), {g: 4, sept: true, nov: true, inv: 0}, ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: 'Tocá el V⁹', ejercicio: {tipo: 'p-acorde', cantidad: 2, op: {acordes: [{g: 4, inv: 0, sept: true, nov: true}]}}}
    ]}
  ]);

  // =====================================================================================
  L.agregarUnidad('piston-cromatica', 'Piston II: cromatismo', 'Dominantes secundarias, resoluciones irregulares, intercambio modal, napolitana, sextas aumentadas, otros acordes cromáticos, modulación enarmónica y acordes de novena, oncena y trecena.', [

    {id: 'pi-secundarias', titulo: 'Dominantes secundarias', resumen: 'El V de otro grado.', pasos: [
      {etapa: 'aprender', titulo: 'Tonicizar un acorde', texto: `<p>Cualquier acorde mayor o menor de la tonalidad puede recibir <b>su propia dominante</b>: un acorde mayor una quinta arriba. Se escribe <b>V/x</b> («V de x»). Así, por un instante, ese acorde suena como una tónica: se lo <b>toniciza</b>, sin modular.</p><p>En Do mayor: V/ii = La mayor, V/iii = Si mayor, V/IV = Do mayor (con séptima, para distinguirlo del I), <b>V/V = Re mayor</b>, V/vi = Mi mayor. El vii° no tiene dominante secundaria (no puede ser tónica).</p><p>La tercera del V/x es la <b>sensible del acorde x</b>: sube medio tono.</p>`,
        visual(el){ ejemplos(el, DO, {'V/V → V': {prog: [ac(0), sec('V', 4), ac(4), ac(0)]}, 'V/vi → vi': {prog: [ac(0), sec('V', 5), ac(5), ac(1), ac(4), ac(0)]}, 'V⁷/IV → IV': {prog: [ac(0), sec('V7', 3), ac(3), ac(4), ac(0)]}, 'V⁷/ii → ii': {prog: [ac(0), sec('V7', 1), ac(1), ac(4), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: '¿De qué grado es la dominante?', ejercicio: {tipo: 'h-secundaria', cantidad: 4}},
      {etapa: 'guiado', titulo: 'Escribilas', requiere: true, visual(el, ctx){ const z = caja(el); window.ArmoniaApp.desafio(z, 'secundarias', {alResolver: () => ctx.listo()}); }}
    ]},

    {id: 'pi-secundarias-7', titulo: 'Séptimas secundarias y cadenas de dominantes', resumen: 'V⁷/x, vii°⁷/x y la falsa relación.', pasos: [
      {etapa: 'aprender', titulo: 'Más dominantes', texto: `<p>Las dominantes secundarias también pueden llevar séptima (<b>V⁷/x</b>) o reemplazarse por la séptima de sensible del acorde x (<b>vii°⁷/x</b>, con la sensible secundaria como fundamental). Encadenando dominantes secundarias se arman <b>cadenas</b> que recorren el círculo de quintas: V⁷/vi – V⁷/ii – V⁷/V – V⁷ – I.</p><p>Cuidado con la <b>falsa relación</b>: si una nota aparece natural en una voz y alterada en otra voz en el acorde siguiente (Do en el bajo y Do♯ en el tenor), suena a error. El cambio cromático conviene que ocurra <b>dentro de la misma voz</b>.</p>`,
        visual(el){ ejemplos(el, DO, {'vii°⁷/V → V': {prog: [ac(0), sec('vii7', 4), ac(4), ac(0)]}, 'Cadena de dominantes': {prog: [ac(0), sec('V7', 5), sec('V7', 1), sec('V7', 4), ac(4, 0, true), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: 'Tocá dominantes secundarias', ejercicio: {tipo: 'p-acorde', cantidad: 3, op: {K: DO, acordes: [sec('V7', 4), sec('V7', 1), sec('V7', 5), sec('vii7', 4)]}}}
    ]},

    {id: 'pi-irregulares', titulo: 'Resoluciones irregulares', resumen: 'Cuando la dominante no va a su tónica.', pasos: [
      {etapa: 'aprender', titulo: 'Sorpresas controladas', texto: `<p>Una dominante crea una expectativa fuerte; resolverla en otro acorde es un recurso expresivo:</p><ul><li><b>V → vi</b> (cadencia rota): el más común.</li><li><b>V⁷ → IV⁶</b>: la séptima se mantiene o baja, el bajo sube.</li><li>Una dominante secundaria que va a <b>otra dominante</b> (V⁷/ii → V⁷/V): la resolución esperada se saltea (elisión).</li></ul><p>Aun en las resoluciones irregulares, las <b>notas con tendencia</b> suelen hacer su movimiento (la sensible sube, la séptima baja) aunque el acorde de llegada sea otro. El análisis las marca como información, no como error.</p>`,
        visual(el){ ejemplos(el, DO, {'V⁷ → vi': {prog: [ac(0), ac(3), ac(4, 0, true), ac(5)]}, 'V⁷/V → I⁶₄ → V': {prog: [ac(0), sec('V7', 4), ac(0, 2), ac(4), ac(0)]}, 'V⁷/ii → V⁷/V (elisión)': {prog: [ac(0), sec('V7', 1), sec('V7', 4), ac(4), ac(0)]}}, {panel: true}); }}
    ]},

    {id: 'pi-mixtura', titulo: 'Intercambio modal', resumen: 'Acordes del modo menor en mayor (y la tercera de picardía).', pasos: [
      {etapa: 'aprender', titulo: 'Tomar prestado del paralelo', texto: `<p>Mayor y menor con la misma tónica comparten la función de sus acordes; por eso se pueden intercambiar. En mayor se toman del menor: <b>iv</b>, <b>ii°</b> (o iiø⁷), <b>♭VI</b>, <b>♭III</b>, <b>♭VII</b> y el <b>vii°⁷</b>. Oscurecen el color sin cambiar la tonalidad.</p><p>Al revés, terminar una obra en menor con el I mayor es la <b>tercera de picardía</b>.</p><p>Las notas bajadas (♭6, ♭3) tienden a bajar, como cualquier alteración descendente.</p>`,
        visual(el){ ejemplos(el, DO, {'IV → iv → I': {prog: [ac(0), ac(3), {esp: 'mix', g: 3, inv: 0}, ac(0)]}, 'V → ♭VI (rota)': {prog: [ac(0), ac(3), ac(4), {esp: 'mix', g: 5, inv: 0}]}, 'iiø⁷ → V → I': {prog: [ac(0), {esp: 'mix', g: 1, sept: true, inv: 1}, ac(4), ac(0)]}, 'Picardía (La menor)': {K: LAm, prog: [ac(0), ac(3), ac(4), {esp: 'mix', g: 0, inv: 0}]}}, {panel: true}); }},
      {etapa: 'solo', titulo: 'Reconocelos', ejercicio: {tipo: 'h-cromatico', cantidad: 3, op: {tipos: ['bVI', 'iv', 'V7V', 'N']}}}
    ]},

    {id: 'pi-napolitana', titulo: 'La sexta napolitana', resumen: 'El acorde mayor sobre el ♭2.', pasos: [
      {etapa: 'aprender', titulo: 'N⁶', texto: `<p>El acorde <b>napolitano</b> es un acorde mayor sobre el 2.º grado bajado (♭II). Se usa casi siempre en <b>primera inversión</b> (N⁶), con función de <b>subdominante</b>: reemplaza al ii⁶ o al iv⁶.</p><ul><li>Se duplica la <b>tercera</b> (el bajo), que es el 4.º grado.</li><li>El ♭2 baja a la sensible (una tercera disminuida) o pasa por la tónica.</li><li>Es frecuente N⁶ → I⁶₄ → V, o N⁶ → vii°⁷/V → V.</li></ul><p>Es más natural en menor; en mayor suma color sombrío.</p>`,
        visual(el){ ejemplos(el, DO, {'N⁶ → V (La menor)': {K: LAm, prog: [ac(0), {esp: 'N', inv: 1}, ac(4), ac(0)]}, 'N⁶ → I⁶₄ → V (Do mayor)': {prog: [ac(0), {esp: 'N', inv: 1}, ac(0, 2), ac(4), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: 'Tocá la napolitana', ejercicio: {tipo: 'p-acorde', cantidad: 2, op: {acordes: [{esp: 'N', inv: 1}], maxArm: 1}}}
    ]},

    {id: 'pi-sextas', titulo: 'Acordes de sexta aumentada', resumen: 'Italiana, francesa y alemana.', pasos: [
      {etapa: 'aprender', titulo: 'Abrirse a la dominante', texto: `<p>Estos acordes tienen en el bajo el <b>♭6</b> y arriba el <b>♯4</b>: forman una <b>sexta aumentada</b> que se abre hacia afuera, medio tono cada nota, a la <b>octava de la dominante</b>. Funcionan como subdominantes intensificadas antes del V.</p><ul><li><b>Italiana (It⁺⁶):</b> ♭6, 1, ♯4 (la tónica duplicada).</li><li><b>Francesa (Fr⁺⁶):</b> ♭6, 1, 2, ♯4.</li><li><b>Alemana (Al⁺⁶):</b> ♭6, 1, ♭3, ♯4. Al ir al V produce quintas paralelas (las «quintas de Mozart»); por eso suele pasar por el I⁶₄ cadencial. En mayor a veces se escribe con ♯2 en lugar de ♭3 (doblemente aumentada).</li></ul><p>La alemana suena igual que un acorde de séptima de dominante: reescribiéndola, sirve para modular.</p>`,
        visual(el){ ejemplos(el, DO, {'It⁺⁶ → V': {prog: [ac(0), ac(5), {esp: 'It'}, ac(4), ac(0)]}, 'Fr⁺⁶ → V': {prog: [ac(0), ac(5), {esp: 'Fr'}, ac(4), ac(0)]}, 'Al⁺⁶ → I⁶₄ → V': {prog: [ac(0), ac(5), {esp: 'Al'}, ac(0, 2), ac(4), ac(0)]}, 'Al⁺⁶ → V (La menor)': {K: LAm, prog: [ac(0), ac(3), {esp: 'Al'}, ac(4), ac(0)]}}, {panel: true}); }},
      {etapa: 'solo', titulo: '¿Qué acorde alterado es?', ejercicio: {tipo: 'h-cromatico', cantidad: 4, op: {tipos: ['It', 'Fr', 'Al', 'N']}}},
      {etapa: 'solo', titulo: 'Tocalos', ejercicio: {tipo: 'p-acorde', cantidad: 3, op: {K: DO, acordes: [{esp: 'It'}, {esp: 'Fr'}, {esp: 'Al'}]}}},
      {etapa: 'guiado', titulo: 'Escribilos', requiere: true, visual(el, ctx){ const z = caja(el); window.ArmoniaApp.desafio(z, 'cromaticos', {alResolver: () => ctx.listo()}); }}
    ]},

    {id: 'pi-otros-cromaticos', titulo: 'Otros acordes cromáticos', resumen: 'Aumentados, séptima disminuida de nota común y mediantes cromáticas.', pasos: [
      {etapa: 'aprender', titulo: 'Más colores', texto: `<ul><li><b>Tríada aumentada como dominante (V+):</b> se eleva la quinta del V, que sube a la tercera del I.</li><li><b>Séptima disminuida de nota común:</b> un acorde disminuido que comparte una nota con el acorde al que adorna (Do – Re♯ – Fa♯ – La sobre Do, entre dos I). No es una dominante: es un bordado cromático.</li><li><b>Mediantes cromáticas:</b> acordes mayores (o menores) cuyas fundamentales están a una tercera, con una nota común y alteraciones (I → ♭VI, I → III mayor). Muy usadas en el Romanticismo.</li></ul>`,
        visual(el){ acordes(el, {'V+ (Sol – Si – Re♯)': {notas: [n(4, 3), n(6, 3), n(1, 4, 1), n(4, 4)]}, '°7 de nota común (Do – Re♯ – Fa♯ – La)': {notas: [n(0, 4), n(1, 4, 1), n(3, 4, 1), n(5, 4)]}, 'Mediante: La♭ mayor': {notas: [n(5, 3, -1), n(0, 4), n(2, 4, -1), n(5, 4, -1)]}, 'Mediante: Mi mayor': {notas: [n(2, 3), n(4, 3, 1), n(6, 3), n(2, 4)]}}); }}
    ]},

    {id: 'pi-enarmonica', titulo: 'Modulación enarmónica', resumen: 'Reescribir un acorde para ir lejos.', pasos: [
      {etapa: 'aprender', titulo: 'El mismo sonido, otra función', texto: `<p>Algunos acordes suenan igual escritos de otra forma, y en la tonalidad nueva tienen otra función:</p><ul><li><b>Séptima disminuida:</b> Si – Re – Fa – La♭ (vii°⁷ de Do) es también Re – Fa – La♭ – Do♭ (de Mi♭), Fa – La♭ – Do♭ – Mi♭♭ (de Sol♭) o Sol♯ – Si – Re – Fa (de La). Un solo acorde lleva a cuatro tonalidades.</li><li><b>Sexta alemana ↔ V⁷:</b> La♭ – Do – Mi♭ – Fa♯ (Al⁺⁶ de Do) suena como La♭ – Do – Mi♭ – Sol♭, el V⁷ de Re♭.</li></ul><p>Escuchá: el mismo acorde, resuelto de dos maneras.</p>`,
        visual(el){ ejemplos(el, DO, {'°7 como vii°⁷ de Do': {prog: [ac(0), {esp: 'mix', g: 6, sept: true, inv: 0}, ac(0)]}, '°7 como vii°⁷ de La menor': {K: LAm, prog: [ac(0), ac(6, 0, true), ac(0)]}, 'Al⁺⁶ en Do → V': {prog: [ac(0), {esp: 'Al'}, ac(0, 2), ac(4)]}}, {panel: true}); }}
    ]},

    {id: 'pi-extendidos', titulo: 'Novenas, oncenas y trecenas', resumen: 'Acordes por terceras más allá de la séptima.', pasos: [
      {etapa: 'aprender', titulo: 'Seguir apilando terceras', texto: `<p>Más allá de la novena se pueden apilar la <b>oncena</b> y la <b>trecena</b>. Con cuatro voces hay que omitir notas:</p><ul><li><b>Novena:</b> se omite la quinta.</li><li><b>Oncena:</b> suele omitirse la tercera (choca con la oncena) y a veces la quinta; muchas veces suena como un IV sobre el bajo de la dominante.</li><li><b>Trecena:</b> se conservan fundamental, tercera, séptima y trecena (la trecena en el soprano); la trecena suele resolver bajando a la quinta del I o funcionar como apoyatura de la quinta del V.</li></ul>`,
        visual(el){ acordes(el, {'V⁹': {notas: [n(4, 3), n(6, 3), n(3, 4), n(5, 4)], texto: 'Sol – Si – Fa – La'}, 'V¹¹': {notas: [n(4, 3), n(3, 4), n(5, 4), n(0, 5)], texto: 'Sol – Fa – La – Do'}, 'V¹³': {notas: [n(4, 3), n(6, 3), n(3, 4), n(2, 5)], texto: 'Sol – Si – Fa – Mi'}}); }}
    ]}
  ]);

  // =====================================================================================
  L.agregarUnidad('piston-xx', 'Piston III: después de la práctica común', 'Modos, nuevas escalas y acordes que no se construyen por terceras.', [
    {id: 'pi-modos-xx', titulo: 'Modos y nuevas escalas', resumen: 'Modalidad, pentatónica y tonos enteros.', pasos: [
      {etapa: 'aprender', titulo: 'Más allá de mayor y menor', texto: `<p>En la música de fines del siglo XIX y del XX vuelven los <b>modos</b> (dórico, frigio, lidio, mixolidio) y aparecen otras escalas:</p><ul><li><b>Pentatónica:</b> cinco notas sin semitonos (Do – Re – Mi – Sol – La).</li><li><b>De tonos enteros:</b> seis notas a distancia de tono; no tiene dominante ni tónica clara (Debussy).</li></ul><p>Sin sensible, la cadencia V–I pierde su centro: la «tónica» se afirma por repetición, por el bajo o por el contexto.</p>`,
        visual(el){ escala(el, {'Do mayor (referencia)': [n(0, 4), 'mayor'], 'Re dórico': [n(1, 4), 'dorico'], 'Do de tonos enteros': [n(0, 4), 'tonos-enteros']}); acordes(el, {'Pentatónica (como acorde)': {notas: [n(0, 4), n(1, 4), n(2, 4), n(4, 4), n(5, 4)]}}); }},
      {etapa: 'solo', titulo: '¿Qué modo es?', ejercicio: {tipo: 'h-escala', cantidad: 3, op: {escalas: ['dorico', 'frigio', 'lidio', 'mixolidio']}}}
    ]},
    {id: 'pi-acordes-xx', titulo: 'Acordes por cuartas, poliacordes y paralelismo', resumen: 'Otras formas de construir y mover acordes.', pasos: [
      {etapa: 'aprender', titulo: 'Otras construcciones', texto: `<ul><li><b>Acordes con notas agregadas:</b> la tríada con sexta o con novena agregada, sin función de disonancia que resolver.</li><li><b>Acordes por cuartas</b> (cuartales): superponen cuartas en lugar de terceras; suenan abiertos y ambiguos.</li><li><b>Poliacordes:</b> dos acordes simultáneos de tonalidades distintas (Do mayor + Fa♯ mayor).</li><li><b>Paralelismo (planeo):</b> un mismo acorde movido en bloque, con quintas y octavas paralelas a propósito: el acorde funciona como un color, no como cuatro voces independientes.</li><li><b>Pandiatonismo:</b> todas las notas de la escala usadas libremente, sin jerarquía funcional.</li></ul><p>Son la contracara de las reglas de conducción: muestran que las prohibiciones responden a un estilo (el coral tonal), no a leyes absolutas.</p>`,
        visual(el){ acordes(el, {'Do con sexta agregada': {notas: [n(0, 4), n(2, 4), n(4, 4), n(5, 4)]}, 'Por cuartas': {notas: [n(2, 3), n(5, 3), n(1, 4), n(4, 4), n(0, 5)]}, 'Poliacorde Do + Fa♯': {notas: [n(0, 3), n(2, 3), n(4, 3), n(3, 4, 1), n(5, 4, 1), n(0, 5, 1)]}}); }},
      {etapa: 'ejemplo', titulo: 'Paralelismo', texto: '<p>El mismo acorde movido en bloque: el análisis marca paralelas porque aplica las reglas del estilo coral, que acá se dejan de lado a propósito.</p>',
        visual(el){ ver(el, DO, [0, 1, 2, 1, 0].map(k => ({S: n(4 + k, 4), A: n(2 + k, 4), T: n(0 + k, 4), B: n(0 + k, 3)}))); }}
    ]}
  ]);
})();
