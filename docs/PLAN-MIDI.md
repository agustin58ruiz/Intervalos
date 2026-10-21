# Plan: entrada con teclado MIDI

Estado: **pendiente**. Este documento deja definido cómo agregar la entrada MIDI en tiempo real al editor a cuatro voces y a los ejercicios de armonía, para implementarlo más adelante sin rediseñar nada.

## Objetivo

Resolver los ejercicios de conducción de voces tocando en un teclado físico (USB o cualquier interfaz MIDI que el sistema reconozca), sin escribir las notas con el mouse:

- elegir el teclado conectado;
- ver en el pentagrama SATB las notas que se tocan, asignadas a cada voz;
- tocar acordes y enlazar progresiones propuestas (por ejemplo I–V–I);
- recibir el mismo análisis que hoy da el editor (paralelas, duplicaciones, sensible, espaciado…), con explicación y alternativas, sin bloquear otras soluciones válidas;
- trabajar en modo libre o guiado (acorde por acorde);
- escuchar la solución propia y una de referencia, y comparar el movimiento de cada voz.

## Compatibilidad (Web MIDI API)

| Entorno | Soporte |
|---|---|
| Chrome, Edge, Opera, Brave (escritorio) | Sí. |
| Chrome en Android | Sí (teclado por USB-OTG o Bluetooth MIDI). |
| Firefox (escritorio) | Sí desde la versión 108, pero pide un permiso especial del sitio la primera vez. |
| Safari (macOS e iOS) y cualquier navegador en iPhone/iPad | **No.** Hay que mostrar un mensaje claro y sugerir Chrome o Edge en una computadora. |

Requisitos:

- Contexto seguro: GitHub Pages (https) y `localhost` sirven. Abriendo `index.html` como archivo (`file://`) no funciona.
- **Dentro del artifact de claude.ai probablemente no funcione**: la página corre en un iframe y Web MIDI necesita que el iframe tenga el permiso `midi`. La versión de referencia para MIDI es la de GitHub Pages.
- Se pide acceso con `navigator.requestMIDIAccess({sysex: false})`. Sin SysEx no hace falta un permiso extra en Chrome.

Mensajes previstos, cada uno con qué hacer:

1. *El navegador no soporta MIDI.* → Abrí la aplicación en Chrome o Edge en una computadora.
2. *Permiso denegado.* → Cómo habilitarlo desde el candado de la barra de direcciones.
3. *No hay dispositivos.* → Conectá el teclado y encendelo; la lista se actualiza sola.
4. *El dispositivo se desconectó.* → Aviso no bloqueante; se reconecta solo al volver.

## Arquitectura

Se mantienen las convenciones del proyecto: scripts clásicos que publican un objeto global, sin compilación. Dos archivos nuevos y cambios acotados en tres existentes.

```
js/teoria/
  midi.js          (nuevo) Acceso a Web MIDI: dispositivos, selección, eventos de notas
  midi-captura.js  (nuevo, sin interfaz) Agrupar notas en acordes, asignar voces y deletrear
  armonia-editor.js   + modo de entrada MIDI (vista previa, ingreso de acordes, avance)
  armonia-app.js      + controles MIDI en los desafíos y el editor libre; modo guiado; comparación
  armonia.js          + Armonia.deletrear(K, midi, contexto)
css/armonia.css       + estilos del indicador MIDI y la vista previa
```

### `midi.js` (window.Midi)

```js
Midi.soportado()                 // boolean: existe navigator.requestMIDIAccess
Midi.conectar()                  // Promise<{ok, motivo}>: pide acceso una sola vez
Midi.dispositivos()              // [{id, nombre, fabricante, estado}]
Midi.elegir(id | null)           // null = todas las entradas (omni); se guarda en localStorage
Midi.on('nota', fn)              // fn({midi, vel, on: bool, t})   t = event.timeStamp (ms)
Midi.on('pedal', fn)             // CC 64 (sustain): fn({abajo: bool, t})
Midi.on('dispositivos', fn)      // cambios de conexión (evento statechange)
Midi.off(evento, fn)
Midi.teclasApretadas()           // Set de notas MIDI sostenidas en este momento
```

