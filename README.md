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
- **Evaluación**: preguntas sin ayudas sobre todo, sobre notas e intervalos (18: lectura, intervalos, construcción, armaduras, tonalidades, alteraciones, intervalos con armadura y oído) o sobre ritmo (13: tempo, figuras, silencios, compás, puntillo, compases compuestos, síncopa y dictado). Al final muestra el porcentaje, el tiempo, los conceptos dominados y con errores, y la evolución respecto de evaluaciones anteriores.
- **Ritmo**: práctica libre eligiendo compás, nivel, tempo y largo.
  - *Tocar el ritmo*: después de un compás de cuenta, se toca el ritmo escrito con la barra espaciadora o en la pantalla; una línea de tiempo muestra dónde cayó cada toque respecto de cada figura.
  - *Dictado rítmico*: suena un ritmo y hay que elegir cuál de cuatro está escrito; si hay error, se marca dónde está la diferencia y se pueden escuchar los dos.
  - *Glosario*: unos 60 términos de ritmo con definición, ejemplo en el pentagrama y audio, con buscador y categorías.
- **Oído**: el entrenamiento auditivo original (adivinar intervalos, conocer intervalos y lectura rápida de notas) y una **playlist de intervalos** para aprender escuchando: cada intervalo suena tres veces desde Do, hay una pausa para adivinarlo, una voz dice cuál era y a los 3 segundos sigue otro. Se elige la forma (ascendente, descendente, juntas o una de cada), la pausa (3, 5 u 8 segundos) y qué intervalos entran. Funciona como un reproductor: sigue sonando con la pantalla bloqueada o en otra pestaña y se maneja desde los controles multimedia del sistema.

## Cómo funciona por dentro

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

Es una página estática: se abre `index.html` desde un servidor cualquiera (por ejemplo `python3 -m http.server`) y no hay que compilar nada. El progreso se guarda en el navegador (`localStorage`).

Samples de piano: Salamander Grand Piano (Alexander Holm, CC BY 3.0). Voz de la playlist: voz Laura de Windows (español de España). Pentagrama: VexFlow.
