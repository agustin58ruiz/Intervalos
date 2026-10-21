// Entrada MIDI (Web MIDI API): dispositivos, selección y eventos de notas en tiempo real.
// El manejador de mensajes solo actualiza el estado y avisa a los oyentes: nada de dibujo
// ni de análisis ahí, para que la latencia sea mínima.
(function(){
  const MI = {};
  const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch(e){ return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };

  MI.config = Object.assign({id: null, nombre: null, eco: false, captura: 'soltar', estableMs: 120, transponer: 0}, leer('midi-config', {}));
  MI.guardarConfig = () => guardar('midi-config', MI.config);

  let acceso = null, estado = 'sin-conectar';   // sin-conectar | conectando | listo | no-soportado | denegado | error
  const oyentes = {nota: new Set(), pedal: new Set(), dispositivos: new Set(), estado: new Set(), actividad: new Set()};
  const apretadas = new Map();                 // midi → {vel, t}
  let pedal = false;

  MI.soportado = () => typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
  MI.seguro = () => typeof window === 'undefined' || window.isSecureContext !== false;
  MI.enIframe = () => { try { return window.self !== window.top; } catch(e){ return true; } };
  MI.estado = () => estado;
  MI.on = (ev, fn) => { oyentes[ev].add(fn); return () => oyentes[ev].delete(fn); };
  MI.off = (ev, fn) => oyentes[ev].delete(fn);
  const emitir = (ev, x) => oyentes[ev].forEach(fn => { try { fn(x); } catch(e){ console.error(e); } });
  const ponerEstado = e => { estado = e; emitir('estado', e); };
  MI.teclasApretadas = () => new Set(apretadas.keys());
  MI.pedal = () => pedal;

  // Mensajes para cada situación, con qué hacer
  MI.MENSAJES = {
    'no-soportado': 'Este navegador no puede usar teclados MIDI. Abrí la aplicación en Chrome o Edge en una computadora (o Chrome en Android). Safari y los navegadores de iPhone y iPad no lo permiten.',
    'inseguro': 'El MIDI solo funciona en una página segura (https). Abrí la versión publicada en GitHub Pages.',
    'iframe': 'Dentro de esta vista incrustada el navegador puede bloquear el MIDI. Si no aparece tu teclado, abrí la aplicación en su propia pestaña (GitHub Pages).',
    'denegado': 'El navegador no dio permiso para usar MIDI. Tocá el candado de la barra de direcciones, permití «Dispositivos MIDI» y recargá la página.',
    'sin-dispositivos': 'No hay ningún teclado MIDI conectado. Conectalo por USB (o por Bluetooth MIDI) y encendelo: la lista se actualiza sola.',
    'desconectado': 'Se desconectó el teclado. Podés seguir con el mouse; cuando lo vuelvas a conectar se reconecta solo.'
  };

  MI.dispositivos = () => {
    if (!acceso) return [];
    const out = [];
    acceso.inputs.forEach(i => out.push({id: i.id, nombre: i.name || 'Entrada MIDI', fabricante: i.manufacturer || '', estado: i.state}));
    return out;
  };
  const elegido = inp => !MI.config.id && !MI.config.nombre || inp.id === MI.config.id || (inp.name && inp.name === MI.config.nombre);
  function enganchar(){
    if (!acceso) return;
    acceso.inputs.forEach(inp => { inp.onmidimessage = elegido(inp) ? mensaje : null; });
  }
  MI.elegir = id => {
    if (id === null){ MI.config.id = null; MI.config.nombre = null; }
    else { MI.config.id = id; const d = MI.dispositivos().find(x => x.id === id); MI.config.nombre = d ? d.nombre : null; }
    MI.guardarConfig(); apretadas.clear(); enganchar();
  };

  function mensaje(e){
    const d = e.data; if (!d || !d.length) return;
    const st = d[0] & 0xF0;
    if (d[0] >= 0xF0) return;                       // reloj, active sensing, etc.
    const t = e.timeStamp || performance.now();
    if (st === 0x90 || st === 0x80){
      const m = d[1] + 12*(MI.config.transponer || 0), vel = d[2] || 0;
      const on = st === 0x90 && vel > 0;
      if (on) apretadas.set(m, {vel, t}); else apretadas.delete(m);
      if (on && MI.config.eco && window.Sonido) Sonido.tocar(m, 0.9);
      emitir('nota', {midi: m, vel, on, t});
      emitir('actividad', t);
    } else if (st === 0xB0 && d[1] === 64){
      pedal = (d[2] || 0) >= 64;
      emitir('pedal', {abajo: pedal, t});
    }
  }

  // Pide acceso una sola vez. Devuelve {ok, motivo}
  let promesa = null;
  MI.conectar = () => {
    if (promesa) return promesa;
    if (!MI.soportado()){ ponerEstado('no-soportado'); return Promise.resolve({ok: false, motivo: 'no-soportado'}); }
    if (!MI.seguro()){ ponerEstado('error'); return Promise.resolve({ok: false, motivo: 'inseguro'}); }
    ponerEstado('conectando');
    promesa = navigator.requestMIDIAccess({sysex: false}).then(a => {
      acceso = a;
      enganchar();
      a.onstatechange = ev => {
        enganchar();
        if (ev.port && ev.port.type === 'input' && ev.port.state === 'disconnected' && elegido(ev.port)) apretadas.clear();
        emitir('dispositivos', MI.dispositivos());
      };
      ponerEstado('listo');
      emitir('dispositivos', MI.dispositivos());
      return {ok: true};
    }).catch(err => {
      promesa = null;
      const motivo = err && (err.name === 'SecurityError' || err.name === 'NotAllowedError') ? 'denegado' : 'error';
      ponerEstado(motivo === 'denegado' ? 'denegado' : 'error');
      return {ok: false, motivo};
    });
    return promesa;
  };
  // Si ya se había dado permiso, reconecta solo al cargar
  MI.autoconectar = () => { if (MI.config.auto && MI.soportado()) MI.conectar(); };

  // ---------- Panel de conexión reutilizable ----------
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  // op: {captura: bool (mostrar modo de captura), compacto}
  MI.panel = (el, op = {}) => {
    const p = h('div', 'midi-panel'); el.appendChild(p);
    const cab = h('div', 'midi-cab');
    const luz = h('span', 'midi-luz'); luz.setAttribute('aria-hidden', 'true');
    const txt = h('span', 'midi-txt');
    const btn = h('button', 'btn secondary midi-btn', 'Conectar teclado MIDI'); btn.type = 'button';
    cab.append(luz, txt, btn);
    p.appendChild(cab);
    const det = h('div', 'midi-det'); p.appendChild(det);
    const aviso = h('p', 'midi-aviso'); aviso.setAttribute('aria-live', 'polite'); p.appendChild(aviso);
    let apagar = null;
    const pintar = () => {
      const st = MI.estado(), ds = MI.dispositivos();
      det.innerHTML = '';
      aviso.textContent = '';
      btn.hidden = st === 'listo' || st === 'conectando';
      luz.className = 'midi-luz ' + (st === 'listo' && ds.length ? 'on' : st === 'listo' ? 'medio' : '');
      if (!MI.soportado()){ txt.textContent = 'MIDI no disponible'; aviso.textContent = MI.MENSAJES['no-soportado']; btn.hidden = true; return; }
      if (st === 'sin-conectar'){ txt.innerHTML = 'Teclado MIDI <small>(opcional: también podés usar el mouse)</small>'; if (MI.enIframe()) aviso.textContent = MI.MENSAJES.iframe; return; }
      if (st === 'conectando'){ txt.textContent = 'Conectando…'; return; }
      if (st === 'denegado'){ txt.textContent = 'Sin permiso para MIDI'; aviso.textContent = MI.MENSAJES.denegado; btn.hidden = false; return; }
      if (st === 'error'){ txt.textContent = 'No se pudo usar MIDI'; aviso.textContent = MI.seguro() ? (MI.enIframe() ? MI.MENSAJES.iframe : 'Probá recargar la página.') : MI.MENSAJES.inseguro; btn.hidden = false; return; }
      if (!ds.length){ txt.textContent = 'MIDI listo, sin teclado'; aviso.textContent = MI.MENSAJES['sin-dispositivos']; return; }
      txt.innerHTML = `MIDI: <b>${ds.filter(d => elegido({id: d.id, name: d.nombre})).map(d => d.nombre).join(', ') || 'todas las entradas'}</b>`;
      const sel = h('select'); sel.setAttribute('aria-label', 'Teclado MIDI');
      const todas = h('option', null, 'Todas las entradas'); todas.value = ''; sel.appendChild(todas);
      ds.forEach(d => { const o = h('option', null, `${d.nombre}${d.estado === 'disconnected' ? ' (desconectado)' : ''}`); o.value = d.id; if (d.id === MI.config.id || d.nombre === MI.config.nombre) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', () => { MI.elegir(sel.value || null); pintar(); });
      det.appendChild(sel);
      const eco = h('label', 'chk', `<input type="checkbox"${MI.config.eco ? ' checked' : ''}> <span>Sonido de la app al tocar</span>`);
      eco.querySelector('input').addEventListener('change', e => { MI.config.eco = e.target.checked; MI.guardarConfig(); });
      det.appendChild(eco);
      if (op.captura !== false){
        const cap = h('label', 'midi-cap', 'Acordes: ');
        const sc = h('select');
        [['soltar', 'se confirman al soltar las teclas'], ['estable', 'se confirman al mantenerlos']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; if (MI.config.captura === v) o.selected = true; sc.appendChild(o); });
        sc.addEventListener('change', () => { MI.config.captura = sc.value; MI.guardarConfig(); });
        cap.appendChild(sc); det.appendChild(cap);
      }
      const tr = h('label', 'midi-cap', 'Octava: ');
      const st2 = h('select');
      [[-1, '−1'], [0, 'normal'], [1, '+1']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; if (MI.config.transponer === v) o.selected = true; st2.appendChild(o); });
      st2.addEventListener('change', () => { MI.config.transponer = +st2.value; MI.guardarConfig(); });
      tr.appendChild(st2); det.appendChild(tr);
    };
    btn.addEventListener('click', () => { MI.config.auto = true; MI.guardarConfig(); MI.conectar().then(pintar); });
    // cada oyente se da de baja solo cuando el panel ya no está en la página
    let fuera = [];
    const vivo = fn => x => { if (!p.isConnected){ fuera.forEach(f => f()); return; } fn(x); };
    fuera = [MI.on('estado', vivo(pintar)), MI.on('dispositivos', vivo(() => pintar())),
      MI.on('actividad', vivo(() => { luz.classList.add('pulso'); clearTimeout(apagar); apagar = setTimeout(() => luz.classList.remove('pulso'), 120); }))];
    pintar();
    return p;
  };

  window.Midi = MI;
  if (typeof window !== 'undefined') setTimeout(() => MI.autoconectar(), 0);
})();