Lectura de los mensajes (`input.onmidimessage`):

- `0x9n` con velocidad > 0: nota apretada. `0x8n`, o `0x9n` con velocidad 0: nota soltada.
- `0xBn 64 v`: pedal de sustain (≥ 64 = abajo).
- Se ignoran el reloj, el active sensing y el resto (`0xF8`, `0xFE`…). Se aceptan todos los canales (omni).
- Se guarda el dispositivo elegido por `id` y por `nombre`, porque el `id` puede cambiar entre sesiones.

Baja latencia:

- El manejador solo actualiza el estado y emite el evento; nada de dibujo ahí.
- El editor redibuja como máximo una vez por cuadro (`requestAnimationFrame`).
- El análisis completo (`Armonia.analizar`) corre al **confirmar** un acorde, no con cada tecla.
- Sonido de eco opcional (desactivado por defecto, porque el teclado ya suena): si se activa, `Sonido.nota(m, Sonido.ahora(), …)` en el mismo manejador.

### `midi-captura.js` (window.MidiCaptura)

Funciones puras, testeables en Node.

**1. Agrupar en acordes.** Dos modos (configurable):

- *Al soltar* (por defecto): el acorde son todas las notas que estuvieron apretadas juntas; se confirma cuando se sueltan todas. Tolera que los dedos no bajen exactamente a la vez.
- *Por estabilidad*: se confirma cuando hay N notas apretadas (4, o las que falten según las voces dadas) y no cambian durante unos 120 ms. Sirve para encadenar acordes sin levantar las manos.

En los dos modos, el pedal de sustain extiende la captura mientras esté abajo.

```js
const cap = MidiCaptura.crear({modo: 'soltar' | 'estable', estableMs: 120, esperadas: 4});
cap.nota({midi, on, t});            // devuelve null o {notas: [midi…], inicio, fin}
cap.reiniciar();
```

**2. Asignar voces.** Entrada: los MIDI del acorde, las voces dadas por el ejercicio (`fijas` de la columna) y la columna anterior.

- Si se tocan 4 notas: de grave a agudo B, T, A, S.
- Si el ejercicio da el bajo (o el soprano), la nota dada se reconoce y se ignora si se toca de nuevo; las demás se reparten entre las voces libres.
- Si se tocan menos notas que voces libres, se prueban todas las asignaciones posibles (a lo sumo 24) y se elige la que minimiza el movimiento respecto del acorde anterior, sin cruzar voces. Las voces que no reciben nota quedan vacías y se marcan.
- Si se tocan más notas que voces libres, se avisa («tocaste 5 notas; el ejercicio pide 3») y no se ingresa nada.

```js
MidiCaptura.asignar(midis, {fijas, anterior})  // {S, A, T, B} con números MIDI (o null) + avisos
```

**3. Deletrear.** El teclado manda alturas; el pentagrama necesita nombres (Fa♯ o Sol♭). Va en `armonia.js`:

```js
Armonia.deletrear(K, midi, {acorde})  // {l, a, o}
```

Orden de preferencia:

1. una nota del acorde pedido (cifrado del ejercicio), si alguna coincide;
2. la nota diatónica de la tonalidad (con la sensible elevada en menor, `alteracionPorDefecto`);
3. el nombre enarmónico más simple, con ♯ en tonalidades con sostenidos y ♭ en tonalidades con bemoles.

### Cambios en `armonia-editor.js`

Opción nueva `entradaMidi: true` y métodos públicos:

```js
ed.vistaPrevia(midis)        // notas sostenidas: se dibujan tenues en la columna actual
ed.ingresarAcorde(c, voces)  // escribe {S,A,T,B} en la columna c, analiza y llama onCambio
ed.ingresarNota(midi)        // modo melódico: escribe en la voz elegida y avanza a la columna siguiente
ed.columnaActual()           // la columna donde va el próximo acorde
ed.avanzar()                 // pasa a la próxima columna con voces libres
```

