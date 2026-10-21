// Del teclado MIDI al pentagrama (sin interfaz): agrupar notas en acordes, asignarlas a
// las voces SATB y escribirlas con el nombre correcto en la tonalidad.
(function(){
  const M = window.Musica, A = window.Armonia;
  const MC = {};
  const VOCES = ['S', 'A', 'T', 'B'];
  const CENTRO = {S: 70, A: 64, T: 57, B: 48};

  // ---------- Agrupar notas en acordes ----------
  // modo 'soltar': el acorde son todas las notas que estuvieron apretadas juntas; se confirma
  //   cuando se sueltan todas (y el pedal está arriba). Tolera dedos que no bajan a la vez.
  // modo 'estable': se confirma cuando hay `esperadas()` notas apretadas sin cambios durante
  //   `estableMs` milisegundos (permite encadenar acordes sin levantar las manos).
  // op: {modo, estableMs, esperadas: () => n, alAcorde({notas, inicio, fin, dur}), alCambio(Set)}
  MC.crear = (op = {}) => {
    const sostenidas = new Map();     // midi → t de inicio
    let grupo = new Map();            // midi → {t, fin}
    let pedal = false, timer = null, emitido = false;
    const esperadas = () => (op.esperadas ? op.esperadas() : 4);
    const emitir = () => {
      if (!grupo.size) return;
      const notas = [...grupo.keys()].sort((a, b) => a - b);
      const ini = Math.min(...[...grupo.values()].map(x => x.t));
      const fin = Math.max(...[...grupo.values()].map(x => x.fin || x.t));
      const dur = {}; grupo.forEach((x, m) => { dur[m] = x.fin ? x.fin - x.t : null; });
      if (op.alAcorde) op.alAcorde({notas, inicio: ini, fin, dur});
    };
    const revisarEstable = () => {
      clearTimeout(timer);
      if ((op.modo || 'soltar') !== 'estable' || emitido) return;
      if (sostenidas.size >= esperadas()){
        timer = setTimeout(() => { if (sostenidas.size >= esperadas() && !emitido){ emitido = true; grupo = new Map([...sostenidas].map(([m, t]) => [m, {t}])); emitir(); } }, op.estableMs || 120);
      }
    };
    return {
      nota(ev){
        if (ev.on){
          if (!sostenidas.size && !pedal && !emitido) grupo = new Map();
          sostenidas.set(ev.midi, ev.t);
          if (!emitido) grupo.set(ev.midi, {t: ev.t});
        } else {
          sostenidas.delete(ev.midi);
          const g = grupo.get(ev.midi); if (g) g.fin = ev.t;
        }
        if (op.alCambio) op.alCambio(new Set(sostenidas.keys()));
        if (!sostenidas.size && !pedal){
          clearTimeout(timer);
          if (!emitido && (op.modo || 'soltar') === 'soltar') emitir();
          emitido = false; grupo = new Map();
        } else revisarEstable();
      },
      pedal(abajo){
        pedal = abajo;
        if (!abajo && !sostenidas.size){ if (!emitido && (op.modo || 'soltar') === 'soltar') emitir(); emitido = false; grupo = new Map(); }
      },
      sostenidas: () => new Set(sostenidas.keys()),
      reiniciar(){ sostenidas.clear(); grupo = new Map(); emitido = false; clearTimeout(timer); }
    };
  };

  // ---------- Asignar voces ----------
  // midis: notas del acorde. fijas: {S: nota escrita…} voces dadas por el ejercicio.
  // anterior: columna anterior (para elegir, si faltan notas, el reparto que menos mueve).
  // Devuelve {voces: {S: midi|null…}, avisos: [texto]} o {voces: null, avisos} si no se puede.
  MC.asignar = (midis, op = {}) => {
    const fijas = op.fijas || {}, anterior = op.anterior || null;
    const fijoMidi = {};
    VOCES.forEach(v => { if (fijas[v]) fijoMidi[v] = M.midi(fijas[v]); });
    // si se vuelve a tocar una nota dada (misma altura), se ignora
    let ns = [...new Set(midis)].sort((a, b) => b - a).filter(m => !Object.values(fijoMidi).includes(m));
    const libres = VOCES.filter(v => !fijas[v]);
    const avisos = [];
    if (!ns.length) return {voces: null, avisos: ['No llegó ninguna nota nueva.']};
    if (ns.length > libres.length) return {voces: null, avisos: [`Tocaste ${ns.length} notas distintas y faltan ${libres.length} voces (${libres.map(v => A.NOMBRE_VOZ[v]).join(', ')}). Probá de nuevo.`]};
    const voces = {}; VOCES.forEach(v => voces[v] = fijas[v] ? fijoMidi[v] : null);
    // repartos posibles respetando el orden de las voces (las notas ordenadas de aguda a grave)
    const combos = [];
    const elegir = (desde, faltan, acc) => { if (!faltan){ combos.push(acc.slice()); return; } for (let i = desde; i <= libres.length - faltan; i++){ acc.push(libres[i]); elegir(i + 1, faltan - 1, acc); acc.pop(); } };
    elegir(0, ns.length, []);
    let mejor = null;
    combos.forEach(cb => {
      let costo = 0, valido = true;
      cb.forEach((v, i) => {
        const ref = anterior && anterior[v] ? M.midi(anterior[v]) : CENTRO[v];
        costo += Math.abs(ns[i] - ref);
        // no cruzar con las voces dadas
        const idx = VOCES.indexOf(v);
        VOCES.forEach((w, j) => { if (fijoMidi[w] === undefined) return; if (j < idx && fijoMidi[w] < ns[i]) valido = false; if (j > idx && fijoMidi[w] > ns[i]) valido = false; });
      });
      if (valido && (!mejor || costo < mejor.costo)) mejor = {cb, costo};
    });
    if (!mejor){
      // si no hay reparto sin cruces, se asigna igual de aguda a grave y se avisa
      libres.slice(0, ns.length).forEach((v, i) => { voces[v] = ns[i]; });
      avisos.push('Alguna nota quedó cruzada con una voz dada: revisá el registro.');
    } else mejor.cb.forEach((v, i) => { voces[v] = ns[i]; });
    if (ns.length < libres.length && midis.length > ns.length) avisos.push('Si dos voces cantan la misma nota (unísono), en el piano es una sola tecla: completá la otra voz con el mouse.');
    if (ns.length < libres.length) avisos.push(`${libres.length - ns.length === 1 ? 'Falta 1 voz' : `Faltan ${libres.length - ns.length} voces`}: ${libres.filter(v => voces[v] === null).map(v => A.NOMBRE_VOZ[v]).join(', ')}.`);
    return {voces, avisos};
  };

  // ---------- Escribir la nota con el nombre correcto ----------
  // Preferencia: una nota del acorde esperado; la nota de la tonalidad (con la sensible
  // elevada en menor); el nombre más simple (♯ en tonalidades con sostenidos, ♭ con bemoles).
  MC.deletrear = (K, m, op = {}) => {
    const pcm = ((m % 12) + 12) % 12;
    const cands = [];
    for (let l = 0; l < 7; l++) for (let a = -2; a <= 2; a++){
      if (((M.PC[l] + a) % 12 + 12) % 12 !== pcm) continue;
      const o = Math.round((m - M.PC[l] - a)/12) - 1;
      cands.push({l, a, o});
    }
    const enAcorde = op.notas ? cands.find(c => op.notas.some(n => n.l === c.l && n.a === c.a)) : null;
    if (enAcorde) return enAcorde;
    const diat = K ? cands.find(c => c.a === A.alteracionPorDefecto(K, c.l)) : null;
    if (diat) return diat;
    const pref = K && K.arm < 0 ? -1 : 1;
    cands.sort((x, y) => Math.abs(x.a) - Math.abs(y.a) || (Math.sign(y.a) === pref ? 1 : 0) - (Math.sign(x.a) === pref ? 1 : 0));
    return cands[0];
  };
  // Acorde tocado → columna escrita {S: {l, a, o}…}, usando el acorde esperado si se conoce
  MC.columna = (K, voces, acordeEsperado) => {
    const notas = acordeEsperado ? A.notasAcorde(K, acordeEsperado) : null;
    const out = {};
    VOCES.forEach(v => { out[v] = voces[v] === null || voces[v] === undefined ? null : (typeof voces[v] === 'object' ? voces[v] : MC.deletrear(K, voces[v], {notas})); });
    // si no hay acorde esperado, se elige el acorde de la tonalidad que mejor explica las notas
    if (!acordeEsperado){
      const midis = VOCES.filter(v => voces[v] !== null && typeof voces[v] === 'number').map(v => voces[v]);
      let mejor = null;
      A.candidatos(K).forEach(c => {
        const ns = A.notasAcorde(K, c);
        const pcs = new Set(ns.map(n => ((M.PC[n.l] + n.a) % 12 + 12) % 12));
        const ok = midis.filter(m => pcs.has(((m % 12) + 12) % 12)).length;
        const punt = ok*10 - (c.esp ? 3 : 0) - (c.sept ? 1 : 0);
        if (ok === midis.length && (!mejor || punt > mejor.punt)) mejor = {punt, ns};
      });
      if (mejor) VOCES.forEach(v => { if (typeof voces[v] === 'number') out[v] = MC.deletrear(K, voces[v], {notas: mejor.ns}); });
    }
    return out;
  };

  window.MidiCaptura = MC;
})();
