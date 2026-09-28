// Contenido pedagógico. Cada lección es una lista de pasos; cada paso pertenece a una
// etapa del ciclo (aprender → ver ejemplos → hacer con ayuda → hacer solo).
// Un paso puede tener un visual interactivo (visual(el, ctx)) y/o un ejercicio.
// Si el paso tiene `requiere`, el botón Siguiente se habilita cuando el visual llama a ctx.listo().
(function(){
  const M = window.Musica, V = window.Visual, E = window.Ejercicios;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const caja = (el, cls = 'lz-caja') => { const d = h('div', cls); el.appendChild(d); return d; };
  const botones = (el, items) => { const d = h('div', 'lz-botones'); items.forEach(([t, fn, cls]) => { const b = h('button', 'btn secondary' + (cls ? ' ' + cls : ''), t); b.type = 'button'; b.addEventListener('click', () => fn(b)); d.appendChild(b); }); el.appendChild(d); return d; };
  const nota = (l, o = 4, extra = {}) => Object.assign({l, o, acc: null}, extra);
  const msg = (el, html) => { let p = el.querySelector('.lz-msg'); if (!p){ p = h('p', 'lz-msg'); p.setAttribute('aria-live', 'polite'); el.appendChild(p); } p.innerHTML = html; };

  // Recorrido paso a paso de un intervalo (armadura + dos notas), con visuales en cada paso
  function recorrido(el, a, ctx, clave = 'treble'){
    const pasos = E.pasosIntervalo(a);
    const st = caja(el, 'lz-pg'), tk = caja(el, 'lz-tk'), lista = h('ol', 'proc proc-vivo'); el.appendChild(lista);
    tk.hidden = true;
    let i = -1;
    const base = extra => V.pentagrama(st, Object.assign({clave, armadura: a.arm, notas: [Object.assign({color: 'a'}, a.x, extra ? extra(a.x) : {}), Object.assign({color: 'b'}, a.y, extra ? extra(a.y) : {})]}));
    base();
    const b = botones(el, [['Primer paso ▸', () => (i < pasos.length - 1 ? avanzar() : reiniciar()), 'primario']]).querySelector('button');
    function reiniciar(){ el.innerHTML = ''; recorrido(el, a, ctx, clave); }
    function avanzar(){
      i++;
      const p = pasos[i];
      const li = h('li', null, `<b>${p.t}.</b> ${p.d}`); lista.appendChild(li);
      if (p.t.startsWith('Identificar')) base(e => ({texto: M.corto(M.desdePaso(M.paso(e)))}));
      else if (p.t.startsWith('Determinar el número')) V.contar(st, a.iv.lo === a.rx ? a.x : a.y, a.iv.lo === a.rx ? a.y : a.x, {clave, armadura: a.arm, sonar: true}).empezar();
      else if (p.t.startsWith('Aplicar')) base(e => { const r = M.altura(e, a.arm); return {texto: M.corto(r), color: (r.a !== 0 || e.acc !== null) ? 'ok' : undefined}; });
      else if (p.t.startsWith('Contar')){
        tk.hidden = false;
        const lo = M.midi(a.iv.lo), hi = M.midi(a.iv.hi);
        const k = V.teclado(tk, {desde: Math.min(60, lo - (lo % 12)), hasta: Math.max(72, hi + (11 - hi % 12) + 1), etiquetas: 'ninguna'});
        const marcas = {[lo]: {c: 'a', t: M.corto(a.iv.lo)}};
        for (let m = lo + 1; m <= hi; m++) marcas[m] = {c: m === hi ? 'b' : 'guia', t: String(m - lo)};
        if (hi > lo) marcas[hi].t = `${M.corto(a.iv.hi)} ${hi - lo}`;
        k.marcar(marcas);
        Sonido.intervalo(M.midi(a.rx), M.midi(a.ry));
      } else if (p.t.startsWith('Nombrar')){
        base(e => ({texto: M.corto(M.altura(e, a.arm))}));
        Sonido.intervalo(M.midi(a.rx), M.midi(a.ry));
        lista.after(h('p', 'lz-resultado', `Resultado: <b>${M.nombreIntervalo(a.num, a.cal)}</b>`));
      }
      if (i === pasos.length - 1){ b.textContent = '↺ Ver de nuevo'; ctx.listo(); }
      else b.textContent = `Paso ${i + 2} de ${pasos.length} ▸`;
    }
  }

  // ======================================================================
  const U = [];
  const unidad = (id, titulo, desc, lecciones) => U.push({id, titulo, desc, lecciones});

  // ---------------------------------------------------------------- Notas
  unidad('notas', 'Las notas', 'Nombres, teclado, alteraciones y pentagrama. Sin suponer nada: se empieza desde cero.', [
    {id: 'n-nombres', titulo: 'Los nombres de las notas', resumen: 'Siete nombres que se repiten en ciclo.', pasos: [
      {etapa: 'aprender', titulo: 'Siete nombres', texto: `<p>En la música occidental hay solo <b>siete nombres de notas</b>:</p><p class="lz-grande">Do · Re · Mi · Fa · Sol · La · Si</p><p>Después de Si, la serie <b>vuelve a empezar</b> en Do, pero más agudo. Por eso en el teclado los nombres se repiten una y otra vez.</p><p>Tocá las teclas blancas de izquierda a derecha y escuchá cómo sube el sonido mientras los nombres se repiten.</p>`,
        requiere: true, visual(el, ctx){
          const vistas = new Set();
          const k = V.teclado(caja(el), {desde: 60, hasta: 83, etiquetas: 'blancas', onTecla: m => { if (!M.esNegra(m)) vistas.add(m); msg(el, `${M.latino(M.deMidi(m))} · llevás ${vistas.size} de 8 teclas blancas`); if (vistas.size >= 8) ctx.listo(); }});
          msg(el, 'Tocá al menos 8 teclas blancas distintas.');
        }},
      {etapa: 'ejemplo', titulo: 'Subir y bajar', texto: `<p>Si recorremos las notas hacia arriba se llama <b>ascender</b> (el sonido se vuelve más agudo); hacia abajo, <b>descender</b> (más grave).</p><p>Ascendiendo: Do Re Mi Fa Sol La Si <b>Do</b>. Descendiendo: Do Si La Sol Fa Mi Re <b>Do</b>.</p>`,
        visual(el){
          const k = V.teclado(caja(el), {desde: 60, hasta: 72, etiquetas: 'blancas'});
          const esc = [60,62,64,65,67,69,71,72];
          const tocar = ms => { Sonido.secuencia(ms, 0.45); ms.forEach((m, i) => setTimeout(() => k.marcar({[m]: {c: 'a'}}), i*450)); setTimeout(() => k.limpiar(), ms.length*450 + 400); };
          botones(el, [['▶ Ascender', () => tocar(esc)], ['▶ Descender', () => tocar(esc.slice().reverse())]]);
        }},
      {etapa: 'solo', titulo: 'Practicá el orden', texto: '<p>Respondé sin mirar el teclado.</p>', ejercicio: {tipo: 'nombres', cantidad: 4}}
    ]},
    {id: 'n-anglo', titulo: 'Notación anglosajona: C, D, E…', resumen: 'Las mismas notas, con letras.', pasos: [
      {etapa: 'aprender', titulo: 'Las mismas notas, con letras', texto: `<p>En muchos libros, partituras de música popular y cifrados de acordes las notas se nombran con <b>letras</b>:</p>
        <table class="eq"><tr>${M.LATINO.map(x => `<td>${x}</td>`).join('')}</tr><tr>${M.ANGLO.map(x => `<td><b>${x}</b></td>`).join('')}</tr></table>
        <p>El abecedario empieza en <b>La = A</b>: A B C D E F G. Por eso Do es C. Cambiá los nombres del teclado para comparar.</p>`,
        requiere: true, visual(el, ctx){
          const k = V.teclado(caja(el), {desde: 60, hasta: 71, etiquetas: 'ninguna'});
          const poner = sis => { const mk = {}; for (let m = 60; m <= 71; m++) if (!M.esNegra(m)) mk[m] = {t: (sis === 'anglo' ? M.ANGLO : M.LATINO)[M.deMidi(m).l]}; k.marcar(mk); };
          poner('latino');
          let cambios = 0;
          botones(el, [['Do Re Mi', () => { poner('latino'); if (++cambios >= 2) ctx.listo(); }], ['C D E', () => { poner('anglo'); if (++cambios >= 2) ctx.listo(); }]]);
        }},
      {etapa: 'ejemplo', titulo: 'Con alteraciones', texto: `<p>Las alteraciones se escriben igual: <b>Fa♯ = F♯</b>, <b>Si♭ = B♭</b>. En cifrados también se ve <b>F#</b> y <b>Bb</b>.</p><p>Arriba de la página podés elegir cómo querés ver los nombres en toda la aplicación: Do-Re-Mi, letras o ambos.</p>`},
      {etapa: 'solo', titulo: 'Practicá la equivalencia', ejercicio: {tipo: 'anglo', cantidad: 5}}
    ]},
    {id: 'n-teclado', titulo: 'Las notas en el teclado', resumen: 'Los grupos de teclas negras como mapa.', pasos: [
      {etapa: 'aprender', titulo: 'El mapa de las teclas negras', texto: `<p>Las teclas negras están agrupadas de a <b>dos</b> y de a <b>tres</b>. Ese patrón se repite y sirve de mapa:</p><ul><li><b>Do</b> está justo a la izquierda del grupo de <b>dos</b> negras.</li><li><b>Fa</b> está justo a la izquierda del grupo de <b>tres</b> negras.</li></ul><p>Desde ahí, las demás blancas siguen en orden.</p>`,
        visual(el){
          const k = V.teclado(caja(el), {desde: 60, hasta: 83, etiquetas: 'ninguna'});
          const mk = {}; [61,63,73,75].forEach(m => mk[m] = {c: 'a'}); [66,68,70,78,80,82].forEach(m => mk[m] = {c: 'b'});
          [60,72].forEach(m => mk[m] = {c: 'guia', t: M.corto(M.nota(0))}); [65,77].forEach(m => mk[m] = {c: 'guia', t: M.corto(M.nota(3))});
          k.marcar(mk);
        }},
      {etapa: 'guiado', titulo: 'Encontrá todos los Do', texto: '<p>Tocá <b>todos los Do</b> del teclado. Pista: a la izquierda del grupo de dos negras.</p>', requiere: true,
        visual(el, ctx){ buscarTodas(el, ctx, 0); }},
      {etapa: 'guiado', titulo: 'Encontrá todos los Fa', texto: '<p>Ahora tocá <b>todos los Fa</b>. Pista: a la izquierda del grupo de tres negras.</p>', requiere: true,
        visual(el, ctx){ buscarTodas(el, ctx, 3); }},
      {etapa: 'solo', titulo: 'Sin pistas', ejercicio: {tipo: 'teclado', cantidad: 5}}
    ]},
    {id: 'n-tonos', titulo: 'Tonos y semitonos', resumen: 'La distancia más chica y la de dos pasos.', pasos: [
      {etapa: 'aprender', titulo: 'La distancia más chica', texto: `<p>Un <b>semitono</b> (o medio tono) es la distancia entre una tecla y la de al lado, <b>sea blanca o negra</b>. Es la distancia más chica del piano.</p><p>Un <b>tono</b> son <b>dos semitonos</b>: hay una tecla en el medio.</p><p>Tocá dos teclas, una después de otra, y te digo cuántos semitonos hay.</p>`,
        requiere: true, visual(el, ctx){
          let prev = null, medidas = 0;
          const k = V.teclado(caja(el), {desde: 60, hasta: 76, etiquetas: 'blancas', onTecla: m => {
            if (prev === null){ prev = m; k.marcar({[m]: {c: 'a'}}); msg(el, `Primera nota: ${M.corto(M.deMidi(m))}. Tocá otra.`); return; }
            const d = Math.abs(m - prev), mk = {[prev]: {c: 'a'}};
            for (let x = Math.min(m, prev) + 1; x <= Math.max(m, prev); x++) mk[x] = {c: x === m ? 'b' : 'guia', t: String(x - Math.min(m, prev))};
            if (m < prev) mk[prev] = {c: 'a', t: String(d)};
            k.marcar(mk);
            msg(el, `De ${M.corto(M.deMidi(prev))} a ${M.corto(M.deMidi(m))}: <b>${M.plural(d, 'semitono')}</b>${d === 1 ? ' (medio tono)' : d === 2 ? ' = <b>un tono</b>' : d % 2 === 0 ? ` = ${d/2} tonos` : ''}.`);
            prev = null; if (++medidas >= 3) ctx.listo();
          }});
          msg(el, 'Tocá la primera nota.');
        }},
      {etapa: 'ejemplo', titulo: 'Dos semitonos “escondidos”', texto: `<p>Casi todas las teclas blancas vecinas tienen una negra en el medio: están a <b>un tono</b>. Hay dos excepciones, donde no hay negra en el medio:</p><p class="lz-grande">Mi–Fa y Si–Do</p><p>Esos dos pares están a <b>un semitono</b>. Es muy importante recordarlo: aparece todo el tiempo al calcular intervalos.</p>`,
        visual(el){
          const k = V.teclado(caja(el), {desde: 60, hasta: 72, etiquetas: 'blancas'});
          k.marcar({64: {c: 'a'}, 65: {c: 'b'}, 71: {c: 'a'}, 72: {c: 'b'}});
          botones(el, [['▶ Mi–Fa', () => Sonido.intervalo(64, 65)], ['▶ Si–Do', () => Sonido.intervalo(71, 72)], ['▶ Do–Re (un tono)', () => Sonido.intervalo(60, 62)]]);
        }},
      {etapa: 'solo', titulo: '¿Tono o semitono?', ejercicio: {tipo: 'tonos', cantidad: 5}}
    ]},
    {id: 'n-alteraciones', titulo: 'Sostenidos, bemoles y becuadros', resumen: 'Subir y bajar medio tono.', pasos: [
      {etapa: 'aprender', titulo: 'Tres signos', texto: `<ul><li><b>Sostenido ♯</b>: sube la nota <b>un semitono</b>.</li><li><b>Bemol ♭</b>: baja la nota <b>un semitono</b>.</li><li><b>Becuadro ♮</b>: anula una alteración anterior; la nota vuelve a ser natural.</li></ul><p>En el pentagrama el signo se escribe <b>a la izquierda</b> de la nota, en la misma línea o espacio. Probá los tres signos sobre Sol.</p>`,
        requiere: true, visual(el, ctx){
          const st = caja(el, 'lz-pg'), kk = caja(el);
          const k = V.teclado(kk, {desde: 60, hasta: 72, etiquetas: 'blancas'});
          const usados = new Set();
          const poner = acc => {
            const r = {l: 4, a: acc === null ? 0 : acc, o: 4};
            V.pentagrama(st, {notas: [{l: 4, o: 4, acc, color: 'a', texto: M.corto(r)}]});
            k.marcar({[M.midi(r)]: {c: 'a', t: M.corto(r)}});
            Sonido.tocar(M.midi(r));
            if (acc !== null) usados.add(acc);
            msg(el, acc === 1 ? 'Sol♯: una tecla a la derecha (más agudo).' : acc === -1 ? 'Sol♭: una tecla a la izquierda (más grave).' : acc === 0 ? 'Sol♮: el becuadro deja la nota natural.' : '');
            if (usados.size === 3) ctx.listo();
          };
          V.pentagrama(st, {notas: [{l: 4, o: 4, acc: null, color: 'a', texto: 'Sol'}]});
          k.marcar({67: {c: 'a', t: 'Sol'}});
          botones(el, [['♭ bemol', () => poner(-1)], ['♮ becuadro', () => poner(0)], ['♯ sostenido', () => poner(1)]]);
        }},
      {etapa: 'ejemplo', titulo: 'Una tecla, dos nombres', texto: `<p>Cada tecla negra tiene <b>dos nombres</b>: Do♯ es la misma tecla que Re♭. Se llaman <b>enarmónicos</b>: suenan igual pero se escriben distinto.</p><p>También hay alteraciones que caen en teclas blancas: como entre Mi y Fa no hay negra, <b>Mi♯ suena como Fa</b> y <b>Fa♭ suena como Mi</b>.</p><p>El nombre que se usa depende del contexto (lo vas a ver en intervalos y armaduras).</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          V.pentagrama(st, {notas: [nota(0, 4, {acc: 1, color: 'a', texto: 'Do♯'}), nota(1, 4, {acc: -1, color: 'b', texto: 'Re♭'}), nota(2, 4, {acc: 1, color: 'a', texto: 'Mi♯'}), nota(3, 4, {acc: null, color: 'b', texto: 'Fa'})]});
          const k = V.teclado(caja(el), {desde: 60, hasta: 67, etiquetas: 'blancas'});
          k.marcar({61: {c: 'a', t: 'Do♯ Re♭'}, 65: {c: 'b', t: 'Mi♯ Fa'}});
        }},
      {etapa: 'aprender', titulo: 'Cuánto dura una alteración', texto: `<p>Una alteración escrita junto a una nota vale <b>hasta el final del compás</b> para esa misma nota. Por eso, si queremos volver a la nota natural dentro del compás, hace falta un <b>becuadro</b>.</p><p>En el ejemplo, el segundo Fa sigue siendo Fa♯ aunque no tenga signo; el tercero tiene becuadro y vuelve a ser Fa.</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          V.pentagrama(st, {notas: [nota(3, 4, {acc: 1, color: 'a', texto: 'Fa♯'}), nota(3, 4, {color: 'a', texto: 'Fa♯'}), nota(3, 4, {acc: 0, color: 'b', texto: 'Fa'})]});
          botones(el, [['▶ Escuchar', () => Sonido.secuencia([66, 66, 65], 0.6)]]);
        }},
      {etapa: 'solo', titulo: '¿Qué tecla suena?', ejercicio: {tipo: 'alteraciones', cantidad: 5}}
    ]},
    {id: 'n-sol', titulo: 'El pentagrama y la clave de Sol', resumen: 'Líneas, espacios y la nota de referencia.', pasos: [
      {etapa: 'aprender', titulo: 'Cinco líneas, cuatro espacios', texto: `<p>El <b>pentagrama</b> tiene 5 líneas y 4 espacios, que se cuentan <b>de abajo hacia arriba</b>. Las notas se escriben en las líneas o en los espacios: cuanto más arriba, más aguda.</p><p>La <b>clave de Sol</b> se enrosca en la <b>2.ª línea</b> y dice: “esta línea es Sol”. A partir de ahí, las demás notas siguen en orden: línea, espacio, línea…</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          const lineas = () => V.pentagrama(st, {notas: [2,4,6,1,3].map((l, i) => nota(l, i < 3 ? 4 : 5, {texto: M.corto(M.nota(l)), color: l === 4 ? 'a' : undefined}))});
          const espacios = () => V.pentagrama(st, {notas: [3,5,0,2].map((l, i) => nota(l, i < 2 ? 4 : 5, {texto: M.corto(M.nota(l)), color: 'b'}))});
          lineas();
          botones(el, [['Notas en las líneas', lineas], ['Notas en los espacios', espacios]]);
          el.appendChild(h('p', 'lz-nota', 'Líneas: Mi – Sol – Si – Re – Fa. Espacios: Fa – La – Do – Mi.'));
        }},
      {etapa: 'guiado', titulo: 'Mové la nota', texto: '<p>Subí y bajá la nota de a un paso. Fijate cómo alterna línea y espacio, y cómo cambia el nombre en orden.</p>', requiere: true,
        visual(el, ctx){ moverNota(el, ctx, 'treble', 32, 26, 40); }},
      {etapa: 'ejemplo', titulo: 'Más allá del pentagrama', texto: `<p>Para notas más graves o más agudas se agregan <b>líneas adicionales</b>, cortitas. La más importante: el <b>Do central</b> (Do4), en la primera línea adicional por debajo del pentagrama en clave de Sol. Es el Do del medio del piano.</p>`,
        visual(el){ V.pentagrama(caja(el, 'lz-pg'), {notas: [nota(0, 4, {color: 'a', texto: 'Do4'}), nota(1, 4, {texto: 'Re4'}), nota(5, 5, {texto: 'La5'}), nota(0, 6, {color: 'b', texto: 'Do6'})]}); }},
      {etapa: 'solo', titulo: 'Leé notas en clave de Sol', ejercicio: {tipo: 'pent-sol', cantidad: 6}}
    ]},
    {id: 'n-fa', titulo: 'La clave de Fa', resumen: 'Para las notas graves.', pasos: [
      {etapa: 'aprender', titulo: 'Otra nota de referencia', texto: `<p>Para las notas graves (la mano izquierda del piano, el bajo, el violonchelo) se usa la <b>clave de Fa</b>. Sus dos puntitos rodean la <b>4.ª línea</b>: esa línea es <b>Fa</b> (el Fa de abajo del Do central, Fa3).</p><p>Líneas: Sol – Si – Re – Fa – La. Espacios: La – Do – Mi – Sol.</p><p>El Do central queda en la primera línea adicional <b>por encima</b> del pentagrama.</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          const lineas = () => V.pentagrama(st, {clave: 'bass', notas: [4,6,1,3,5].map((l, i) => nota(l, i < 2 ? 2 : 3, {texto: M.corto(M.nota(l)), color: l === 3 ? 'a' : undefined}))});
          const espacios = () => V.pentagrama(st, {clave: 'bass', notas: [5,0,2,4].map((l, i) => nota(l, i < 1 ? 2 : 3, {texto: M.corto(M.nota(l)), color: 'b'}))});
          lineas();
          botones(el, [['Notas en las líneas', lineas], ['Notas en los espacios', espacios], ['Do central', () => V.pentagrama(st, {clave: 'bass', notas: [nota(3, 3, {texto: 'Fa3', color: 'a'}), nota(0, 4, {texto: 'Do4', color: 'b'})]})]]);
        }},
      {etapa: 'guiado', titulo: 'Mové la nota', texto: '<p>Recorré la clave de Fa de a un paso.</p>', requiere: true, visual(el, ctx){ moverNota(el, ctx, 'bass', 24, 14, 28); }},
      {etapa: 'solo', titulo: 'Leé notas en clave de Fa', ejercicio: {tipo: 'pent-fa', cantidad: 5}}
    ]},
    {id: 'n-puente', titulo: 'Del pentagrama al teclado', resumen: 'Cada posición es una tecla.', pasos: [
      {etapa: 'aprender', titulo: 'Cada línea y espacio es una tecla blanca', texto: `<p>Cada posición del pentagrama (línea o espacio) corresponde a <b>una tecla blanca</b>. Subir un paso en el pentagrama es pasar a la tecla blanca siguiente. Las teclas negras se escriben con ♯ o ♭.</p><p>Tocá teclas y mirá dónde se escriben.</p>`,
        requiere: true, visual(el, ctx){
          const st = caja(el, 'lz-pg');
          const vistas = new Set();
          V.pentagrama(st, {notas: []});
          V.teclado(caja(el), {desde: 60, hasta: 79, etiquetas: 'do', onTecla: m => {
            const nn = M.deMidi(m);
            V.pentagrama(st, {notas: [nota(nn.l, nn.o, {acc: nn.a ? nn.a : null, color: 'a', texto: M.corto(nn, {oct: true})})]});
            vistas.add(m); if (vistas.size >= 4) ctx.listo();
          }});
        }},
      {etapa: 'guiado', titulo: 'Ahora al revés', texto: '<p>Te muestro una nota y la buscás en el teclado. Si te equivocás, te explico cómo encontrarla.</p>', ejercicio: {tipo: 'pent-teclado', cantidad: 3, guiado: true}},
      {etapa: 'solo', titulo: 'Solo', ejercicio: {tipo: 'pent-teclado', cantidad: 4, op: {alteraciones: true}}}
    ]}
  ]);

  // ------------------------------------------------------------ Intervalos
  unidad('intervalos', 'Intervalos', 'Qué es un intervalo, cómo se cuenta su número y cómo se decide su calidad.', [
    {id: 'i-que-es', titulo: '¿Qué es un intervalo?', resumen: 'La distancia entre dos notas.', pasos: [
      {etapa: 'aprender', titulo: 'La distancia entre dos notas', texto: `<p>Un <b>intervalo</b> es la distancia entre dos notas.</p><ul><li>Si suenan <b>una después de la otra</b>, es un intervalo <b>melódico</b> (ascendente o descendente).</li><li>Si suenan <b>juntas</b>, es un intervalo <b>armónico</b>.</li></ul>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          const mel = () => { V.pentagrama(st, {notas: [nota(0, 4, {color: 'a'}), nota(4, 4, {color: 'b'})]}); Sonido.intervalo(60, 67); };
          const arm = () => { V.pentagrama(st, {armonico: true, notas: [nota(0, 4, {color: 'a'}), nota(4, 4, {color: 'b'})]}); Sonido.intervalo(60, 67, true); };
          V.pentagrama(st, {notas: [nota(0, 4, {color: 'a'}), nota(4, 4, {color: 'b'})]});
          botones(el, [['▶ Melódico', mel], ['▶ Armónico', arm]]);
        }},
      {etapa: 'guiado', titulo: 'Probá vos', texto: '<p>Tocá dos teclas: te muestro el intervalo en el pentagrama y cómo se llama. Todavía no hace falta entender el nombre: lo vamos a construir en las próximas lecciones.</p>', requiere: true,
        visual(el, ctx){
          const st = caja(el, 'lz-pg'); let prev = null, n = 0;
          V.pentagrama(st, {notas: []});
          V.teclado(caja(el), {desde: 60, hasta: 72, etiquetas: 'blancas', onTecla: m => {
            if (prev === null){ prev = m; msg(el, 'Ahora otra tecla.'); return; }
            const a = M.deMidi(prev), b = M.deMidi(m), iv = M.intervalo(a, b);
            V.pentagrama(st, {notas: [nota(a.l, a.o, {acc: a.a || null, color: 'a', texto: M.corto(a)}), nota(b.l, b.o, {acc: b.a || null, color: 'b', texto: M.corto(b)})]});
            Sonido.intervalo(prev, m);
            msg(el, `${M.corto(a)} → ${M.corto(b)}: <b>${iv.nombre}</b> (${M.plural(iv.semis, 'semitono')}).`);
            prev = null; if (++n >= 3) ctx.listo();
          }});
          msg(el, 'Tocá la primera tecla.');
        }},
      {etapa: 'aprender', titulo: 'Dos datos distintos', texto: `<p>Todo intervalo se nombra con <b>dos datos</b> que se averiguan por separado:</p><ol><li><b>Número</b> (segunda, tercera, cuarta…): se obtiene <b>contando los nombres de las notas</b>.</li><li><b>Calidad</b> (mayor, menor, justa, aumentada, disminuida): se obtiene <b>contando semitonos</b>.</li></ol><p>Por ejemplo, “tercera mayor”: tercera es el número, mayor es la calidad. <b>Primero siempre el número, después la calidad.</b></p>`}
    ]},
    {id: 'i-numero', titulo: 'El número: contar letras', resumen: 'Incluyendo la primera y la última.', pasos: [
      {etapa: 'aprender', titulo: '¿Qué es una tercera?', texto: `<p>Mirá Do → Mi. Para saber el número, <b>contamos los nombres de las notas, incluyendo la primera y la última</b>:</p><p class="lz-grande">Do(1) → Re(2) → Mi(3)</p><p>Son tres nombres: <b>es una tercera</b>. En letras: C → D → E.</p>`,
        requiere: true, visual(el, ctx){
          const st = caja(el, 'lz-pg');
          const c = V.contar(st, nota(0), nota(2), {alTerminar: () => { msg(el, 'Tres notas contadas: <b>tercera</b>.'); ctx.listo(); }});
          botones(el, [['▶ Contar Do → Mi', () => c.empezar()]]);
        }},
      {etapa: 'ejemplo', titulo: 'Las alteraciones no cambian el número', texto: `<p>Ahora Do → Mi♭. ¿Sigue siendo una tercera?</p><p>Sí: las letras siguen siendo <b>Do – Re – Mi</b> (C – D – E). El ♭ cambia la <b>calidad</b>, pero <b>no el número</b>. El número solo depende de las letras.</p>`,
        requiere: true, visual(el, ctx){
          const st = caja(el, 'lz-pg');
          const c = V.contar(st, nota(0), nota(2, 4, {acc: -1}), {alTerminar: () => { msg(el, 'Do – Re – Mi♭: también <b>tercera</b>.'); ctx.listo(); }});
          botones(el, [['▶ Contar Do → Mi♭', () => c.empezar()]]);
        }},
      {etapa: 'aprender', titulo: 'Un atajo visual', texto: `<p>En el pentagrama hay un atajo para comprobar:</p><ul><li>Si las dos notas están en <b>líneas</b> (o las dos en <b>espacios</b>), el número es <b>impar</b>: 3.ª, 5.ª, 7.ª.</li><li>Si una está en línea y la otra en espacio, es <b>par</b>: 2.ª, 4.ª, 6.ª, 8.ª.</li></ul><p>Y funciona igual bajando: Sol → Mi (descendente) también es una tercera, porque Mi – Fa – Sol son tres letras. Siempre se cuenta desde la nota más grave.</p>`,
        visual(el){ V.pentagrama(caja(el, 'lz-pg'), {notas: [nota(2, 4, {color: 'a', texto: 'línea'}), nota(4, 4, {color: 'a', texto: '3.ª'}), nota(3, 4, {color: 'b', texto: 'espacio'}), nota(1, 5, {color: 'b', texto: '6.ª'})]}); }},
      {etapa: 'guiado', titulo: 'Con ayuda', texto: '<p>Contá las letras. Después de responder te muestro el conteo nota por nota.</p>', ejercicio: {tipo: 'int-numero', cantidad: 3, guiado: true}},
      {etapa: 'solo', titulo: 'Solo', texto: '<p>Ahora también aparecen intervalos descendentes.</p>', ejercicio: {tipo: 'int-numero', cantidad: 5, op: {descendente: true}}}
    ]},
    {id: 'i-calidad', titulo: 'La calidad: mayores, menores y justos', resumen: 'Mismo número, distinta cantidad de semitonos.', pasos: [
      {etapa: 'aprender', titulo: 'Mismo número, distinto sonido', texto: `<p>Do → Mi y Do → Mi♭ son terceras, pero no suenan igual. La diferencia está en los <b>semitonos</b>:</p><ul><li>Do → Mi: <b>4 semitonos</b> = <b>tercera mayor</b>.</li><li>Do → Mi♭: <b>3 semitonos</b> = <b>tercera menor</b>.</li></ul><p>Escuchá las dos y mirá los semitonos en el teclado.</p>`,
        requiere: true, visual(el, ctx){
          const st = caja(el, 'lz-pg'), k = V.teclado(caja(el), {desde: 60, hasta: 67, etiquetas: 'blancas'});
          const vistos = new Set();
          const mostrar = (acc, t) => {
            const top = 64 + (acc || 0);
            V.pentagrama(st, {notas: [nota(0, 4, {color: 'a', texto: 'Do'}), nota(2, 4, {acc, color: 'b', texto: acc ? 'Mi♭' : 'Mi'})]});
            const mk = {60: {c: 'a', t: 'Do'}}; for (let m = 61; m <= top; m++) mk[m] = {c: m === top ? 'b' : 'guia', t: String(m - 60)};
            k.marcar(mk); Sonido.intervalo(60, top); msg(el, t); vistos.add(acc); if (vistos.size === 2) ctx.listo();
          };
          botones(el, [['▶ Do → Mi', () => mostrar(null, 'Tercera <b>mayor</b>: 4 semitonos. Suena luminosa.')], ['▶ Do → Mi♭', () => mostrar(-1, 'Tercera <b>menor</b>: 3 semitonos. Suena más oscura.')]]);
        }},
      {etapa: 'aprender', titulo: 'Dos familias', texto: `<p>Los intervalos se dividen en dos familias:</p><ul><li><b>Justos</b>: unísono, <b>4.ª, 5.ª</b> y octava. Tienen una sola forma “normal”.</li><li><b>Mayores o menores</b>: <b>2.ª, 3.ª, 6.ª y 7.ª</b>. El menor tiene un semitono menos que el mayor.</li></ul><p>Tocá una fila para escuchar el intervalo desde Do.</p>`,
        visual(el){
          const filas = [[2,'m'],[2,'M'],[3,'m'],[3,'M'],[4,'J'],[5,'J'],[6,'m'],[6,'M'],[7,'m'],[7,'M'],[8,'J']];
          const t = h('table', 'lz-tabla');
          t.innerHTML = '<thead><tr><th>Intervalo</th><th>Semitonos</th><th>Desde Do</th></tr></thead>';
          const tb = h('tbody'); t.appendChild(tb);
          filas.forEach(([n, c]) => {
            const top = M.construir(M.nota(0), n, c);
            const tr = h('tr', M.esJusto(n) ? 'justo' : '', `<td>${M.nombreIntervalo(n, c)}</td><td>${M.semitonos(n, c)}</td><td>${M.corto(top)}</td>`);
            tr.tabIndex = 0; tr.setAttribute('role', 'button');
            const tocar = () => Sonido.intervalo(60, M.midi(top));
            tr.addEventListener('click', tocar); tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); tocar(); } });
            tb.appendChild(tr);
          });
          el.appendChild(t);
        }},
      {etapa: 'ejemplo', titulo: 'El truco de la escala mayor', texto: `<p>Desde la primera nota de una escala mayor, <b>todas las notas de la escala forman intervalos mayores o justos</b>. En Do mayor: Do–Re 2.ª mayor, Do–Mi 3.ª mayor, Do–Fa 4.ª justa, Do–Sol 5.ª justa, Do–La 6.ª mayor, Do–Si 7.ª mayor, Do–Do octava justa.</p><p>Así, si la nota de arriba está en la escala mayor de la nota de abajo, el intervalo es mayor o justo; si está medio tono más abajo, es menor.</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          const et = ['1','2M','3M','4J','5J','6M','7M','8J'];
          V.pentagrama(st, {notas: [0,1,2,3,4,5,6,0].map((l, i) => nota(l, i === 7 ? 5 : 4, {color: i === 0 ? 'a' : undefined, texto: et[i]})), junto: true});
          botones(el, [['▶ Escala de Do mayor', () => Sonido.secuencia([60,62,64,65,67,69,71,72], 0.45)]]);
        }},
      {etapa: 'guiado', titulo: 'Con ayuda, paso a paso', texto: '<p>Vamos a resolver intervalos completos decidiendo cada paso: primero el número, después los semitonos y al final la calidad.</p>', ejercicio: {tipo: 'int-completo', cantidad: 2, guiado: true, op: {calidades: ['m','M','J']}}},
      {etapa: 'solo', titulo: 'Solo', ejercicio: {tipo: 'int-calidad', cantidad: 5}}
    ]},
    {id: 'i-aumdis', titulo: 'Aumentados y disminuidos', resumen: 'Medio tono más o medio tono menos.', pasos: [
      {etapa: 'aprender', titulo: 'Estirar y achicar', texto: `<p>Si un intervalo tiene <b>un semitono más</b> que el justo o el mayor, es <b>aumentado</b>. Si tiene <b>un semitono menos</b> que el justo o el menor, es <b>disminuido</b>.</p>`,
        visual(el){
          el.appendChild(h('div', 'escalera', `
            <p class="esc-t">Justos (4.ª, 5.ª, 8.ª)</p><div class="esc"><span>disminuida<br><small>−1</small></span><span class="c">justa</span><span>aumentada<br><small>+1</small></span></div>
            <p class="esc-t">Mayores o menores (2.ª, 3.ª, 6.ª, 7.ª)</p><div class="esc"><span>disminuida<br><small>−1</small></span><span class="c">menor</span><span class="c">mayor</span><span>aumentada<br><small>+1</small></span></div>
            <p class="lz-nota">Ejemplo con cuartas: 4.ª disminuida = 4 semitonos, 4.ª justa = 5, 4.ª aumentada = 6.</p>`));
        }},
      {etapa: 'ejemplo', titulo: 'Do → Fa y Do → Fa♯', texto: `<p><b>Do → Fa</b>: Do-Re-Mi-Fa son cuatro notas, así que es una <b>cuarta</b>. Tiene 5 semitonos: <b>cuarta justa</b>.</p><p><b>Do → Fa♯</b>: las letras son las mismas (sigue siendo una <b>cuarta</b>), pero ahora hay <b>6 semitonos</b>, uno más que la justa: <b>cuarta aumentada</b>.</p><p><b>Si → Fa</b>: Si-Do-Re-Mi-Fa son cinco letras: <b>quinta</b>. Tiene 6 semitonos, uno menos que la justa (7): <b>quinta disminuida</b>.</p><p>Fijate que Do→Fa♯ y Si→Fa tienen 6 semitonos los dos, pero <b>se llaman distinto porque las letras son distintas</b>. Este intervalo de 6 semitonos también se llama <b>tritono</b>.</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          const ver = (a, b, t) => { V.pentagrama(st, {notas: [Object.assign({color: 'a', texto: M.corto(M.altura(a))}, a), Object.assign({color: 'b', texto: M.corto(M.altura(b))}, b)]}); Sonido.intervalo(M.midi(M.altura(a)), M.midi(M.altura(b))); msg(el, t); };
          ver(nota(0), nota(3), 'Cuarta justa: 5 semitonos.');
          botones(el, [['Do → Fa', () => ver(nota(0), nota(3), 'Cuarta justa: 5 semitonos.')], ['Do → Fa♯', () => ver(nota(0), nota(3, 4, {acc: 1}), 'Cuarta aumentada: 6 semitonos.')], ['Si → Fa', () => ver(nota(6), nota(3, 5), 'Quinta disminuida: 6 semitonos.')]]);
        }},
      {etapa: 'guiado', titulo: 'Con ayuda, paso a paso', ejercicio: {tipo: 'int-completo', cantidad: 2, guiado: true}},
      {etapa: 'solo', titulo: 'Solo', ejercicio: {tipo: 'int-completo', cantidad: 5}}
    ]},
    {id: 'i-construir', titulo: 'Construir intervalos', resumen: 'Primero la letra, después la alteración.', pasos: [
      {etapa: 'aprender', titulo: 'Al revés: de un nombre a una nota', texto: `<p>Para escribir un intervalo se usa el mismo procedimiento al revés:</p><ol><li><b>Primero la letra</b>: contá el número de letras desde la nota de partida.</li><li><b>Después la alteración</b>: ajustá con ♯ o ♭ hasta tener los semitonos justos.</li></ol><p><b>Ejemplo: sexta mayor arriba de Mi.</b> Mi-Fa-Sol-La-Si-Do: la letra es <b>Do</b>. Mi → Do tiene 8 semitonos, y una sexta mayor necesita 9: hay que subir el Do. Resultado: <b>Do♯</b>.</p><p>Ojo: Re♭ suena igual que Do♯, pero sería una séptima (otra letra). Por eso <b>primero la letra</b>.</p>`,
        requiere: true, visual(el, ctx){
          const st = caja(el, 'lz-pg');
          const c = V.contar(st, nota(2), nota(0, 5), {alTerminar: () => { setTimeout(() => { V.pentagrama(st, {notas: [nota(2, 4, {color: 'a', texto: 'Mi'}), nota(0, 5, {acc: 1, color: 'ok', texto: 'Do♯'})]}); Sonido.intervalo(64, 73); msg(el, 'Mi → Do♯: 9 semitonos. <b>Sexta mayor.</b>'); ctx.listo(); }, 700); }});
          botones(el, [['▶ Construir', () => c.empezar()]]);
        }},
      {etapa: 'solo', titulo: 'Construí intervalos', ejercicio: {tipo: 'int-construir', cantidad: 5}}
    ]}
  ]);

  // ------------------------------------------------------------- Armaduras
  unidad('armaduras', 'Armaduras y tonalidades', 'Qué indica la armadura, en qué orden aparecen sus alteraciones y cómo reconocer la tonalidad.', [
    {id: 'a-que-es', titulo: '¿Qué es una armadura?', resumen: 'Alteraciones que valen para toda la pieza.', pasos: [
      {etapa: 'aprender', titulo: 'Alteraciones fijas', texto: `<p>La <b>armadura</b> es el grupo de sostenidos o bemoles que se escribe al principio de cada pentagrama, justo después de la clave.</p><p>Sirve para no tener que escribir la misma alteración una y otra vez, y además indica la <b>tonalidad</b> de la pieza.</p><p>Por ejemplo, <b>Sol mayor</b> tiene un sostenido en la línea de Fa:</p><blockquote>Todas las notas Fa de la pieza son Fa♯, en cualquier octava, salvo que aparezca una alteración que indique lo contrario.</blockquote>`,
        visual(el){ V.pentagrama(caja(el, 'lz-pg'), {armadura: 1, notas: [nota(3, 4, {color: 'a', texto: 'Fa♯'}), nota(3, 5, {color: 'a', texto: 'Fa♯'})]}); }},
      {etapa: 'ejemplo', titulo: 'La escala de Sol mayor', texto: `<p>Con esa armadura, la escala de Sol se escribe sin ningún signo junto a las notas, pero el Fa suena Fa♯. Escuchala y mirá qué nota cambia.</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          V.pentagrama(st, {armadura: 1, junto: true, notas: [4,5,6,0,1,2,3,4].map((l, i) => nota(l, i < 3 ? 4 : i === 7 ? 5 : l >= 4 ? 4 : 5, {texto: M.corto(M.altura({l, acc: null}, 1)), color: l === 3 ? 'ok' : undefined}))});
          botones(el, [['▶ Escuchar', () => Sonido.secuencia([67,69,71,72,74,76,78,79], 0.45)]]);
        }},
      {etapa: 'guiado', titulo: 'Determiná la altura real', texto: '<p>Te muestro una armadura y una nota. Decidí qué nota suena realmente. Después de cada respuesta te explico por qué.</p>', ejercicio: {tipo: 'arm-altura', cantidad: 3, guiado: true, op: {armaduras: [1, 2, -1, -2]}}},
      {etapa: 'solo', titulo: 'Solo', ejercicio: {tipo: 'arm-altura', cantidad: 5}}
    ]},
    {id: 'a-accidentales', titulo: 'Alteraciones accidentales', resumen: 'Cuando la nota trae su propio signo.', pasos: [
      {etapa: 'aprender', titulo: 'La alteración escrita manda', texto: `<p>Una alteración escrita junto a una nota se llama <b>accidental</b>. Tiene prioridad sobre la armadura y vale hasta el final del compás.</p><ul><li>Con armadura de Sol mayor, un <b>Fa♮</b> (con becuadro) suena Fa natural.</li><li>Un <b>Do♯</b> suena Do♯ aunque la armadura no tenga Do♯.</li></ul>`,
        visual(el){ V.pentagrama(caja(el, 'lz-pg'), {armadura: 1, notas: [nota(3, 5, {color: 'a', texto: 'Fa♯'}), nota(3, 5, {acc: 0, color: 'b', texto: 'Fa'}), nota(0, 5, {acc: 1, color: 'b', texto: 'Do♯'})]}); }},
      {etapa: 'guiado', titulo: 'Con ayuda', ejercicio: {tipo: 'arm-altura', cantidad: 3, guiado: true, op: {accidentales: true, armaduras: [1, 2, 3, -1, -2, -3]}}},
      {etapa: 'solo', titulo: 'Solo', ejercicio: {tipo: 'arm-altura', cantidad: 5, op: {accidentales: true}}}
    ]},
    {id: 'a-orden', titulo: 'El orden de los sostenidos y los bemoles', resumen: 'Siempre en el mismo orden.', pasos: [
      {etapa: 'aprender', titulo: 'Sostenidos: Fa Do Sol Re La Mi Si', texto: `<p>Los sostenidos de la armadura aparecen <b>siempre en el mismo orden</b>:</p><p class="lz-grande">Fa♯ Do♯ Sol♯ Re♯ La♯ Mi♯ Si♯</p><p>Si una armadura tiene 3 sostenidos, son los 3 primeros: Fa♯, Do♯ y Sol♯. Cada uno está una quinta arriba del anterior. Probá con distintas cantidades.</p>`,
        requiere: true, visual(el, ctx){ selectorArmadura(el, ctx, 1); }},
      {etapa: 'aprender', titulo: 'Bemoles: el orden al revés', texto: `<p>Los bemoles aparecen en el orden <b>inverso</b>:</p><p class="lz-grande">Si♭ Mi♭ La♭ Re♭ Sol♭ Do♭ Fa♭</p><p>Un truco: las cuatro primeras forman la palabra “<b>SIMILARE</b>” (Si-Mi-La-Re).</p>`,
        requiere: true, visual(el, ctx){ selectorArmadura(el, ctx, -1); }},
      {etapa: 'solo', titulo: 'Practicá el orden', ejercicio: {tipo: 'arm-orden', cantidad: 5}}
    ]},
    {id: 'a-tonalidad', titulo: 'Cómo identificar la tonalidad', resumen: 'El último sostenido y el penúltimo bemol.', pasos: [
      {etapa: 'aprender', titulo: 'Con sostenidos: el último + medio tono', texto: `<p>Con sostenidos, mirá el <b>último sostenido</b> y subí <b>medio tono</b>: esa es la tónica de la tonalidad mayor.</p><p>Ejemplo: Fa♯ y Do♯. El último es Do♯; medio tono arriba está <b>Re</b>. Es <b>Re mayor</b>.</p>`,
        visual(el){ revelar(el, 2, 'El último sostenido es Do♯. Medio tono arriba: <b>Re mayor</b>.'); }},
      {etapa: 'aprender', titulo: 'Con bemoles: el penúltimo', texto: `<p>Con bemoles, el <b>penúltimo bemol</b> es directamente la tónica.</p><p>Ejemplo: Si♭, Mi♭, La♭. El penúltimo es Mi♭: <b>Mi♭ mayor</b>.</p><p>Excepción: con <b>un solo bemol</b> (Si♭) no hay penúltimo: es <b>Fa mayor</b>, y conviene recordarlo de memoria. Sin alteraciones, es <b>Do mayor</b>.</p>`,
        visual(el){ revelar(el, -3, 'El penúltimo bemol es Mi♭: <b>Mi♭ mayor</b>.'); }},
      {etapa: 'guiado', titulo: 'Con ayuda', ejercicio: {tipo: 'arm-tonalidad', cantidad: 3, guiado: true, op: {armaduras: [1, 2, 3, -1, -2, -3]}}},
      {etapa: 'solo', titulo: 'Solo', ejercicio: {tipo: 'arm-tonalidad', cantidad: 5}}
    ]},
    {id: 'a-relativa', titulo: 'Tonalidades relativas menores', resumen: 'Una armadura, dos tonalidades.', pasos: [
      {etapa: 'aprender', titulo: 'La misma armadura, otro centro', texto: `<p>Cada armadura sirve para <b>una tonalidad mayor y una menor</b>, que se llaman <b>relativas</b>. La relativa menor está <b>una tercera menor por debajo</b> de la tónica mayor (o en el 6.º grado de la escala mayor).</p><ul><li>Do mayor ↔ <b>La menor</b> (sin alteraciones).</li><li>Sol mayor ↔ <b>Mi menor</b> (Fa♯).</li><li>Fa mayor ↔ <b>Re menor</b> (Si♭).</li></ul><p>Escuchá la diferencia de carácter entre los dos acordes.</p>`,
        visual(el){
          const st = caja(el, 'lz-pg');
          V.pentagrama(st, {armadura: 1});
          botones(el, [['▶ Acorde de Sol mayor', () => Sonido.acorde([67, 71, 74])], ['▶ Acorde de Mi menor', () => Sonido.acorde([64, 67, 71])]]);
        }},
      {etapa: 'solo', titulo: 'Practicá las relativas', ejercicio: {tipo: 'arm-relativa', cantidad: 5}}
    ]},
    {id: 'a-circulo', titulo: 'El círculo de quintas', resumen: 'Todas las tonalidades en un solo dibujo.', pasos: [
      {etapa: 'aprender', titulo: 'Una vuelta por las tonalidades', texto: `<p>El <b>círculo de quintas</b> ordena las tonalidades: en el sentido del reloj, cada una está <b>una quinta arriba</b> de la anterior y tiene <b>un sostenido más</b>. En el sentido contrario, una quinta abajo y <b>un bemol más</b>.</p><p>Afuera están las mayores; adentro, sus relativas menores. Tocá distintas tonalidades.</p>`,
        requiere: true, visual(el, ctx){
          const cq = caja(el, 'lz-cq'), st = caja(el, 'lz-pg');
          const vistos = new Set();
          V.pentagrama(st, {armadura: 0});
          V.circulo(cq, {seleccion: 0, onElegir: n => {
            V.pentagrama(st, {armadura: n});
            const k = M.armadura(n);
            msg(el, `<b>${M.nombreTonalidad(k)}</b> y <b>${M.nombreTonalidad(k, 'menor')}</b>: ${M.describirArmadura(n)}.`);
            Sonido.acorde([M.midi(k.mayor), M.midi(k.mayor) + 4, M.midi(k.mayor) + 7]);
            vistos.add(n); if (vistos.size >= 3) ctx.listo();
          }});
        }},
      {etapa: 'solo', titulo: 'Repaso', ejercicio: {tipo: 'arm-tonalidad', cantidad: 4}}
    ]}
  ]);

  // ------------------------------------------------- Intervalos con armadura
  unidad('conarmadura', 'Intervalos con armadura', 'El ejercicio central: leer la armadura y las alteraciones antes de nombrar el intervalo.', [
    {id: 'x-procedimiento', titulo: 'El procedimiento completo', resumen: 'Siete pasos, sin saltear ninguno.', pasos: [
      {etapa: 'aprender', titulo: 'Siete pasos', texto: `<p>Para nombrar un intervalo escrito con armadura <b>no alcanza con contar semitonos</b>. Hay que seguir estos pasos, en este orden:</p><ol><li>Identificar las notas escritas.</li><li>Determinar el número (contando letras).</li><li>Aplicar la armadura.</li><li>Aplicar las alteraciones accidentales.</li><li>Contar los semitonos.</li><li>Determinar la calidad.</li><li>Nombrar el intervalo.</li></ol><p>Veámoslo con un ejemplo: armadura de <b>Sol mayor</b>, notas <b>Re → Fa</b>. Avanzá paso por paso.</p>`,
        requiere: true, visual(el, ctx){ recorrido(el, E.analizar({l: 1, o: 4, acc: null}, {l: 3, o: 4, acc: null}, 1), ctx); }},
      {etapa: 'ejemplo', titulo: 'Otro ejemplo, con alteración accidental', texto: `<p>Armadura de <b>Re mayor</b> (Fa♯ y Do♯). Notas: <b>Do♮ → Fa</b>. El becuadro anula el Do♯ de la armadura, pero el Fa sigue siendo Fa♯.</p>`,
        requiere: true, visual(el, ctx){ recorrido(el, E.analizar({l: 0, o: 5, acc: 0}, {l: 3, o: 5, acc: null}, 2), ctx); }},
      {etapa: 'guiado', titulo: 'Hacelo con ayuda', texto: '<p>Ahora decidís vos cada paso. Si te equivocás en alguno, te explico antes de seguir.</p>', ejercicio: {tipo: 'int-armadura', cantidad: 2, guiado: true, op: {armaduras: [1, 2, -1, -2]}}},
      {etapa: 'solo', titulo: 'Hacelo solo', texto: '<p>Número y calidad, sin ayuda. Si te equivocás, te muestro el procedimiento y dónde estuvo el error.</p>', ejercicio: {tipo: 'int-armadura', cantidad: 5}}
    ]}
  ]);

  // ---------- Helpers de interacción ----------
  function buscarTodas(el, ctx, l){
    const objetivo = [48, 60, 72].map(m => m + M.PC[l]).filter(m => m <= 83);
    const hallados = new Set();
    const k = V.teclado(caja(el), {desde: 48, hasta: 83, etiquetas: 'ninguna', onTecla: m => {
      if (m % 12 === M.PC[l]){ hallados.add(m); k.agregar(m, {c: 'ok', t: M.corto(M.nota(l))}); }
      else { k.agregar(m, {c: 'bad', t: M.esNegra(m) ? '' : M.corto(M.deMidi(m))}); setTimeout(() => { k.agregar(m, undefined); }, 700); }
      msg(el, `Encontraste ${hallados.size} de ${objetivo.length}.`);
      if (hallados.size === objetivo.length){ msg(el, `¡Todos los ${M.LATINO[l]}!`); ctx.listo(); }
    }});
    msg(el, `Encontraste 0 de ${objetivo.length}.`);
  }
  function moverNota(el, ctx, clave, inicio, min, max){
    const st = caja(el, 'lz-pg');
    let p = inicio, movs = 0;
    const lineaDe = pp => { const base = clave === 'bass' ? 18 : 30; const d = pp - base; return d >= 0 && d <= 8 ? (d % 2 === 0 ? `${d/2 + 1}.ª línea` : `${(d + 1)/2}.º espacio`) : 'fuera del pentagrama (línea adicional)'; };
    const dibujar = () => { const nn = M.desdePaso(p); V.pentagrama(st, {clave, notas: [nota(nn.l, nn.o, {color: 'a', texto: M.corto(nn, {oct: true})})]}); msg(el, `${M.corto(nn, {oct: true})}: ${lineaDe(p)}.`); };
    dibujar();
    botones(el, [['▼ Bajar', () => { if (p > min){ p--; dibujar(); Sonido.tocar(M.midi(M.desdePaso(p))); if (++movs >= 5) ctx.listo(); } }], ['▲ Subir', () => { if (p < max){ p++; dibujar(); Sonido.tocar(M.midi(M.desdePaso(p))); if (++movs >= 5) ctx.listo(); } }]]);
  }
  function selectorArmadura(el, ctx, signo){
    const st = caja(el, 'lz-pg');
    const vistos = new Set();
    const ver = n => { V.pentagrama(st, {armadura: n*signo}); const k = M.armadura(n*signo); msg(el, `${M.describirArmadura(n*signo)} → <b>${M.nombreTonalidad(k)}</b>`); vistos.add(n); if (vistos.size >= 3) ctx.listo(); };
    const d = h('div', 'lz-botones');
    for (let n = 1; n <= 7; n++){ const b = h('button', 'btn secondary', `${n}${signo > 0 ? '♯' : '♭'}`); b.type = 'button'; b.addEventListener('click', () => ver(n)); d.appendChild(b); }
    el.appendChild(d);
    V.pentagrama(st, {armadura: signo});
    msg(el, 'Elegí una cantidad.');
  }
  function revelar(el, n, texto){
    const st = caja(el, 'lz-pg');
    V.pentagrama(st, {armadura: n});
    botones(el, [['Mostrar la tonalidad', b => { msg(el, texto); const k = M.armadura(n); Sonido.acorde([M.midi(k.mayor), M.midi(k.mayor) + 4, M.midi(k.mayor) + 7]); b.disabled = true; }]]);
  }

  // ---------- Índices ----------
  const L = {unidades: U, porId: {}};
  U.forEach(u => u.lecciones.forEach((l, i) => { L.porId[l.id] = Object.assign(l, {unidad: u}); }));
  L.orden = U.flatMap(u => u.lecciones);
  L.siguiente = hechas => L.orden.find(l => !hechas(l.id)) || null;
  L.ETAPAS = {aprender: 'Aprender', ejemplo: 'Ver ejemplos', guiado: 'Hacer con ayuda', solo: 'Hacer solo'};
  window.Lecciones = L;
})();
