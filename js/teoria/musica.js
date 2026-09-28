// Núcleo de teoría: notas con nombre (letra + alteración + octava), intervalos
// con número y calidad, y armaduras. No sabe nada de la interfaz.
(function(){
  const M = {};

  M.LATINO = ['Do','Re','Mi','Fa','Sol','La','Si'];
  M.ANGLO  = ['C','D','E','F','G','A','B'];
  M.PC     = [0,2,4,5,7,9,11];           // semitonos desde Do de cada letra
  M.SIGNO  = {'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'};

  // Sistema de nombres elegido por la persona: 'latino', 'anglo' o 'ambos'
  M.sistema = 'ambos';

  // ---------- Notas ----------
  // Una nota es {l: letra 0-6 (Do..Si), a: alteración -2..2, o: octava (Do4 = Do central)}
  M.nota = (l, a = 0, o = 4) => ({l: ((l % 7) + 7) % 7, a, o});
  M.midi = n => 12*(n.o + 1) + M.PC[n.l] + n.a;
  M.paso = n => n.o*7 + n.l;                          // posición en el pentagrama
  M.desdePaso = (p, a = 0) => ({l: ((p % 7) + 7) % 7, o: Math.floor(p/7), a});
  M.igual = (x, y) => x.l === y.l && x.a === y.a && x.o === y.o;
  M.mismoNombre = (x, y) => x.l === y.l && x.a === y.a;

  const nombreEn = (n, sis) => (sis === 'anglo' ? M.ANGLO : M.LATINO)[n.l] + M.SIGNO[n.a];
  // Nombre para mostrar según el sistema elegido. {oct:true} agrega la octava.
  M.nombre = (n, op = {}) => {
    const sis = op.sistema || M.sistema, o = op.oct ? n.o : '';
    if (sis === 'ambos') return `${nombreEn(n,'latino')}${o} (${nombreEn(n,'anglo')}${o})`;
    return nombreEn(n, sis) + o;
  };
  // Nombre corto (para etiquetas en el pentagrama o el teclado)
  M.corto = (n, op = {}) => nombreEn(n, (op.sistema || M.sistema) === 'anglo' ? 'anglo' : 'latino') + (op.oct ? n.o : '');
  M.latino = n => nombreEn(n, 'latino');
  M.anglo = n => nombreEn(n, 'anglo');

  // Nombres posibles de una tecla (para el teclado): prefiere sostenidos y naturales
  M.deMidi = (m, pref = 1) => {
    const o = Math.floor(m/12) - 1, pc = ((m % 12) + 12) % 12;
    let l = M.PC.indexOf(pc);
    if (l >= 0) return {l, a: 0, o};
    l = M.PC.indexOf(pc - pref);
    return pref > 0 ? {l, a: 1, o} : {l: M.PC.indexOf(pc + 1), a: -1, o};
  };
  M.esNegra = m => [1,3,6,8,10].includes(((m % 12) + 12) % 12);

  // ---------- Intervalos ----------
  M.NUMERO = ['', 'unísono', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];
  M.ORDINAL = ['', '1.ª', '2.ª', '3.ª', '4.ª', '5.ª', '6.ª', '7.ª', '8.ª'];
  M.BASE = [0, 0, 2, 4, 5, 7, 9, 11, 12];   // semitonos del intervalo justo o mayor
  M.esJusto = num => [1,4,5,8].includes(num);
  // Desplazamiento en semitonos respecto de la forma justa o mayor
  const DESDE_JUSTO = {dd:-2, d:-1, J:0, A:1, AA:2};
  const DESDE_MAYOR = {dd:-3, d:-2, m:-1, M:0, A:1, AA:2};
  M.CALIDADES = ['d','m','J','M','A'];
  const CAL_F = {d:'disminuida', m:'menor', J:'justa', M:'mayor', A:'aumentada', dd:'doble disminuida', AA:'doble aumentada'};
  const CAL_M = {d:'disminuido', m:'menor', J:'justo', M:'mayor', A:'aumentado', dd:'doble disminuido', AA:'doble aumentado'};
  M.nombreCalidad = (cal, num = 3) => (num === 1 ? CAL_M : CAL_F)[cal];
  M.nombreIntervalo = (num, cal) => `${M.NUMERO[num]} ${M.nombreCalidad(cal, num)}`;
  M.calidadesPosibles = num => M.esJusto(num) ? ['d','J','A'] : ['d','m','M','A'];

  // Intervalo entre dos notas, siempre medido de la más baja (en el pentagrama) a la más alta
  M.intervalo = (x, y) => {
    let lo = x, hi = y;
    if (M.paso(y) < M.paso(x) || (M.paso(y) === M.paso(x) && M.midi(y) < M.midi(x))){ lo = y; hi = x; }
    const num = M.paso(hi) - M.paso(lo) + 1;
    const semis = M.midi(hi) - M.midi(lo);
    let simple = ((num - 1) % 7) + 1, octs = Math.floor((num - 1)/7);
    if (num > 1 && simple === 1){ simple = 8; octs -= 1; }
    const s = semis - 12*octs;
    const dif = s - M.BASE[simple];
    const tabla = M.esJusto(simple) ? DESDE_JUSTO : DESDE_MAYOR;
    const cal = Object.keys(tabla).find(k => tabla[k] === dif) || null;
    return {num, simple, semis, cal, lo, hi, sube: lo === x,
            nombre: cal ? M.nombreIntervalo(simple, cal) : `${M.NUMERO[simple]} (${semis} semitonos)`};
  };
  // Semitonos que corresponden a un número y una calidad
  M.semitonos = (num, cal) => M.BASE[num] + (M.esJusto(num) ? DESDE_JUSTO : DESDE_MAYOR)[cal];
  // Construye la nota que está a {num, cal} por encima (o por debajo) de n
  M.construir = (n, num, cal, abajo = false) => {
    const p = M.paso(n) + (abajo ? -(num - 1) : num - 1);
    const nat = M.desdePaso(p, 0);
    const objetivo = M.midi(n) + (abajo ? -1 : 1) * M.semitonos(num, cal);
    const a = objetivo - M.midi(nat);
    return Math.abs(a) <= 2 ? Object.assign(nat, {a}) : null;
  };

  // ---------- Armaduras ----------
  M.ORDEN_SOSTENIDOS = [3,0,4,1,5,2,6];   // Fa Do Sol Re La Mi Si
  M.ORDEN_BEMOLES    = [6,2,5,1,4,0,3];   // Si Mi La Re Sol Do Fa
  // n > 0: cantidad de sostenidos; n < 0: cantidad de bemoles
  M.armadura = n => {
    const letras = n > 0 ? M.ORDEN_SOSTENIDOS.slice(0, n) : M.ORDEN_BEMOLES.slice(0, -n);
    const alts = letras.map(l => ({l, a: n > 0 ? 1 : -1, o: 4}));
    // tónica mayor: se avanza por quintas desde Do
    let t = M.nota(0, 0, 4);
    for (let i = 0; i < Math.abs(n); i++){
      t = n > 0 ? M.construir(t, 5, 'J') : M.construir(t, 4, 'J');
      t.o = 4;
    }
    const rel = M.construir(t, 3, 'm', true); rel.o = 4;
    return {n, alts, mayor: t, menor: rel};
  };
  M.alteracionArmadura = (n, l) => {
    if (!n) return 0;
    return (n > 0 ? M.ORDEN_SOSTENIDOS.slice(0, n) : M.ORDEN_BEMOLES.slice(0, -n)).includes(l) ? (n > 0 ? 1 : -1) : 0;
  };
  // Una nota escrita es {l, o, acc}: acc es la alteración dibujada (null si no hay, 0 = becuadro)
  M.altura = (esc, n = 0) => ({l: esc.l, o: esc.o, a: esc.acc !== null && esc.acc !== undefined ? esc.acc : M.alteracionArmadura(n, esc.l)});
  M.nombreTonalidad = (ks, modo = 'mayor') => `${M.nombre(modo === 'mayor' ? ks.mayor : ks.menor)} ${modo}`;
  M.vfArmadura = n => { const t = M.armadura(n).mayor; return M.ANGLO[t.l] + (t.a > 0 ? '#' : t.a < 0 ? 'b' : ''); };
  M.describirArmadura = n => {
    if (!n) return 'sin alteraciones';
    const k = M.armadura(n);
    return `${Math.abs(n)} ${n > 0 ? (n === 1 ? 'sostenido' : 'sostenidos') : (n === -1 ? 'bemol' : 'bemoles')}: ${k.alts.map(x => M.corto(x)).join(', ')}`;
  };

  // ---------- Utilidades ----------
  M.azar = arr => arr[Math.floor(Math.random()*arr.length)];
  M.entre = (a, b) => a + Math.floor(Math.random()*(b - a + 1));
  M.mezclar = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  M.plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;

  window.Musica = M;
})();
