# Deep Time Archive

An interactive, scroll-driven 3D journey through 186 million years of dinosaur evolution, presented as a sci-fi survey terminal. It starts with the Great Dying (252 MYA), follows the rise of the archosaurs and 15 key dinosaur species through the Triassic, Jurassic and Cretaceous, and ends with the Chicxulub asteroid impact (66 MYA) and the birds that survived it.

## Highlights

- **Particles to photoreal models.** Each specimen first forms as a 16,000-point hologram, then the particles settle onto the surface of a textured 3D model, which dissolves in head-to-tail behind a glowing scan edge. Drag to rotate; labels track anatomy in 3D.
- **Species index.** A full-screen archive (top-right "Species index" button) with era filters, chapter links and a card for every specimen that jumps straight to its reconstruction.
- **Living planet.** A shader-driven Earth whose continents drift from Pangaea toward their modern positions as you scroll, with clouds, atmosphere and a survey grid.
- **Impact sequence.** A pinned, scroll-scrubbed cinematic: the hologram disintegrates, an asteroid streaks in with a burning trail, then flash, shockwave, ejecta, a global fire front and impact winter.
- **Sci-fi HUD.** Live "MYA" readout, geologic timeline navigation, scramble-decoded labels, a custom cursor and optional synthesized sound (Web Audio, no audio files).
- **Content.** Species cards with age, size, diet, fossil site, a to-scale length ruler against a 1.8 m human, key adaptations and field notes, plus an animated family-tree decoder.

## 3D models

The 16 photoreal models were generated with Tripo H3.1 image-to-3D (via Higgsfield) from photoreal reference renders, which also serve as the index thumbnails. They stream from the generation CDN (CORS-enabled, immutable caching) and are loaded just ahead of the reader. While a model downloads, the procedural hologram (`js/dinosaurs.js`) stands in, and the HUD shows `MESH nn%`. If a model can't load, the hologram simply stays.

`js/models.js` normalises each GLB (principal-axis alignment, head-direction detection with per-species overrides in `js/data.js`, scale-to-fit), samples its surface for the particle target and patches its PBR material with the reveal shader.

To self-host, save optimised copies as `assets/models/<id>.glb` and `assets/thumbs/<id>.webp` and add the ids to `LOCAL_ASSETS` in `js/data.js`. For example, to compress with meshopt and convert textures to WebP:

```bash
npx @gltf-transform/cli optimize in.glb assets/models/trex.glb --compress meshopt --texture-compress webp --texture-size 1024
```

The epilogue bird stays a hologram.

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
js/models.js      GLB loading, normalisation, surface sampling, reveal shader
js/menu.js        Species index overlay
js/hud.js         Temporal readout, timeline marker, mesh progress, 3D-anchored annotations
js/content.js     Species card and scale ruler markup
js/audio.js       Synthesized ambience and effects
js/data.js        Species facts and era palettes
```

## Notes on accuracy

Figures are mid-range published estimates, and many (mass especially) remain debated. The holograms and AI-generated models are illustrative reconstructions, not scientific models.

Performance adapts automatically: phones and low-core devices use fewer particles and a lower pixel ratio, and resolution drops if the frame rate stays low. `prefers-reduced-motion` disables smooth scrolling and ambient CSS animation.
