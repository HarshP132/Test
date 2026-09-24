// Content for the archive. Ages in millions of years ago (MYA).
// Measurements are published mid-range estimates; many vary between studies.

export const ERAS = {
  archive:    { name: 'Archive',    start: 252, end: 252,   accent: '#7df9ff', accent2: '#d4fdff' },
  permian:   { name: 'Permian',    start: 299, end: 252,   accent: '#ff6a4d', accent2: '#ffc27a' },
  triassic:   { name: 'Triassic',   start: 252, end: 201.3, accent: '#ffb547', accent2: '#ff7a3d' },
  jurassic:   { name: 'Jurassic',   start: 201.3, end: 145, accent: '#56f5b8', accent2: '#2fb8ff' },
  cretaceous: { name: 'Cretaceous', start: 145, end: 66,    accent: '#8fd8ff', accent2: '#b58cff' },
  impact:     { name: 'K–Pg',       start: 66.1, end: 66,   accent: '#ff4a3d', accent2: '#ffae3d' },
  cenozoic:   { name: 'Cenozoic',   start: 66, end: 0,      accent: '#7df9ff', accent2: '#e6fff7' },
};

export const SPECIES = [
  {
    id: 'euparkeria', code: 'PRE', era: 'triassic', mya: 245,
    name: 'Euparkeria', binomial: 'Euparkeria capensis',
    meaning: 'Named for zoologist William Kitchen Parker',
    clade: 'Archosauriformes', age: '~245 MYA · Middle Triassic',
    length: 0.6, lengthLabel: '~0.6 m', mass: 'A few kg (est.)', diet: 'Carnivore',
    locale: 'South Africa',
    features: [
      'Semi-erect limbs held closer under the body than a lizard’s',
      'Teeth set in deep sockets, a hallmark of the archosaurs',
      'Row of small bony plates (osteoderms) along the spine',
    ],
    fact: 'Euparkeria is not a dinosaur. Paleontologists study it as a snapshot of the early archosaur body plan that crocodiles, pterosaurs and dinosaurs all built upon.',
    annotations: [
      { anchor: 'eye', text: 'SOCKETED TEETH' },
      { anchor: 'back', text: 'OSTEODERM ROW' },
      { anchor: 'foot', text: 'SEMI-ERECT GAIT' },
    ],
  },
  {
    id: 'eoraptor', code: '01', era: 'triassic', mya: 231,
    name: 'Eoraptor', binomial: 'Eoraptor lunensis',
    meaning: '“Dawn plunderer”',
    clade: 'Saurischia · early', age: '~231 MYA · Late Triassic',
    length: 1, lengthLabel: '~1 m', mass: '~10 kg', diet: 'Omnivore',
    locale: 'Ischigualasto, Argentina',
    features: [
      'Two kinds of teeth: leaf-shaped for plants, curved and serrated for meat',
      'Five-fingered hands with three long grasping fingers',
      'Light, hollow-boned frame built for running on two legs',
    ],
    fact: 'Eoraptor is so primitive that scientists still debate whether it was an early theropod or an early sauropodomorph. The first dinosaurs looked remarkably alike.',
    annotations: [
      { anchor: 'jaw', text: 'MIXED DENTITION' },
      { anchor: 'hand', text: '5-FINGERED HAND' },
      { anchor: 'foot', text: 'BIPEDAL RUNNER' },
    ],
  },
  {
    id: 'herrerasaurus', code: '02', era: 'triassic', mya: 230,
    name: 'Herrerasaurus', binomial: 'Herrerasaurus ischigualastensis',
    meaning: '“Herrera’s lizard”, after rancher Victorino Herrera',
    clade: 'Saurischia · Herrerasauridae', age: '~231 MYA · Late Triassic',
    length: 5, lengthLabel: '~4–6 m', mass: '~210–350 kg', diet: 'Carnivore',
    locale: 'Ischigualasto, Argentina',
    features: [
      'Flexible joint in the lower jaw to grip struggling prey',
      'Long, three-fingered clawed hands for grasping',
      'One of the earliest large predatory dinosaurs',
    ],
    fact: 'Dinosaurs were still rare in its world. In the Ischigualasto rocks, rhynchosaurs and mammal-relatives far outnumber them.',
    annotations: [
      { anchor: 'jaw', text: 'SLIDING JAW JOINT' },
      { anchor: 'hand', text: 'GRASPING CLAWS' },
      { anchor: 'tail', text: 'COUNTERBALANCE TAIL' },
    ],
  },
  {
    id: 'coelophysis', code: '03', era: 'triassic', mya: 212,
    name: 'Coelophysis', binomial: 'Coelophysis bauri',
    meaning: '“Hollow form”, for its hollow bones',
    clade: 'Theropoda · Coelophysidae', age: '~215–208 MYA · Late Triassic',
    length: 3, lengthLabel: '~3 m', mass: '~15–25 kg', diet: 'Carnivore',
    locale: 'Ghost Ranch, New Mexico, USA',
    features: [
      'Hollow, bird-like bones kept it light and fast',
      'Long, narrow skull lined with small serrated teeth',
      'Among the earliest dinosaurs known to have a wishbone (furcula)',
    ],
    fact: 'In 1998 a Coelophysis skull flew aboard Space Shuttle Endeavour to the Mir space station, the second dinosaur fossil ever taken into space.',
    annotations: [
      { anchor: 'jaw', text: 'NARROW SNOUT' },
      { anchor: 'neck', text: 'S-CURVED NECK' },
      { anchor: 'back', text: 'HOLLOW BONES' },
    ],
  },
  {
    id: 'plateosaurus', code: '04', era: 'triassic', mya: 209,
    name: 'Plateosaurus', binomial: 'Plateosaurus trossingensis',
    meaning: '“Broad lizard”',
    clade: 'Sauropodomorpha', age: '~214–204 MYA · Late Triassic',
    length: 8, lengthLabel: '~5–10 m', mass: '~0.6–4 t', diet: 'Herbivore',
    locale: 'Germany, Switzerland, France',
    features: [
      'Long neck and small head with leaf-shaped teeth for stripping plants',
      'Walked on two legs; its hands could not turn palm-down to bear weight',
      'Large curved thumb claw, possibly for defense or feeding',
    ],
    fact: 'More than 100 skeletons have been found, some trapped upright in mud. Its relatives would go on to become the giant sauropods.',
    annotations: [
      { anchor: 'neck', text: 'LONG NECK' },
      { anchor: 'hand', text: 'THUMB CLAW' },
      { anchor: 'foot', text: 'BIPEDAL STANCE' },
    ],
  },
  {
    id: 'dilophosaurus', code: '05', era: 'jurassic', mya: 193,
    name: 'Dilophosaurus', binomial: 'Dilophosaurus wetherilli',
    meaning: '“Two-crested lizard”',
    clade: 'Theropoda · Neotheropoda', age: '~193 MYA · Early Jurassic',
    length: 7, lengthLabel: '~7 m', mass: '~400 kg', diet: 'Carnivore',
    locale: 'Arizona, USA',
    features: [
      'Paired, paper-thin bony crests along the top of the skull, likely for display',
      'Notch in the upper jaw behind the front teeth',
      'One of the largest predators of the Early Jurassic',
    ],
    fact: 'No fossil evidence supports the neck frill or venom spitting shown in Jurassic Park. The real animal was also far larger than the film version.',
    annotations: [
      { anchor: 'crest', text: 'TWIN CRESTS' },
      { anchor: 'jaw', text: 'NOTCHED JAW' },
      { anchor: 'foot', text: '3-TOED TRACKS' },
    ],
  },
  {
    id: 'stegosaurus', code: '06', era: 'jurassic', mya: 155,
    name: 'Stegosaurus', binomial: 'Stegosaurus stenops',
    meaning: '“Roofed lizard”',
    clade: 'Ornithischia · Thyreophora', age: '~155–150 MYA · Late Jurassic',
    length: 9, lengthLabel: '~9 m', mass: '~5–7 t', diet: 'Herbivore',
    locale: 'Morrison Formation, USA · Portugal',
    features: [
      '17 bony plates in two alternating rows along the back',
      'Four tail spikes, nicknamed the “thagomizer” after a 1982 Far Side cartoon',
      'Small, low-held head for browsing ferns and cycads',
    ],
    fact: 'More time separates Stegosaurus from T. rex (about 80 million years) than separates T. rex from you (66 million years).',
    annotations: [
      { anchor: 'plates', text: 'DORSAL PLATES' },
      { anchor: 'spikes', text: 'THAGOMIZER' },
      { anchor: 'eye', text: 'LOW BROWSER' },
    ],
  },
  {
    id: 'brachiosaurus', code: '07', era: 'jurassic', mya: 153,
    name: 'Brachiosaurus', binomial: 'Brachiosaurus altithorax',
    meaning: '“Arm lizard”',
    clade: 'Sauropoda · Brachiosauridae', age: '~154–150 MYA · Late Jurassic',
    length: 21, lengthLabel: '~18–22 m', mass: '~30–50 t', diet: 'Herbivore',
    locale: 'Morrison Formation, USA',
    features: [
      'Front legs longer than its hind legs, giving it a giraffe-like slope',
      'Air-filled (pneumatic) vertebrae linked to a bird-like breathing system',
      'Could browse treetops roughly 9 m or more above the ground',
    ],
    fact: 'The famous giant skeleton in Berlin’s natural history museum, long called Brachiosaurus, is now placed in its own genus: Giraffatitan, from Tanzania.',
    annotations: [
      { anchor: 'head', text: 'HIGH BROWSER' },
      { anchor: 'neck', text: 'AIR-FILLED VERTEBRAE' },
      { anchor: 'frontleg', text: 'LONG FORELIMBS' },
    ],
  },
  {
    id: 'allosaurus', code: '08', era: 'jurassic', mya: 151,
    name: 'Allosaurus', binomial: 'Allosaurus fragilis',
    meaning: '“Different lizard”, for its unusual vertebrae',
    clade: 'Theropoda · Allosauridae', age: '~155–145 MYA · Late Jurassic',
    length: 9, lengthLabel: '~8.5–9.7 m', mass: '~1.7–2.3 t', diet: 'Carnivore',
    locale: 'Morrison Formation, USA · Portugal',
    features: [
      'Short horn-like crests above and in front of the eyes',
      'Wide gape; may have struck prey with open jaws like a hatchet',
      'Strong three-fingered arms with large curved claws',
    ],
    fact: 'The specimen nicknamed “Big Al” shows 19 broken or infected bones, a record of how hard a predator’s life could be.',
    annotations: [
      { anchor: 'eye', text: 'BROW HORNS' },
      { anchor: 'jaw', text: 'HATCHET STRIKE' },
      { anchor: 'hand', text: 'THREE CLAWS' },
    ],
  },
  {
    id: 'archaeopteryx', code: '09', era: 'jurassic', mya: 150,
    name: 'Archaeopteryx', binomial: 'Archaeopteryx lithographica',
    meaning: '“Ancient wing”',
    clade: 'Paraves · Avialae', age: '~150 MYA · Late Jurassic',
    length: 0.5, lengthLabel: '~0.5 m', mass: '~0.5–1 kg', diet: 'Carnivore',
    locale: 'Solnhofen, Bavaria, Germany',
    features: [
      'Asymmetrical flight feathers on broad wings',
      'Still had teeth, clawed fingers and a long bony tail',
      'A wishbone, like modern birds',
    ],
    fact: 'Its first skeleton was described in 1861, two years after Darwin’s On the Origin of Species. It became one of the most famous transitional fossils ever found.',
    annotations: [
      { anchor: 'wing', text: 'FLIGHT FEATHERS' },
      { anchor: 'jaw', text: 'TOOTHED JAW' },
      { anchor: 'tail', text: 'BONY TAIL' },
    ],
  },
  {
    id: 'spinosaurus', code: '10', era: 'cretaceous', mya: 97,
    name: 'Spinosaurus', binomial: 'Spinosaurus aegyptiacus',
    meaning: '“Spine lizard”',
    clade: 'Theropoda · Spinosauridae', age: '~99–93 MYA · Late Cretaceous',
    length: 14.5, lengthLabel: '~14–15 m', mass: '~7 t (est.)', diet: 'Fish & prey',
    locale: 'Egypt · Morocco',
    features: [
      'A sail of spines up to about 1.65 m tall along its back',
      'Long, crocodile-like snout with cone-shaped teeth for gripping fish',
      'Paddle-like tail, suggesting it spent much of its life in water',
    ],
    fact: 'The original fossils were destroyed in a 1944 Allied bombing raid on Munich. For decades Spinosaurus was known mostly from drawings and photographs.',
    annotations: [
      { anchor: 'sail', text: 'NEURAL SPINE SAIL' },
      { anchor: 'jaw', text: 'FISH-GRIP SNOUT' },
      { anchor: 'tail', text: 'PADDLE TAIL' },
    ],
  },
  {
    id: 'argentinosaurus', code: '11', era: 'cretaceous', mya: 95,
    name: 'Argentinosaurus', binomial: 'Argentinosaurus huinculensis',
    meaning: '“Argentine lizard”',
    clade: 'Sauropoda · Titanosauria', age: '~97–93 MYA · Late Cretaceous',
    length: 32, lengthLabel: '~30–35 m', mass: '~65–75 t', diet: 'Herbivore',
    locale: 'Neuquén, Argentina',
    features: [
      'One of the largest land animals that has ever lived',
      'Column-like limbs to carry the weight of a dozen elephants',
      'Very long neck to sweep huge areas of vegetation without walking',
    ],
    fact: 'Its size is estimated from only a handful of bones. A single back vertebra stands about 1.6 m tall.',
    annotations: [
      { anchor: 'back', text: '1.6 M VERTEBRAE' },
      { anchor: 'frontleg', text: 'COLUMNAR LIMBS' },
      { anchor: 'neck', text: 'SWEEP-FEEDING NECK' },
    ],
  },
  {
    id: 'velociraptor', code: '12', era: 'cretaceous', mya: 73,
    name: 'Velociraptor', binomial: 'Velociraptor mongoliensis',
    meaning: '“Swift seizer”',
    clade: 'Theropoda · Dromaeosauridae', age: '~75–71 MYA · Late Cretaceous',
    length: 2, lengthLabel: '~2 m', mass: '~15–20 kg', diet: 'Carnivore',
    locale: 'Gobi Desert, Mongolia',
    features: [
      'A raised, sickle-shaped claw about 6.5 cm long on each foot',
      'Feathered: its forearm bones carry quill knobs where feathers anchored',
      'Stiffened tail for balance while running and turning',
    ],
    fact: 'The 1971 “Fighting Dinosaurs” fossil shows a Velociraptor locked in combat with a Protoceratops, probably buried by a collapsing sand dune.',
    annotations: [
      { anchor: 'claw', text: 'SICKLE CLAW' },
      { anchor: 'hand', text: 'QUILL KNOBS' },
      { anchor: 'tail', text: 'STIFF TAIL' },
    ],
  },
  {
    id: 'ankylosaurus', code: '13', era: 'cretaceous', mya: 67.5,
    name: 'Ankylosaurus', binomial: 'Ankylosaurus magniventris',
    meaning: '“Fused lizard”',
    clade: 'Ornithischia · Ankylosauria', age: '~68–66 MYA · Late Cretaceous',
    length: 7, lengthLabel: '~6–8 m', mass: '~4.8–8 t', diet: 'Herbivore',
    locale: 'Western North America',
    features: [
      'Body armored with bony plates (osteoderms) set into the skin',
      'Heavy bony tail club that could swing with bone-breaking force',
      'Wide, low body with a broad beak for cropping plants',
    ],
    fact: 'Its species name, magniventris, means “great belly”. A huge gut fermented tough plant food.',
    annotations: [
      { anchor: 'club', text: 'TAIL CLUB' },
      { anchor: 'back', text: 'OSTEODERM ARMOR' },
      { anchor: 'eye', text: 'HORNED SKULL' },
    ],
  },
  {
    id: 'triceratops', code: '14', era: 'cretaceous', mya: 67,
    name: 'Triceratops', binomial: 'Triceratops horridus',
    meaning: '“Three-horned face”',
    clade: 'Ornithischia · Ceratopsidae', age: '~68–66 MYA · Late Cretaceous',
    length: 8.5, lengthLabel: '~8–9 m', mass: '~6–12 t', diet: 'Herbivore',
    locale: 'Western North America',
    features: [
      'Two brow horns about 1 m long and a short nose horn',
      'A solid bony frill, one of the largest skulls of any land animal',
      'Dental batteries of hundreds of stacked, self-replacing teeth',
    ],
    fact: 'Some Triceratops fossils carry healed T. rex bite marks. Those individuals survived an attack by the tyrant.',
    annotations: [
      { anchor: 'horn', text: '1 M BROW HORNS' },
      { anchor: 'frill', text: 'BONY FRILL' },
      { anchor: 'jaw', text: 'DENTAL BATTERY' },
    ],
  },
  {
    id: 'trex', code: '15', era: 'cretaceous', mya: 66.5,
    name: 'Tyrannosaurus', binomial: 'Tyrannosaurus rex',
    meaning: '“Tyrant lizard king”',
    clade: 'Theropoda · Tyrannosauridae', age: '~68–66 MYA · Late Cretaceous',
    length: 12.3, lengthLabel: '~12–13 m', mass: '~8–9 t', diet: 'Carnivore',
    locale: 'Western North America',
    features: [
      'Estimated bite force of 35,000–57,000 N, the strongest of any known land animal',
      'Forward-facing eyes gave it binocular, depth-perceiving vision',
      'Tiny two-fingered arms, but a massive skull up to about 1.5 m long',
    ],
    fact: '“Sue”, the most complete T. rex ever found at about 90% of the skeleton, sold at auction in 1997 for $8.36 million.',
    annotations: [
      { anchor: 'jaw', text: 'BITE ≈ 35–57 kN' },
      { anchor: 'eye', text: 'BINOCULAR VISION' },
      { anchor: 'hand', text: 'TWO-FINGERED ARMS' },
    ],
  },
];

