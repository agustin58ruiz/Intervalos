// Sección «Intervalos y armaduras»: dos notas en el pentagrama (con o sin armadura),
// cuatro opciones y, después de responder, la explicación con el método estándar:
// número contando letras → armadura → alteraciones → semitonos → calidad.
// Si la respuesta es incorrecta, la explicación se muestra entera. Si es correcta,
// se ofrece verla y, si no se pide, a los 3 segundos sigue otro intervalo.
(function(){
  const M = window.Musica, V = window.Visual, E = window.Ejercicios, P = window.Progreso;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const boton = (texto, cls, fn) => { const b = h('button', 'btn ' + (cls || 'secondary'), texto); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch(e){ return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };

  const ESPERA = 3000;
  const cfg = Object.assign({armadura: 'mezcla', alteraciones: true, calidades: 'todas', clave: 'treble'}, leer('teoria-estudio-iv', {}));
  const puntaje = Object.assign({ok: 0, total: 0, racha: 0}, leer('teoria-estudio-iv-puntaje', {}));
  let raiz = null, actual = null, timer = null, tick = null;

  const clave = c => `${c.num}:${c.cal}`;
  const nombre = c => M.nombreIntervalo(c.num, c.cal);
  const notasDe = (a, extra) => [Object.assign({color: 'a'}, a.x, extra ? extra(a.x) : {}), Object.assign({color: 'b'}, a.y, extra ? extra(a.y) : {})];

  function generar(){
    const usarArm = cfg.armadura === 'con' || (cfg.armadura === 'mezcla' && Math.random() < 0.6);
    const calidades = cfg.calidades === 'basicas' ? ['m','M','J'] : ['m','M','J','A','d'];
    const bajo = cfg.clave === 'bass';
    return E.generarIntervalo({
      armadura: usarArm, accidentales: cfg.alteraciones, alteraciones: cfg.alteraciones && !usarArm,
      armaduras: [-5,-4,-3,-2,-1,1,2,3,4,5], calidades, descendente: true,
      pasoMin: bajo ? 17 : 29, pasoMax: bajo ? 22 : 34
    });
  }

  // Opciones: la correcta y las confusiones más probables
  function opciones(a){
    const permitidas = cfg.calidades === 'basicas' ? ['m','M','J'] : ['d','m','J','M','A'];
    const ok = {num: a.num, cal: a.cal};
    const trampas = [];
    const agregar = c => { if (c && c.cal && c.num >= 2 && c.num <= 8 && permitidas.includes(c.cal) && M.calidadesPosibles(c.num).includes(c.cal)) trampas.push({num: c.num, cal: c.cal}); };
    if (a.arm && a.sinArm.cal) agregar({num: a.sinArm.simple, cal: a.sinArm.cal});      // olvidar la armadura
    if (a.conAcc.length && a.sinAcc.cal) agregar({num: a.sinAcc.simple, cal: a.sinAcc.cal}); // olvidar la alteración
    // mismo sonido, otro número (contar semitonos en vez de letras)
    [a.num - 1, a.num + 1].forEach(n => { if (n < 2 || n > 8) return; const c = M.calidadesPosibles(n).find(q => M.semitonos(n, q) === a.semis); if (c) agregar({num: n, cal: c}); });
    M.mezclar(M.calidadesPosibles(a.num).filter(c => c !== a.cal)).forEach(c => agregar({num: a.num, cal: c}));
    [a.num - 1, a.num + 1].forEach(n => { if (n >= 2 && n <= 8) agregar({num: n, cal: M.calidadesPosibles(n).includes(a.cal) ? a.cal : (M.esJusto(n) ? 'J' : 'M')}); });
    const lista = [ok];
    const vistos = new Set([clave(ok)]);
    // primero hasta dos trampas “inteligentes”, después el resto
    const inteligentes = trampas.slice(0, 3), resto = M.mezclar(trampas.slice(3));
    [...M.mezclar(inteligentes).slice(0, 2), ...inteligentes, ...resto].forEach(c => { if (lista.length < 4 && !vistos.has(clave(c))){ vistos.add(clave(c)); lista.push(c); } });
    while (lista.length < 4){
      const n = M.entre(2, 8), c = M.azar(M.calidadesPosibles(n).filter(q => permitidas.includes(q)));
      if (c && !vistos.has(`${n}:${c}`)){ vistos.add(`${n}:${c}`); lista.push({num: n, cal: c}); }
    }
    return M.mezclar(lista);
  }

  function pararTimer(){ clearTimeout(timer); clearInterval(tick); timer = tick = null; }

  function mostrar(el){
    raiz = el;
    pararTimer();
    el.innerHTML = '';
    el.appendChild(h('p', 'lede', 'Dos notas en el pentagrama y cuatro opciones. Después de responder te explico, con el método estándar, por qué esas notas forman ese intervalo: primero el <b>número</b> contando letras, después la <b>armadura</b> y las <b>alteraciones</b>, y al final la <b>calidad</b> contando semitonos.'));
    el.appendChild(ajustes());
    const card = h('div', 'ei-card'); el.appendChild(card);
    const marcador = h('div', 'score ei-score');
    el.appendChild(marcador);
    pintarPuntaje(marcador);
    nueva(card);
  }

  function ajustes(){
    const d = h('div', 'ei-ajustes');
    const grupo = (titulo, nombreCampo, items) => {
      const f = h('div', 'clefbar');
      f.appendChild(h('span', null, titulo));
      const seg = h('div', 'seg');
      items.forEach(([v, t]) => {
        const l = h('label');
        l.innerHTML = `<input type="radio" name="ei-${nombreCampo}" value="${v}"${String(cfg[nombreCampo]) === String(v) ? ' checked' : ''}><span>${t}</span>`;
        l.querySelector('input').addEventListener('change', () => {
          cfg[nombreCampo] = v === 'true' ? true : v === 'false' ? false : v;
          guardar('teoria-estudio-iv', cfg);
          nueva(raiz.querySelector('.ei-card'));
        });
        seg.appendChild(l);
      });
      f.appendChild(seg);
      d.appendChild(f);
    };
    grupo('Armadura', 'armadura', [['sin', 'Sin'], ['con', 'Con'], ['mezcla', 'Mezclar']]);
    grupo('Alteraciones', 'alteraciones', [['false', 'No'], ['true', 'Sí']]);
    grupo('Calidades', 'calidades', [['basicas', 'Mayores, menores y justas'], ['todas', 'Todas']]);
    grupo('Clave', 'clave', [['treble', 'Sol'], ['bass', 'Fa']]);
    return d;
  }

  function pintarPuntaje(m){
    m = m || (raiz && raiz.querySelector('.ei-score'));
    if (!m) return;
    m.innerHTML = `<div><b>${puntaje.ok}</b> aciertos de <b>${puntaje.total}</b></div><div>Racha: <b>${puntaje.racha}</b></div>`;
    const r = boton('Reiniciar', 'mini', () => { puntaje.ok = puntaje.total = puntaje.racha = 0; guardar('teoria-estudio-iv-puntaje', puntaje); pintarPuntaje(); });
    m.appendChild(r);
  }

  function nueva(card){
    if (!card) return;
    pararTimer();
    if (window.Sonido) Sonido.parar();
    const a = generar();
    const ops = opciones(a);
    actual = {a, ops, respondida: false};
    card.innerHTML = '';
    card.appendChild(h('p', 'ej-enun', `¿Qué intervalo forman estas dos notas?${a.arm ? ' <span class="ei-arm">Fijate en la armadura.</span>' : ''}`));
    const vis = h('div', 'ej-vis'); card.appendChild(vis);
    V.pentagrama(vis, {clave: cfg.clave, armadura: a.arm, notas: notasDe(a)});
    const au = h('div', 'ej-audio'); card.appendChild(au);
    au.appendChild(boton('▶ Escuchar', 'secondary', () => Sonido.intervalo(M.midi(a.rx), M.midi(a.ry))));
    const g = h('div', 'opts ei-opts'); card.appendChild(g);
    ops.forEach((c, i) => {
      const b = boton(`<kbd>${i + 1}</kbd>${nombre(c)}`, 'opt', () => responder(c, card));
      b.dataset.k = clave(c);
      g.appendChild(b);
    });
    const fb = h('div', 'ej-fb ei-fb'); fb.setAttribute('aria-live', 'polite'); card.appendChild(fb);
  }

  function responder(c, card){
    if (!actual || actual.respondida) return;
    actual.respondida = true;
    const a = actual.a;
    const ok = c.num === a.num && c.cal === a.cal;
    const diag = ok ? null : E.diagnosticarIntervalo(a, c);
    // progreso compartido con el resto del aula
    P.registrar('int-numero', c.num === a.num);
    if (c.num === a.num) P.registrar('int-calidad', ok);
    if (a.arm && a.afectadas.length) P.registrar('arm-leer', diag !== 'armadura');
    if (a.conAcc.length) P.registrar('accidentales', diag !== 'accidental');
    if (a.arm) P.registrar('int-armadura', ok);
    if (['A','d'].includes(a.cal) && c.num === a.num) P.registrar('int-aum-dis', ok);
    P.anotarResultado(diag, ok);
    puntaje.total++; if (ok){ puntaje.ok++; puntaje.racha++; } else puntaje.racha = 0;
    guardar('teoria-estudio-iv-puntaje', puntaje);
    pintarPuntaje();

    card.querySelectorAll('.ei-opts .opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.k === `${a.num}:${a.cal}`) b.classList.add('correct');
      else if (b.dataset.k === clave(c)) b.classList.add('wrong');
    });
    const vis = card.querySelector('.ej-vis');
    V.pentagrama(vis, {clave: cfg.clave, armadura: a.arm, notas: notasDe(a, e => ({texto: M.corto(M.altura(e, a.arm))}))});
    Sonido.intervalo(M.midi(a.rx), M.midi(a.ry));

    const fb = card.querySelector('.ei-fb');
    fb.innerHTML = '';
    if (ok){
      fb.appendChild(h('div', 'fb-cab ok', `<strong>¡Correcto!</strong> ${nombre(c)}`));
      const barra = h('div', 'ei-cuenta', '<span></span>'); fb.appendChild(barra);
      const acc = h('div', 'fb-acc'); fb.appendChild(acc);
      const ver = boton('Ver la explicación', 'secondary', () => { pararTimer(); barra.remove(); ver.remove(); sig.textContent = 'Siguiente'; explicar(card, a, null, null); });
      const sig = boton('Siguiente en 3', 'primary', () => nueva(card));
      acc.append(ver, sig);
      let quedan = ESPERA/1000;
      requestAnimationFrame(() => barra.classList.add('corre'));
      tick = setInterval(() => { quedan--; if (quedan > 0) sig.textContent = `Siguiente en ${quedan}`; }, 1000);
      timer = setTimeout(() => { if (raiz && !raiz.hidden && card.isConnected) nueva(card); }, ESPERA);
    } else {
      fb.appendChild(h('div', 'fb-cab bad', '<strong>No es correcto</strong>'));
      fb.appendChild(h('dl', 'fb-comp', `<dt>Tu respuesta</dt><dd>${nombre(c)}</dd><dt>Correcta</dt><dd><b>${nombre(a)}</b></dd>`));
      explicar(card, a, c, diag);
      const acc = h('div', 'fb-acc'); fb.appendChild(acc);
      acc.appendChild(boton('Siguiente', 'primary', () => nueva(card)));
    }
    const foco = fb.querySelector('.primary'); if (foco) foco.focus({preventScroll: true});
  }

  // Explicación con el método estándar, paso a paso, con pentagrama y teclado
  function explicar(card, a, resp, diag){
    const fb = card.querySelector('.ei-fb');
    const box = h('div', 'ei-exp');
    if (resp && diag) box.appendChild(h('div', 'fb-donde', `<h4>Dónde estuvo probablemente el error</h4><p>${E.dondeError(a, resp, diag)}</p>`));
    box.appendChild(h('h4', 'ei-exp-t', `Por qué es ${nombre(a)}`));
    box.appendChild(h('ol', 'proc', E.pasosIntervalo(a).map(p => `<li><b>${p.t}.</b> ${p.d}</li>`).join('')));
    // teclado con los semitonos contados
    const tk = h('div', 'ej-tk'); box.appendChild(tk);
    const lo = M.midi(a.iv.lo), hi = M.midi(a.iv.hi);
    const desde = lo - (((lo % 12) + 12) % 12);
    const kb = V.teclado(tk, {desde, hasta: Math.max(hi + 1, desde + 12), etiquetas: 'ninguna'});
    const mk = {[lo]: {c: 'a', t: M.corto(a.iv.lo)}};
    for (let m = lo + 1; m <= hi; m++) mk[m] = {c: m === hi ? 'b' : 'guia', t: String(m - lo)};
    if (hi > lo) mk[hi].t = `${M.corto(a.iv.hi)} ${hi - lo}`;
    kb.marcar(mk);
    const acc = h('div', 'lz-botones');
    acc.appendChild(boton('▶ Ver el conteo de letras', 'secondary', () => {
      const vis = card.querySelector('.ej-vis');
      const [x, y] = a.iv.lo === a.rx ? [a.x, a.y] : [a.y, a.x];
      V.contar(vis, x, y, {clave: cfg.clave, armadura: a.arm}).empezar();
    }));
    acc.appendChild(boton('▶ Escuchar', 'secondary', () => Sonido.intervalo(M.midi(a.rx), M.midi(a.ry))));
    box.appendChild(acc);
    const accFb = fb.querySelector('.fb-acc');
    if (accFb) fb.insertBefore(box, accFb); else fb.appendChild(box);
  }

  // Teclas 1–4 para responder, Enter para seguir
  document.addEventListener('keydown', e => {
    if (!raiz || raiz.hidden || !actual || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-4]$/.test(e.key) && !actual.respondida){
      const b = raiz.querySelectorAll('.ei-opts .opt')[+e.key - 1];
      if (b) b.click();
    } else if (e.key === 'Enter' && actual.respondida && !(e.target instanceof HTMLButtonElement)){
      e.preventDefault(); nueva(raiz.querySelector('.ei-card'));
    }
  });

  window.EstudioIntervalos = {mostrar, salir: pararTimer};
})();
