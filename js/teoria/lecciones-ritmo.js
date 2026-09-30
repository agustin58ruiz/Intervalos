// Unidad de ritmo: pulso y tempo, figuras, silencios, compás, contar y tocar, puntillo y
// ligadura, compases compuestos, y tresillo, síncopa, contratiempo y anacrusa.
// Los términos marcados con G.t() abren su definición del glosario al tocarlos.
(function(){
  const V = window.Visual, R = window.Ritmo, G = window.Glosario, L = window.Lecciones;
  const {h, caja, botones, msg} = L.util;
  const g = G.t;
  const pr = (compas, txt, o) => R.patron(compas, txt, o);
  const LISTA_SIMPLE = ['2/4', '3/4', '4/4'];

  // Un ritmo dibujado con botones para escucharlo (se ilumina la figura que suena)
  // o: opciones de V.ritmo + {bpm, lento (agrega un botón más lento), alturas, metronomo, boton, alTocar}
  function ritmo(el, p, o = {}){
    const st = caja(el, 'lz-pg');
    const vista = V.ritmo(st, p, o);
    const bpm = o.bpm || 80;
    const tocar = b => { V.tocarRitmo(p, {bpm: b, metronomo: o.metronomo !== false, vista, alturas: o.alturas}); if (o.alTocar) o.alTocar(); };
    botones(el, [[o.boton || '▶ Escuchar', () => tocar(bpm)], ...(o.lento ? [['▶ Más lento', () => tocar(Math.round(bpm*0.7))]] : [])]);
    return vista;
  }
  // Notas más agudas al comienzo de cada pulso (y más aún en el primero del compás)
  const alturasPulso = p => R.ataques(p).map(a => { const x = R.posicion(p, a.t); return x.resto < 1e-6 ? (x.pulso === 1 ? 79 : 76) : 72; });
  const clics = bpm => V.tocarRitmo(pr('4/4', 'wr wr'), {bpm, cuenta: 0, metronomo: true, sinNotas: true, acento: false});

  // Marcar el pulso junto con el metrónomo y ver dónde cayó cada toque
  function marcarPulso(el, ctx){
    const p = pr('4/4', 'q q q q | q q q q');
    const tap = caja(el), res = caja(el, 'lt-box');
    res.hidden = true;
    const t = V.tapear(tap, p, {bpm: 72, alTerminar(r){
      const cmp = V.compararToques(R.ataques(p).map(a => a.t*r.spu), r.golpes, r.spp);
      res.hidden = false;
      V.lineaTiempo(res, {total: R.largo(p)*r.spu, esperados: cmp.esperados, golpes: cmp.golpes, pulsos: R.ataques(p).map(a => a.t*r.spu), barras: [48*r.spu]});
      const n = cmp.bien + cmp.cerca;
      msg(el, n >= 6 ? `¡Muy bien! ${n} de 8 toques a tiempo.` : `${n} de 8 toques a tiempo. Probá de nuevo: escuchá la cuenta y tocá junto con cada clic, sin adelantarte.`);
      if (n >= 5) ctx.listo();
      t.reiniciar();
    }});
  }

  // Armar compases eligiendo figuras
  function armarCompases(el, ctx){
    const metas = [['3/4', 'q'], ['4/4', 'h'], ['2/4', '8 8'], ['4/4', 'q 8 8']];
    const paleta = [['w', 'Redonda'], ['h', 'Blanca'], ['q', 'Negra'], ['8', 'Corchea'], ['hr', 'Silencio de blanca'], ['qr', 'Silencio de negra']];
    const st = caja(el, 'lz-pg');
    let m = 0, evs = [], hechos = 0;
    const c = () => R.compas(metas[m][0]);
    const suma = () => evs.reduce((s, e) => s + R.dur(e), 0);
    const tt = u => `${R.fmt(u/12)} ${u === 12 ? 'tiempo' : 'tiempos'}`;
    const dibujar = () => V.ritmo(st, {compas: c().id, ev: evs, anacrusa: 0}, {conteo: true});
    const estado = () => msg(el, `Compás de <b>${c().id}</b>: ${c().num} tiempos. Llevás ${tt(suma())}; faltan <b>${tt(c().largo - suma())}</b>.`);
    const nuevo = () => { evs = R.leer(metas[m][1]); dibujar(); estado(); };
    const agregar = txt => {
      const e = R.leer(txt)[0], s = suma();
      if (s >= c().largo) return;
      if (s + R.dur(e) > c().largo){ msg(el, `No entra: faltan ${tt(c().largo - s)} y la ${R.nombre(e)} dura ${tt(R.dur(e))}.`); return; }
      evs.push(e); dibujar();
      if (suma() === c().largo){
        hechos++;
        V.tocarRitmo({compas: c().id, ev: evs, anacrusa: 0}, {bpm: 84, metronomo: true});
        msg(el, `¡Compás completo! Suma ${evs.map(x => R.fmt(R.dur(x)/12)).join(' + ')} = ${c().num} tiempos. ${hechos >= 2 ? 'Podés seguir con la lección o armar otro.' : 'Armá otro con «Otro compás».'}`);
        if (hechos >= 2) ctx.listo();
      } else estado();
    };
    botones(el, paleta.map(([t, n]) => [n, () => agregar(t)]));
    botones(el, [['⌫ Borrar la última', () => { if (evs.length){ evs.pop(); dibujar(); estado(); } }], ['Otro compás ▸', () => { m = (m + 1) % metas.length; nuevo(); }]]);
    nuevo();
  }

  L.agregarUnidad('ritmo', 'Ritmo', 'Pulso, figuras, silencios, compases, puntillo, compases compuestos, síncopa y tresillos. Cada tema se escucha, se toca y se reconoce de oído.', [
    // ------------------------------------------------------------ Pulso
    {id: 'r-pulso', titulo: 'Pulso, tempo y acento', resumen: 'El latido regular de la música y su velocidad.', pasos: [
      {etapa: 'aprender', titulo: 'El pulso', texto: `<p>Cuando escuchás una canción y marcás con el pie sin pensarlo, estás siguiendo el ${g('pulso')}: un latido regular, siempre a la misma distancia, que sirve de regla para medir la música. A veces suena (un bombo, un clic) y a veces no, pero siempre está.</p><p>El ${g('ritmo')} es otra cosa: es el dibujo de sonidos largos, cortos y silencios que aparece <i>sobre</i> el pulso.</p><p>Encendé el ${g('metronomo')} y escuchá el pulso. Probá marcarlo con el pie o con la mano.</p>`,
        requiere: true, visual(el, ctx){
          let n = 0;
          V.metronomo(caja(el), {bpm: 80, acento: false, sinTempo: true, alPulso: () => { if (++n === 4) ctx.listo(); }});
        }},
      {etapa: 'guiado', titulo: 'Marcá el pulso', texto: '<p>Ahora marcá vos: tocá la <kbd>barra espaciadora</kbd> (o el recuadro) <b>justo</b> con cada clic, ocho veces. Primero suenan cuatro clics de cuenta para que agarres la velocidad.</p><p>No hace falta que salga perfecto: después vas a ver dónde cayó cada toque.</p>',
        requiere: true, visual: marcarPulso},
      {etapa: 'aprender', titulo: 'El tempo', texto: `<p>El ${g('tempo')} es la <b>velocidad</b> del pulso. Se mide en ${g('bpm', 'BPM')}: pulsaciones por minuto. Con ♩ = 60 hay un pulso por segundo; con ♩ = 120, dos por segundo.</p><p>En las partituras el tempo también se indica con palabras, casi siempre en italiano. Tocá cada fila para escuchar su velocidad típica:</p>`,
        requiere: true, visual(el, ctx){
          const oidas = new Set();
          const tb = h('table', 'lz-tabla', `<tr><th>Indicación</th><th>Carácter</th><th>BPM aprox.</th></tr>`);
          R.TEMPOS.forEach(t => {
            const tr = h('tr', null, `<td>${g(t.id, t.nombre)}</td><td>${t.desc}</td><td>${t.desde}–${t.hasta}</td>`);
            tr.setAttribute('role', 'button'); tr.tabIndex = 0;
            const oir = e => { if (e.target.closest('.gl-t')) return; clics(t.tipico); oidas.add(t.id); msg(el, `${t.nombre}: ♩ = ${t.tipico}. ${oidas.size < 3 ? `Escuchá ${3 - oidas.size} más.` : ''}`); if (oidas.size >= 3) ctx.listo(); };
            tr.addEventListener('click', oir);
            tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); oir(e); } });
            tb.appendChild(tr);
          });
          el.appendChild(tb);
          el.appendChild(h('p', 'lz-nota', `Los rangos son orientativos. También hay indicaciones de cambio: ${g('ritardando', 'ritardando')} (ir más lento), ${g('accelerando', 'accelerando')} (ir más rápido) y ${g('a-tempo', 'a tempo')} (volver al tempo anterior).`));
          el.appendChild(h('p', 'lz-nota', 'Probá cualquier tempo con el metrónomo:'));
          V.metronomo(caja(el), {bpm: 100, acento: false});
        }},
      {etapa: 'aprender', titulo: 'Pulsos fuertes y débiles', texto: `<p>Los pulsos no se sienten todos igual: algunos llevan ${g('acento')}. Casi toda la música agrupa los pulsos de a <b>dos</b>, de a <b>tres</b> o de a <b>cuatro</b>, y el primero de cada grupo es el ${g('tiempo-fuerte')}; los demás son ${g('tiempo-debil', 'tiempos débiles')}.</p><ul><li>De a 2: <b>fuer</b>te – débil (una marcha).</li><li>De a 3: <b>fuer</b>te – débil – débil (un vals).</li><li>De a 4: <b>fuer</b>te – débil – semifuerte – débil (la mayoría de las canciones).</li></ul><p>Escuchá los tres agrupamientos: el clic agudo es el tiempo fuerte. Estos grupos se llaman ${g('compas', 'compases')}; los vas a ver en detalle más adelante.</p>`,
        requiere: true, visual(el, ctx){
          const met = V.metronomo(caja(el), {bpm: 96, compas: '2/4'});
          const vistos = new Set();
          botones(el, [['2', '2/4', 'De a 2 (marcha)'], ['3', '3/4', 'De a 3 (vals)'], ['4', '4/4', 'De a 4']].map(([n, c, t]) => [t, () => {
            met.compas(c); if (!met.activo) met.iniciar();
            vistos.add(n); msg(el, `Contá en voz alta: ${R.acentos(R.compas(c)).map((a, i) => a === 2 ? `<b>${i + 1}</b>` : i + 1).join(' ')}…`);
            if (vistos.size >= 2) ctx.listo();
          }]));
        }},
      {etapa: 'solo', titulo: 'Practicá', ejercicio: {tipo: 'r-tempo', cantidad: 4}}
    ]},

    // ------------------------------------------------------------ Figuras
    {id: 'r-figuras', titulo: 'Las figuras y sus valores', resumen: 'Redonda, blanca, negra, corchea y semicorchea.', pasos: [
      {etapa: 'aprender', titulo: 'Las figuras', texto: `<p>Para escribir cuánto dura cada sonido se usan ${g('figura', 'figuras')}. No indican segundos sino <b>duraciones relativas</b>: cuánto dura una comparada con otra, medidas en pulsos.</p><p>Una figura tiene hasta tres partes: la ${g('cabeza')} (hueca o rellena), la ${g('plica')} (el palito) y los ${g('corchete', 'corchetes')}.</p><ul><li>${g('redonda', 'Redonda')}: cabeza hueca, sin plica.</li><li>${g('blanca', 'Blanca')}: cabeza hueca con plica.</li><li>${g('negra', 'Negra')}: cabeza rellena con plica.</li><li>${g('corchea', 'Corchea')}: como la negra, con un corchete.</li><li>${g('semicorchea', 'Semicorchea')}: con dos corchetes.</li></ul>`,
        visual(el){ V.ritmo(caja(el, 'lz-pg'), pr('4/4', 'w h q 8 16'), {libre: true, textos: ['redonda', 'blanca', 'negra', 'corchea', 'semicorchea']}); }},
      {etapa: 'aprender', titulo: 'Cada figura dura la mitad que la anterior', texto: `<p>La regla es simple: <b>cada figura dura la mitad que la anterior</b>. Una redonda dura lo mismo que dos blancas; una blanca, lo mismo que dos negras; y así.</p><p>En los compases más comunes (los que tienen un 4 abajo, como 4/4) la negra vale <b>un tiempo</b>:</p><table class="eq"><tr><td>redonda</td><td>blanca</td><td>negra</td><td>corchea</td><td>semicorchea</td></tr><tr><td>4</td><td>2</td><td>1</td><td>½</td><td>¼</td></tr></table><p>Escuchá cada fila de este «árbol de figuras» junto con el metrónomo: todas las filas duran lo mismo, un compás de 4/4.</p>`,
        requiere: true, visual(el, ctx){
          const oidas = new Set();
          R.FIGURAS.forEach(f => {
            const p = pr('4/4', Array(48/f.u).fill(f.id).join(' '));
            const fila = h('div', 'arbol-fila'); el.appendChild(fila);
            const b = h('button', 'btn secondary', `▶ ${48/f.u === 1 ? '1 redonda' : `${48/f.u} ${f.plural}`}`); b.type = 'button';
            const st = h('div', 'lz-pg'); fila.append(b, st);
            const vista = V.ritmo(st, p, {cifra: false, ancho: 560});
            b.addEventListener('click', () => { V.tocarRitmo(p, {bpm: 60, metronomo: true, vista}); oidas.add(f.id); if (oidas.size >= 3) ctx.listo(); });
          });
        }},
      {etapa: 'ejemplo', titulo: 'Corchetes y barras de unión', texto: `<p>Cuando hay varias corcheas o semicorcheas seguidas, los corchetes se reemplazan por una ${g('barra-union')}. Se agrupan <b>de a un pulso</b>, para que se vea de un vistazo dónde empieza cada tiempo.</p><p>Los dos pentagramas dicen exactamente lo mismo, pero el segundo se lee mucho más rápido:</p>`,
        visual(el){
          const p = pr('4/4', '8 8 8 8 16 16 16 16 8 8');
          V.ritmo(caja(el, 'lz-pg'), p, {sinBarras: true});
          ritmo(el, p, {conteo: true, bpm: 72});
        }},
      {etapa: 'solo', titulo: 'Reconocé las figuras', ejercicio: {tipo: 'r-figura', cantidad: 4}},
      {etapa: 'solo', titulo: 'Equivalencias', ejercicio: {tipo: 'r-equivalencia', cantidad: 3}}
    ]},

    // ------------------------------------------------------------ Silencios
    {id: 'r-silencios', titulo: 'Los silencios', resumen: 'Cada figura tiene un silencio que dura lo mismo.', pasos: [
      {etapa: 'aprender', titulo: 'El silencio también dura', texto: `<p>En música, no sonar también se escribe y se mide. Cada figura tiene su ${g('silencio')}, que dura <b>exactamente lo mismo</b>:</p><ul><li>${g('silencio-redonda', 'Silencio de redonda')}: un rectángulo que <b>cuelga</b> debajo de la línea.</li><li>${g('silencio-blanca', 'Silencio de blanca')}: un rectángulo <b>apoyado</b> sobre la línea. (La redonda «pesa» más; por eso su silencio cuelga.)</li><li>${g('silencio-negra', 'Silencio de negra')}: un zigzag vertical.</li><li>${g('silencio-corchea', 'Silencio de corchea')}: un gancho con un punto, como un 7.</li><li>${g('silencio-semicorchea', 'Silencio de semicorchea')}: dos ganchos.</li></ul>`,
        visual(el){ V.ritmo(caja(el, 'lz-pg'), pr('4/4', 'w wr h hr q qr 8 8r 16 16r'), {libre: true, colores: [null, 'b', null, 'b', null, 'b', null, 'b', null, 'b'], textos: ['redonda', '', 'blanca', '', 'negra', '', 'corch.', '', 'semic.', '']}); }},
      {etapa: 'ejemplo', titulo: 'Contar los silencios', texto: '<p>El pulso sigue aunque no suene nada. Para no perderte, contá también los silencios, en voz baja: en el conteo aparecen entre paréntesis.</p>',
        visual(el){ ritmo(el, pr('4/4', 'q qr q qr | h hr | 8 8 8r 8 q qr'), {conteo: true, bpm: 76, lento: true, final: true}); }},
      {etapa: 'solo', titulo: 'Reconocé los silencios', ejercicio: {tipo: 'r-silencio', cantidad: 5}}
    ]},

    // ------------------------------------------------------------ Compás
    {id: 'r-compas', titulo: 'El compás y la cifra indicadora', resumen: 'Barras de compás, 2/4, 3/4 y 4/4.', pasos: [
      {etapa: 'aprender', titulo: 'Compases y barras', texto: `<p>Los pulsos se agrupan de a 2, 3 o 4, y cada grupo es un ${g('compas')}. En la partitura, los compases se separan con una ${g('barra-compas')}: una línea vertical.</p><p>Al final de una sección se usa una ${g('doble-barra')}, y al final de la obra, una ${g('barra-final')} (una línea fina y otra gruesa).</p><p>Una figura nunca cruza la barra de compás: <b>cada compás tiene que sumar justo</b> lo que indica la cifra.</p>`,
        visual(el){ ritmo(el, pr('3/4', 'q q q | h q | 8 8 q q | h.'), {conteo: true, bpm: 88, final: true}); }},
      {etapa: 'aprender', titulo: 'La cifra indicadora', texto: `<p>Al principio del pentagrama hay dos números, uno arriba del otro: la ${g('cifra', 'cifra indicadora')}.</p><ul><li>El de <b>arriba</b> dice <b>cuántos tiempos</b> tiene cada compás.</li><li>El de <b>abajo</b> dice <b>qué figura vale un tiempo</b>: 4 = negra, 2 = blanca, 8 = corchea.</li></ul><p>Así, 3/4 son tres tiempos de negra. El 4/4 a veces se escribe con una C (${g('compasillo')}) y el 2/2, con una C atravesada (${g('alla-breve')}). Según cuántos tiempos tienen, los compases son ${g('binario', 'binarios, ternarios o cuaternarios')}.</p><p>Elegí un compás para verlo y escucharlo:</p>`,
        requiere: true, visual(el, ctx){
          const EJ = {'2/4': 'q q | 8 8 q | q 8 8 | h', '3/4': 'q q q | h q | 8 8 q q | h.', '4/4': 'q q q q | h q q | 8 8 8 8 h | w', '2/2': 'h h | q q h | w'};
          const st = caja(el, 'lz-pg');
          const vistos = new Set();
          let vista = null;
          const ver = c => {
            const p = pr(c, EJ[c]), cc = R.compas(c);
            vista = V.ritmo(st, p, {conteo: true, final: true});
            V.tocarRitmo(p, {bpm: c === '2/2' ? 60 : 88, metronomo: true, vista});
            msg(el, `<b>${c}</b>: ${cc.num} tiempos de ${R.fig(R.DEN_FIGURA[cc.den]).nombre}. Compás ${R.CARACTER[cc.pulsos]}: ${R.acentos(cc).map((a, i) => a === 2 ? `<b>${i + 1}</b>` : i + 1).join(' ')}.`);
            vistos.add(c); if (vistos.size >= 3) ctx.listo();
          };
          botones(el, Object.keys(EJ).map(c => [c, () => ver(c)]));
          V.ritmo(st, pr('4/4', EJ['4/4']), {conteo: true, final: true});
        }},
      {etapa: 'guiado', titulo: 'Armá compases', texto: '<p>Armá compases completos eligiendo figuras. Tienen que sumar justo lo que pide la cifra: ni más ni menos. Cuando un compás se completa, suena.</p>',
        requiere: true, visual: armarCompases},
      {etapa: 'solo', titulo: 'Completá el compás', ejercicio: {tipo: 'r-completar', cantidad: 4, op: {lista: LISTA_SIMPLE, nivel: 2}}},
      {etapa: 'solo', titulo: '¿Qué compás es?', ejercicio: {tipo: 'r-cifra', cantidad: 3, op: {lista: LISTA_SIMPLE, nivel: 2}}}
    ]},

    // ------------------------------------------------------------ Leer y tocar
    {id: 'r-leer', titulo: 'Contar, tocar y escuchar ritmos', resumen: 'Leer contando en voz alta, tocar y reconocer de oído.', pasos: [
      {etapa: 'aprender', titulo: 'Contar en voz alta', texto: '<p>Para leer un ritmo sin perderte, <b>contá en voz alta</b> mientras lo tocás o lo escuchás:</p><ul><li>En cada pulso decí su número: <b>1, 2, 3, 4</b>.</li><li>En la mitad de cada pulso (donde empieza la segunda corchea) decí <b>«y»</b>: 1 y 2 y 3 y 4 y.</li><li>Con semicorcheas, cada pulso se divide en cuatro: <b>1 e y a</b>.</li><li>Los silencios se cuentan igual, en voz baja (van entre paréntesis).</li></ul><p>Escuchá este ritmo mientras leés el conteo: la figura que suena se ilumina.</p>',
        visual(el){ ritmo(el, pr('4/4', 'q 8 8 q qr | 8 8 16 16 16 16 h'), {conteo: true, bpm: 72, lento: true, final: true}); }},
      {etapa: 'ejemplo', titulo: 'Seguí la partitura', texto: '<p>Otro ejemplo, en 3/4. Escuchalo primero siguiendo con la vista y después contando en voz alta junto con el audio.</p>',
        visual(el){ ritmo(el, pr('3/4', '8 8 q q | q qr 8 8 | h q | h.'), {conteo: true, bpm: 80, lento: true, final: true}); }},
      {etapa: 'guiado', titulo: 'Tocá un ritmo, con ayuda', texto: '<p>Ahora tocalo vos. Con la <kbd>barra espaciadora</kbd> (o tocando el recuadro) marcá el <b>comienzo</b> de cada figura:</p><ul><li>Una nota larga se toca <b>una sola vez</b>; mientras dura, seguís contando.</li><li>En los silencios <b>no se toca</b>.</li></ul><p>En este paso tenés el conteo escrito, podés escuchar el ritmo antes y la figura que toca se ilumina.</p>',
        ejercicio: {tipo: 'r-tocar', cantidad: 2, guiado: true, op: {nivel: 1, lista: LISTA_SIMPLE}}},
      {etapa: 'solo', titulo: 'Tocá sin ayuda', ejercicio: {tipo: 'r-tocar', cantidad: 3, op: {nivel: 2, lista: LISTA_SIMPLE}}},
      {etapa: 'aprender', titulo: 'El dictado rítmico', texto: '<p>En un dictado rítmico escuchás un ritmo y tenés que reconocer cómo está escrito. Un método que funciona:</p><ol><li>En la cuenta previa, agarrá el pulso y seguí contándolo mientras suena el ritmo.</li><li>Fijate en qué pulsos hay <b>un</b> sonido, en cuáles <b>dos</b> (corcheas) y en cuáles <b>ninguno</b> (silencio o nota larga).</li><li>Compará las opciones pulso por pulso y descartá las que no coinciden.</li><li>Escuchalo otra vez para confirmar.</li></ol><p>Probá con este: escuchalo, pensá cómo se escribe y después mostralo.</p>',
        visual(el){
          const p = pr('2/4', 'q 8 8 | 8 8 q | 8r 8 q | h');
          const st = caja(el, 'lz-pg'); st.hidden = true;
          let vista = null;
          botones(el, [['▶ Escuchar', () => V.tocarRitmo(p, {bpm: 80, metronomo: true, vista})], ['Mostrar cómo se escribe', b => { st.hidden = false; vista = V.ritmo(st, p, {conteo: true, final: true}); b.disabled = true; }]]);
        }},
      {etapa: 'solo', titulo: 'Dictado', ejercicio: {tipo: 'r-dictado', cantidad: 4, op: {nivel: 2, lista: LISTA_SIMPLE}}}
    ]},

    // ------------------------------------------------------------ Puntillo y ligadura
    {id: 'r-puntillo', titulo: 'Puntillo y ligadura', resumen: 'Dos formas de alargar una figura.', pasos: [
      {etapa: 'aprender', titulo: 'El puntillo', texto: `<p>Un ${g('puntillo')} es un punto a la derecha de una figura: <b>le suma la mitad de su valor</b>.</p><ul><li>Blanca con puntillo: 2 + 1 = <b>3 tiempos</b>.</li><li>Negra con puntillo: 1 + ½ = <b>1½ tiempos</b>.</li><li>Corchea con puntillo: ½ + ¼ = <b>¾ de tiempo</b>.</li></ul><p>Cuidado con el error más común: el puntillo <b>no suma un tiempo</b>, suma la mitad de la figura. (También existe el ${g('doble-puntillo')}, menos frecuente.)</p><p>En cada ejemplo, el primer compás tiene la figura con puntillo y el segundo, la misma duración escrita con una ligadura: suenan igual.</p>`,
        visual(el){
          [['3/4', 'h. | h~ q'], ['2/4', 'q. 8 | q~ 8 8'], ['2/4', '8. 16 q | 8~ 16 16 q']].forEach(([c, t]) => ritmo(el, pr(c, t), {conteo: true, bpm: 72}));
        }},
      {etapa: 'aprender', titulo: 'La ligadura de prolongación', texto: `<p>La ${g('ligadura', 'ligadura de prolongación')} es una curva que une dos notas <b>iguales</b>: se toca solo la primera y el sonido se mantiene durante la suma de las dos.</p><p>Sirve para dos cosas que el puntillo no puede hacer:</p><ul><li>Que un sonido <b>cruce la barra de compás</b>.</li><li>Escribir duraciones que ninguna figura tiene sola (por ejemplo, 2½ tiempos).</li></ul><p>No la confundas con la ${g('ligadura-expresion', 'ligadura de expresión')}, que une notas <b>distintas</b> para tocarlas sin cortar el sonido. Otro signo que alarga: el ${g('calderon')}, que pide sostener una nota más de lo escrito.</p>`,
        visual(el){ ritmo(el, pr('4/4', 'q q q q~ | q 8 8 h~ | 8 8 q h'), {conteo: true, bpm: 80, final: true}); }},
      {etapa: 'ejemplo', titulo: 'Negra con puntillo y corchea', texto: '<p>La combinación más común es <b>negra con puntillo + corchea</b>. La negra con puntillo ocupa el tiempo 1 y la mitad del 2; la corchea cae en la «y» del 2. Se cuenta «1 (2) y». Aparece en muchísimas melodías.</p>',
        visual(el){ ritmo(el, pr('4/4', 'q. 8 q. 8 | q. 8 h | q q q. 8 | w'), {conteo: true, bpm: 80, lento: true, final: true}); }},
      {etapa: 'solo', titulo: 'Practicá', ejercicio: {tipo: 'r-puntillo', cantidad: 5}},
      {etapa: 'solo', titulo: 'Tocá ritmos con puntillo', ejercicio: {tipo: 'r-tocar', cantidad: 2, op: {nivel: 3, lista: LISTA_SIMPLE}}}
    ]},

    // ------------------------------------------------------------ Compuestos
    {id: 'r-compuesto', titulo: 'Compases compuestos', resumen: '6/8, 9/8 y 12/8: pulsos que se dividen en tres.', pasos: [
      {etapa: 'aprender', titulo: 'Pulsos que se dividen en tres', texto: `<p>Hasta ahora, cada pulso se dividía en <b>dos</b> corcheas: son los ${g('compas-simple', 'compases simples')}. En los ${g('compas-compuesto', 'compases compuestos')} cada pulso se divide en <b>tres</b> corcheas.</p><p>Tres corcheas equivalen a una <b>negra con puntillo</b>: esa es la ${g('unidad-tiempo', 'unidad de tiempo')}. Por eso la cifra se lee distinto: el número de arriba cuenta corcheas, y hay que <b>dividirlo por 3</b> para saber cuántos pulsos hay.</p><table class="eq"><tr><td>6/8</td><td>9/8</td><td>12/8</td></tr><tr><td>2 pulsos</td><td>3 pulsos</td><td>4 pulsos</td></tr></table><p>En 6/8 se cuenta «<b>1</b> y a <b>2</b> y a».</p>`,
        visual(el){ ritmo(el, pr('6/8', '8 8 8 8 8 8 | q. q. | q 8 q 8 | h.'), {conteo: true, bpm: 60, final: true}); }},
      {etapa: 'ejemplo', titulo: '3/4 y 6/8 no son lo mismo', texto: '<p>Un compás de 3/4 y uno de 6/8 duran lo mismo: seis corcheas. Pero se sienten muy distinto:</p><ul><li><b>3/4</b>: tres pulsos de dos corcheas → <b>1</b> y <b>2</b> y <b>3</b> y</li><li><b>6/8</b>: dos pulsos de tres corcheas → <b>1</b> y a <b>2</b> y a</li></ul><p>Las barras de unión muestran cómo se agrupan. Escuchá los dos: las notas agudas marcan cada pulso.</p>',
        requiere: true, visual(el, ctx){
          const oidos = new Set();
          [['3/4', 92], ['6/8', 62]].forEach(([c, bpm]) => {
            const p = pr(c, '8 8 8 8 8 8 | 8 8 8 8 8 8');
            ritmo(el, p, {conteo: true, bpm, alturas: alturasPulso(p), metronomo: false, boton: `▶ Escuchar ${c}`, alTocar: () => { oidos.add(c); if (oidos.size === 2) ctx.listo(); }});
          });
        }},
      {etapa: 'ejemplo', titulo: 'Ritmos típicos del 6/8', texto: '<p>Estas combinaciones aparecen todo el tiempo en 6/8 (y en 9/8 y 12/8): negra + corchea, negra con puntillo, tres corcheas, y corchea con puntillo + semicorchea + corchea. El 6/8 es el compás de muchas zambas, chacareras, tarantelas y canciones de cuna.</p>',
        visual(el){ ritmo(el, pr('6/8', 'q 8 q 8 | q. 8 8 8 | 8. 16 8 q. | h.'), {conteo: true, bpm: 60, lento: true, final: true}); }},
      {etapa: 'solo', titulo: 'Practicá', ejercicio: {tipo: 'r-compuesto', cantidad: 5}},
      {etapa: 'solo', titulo: 'Dictado en 6/8', ejercicio: {tipo: 'r-dictado', cantidad: 2, op: {compas: '6/8', nivel: 3}}},
      {etapa: 'solo', titulo: 'Tocá en 6/8', ejercicio: {tipo: 'r-tocar', cantidad: 2, op: {compas: '6/8', nivel: 2}}}
    ]},

    // ------------------------------------------------------------ Tresillo, síncopa, contratiempo, anacrusa
    {id: 'r-especiales', titulo: 'Tresillo, síncopa, contratiempo y anacrusa', resumen: 'Ritmos que dividen o desplazan el pulso.', pasos: [
      {etapa: 'aprender', titulo: 'El tresillo', texto: `<p>Un ${g('tresillo')} es un grupo de <b>tres figuras iguales en el lugar de dos</b>. Tres corcheas de tresillo ocupan lo mismo que dos corcheas normales: una negra. Se marcan con un 3.</p><p>Es un ${g('grupo-irregular')}: divide el pulso en tres dentro de un compás simple, donde lo normal es dividirlo en dos. (Lo contrario, dos en el lugar de tres, es el ${g('dosillo')}.) Se cuenta «1 y a».</p>`,
        visual(el){ ritmo(el, pr('2/4', '8 8 8 8 | 3(8 8 8) 3(8 8 8) | 8 8 3(8 8 8) | h'), {conteo: true, bpm: 72, lento: true, final: true}); }},
      {etapa: 'aprender', titulo: 'La síncopa', texto: `<p>Una ${g('sincopa')} es un sonido que empieza en una <b>parte débil</b> y se <b>prolonga sobre la parte fuerte</b> que sigue. El acento «se corre» de lugar y la música gana empuje: está en el tango, el folklore, el jazz y el pop.</p><p>Se escribe con una figura larga entre dos cortas (corchea – negra – corchea) o con una ligadura que cruza el pulso. Escuchá con el metrónomo: la nota resaltada empieza entre dos clics y sigue sonando sobre el clic siguiente.</p>`,
        visual(el){ const c = Array(11).fill(null); [1, 4, 7, 8].forEach(i => c[i] = 'a'); ritmo(el, pr('2/4', '8 q 8 | 8 q 8 | 8 8~ 8 8 | h'), {conteo: true, colores: c, bpm: 72, final: true}); }},
      {etapa: 'aprender', titulo: 'El contratiempo', texto: `<p>En el ${g('contratiempo')} la nota también cae en una parte débil, pero <b>después de un silencio</b> en la parte fuerte, y <b>no se prolonga</b>. Es el «chak» de la guitarra en el reggae o el ska.</p><p>La diferencia con la síncopa: en la síncopa el sonido sigue sonando sobre el tiempo fuerte; en el contratiempo, sobre el tiempo fuerte hay silencio.</p>`,
        visual(el){ const c = Array(14).fill(null); [1, 3, 5, 7, 10, 13].forEach(i => c[i] = 'a'); ritmo(el, pr('4/4', '8r 8 8r 8 8r 8 8r 8 | q 8r 8 q 8r 8'), {conteo: true, colores: c, bpm: 80, final: true}); }},
      {etapa: 'aprender', titulo: 'La anacrusa', texto: `<p>Muchas melodías no empiezan en el primer tiempo fuerte: arrancan con una o más notas <b>antes</b>. Esas notas forman una ${g('anacrusa')}, un compás incompleto al principio.</p><p>El ejemplo más conocido es «Cumpleaños feliz»: «Cum-ple» está antes de la primera barra, y el primer tiempo fuerte cae en «a». Por eso el último compás es más corto: completa lo que le faltó al primero.</p>`,
        visual(el){
          const p = pr('3/4', '8. 16 | q q q | h 8. 16 | q q q | h', {anacrusa: 12});
          ritmo(el, p, {conteo: true, colores: [0, 1].map(() => 'a'), bpm: 100, final: true, alturas: [67, 67, 69, 67, 72, 71, 67, 67, 69, 67, 74, 72]});
        }},
      {etapa: 'solo', titulo: '¿Qué es cada cosa?', ejercicio: {tipo: 'r-especial', cantidad: 4}},
      {etapa: 'solo', titulo: 'Tocá síncopas y tresillos', ejercicio: {tipo: 'r-tocar', cantidad: 2, op: {nivel: 4, lista: LISTA_SIMPLE}}},
      {etapa: 'solo', titulo: 'Dictado', ejercicio: {tipo: 'r-dictado', cantidad: 2, op: {nivel: 4, lista: ['2/4', '4/4']}}}
    ]}
  ]);
})();
