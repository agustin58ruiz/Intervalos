// Componentes visuales de teoría: pentagrama (VexFlow), teclado y círculo de quintas.
(function(){
  const M = window.Musica;
  const V = {};
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#18203A';
  const COLOR = {a:'--first', b:'--second', ok:'--ok', bad:'--bad', tenue:'--line', suave:'--muted'};
  const colorDe = c => !c ? cssVar('--ink') : COLOR[c] ? cssVar(COLOR[c]) : c;
  const VF_ACC = {'-2':'bb','-1':'b','0':'n','1':'#','2':'##'};

  // ---------- Pentagrama ----------
  // notas: [{l, o, acc (alteración dibujada: null = ninguna, 0 = becuadro), color, texto, arriba}]
  V.pentagrama = (el, op = {}) => {
    const notas = op.notas || [], clave = op.clave || 'treble', arm = op.armadura || 0;
    el.innerHTML = '';
    el.classList.add('pg');
    if (!window.Vex || !Vex.Flow){ el.textContent = notas.map(n => M.corto(n)).join(' – '); return; }
    try {
      const VF = Vex.Flow;
      const cols = op.armonico ? 1 : Math.max(1, notas.length);
      const conTexto = notas.some(n => n.texto);
      const W = op.ancho || Math.max(220, 100 + Math.abs(arm)*11 + cols*(op.junto ? 44 : 62));
      const H = 150 + (conTexto ? 16 : 0);
      const r = new VF.Renderer(el, VF.Renderer.Backends.SVG); r.resize(W, H);
      const c = r.getContext();
      const ink = cssVar('--ink');
      c.setFillStyle(ink); c.setStrokeStyle(ink);
      const st = new VF.Stave(6, 22, W - 12);
      st.setStyle({strokeStyle: cssVar('--muted'), fillStyle: ink});
      st.addClef(clave);
      if (arm) st.addKeySignature(M.vfArmadura(arm));
      st.setContext(c).draw();
      if (notas.length){
        const grupos = op.armonico ? [notas.slice().sort((x, y) => M.paso(x) - M.paso(y))] : notas.map(n => [n]);
        const ticks = grupos.map(g => {
          const sn = new VF.StaveNote({clef: clave, keys: g.map(n => 'cdefgab'[n.l] + '/' + n.o), duration: 'w'});
          g.forEach((n, i) => {
            if (n.acc !== null && n.acc !== undefined) sn.addModifier(new VF.Accidental(VF_ACC[n.acc]), i);
            const col = colorDe(n.color);
            sn.setKeyStyle(i, {fillStyle: col, strokeStyle: col});
          });
          sn.setLedgerLineStyle({strokeStyle: ink});
          g.forEach(n => {
            [['texto', VF.Annotation.VerticalJustify.BOTTOM], ['arriba', VF.Annotation.VerticalJustify.TOP]].forEach(([k, j]) => {
              if (!n[k]) return;
              const an = new VF.Annotation(String(n[k])).setVerticalJustification(j);
              an.setFont('Figtree, system-ui, sans-serif', 12, 'bold');
              const col = n.color && n.color !== 'tenue' ? colorDe(n.color) : cssVar('--muted');
              an.setStyle({fillStyle: col, strokeStyle: col});
              sn.addModifier(an, 0);
            });
          });
          return sn;
        });
        const voz = new VF.Voice({num_beats: 4*ticks.length, beat_value: 4}).setMode(VF.Voice.Mode.SOFT).addTickables(ticks);
        new VF.Formatter().joinVoices([voz]).format([voz], W - st.getNoteStartX() - 34);
        voz.draw(c, st);
      }
      const svg = el.querySelector('svg');
      if (svg){
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.removeAttribute('width'); svg.removeAttribute('height');
        svg.style.maxWidth = W*1.35 + 'px';
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', op.etiqueta || `Pentagrama en clave de ${clave === 'bass' ? 'Fa' : 'Sol'}${arm ? ', armadura con ' + M.describirArmadura(arm) : ''}${notas.length ? ': ' + notas.map(n => M.corto(M.altura(n, 0), {oct:true})).join(', ') : ''}`);
      }
    } catch(e){ el.textContent = notas.map(n => M.corto(n)).join(' – '); }
  };

  // Cuenta las letras de un intervalo nota por nota (Do → Re → Mi) resaltando cada una
  V.contar = (el, lo, hi, op = {}) => {
    const pasos = [];
    for (let p = M.paso(lo); p <= M.paso(hi); p++) pasos.push(p);
    let i = 0, timer = null;
    const dibujar = () => V.pentagrama(el, Object.assign({}, op, {
      notas: pasos.map((p, k) => {
        const extremo = k === 0 || k === pasos.length - 1;
        const esc = k === 0 ? lo : k === pasos.length - 1 ? hi : M.desdePaso(p);
        return {l: esc.l, o: esc.o, acc: extremo ? (esc.acc !== undefined ? esc.acc : (esc.a ? esc.a : null)) : null,
                color: k > i ? 'tenue' : extremo ? (k === 0 ? 'a' : 'b') : 'suave', texto: k <= i ? String(k + 1) : ''};
      }),
      junto: true
    }));
    const avanzar = () => {
      dibujar();
      const esc = i === 0 ? lo : i === pasos.length - 1 ? hi : M.desdePaso(pasos[i]);
      if (window.Sonido && op.sonar !== false) Sonido.tocar(M.midi(M.altura(esc, op.armadura || 0)), 0.5);
      if (op.alPaso) op.alPaso(i, pasos.length);
      if (i < pasos.length - 1){ i++; timer = setTimeout(avanzar, op.ritmo || 650); }
      else if (op.alTerminar) op.alTerminar(pasos.length);
    };
    i = 0; dibujar();
    return { empezar(){ clearTimeout(timer); i = 0; avanzar(); }, parar(){ clearTimeout(timer); }, total: pasos.length };
  };

  // ---------- Teclado ----------
  // op: {desde, hasta, etiquetas: 'todas'|'blancas'|'do'|'ninguna', onTecla(midi), sonar}
  V.teclado = (el, op = {}) => {
    const desde = op.desde || 60, hasta = op.hasta || 72;
    let etiquetas = op.etiquetas || 'do';
    el.innerHTML = ''; el.classList.add('tk-wrap');
    const kb = document.createElement('div'); kb.className = 'tk';
    el.appendChild(kb);
    const blancas = []; for (let m = desde; m <= hasta; m++) if (!M.esNegra(m)) blancas.push(m);
    const ww = 100/blancas.length, bw = ww*0.6;
    const teclas = {};
    let wi = -1, marcas = {};
    for (let m = desde; m <= hasta; m++){
      const negra = M.esNegra(m);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tk-key ' + (negra ? 'tk-negra' : 'tk-blanca');
      if (!negra){ wi++; b.style.left = (wi*ww) + '%'; b.style.width = ww + '%'; }
      else { b.style.left = ((wi + 1)*ww - bw/2) + '%'; b.style.width = bw + '%'; }
      const lab = document.createElement('span'); lab.className = 'tk-lab'; b.appendChild(lab);
      b.addEventListener('click', () => {
        if (op.sonar !== false && window.Sonido) Sonido.tocar(m);
        if (op.onTecla) op.onTecla(m, b);
      });
      kb.appendChild(b); teclas[m] = b;
    }
    const nombreTecla = m => {
      if (!M.esNegra(m)) return M.corto(M.deMidi(m));
      return M.corto(M.deMidi(m, 1)) + '\n' + M.corto(M.deMidi(m, -1));
    };
    const pintar = () => {
      Object.entries(teclas).forEach(([m, b]) => {
        m = +m;
        const mk = marcas[m];
        b.className = 'tk-key ' + (M.esNegra(m) ? 'tk-negra' : 'tk-blanca') + (mk && mk.c ? ' tk-' + mk.c : '');
        let t = '';
        if (mk && mk.t !== undefined) t = mk.t;
        else if (etiquetas === 'todas') t = nombreTecla(m);
        else if (etiquetas === 'blancas' && !M.esNegra(m)) t = nombreTecla(m);
        else if (etiquetas === 'do' && m % 12 === 0) t = M.corto(M.deMidi(m), {oct: true});
        b.querySelector('.tk-lab').textContent = t;
        const nom = M.esNegra(m) ? `${M.latino(M.deMidi(m,1))} o ${M.latino(M.deMidi(m,-1))}` : M.latino(M.deMidi(m)) + M.deMidi(m).o;
        b.setAttribute('aria-label', nom + (mk && mk.t ? ', ' + mk.t : ''));
      });
    };
    pintar();
    return {
      marcar(obj){ marcas = obj || {}; pintar(); },
      agregar(m, v){ marcas[m] = v; pintar(); },
      limpiar(){ marcas = {}; pintar(); },
      etiquetas(e){ etiquetas = e; pintar(); },
      tecla: m => teclas[m], desde, hasta
    };
  };

  // ---------- Círculo de quintas ----------
  V.CIRCULO = [0,1,2,3,4,5,6,-5,-4,-3,-2,-1];
  V.circulo = (el, op = {}) => {
    const R = 150, cx = 170, cy = 170;
    let sel = op.seleccion !== undefined ? op.seleccion : null;
    const dibujar = () => {
      const partes = V.CIRCULO.map((n, i) => {
        const ang = (i*30 - 90) * Math.PI/180;
        const x1 = cx + R*Math.cos(ang), y1 = cy + R*Math.sin(ang);
        const x2 = cx + (R - 52)*Math.cos(ang), y2 = cy + (R - 52)*Math.sin(ang);
        const k = M.armadura(n);
        const may = i === 6 ? 'Fa♯/Sol♭' : M.corto(k.mayor);
        const men = i === 6 ? 'Re♯/Mi♭' : M.corto(k.menor);
        const cant = n === 0 ? '' : n === 6 ? '6♯/6♭' : Math.abs(n) + (n > 0 ? '♯' : '♭');
        const on = sel === n || (i === 6 && sel === -6);
        return `<g class="cq-slot${on ? ' on' : ''}" data-n="${n}" tabindex="0" role="button" aria-label="${M.latino(k.mayor)} mayor y ${M.latino(k.menor)} menor, ${n === 0 ? 'sin alteraciones' : M.describirArmadura(n)}">
          <circle cx="${x1}" cy="${y1}" r="25" class="cq-may"></circle>
          <text x="${x1}" y="${y1 + 1}" class="cq-t1">${may}</text>
          <text x="${x1}" y="${y1 + 36}" class="cq-t3">${cant}</text>
          <circle cx="${x2}" cy="${y2}" r="19" class="cq-men"></circle>
          <text x="${x2}" y="${y2 + 1}" class="cq-t2">${men.toLowerCase()}</text>
        </g>`;
      }).join('');
      el.innerHTML = `<svg viewBox="-12 -12 364 384" class="cq" role="group" aria-label="Círculo de quintas">
        <circle cx="${cx}" cy="${cy}" r="${R}" class="cq-aro"></circle>
        <circle cx="${cx}" cy="${cy}" r="${R - 52}" class="cq-aro"></circle>
        <text x="${cx}" y="${cy - 8}" class="cq-centro">mayores afuera</text>
        <text x="${cx}" y="${cy + 10}" class="cq-centro">menores adentro</text>
        ${partes}</svg>`;
      el.querySelectorAll('.cq-slot').forEach(g => {
        const elegir = () => { sel = +g.dataset.n; dibujar(); if (op.onElegir) op.onElegir(sel); };
        g.addEventListener('click', elegir);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); elegir(); } });
      });
    };
    dibujar();
    return { seleccionar(n){ sel = n; dibujar(); } };
  };

  window.Visual = V;
})();
