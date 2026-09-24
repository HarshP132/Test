# Deep Time Archive

An interactive, scroll-driven 3D journey through 186 million years of dinosaur evolution, presented as a sci-fi survey terminal. It starts with the Great Dying (252 MYA), follows the rise of the archosaurs and 15 key dinosaur species through the Triassic, Jurassic and Cretaceous, and ends with the Chicxulub asteroid impact (66 MYA) and the birds that survived it.

## Highlights

- **Holographic specimens.** Every animal is built procedurally from tubes, ellipsoids and sheets (`js/dinosaurs.js`), sampled into a 16,000-point cloud, and morphed between species on the GPU. Drag to rotate; labels track anatomy in 3D.
- **Living planet.** A shader-driven Earth whose continents drift from Pangaea toward their modern positions as you scroll, with clouds, atmosphere and a survey grid.
- **Impact sequence.** A pinned, scroll-scrubbed cinematic: the hologram disintegrates, an asteroid streaks in with a burning trail, then flash, shockwave, ejecta, a global fire front and impact winter.
- **Sci-fi HUD.** Live "MYA" readout, geologic timeline navigation, scramble-decoded labels, a custom cursor and optional synthesized sound (Web Audio, no audio files).
- **Content.** Species cards with age, size, diet, fossil site, a to-scale length ruler against a 1.8 m human, key adaptations and field notes, plus an animated family-tree decoder.

## Stack

- [Three.js](https://threejs.org/) r186 with `EffectComposer`, `UnrealBloomPass` and a custom post-processing pass
- [GSAP](https://gsap.com/) 3.15 with ScrollTrigger, SplitText and ScrambleTextPlugin
- [Lenis](https://lenis.darkroom.engineering/) smooth scrolling

All libraries load from the jsDelivr CDN. There is no build step.

## Run locally

ES modules need to be served over HTTP (opening `index.html` from disk will not work):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL. GitHub Pages works out of the box: enable Pages for the branch and root folder.

## Structure

```
index.html        Page structure and narrative copy
css/style.css     Visual system, HUD, responsive layout
js/main.js        Boot, loader, Lenis + ScrollTrigger choreography, impact timeline
js/world.js       Renderer, camera, post-processing, scene layouts per section
js/planet.js      Planet, clouds, atmosphere, orbit rings, continental drift
js/specimen.js    Hologram point cloud, morphing, projector pad
js/dinosaurs.js   Procedural anatomy for all specimens
js/impact.js      Asteroid, trail, shockwave, flash and debris
js/shaders.js     GLSL (noise, planet, hologram, FX, post)
js/hud.js         Temporal readout, timeline marker, 3D-anchored annotations
js/content.js     Species card and scale ruler markup
js/audio.js       Synthesized ambience and effects
js/data.js        Species facts and era palettes
```

## Notes on accuracy

Figures are mid-range published estimates, and many (mass especially) remain debated. The holograms are stylized procedural reconstructions for illustration, not scientific models.

Performance adapts automatically: phones and low-core devices use fewer particles and a lower pixel ratio, and resolution drops if the frame rate stays low. `prefers-reduced-motion` disables smooth scrolling and ambient CSS animation.
