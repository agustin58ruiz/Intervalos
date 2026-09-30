# Arquitectura

La aplicación es una página estática (sin compilación ni dependencias de npm) que se publica en GitHub Pages. Tiene dos partes:

- **Oído** (`js/oido.js`): la aplicación original de entrenamiento auditivo: adivinar intervalos, fichas por intervalo y lectura rápida de notas.
- **Aula de teoría** (`js/teoria/*`): lecciones, práctica con corrección explicada y evaluación, incluida la unidad de ritmo, la pestaña Ritmo (tocar, dictado y glosario).

## Análisis de la aplicación original

| Pregunta | Cómo estaba resuelto | Qué se hizo |
|---|---|---|
| ¿Cómo se representan las notas? | Como números MIDI (Do4 = 60). Los nombres salían de una tabla de 12 clases de altura con sostenidos (`Do♯`, nunca `Re♭`). Solo en *Lectura rápida* había letra + alteración. | Para teoría hace falta **ortografía**: Fa♯ y Sol♭ suenan igual, pero forman intervalos distintos. `musica.js` representa la nota como `{l, a, o}` (letra 0–6, alteración −2..2, octava) y deriva el MIDI de eso. |
| ¿Cómo se representa una armadura? | En *Lectura rápida*, como un objeto `{vf, name, n}` con `n` = cantidad de ♯ (positivo) o ♭ (negativo). | Se mantiene la misma convención `n` y se completa: orden de ♯ y ♭, tónica mayor (por quintas), relativa menor, altura real de una nota escrita (`altura(escrita, n)`). |
| ¿Cómo se renderiza el pentagrama? | VexFlow 4 incluido en la página, con funciones que dibujan intervalos o una nota con colores tomados de las variables CSS. | Se extrajo VexFlow a `js/vendor/vexflow.js`. `visual.js` generaliza el dibujo: clave, armadura, varias notas, alteraciones (también ♮), colores y textos debajo o arriba de cada nota. Además agrega un teclado reutilizable y el círculo de quintas. |
| ¿Cómo se reproduce el audio? | Web Audio con samples del piano Salamander en base64 y afinación por `playbackRate`; síntesis aditiva mientras cargan. | Los samples pasaron a `js/muestras-piano.js`. `oido.js` expone `window.Sonido` (`tocar`, `intervalo`, `secuencia`, `acorde`, `parar`), que usa el aula. |
| ¿Cómo se generan los ejercicios? | Por semitonos: se sorteaba un intervalo de 1 a 12 semitonos, con pesos adaptativos por error. | `ejercicios.js` genera ejercicios **por nombre de nota**. Cada ejercicio sabe dibujarse, corregirse, explicar el procedimiento, diagnosticar el error más probable y generar otro parecido. |
| ¿Cómo se guarda el progreso? | `localStorage`: aciertos, pesos por intervalo, estadísticas y una Beta por nota. | `progreso.js` guarda en `localStorage` una **Beta(α, β) por habilidad**, los errores recientes con su diagnóstico, las lecciones completadas y el historial de evaluaciones. Las claves empiezan con `teoria-` para no pisar las del módulo de oído. |

## Módulos del aula

```
js/teoria/
  musica.js            Núcleo de teoría (sin interfaz): notas, intervalos, armaduras
  visual.js            Pentagrama (VexFlow), teclado, círculo de quintas, conteo animado
  progreso.js          Habilidades, Beta, diagnósticos, recomendaciones, lecciones, evaluaciones
  ritmo.js             Núcleo de ritmo (sin interfaz): figuras, compases, patrones, ataques, generación
  ritmo-visual.js      Pentagrama rítmico, reproducción con cuenta previa, metrónomo, tocar y línea de tiempo
  glosario.js          Definiciones de ritmo con ejemplos; G.t() las enlaza desde las lecciones
  ejercicios.js        Catálogo de ejercicios con corrección, explicación y diagnóstico
  ejercicios-ritmo.js  Ejercicios de ritmo (se registran en el mismo catálogo)
  lecciones.js         Contenido: unidades → lecciones → pasos
  lecciones-ritmo.js   Unidad de ritmo (se agrega con Lecciones.agregarUnidad)
  app.js               Interfaz: navegación, reproductor de lecciones, práctica, evaluación, pestaña Ritmo y glosario
```

Todos son scripts clásicos que publican un objeto global (`Musica`, `Visual`, `Progreso`, `Ritmo`, `Glosario`, `Ejercicios`, `Lecciones`, `Aula`), así la página funciona sin servidor ni compilación.

## Ritmo

