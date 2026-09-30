// Núcleo de ritmo (sin interfaz): figuras, compases, patrones rítmicos, ataques y
// generación de ritmos para ejercicios. Las duraciones se miden en unidades donde la
// negra vale 12: así la corchea vale 6, la semicorchea 3 y la corchea de tresillo 4.
(function(){
  const R = {};
  R.NEGRA = 12;

  // ---------- Figuras ----------
  R.FIGURAS = [
    {id: 'w',  nombre: 'redonda',     plural: 'redondas',     u: 48},
    {id: 'h',  nombre: 'blanca',      plural: 'blancas',      u: 24},
    {id: 'q',  nombre: 'negra',       plural: 'negras',       u: 12},
    {id: '8',  nombre: 'corchea',     plural: 'corcheas',     u: 6},
    {id: '16', nombre: 'semicorchea', plural: 'semicorcheas', u: 3}
  ];
  R.fig = id => R.FIGURAS.find(f => f.id === id);
  // Un evento es {f: figura, p: puntillo (0/1), s: silencio, lig: ligada a la siguiente, tres: grupo de tresillo}
  R.dur = e => R.fig(e.f).u * (e.p ? 1.5 : 1) * (e.tres ? 2/3 : 1);
  R.nombre = e => {
    const f = R.fig(e.f);
    return (e.s ? `silencio de ${f.nombre}` : f.nombre) + (e.p ? ' con puntillo' : '') + (e.tres ? ' de tresillo' : '');
  };

  // Lee un ritmo escrito como texto: "q q. 8 | 8r 8 3(8 8 8) h~ q"
  // w h q 8 16 = figuras · . = puntillo · r = silencio · ~ = ligada a la siguiente · 3( ) = tresillo · | se ignora
  let grupos = 0;
  R.leer = txt => {
    const ev = [];
    let tres = null;
    txt.replace(/3\(/g, ' 3( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean).forEach(tk => {
      if (tk === '|') return;
      if (tk === '3('){ tres = ++grupos; return; }
      if (tk === ')'){ tres = null; return; }
      const m = /^(w|h|q|8|16)(\.?)(r?)(~?)$/.exec(tk);
      if (!m) throw new Error('Figura desconocida: ' + tk);
      ev.push({f: m[1], p: m[2] ? 1 : 0, s: !!m[3], lig: !!m[4], tres});
    });
    return ev;
  };

  // ---------- Compases ----------
  // pulsos: cantidad de tiempos que se sienten · pulso: duración de cada tiempo (en unidades)
  R.COMPASES = {
    '2/4':  {num: 2,  den: 4, pulsos: 2, pulso: 12, tipo: 'simple'},
    '3/4':  {num: 3,  den: 4, pulsos: 3, pulso: 12, tipo: 'simple'},
    '4/4':  {num: 4,  den: 4, pulsos: 4, pulso: 12, tipo: 'simple'},
    '2/2':  {num: 2,  den: 2, pulsos: 2, pulso: 24, tipo: 'simple'},
    '6/8':  {num: 6,  den: 8, pulsos: 2, pulso: 18, tipo: 'compuesto'},
    '9/8':  {num: 9,  den: 8, pulsos: 3, pulso: 18, tipo: 'compuesto'},
    '12/8': {num: 12, den: 8, pulsos: 4, pulso: 18, tipo: 'compuesto'}
  };
  Object.entries(R.COMPASES).forEach(([id, c]) => Object.assign(c, {id, largo: c.num*48/c.den}));
  R.compas = id => R.COMPASES[id];
  R.DEN_FIGURA = {2: 'h', 4: 'q', 8: '8'};
  // Acento de cada pulso: 2 = fuerte, 1 = semifuerte, 0 = débil
  R.acentos = c => ({2: [2, 0], 3: [2, 0, 0], 4: [2, 0, 1, 0]})[c.pulsos];
  R.CARACTER = {2: 'binario', 3: 'ternario', 4: 'cuaternario'};

  // Duración expresada en tiempos (pulsos del compás): 1½, ¾, ⅓…
  const FRAC = [[1/4, '¼'], [1/3, '⅓'], [1/2, '½'], [2/3, '⅔'], [3/4, '¾']];
  R.fmt = x => {
    const ent = Math.floor(x + 1e-9), resto = x - ent;
    if (resto < 1e-6) return String(ent);
    const f = FRAC.find(([v]) => Math.abs(v - resto) < 1e-6);
    return f ? (ent ? ent : '') + f[1] : String(+x.toFixed(2));
  };
  R.enTiempos = (u, c = R.compas('4/4')) => u / c.pulso;

  // ---------- Tempo ----------
  R.TEMPOS = [
    {id: 'largo',    nombre: 'Largo',    desde: 40,  hasta: 60,  tipico: 50,  desc: 'muy lento, amplio'},
    {id: 'adagio',   nombre: 'Adagio',   desde: 60,  hasta: 76,  tipico: 70,  desc: 'lento, tranquilo'},
    {id: 'andante',  nombre: 'Andante',  desde: 76,  hasta: 108, tipico: 92,  desc: 'al paso, caminando'},
    {id: 'moderato', nombre: 'Moderato', desde: 108, hasta: 120, tipico: 114, desc: 'moderado'},
    {id: 'allegro',  nombre: 'Allegro',  desde: 120, hasta: 156, tipico: 138, desc: 'rápido y alegre'},
    {id: 'presto',   nombre: 'Presto',   desde: 168, hasta: 200, tipico: 184, desc: 'muy rápido'}
  ];
  R.tempoDe = bpm => R.TEMPOS.slice().reverse().find(t => bpm >= t.desde) || R.TEMPOS[0];

  // ---------- Patrones ----------
  // Un patrón es {compas, ev: [eventos], anacrusa: unidades antes de la primera barra, celdas?}
  R.patron = (compas, txt, op = {}) => ({compas, ev: typeof txt === 'string' ? R.leer(txt) : txt, anacrusa: op.anacrusa || 0});
  R.largo = p => p.ev.reduce((s, e) => s + R.dur(e), 0);
  R.inicios = p => { let t = 0; return p.ev.map(e => { const x = t; t += R.dur(e); return x; }); };
  // Dónde van las barras de compás (en unidades desde el principio)
  R.barras = p => {
    const c = R.compas(p.compas), L = R.largo(p), out = [];
    for (let t = p.anacrusa || c.largo; t < L - 0.01; t += c.largo) out.push(t);
    return out;
  };
  // Ataques: las notas que se tocan (no los silencios ni la continuación de una ligadura)
  R.ataques = p => {
    const ini = R.inicios(p), out = [];
    p.ev.forEach((e, i) => {
      if (e.s || (i > 0 && p.ev[i - 1].lig && !p.ev[i - 1].s)) return;
      let d = R.dur(e), j = i;
      while (p.ev[j].lig && p.ev[j + 1]){ j++; d += R.dur(p.ev[j]); }
      out.push({i, t: ini[i], d, hasta: j});
    });
    return out;
  };
  // Dos ritmos se distinguen de oído si difieren en los ataques
  R.firma = p => R.ataques(p).map(a => Math.round(a.t)).join(',');

  // Posición métrica de un instante: número de compás (0 = anacrusa), pulso y resto dentro del pulso
  R.posicion = (p, t) => {
    const c = R.compas(p.compas), a = p.anacrusa || 0;
    let comp, dentro;
    if (t < a - 1e-6){ comp = 0; dentro = c.largo - a + t; }
    else { comp = Math.floor((t - a)/c.largo + 1e-9) + 1; dentro = t - a - (comp - 1)*c.largo; }
    const pulso = Math.floor(dentro/c.pulso + 1e-9);
    return {compas: comp, pulso: pulso + 1, resto: dentro - pulso*c.pulso, c};
  };
  // Sílaba para contar en voz alta: el número del pulso, "y" en la mitad, "e" y "a" en los cuartos
  // (en compases compuestos y tresillos: "1 y a")
  R.silaba = (p, t, tres) => {
    const {pulso, resto, c} = R.posicion(p, t);
    if (resto < 1e-6) return String(pulso);
    const fr = resto/c.pulso;
    const tabla = c.tipo === 'compuesto' || tres ? [[1/3, 'y'], [2/3, 'a'], [1/6, 'ta'], [1/2, 'ta'], [5/6, 'ta']] : [[1/2, 'y'], [1/4, 'e'], [3/4, 'a']];
    const s = tabla.find(([v]) => Math.abs(v - fr) < 1e-6);
    return s ? s[1] : '·';
  };
  // Conteo de cada evento; los silencios y las continuaciones de ligadura van entre paréntesis
  R.conteo = p => {
    const ini = R.inicios(p);
    return p.ev.map((e, i) => {
      const s = R.silaba(p, ini[i], e.tres);
      return e.s || (i > 0 && p.ev[i - 1].lig) ? `(${s})` : s;
    });
  };
  // Descripción en palabras de dónde cae un instante: "el tiempo 2", "la «y» del tiempo 3"
  R.describirPos = (p, t, conCompas) => {
    const {compas, pulso, resto, c} = R.posicion(p, t);
    const s = R.silaba(p, t);
    const donde = resto < 1e-6 ? `el tiempo ${pulso}` : s === 'y' ? `la «y» del tiempo ${pulso}` : s === 'a' ? `la «a» del tiempo ${pulso}` : s === 'e' ? `la «e» del tiempo ${pulso}` : `el tiempo ${pulso}`;
    return donde + (conCompas && R.largo(p) > c.largo ? (compas === 0 ? ' de la anacrusa' : ` del compás ${compas}`) : '');
  };
  // "negra, corchea, corchea"
  R.describir = txt => {
    const ev = typeof txt === 'string' ? R.leer(txt) : txt;
    return ev.map((e, i) => R.nombre(e) + (e.lig ? ' ligada a' : i < ev.length - 1 ? ',' : '')).join(' ');
  };

  // ---------- Generación ----------
  // Celdas rítmicas: [ritmo, pulsos que ocupa, nivel, peso]
  // Niveles: 1 redondas, blancas y negras · 2 corcheas · 3 puntillo, semicorcheas y ligaduras · 4 síncopa y tresillos
  R.CELDAS = {
    simple: [
      ['q', 1, 1, 6], ['qr', 1, 1, 1.6], ['h', 2, 1, 3], ['h.', 3, 1, 1.2], ['w', 4, 1, 0.8], ['hr', 2, 1, 0.5],
      ['8 8', 1, 2, 7], ['8r 8', 1, 2, 1.2], ['8 8r', 1, 2, 0.8],
      ['q. 8', 2, 3, 3], ['8. 16', 1, 3, 2], ['16 16 16 16', 1, 3, 2], ['8 16 16', 1, 3, 2.2], ['16 16 8', 1, 3, 2.2], ['q~ 8 8', 2, 3, 0.8],
      ['8 q 8', 2, 4, 3], ['16 8 16', 1, 4, 1.6], ['3(8 8 8)', 1, 4, 2.4], ['8 8~ 8 8', 2, 4, 1.2]
    ],
    compuesto: [
      ['q.', 1, 1, 5], ['q 8', 1, 1, 5], ['8 8 8', 1, 1, 6], ['q.r', 1, 1, 1.2], ['h.', 2, 1, 1.5],
      ['8r 8 8', 1, 2, 1.2], ['8 8 8r', 1, 2, 0.6],
      ['8. 16 8', 1, 3, 2], ['16 16 8 8', 1, 3, 1.2], ['q.~ 8 8 8', 2, 3, 0.6],
      ['8 q', 1, 4, 1.8], ['8r q', 1, 4, 1], ['16 16 16 16 16 16', 1, 4, 0.8]
    ]
  };
  // Algunas figuras largas solo se escriben empezando en ciertos pulsos
  function lugar(cel, c, b){
    const [txt, n] = cel;
    if (b + n > c.pulsos) return false;
    if (txt === 'w') return c.id === '4/4' && b === 0;
    if (txt === 'hr') return (c.id === '4/4' && (b === 0 || b === 2)) || (c.id === '2/4' && b === 0);
    if (txt === 'h.') return c.tipo === 'simple' ? (c.id === '3/4' ? b === 0 : c.id === '4/4' && b <= 1) : b % 2 === 0;
    return true;
  }
  const sortear = (lista, peso) => {
    const tot = lista.reduce((s, x) => s + peso(x), 0);
    let r = Math.random()*tot;
    for (const x of lista){ r -= peso(x); if (r <= 0) return x; }
    return lista[lista.length - 1];
  };
  // Llena los pulsos [desde, hasta) de un compás con celdas al azar
  function llenar(c, lista, nivel, desde, hasta, compas){
    const out = [];
    let b = desde;
    while (b < hasta){
      const ok = lista.filter(x => b + x[1] <= hasta && lugar(x, c, b));
      const x = sortear(ok, x => x[3]*(x[2] === nivel && nivel > 1 ? 1.8 : 1));
      out.push({txt: x[0], pulsos: x[1], nivel: x[2], compas, pulso: b});
      b += x[1];
    }
    return out;
  }
  R.desdeCeldas = (compas, celdas) => ({compas, anacrusa: 0, celdas, ev: celdas.flatMap(x => R.leer(x.txt))});

  // o: {compas, nivel, compases, exigirNivel}
  R.generar = (o = {}) => {
    const c = R.compas(o.compas || '4/4');
    const nivel = o.nivel || 2, n = o.compases || 1;
    const lista = R.CELDAS[c.tipo].filter(x => x[2] <= nivel);
    let p = null;
    for (let intento = 0; intento < 80; intento++){
      const celdas = [];
      for (let k = 0; k < n; k++) celdas.push(...llenar(c, lista, nivel, 0, c.pulsos, k));
      p = R.desdeCeldas(c.id, celdas);
      const at = R.ataques(p).length;
      if (at < n + 1) continue;                                                   // demasiado vacío
      if (p.ev[0].s && (nivel <= 2 || Math.random() < 0.7)) continue;             // mejor empezar tocando
      if (celdas.length >= 3 && new Set(celdas.map(x => x.txt)).size < 2) continue; // todo igual
      if (o.exigirNivel !== false && nivel > 1 && lista.some(x => x[2] === nivel) && !celdas.some(x => x.nivel === nivel) && intento < 60) continue;
      if (celdas.filter(x => /r/.test(x.txt) && !/ /.test(x.txt)).length > n) continue; // no más de un silencio largo por compás
      return p;
    }
    return p;
  };
  // Otro ritmo igual salvo en una celda, que suena distinto (para las opciones del dictado)
  R.variante = (p, o = {}) => {
    const c = R.compas(p.compas), nivel = o.nivel || 4;
    const lista = R.CELDAS[c.tipo].filter(x => x[2] <= nivel);
    const firma = R.firma(p);
    for (let intento = 0; intento < 40; intento++){
      const k = Math.floor(Math.random()*p.celdas.length);
      const cel = p.celdas[k];
      const nuevas = llenar(c, lista, nivel, cel.pulso, cel.pulso + cel.pulsos, cel.compas);
      const celdas = [...p.celdas.slice(0, k), ...nuevas, ...p.celdas.slice(k + 1)];
      const v = R.desdeCeldas(p.compas, celdas);
      if (R.firma(v) !== firma && !v.ev[0].s) return Object.assign(v, {cambio: {compas: cel.compas, pulso: cel.pulso, pulsos: cel.pulsos}});
    }
    return null;
  };
  // Parte de un patrón que ocupa ciertos pulsos (para explicar diferencias)
  R.tramo = (p, compas, pulso, pulsos) => {
    const c = R.compas(p.compas), ini = R.inicios(p);
    const t0 = compas*c.largo + pulso*c.pulso, t1 = t0 + pulsos*c.pulso;
    return p.ev.filter((e, i) => ini[i] >= t0 - 1e-6 && ini[i] < t1 - 1e-6);
  };

  window.Ritmo = R;
})();
