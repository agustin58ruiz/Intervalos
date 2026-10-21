# Aula de teoría musical

Una aplicación para **aprender** teoría musical, no solo para responder preguntas: explica cada concepto, lo muestra con ejemplos en el pentagrama y el teclado, lo practica con ayuda y después sin ayuda, y cuando hay un error explica por qué y propone otro ejercicio parecido.

Publicada en GitHub Pages: https://agustin58ruiz.github.io/Intervalos/

## Secciones

- **Aprender**: cinco unidades con lecciones paso a paso.
  1. *Las notas*: nombres, notación anglosajona, teclado, tonos y semitonos, sostenidos/bemoles/becuadros, claves de Sol y de Fa, relación pentagrama-teclado.
  2. *Intervalos*: qué es un intervalo, cómo se obtiene el número (contando letras) y la calidad (contando semitonos): mayores, menores, justos, aumentados y disminuidos; construir intervalos.
  3. *Armaduras y tonalidades*: qué es una armadura, alteraciones accidentales, orden de ♯ y ♭, cómo reconocer la tonalidad, relativas menores y el círculo de quintas.
  4. *Intervalos con armadura*: el procedimiento completo en siete pasos.
  5. *Ritmo*: pulso, tempo y acento; figuras y sus valores; silencios; compás y cifra indicadora; contar, tocar y escuchar ritmos; puntillo y ligadura; compases compuestos (6/8, 9/8, 12/8); tresillo, síncopa, contratiempo y anacrusa. Los términos subrayados abren su definición del glosario.
- **Practicar**: ejercicios por tema o una práctica recomendada adaptativa. Cada error muestra la respuesta correcta, el procedimiento, dónde estuvo probablemente el error y un ejercicio parecido.
- **Intervalos**: estudio de intervalos con y sin armadura. Aparecen dos notas en el pentagrama y cuatro opciones (las confusiones más probables: olvidar la armadura, olvidar una alteración, contar semitonos en vez de letras). Al responder se explica con el método estándar: notas escritas → número contando letras → armadura → alteraciones → semitonos → calidad, con el conteo en el pentagrama y en el teclado. Si la respuesta es incorrecta, la explicación aparece entera con dónde estuvo el error; si es correcta, se puede pedir la explicación o a los 3 segundos sigue otro. Se elige armadura (sin, con o mezclar), alteraciones, calidades y clave.
- **Evaluación**: preguntas sin ayudas sobre todo, sobre notas e intervalos (18: lectura, intervalos, construcción, armaduras, tonalidades, alteraciones, intervalos con armadura y oído) o sobre ritmo (13: tempo, figuras, silencios, compás, puntillo, compases compuestos, síncopa y dictado). Al final muestra el porcentaje, el tiempo, los conceptos dominados y con errores, y la evolución respecto de evaluaciones anteriores.
- **Ritmo**: práctica libre eligiendo compás, nivel, tempo y largo.
  - *Tocar el ritmo*: después de un compás de cuenta, se toca el ritmo escrito con la barra espaciadora o en la pantalla; una línea de tiempo muestra dónde cayó cada toque respecto de cada figura.
  - *Dictado rítmico*: suena un ritmo y hay que elegir cuál de cuatro está escrito; si hay error, se marca dónde está la diferencia y se pueden escuchar los dos.
  - *Glosario*: unos 60 términos de ritmo con definición, ejemplo en el pentagrama y audio, con buscador y categorías.
- **Armonía**: armonía tonal y conducción de voces a cuatro partes, con los principios de *Harmony* de Walter Piston como referencia conceptual (textos propios).
  - *Recorrido*: 12 lecciones (también en Aprender): las cuatro voces, acordes de la tonalidad e inversiones, duplicación y disposición, tipos de movimiento, quintas y octavas paralelas, reglas generales y preferencias de estilo, el método para enlazar acordes, funciones y progresiones, la dominante y el V⁷, cadencias, y cómo armonizar bajos y melodías.
  - *Editor a cuatro voces*: sistema de dos pentagramas donde se toca para escribir o elegir una nota y se mueve con las flechas. En tiempo real muestra el acorde (numeral romano, inversión, función), qué nota del acorde es cada voz, intervalos entre voces, duplicación, disposición, tipo de movimiento hacia el acorde siguiente, la cadencia y los problemas de conducción, separados en reglas generales, preferencias de estilo y excepciones aceptadas, con el porqué y cómo corregirlos. Se escucha todo, un acorde, un enlace o cada voz sola (también soprano + bajo).
  - *Desafíos* en 8 niveles: enlaces de dos acordes, con inversiones, encontrar y corregir errores, cadencias, bajo cifrado, bajo sin cifrar, melodía y dominante con séptima. Se acepta cualquier solución que respete la conducción; hay pistas y una solución de ejemplo.
  - *Editor libre* con progresiones de ejemplo y *Progreso* (niveles, habilidades y errores más frecuentes).
- **Oído**: el entrenamiento auditivo original (adivinar intervalos, conocer intervalos y lectura rápida de notas) y una **playlist de intervalos** para aprender escuchando: cada intervalo suena tres veces desde Do, hay una pausa para adivinarlo, una voz dice cuál era y a los 3 segundos sigue otro. Se elige la forma (ascendente, descendente, juntas o una de cada), la pausa (3, 5 u 8 segundos) y qué intervalos entran. Funciona como un reproductor: sigue sonando con la pantalla bloqueada o en otra pestaña y se maneja desde los controles multimedia del sistema.

## Cómo funciona por dentro

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

Es una página estática: se abre `index.html` desde un servidor cualquiera (por ejemplo `python3 -m http.server`) y no hay que compilar nada. El progreso se guarda en el navegador (`localStorage`).

Samples de piano: Salamander Grand Piano (Alexander Holm, CC BY 3.0). Voz de la playlist: voz Laura de Windows (español de España). Pentagrama: VexFlow.
