// Interfaz del aula: navegación, reproductor de lecciones, ejercicios con
// corrección explicada, práctica adaptativa y evaluación.
(function(){
  const M = window.Musica, V = window.Visual, E = window.Ejercicios, P = window.Progreso, L = window.Lecciones;
  const $ = id => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const boton = (texto, cls, fn) => { const b = h('button', 'btn ' + (cls || 'secondary'), texto); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const pct = x => Math.round(x*100);
  const esc = s => String(s).replace(/<[^>]+>/g, '');

  M.sistema = P.config.nombres;

  // Pistas que se muestran antes de responder en modo “con ayuda”
  const PISTAS = {
    'int-numero': 'Contá los nombres de las notas desde la más grave hasta la más aguda, incluyendo las dos.',
    'pent-teclado': 'Ubicá primero el Do central (primera línea adicional debajo del pentagrama) y contá teclas blancas desde ahí.',
    'arm-altura': 'Fijate si la letra de la nota aparece en la armadura. Después, si la nota tiene una alteración escrita delante: esa manda.',
    'arm-tonalidad': 'Con sostenidos: el último sostenido + medio tono. Con bemoles: el penúltimo bemol. Un bemol solo: Fa mayor.',
    'int-construir': 'Primero contá las letras para saber qué letra va; después ajustá la alteración según los semitonos.'
  };
  const CALIDADES_UI = [['d','disminuida'],['m','menor'],['J','justa'],['M','mayor'],['A','aumentada']];

  // ======================================================================
  // Una pregunta: enunciado, visual, respuesta, corrección explicada
  // ======================================================================
  // modo: 'practica' | 'guiado' | 'evaluacion'
  function pregunta(box, q, op){
    box.innerHTML = '';
    const w = h('div', 'ej'); box.appendChild(w);
    w.appendChild(h('p', 'ej-enun', q.enunciado));
    const vis = h('div', 'ej-vis'); w.appendChild(vis);
    if (q.visual) q.visual(vis); else vis.hidden = true;
    const tk = h('div', 'ej-tk'); w.appendChild(tk); tk.hidden = true;
    let kb = null;
    if (q.visualTeclado){ tk.hidden = false; kb = V.teclado(tk, q.visualTeclado); kb.marcar(q.visualTeclado.marcas); }
    if (q.escuchar){
      const a = h('div', 'ej-audio');
      a.appendChild(boton(q.auditivo ? '▶ Escuchar de nuevo' : '▶ Escuchar', 'secondary', () => q.escuchar()));
      w.appendChild(a);
      if (q.autoEscuchar) setTimeout(() => q.escuchar(), 250);
    }
    if (op.modo === 'guiado' && PISTAS[q.tipo] && !q.guia) w.appendChild(h('p', 'ej-pista', `<b>Ayuda:</b> ${PISTAS[q.tipo]}`));
    const guia = h('div', 'ej-guia'); w.appendChild(guia);
    const resp = h('div', 'ej-resp'); w.appendChild(resp);
    const fb = h('div', 'ej-fb'); fb.setAttribute('aria-live', 'polite'); w.appendChild(fb);
    let respondida = false;

    function responder(r){
      if (respondida) return; respondida = true;
      let res;
      if (r === '__nose'){
        res = q.evaluar(q.correcta);
        res = Object.assign({}, res, {ok: false, diag: null, tu: 'No sé', donde: '', habs: res.habs.map(([x]) => [x, false])});
      } else res = q.evaluar(r);
      marcarRespuesta(r, res);
      if (op.alResponder) op.alResponder(q, res, r);
      if (op.modo === 'evaluacion'){ fb.innerHTML = '<p class="fb-reg">Respuesta registrada.</p>'; setTimeout(() => op.alSiguiente && op.alSiguiente(null), 350); return; }
      mostrarCorreccion(res);
    }
    function marcarRespuesta(r, res){
      resp.querySelectorAll('button').forEach(b => b.disabled = true);
      if (q.modo === 'opciones'){
        resp.querySelectorAll('.opt').forEach(b => {
          if (b.dataset.id === String(q.correcta) && op.modo !== 'evaluacion') b.classList.add('correct');
          else if (b.dataset.id === String(r)) b.classList.add(op.modo === 'evaluacion' ? 'elegida' : 'wrong');
        });
      }
      if (q.modo === 'intervalo' && op.modo !== 'evaluacion'){
        resp.querySelectorAll('[data-num]').forEach(b => { if (+b.dataset.num === q.correcta.num) b.classList.add('correct'); else if (r !== '__nose' && +b.dataset.num === r.num) b.classList.add('wrong'); });
        resp.querySelectorAll('[data-cal]').forEach(b => { if (b.dataset.cal === q.correcta.cal) b.classList.add('correct'); else if (r !== '__nose' && b.dataset.cal === r.cal) b.classList.add('wrong'); });
      }
    }
    function mostrarCorreccion(res){
      fb.innerHTML = '';
      if (res.alMostrar) res.alMostrar(vis), vis.hidden = false;
      if (res.marcar && kb) kb.marcar(res.marcar);
      if (res.contar){ const a = res.contar; V.contar(vis, a.iv.lo === a.rx ? a.x : a.y, a.iv.lo === a.rx ? a.y : a.x, {sonar: true}).empezar(); }
      const cab = h('div', 'fb-cab ' + (res.ok ? 'ok' : 'bad'));
      cab.innerHTML = res.ok ? `<strong>¡Correcto!</strong> ${res.correcta}` : `<strong>No es correcto</strong>`;
      fb.appendChild(cab);
      if (!res.ok){
        fb.appendChild(h('dl', 'fb-comp', `<dt>Tu respuesta</dt><dd>${res.tu}</dd><dt>Correcta</dt><dd><b>${res.correcta}</b></dd>`));
        if (res.donde) fb.appendChild(h('div', 'fb-donde', `<h4>Dónde estuvo probablemente el error</h4><p>${res.donde}</p>`));
      }
      if (res.explicacion){
        const d = h('details', 'fb-exp', `<summary>${res.ok ? 'Ver el procedimiento' : 'Explicación y procedimiento'}</summary><div>${res.explicacion}</div>`);
        if (!res.ok || op.modo === 'guiado') d.open = true;
        fb.appendChild(d);
      }
      const acciones = h('div', 'fb-acc');
      if (res.comparar) acciones.appendChild(boton('▶ Escuchar la diferencia', 'secondary', res.comparar));
      if (q.escuchar && !q.auditivo) acciones.appendChild(boton('▶ Escuchar', 'secondary', () => q.escuchar()));
      if (op.alSiguiente) acciones.appendChild(boton(res.ok ? 'Siguiente' : 'Probar uno parecido', 'primary', () => op.alSiguiente(res)));
      fb.appendChild(acciones);
      const rec = op.modo !== 'evaluacion' && !res.ok ? P.recomendacion() : null;
      if (rec) fb.appendChild(bannerRecomendacion(rec));
      const foco = acciones.querySelector('.primary'); if (foco) foco.focus({preventScroll: true});
      fb.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }

    function armarRespuesta(){
      resp.innerHTML = '';
      if (q.modo === 'opciones'){
        const g = h('div', 'opts');
        q.opciones.forEach(o => { const b = boton(o.html, 'opt', () => responder(o.id)); b.dataset.id = o.id; g.appendChild(b); });
        resp.appendChild(g);
      } else if (q.modo === 'intervalo'){
        let num = null, cal = null;
        const fila = (t, items, fn) => { const f = h('div', 'ivsel'); f.appendChild(h('span', 'ivsel-t', t)); const g = h('div', 'chips-iv'); items.forEach(([v, tx]) => { const b = boton(tx, 'chip-iv', () => { fn(v); g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); comprobar.disabled = num === null || cal === null; }); b.setAttribute('aria-pressed', 'false'); b.dataset[t === 'Número' ? 'num' : 'cal'] = v; g.appendChild(b); }); f.appendChild(g); resp.appendChild(f); };
        fila('Número', [2,3,4,5,6,7,8].map(x => [x, M.ORDINAL[x]]), v => num = v);
        fila('Calidad', CALIDADES_UI, v => cal = v);
        const comprobar = boton('Comprobar', 'primary', () => responder({num, cal}));
        comprobar.disabled = true;
        const f = h('div', 'fb-acc'); f.appendChild(comprobar); resp.appendChild(f);
      } else if (q.modo === 'teclado'){
        tk.hidden = false;
        kb = V.teclado(tk, Object.assign({}, q.teclado, {onTecla: m => responder(m)}));
      }
      if (op.modo === 'evaluacion' || op.permitirNoSe){ const s = boton('No sé', 'mini', () => responder('__nose')); resp.appendChild(s); }
    }

    // Modo guiado con pasos: la persona decide cada paso antes de responder el intervalo completo
    if (op.modo === 'guiado' && q.guia){
      let i = 0;
      const paso = () => {
        const g = q.guia[i];
        const d = h('div', 'guia-paso');
        d.appendChild(h('p', 'guia-q', g.pregunta));
        const ops = h('div', 'opts opts-chicas');
        g.opciones.forEach(o => { const b = boton(o.html, 'opt', () => elegir(o.id, b)); b.dataset.id = o.id; ops.appendChild(b); });
        d.appendChild(ops);
        guia.appendChild(d);
        const elegir = (id, b) => {
          ops.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.dataset.id === String(g.correcta)) x.classList.add('correct'); });
          const ok = String(id) === String(g.correcta);
          if (!ok) b.classList.add('wrong');
          d.appendChild(h('p', 'guia-exp ' + (ok ? 'ok' : 'bad'), (ok ? '✓ ' : '✗ La respuesta correcta está marcada. ') + g.explica));
          const a = q.analisis;
          if (g.contar && a) V.contar(vis, a.iv.lo === a.rx ? a.x : a.y, a.iv.lo === a.rx ? a.y : a.x, {armadura: a.arm}).empezar();
          if (g.teclado && a){
            tk.hidden = false;
            const lo = M.midi(a.iv.lo), hi = M.midi(a.iv.hi);
            const k = V.teclado(tk, {desde: lo - (lo % 12), hasta: Math.max(hi + 1, lo - (lo % 12) + 12), etiquetas: 'ninguna'});
            const mk = {[lo]: {c: 'a', t: M.corto(a.iv.lo)}}; for (let m = lo + 1; m <= hi; m++) mk[m] = {c: m === hi ? 'b' : 'guia', t: String(m - lo)};
            k.marcar(mk);
          }
          P.registrar(q.hab, ok, 0.5);
          i++;
          const sig = boton(i < q.guia.length ? 'Siguiente paso' : 'Nombrar el intervalo', 'primary', () => { sig.remove(); if (i < q.guia.length) paso(); else { guia.appendChild(h('p', 'guia-q', `Ahora nombrá el intervalo completo: <b>número + calidad</b>.`)); armarRespuesta(); } });
          d.appendChild(sig); sig.focus({preventScroll: true});
        };
      };
      paso();
    } else armarRespuesta();
  }

  // ======================================================================
  // Sesión de ejercicios (varias preguntas seguidas)
  // ======================================================================
  function sesion(box, op){
    let hechas = 0, correctas = 0, extras = 0, q = null;
    const resultados = [];
    const t0 = Date.now();
    box.innerHTML = '';
    const cab = h('div', 'ses-cab'); box.appendChild(cab);
    const cuerpo = h('div', 'ses-cuerpo'); box.appendChild(cuerpo);
    const total = () => op.cantidad + extras;
    const pintarCab = () => { cab.innerHTML = `<span>${op.titulo ? `<b>${op.titulo}</b> · ` : ''}Ejercicio ${Math.min(hechas + 1, total())} de ${total()}</span>${op.modo !== 'evaluacion' ? `<span>${correctas} ${correctas === 1 ? 'correcta' : 'correctas'}</span>` : `<span class="reloj" id="reloj"></span>`}`; };
    const siguiente = parecido => {
      if (hechas >= total()){ terminar(); return; }
      q = parecido || op.generar(hechas);
      pintarCab();
      pregunta(cuerpo, q, {modo: op.modo, permitirNoSe: op.modo === 'evaluacion',
        alResponder(qq, res, r){
          hechas++; if (res.ok) correctas++;
          resultados.push({q: qq, res, r});
          if (op.modo !== 'evaluacion'){
            res.habs.forEach(([id, ok]) => P.registrar(id, ok));
            P.anotarResultado(res.diag, res.ok);
            if (!res.ok && extras < (op.maxExtras !== undefined ? op.maxExtras : 3)) extras++;
          }
          pintarCab();
        },
        alSiguiente(res){ siguiente(res && !res.ok && hechas < total() ? q.parecido() : null); }});
      if (op.modo === 'evaluacion' && op.alPregunta) op.alPregunta();
    };
    function terminar(){
      const seg = Math.round((Date.now() - t0)/1000);
      if (op.alTerminar) op.alTerminar({hechas, correctas, resultados, seg}, cuerpo, cab);
      else {
        cab.innerHTML = '';
        cuerpo.innerHTML = `<div class="ses-fin"><strong>${correctas} de ${hechas} correctas</strong><p>${correctas === hechas ? 'Muy bien: resolviste todo.' : 'Cada error vino con otro ejercicio parecido para comprobar el concepto.'}</p></div>`;
      }
    }
    siguiente();
    return {cancelar(){ box.innerHTML = ''; }};
  }

  // ======================================================================
  // Recomendaciones (sistema adaptativo)
  // ======================================================================
  function bannerRecomendacion(rec){
    const hab = P.HABILIDADES[rec.hab] || {};
    const b = h('div', 'rec');
    b.innerHTML = `<p class="rec-t">Sugerencia</p><p>${rec.msg}</p>`;
    const acc = h('div', 'rec-acc');
    if (hab.leccion) acc.appendChild(boton('Repasar el concepto', 'primary', () => { P.limpiarErrores(rec.id); abrirLeccion(hab.leccion, hab.paso || 0, {repaso: rec}); }));
    if (hab.ejercicio) acc.appendChild(boton('Ejercicios específicos', 'secondary', () => { P.limpiarErrores(rec.id); practicarTipo(hab.ejercicio, {guiado: !!E.TIPOS[hab.ejercicio] && ['int-completo','int-armadura','int-calidad','int-numero'].includes(hab.ejercicio), titulo: 'Ejercicios específicos', cantidad: 4}); }));
    acc.appendChild(boton('Ahora no', 'mini', () => { P.descartar(rec.id); b.remove(); }));
    b.appendChild(acc);
    return b;
  }

  // ======================================================================
  // Navegación
  // ======================================================================
  const SECCIONES = ['aprender', 'practicar', 'evaluar', 'oido'];
  let seccion = 'aprender';
  function ir(s, opts = {}){
    seccion = s;
    try { localStorage.setItem('teoria-seccion', s); } catch(e){}
    SECCIONES.forEach(x => {
      $('nav-' + x).setAttribute('aria-selected', String(x === s));
      $('sec-' + x).hidden = x !== s;
    });
    if (window.Sonido) Sonido.parar();
    if (s === 'aprender' && !opts.sinRender) indiceAprender();
    if (s === 'practicar' && !opts.sinRender) hubPracticar();
    if (s === 'evaluar' && !opts.sinRender) introEvaluacion();
    if (!opts.sinScroll) window.scrollTo({top: 0});
  }
  SECCIONES.forEach(x => $('nav-' + x).addEventListener('click', () => ir(x)));

  // ======================================================================
  // Aprender
  // ======================================================================
  const CICLO = ['Aprender', 'Ver ejemplos', 'Hacer con ayuda', 'Hacer solo', 'Equivocarse', 'Recibir explicación', 'Volver a intentar', 'Evaluar'];
  function indiceAprender(){
    const s = $('sec-aprender'); s.innerHTML = '';
    s.appendChild(h('p', 'lede', 'Un recorrido desde cero: cada tema se explica, se muestra con ejemplos, se practica con ayuda y después solo. Si te equivocás, te explico por qué.'));
    s.appendChild(h('ol', 'ciclo', CICLO.map(c => `<li>${c}</li>`).join('')));
    const rec = P.recomendacion();
    if (rec) s.appendChild(bannerRecomendacion(rec));
    const sig = L.siguiente(P.leccionHecha);
    const cont = h('div', 'continuar');
    if (sig){
      cont.innerHTML = `<p class="kicker">${P.leccionHecha(L.orden[0].id) ? 'Continuar' : 'Empezar'}</p><h2>${sig.titulo}</h2><p>${sig.unidad.titulo} · ${sig.resumen}</p>`;
      cont.appendChild(boton(P.leccionHecha(L.orden[0].id) ? 'Continuar la lección' : 'Empezar la primera lección', 'primary', () => abrirLeccion(sig.id)));
    } else {
      cont.innerHTML = '<p class="kicker">Recorrido completo</p><h2>Terminaste todas las lecciones</h2><p>Es un buen momento para hacer la evaluación y ver qué conceptos quedaron firmes.</p>';
      cont.appendChild(boton('Ir a la evaluación', 'primary', () => ir('evaluar')));
    }
    s.appendChild(cont);
    L.unidades.forEach((u, ui) => {
      const sec = h('section', 'unidad');
      const hechas = u.lecciones.filter(l => P.leccionHecha(l.id)).length;
      sec.appendChild(h('h2', null, `<span class="u-num">${ui + 1}</span>${u.titulo} <small>${hechas}/${u.lecciones.length}</small>`));
      sec.appendChild(h('p', 'u-desc', u.desc));
      const ol = h('ol', 'lecs');
      u.lecciones.forEach(l => {
        const li = h('li');
        const hecha = P.leccionHecha(l.id);
        const b = h('button', 'lec' + (hecha ? ' hecha' : '') + (sig && sig.id === l.id ? ' actual' : ''), `<span class="lec-ic" aria-hidden="true">${hecha ? '✓' : ''}</span><span><b>${l.titulo}</b><small>${l.resumen} · ${l.pasos.length} pasos</small></span>`);
        b.type = 'button';
        b.setAttribute('aria-label', `${l.titulo}${hecha ? ', completada' : ''}`);
        b.addEventListener('click', () => abrirLeccion(l.id));
        li.appendChild(b); ol.appendChild(li);
      });
      sec.appendChild(ol);
      s.appendChild(sec);
    });
    const aj = h('details', 'ajustes-teoria', '<summary>Progreso guardado</summary><p class="stats-note">El progreso se guarda en este navegador.</p>');
    aj.appendChild(boton('Borrar todo el progreso de teoría', 'mini', () => { if (confirm('¿Borrar lecciones, habilidades, errores y evaluaciones?')){ P.reiniciar(); indiceAprender(); } }));
    s.appendChild(aj);
  }

  function abrirLeccion(id, desde = 0, opts = {}){
    const lec = L.porId[id]; if (!lec) return;
    ir('aprender', {sinRender: true});
    const s = $('sec-aprender'); s.innerHTML = '';
    const completos = new Set();
    let i = desde;
    const pl = h('div', 'player'); s.appendChild(pl);
    const volver = boton('← Índice de lecciones', 'mini', () => { Sonido.parar(); indiceAprender(); window.scrollTo({top: 0}); });
    pl.appendChild(volver);
    const idx = L.orden.indexOf(lec);
    pl.appendChild(h('p', 'kicker', `${lec.unidad.titulo} · Lección ${lec.unidad.lecciones.indexOf(lec) + 1} de ${lec.unidad.lecciones.length}`));
    pl.appendChild(h('h2', 'lec-t', lec.titulo));
    if (opts.repaso) pl.appendChild(h('p', 'repaso-aviso', `<b>Repaso.</b> ${opts.repaso.msg}`));
    const etapas = h('ol', 'etapas'); pl.appendChild(etapas);
    const paso = h('div', 'paso'); pl.appendChild(paso);
    const nav = h('div', 'paso-nav'); pl.appendChild(nav);
    const ant = boton('← Anterior', 'secondary', () => { if (i > 0){ i--; mostrar(); } });
    const aviso = h('span', 'paso-aviso');
    const sig = boton('Siguiente →', 'primary', () => { completos.add(i); if (i < lec.pasos.length - 1){ i++; mostrar(); } else terminar(); });
    nav.append(ant, aviso, sig);

    function mostrar(){
      Sonido.parar();
      const p = lec.pasos[i];
      etapas.innerHTML = lec.pasos.map((x, k) => `<li class="${k === i ? 'on' : ''}${completos.has(k) ? ' ok' : ''}"${k === i ? ' aria-current="step"' : ''}><span>${L.ETAPAS[x.etapa]}</span></li>`).join('');
      etapas.querySelectorAll('li').forEach((li, k) => { if (completos.has(k) || k < i){ li.classList.add('nav'); li.addEventListener('click', () => { i = k; mostrar(); }); } });
      paso.innerHTML = '';
      paso.appendChild(h('span', 'etapa etapa-' + p.etapa, L.ETAPAS[p.etapa]));
      paso.appendChild(h('h3', null, p.titulo));
      if (p.texto) paso.appendChild(h('div', 'texto', p.texto));
      const listo = () => { completos.add(i); sig.disabled = false; aviso.textContent = ''; };
      let bloqueado = false;
      if (p.visual){ const v = h('div', 'visual'); paso.appendChild(v); p.visual(v, {listo}); if (p.requiere && !completos.has(i)){ bloqueado = true; aviso.textContent = 'Probá la interacción para seguir.'; } }
      if (p.ejercicio){
        const ej = h('div', 'ejercicio'); paso.appendChild(ej);
        const e = p.ejercicio;
        if (!completos.has(i)){ bloqueado = true; aviso.textContent = `Resolvé ${M.plural(e.cantidad, 'ejercicio')} para seguir.`; }
        sesion(ej, {cantidad: e.cantidad, modo: e.guiado ? 'guiado' : 'practica', maxExtras: 2,
          generar: () => E.generar(e.tipo, e.op || {}),
          alTerminar(r, cuerpo, cab){
            cab.innerHTML = '';
            cuerpo.innerHTML = `<div class="ses-fin"><strong>${r.correctas} de ${r.hechas} correctas</strong><p>${r.correctas === r.hechas ? '¡Muy bien!' : 'Los errores vinieron con un ejercicio parecido para volver a intentar.'}</p></div>`;
            cuerpo.querySelector('.ses-fin').appendChild(boton('Hacer más', 'mini', () => mostrar()));
            listo();
          }});
      }
      if (!bloqueado) aviso.textContent = '';
      sig.disabled = bloqueado;
      ant.disabled = i === 0;
      sig.textContent = i < lec.pasos.length - 1 ? 'Siguiente →' : 'Terminar la lección';
      pl.scrollIntoView({block: 'start'});
    }
    function terminar(){
      P.marcarLeccion(lec.id);
      Sonido.parar();
      etapas.remove(); nav.remove();
      const prox = L.orden[idx + 1];
      paso.innerHTML = `<div class="fin-lec"><p class="kicker">Lección completada</p><h3>${lec.titulo}</h3><p>Ya viste la explicación, los ejemplos y la práctica. Para afianzarlo, conviene practicar un poco más o seguir con la próxima lección.</p></div>`;
      const acc = h('div', 'fb-acc');
      if (prox) acc.appendChild(boton(`Siguiente: ${prox.titulo}`, 'primary', () => abrirLeccion(prox.id)));
      const tipo = Object.values(E.TIPOS).find(t => t.leccion === lec.id);
      if (tipo) acc.appendChild(boton('Practicar este tema', 'secondary', () => practicarTipo(tipo.id, {cantidad: 5})));
      acc.appendChild(boton('Volver al índice', 'secondary', () => indiceAprender()));
      paso.appendChild(acc);
    }
    mostrar();
  }

  // ======================================================================
  // Practicar
  // ======================================================================
  function habilidadesDisponibles(){
    const ids = Object.keys(P.HABILIDADES).filter(id => P.leccionHecha(P.HABILIDADES[id].leccion));
    return ids.length ? ids : ['nombres', 'anglo', 'teclado'];
  }
  function barra(id){
    const d = P.dominio(id);
    if (!d.n) return '<span class="dom-vacio">sin datos</span>';
    const col = `color-mix(in srgb, var(--ok) ${pct(d.media)}%, var(--bad))`;
    return `<div class="btrack" role="img" aria-label="Dominio estimado ${pct(d.media)}%, entre ${pct(d.lo)}% y ${pct(d.hi)}%"><span class="g" style="left:50%"></span><span class="brange" style="left:${pct(d.lo)}%;width:${Math.max(1, pct(d.hi) - pct(d.lo))}%"></span><span class="bdot" style="left:${pct(d.media)}%;background:${col}"></span></div><span class="val">${pct(d.media)}%</span>`;
  }
  function hubPracticar(){
    const s = $('sec-practicar'); s.innerHTML = '';
    s.appendChild(h('p', 'lede', 'Ejercicios con corrección explicada. Si te equivocás, te muestro el procedimiento, dónde estuvo el error y otro ejercicio parecido.'));
    const rec = P.recomendacion();
    if (rec) s.appendChild(bannerRecomendacion(rec));
    const card = h('div', 'continuar');
    const disp = habilidadesDisponibles();
    card.innerHTML = `<p class="kicker">Práctica recomendada</p><h2>Lo que más te conviene ahora</h2><p>Mezcla ejercicios de los temas que ya estudiaste (${disp.length} ${disp.length === 1 ? 'habilidad' : 'habilidades'}). Los que más te cuestan aparecen más seguido.</p>`;
    const ayuda = h('label', 'chk', '<input type="checkbox" id="pAyuda"> <span>Con ayuda paso a paso</span>');
    card.appendChild(ayuda);
    card.appendChild(boton('Empezar (8 ejercicios)', 'primary', () => {
      const guiado = $('pAyuda').checked;
      abrirSesion({titulo: 'Práctica recomendada', cantidad: 8, modo: guiado ? 'guiado' : 'practica', generar: () => {
        const hab = P.elegirHabilidad(habilidadesDisponibles());
        return E.generar(P.HABILIDADES[hab].ejercicio, hab === 'accidentales' ? {accidentales: true} : {});
      }});
    }));
    s.appendChild(card);
    L.unidades.forEach(u => {
      const tipos = Object.values(E.TIPOS).filter(t => L.porId[t.leccion] && L.porId[t.leccion].unidad === u);
      if (!tipos.length) return;
      const sec = h('section', 'unidad');
      sec.appendChild(h('h2', null, u.titulo));
      const g = h('div', 'tipos');
      tipos.forEach(t => {
        const c = h('div', 'tipo');
        const vista = P.leccionHecha(t.leccion);
        c.innerHTML = `<b>${t.nombre}</b><div class="brow">${barra(t.hab)}</div>${vista ? '' : `<small>Todavía no viste la lección “${L.porId[t.leccion].titulo}”.</small>`}`;
        const acc = h('div', 'tipo-acc');
        if (!vista) acc.appendChild(boton('Ver la lección', 'mini', () => abrirLeccion(t.leccion)));
        acc.appendChild(boton('Practicar', 'secondary', () => practicarTipo(t.id, {guiado: $('pAyuda').checked})));
        c.appendChild(acc);
        g.appendChild(c);
      });
      sec.appendChild(g);
      s.appendChild(sec);
    });
    const mapa = h('details', 'nmap', '<summary>Mapa de dominio</summary>');
    const ids = Object.keys(P.HABILIDADES).filter(id => P.dominio(id).n > 0).sort((a, b) => P.dominio(a).media - P.dominio(b).media);
    mapa.appendChild(h('p', 'stats-note', 'Cada habilidad lleva una distribución Beta(α, β) de tu probabilidad de acertarla: arranca en Beta(1, 1), cada acierto suma a α y cada error a β (se recuerdan las últimas 20 respuestas). El punto es el valor esperado y la barra, el rango del 90%. La práctica recomendada sortea un valor de cada distribución y elige la habilidad con el valor más bajo.'));
    mapa.appendChild(h('div', null, ids.length ? ids.map(id => `<div class="brow"><span class="lab">${P.HABILIDADES[id].nombre}</span>${barra(id)}</div>`).join('') : '<p class="stats-note">Todavía no hay respuestas.</p>'));
    mapa.querySelectorAll('.brow').forEach(r => r.classList.add('ancha'));
    s.appendChild(mapa);
  }
  function practicarTipo(tipo, o = {}){
    const t = E.TIPOS[tipo];
    abrirSesion({titulo: o.titulo || t.nombre, cantidad: o.cantidad || 5, modo: o.guiado ? 'guiado' : 'practica', generar: () => E.generar(tipo, o.op || (t.hab === 'accidentales' ? {accidentales: true} : {}))});
  }
  function abrirSesion(op){
    ir('practicar', {sinRender: true});
    const s = $('sec-practicar'); s.innerHTML = '';
    s.appendChild(boton('← Volver a Practicar', 'mini', () => { Sonido.parar(); hubPracticar(); }));
    const box = h('div', 'sesion'); s.appendChild(box);
    sesion(box, Object.assign({}, op, {alTerminar(r, cuerpo, cab){
      cab.innerHTML = '';
      const habs = {};
      r.resultados.forEach(x => x.res.habs.forEach(([id]) => habs[id] = true));
      cuerpo.innerHTML = `<div class="ses-fin"><strong>${r.correctas} de ${r.hechas} correctas</strong><p>${r.correctas === r.hechas ? 'Resolviste todo bien.' : 'Cada error vino con otro ejercicio parecido para comprobar el concepto.'}</p>
        <div class="nmap-mini">${Object.keys(habs).filter(id => P.HABILIDADES[id]).map(id => `<div class="brow ancha"><span class="lab">${P.HABILIDADES[id].nombre}</span>${barra(id)}</div>`).join('')}</div></div>`;
      const acc = h('div', 'fb-acc');
      acc.appendChild(boton('Otra ronda', 'primary', () => abrirSesion(op)));
      acc.appendChild(boton('Volver', 'secondary', () => hubPracticar()));
      cuerpo.appendChild(acc);
      const rec = P.recomendacion(); if (rec) cuerpo.appendChild(bannerRecomendacion(rec));
    }}));
  }

  // ======================================================================
  // Evaluación
  // ======================================================================
  const PLAN = [
    ['pent-sol', 'Lectura de notas'], ['pent-fa', 'Lectura de notas'], ['anglo', 'Lectura de notas'],
    ['tonos', 'Tonos y alteraciones'], ['alteraciones', 'Tonos y alteraciones'],
    ['int-numero', 'Identificación de intervalos'], ['int-completo', 'Identificación de intervalos'], ['int-completo', 'Identificación de intervalos'],
    ['int-construir', 'Construcción de intervalos'], ['int-construir', 'Construcción de intervalos'],
    ['arm-altura', 'Armaduras y alteraciones accidentales', {accidentales: true}], ['arm-altura', 'Armaduras y alteraciones accidentales'],
    ['arm-tonalidad', 'Tonalidades'], ['arm-relativa', 'Tonalidades'],
    ['int-armadura', 'Intervalos con armadura'], ['int-armadura', 'Intervalos con armadura'], ['int-armadura', 'Intervalos con armadura'],
    ['oido', 'Reconocimiento auditivo']
  ];
  const fmtT = s => `${Math.floor(s/60)}:${String(s % 60).padStart(2, '0')}`;
  function introEvaluacion(){
    const s = $('sec-evaluar'); s.innerHTML = '';
    const hechas = L.orden.filter(l => P.leccionHecha(l.id)).length;
    const evs = P.evaluaciones();
    s.appendChild(h('p', 'lede', 'Una evaluación sin ayudas para detectar qué conceptos están firmes y cuáles conviene seguir estudiando. Las explicaciones aparecen recién al final.'));
    const c = h('div', 'continuar');
    c.innerHTML = `<p class="kicker">${PLAN.length} preguntas · unos 10 minutos</p><h2>Evaluación general</h2>
      <p>Combina lectura de notas, intervalos (identificar y construir), armaduras, tonalidades, alteraciones accidentales, intervalos con armadura y reconocimiento auditivo. Si no sabés una respuesta, elegí “No sé”: sirve más que adivinar.</p>
      ${hechas < L.orden.length ? `<p class="aviso">Completaste ${hechas} de ${L.orden.length} lecciones. Podés hacer la evaluación igual; los temas que no viste probablemente aparezcan como pendientes.</p>` : ''}`;
    c.appendChild(boton('Empezar la evaluación', 'primary', correrEvaluacion));
    s.appendChild(c);
    if (evs.length) s.appendChild(historial(evs));
  }
  function historial(evs, actual){
    const d = h('section', 'unidad');
    d.appendChild(h('h2', null, 'Evolución'));
    const ult = evs.slice(-8);
    d.appendChild(h('div', null, ult.map((e, i) => `<div class="brow ancha${actual && i === ult.length - 1 ? ' actual' : ''}"><span class="lab">${new Date(e.fecha).toLocaleDateString('es', {day: 'numeric', month: 'short'})} · ${fmtT(e.seg)}</span><div class="btrack"><span class="g" style="left:50%"></span><span class="bfill" style="width:${e.pct}%"></span></div><span class="val">${e.pct}%</span></div>`).join('')));
    return d;
  }
  function correrEvaluacion(){
    const s = $('sec-evaluar'); s.innerHTML = '';
    const plan = M.mezclar(PLAN);
    const box = h('div', 'sesion'); s.appendChild(box);
    const t0 = Date.now();
    let tick = setInterval(() => { const r = $('reloj'); if (r) r.textContent = fmtT(Math.round((Date.now() - t0)/1000)); else clearInterval(tick); }, 1000);
    sesion(box, {cantidad: plan.length, modo: 'evaluacion', maxExtras: 0,
      generar: k => { const [t, , o] = plan[k]; const q = E.generar(t, o || {}); q.concepto = plan[k][1]; return q; },
      alPregunta(){ const r = $('reloj'); if (r) r.textContent = fmtT(Math.round((Date.now() - t0)/1000)); },
      alTerminar(r){ clearInterval(tick); resultadosEvaluacion(r); }});
  }
  function resultadosEvaluacion(r){
    const s = $('sec-evaluar'); s.innerHTML = '';
    const porc = Math.round(100*r.correctas/r.hechas);
    const conceptos = {};
    const diags = {};
    r.resultados.forEach(({q, res}) => {
      const c = conceptos[q.concepto] || (conceptos[q.concepto] = [0, 0]);
      c[1]++; if (res.ok) c[0]++;
      res.habs.forEach(([id, ok]) => P.registrar(id, ok));
      if (!res.ok && res.diag) diags[res.diag] = (diags[res.diag] || 0) + 1;
    });
    const evs = P.evaluaciones();
    const prev = evs[evs.length - 1];
    P.guardarEvaluacion({fecha: Date.now(), pct: porc, seg: r.seg, conceptos});
    const dominados = Object.entries(conceptos).filter(([, [ok, n]]) => ok === n);
    const conError = Object.entries(conceptos).filter(([, [ok, n]]) => ok < n).sort((a, b) => a[1][0]/a[1][1] - b[1][0]/b[1][1]);
    const delta = prev ? porc - prev.pct : null;
    const top = h('div', 'continuar');
    top.innerHTML = `<p class="kicker">Resultado</p>
      <div class="ev-num"><div><b>${porc}%</b><span>de aciertos (${r.correctas} de ${r.hechas})</span></div><div><b>${fmtT(r.seg)}</b><span>de tiempo</span></div>${delta !== null ? `<div><b>${delta > 0 ? '+' : ''}${delta}</b><span>puntos respecto de la anterior (${prev.pct}%)</span></div>` : ''}</div>`;
    s.appendChild(top);
    const g = h('div', 'ev-cols');
    g.appendChild(h('div', 'ev-col', `<h3>Conceptos dominados</h3>${dominados.length ? `<ul>${dominados.map(([c, [ok, n]]) => `<li>✓ ${c} <small>(${ok}/${n})</small></li>`).join('')}</ul>` : '<p class="stats-note">Ninguno sin errores todavía.</p>'}`));
    const ce = h('div', 'ev-col', `<h3>Conceptos con errores</h3>${conError.length ? '' : '<p class="stats-note">¡Ninguno!</p>'}`);
    if (conError.length){
      const ul = h('ul');
      conError.forEach(([c, [ok, n]]) => {
        const prevC = prev && prev.conceptos && prev.conceptos[c];
        const ev = prevC ? ` · antes ${prevC[0]}/${prevC[1]}` : '';
        ul.appendChild(h('li', null, `${c} <small>(${ok}/${n}${ev})</small>`));
      });
      ce.appendChild(ul);
    }
    g.appendChild(ce);
    s.appendChild(g);
    const diagOrden = Object.entries(diags).sort((a, b) => b[1] - a[1]);
    if (diagOrden.length){
      const rec = h('section', 'unidad');
      rec.appendChild(h('h2', null, 'Qué te conviene estudiar'));
      diagOrden.slice(0, 4).forEach(([id, n]) => {
        const d = P.DIAGNOSTICOS[id]; if (!d) return;
        const hab = P.HABILIDADES[d.hab] || {};
        const b = h('div', 'rec');
        b.innerHTML = `<p class="rec-t">${M.plural(n, 'error', 'errores')} de este tipo</p><p>${d.msg}</p>`;
        const acc = h('div', 'rec-acc');
        if (hab.leccion) acc.appendChild(boton('Repasar el concepto', 'primary', () => abrirLeccion(hab.leccion, hab.paso || 0, {repaso: d})));
        if (hab.ejercicio) acc.appendChild(boton('Ejercicios específicos', 'secondary', () => practicarTipo(hab.ejercicio, {cantidad: 5, titulo: 'Ejercicios específicos'})));
        b.appendChild(acc); rec.appendChild(b);
      });
      s.appendChild(rec);
    }
    s.appendChild(historial(P.evaluaciones(), true));
    const rev = h('section', 'unidad');
    rev.appendChild(h('h2', null, 'Revisión de las respuestas'));
    r.resultados.forEach(({q, res}, i) => {
      const d = h('details', 'rev ' + (res.ok ? 'ok' : 'bad'));
      d.innerHTML = `<summary><span>${res.ok ? '✓' : '✗'}</span> ${i + 1}. ${esc(q.enunciado)}</summary>`;
      const body = h('div', 'rev-body');
      const vis = h('div', 'ej-vis'); body.appendChild(vis);
      if (res.alMostrar) res.alMostrar(vis); else if (q.visual) q.visual(vis); else vis.hidden = true;
      body.appendChild(h('dl', 'fb-comp', `<dt>Tu respuesta</dt><dd>${res.tu}</dd><dt>Correcta</dt><dd><b>${res.correcta}</b></dd>`));
      if (res.donde) body.appendChild(h('div', 'fb-donde', `<h4>Dónde estuvo probablemente el error</h4><p>${res.donde}</p>`));
      if (res.explicacion) body.appendChild(h('div', 'fb-exp', res.explicacion));
      d.appendChild(body);
      if (!res.ok) d.open = false;
      rev.appendChild(d);
    });
    s.appendChild(rev);
    const acc = h('div', 'fb-acc');
    acc.appendChild(boton('Hacer otra evaluación', 'secondary', correrEvaluacion));
    acc.appendChild(boton('Ir a las lecciones', 'secondary', () => ir('aprender')));
    s.appendChild(acc);
    window.scrollTo({top: 0});
  }

  // ======================================================================
  // Ajustes: sistema de nombres
  // ======================================================================
  const sel = $('nombresSel');
  sel.value = P.config.nombres;
  sel.addEventListener('change', () => {
    P.config.nombres = M.sistema = sel.value; P.guardarConfig();
    if (seccion === 'aprender') indiceAprender();
    if (seccion === 'practicar') hubPracticar();
    if (seccion === 'evaluar') introEvaluacion();
  });

  let inicial = 'aprender';
  try { const g = localStorage.getItem('teoria-seccion'); if (SECCIONES.includes(g)) inicial = g; } catch(e){}
  ir(inicial, {sinScroll: true});

  window.Aula = {ir, abrirLeccion, practicarTipo};
})();
