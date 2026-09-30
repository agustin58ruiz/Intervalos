// Glosario de ritmo: definiciones con ejemplos. En las lecciones, G.t('negra') devuelve
// el término como botón: al tocarlo se abre la definición (ver app.js).
(function(){
  const G = {};
  G.CATEGORIAS = [
    ['pulso',    'Pulso y tempo'],
    ['figuras',  'Figuras y silencios'],
    ['compas',   'Compás'],
    ['duracion', 'Puntillo y ligadura'],
    ['grupos',   'Tresillos, síncopa y anacrusa']
  ];
  // ej: {compas, ritmo, anacrusa, cifra} se dibuja y se puede escuchar
  G.TERMINOS = [
    // ---------- Pulso y tempo ----------
    {id: 'ritmo', t: 'Ritmo', cat: 'pulso', ver: ['pulso', 'figura'],
      def: 'Organización de los sonidos y los silencios en el tiempo: cuándo empieza cada sonido y cuánto dura. Se escribe con figuras y silencios, medidos a partir del pulso.',
      ej: {compas: '4/4', ritmo: 'q 8 8 q. 8'}},
    {id: 'pulso', t: 'Pulso', alias: ['tiempo', 'beat'], cat: 'pulso', ver: ['tempo', 'compas', 'subdivision'],
      def: 'Latido regular y constante que sirve de referencia para medir la música. Es lo que marcás con el pie mientras escuchás una canción. No siempre suena, pero siempre está.',
      ej: {compas: '4/4', ritmo: 'q q q q'}},
    {id: 'tiempo', t: 'Tiempo', cat: 'pulso', ver: ['pulso', 'tempo', 'tiempo-fuerte'],
      def: 'Cada uno de los pulsos de un compás: primer tiempo, segundo tiempo… Un compás de 3/4 tiene tres tiempos. No hay que confundirlo con el tempo, que es la velocidad.'},
    {id: 'tempo', t: 'Tempo', alias: ['velocidad'], cat: 'pulso', ver: ['bpm', 'metronomo', 'allegro'],
      def: 'Velocidad del pulso. Se indica con un número de BPM (por ejemplo ♩ = 90) o con un término, casi siempre en italiano: Largo, Adagio, Andante, Moderato, Allegro, Presto.'},
    {id: 'bpm', t: 'BPM', alias: ['pulsaciones por minuto', 'indicación metronómica'], cat: 'pulso', ver: ['tempo', 'metronomo'],
      def: 'Pulsaciones por minuto. ♩ = 60 significa 60 negras por minuto: una por segundo. ♩ = 120 es el doble de rápido.'},
    {id: 'metronomo', t: 'Metrónomo', cat: 'pulso', ver: ['bpm', 'pulso'],
      def: 'Aparato que marca el pulso con un clic regular a la velocidad elegida. Sirve para practicar sin apurarse ni atrasarse. Muchos acentúan el primer tiempo del compás.'},
    {id: 'acento', t: 'Acento', cat: 'pulso', ver: ['tiempo-fuerte', 'compas', 'sincopa'],
      def: 'Mayor intensidad o importancia de un sonido respecto de los que lo rodean. En cada compás, el primer tiempo es el más acentuado; esa repetición de acentos es la que hace sentir el compás.'},
    {id: 'tiempo-fuerte', t: 'Tiempo fuerte', alias: ['parte fuerte'], cat: 'pulso', ver: ['tiempo-debil', 'acento'],
      def: 'Tiempo acentuado del compás. El primero siempre es fuerte; en 4/4 el tercero es semifuerte. Dentro de cada tiempo, la primera mitad es la parte fuerte.'},
    {id: 'tiempo-debil', t: 'Tiempo débil', alias: ['parte débil'], cat: 'pulso', ver: ['tiempo-fuerte', 'contratiempo', 'sincopa'],
      def: 'Tiempo sin acento (el 2 en 2/4; el 2 y el 3 en 3/4; el 2 y el 4 en 4/4). Dentro de cada tiempo, la segunda mitad —la que se cuenta «y»— es la parte débil.'},
    {id: 'subdivision', t: 'Subdivisión', cat: 'pulso', ver: ['compas-simple', 'compas-compuesto'],
      def: 'División de cada pulso en partes iguales más chicas. En los compases simples el pulso se divide en dos («1 y 2 y»); en los compuestos, en tres («1 y a 2 y a»).',
      ej: {compas: '2/4', ritmo: '8 8 8 8'}},
    {id: 'largo', t: 'Largo', cat: 'pulso', ver: ['tempo', 'adagio'], def: 'Indicación de tempo: muy lento y amplio (aproximadamente 40 a 60 BPM).'},
    {id: 'adagio', t: 'Adagio', cat: 'pulso', ver: ['tempo', 'andante'], def: 'Indicación de tempo: lento y tranquilo (aproximadamente 60 a 76 BPM).'},
    {id: 'andante', t: 'Andante', cat: 'pulso', ver: ['tempo', 'moderato'], def: 'Indicación de tempo: «caminando», a paso tranquilo (aproximadamente 76 a 108 BPM).'},
    {id: 'moderato', t: 'Moderato', cat: 'pulso', ver: ['tempo', 'allegro'], def: 'Indicación de tempo: moderado, ni lento ni rápido (aproximadamente 108 a 120 BPM).'},
    {id: 'allegro', t: 'Allegro', cat: 'pulso', ver: ['tempo', 'presto'], def: 'Indicación de tempo: rápido y alegre (aproximadamente 120 a 156 BPM).'},
    {id: 'presto', t: 'Presto', cat: 'pulso', ver: ['tempo', 'allegro'], def: 'Indicación de tempo: muy rápido (aproximadamente 168 a 200 BPM).'},
    {id: 'ritardando', t: 'Ritardando (rit.)', alias: ['rallentando', 'rall.'], cat: 'pulso', ver: ['accelerando', 'a-tempo'],
      def: 'Ir haciendo el tempo más lento de a poco. Se abrevia rit. o rall. (rallentando).'},
    {id: 'accelerando', t: 'Accelerando (accel.)', cat: 'pulso', ver: ['ritardando', 'a-tempo'], def: 'Ir acelerando el tempo de a poco.'},
    {id: 'a-tempo', t: 'A tempo', cat: 'pulso', ver: ['ritardando', 'accelerando'], def: 'Volver al tempo original después de un ritardando, un accelerando o un calderón.'},

    // ---------- Figuras y silencios ----------
    {id: 'figura', t: 'Figura', alias: ['figura rítmica', 'nota'], cat: 'figuras', ver: ['valor', 'cabeza', 'silencio'],
      def: 'Signo que representa la duración de un sonido en relación con las demás. Las más usadas son la redonda, la blanca, la negra, la corchea y la semicorchea; cada una dura la mitad que la anterior.',
      ej: {compas: '4/4', ritmo: 'w h q 8 16', libre: true}},
    {id: 'valor', t: 'Valor', alias: ['duración'], cat: 'figuras', ver: ['figura', 'puntillo'],
      def: 'Duración de una figura en relación con las demás: una redonda vale 2 blancas, 4 negras, 8 corcheas o 16 semicorcheas. Cuántos tiempos dura depende del compás; en los compases de denominador 4, la negra vale un tiempo.'},
    {id: 'cabeza', t: 'Cabeza', cat: 'figuras', ver: ['plica', 'corchete'],
      def: 'Parte ovalada de la figura. Es hueca en la redonda y la blanca, y rellena en la negra, la corchea y la semicorchea. En un pentagrama, su posición indica la altura.'},
    {id: 'plica', t: 'Plica', cat: 'figuras', ver: ['cabeza', 'corchete'],
      def: 'Línea vertical unida a la cabeza. La tienen todas las figuras salvo la redonda. Va hacia arriba a la derecha de la cabeza, o hacia abajo a la izquierda.'},
    {id: 'corchete', t: 'Corchete', alias: ['bandera', 'gancho'], cat: 'figuras', ver: ['barra-union', 'corchea'],
      def: 'Gancho al final de la plica. La corchea tiene uno y la semicorchea dos: cada corchete divide la duración a la mitad.'},
    {id: 'barra-union', t: 'Barra de unión', alias: ['barra', 'viga'], cat: 'figuras', ver: ['corchete'],
      def: 'Línea gruesa que reemplaza a los corchetes cuando hay varias corcheas o semicorcheas seguidas. Se agrupan por pulso para que se vea dónde empieza cada tiempo.',
      ej: {compas: '2/4', ritmo: '8 8 16 16 16 16'}},
    {id: 'redonda', t: 'Redonda', cat: 'figuras', ver: ['blanca', 'silencio-redonda'],
      def: 'Cabeza hueca sin plica. Es la figura más larga de uso común: vale 4 tiempos en compases de denominador 4 y equivale a 2 blancas.',
      ej: {compas: '4/4', ritmo: 'w'}},
    {id: 'blanca', t: 'Blanca', cat: 'figuras', ver: ['redonda', 'negra', 'silencio-blanca'],
      def: 'Cabeza hueca con plica. Vale la mitad de una redonda: 2 tiempos en compases de denominador 4. Equivale a 2 negras.',
      ej: {compas: '4/4', ritmo: 'h h'}},
    {id: 'negra', t: 'Negra', cat: 'figuras', ver: ['blanca', 'corchea', 'silencio-negra'],
      def: 'Cabeza rellena con plica. Vale la mitad de una blanca: 1 tiempo en compases de denominador 4. Equivale a 2 corcheas.',
      ej: {compas: '4/4', ritmo: 'q q q q'}},
    {id: 'corchea', t: 'Corchea', cat: 'figuras', ver: ['negra', 'semicorchea', 'silencio-corchea'],
      def: 'Cabeza rellena, plica y un corchete. Vale la mitad de una negra: ½ tiempo en compases de denominador 4. Dos o más seguidas se unen con una barra.',
      ej: {compas: '2/4', ritmo: '8 8 8 8'}},
    {id: 'semicorchea', t: 'Semicorchea', cat: 'figuras', ver: ['corchea', 'silencio-semicorchea'],
      def: 'Cabeza rellena, plica y dos corchetes. Vale la mitad de una corchea: ¼ de tiempo en compases de denominador 4. Cuatro semicorcheas ocupan una negra.',
      ej: {compas: '2/4', ritmo: '16 16 16 16 16 16 16 16'}},
    {id: 'fusa', t: 'Fusa y semifusa', cat: 'figuras', ver: ['semicorchea'],
      def: 'Figuras con tres y cuatro corchetes. La fusa vale la mitad de una semicorchea y la semifusa, la mitad de una fusa. Aparecen en pasajes muy rápidos.'},
    {id: 'silencio', t: 'Silencio', alias: ['pausa'], cat: 'figuras', ver: ['figura', 'silencio-negra'],
      def: 'Signo que indica un momento sin sonido. Cada figura tiene su silencio, que dura exactamente lo mismo. El silencio también se cuenta: el pulso sigue aunque no suene nada.',
      ej: {compas: '4/4', ritmo: 'q qr q qr'}},
    {id: 'silencio-redonda', t: 'Silencio de redonda', cat: 'figuras', ver: ['redonda', 'silencio-blanca'],
      def: 'Rectángulo que cuelga debajo de una línea. Dura lo mismo que una redonda; además, se usa para indicar un compás entero en silencio en cualquier compás.',
      ej: {compas: '4/4', ritmo: 'wr'}},
    {id: 'silencio-blanca', t: 'Silencio de blanca', cat: 'figuras', ver: ['blanca', 'silencio-redonda'],
      def: 'Rectángulo apoyado sobre una línea. Dura lo mismo que una blanca. Para no confundirlo con el de redonda: la redonda «pesa» más, por eso su silencio cuelga.',
      ej: {compas: '4/4', ritmo: 'hr h'}},
    {id: 'silencio-negra', t: 'Silencio de negra', cat: 'figuras', ver: ['negra', 'silencio'],
      def: 'Signo en forma de zigzag vertical. Dura lo mismo que una negra: 1 tiempo en compases de denominador 4.',
      ej: {compas: '4/4', ritmo: 'q qr qr q'}},
    {id: 'silencio-corchea', t: 'Silencio de corchea', cat: 'figuras', ver: ['corchea', 'contratiempo'],
      def: 'Signo parecido a un 7 con un punto en la punta. Dura lo mismo que una corchea.',
      ej: {compas: '2/4', ritmo: '8r 8 8r 8'}},
    {id: 'silencio-semicorchea', t: 'Silencio de semicorchea', cat: 'figuras', ver: ['semicorchea'],
      def: 'Como el de corchea, pero con dos ganchos. Dura lo mismo que una semicorchea.',
      ej: {compas: '2/4', ritmo: '16r 16 16 16 16r 16 8'}},

    // ---------- Compás ----------
    {id: 'compas', t: 'Compás', cat: 'compas', ver: ['cifra', 'barra-compas', 'acento'],
      def: 'Grupo de pulsos que se repite a lo largo de la obra, con el primero acentuado. En la partitura, cada compás queda entre dos barras de compás. También se llama compás a la indicación que dice cómo son esos grupos (2/4, 3/4…).',
      ej: {compas: '3/4', ritmo: 'q q q | h q | h.'}},
    {id: 'barra-compas', t: 'Barra de compás', alias: ['barra divisoria', 'línea divisoria'], cat: 'compas', ver: ['compas', 'doble-barra'],
      def: 'Línea vertical que separa un compás del siguiente. Una figura no puede cruzarla: si un sonido sigue en el compás siguiente, se escribe con una ligadura.'},
    {id: 'doble-barra', t: 'Doble barra', cat: 'compas', ver: ['barra-final'],
      def: 'Dos líneas finas: marcan el final de una sección o un cambio de compás, de armadura o de tempo.'},
    {id: 'barra-final', t: 'Barra final', cat: 'compas', ver: ['doble-barra'],
      def: 'Una línea fina y otra gruesa: marcan el final de la obra.'},
    {id: 'cifra', t: 'Cifra indicadora', alias: ['indicación de compás', 'numerador', 'denominador'], cat: 'compas', ver: ['compas', 'unidad-tiempo'],
      def: 'Los dos números del principio del pentagrama. El de arriba (numerador) dice cuántos tiempos tiene el compás; el de abajo (denominador), qué figura vale un tiempo: 2 = blanca, 4 = negra, 8 = corchea. En los compases compuestos se lee distinto (ver compás compuesto).'},
    {id: 'compas-simple', t: 'Compás simple', cat: 'compas', ver: ['compas-compuesto', 'subdivision'],
      def: 'Compás cuyo pulso se divide en dos partes iguales. La unidad de tiempo es una figura sin puntillo. Ejemplos: 2/4, 3/4, 4/4 y 2/2.',
      ej: {compas: '3/4', ritmo: '8 8 8 8 8 8'}},
    {id: 'compas-compuesto', t: 'Compás compuesto', cat: 'compas', ver: ['compas-simple', 'unidad-tiempo'],
      def: 'Compás cuyo pulso se divide en tres partes iguales. La unidad de tiempo es una figura con puntillo: en 6/8, 9/8 y 12/8 es la negra con puntillo. El numerador dividido 3 da la cantidad de pulsos (6/8 tiene 2).',
      ej: {compas: '6/8', ritmo: '8 8 8 8 8 8'}},
    {id: 'binario', t: 'Binario, ternario y cuaternario', alias: ['binario', 'ternario', 'cuaternario'], cat: 'compas', ver: ['compas', 'acento'],
      def: 'Compás de 2, 3 o 4 pulsos. Binario: fuerte–débil (2/4, 6/8). Ternario: fuerte–débil–débil (3/4, 9/8). Cuaternario: fuerte–débil–semifuerte–débil (4/4, 12/8).'},
    {id: 'compasillo', t: 'Compasillo (C)', cat: 'compas', ver: ['alla-breve', 'cifra'],
      def: 'Otra forma de escribir el 4/4: una letra C al principio del pentagrama, en lugar de los números.'},
    {id: 'alla-breve', t: 'Alla breve (2/2)', alias: ['compás partido', 'C barrada'], cat: 'compas', ver: ['compasillo'],
      def: 'Compás de 2 tiempos en el que la blanca vale un tiempo. Se escribe 2/2 o con una C atravesada por una línea vertical. Se usa en marchas y música rápida.'},
    {id: 'unidad-tiempo', t: 'Unidad de tiempo', cat: 'compas', ver: ['unidad-compas', 'cifra'],
      def: 'Figura que dura exactamente un tiempo en un compás: la negra en 2/4, 3/4 y 4/4; la blanca en 2/2; la negra con puntillo en 6/8, 9/8 y 12/8.'},
    {id: 'unidad-compas', t: 'Unidad de compás', cat: 'compas', ver: ['unidad-tiempo'],
      def: 'Figura (con o sin puntillo) que llena un compás entero: la redonda en 4/4, la blanca con puntillo en 3/4 y en 6/8, la blanca en 2/4.'},

    // ---------- Puntillo y ligadura ----------
    {id: 'puntillo', t: 'Puntillo', cat: 'duracion', ver: ['doble-puntillo', 'ligadura'],
      def: 'Punto a la derecha de una figura o de un silencio: le suma la mitad de su valor. Blanca con puntillo = 2 + 1 = 3 tiempos; negra con puntillo = 1 + ½ = 1½; corchea con puntillo = ½ + ¼ = ¾.',
      ej: {compas: '3/4', ritmo: 'h. | q. 8 q'}},
    {id: 'doble-puntillo', t: 'Doble puntillo', cat: 'duracion', ver: ['puntillo'],
      def: 'Dos puntos: el primero suma la mitad del valor de la figura, y el segundo, la mitad de lo que sumó el primero. Negra con doble puntillo = 1 + ½ + ¼ = 1¾ tiempos.'},
    {id: 'ligadura', t: 'Ligadura de prolongación', alias: ['ligadura de unión', 'ligadura'], cat: 'duracion', ver: ['puntillo', 'ligadura-expresion', 'barra-compas'],
      def: 'Línea curva que une dos notas de la misma altura: se toca solo la primera y el sonido se mantiene durante la suma de las dos. Permite que un sonido cruce la barra de compás o dure algo que ninguna figura sola puede escribir.',
      ej: {compas: '4/4', ritmo: 'q q q q~ | q q h'}},
    {id: 'ligadura-expresion', t: 'Ligadura de expresión', alias: ['legato', 'ligadura de fraseo'], cat: 'duracion', ver: ['ligadura'],
      def: 'Línea curva sobre notas de distinta altura: indica tocarlas unidas, sin cortar el sonido entre una y otra (legato). No suma duraciones: cada nota se toca.'},
    {id: 'calderon', t: 'Calderón', alias: ['fermata'], cat: 'duracion', ver: ['a-tempo'],
      def: 'Signo (𝄐) sobre una nota o un silencio: indica sostenerlo más de lo que vale, a criterio de quien toca o dirige. Después se retoma el pulso.'},

    // ---------- Tresillos, síncopa y anacrusa ----------
    {id: 'tresillo', t: 'Tresillo', cat: 'grupos', ver: ['grupo-irregular', 'dosillo'],
      def: 'Grupo de tres figuras iguales que se tocan en el tiempo de dos de la misma clase. Se marca con un 3. Tres corcheas de tresillo ocupan una negra: el pulso se divide en tres en lugar de en dos.',
      ej: {compas: '2/4', ritmo: '3(8 8 8) 8 8'}},
    {id: 'dosillo', t: 'Dosillo', cat: 'grupos', ver: ['tresillo', 'compas-compuesto'],
      def: 'Grupo de dos figuras que se tocan en el tiempo de tres. Es lo contrario del tresillo: aparece en compases compuestos, donde lo normal es dividir el pulso en tres.'},
    {id: 'grupo-irregular', t: 'Grupo irregular', alias: ['grupo de valoración especial'], cat: 'grupos', ver: ['tresillo', 'dosillo'],
      def: 'Grupo de figuras que divide el pulso de una manera distinta a la que indica el compás, como el tresillo o el dosillo. Lleva encima un número que dice cuántas figuras son.'},
    {id: 'sincopa', t: 'Síncopa', cat: 'grupos', ver: ['contratiempo', 'acento', 'ligadura'],
      def: 'Sonido que empieza en una parte débil y se prolonga sobre la parte fuerte que sigue. El acento se desplaza del lugar esperado y se siente un «empuje». Puede escribirse con una figura larga en el medio (corchea–negra–corchea) o con una ligadura.',
      ej: {compas: '2/4', ritmo: '8 q 8 | 8 8~ 8 8'}},
    {id: 'contratiempo', t: 'Contratiempo', cat: 'grupos', ver: ['sincopa', 'silencio-corchea'],
      def: 'Sonido que aparece en una parte débil después de un silencio en la parte fuerte, y que no se prolonga sobre la parte fuerte siguiente. Es típico del off-beat del reggae y del ska.',
      ej: {compas: '2/4', ritmo: '8r 8 8r 8'}},
    {id: 'anacrusa', t: 'Anacrusa', alias: ['levare', 'compás incompleto'], cat: 'grupos', ver: ['compas', 'tiempo-fuerte'],
      def: 'Una o más notas que están antes del primer tiempo fuerte de la obra: forman un compás incompleto al principio. Muchas canciones empiezan así («Cum-ple» en «Cumpleaños feliz»). Casi siempre el último compás tiene los tiempos que le faltaron al primero.',
      ej: {compas: '3/4', ritmo: '8. 16 | q q q | h.', anacrusa: 12}}
  ];
  G.porId = {};
  G.TERMINOS.forEach(x => G.porId[x.id] = x);
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Búsqueda sin tildes en el término, sus alias y la definición (primero los que coinciden en el nombre)
  G.buscar = (q, cat) => {
    const n = norm(q.trim());
    const lista = G.TERMINOS.filter(x => !cat || x.cat === cat);
    if (!n) return lista;
    const enNombre = x => [x.t, ...(x.alias || [])].some(a => norm(a).includes(n));
    return [...lista.filter(enNombre), ...lista.filter(x => !enNombre(x) && norm(x.def).includes(n))];
  };
  // Término como botón para las lecciones: G.t('negra') o G.t('negra', 'negras')
  G.t = (id, texto) => `<button type="button" class="gl-t" data-g="${id}">${texto || G.porId[id].t.toLowerCase()}</button>`;

  window.Glosario = G;
})();