- En la barra de edición, un indicador «MIDI: nombre del teclado ●», verde al recibir notas.
- Un acorde confirmado se escribe en la columna actual y el cursor avanza. Las voces dadas no se pisan.
- Las notas tocadas siguen siendo editables con el mouse y las flechas, así que se pueden mezclar las dos formas.
- La duración de cada nota (soltar − apretar) se guarda en la columna como dato informativo (`dur` en ms) y se muestra en el panel. El editor sigue con un acorde por compás; la notación rítmica queda para otra etapa.

### Cambios en `armonia-app.js`

- **Panel MIDI** (desafíos y editor libre): conectar, elegir dispositivo, eco de sonido sí/no, modo de captura (al soltar / por estabilidad) y transposición de octava (para teclados chicos).
- **Modo guiado** (desafíos): se toca acorde por acorde. Al confirmar cada uno se muestra enseguida la evaluación del **enlace** con el acorde anterior: qué voces generan cada problema (con las líneas que ya dibuja el editor), por qué ocurre y una alternativa concreta: la nota de la solución de referencia para esa voz, o la nota del acorde más cercana que no produce el problema. Siempre se puede seguir a la columna siguiente: el aviso no bloquea.
- **Modo libre**: en el editor libre, botón «Grabar progresión»: cada acorde tocado agrega una columna. Se elige la tonalidad antes. Se puede detener, deshacer el último acorde y volver a grabar desde cualquier columna.
- **Progresiones propuestas**: las de `PRESETS` (I–V–I, I–IV–V–I, ii⁶–V⁷–I…) más las de los niveles; con MIDI, el desafío muestra encima del pentagrama el numeral que toca ahora.
- **Reproducción y comparación**:
  - «Mi solución» y «Referencia» (`Armonia.realizar` con las voces dadas fijas), o las dos alternadas acorde por acorde.
  - Tabla por voz: el movimiento de cada voz en la solución propia y en la de referencia (↑ 2.ª mayor / se mantiene / ↓ 3.ª menor), resaltando dónde difieren.
  - Escuchar una sola voz de cada versión.
  - La referencia se presenta como «una solución posible»: la corrección sigue siendo por reglas, no por coincidencia con ella.

## Pruebas

- **Unitarias (Node)**: `midi-captura.js` (agrupar con toques escalonados, con pedal y por estabilidad; asignar con 2, 3, 4 y 5 notas, con bajo o soprano dados; sin cruces) y `Armonia.deletrear` en tonalidades con ♯, con ♭ y en menor.
- **Navegador (Playwright)**: reemplazar `navigator.requestMIDIAccess` con un objeto falso que exponga una entrada y emita mensajes `[0x90, 60, 100]`, etc. Verificar:
  - la lista de dispositivos y la reconexión;
  - que un I–V–I tocado aparezca en el pentagrama y quede «Resuelto»;
  - que una progresión con octavas paralelas tocada a propósito marque las dos voces y explique el problema;
  - los mensajes de «no soportado» y «permiso denegado».
- **Manual** con un teclado real, en Chrome (Windows o macOS) y Chrome en Android: latencia percibida, acordes tocados «desparejos», pedal, desconectar y reconectar en medio de un ejercicio.

## Criterios de aceptación

1. En Chrome con un teclado USB se puede resolver el desafío «Enlaces de dos acordes» sin tocar el mouse.
2. Las notas aparecen en el pentagrama en el acorde correcto y con la voz bien asignada en los casos comunes (4 notas; 3 notas con el bajo dado).
3. Las paralelas, las duplicaciones y los problemas de la sensible se marcan igual que con la entrada por mouse, con la misma explicación.
4. En Safari o en un iPhone aparece un mensaje claro y el resto de la aplicación funciona igual.
5. Desconectar el teclado no rompe el ejercicio: se avisa y se puede seguir con el mouse.

## Orden sugerido de implementación

1. `midi.js` con el panel de conexión y los mensajes de compatibilidad.
2. `midi-captura.js` y `Armonia.deletrear`, con pruebas en Node.
3. Editor: vista previa, `ingresarAcorde` y avance de columna.
4. Desafíos con MIDI y modo guiado acorde por acorde.
5. Modo libre «Grabar progresión».
6. Comparación con la solución de referencia.
7. Pruebas en el navegador con MIDI simulado y la prueba manual.