- **Duraciones en unidades enteras**: la negra vale 12, así la corchea vale 6, la semicorchea 3 y la corchea de tresillo 4. Un evento es `{f, p, s, lig, tres}` (figura, puntillo, silencio, ligada a la siguiente, grupo de tresillo) y se escribe como texto: `R.leer('q. 8 | 8r 8 3(8 8 8) h~ q')`.
- **Patrón**: `{compas, ev, anacrusa}`. De ahí salen las barras de compás, los **ataques** (las notas que se tocan: ni silencios ni continuaciones de ligadura), el conteo en voz alta («1 y 2 y», «1 e y a», «1 y a» en compuestos) y la posición métrica de cada figura para las explicaciones.
- **Generación**: cada compás se llena con **celdas** de uno o más pulsos (negra, dos corcheas, negra con puntillo + corchea, síncopa, tresillo…), cada una con un nivel (1 figuras largas, 2 corcheas, 3 puntillo y semicorcheas, 4 síncopa y tresillos) y un peso. Las opciones del dictado se obtienen cambiando una celda por otra que **suene distinto** (otros ataques).
- **Dibujo**: VexFlow en un pentagrama de una sola línea (las otras cuatro están ocultas), con barras de unión por pulso, tresillos, ligaduras y el conteo debajo. Cada figura queda en un grupo SVG propio para iluminarla mientras suena.
- **Audio y tiempo**: todo se programa en el reloj de Web Audio (`Sonido.ahora()`); `Sonido.aMs(t)` convierte ese instante al reloj de `performance.now()` teniendo en cuenta la latencia de salida, que es el mismo reloj de `event.timeStamp` de los toques.
- **Corrección de toques**: cada nota escrita se empareja con el toque más cercano dentro de su ventana. Antes de juzgar se descuenta la mediana del desfase si es de hasta 150 ms (latencia de auriculares). Un toque está «a tiempo» si cae a menos de 12 % de un pulso (entre 50 y 100 ms). Los toques de más se clasifican según dónde caen (en un silencio o durante una nota larga) para dar el diagnóstico.
- **Glosario**: `G.t('sincopa')` genera un botón dentro del texto; al tocarlo se abre una hoja (`popover`) con la definición, el ejemplo y un enlace a la ficha en la pestaña Ritmo.

## Intervalos: número y calidad por separado

`Musica.intervalo(x, y)`:

1. **Número**: diferencia de posiciones en el pentagrama (letra + 7·octava) + 1. No depende de las alteraciones.
2. **Semitonos**: diferencia de MIDI.
3. **Calidad**: se compara con los semitonos de la forma justa (1, 4, 5, 8) o mayor (2, 3, 6, 7) y la diferencia da `d`, `m`, `J`, `M` o `A`.

Con una armadura, primero `altura(escrita, n)` convierte cada nota escrita en su altura real: una alteración escrita (incluido el ♮) manda; si no hay, se aplica la armadura.

## El ciclo pedagógico

Cada lección es una lista de pasos y cada paso pertenece a una etapa: **Aprender**, **Ver ejemplos**, **Hacer con ayuda**, **Hacer solo**. Un paso puede tener:

- `visual(el, ctx)`: una demostración o interacción. Si el paso tiene `requiere`, el botón *Siguiente* se habilita recién cuando la interacción llama a `ctx.listo()`.
- `ejercicio`: una serie de ejercicios. En modo *con ayuda*, los ejercicios de intervalos piden cada paso del procedimiento (notas escritas → número → armadura → accidentales → semitonos → calidad) antes de la respuesta final.

Al equivocarse, la corrección muestra la respuesta correcta, el procedimiento completo, **dónde estuvo probablemente el error** y un ejercicio parecido para volver a intentar.

## Sistema adaptativo

- Cada respuesta se descompone en **habilidades** (por ejemplo: número del intervalo, calidad, aplicar la armadura, alteraciones accidentales) y actualiza la Beta de cada una.
- Cada error se clasifica con un **diagnóstico** (`numero`, `numero-semis`, `familia`, `calidad`, `aum-dis`, `armadura`, `accidental`, `enarmonia`, …). Por ejemplo, si la persona responde con el mismo número de semitonos pero otro número de intervalo, el diagnóstico es “confunde número con calidad”.
- Si el mismo diagnóstico aparece dos veces en las últimas seis respuestas, se recomienda repasar: un botón lleva a la lección y el paso exactos, y otro a ejercicios específicos.
- La práctica recomendada elige la habilidad por muestreo de Thompson: sortea un valor de cada Beta y practica la más baja.

## Evaluación

Preguntas sin ayudas, con tres alcances: todo, notas e intervalos (18) o ritmo (13). El historial y la comparación con la evaluación anterior se muestran por alcance (las evaluaciones guardadas antes de la unidad de ritmo cuentan como «notas e intervalos»). Al final muestra el porcentaje, el tiempo, los conceptos dominados y los que tuvieron errores, la comparación con la evaluación anterior, recomendaciones según los diagnósticos y la revisión de cada respuesta con su explicación.
