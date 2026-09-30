// Progreso y sistema adaptativo: cada habilidad tiene una distribución Beta(α, β)
// de la probabilidad de acertarla; los errores se clasifican (diagnóstico) para
// recomendar qué repasar.
(function(){
  const P = {};
  const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch(e){ return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };

  // ---------- Habilidades ----------
  // leccion + paso: adónde llevar para repasar; ejercicio: práctica específica
  P.HABILIDADES = {
    'nombres':      {nombre:'Nombres de las notas',            leccion:'n-nombres',     paso:0, ejercicio:'nombres'},
    'anglo':        {nombre:'Notación anglosajona',            leccion:'n-anglo',       paso:0, ejercicio:'anglo'},
    'teclado':      {nombre:'Notas en el teclado',             leccion:'n-teclado',     paso:0, ejercicio:'teclado'},
    'tonos':        {nombre:'Tonos y semitonos',               leccion:'n-tonos',       paso:0, ejercicio:'tonos'},
    'alteraciones': {nombre:'Sostenidos, bemoles y becuadros', leccion:'n-alteraciones',paso:0, ejercicio:'alteraciones'},
    'pent-sol':     {nombre:'Lectura en clave de Sol',         leccion:'n-sol',         paso:0, ejercicio:'pent-sol'},
    'pent-fa':      {nombre:'Lectura en clave de Fa',          leccion:'n-fa',          paso:0, ejercicio:'pent-fa'},
    'pent-teclado': {nombre:'Del pentagrama al teclado',       leccion:'n-puente',      paso:0, ejercicio:'pent-teclado'},
    'int-numero':   {nombre:'Número del intervalo',            leccion:'i-numero',      paso:0, ejercicio:'int-numero'},
    'int-calidad':  {nombre:'Calidad del intervalo',           leccion:'i-calidad',     paso:0, ejercicio:'int-calidad'},
    'int-aum-dis':  {nombre:'Aumentados y disminuidos',        leccion:'i-aumdis',      paso:0, ejercicio:'int-completo'},
    'int-construir':{nombre:'Construir intervalos',            leccion:'i-construir',   paso:0, ejercicio:'int-construir'},
    'arm-leer':     {nombre:'Aplicar la armadura',             leccion:'a-que-es',      paso:1, ejercicio:'arm-altura'},
    'arm-orden':    {nombre:'Orden de ♯ y ♭',                  leccion:'a-orden',       paso:0, ejercicio:'arm-orden'},
    'arm-tonalidad':{nombre:'Reconocer la tonalidad',          leccion:'a-tonalidad',   paso:0, ejercicio:'arm-tonalidad'},
    'arm-relativa': {nombre:'Relativas menores',               leccion:'a-relativa',    paso:0, ejercicio:'arm-relativa'},
    'accidentales': {nombre:'Alteraciones accidentales',       leccion:'a-accidentales',paso:0, ejercicio:'arm-altura'},
    'int-armadura': {nombre:'Intervalos con armadura',         leccion:'x-procedimiento',paso:0,ejercicio:'int-armadura'},
    'oido':         {nombre:'Reconocimiento auditivo',         leccion:'i-que-es',      paso:1, ejercicio:'oido'},
    'r-tempo':      {nombre:'Pulso y tempo',                   leccion:'r-pulso',       paso:2, ejercicio:'r-tempo'},
    'r-figuras':    {nombre:'Figuras rítmicas',                leccion:'r-figuras',     paso:0, ejercicio:'r-figura'},
    'r-valores':    {nombre:'Valores y equivalencias',         leccion:'r-figuras',     paso:1, ejercicio:'r-equivalencia'},
    'r-silencios':  {nombre:'Silencios',                       leccion:'r-silencios',   paso:0, ejercicio:'r-silencio'},
    'r-compas':     {nombre:'Compás y cifra indicadora',       leccion:'r-compas',      paso:1, ejercicio:'r-cifra'},
    'r-completar':  {nombre:'Completar compases',              leccion:'r-compas',      paso:2, ejercicio:'r-completar'},
    'r-tocar':      {nombre:'Tocar ritmos',                    leccion:'r-leer',        paso:0, ejercicio:'r-tocar'},
    'r-dictado':    {nombre:'Dictado rítmico',                 leccion:'r-leer',        paso:4, ejercicio:'r-dictado'},
    'r-puntillo':   {nombre:'Puntillo y ligadura',             leccion:'r-puntillo',    paso:0, ejercicio:'r-puntillo'},
    'r-compuesto':  {nombre:'Compases compuestos',             leccion:'r-compuesto',   paso:0, ejercicio:'r-compuesto'},
    'r-especiales': {nombre:'Síncopa, tresillo y anacrusa',    leccion:'r-especiales',  paso:0, ejercicio:'r-especial'}
  };

  // ---------- Diagnósticos de error ----------
  P.DIAGNOSTICOS = {
    'numero':        {hab:'int-numero',   msg:'Parece que el número del intervalo te está saliendo corrido. Repasemos cómo se cuentan las letras, incluyendo la primera y la última.'},
    'numero-semis':  {hab:'int-numero',   msg:'Parece que estás confundiendo el número del intervalo con su calidad: el número sale de contar letras, no semitonos. Repasemos primero cómo determinar el número.'},
    'calidad':       {hab:'int-calidad',  msg:'El número te sale bien, pero la calidad no. Repasemos cuántos semitonos tiene cada intervalo mayor, menor y justo.'},
    'familia':       {hab:'int-calidad',  msg:'Estás usando “justa” con intervalos que son mayores o menores (o al revés). Repasemos qué intervalos pueden ser justos.'},
    'aum-dis':       {hab:'int-aum-dis',  msg:'Los aumentados y disminuidos te están costando. Repasemos cómo se forman a partir de los justos y los mayores o menores.'},
    'armadura':      {hab:'arm-leer',     msg:'Te estás olvidando de aplicar la armadura: las notas que figuran en ella se alteran aunque no tengan nada escrito al lado. Repasemos cómo se lee.'},
    'accidental':    {hab:'accidentales', msg:'Las alteraciones escritas junto a la nota te están confundiendo. Repasemos cómo una alteración accidental cambia (o anula) la armadura.'},
    'enarmonia':     {hab:'int-construir',msg:'Elegiste una nota que suena bien pero con otro nombre. En un intervalo el nombre importa: primero la letra (el número) y después la alteración (la calidad).'},
    'lectura-sol':   {hab:'pent-sol',     msg:'En clave de Sol estás confundiendo una línea con el espacio de al lado. Repasemos cómo ubicar las notas a partir del Sol que marca la clave.'},
    'lectura-fa':    {hab:'pent-fa',      msg:'En clave de Fa estás confundiendo una línea con el espacio de al lado. Repasemos cómo ubicar las notas a partir del Fa que marca la clave.'},
    'tonalidad':     {hab:'arm-tonalidad',msg:'Te cuesta reconocer la tonalidad a partir de la armadura. Repasemos los trucos del último sostenido y del penúltimo bemol.'},
    'relativa':      {hab:'arm-relativa', msg:'Las relativas menores te están costando. Recordá: la relativa menor está una tercera menor por debajo de la tónica mayor.'},
    'orden':         {hab:'arm-orden',    msg:'El orden de los sostenidos y bemoles todavía no está firme. Repasemos: Fa Do Sol Re La Mi Si, y al revés para los bemoles.'},
    'tonos':         {hab:'tonos',        msg:'Te cuesta distinguir tonos de semitonos. Repasemos: un semitono es la tecla de al lado, sea blanca o negra.'},
    'anglo':         {hab:'anglo',        msg:'Las letras de la notación anglosajona todavía se mezclan. Repasemos la equivalencia: La = A, Si = B, Do = C...'},
    'teclado':       {hab:'teclado',      msg:'Te cuesta ubicar las notas en el teclado. Repasemos cómo usar los grupos de dos y tres teclas negras como referencia.'},
    'alteraciones':  {hab:'alteraciones', msg:'Los sostenidos y bemoles te están confundiendo. Repasemos: el sostenido sube medio tono y el bemol baja medio tono.'},
    'nombres':       {hab:'nombres',      msg:'El orden de las notas todavía se mezcla. Repasemos la secuencia Do Re Mi Fa Sol La Si.'},
    'oido':          {hab:'oido',         msg:'El reconocimiento auditivo te está costando. Conviene escuchar varias veces cada intervalo y compararlo con los vecinos.'},
    'r-figura':      {hab:'r-figuras',    msg:'Las figuras todavía se confunden. Mirá tres cosas, en este orden: si la cabeza es hueca o rellena, si tiene plica y cuántos corchetes tiene.'},
    'r-valor':       {hab:'r-valores',    msg:'Las duraciones de las figuras todavía no están firmes. Repasemos la regla: cada figura dura la mitad que la anterior (redonda 4, blanca 2, negra 1, corchea ½, semicorchea ¼).'},
    'r-silencio':    {hab:'r-silencios',  msg:'Los silencios se están mezclando. Repasemos: el de redonda cuelga, el de blanca se apoya, el de negra es un zigzag y el de corchea tiene un gancho.'},
    'r-compas':      {hab:'r-compas',     msg:'La cifra indicadora te está costando. El número de arriba dice cuántos tiempos tiene el compás; el de abajo, qué figura vale un tiempo (4 = negra).'},
    'r-completar':   {hab:'r-completar',  msg:'Al completar compases, la suma no te está dando. Sumá el valor de cada figura escrita y restalo del total del compás.'},
    'r-puntillo':    {hab:'r-puntillo',   msg:'El puntillo y la ligadura te están costando. El puntillo suma la mitad del valor de la figura (no un tiempo entero); la ligadura suma las dos duraciones.'},
    'r-compuesto':   {hab:'r-compuesto',  msg:'Los compases compuestos todavía confunden. En 6/8, 9/8 y 12/8 el pulso es la negra con puntillo y se divide en tres corcheas: 6/8 tiene 2 pulsos, no 6.'},
    'r-tempo':       {hab:'r-tempo',      msg:'Los términos de tempo se mezclan. Ordenalos de lento a rápido: Largo, Adagio, Andante, Moderato, Allegro, Presto.'},
    'r-especial':    {hab:'r-especiales', msg:'Síncopa, contratiempo, tresillo y anacrusa todavía se confunden. La clave: la síncopa se prolonga sobre la parte fuerte; el contratiempo viene después de un silencio y no se prolonga.'},
    'r-dictado':     {hab:'r-dictado',    msg:'El dictado rítmico te está costando. Contá el pulso en voz baja mientras escuchás y fijate en qué tiempos hay más de un sonido.'},
    'r-tocar':       {hab:'r-tocar',      msg:'Al tocar ritmos, algunas notas no caen en su lugar. Contá en voz alta mientras tocás y, si hace falta, bajá el tempo.'},
    'r-tocar-silencio': {hab:'r-silencios', msg:'Estás tocando donde hay silencios. El silencio se cuenta pero no se toca: decí el número en voz baja y no marques.'},
    'r-tocar-largas':   {hab:'r-puntillo',  msg:'Estás tocando de más en las notas largas o ligadas. Una nota larga (o dos ligadas) se toca una sola vez y se mantiene mientras contás.'}
  };

  // ---------- Beta ----------
  function randn(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  function randGamma(k){
    if (k < 1) return randGamma(k + 1)*Math.pow(Math.random(), 1/k);
    const d = k - 1/3, c = 1/Math.sqrt(9*d);
    for (;;){ let x, v; do { x = randn(); v = 1 + c*x; } while (v <= 0); v = v*v*v; const u = Math.random();
      if (u < 1 - 0.0331*x*x*x*x || Math.log(u) < 0.5*x*x + d*(1 - v + Math.log(v))) return d*v; }
  }
  P.randBeta = (a, b) => { const x = randGamma(a), y = randGamma(b); return x/(x + y); };

  let beta = leer('teoria-habilidades', {});
  P.beta = id => beta[id] || [1, 1];
  P.registrar = (id, ok, peso = 1) => {
    if (!id) return;
    let [a, b] = P.beta(id);
    if (ok) a += peso; else b += peso;
    const n = a + b - 2, MAX = 20;
    if (n > MAX){ a = 1 + (a - 1)*MAX/n; b = 1 + (b - 1)*MAX/n; }
    beta[id] = [+a.toFixed(3), +b.toFixed(3)];
    guardar('teoria-habilidades', beta);
  };
  P.dominio = id => {
    const [a, b] = P.beta(id), xs = [];
    for (let i = 0; i < 300; i++) xs.push(P.randBeta(a, b));
    xs.sort((x, y) => x - y);
    return {media: a/(a + b), lo: xs[15], hi: xs[284], n: Math.round(a + b - 2)};
  };
  // Muestreo de Thompson: la habilidad con el valor sorteado más bajo es la que más conviene practicar
  P.elegirHabilidad = ids => {
    let mejor = null, min = 2;
    ids.forEach(id => { const [a, b] = P.beta(id); const p = P.randBeta(a, b); if (p < min){ min = p; mejor = id; } });
    return mejor;
  };

  // ---------- Errores recientes y recomendaciones ----------
  let errores = leer('teoria-errores', []);
  P.anotarResultado = (diag, ok) => {
    errores.push({d: ok ? null : diag, t: Date.now()});
    errores = errores.slice(-12);
    guardar('teoria-errores', errores);
  };
  let descartada = null;
  // Si un mismo tipo de error aparece 2 veces en las últimas 6 respuestas, se recomienda repasar
  P.recomendacion = () => {
    const recientes = errores.slice(-6).filter(e => e.d);
    const cuenta = {};
    recientes.forEach(e => cuenta[e.d] = (cuenta[e.d] || 0) + 1);
    const top = Object.entries(cuenta).sort((x, y) => y[1] - x[1])[0];
    if (!top || top[1] < 2 || top[0] === descartada) return null;
    const d = P.DIAGNOSTICOS[top[0]];
    return d ? Object.assign({id: top[0], veces: top[1]}, d) : null;
  };
  P.descartar = id => { descartada = id; };
  P.limpiarErrores = diag => { errores = errores.map(e => e.d === diag ? {d: null, t: e.t} : e); guardar('teoria-errores', errores); descartada = null; };

  // ---------- Lecciones ----------
  let lecciones = leer('teoria-lecciones', {});
  P.leccionHecha = id => !!(lecciones[id] && lecciones[id].hecha);
  P.marcarLeccion = id => { lecciones[id] = {hecha: true, t: Date.now()}; guardar('teoria-lecciones', lecciones); };

  // ---------- Evaluaciones ----------
  P.evaluaciones = () => leer('teoria-evaluaciones', []);
  P.guardarEvaluacion = ev => { const l = P.evaluaciones(); l.push(ev); guardar('teoria-evaluaciones', l.slice(-20)); };

  // ---------- Configuración ----------
  P.config = Object.assign({nombres: 'ambos'}, leer('teoria-config', {}));
  P.guardarConfig = () => guardar('teoria-config', P.config);

  P.reiniciar = () => {
    beta = {}; errores = []; lecciones = {};
    ['teoria-habilidades','teoria-errores','teoria-lecciones','teoria-evaluaciones','ritmo-puntaje'].forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
  };

  window.Progreso = P;
})();