export const BIRD = {
  id: 'bird',
  annotations: [
    { anchor: 'wing', text: 'FEATHERS · 150+ MYR' },
    { anchor: 'head', text: 'THEROPOD DESCENDANT' },
  ],
};

export const LENGTH_MAX = 36; // metres, scale ruler maximum

// Photoreal models, generated with Tripo H3.1 image-to-3D from reference images.
// Each loads from assets/models/<id>.glb when present, otherwise from the generation CDN.
// flip / headLow correct the automatic head-end detection for these body shapes.
const MODEL_CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_37bkw7MyT63LckpQcXTvoyynvvk/';
const MODEL_FILES = {
  euparkeria: 'hf_20260924_090033_6fff7758-8ce2-4f84-ae33-ad2342a9b2b2',
  eoraptor: 'hf_20260924_090036_b0878eb8-00f9-47f0-9ff9-a75e1b0112ab',
  herrerasaurus: 'hf_20260924_090041_9f8f5f09-9f01-462b-a934-29a075d6d4c7',
  coelophysis: 'hf_20260924_090045_b18c5036-03c1-4845-87aa-5bc7f7587919',
  plateosaurus: 'hf_20260924_090048_302ea259-4bc0-417f-8800-4252170982d3',
  dilophosaurus: 'hf_20260924_090053_304b3052-1cd4-42f0-93e2-5188172e0210',
  stegosaurus: 'hf_20260924_090058_f7c2765a-8010-494e-975a-7fba91ad782e',
  brachiosaurus: 'hf_20260924_090101_fc94c5c0-ff86-48ce-9099-b3d43bcd9764',
  allosaurus: 'hf_20260924_090109_7cac5c92-c7d6-4612-b619-aa231c020a10',
  archaeopteryx: 'hf_20260924_090113_77353541-72c1-46d6-877b-9660bd9be257',
  spinosaurus: 'hf_20260924_090117_06c4c38b-08bc-46dc-acbf-ab120d628f75',
  argentinosaurus: 'hf_20260924_090123_920569c2-4f40-41d4-89ce-998b9a7e77f2',
  velociraptor: 'hf_20260924_090127_70ac8c94-37cf-4f15-83a9-8d77ab8b6657',
  ankylosaurus: 'hf_20260924_090131_e0ef3bf7-bfc4-4a2f-9d37-ed97630139f7',
  triceratops: 'hf_20260924_090135_e50bd11e-3bfe-47b2-a633-5bec831b5aa2',
  trex: 'hf_20260924_090022_94eef19d-450b-4605-bb05-521e434ef6e8',
};
export const MODELS = Object.fromEntries(
  Object.entries(MODEL_FILES).map(([id, f]) => [id, { sources: [`assets/models/${id}.glb`, `${MODEL_CDN}${f}.glb`] }])
);
MODELS.stegosaurus.headLow = true;
MODELS.velociraptor.flip = true;
MODELS.ankylosaurus.flip = true;
