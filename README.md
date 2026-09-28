# Aula de teoría musical

Una aplicación para **aprender** teoría musical, no solo para responder preguntas: explica cada concepto, lo muestra con ejemplos en el pentagrama y el teclado, lo practica con ayuda y después sin ayuda, y cuando hay un error explica por qué y propone otro ejercicio parecido.

Publicada en GitHub Pages: https://agustin58ruiz.github.io/Intervalos/

## Secciones

- **Aprender**: cuatro unidades con lecciones paso a paso.
  1. *Las notas*: nombres, notación anglosajona, teclado, tonos y semitonos, sostenidos/bemoles/becuadros, claves de Sol y de Fa, relación pentagrama-teclado.
  2. *Intervalos*: qué es un intervalo, cómo se obtiene el número (contando letras) y la calidad (contando semitonos): mayores, menores, justos, aumentados y disminuidos; construir intervalos.
  3. *Armaduras y tonalidades*: qué es una armadura, alteraciones accidentales, orden de ♯ y ♭, cómo reconocer la tonalidad, relativas menores y el círculo de quintas.
  4. *Intervalos con armadura*: el procedimiento completo en siete pasos.
- **Practicar**: ejercicios por tema o una práctica recomendada adaptativa. Cada error muestra la respuesta correcta, el procedimiento, dónde estuvo probablemente el error y un ejercicio parecido.
- **Evaluación**: 18 preguntas sin ayudas (lectura, intervalos, construcción, armaduras, tonalidades, alteraciones, intervalos con armadura y oído). Al final muestra el porcentaje, el tiempo, los conceptos dominados y con errores, y la evolución respecto de evaluaciones anteriores.
- **Oído**: el entrenamiento auditivo original (adivinar intervalos, conocer intervalos y lectura rápida de notas).

## Cómo funciona por dentro

Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

Es una página estática: se abre `index.html` desde un servidor cualquiera (por ejemplo `python3 -m http.server`) y no hay que compilar nada. El progreso se guarda en el navegador (`localStorage`).

Samples de piano: Salamander Grand Piano (Alexander Holm, CC BY 3.0). Pentagrama: VexFlow.
