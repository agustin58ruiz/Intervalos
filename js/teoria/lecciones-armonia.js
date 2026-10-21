// Unidad de armonía y conducción de voces. Referencia conceptual: «Harmony» de Walter
// Piston (acordes sobre los grados, duplicación, enlace de acordes, progresiones de las
// fundamentales y cadencias). Los textos son propios; cada regla se explica por su razón
// musical y se distingue lo que es regla general de lo que es preferencia de estilo.
(function(){
  const M = window.Musica, A = window.Armonia, ED = window.ArmoniaEditor, L = window.Lecciones;
  const {h, caja, botones, msg} = L.util;
  const ac = (g, inv = 0, sept = false) => ({g, inv, sept});
  const n = (l, o, a = 0) => ({l, a, o});
  const DO = A.tonalidad(0, 'mayor'), LAm = A.tonalidad(0, 'menor'), SOL = A.tonalidad(1, 'mayor');
  // Pentagrama a cuatro voces de solo lectura (con sus botones para escuchar)
  const ver = (el, K, cols, o = {}) => ED.crear(caja(el), Object.assign({K, cols, soloLectura: true, panel: false}, o));
  const realizar = (K, p, o) => A.realizar(K, p, [], Object.assign({finTonica: true}, o || {})).cols;
  // Tarea en el editor: se da por cumplida cuando cumple(an, cols) devuelve true
  function tarea(el, ctx, o){
    const z = caja(el);
    let hecho = false;
    ED.crear(z, Object.assign({}, o, {onCambio(an, cols){
      if (hecho) return;
      const r = o.cumple(an, cols);
      if (r === true){ hecho = true; msg(el, `✓ ${o.exito || '¡Bien!'}`); ctx.listo(); }
      else if (typeof r === 'string') msg(el, r);
    }}));
    msg(el, o.inicio || '');
  }
  const desafio = (el, ctx, nivel, veces = 1) => {
    let k = 0;
    const z = caja(el);
    window.ArmoniaApp.desafio(z, nivel, {alResolver(){ k++; if (k >= veces) ctx.listo(); else msg(el, `Resuelto ${k} de ${veces}. Tocá «Otro ejercicio».`); }});
  };

  L.agregarUnidad('armonia', 'Armonía y conducción de voces', 'Escritura a cuatro voces, enlace de acordes, progresiones y cadencias, con los principios de «Harmony» de Walter Piston como referencia.', [

    {id: 'h-satb', titulo: 'Las cuatro voces', resumen: 'Soprano, contralto, tenor y bajo.', pasos: [
      {etapa: 'aprender', titulo: 'Un coro de cuatro voces', texto: `<p>La armonía tonal se estudia escribiendo para <b>cuatro voces</b>, como un coro: <b>soprano</b> (S) y <b>contralto</b> (A) en el pentagrama de clave de Sol, <b>tenor</b> (T) y <b>bajo</b> (B) en el de clave de Fa. En cada pentagrama, la voz más aguda lleva la plica hacia arriba y la más grave hacia abajo.</p><p>Cada voz es una <b>melodía</b> que alguien canta, no solo una nota de un acorde: por eso importa tanto cómo se mueve cada una de un acorde al siguiente. Escuchá la progresión completa y después cada voz por separado.</p>`,
        visual(el){ ver(el, DO, realizar(DO, [ac(0), ac(3), ac(4), ac(0)])); el.appendChild(h('p', 'lz-nota', 'Registros habituales: soprano Do4–Sol5 · contralto Sol3–Re5 · tenor Do3–Sol4 · bajo Mi2–Re4.')); }},
      {etapa: 'guiado', titulo: 'Tu primer acorde', texto: '<p>Escribí el acorde de <b>Do mayor</b> (Do – Mi – Sol) sobre el bajo dado. Elegí una voz arriba (o tocá directamente el pentagrama) y poné una nota en el soprano, otra en el contralto y otra en el tenor. Con cuatro voces y tres notas, una se repite: duplicá la <b>fundamental</b> (Do).</p>', requiere: true,
        visual(el, ctx){ tarea(el, ctx, {K: DO, cols: [{S: null, A: null, T: null, B: n(0, 3)}], fijas: [{B: true}], cifrado: [ac(0)], mostrarCifrado: true,
          inicio: 'Mirá el panel de abajo: muestra qué nota del acorde es cada voz.',
          cumple(an){ if (!an.completos) return ''; if (an.errores) return 'Casi: revisá los problemas marcados abajo.'; const id = an.ids[0]; return id.acorde.g === 0 && !id.ajenas.length ? true : 'Las notas tienen que ser Do, Mi y Sol.'; },
          exito: 'Escribiste un acorde a cuatro voces. Escuchalo y mirá su análisis.'}); }}
    ]},

    {id: 'h-acordes', titulo: 'Acordes de la tonalidad e inversiones', resumen: 'Grados, numerales romanos y posiciones.', pasos: [
      {etapa: 'aprender', titulo: 'Un acorde sobre cada grado', texto: `<p>Sobre cada nota de la escala se forma una tríada superponiendo terceras con las notas de la tonalidad. Se nombran con <b>numerales romanos</b> según el grado: mayúscula si el acorde es mayor (I, IV, V), minúscula si es menor (ii, iii, vi) y con ° si es disminuido (vii°).</p><p>En Do mayor: I = Do, ii = Re menor, iii = Mi menor, IV = Fa, V = Sol, vi = La menor, vii° = Si disminuido. Tocá los grados para verlos y escucharlos.</p>`,
        requiere: true, visual(el, ctx){
          const z = caja(el); const vistos = new Set();
          const mostrar = g => {
            const c = ac(g, 0);
            z.innerHTML = '';
            ver(z, DO, realizar(DO, [c], {finTonica: false})).tocarTodo();
            msg(el, `<b>${A.romano(DO, c)}</b>: ${A.nombreAcorde(DO, c)} (${A.notasAcorde(DO, c).map(x => M.corto(x)).join(' – ')})`);
            vistos.add(g); if (vistos.size >= 4) ctx.listo();
          };
          botones(el, [0, 1, 2, 3, 4, 5, 6].map(g => [A.romanoTexto(DO, ac(g)), () => mostrar(g)]));
          ver(z, DO, realizar(DO, [ac(0)]));
        }},
      {etapa: 'aprender', titulo: 'Estado fundamental e inversiones', texto: `<p>Lo que define la <b>posición</b> de un acorde es la nota que está en el <b>bajo</b>:</p><ul><li><b>Estado fundamental</b>: la fundamental en el bajo (I).</li><li><b>Primera inversión</b>: la tercera en el bajo. Se cifra con un 6 (I⁶), porque entre el bajo y la fundamental hay una sexta.</li><li><b>Segunda inversión</b>: la quinta en el bajo, cifrada ⁶₄ (I⁶₄). Es una posición inestable que se usa en situaciones especiales, sobre todo antes del V en la cadencia.</li></ul><p>La primera inversión suaviza la línea del bajo y le da variedad sin cambiar la función del acorde.</p>`,
        visual(el){ ver(el, DO, realizar(DO, [ac(0), ac(0, 1), ac(0, 2)], {finTonica: false})); }},
      {etapa: 'ejemplo', titulo: 'En modo menor', texto: `<p>En menor se usa la escala <b>menor armónica</b> para el V y el vii°: el 7.º grado se eleva medio tono y se convierte en <b>sensible</b>. Así el V es mayor, como en el modo mayor, y la dominante tiene la misma fuerza para volver a la tónica.</p><p>En La menor: i = La menor, iv = Re menor, <b>V = Mi mayor (con Sol♯)</b>.</p>`,
        visual(el){ ver(el, LAm, realizar(LAm, [ac(0), ac(3), ac(4), ac(0)])); }},
      {etapa: 'solo', titulo: 'Nombrá los acordes', ejercicio: {tipo: 'h-grado', cantidad: 5}}
    ]},

    {id: 'h-duplicacion', titulo: 'Duplicación y disposición', resumen: 'Qué nota repetir y cómo repartir las voces.', pasos: [
      {etapa: 'aprender', titulo: 'Qué nota duplicar', texto: `<p>Una tríada tiene tres notas y hay cuatro voces: una nota se <b>duplica</b>. No es arbitrario, porque cada nota tiene un peso distinto:</p><ul><li><b>Estado fundamental:</b> lo normal es duplicar la <b>fundamental</b>, que refuerza el acorde. La quinta también se puede duplicar. Duplicar la tercera de un acorde mayor la hace demasiado prominente y se evita salvo por razones de conducción.</li><li><b>Nunca se duplica la sensible</b>: tiene una tendencia tan fuerte a subir que las dos voces tendrían que resolver igual (octavas paralelas).</li><li>Se puede <b>omitir la quinta</b> (triplicando la fundamental), pero nunca la tercera.</li><li><b>Primera inversión:</b> se duplica la nota que permita la mejor conducción (salvo la sensible).</li><li><b>Segunda inversión:</b> se duplica el bajo.</li></ul>`},
      {etapa: 'aprender', titulo: 'Disposición cerrada y abierta', texto: `<p>Las tres voces superiores no deberían separarse más de una octava entre vecinas (soprano–contralto, contralto–tenor): el acorde queda equilibrado. El bajo sí puede estar más lejos del tenor.</p><p>Si soprano, contralto y tenor están lo más juntos posible (dentro de una octava), la disposición es <b>cerrada</b>; si dejan espacio para intercalar notas del acorde, es <b>abierta</b>. Las dos son correctas; la abierta suena más amplia.</p>`,
        visual(el){
          const z = caja(el);
          const cerrada = [{S: n(0, 5), A: n(4, 4), T: n(2, 4), B: n(0, 3)}], abierta = [{S: n(2, 5), A: n(4, 4), T: n(0, 4), B: n(0, 3)}];
          ED.crear(z, {K: DO, cols: cerrada, soloLectura: true, panel: false});
          botones(el, [['Cerrada', () => ED.crear(z, {K: DO, cols: cerrada, soloLectura: true, panel: false}).tocarTodo()], ['Abierta', () => ED.crear(z, {K: DO, cols: abierta, soloLectura: true, panel: false}).tocarTodo()]]);
        }},
      {etapa: 'guiado', titulo: 'Corregí la duplicación', texto: '<p>Este acorde de <b>Sol mayor (V en Do)</b> tiene la <b>sensible (Si) duplicada</b>. Cambiá una de las dos por la fundamental (Sol). El bajo está dado.</p>', requiere: true,
        visual(el, ctx){ tarea(el, ctx, {K: DO, cols: [{S: n(6, 4), A: n(1, 4), T: n(6, 3), B: n(4, 2)}], fijas: [{B: true}], cifrado: [ac(4)], mostrarCifrado: true,
          cumple: an => an.completos && !an.errores && an.ids[0].acorde.g === 4 ? true : '', exito: 'Ahora la sensible está en una sola voz.'}); }},
      {etapa: 'solo', titulo: '¿Qué nota está duplicada?', ejercicio: {tipo: 'h-duplicacion', cantidad: 4}}
    ]},

    {id: 'h-movimiento', titulo: 'Tipos de movimiento', resumen: 'Paralelo, similar, contrario y oblicuo.', pasos: [
      {etapa: 'aprender', titulo: 'Cómo se mueven dos voces', texto: `<p>Entre dos voces hay cuatro tipos de movimiento:</p><ul><li><b>Contrario:</b> una sube y la otra baja. Es el que más independiza las voces.</li><li><b>Oblicuo:</b> una se queda y la otra se mueve.</li><li><b>Similar (directo):</b> las dos van en la misma dirección, pero cambia el intervalo entre ellas.</li><li><b>Paralelo:</b> las dos van en la misma dirección y conservan el mismo intervalo.</li></ul><p>Una buena escritura mezcla los cuatro, con predominio del contrario y el oblicuo entre bajo y soprano.</p>`,
        visual(el){
          const z = caja(el);
          const EJ = {
            Contrario: [{S: n(2, 5), A: null, T: null, B: n(0, 3)}, {S: n(1, 5), A: null, T: null, B: n(4, 3)}],
            Oblicuo: [{S: n(4, 4), A: null, T: null, B: n(0, 3)}, {S: n(4, 4), A: null, T: null, B: n(2, 3)}],
            Similar: [{S: n(2, 5), A: null, T: null, B: n(0, 3)}, {S: n(4, 5), A: null, T: null, B: n(3, 3)}],
            Paralelo: [{S: n(2, 5), A: null, T: null, B: n(0, 3)}, {S: n(3, 5), A: null, T: null, B: n(1, 3)}]
          };
          const mostrar = k => { ED.crear(z, {K: DO, cols: EJ[k], soloLectura: true, panel: false, sinCifra: true, resaltar: {voces: ['S', 'B']}, audioVoces: false}).tocarTodo(); msg(el, `<b>${k}.</b>`); };
          ED.crear(z, {K: DO, cols: EJ.Contrario, soloLectura: true, panel: false, sinCifra: true, audioVoces: false});
          botones(el, Object.keys(EJ).map(k => [`▶ ${k}`, () => mostrar(k)]));
        }},
      {etapa: 'guiado', titulo: 'Probá los cuatro', texto: '<p>El bajo y el primer soprano están dados. Mové el <b>soprano del segundo acorde</b> (con las flechas o tocando el pentagrama) y mirá en el panel qué movimiento forma con el bajo. Conseguí al menos tres tipos distintos.</p>', requiere: true,
        visual(el, ctx){
          const vistos = new Set();
          const z = caja(el);
          ED.crear(z, {K: DO, cols: [{S: n(4, 4), A: null, T: null, B: n(0, 3)}, {S: n(4, 4), A: null, T: null, B: n(3, 3)}], fijas: [{S: true, B: true}, {B: true}], sinCifra: true,
            onCambio(an){ const m = an.enlaces[0] && an.enlaces[0].movs.SB; if (m && m !== 'quieto'){ vistos.add(m); msg(el, `Soprano y bajo: <b>${A.TIPO_MOV[m]}</b>. Llevás ${vistos.size} de 3 tipos.`); if (vistos.size >= 3) ctx.listo(); } }}).seleccionar(1, 'S');
          msg(el, 'Elegí el soprano del segundo acorde y movelo.');
        }},
      {etapa: 'solo', titulo: 'Reconocé el movimiento', ejercicio: {tipo: 'h-movimiento', cantidad: 4}}
    ]},

    {id: 'h-paralelas', titulo: 'Quintas y octavas paralelas', resumen: 'Por qué se evitan y cómo evitarlas.', pasos: [
      {etapa: 'aprender', titulo: 'Cuando dos voces se funden', texto: `<p>La octava y la quinta justa son los intervalos más consonantes: sus notas se mezclan tanto que, si dos voces van <b>en paralelo</b> en quintas o en octavas, el oído las escucha como <b>una sola voz reforzada</b>. La textura de cuatro partes independientes se pierde por un momento.</p><p>Por eso es una <b>regla general</b> del estilo coral: dos voces no van de una quinta justa a otra, ni de una octava a otra, en el mismo par de voces. Compará: en el primer ejemplo soprano y bajo suben juntos en octavas; en el segundo, el soprano baja.</p>`,
        visual(el){
          const mal = [{S: n(0, 5), A: n(4, 4), T: n(2, 4), B: n(0, 3)}, {S: n(1, 5), A: n(5, 4), T: n(3, 4), B: n(1, 3)}];
          const bien = [{S: n(0, 5), A: n(4, 4), T: n(2, 4), B: n(0, 3)}, {S: n(5, 4), A: n(3, 4), T: n(1, 4), B: n(1, 3)}];
          el.appendChild(h('p', 'lz-nota', '<b>Con paralelas</b> (I → ii, todas las voces suben):'));
          ver(el, DO, mal);
          el.appendChild(h('p', 'lz-nota', '<b>Corregido</b> (las voces superiores van en contra del bajo):'));
          ver(el, DO, bien);
        }},
      {etapa: 'guiado', titulo: 'Corregí las paralelas', texto: '<p>Este enlace tiene quintas u octavas paralelas. Tocá el problema en la lista para ver las líneas que lo marcan, escuchalo y corregilo moviendo una voz superior (el bajo está dado).</p>', requiere: true,
        visual(el, ctx){
          let ej = null;
          for (let i = 0; i < 30 && !ej; i++){
            const p = [ac(0), ac(M.azar([1, 3, 4]))];
            const r = A.realizar(DO, p, [], {azar: 4});
            const e = r && A.conError(DO, p, r.cols, ['paralelas-5', 'paralelas-8']);
            if (e) ej = {p, cols: e.cols};
          }
          tarea(el, ctx, {K: DO, cols: ej.cols, fijas: ej.cols.map(() => ({B: true})), cifrado: ej.p, mostrarCifrado: true,
            cumple: an => an.completos && !an.errores ? true : '', exito: 'Sin paralelas. Escuchá cómo las voces vuelven a ser independientes.'});
        }},
      {etapa: 'aprender', titulo: 'Lo que no cuenta como paralela', texto: `<ul><li>Si una de las dos voces <b>repite la nota</b>, no hay movimiento paralelo: es oblicuo.</li><li>De una quinta justa a una <b>disminuida</b> (o al revés) no son quintas iguales. De justa a disminuida se acepta; de disminuida a justa conviene evitarlo con el bajo (es una preferencia de estilo).</li><li>Quintas u octavas por <b>movimiento contrario</b> (de una quinta a una duodécima, por ejemplo) evitan el paralelismo literal, pero el efecto de fusión persiste: el análisis las marca como observación de estilo, no como error.</li></ul>`},
      {etapa: 'solo', titulo: '¿Qué error hay?', ejercicio: {tipo: 'h-error', cantidad: 4, op: {buscados: ['paralelas-5', 'paralelas-8', 'cruce']}}}
    ]},

    {id: 'h-directas', titulo: 'Reglas generales y preferencias de estilo', resumen: 'Directas, cruces, espaciado y saltos.', pasos: [
      {etapa: 'aprender', titulo: 'No todo pesa lo mismo', texto: `<p>Las indicaciones de conducción no son una lista de prohibiciones iguales. El análisis las separa en tres niveles:</p><ul><li><span class="sev-error">●</span> <b>Reglas generales</b>: casi no tienen excepciones en el estilo coral (paralelas, duplicar la sensible, cruces, más de una octava entre voces superiores, saltos aumentados).</li><li><span class="sev-aviso">●</span> <b>Preferencias de estilo</b>: se cumplen la mayoría de las veces, pero hay contextos donde se aceptan (directas, tercera duplicada, saltos grandes en voces interiores).</li><li><span class="sev-info">●</span> <b>Excepciones y consejos</b>: situaciones aceptadas (la sensible que baja en una voz interior, la quinta omitida) o sugerencias para mejorar.</li></ul>`},
      {etapa: 'aprender', titulo: 'Quintas y octavas directas', texto: `<p>Cuando <b>soprano y bajo</b> llegan a una quinta o una octava por <b>movimiento similar</b>, el oído «completa» el paralelismo: se llaman quintas u octavas <b>directas</b> (u ocultas). Se aceptan si el soprano se mueve <b>por grado conjunto</b>; con salto en el soprano, conviene evitarlas.</p><p>Escuchá las voces extremas en los dos ejemplos.</p>`,
        visual(el){
          el.appendChild(h('p', 'lz-nota', '<b>Octava directa con salto en el soprano</b> (I → V: se evita):'));
          ver(el, DO, [{S: n(2, 5), A: n(4, 4), T: n(0, 4), B: n(0, 3)}, {S: n(4, 5), A: n(4, 4), T: n(6, 3), B: n(4, 3)}]);
          el.appendChild(h('p', 'lz-nota', '<b>Octava directa con el soprano por grado</b> (V → I: aceptada):'));
          ver(el, DO, [{S: n(6, 4), A: n(1, 4), T: n(4, 3), B: n(4, 2)}, {S: n(0, 5), A: n(2, 4), T: n(4, 3), B: n(0, 3)}]);
        }},
      {etapa: 'aprender', titulo: 'Otras precauciones', texto: `<ul><li><b>Cruce de voces:</b> cada voz se mantiene en su lugar (el contralto no pasa por encima del soprano).</li><li><b>Superposición:</b> una voz no salta más allá de donde estaba su vecina en el acorde anterior.</li><li><b>Saltos:</b> se evitan los intervalos aumentados y los saltos mayores que una octava; las voces interiores se mueven poco.</li><li><b>Las cuatro voces en la misma dirección</b> se evitan: es fácil caer en paralelas y se pierde el equilibrio.</li></ul>`},
      {etapa: 'solo', titulo: 'Encontrá el error', ejercicio: {tipo: 'h-error', cantidad: 5}}
    ]},

    {id: 'h-enlace', titulo: 'Enlazar acordes: el método', resumen: 'Notas comunes, notas cercanas y movimiento contrario.', pasos: [
      {etapa: 'aprender', titulo: 'Tres situaciones', texto: `<p>Piston propone una forma sencilla de enlazar tríadas en estado fundamental, según la distancia entre las fundamentales:</p><ol><li><b>A una cuarta o una quinta</b> (I–IV, I–V, ii–V): hay <b>una nota común</b>. Se mantiene en la misma voz y las otras dos voces superiores van a la nota más cercana.</li><li><b>A una tercera</b> (I–vi, IV–ii): hay <b>dos notas comunes</b>. Se mantienen y se mueve una sola voz.</li><li><b>A una segunda</b> (IV–V, V–vi): <b>no hay notas comunes</b>. Las tres voces superiores se mueven en <b>dirección contraria al bajo</b>, a las notas más cercanas: así se evitan las paralelas.</li></ol><p>Son puntos de partida, no recetas: otras conducciones también son válidas si respetan las reglas.</p>`,
        visual(el){
          const z = caja(el);
          const EJ = {'I → IV (nota común)': [ac(0), ac(3)], 'I → vi (dos notas comunes)': [ac(0), ac(5)], 'IV → V (contrario al bajo)': [ac(3), ac(4)]};
          const mostrar = k => { const cols = A.realizar(DO, EJ[k]).cols; ED.crear(z, {K: DO, cols, soloLectura: true, panel: true}).tocarTodo(); };
          botones(el, Object.keys(EJ).map(k => [`▶ ${k}`, () => mostrar(k)]));
          mostrar(Object.keys(EJ)[0]);
        }},
      {etapa: 'guiado', titulo: 'Enlazá vos', texto: '<p>Completá el segundo acorde. Si te trabás, tocá «Pista».</p>', requiere: true, visual(el, ctx){ desafio(el, ctx, 'enlace', 2); }},
      {etapa: 'solo', titulo: 'Con inversiones', texto: '<p>Ahora con acordes en primera inversión.</p>', requiere: true, visual(el, ctx){ desafio(el, ctx, 'inversiones', 1); }}
    ]},

    {id: 'h-funciones', titulo: 'Funciones y progresiones', resumen: 'Tónica, subdominante y dominante.', pasos: [
      {etapa: 'aprender', titulo: 'Qué hace cada acorde', texto: `<p>Los acordes se agrupan por su <b>función</b> en la frase:</p><ul><li><b>Tónica (T)</b>: I, y como sustitutos vi y iii. Reposo.</li><li><b>Subdominante (S)</b>: IV y ii. Se alejan de la tónica y preparan la dominante.</li><li><b>Dominante (D)</b>: V y vii°. Tensión que pide volver a la tónica.</li></ul><p>Una frase típica recorre T → S → D → T. Piston resume qué progresiones de fundamentales son habituales:</p>
        <table class="lz-tabla"><thead><tr><th>Desde</th><th>Usualmente a</th><th>A veces a</th></tr></thead><tbody>
        <tr><td>I</td><td>IV, V</td><td>vi</td></tr><tr><td>ii</td><td>V</td><td>IV, vi</td></tr><tr><td>iii</td><td>vi</td><td>IV</td></tr><tr><td>IV</td><td>V</td><td>I, ii</td></tr><tr><td>V</td><td>I</td><td>vi, IV</td></tr><tr><td>vi</td><td>ii, V</td><td>iii, IV</td></tr><tr><td>vii°</td><td>I</td><td>iii</td></tr></tbody></table>`},
      {etapa: 'guiado', titulo: 'Armá una progresión', texto: '<p>Tocá los numerales para armar una progresión de 4 a 6 acordes y escuchala realizada a cuatro voces. Probá progresiones de la tabla y alguna «rara» (como V → IV) para comparar.</p>', requiere: true,
        visual(el, ctx){
          let lista = [];
          const z = caja(el);
          const pintar = () => { msg(el, lista.length ? lista.map(c => A.romanoTexto(DO, c)).join(' → ') : 'Elegí acordes.'); };
          botones(el, [0, 1, 2, 3, 4, 5, 6].map(g => [A.romanoTexto(DO, ac(g, g === 6 ? 1 : 0)), () => { if (lista.length < 6){ lista.push(ac(g, g === 6 ? 1 : 0)); pintar(); } }]));
          botones(el, [['▶ Realizar y escuchar', () => { if (lista.length < 2) return; const r = A.realizar(DO, lista, [], {finTonica: lista[lista.length - 1].g === 0}); if (r){ ED.crear(z, {K: DO, cols: r.cols, soloLectura: true}).tocarTodo(); if (lista.length >= 4) ctx.listo(); } }], ['Borrar', () => { lista = []; z.innerHTML = ''; pintar(); }]]);
          pintar();
        }},
      {etapa: 'solo', titulo: '¿Qué función cumple?', ejercicio: {tipo: 'h-funcion', cantidad: 5}}
    ]},

    {id: 'h-dominante', titulo: 'La dominante, la sensible y el V⁷', resumen: 'Notas con tendencia.', pasos: [
      {etapa: 'aprender', titulo: 'Notas que tienden', texto: `<p>En el V → I hay notas que «quieren» ir a un lugar:</p><ul><li>La <b>sensible</b> sube medio tono a la tónica. En el soprano es obligatorio; en una voz interior se acepta que baje a la quinta del I para completar el acorde (la llamada sensible frustrada).</li><li>En el <b>V⁷</b>, la <b>séptima</b> es una disonancia que <b>baja por grado</b> (en Do: Fa → Mi).</li></ul><p>Consecuencia: si el V⁷ está completo, el I que sigue suele quedar <b>sin quinta</b> (fundamental triplicada); si se quiere un I completo, el V⁷ se escribe sin quinta. Las dos soluciones son correctas.</p>`,
        visual(el){
          el.appendChild(h('p', 'lz-nota', '<b>V⁷ completo → I incompleto:</b>'));
          ver(el, DO, [{S: n(3, 5), A: n(6, 4), T: n(1, 4), B: n(4, 2)}, {S: n(2, 5), A: n(0, 5), T: n(0, 4), B: n(0, 3)}]);
          el.appendChild(h('p', 'lz-nota', '<b>V⁷ sin quinta → I completo:</b>'));
          ver(el, DO, [{S: n(6, 4), A: n(3, 4), T: n(4, 3), B: n(4, 2)}, {S: n(0, 5), A: n(2, 4), T: n(4, 3), B: n(0, 3)}]);
        }},
      {etapa: 'guiado', titulo: 'Resolvé el V⁷', requiere: true, visual(el, ctx){ desafio(el, ctx, 'septima', 1); }}
    ]},

    {id: 'h-cadencias', titulo: 'Cadencias', resumen: 'Cómo terminan las frases.', pasos: [
      {etapa: 'aprender', titulo: 'Cuatro finales', texto: `<p>La <b>cadencia</b> es la fórmula armónica que cierra una frase:</p><ul><li><b>Auténtica</b> (V → I): la conclusión más fuerte. Es <b>perfecta</b> si los dos acordes están en estado fundamental y la tónica está en el soprano.</li><li><b>Plagal</b> (IV → I): el «Amén», una conclusión suave.</li><li><b>Semicadencia</b>: termina en el V; la frase queda abierta, como una pregunta.</li><li><b>Rota</b> (V → vi): el oído espera el I y llega el vi; prolonga la música.</li></ul><p>Antes del V aparece a menudo el <b>I⁶₄ cadencial</b>: suena como un adorno de la dominante, con el bajo duplicado.</p>`,
        visual(el){
          const z = caja(el);
          const EJ = {'Auténtica': [ac(0), ac(3), ac(4), ac(0)], 'Con I⁶₄ cadencial': [ac(0), ac(3), ac(0, 2), ac(4), ac(0)], 'Plagal': [ac(0), ac(4), ac(3), ac(0)], 'Semicadencia': [ac(0), ac(5), ac(3), ac(4)], 'Rota': [ac(0), ac(3), ac(4), ac(5)]};
          const mostrar = k => { const cols = realizar(DO, EJ[k], {finTonica: k === 'Auténtica'}); const ed = ED.crear(z, {K: DO, cols, soloLectura: true, panel: true}); ed.tocarTodo(); };
          botones(el, Object.keys(EJ).map(k => [`▶ ${k}`, () => mostrar(k)]));
          mostrar('Auténtica');
        }},
      {etapa: 'solo', titulo: 'Reconocé la cadencia', ejercicio: {tipo: 'h-cadencia', cantidad: 4}},
      {etapa: 'solo', titulo: 'De oído', ejercicio: {tipo: 'h-cadencia', cantidad: 3, op: {auditivo: true}}},
      {etapa: 'guiado', titulo: 'Escribí una cadencia', requiere: true, visual(el, ctx){ desafio(el, ctx, 'cadencias', 1); }}
    ]},

    {id: 'h-armonizar-bajo', titulo: 'Armonizar un bajo', resumen: 'Del bajo dado a las cuatro voces.', pasos: [
      {etapa: 'aprender', titulo: 'Un método', texto: `<ol><li><b>Identificá los acordes.</b> Con cifrado, ya están dados. Sin cifrado, cada nota del bajo puede ser la fundamental (estado fundamental) o la tercera (primera inversión) de un acorde; elegí según las progresiones habituales.</li><li><b>Planeá la cadencia final</b> (V → I).</li><li><b>Escribí el soprano</b>: una melodía que se mueva sobre todo por grado y, cuando se pueda, en dirección contraria al bajo.</li><li><b>Completá contralto y tenor</b> con las notas que falten, buscando la nota más cercana y manteniendo las notas comunes.</li><li><b>Revisá</b> paralelas, duplicaciones y la resolución de la sensible. Escuchá cada voz por separado.</li></ol>`},
      {etapa: 'guiado', titulo: 'Bajo cifrado', requiere: true, visual(el, ctx){ desafio(el, ctx, 'bajo-cifrado', 1); }},
      {etapa: 'solo', titulo: 'Bajo sin cifrar', requiere: true, visual(el, ctx){ desafio(el, ctx, 'bajo', 1); }}
    ]},

    {id: 'h-armonizar-melodia', titulo: 'Armonizar una melodía', resumen: 'Del soprano dado a las cuatro voces.', pasos: [
      {etapa: 'aprender', titulo: 'Desde arriba', texto: `<ol><li><b>Empezá por el final:</b> la última nota suele ser la tónica (acorde I) y la anterior, una nota del V.</li><li><b>Para cada nota de la melodía</b>, listá los acordes que la contienen: cada nota puede ser fundamental, tercera o quinta de tres acordes distintos.</li><li><b>Elegí</b> los que formen progresiones habituales (T → S → D → T).</li><li><b>Escribí el bajo</b>, cuidando las voces extremas: mejor en movimiento contrario a la melodía y sin quintas ni octavas paralelas o directas con salto.</li><li><b>Completá</b> contralto y tenor.</li></ol>`},
      {etapa: 'solo', titulo: 'Armonizá', requiere: true, visual(el, ctx){ desafio(el, ctx, 'melodia', 1); }}
    ]}
  ]);
})();
