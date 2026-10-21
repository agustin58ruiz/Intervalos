// Ejercicios de piano: tocar acordes (con la inversión pedida), escalas y progresiones.
// Se responden con un teclado MIDI o, sin teclado, tocando el teclado de la pantalla.
// Tienen el contrato de ejercicios.js (modo 'propio'): sirven en lecciones, práctica y evaluación.
(function(){
  const M = window.Musica, V = window.Visual, E = window.Ejercicios, A = window.Armonia, P = window.Progreso;
  const {azar, entre} = M;
  const {tipo} = E;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const boton = (texto, cls, fn) => { const b = h('button', 'btn ' + (cls || 'secondary'), texto); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const pc = m => ((m % 12) + 12) % 12;
  const pcNota = n => ((M.PC[n.l] + n.a) % 12 + 12) % 12;
  const deletrear = (K, m, o) => window.MidiCaptura ? window.MidiCaptura.deletrear(K, m, o) : M.deMidi(m);

  Object.assign(P.HABILIDADES, {
    'p-acordes':  {nombre: 'Tocar acordes en el piano',     leccion: 'pi-acordes',  paso: 0, ejercicio: 'p-acorde'},
    'p-escalas':  {nombre: 'Tocar escalas en el piano',     leccion: 'pi-escalas',  paso: 0, ejercicio: 'p-escala'}
  });

  // Área para tocar: panel MIDI + teclado de pantalla (se puede usar con o sin MIDI).
  // modo 'acorde': junta las notas y se confirma (al soltar en MIDI, con «Listo» en pantalla);
  // modo 'secuencia': cada nota cuenta, en orden.
  function areaTocar(cont, op){
    const z = h('div', 'pi-area'); cont.appendChild(z);
    if (window.Midi) Midi.panel(z, {captura: op.modo === 'acorde'});
    const desde = op.desde || 48, hasta = op.hasta || 83;
    const tk = h('div', 'pi-tk'); z.appendChild(tk);
    const info = h('p', 'pi-info'); info.setAttribute('aria-live', 'polite'); z.appendChild(info);
    const acc = h('div', 'fb-acc'); z.appendChild(acc);
    let marcadas = new Set(), terminado = false, sec = [];
    const kb = V.teclado(tk, {desde, hasta, etiquetas: 'do', sonar: true, onTecla: m => pantalla(m)});
    const pintar = () => { const mk = {}; marcadas.forEach(m => mk[m] = {c: 'a'}); sec.forEach((m, i) => mk[m] = {c: 'a', t: String(i + 1)}); kb.marcar(mk); };
    const texto = () => op.modo === 'acorde'
      ? (marcadas.size ? `Notas: ${[...marcadas].sort((a, b) => a - b).map(m => M.corto(M.deMidi(m), {oct: true})).join(' · ')}` : 'Tocá las notas (en el teclado MIDI o en la pantalla).')
      : (sec.length ? `Tocaste ${sec.length} de ${op.cantidad} notas.` : `Tocá ${op.cantidad} notas en orden.`);
    function pantalla(m){
      if (terminado) return;
      if (op.modo === 'acorde'){ if (marcadas.has(m)) marcadas.delete(m); else marcadas.add(m); listo.disabled = !marcadas.size; }
      else { sec.push(m); if (sec.length >= op.cantidad) fin(); }
      pintar(); info.textContent = texto();
    }
    const listo = boton('Listo', 'primary', () => fin());
    const borrar = boton('Borrar', 'mini', () => { marcadas = new Set(); sec = []; pintar(); info.textContent = texto(); listo.disabled = true; });
    if (op.modo === 'acorde'){ acc.append(listo, borrar); listo.disabled = true; } else acc.append(borrar);
    function fin(){ if (terminado) return; terminado = true; acc.remove(); op.alTerminar(op.modo === 'acorde' ? [...marcadas].sort((a, b) => a - b) : sec.slice(), kb); }
    // MIDI
    let fuera = [];
    if (window.Midi && window.MidiCaptura){
      const vivo = () => { if (!z.isConnected || terminado){ fuera.forEach(f => f()); return false; } return true; };
      if (op.modo === 'acorde'){
        const cap = MidiCaptura.crear({modo: Midi.config.captura, estableMs: Midi.config.estableMs, esperadas: () => op.esperadas || 3,
          alCambio: s => { marcadas = new Set(s); pintar(); info.textContent = texto(); },
          alAcorde: a => { marcadas = new Set(a.notas); pintar(); fin(); }});
        fuera = [Midi.on('nota', ev => { if (vivo()) cap.nota(ev); }), Midi.on('pedal', ev => { if (vivo()) cap.pedal(ev.abajo); })];
      } else {
        fuera = [Midi.on('nota', ev => { if (!vivo() || !ev.on) return; sec.push(ev.midi); pintar(); info.textContent = texto(); if (sec.length >= op.cantidad) fin(); })];
      }
    }
    info.textContent = texto();
    return {kb};
  }

  // ---------- Tocar un acorde ----------
  const ACORDES_DIAT = [0, 1, 3, 4, 5];
  tipo('p-acorde', {nombre: 'Tocar acordes (piano)', hab: 'p-acordes', leccion: 'pi-acordes', gen(o){
    const K = o.K || azar(A.TONALIDADES.filter(k => Math.abs(k.arm) <= (o.maxArm || 2) && (!o.modo || k.modo === o.modo)));
    let c;
    if (o.acordes) c = azar(o.acordes);
    else {
      const g = azar(o.grados || ACORDES_DIAT);
      c = {g, inv: o.inversiones ? azar([0, 1, 2]) : 0, sept: !!o.septimas && g === 4};
      if (c.sept && o.inversiones) c.inv = azar([0, 1, 2, 3]);
    }
    c = Object.assign({inv: 0}, c);
    const inf = A.info(K, c);
    const pideBajo = !!(o.inversiones || c.inv || inf.aumentada);
    const pide = pideBajo ? (inf.aumentada ? `con el ${M.corto(inf.notas[0])} en el bajo` : `en ${A.INVERSION[c.inv]} (${M.corto(inf.notas[c.inv])} en el bajo)`) : 'en cualquier posición';
    const q = {modo: 'propio', enunciado: `Tocá el acorde <b>${A.romano(K, c)}</b> de ${K.nombre} ${pide}.`,
      montar(resp, responder){ areaTocar(resp, {modo: 'acorde', esperadas: inf.notas.length, alTerminar: (ms, kb) => { q._kb = kb; responder(ms); }}); },
      correcta: inf.notas.map(pcNota).join(','),
      evaluar(ms){
        if (ms === '__nose') ms = [];
        const pcs = new Set(ms.map(pc)), req = inf.notas.map(pcNota);
        const faltan = inf.notas.filter((n, i) => !pcs.has(req[i]) && !(inf.sept && i === 2 && !inf.aumentada));   // la quinta del acorde de séptima se puede omitir
        const sobran = [...pcs].filter(x => !req.includes(x));
        const bajoOk = !ms.length ? false : !pideBajo || pc(ms[0]) === req[Math.min(c.inv, req.length - 1)];
        const ok = ms.length > 0 && !faltan.length && !sobran.length && bajoOk;
        const marcar = {};
        ms.forEach(m => marcar[m] = {c: req.includes(pc(m)) ? 'ok' : 'bad', t: M.corto(deletrear(K, m, {notas: inf.notas}))});
        if (q._kb) q._kb.marcar(marcar);
        let donde = '';
        if (!ok){
          const p = [];
          if (faltan.length) p.push(`faltó ${faltan.map(n => M.corto(n)).join(', ')}`);
          if (sobran.length) p.push(`sobra ${sobran.map(x => M.corto(deletrear(K, x + 60))).join(', ')}, que no es del acorde`);
          if (!bajoOk && ms.length) p.push(`en el bajo tiene que ir ${M.corto(inf.notas[Math.min(c.inv, inf.notas.length - 1)])}, la nota más grave que tocás`);
          donde = p.length ? p.join('; ') + '.' : 'No llegó ninguna nota.';
        }
        return {ok, diag: ok ? null : 'h-acordes', habs: [['p-acordes', ok], ['h-acordes', ok]],
          tu: ms.length ? ms.map(m => M.corto(deletrear(K, m, {notas: inf.notas}), {oct: true})).join(' · ') : '—',
          correcta: `${A.romanoTexto(K, c)}: ${inf.notas.map((n, i) => `${M.corto(n)}${inf.aumentada ? '' : ` (${['fundamental', 'tercera', 'quinta', 'séptima', 'novena'][i]})`}`).join(', ')}`,
          explicacion: `<p>${A.nombreAcorde(K, c)}. ${inf.aumentada ? 'Las sextas aumentadas se tocan con el ♭6 en el bajo y el ♯4 arriba: entre los dos forman la sexta aumentada que da el nombre.' : `Para ${A.INVERSION[c.inv]}, la nota más grave es ${M.corto(inf.notas[Math.min(c.inv, inf.notas.length - 1)])}; las demás pueden ir en cualquier orden y octava.`}${inf.sept && !inf.aumentada ? ' En los acordes de séptima se puede omitir la quinta.' : ''}</p>`,
          donde,
          alMostrar(el){ el.hidden = false; V.pentagrama(el, {notas: inf.notas.map((n, i) => ({l: n.l, o: i && M.PC[n.l] + n.a < M.PC[inf.notas[0].l] + inf.notas[0].a ? 5 : 4, acc: n.a !== M.alteracionArmadura(K.arm, n.l) ? n.a : null, color: 'ok'})), armonico: true, armadura: K.arm}); Sonido.acorde(inf.notas.map((n, i) => 60 + pcNota(n) + (i && pcNota(n) < pcNota(inf.notas[0]) ? 12 : 0))); }};
      }};
    return q;
  }});

  // ---------- Tocar una escala ----------
  const ESCALAS = {
    mayor: {nombre: 'mayor', pasos: [0, 2, 4, 5, 7, 9, 11, 12]},
    'menor-natural': {nombre: 'menor natural', pasos: [0, 2, 3, 5, 7, 8, 10, 12]},
    'menor-armonica': {nombre: 'menor armónica', pasos: [0, 2, 3, 5, 7, 8, 11, 12]},
    'menor-melodica': {nombre: 'menor melódica (ascendente)', pasos: [0, 2, 3, 5, 7, 9, 11, 12]},
    dorico: {nombre: 'dórica', pasos: [0, 2, 3, 5, 7, 9, 10, 12]},
    frigio: {nombre: 'frigia', pasos: [0, 1, 3, 5, 7, 8, 10, 12]},
    lidio: {nombre: 'lidia', pasos: [0, 2, 4, 6, 7, 9, 11, 12]},
    mixolidio: {nombre: 'mixolidia', pasos: [0, 2, 4, 5, 7, 9, 10, 12]},
    'tonos-enteros': {nombre: 'de tonos enteros', pasos: [0, 2, 4, 6, 8, 10, 12]}
  };
  E.ESCALAS = ESCALAS;
  // Notas de una escala con nombre: en las escalas de siete notas, una letra por grado
  function notasEscala(t, pasos){
    if (pasos.length !== 8) return pasos.map(p => M.deMidi(60 + pcNota(t) + p, t.a < 0 ? -1 : 1));
    return pasos.map((p, i) => { const l = (t.l + i) % 7; let a = (pcNota(t) + p - M.PC[l]) % 12; if (a > 6) a -= 12; if (a < -6) a += 12; return {l, a, o: 4}; });
  }
  E.notasEscala = notasEscala;
  tipo('p-escala', {nombre: 'Tocar escalas (piano)', hab: 'p-escalas', leccion: 'pi-escalas', gen(o){
    const id = o.escala || azar(o.escalas || ['mayor', 'menor-natural', 'menor-armonica', 'menor-melodica']);
    const esc = ESCALAS[id];
    const t = o.tonica || azar([M.nota(0), M.nota(1), M.nota(2), M.nota(3), M.nota(4), M.nota(5), M.nota(6), M.nota(6, -1), M.nota(2, -1), M.nota(3, 1)]);
    const base = pcNota(t);
    const q = {modo: 'propio', enunciado: `Tocá la escala <b>${esc.nombre}</b> de <b>${M.nombre(t)}</b>, ascendente, una octava (${esc.pasos.length} notas, desde ${M.corto(t)} hasta ${M.corto(t)}).`,
      montar(resp, responder){ areaTocar(resp, {modo: 'secuencia', cantidad: esc.pasos.length, alTerminar: (ms, kb) => { q._kb = kb; responder(ms); }}); },
      correcta: esc.pasos.join(','),
      evaluar(ms){
        if (ms === '__nose') ms = [];
        const ini = ms[0];
        const errores = [];
        esc.pasos.forEach((p, i) => { if (ms[i] === undefined || ms[i] - ini !== p) errores.push(i); });
        const ok = ms.length === esc.pasos.length && pc(ini) === base && !errores.length;
        if (q._kb){ const mk = {}; ms.forEach((m, i) => mk[m] = {c: !errores.includes(i) && pc(ini) === base ? 'ok' : 'bad', t: String(i + 1)}); q._kb.marcar(mk); }
        const sem = esc.pasos.slice(1).map((p, i) => p - esc.pasos[i]).map(d => d === 1 ? 'S' : d === 2 ? 'T' : d === 3 ? 'T½' : d).join(' ');
        return {ok, diag: ok ? null : 'alteraciones', habs: [['p-escalas', ok]],
          tu: ms.map(m => M.corto(M.deMidi(m, t.a < 0 ? -1 : 1))).join(' '), correcta: notasEscala(t, esc.pasos).map(n => M.corto(n)).join(' '),
          explicacion: `<p>La escala ${esc.nombre} se forma con estos pasos (T = tono, S = semitono${esc.pasos.some((p, i) => i && p - esc.pasos[i - 1] === 3) ? ', T½ = tono y medio' : ''}): <b>${sem}</b>.</p>`,
          donde: ok ? '' : pc(ini) !== base ? `Empezaste en ${M.corto(M.deMidi(ini))}: la escala empieza en ${M.corto(t)}.` : errores.length ? `Revisá la nota ${errores[0] + 1}: ahí tocaste ${M.corto(M.deMidi(ms[errores[0]]))}${ms[errores[0]] !== undefined ? '' : ' (faltó)'}.` : ''};
      }};
    return q;
  }});

  window.Piano = {areaTocar, ESCALAS};
})();
