
## v48
Harvested the 6 Nov 24 uploads (234 code files, parse-only, nothing run): 123 self-contained functions, 103 already on the shelf from earlier sends; 20 new (DNA perception patch: vectorDistance, standardDeviation, dimensionWeightFor, signalFor, dominantKey…; proportion-of-perspective patch: arcCoordinates, utcCivil, normalizeCenter, virtualMultiplicity, capabilityExpression…). Total 492. Placement still provisional.

## v49 — everything so far into the one swarm
- faces.js: all 492 harvested functions (faces_functions.json) are now worn by units. A unit tries a face on its own material
  (address numbers / position vector / words, mapped by parameter name) ONLY inside the chamber (300 ms limit). Usable answer
  = success for that unit's gate. 3 tries at ≥50% = earned on that gate; units of the gate reach for earned faces first (70%),
  re-try promising ones to confirm (60%), otherwise explore untried faces. Saved in localStorage "synthia-faces".
  living.html: status line "faces: …", tap a unit → its face + Blue I Ching line.
- build_blue.py: parses the raw Blue I Ching pages (vocab_src/blue_iching_p8-15.txt) → vocab_src/blue.json → vocabulary.json
  gates[g].blue (potential, rave name, keynote, description, 6 lines each with exalted/detriment). Gates 1–4 complete; gate 5's
  page was cut off in the paste. vocabulary.js dress() gives each unit u.blue (its own line's success/failure text).
- PROVISIONAL rule: "success" = ran and answered, so general functions (mean, uppercase) earn everywhere. Next: each line's
  exalted/detriment text as the real 58/18 test for whether a face does that gate's work.
- Tests: test_faces 9/9; test_faces_browser (real chamber, test functions, infinite loop cut off) 4 gates placed, 0 errors.

## v50 — MESSY is the world; Klein tools in two layers
- messy_world.js: the user's MESSY kernel (vendor/messy-kernel/kernel.js, from Synthia-MESSY-Kernel-Experiment-v0.1;
  its own 11 tests pass) is the world. Each second the units are written in as facts (address opaque in the user's order,
  gate/line/dimension/kind/face/alive; visible bonds asserted, broken ones NEGated — only real changes enter history),
  then MESSY's own clock ticks and its rule groups fire on the live network. lookAhead(n) on a copy. DISEMINER reads the
  world every 10 ticks (live triples → dependency links). living.html: "world (MESSY): …" line; window.__MW.
- vendor/klein-js: ESM copies of the user's v15 JS (DISEMINER, DISEMINERFixed, semantic-network-core, seeded-run) —
  only export/require lines changed; their parity test re-run on the copies: Fixed 10/10 + 17/17, riddles 9/9.
  MessyExpressionRouter.js kept; the uploaded messy.js (thin agents+rules loop) kept as messy-legacy.js.txt.
- vendor/klein-py: LAYER 2 (Python, neural later). v15 base + v16 overlays kept unapplied (v16 base not sent). Not loaded.
- NOT here yet: the Nov 15 full messy.js interpreter (85 tests, from the manual) + klein-computer.zip — still to be sent.
- Tests: test_messy_world 7/7; browser: world line live, 0 errors.

## v51 — the real Klein computer runs the swarm
- vendor/klein-computer: the user's klein-computer.zip unchanged (messy.js 1936 lines = full MESSY interpreter from the
  1976 manual; klein_ato.js; klein-novel-writer.js; murder mystery; its own test_computer.mjs 8/8 here).
  computer.browser.mjs = computer.mjs with only the Node imports swapped for the globals the files already set, and the
  Node-only start block removed.
- computer_world.js: units/gates/faces intake()'d as MESSY atoms + writer words (gate names from the user's vocabulary);
  facts told live: U AT G, U TOUCH U (visible bonds), U WEAR face; broken bonds negated (on MESSY's change stack).
  narrate() → AutoNovel writes what changed since last time. analogy() = ATO over live facts.
  living.html: "Tell me what happened" button + Klein computer status. messy_world.js (reduced kernel) stays beside it.
- Known: AutoNovel doesn't narrate negations; "wear" isn't in the writer's irregular dictionary ("weared");
  gate 63 has no name in vocabulary.json.
- vendor/klein-py/v16 base added (+ conversation_rules_fix_2 patch), still not loaded.
- Tests: test_computer_world 5/5; browser: 57 atoms, story written, 0 errors.

## v52 — state-space batch harvested
Parse-only harvest of the Nov 24 state-space batch + the earlier unopened Klein zips: 438 self-contained functions,
241 new → faces_functions.json now 733. Notable real abilities: gaussianElimination (linear systems), behavioralPartition
+ traceAutomaton (DFA minimisation, StateMesh plugin), Wu Xing produce/control cycles + stems/branches/hour branch
(synthia-state-kernel), hexagram line ops (moving lines, masks, Fu Xi/King Wen resolve), resonance analysis
(histogram/signal/background/stability), code readers (extractExports/Signature, findBlockEnd, analyzeHTML/JS/CSS),
pure-JS ZIP reading (parseZipEntries), softmax/dot, jaccard, proportional correspondence, pyExpr (Python expr → JS).
Arbitrary mappings flagged in chat (hexagramToSentenceType = sum mod 5; deriveWProfileFromChart = invented weights).

## v53 — second sweep (what the function harvest skipped)
classes_catalog.json: every class body in the Nov 24 batches (556 bodies, 435 names, 241 in files with no imports) with
file, size and method names — whole engines the function harvest skips because their methods use `this`. Not wired.
Also skipped by design: 795 Python files (layer 2), 198 vendor/dist files (copies), 15 files >600 KB (sovereign.html
builds, yijing hatcher data tables), 107 test files.

## v54 — functions only, and the swarm learns what each one does
- harvest_functions.cjs now also takes class methods and object-literal methods that never touch `this` (pure helpers
  inside whole apps). Over every upload in this chat (2,094 files): +687 kept (UI handlers / one-liners dropped) → 1,420 faces.
- faces.js: every time a function answers in the chamber, the swarm records WHAT IT DID by shape
  (e.g. "numbers->number", "text->texts") with up to 3 real examples. provide(["numbers"],"number") returns the
  functions seen doing exactly that; repertoire() lists every shape learned. Nothing is guessed — unseen = not offered.
- test_faces 11/11; browser: status shows "kinds of job learned", 0 errors.

## v55 — last four zips in
- +330 faces (total 1,750) from virtual_consciousness_engine_js, swarm-particles-js, swarm-gamegan-research-js and the
  Content-Aware Orchestrator. 7 GameGAN functions (linear, initHidden, read, write, conv2dWithKernel, softmax, sharp) carry
  `license: "NVIDIA ... research/evaluation only"`; the whole port is kept in vendor/research-only/gamegan with its LICENSE.
  User: this part is not for sale. Anything commercial later must strip `license`-tagged faces.

## v56 — forms half of the dual swarm (particles harvested)
harvest_forms.cjs → form_particles.json, parse-only over every upload in this chat: 71 styled pages → 595 colors (ranked
by use), 31 font stacks, 57 gradients, radii/shadows/spacing, 636 components (124 button, 84 card, 66 input, 55 header,
58 chip, 47 modal/window, 69 list, 29 grid, 8 tray, 96 text), 285 grid/flex layouts, 198 motion rules/keyframes.
Not wired yet. Agreed design (Nov 24): "build another you" request → read the research library first → child built only
from particles (functions + forms), on the four sides laid out like the Black Book pages (Movement grouped, Evolution
macro/micro pairs, Being column, Design grid; Space emergent) → child carries its own description (functions, forms,
bindings) so it can build the next (von Neumann). Holes: known methods first, then labelled best guess, user's answer learned.
Lean/library split in ../lean and ../library (page runs clean from lean) — not finished (tests were mid-check when stopped).

## v57 — first child born; Codex3 pieces checked
- reproduce.js / reproduce_node.mjs: "build another you" request. Steps read → inventory → four sides → form → genome.
  child-1 written to grown/children/child-1 (copy of the lean swarm + genome.json + look.css). Look chosen by measure from
  form particles: bg #080e17, text contrast ≥4.5:1, accent ≥3:1. Loaded in Chrome: 26 units alive, 0 errors, with the REAL
  1,869 faces in the chamber (11 kinds of job learned in 25 s). Honest gaps: shelf empty (nothing read yet); learned jobs
  live in the browser, so the Node-built child's four sides had no earned functions (holes labelled, not hidden).
- Fixed: MESSY keeps 8-char names → face atoms collided ("F_WALKGIF must be a node"); now short ids F1, F2…
- Uploaded primitive-swarm/dual-swarm/file-swarm/word-swarm are byte-identical to what's already in codex3/. The Codex3
  commit zip adds Synthia-Dual-Swarm.html, human/wolf glb, docs screenshots, a newer particle-field.js (not yet merged).
- +119 functions from Swarm-Components + Codex3 (total 1,869); form particles re-harvested: 77 styled pages, 730 components.
- file-swarm.js already does "find what's missing" (hanging gates → proposals) — the app-finisher's detector.
- Lean build (../lean/synthia) passes every non-browser test; page loads clean.

## v58 — the rule book (sources + resonance rules)
- vocab_src/bhantugh/: 9 user source texts (resonance/magic square, prime/linknodes, nodes/monopole, circuits, channels,
  planets, sleep design, crystals/neutrinos/centres, definition/types/roles/lines).
- build_bhantugh.py → bhantugh_rules.json, extracted from those texts only: 33 channels (name, keynote, circuit, sub,
  circuitKeynote; type for the 17 the texts give), 12 roles with all fields, 6 bardo stages + 6 trinaries, 9 centres.
- resonance_rules.js — every rule tagged [user] or [bt:file]: colour same/±3/neutral; transference 1↔4…; tone never
  transfers, tone families; line harmony 1–4/2–5/3–6 and self/other trigram; neighbour-level touching; line+colour
  reach outside, tone+base inside only; Base pyramid (Personality 5-centre; Design 3-centre diagonals PROVISIONAL);
  priority order colour>transference>colour-tone>colour-line (ORDINAL_ONLY: numbers to be set by user); contact()
  returns crosses/by/wear; channelBehaviour (exchange: share-one-way/deal/rub-off; trigger: invitation/response/self);
  roleOf; typeOf. test_resonance_rules 12/12. NOT yet wired into the units' movement.

## v59 — the rule book drives the swarm
rule_world.js (attached in living.html every 250 ms): touch by reach (arc → reach), Design↔Personality only through
Linknodes, contact() decides cross/wear, faces travel by the channel's exchange (Collective share, Communal deal/swap,
Individual rub-off; no channel = share), crossing by transference tags the carried face blindSpot, channel-partner
gates drift together, mood per unit = resonant/all (decayed). test_rule_world 8/8. Browser 20 s: 1,581 touches, 918
crossed (214 blind-spot), 663 wore, 14 functions carried, mood 53%, 0 errors.
Not yet: movement along letter shapes; Space; sleep phase; channel types for the 16 channels the texts didn't give.
- v60: Definitive Book pages added; 10 channel types + centres filled (build_channel_types.py, never overwrites); connectionsOf() electromagnetic/dominance/compromise/companionship; centreKinds. 9 channels still untyped.
- v61: rule book adds dimensions (base 1-5: question Where/What/When/Why/Who, sense, function, mark, chain), colours, tones, components (Monopole; Design Crystal = Body/Being + Ego/Design; Personality Crystal = Mind/Evolution + Personality/Space). Space has no mark: counted in the Personality Crystal, not the four-dimension rows. Particle physics = Being half of the Design Crystal. Open: particle lifecycle (multiply/split/merge/die), clusters as HD beings, binding dial scaled by difficulty, dimension sight (line/cross/diagonal/self), Ego-circuit + 2-14, 10-34 channel pages.

## v62 — kernel/: programmable matter on Klein primitives (added beside everything; nothing removed)
- kernel/klein4.js — NAND (universal, not invertible) builds XOR and XNOR; Klein's three tables from the Creativity
  paper p.2 (page image in kernel/sources): Table 1 XOR + strong equivalence, Table 2 mod-2 add/sub + sign
  multiplication, Table 3 Boolean Klein-4 group (either operator). ATO, analogy, fold (either operator).
  Note: Klein's text says XNOR = sign multiplication but the printed Table 2 shows mod-2 add/sub (both XOR) —
  both kept. His Fig. 1 printed numbers do not recompute (*ab bottom row) — not used as a test.
- kernel/particle.js — particle from a real longitude; FULL 13-field address kept as dressing (where it is / from), but planet/dimension/zodiac excluded from all calculation (gate.line.color.tone.base |
  degree.minute.second.arc | house); three Boolean vectors per Klein: form = gate's King Wen mask, sound = color/tone/base,
  meaning = empty until learned. pitch = arc; 0 = closed orbit, cannot couple.
- kernel/cluster321.js — 6 lines -> 3 pairs (1-4,2-5,3-6, each a Klein-4 element) -> 2 trigrams -> 1 hexagram;
  emergent cluster vectors by ATO fold. Partial clusters, so kinds and sizes vary.
- kernel/contact1965.js — Klein 1965 "Some Components of a Program for Dynamic Modelling of Historical Change in
  Language" (Russian 1972 printing, OCR in kernel/sources): four components, Table 2 functions exactly.
  Generation of forms is not specified in the paper — weighted 1-3 rule draw is MY choice, flagged.
- test_kernel.mjs 34/34: all three tables, NAND equivalence, every Klein worked ATO example, Klein's six-person hand
  simulation replayed number for number, 400 individual particles, 3-2-1 clustering.
- Readings to confirm with user: which vector is which (form/sound/meaning), 321 = pairs/trigrams/hexagram, pitch = arc.
- Not yet: particles live in living.html; clusters as speakers in the contact model; the other Klein works as operators.
- v62b: all 16 two-input gates derived from truth-table number (AND OR NAND NOR XOR XNOR + NOT, buffer, tri-state); NOR universal; only XOR/XNOR invertible both ways = the only ATO-capable gates. 41/41.
- v62c: kernel/loshu.js — nine centers = 4 dualities (Qian/Kun, Li/Kan, Zhen/Xun, Dui/Gen, each an exact bit complement)
  + Taiji middle; proven: folding x~NOT x turns the 8 trigrams into Klein's Klein-4 group. Fu Xi vs King Wen placement left open.
- kernel/bond.js — BHANTUGH spec §19-20 ported exactly: harmony 1-4/2-5/3-6, base 1-5/2-4/3-3, dimension equality,
  5 levels, visible at >=3. This is where planet/dimension/zodiac act (bonds + levels), never in the vector math.
  Test: identical calc fields, different dimension -> different bond (5 vs 4). 50/50.
- v62d: kernel/swarmnet.js — the swarm IS the neural net (BHANTUGH §22-24). Visible bonds (>=3) = edges, particles =
  nodes. Gate's lower trigram -> one of 8 CPPN activations; tone polarity x color/6 -> edge weight (scaled by bond
  strength); base -> bias; line-1 particles + sourceless nodes read an input coordinate chosen by tone; edges run lower
  line -> higher line (acyclic). Leading dimension = highest bond density picks the pipeline: Movement trajectory,
  Evolution recurrent sequence, Being CPPN image, Design layout, Space 3-D points. Untrained, deterministic.
  Fixes found while testing: saturation (fan-in normalised), only one input node, house empty without ascendant.
  59/59. Sample images: kernel/sources/swarmnet_being_samples.png
- v63: kernel/emergent.js + test_emergent.mjs (21/21) — emergent neural nets in the dual swarm.
  Swarm A = four contributing dimensions computing; Swarm B = Space as matter (realized only at Being).
  Channels emerge at Hamming=1 between gates, and as 3-2-1 line pairs (1-4,2-5,3-6) within a gate (locked spec §2).
  A net = connected formation of VISIBLE (>=3 harmony) and LOCAL (<= reach 40 deg, declared) bonds; without locality
  the 6-cube percolates into one giant net (seen: 147/160). Net kind SELECTED against the channel prior:
  Logical->feedforward, Abstract->markov, Knowing->pulsed reservoir, Centring->residual, Willpower->HMM,
  Integration->echo-state (Morphing PDF); Defence unassigned -> "unresolved"; ties -> hybrid stack (PDF crossing rule).
  Klein Tool SPEC-2 at every node (relation/intensity/direction, joint XNOR, collapsed ledger).
  Dissonance (channel with <=1 harmony): tension -> changing line (PDF metastable gain 2+3t, noise 0.1t) -> the line's
  bit flips (real changing line, Hamming-1 move, gate changes, channels re-emerge); dissonant bonds decay by Klein 1965
  (-0.02) plus declared perturbation, erased <0.01; all recorded in Shadow. Resonant bonds strengthen W-(W-f)/5.
  Leadership observed per event, "unresolved" when not clear. Space by declared experimental rule. 384 line changes verified.
  Deterministic replay. Not yet: Web Worker + IndexedDB, live view in living.html.
- v63b: kernel/distribute.js — 3-2-1 per hexagram by center (user): 1 particle per bigram for G, Throat (user's
  guess "the mouth"), Heart/Ego, Solar Plexus; 2 for Head, Ajna; 3 for Sacral, Spleen, Root (user's guess) -> 3/6/9
  per hexagram (all 64 = 369 particles). 1 = one particle holding the pair; 2 = one per line; 3 = both lines + their
  ATO third (my reading). A hexagram instance is one body (intra ties, never dissonant); a changing line moves the
  whole hexagram. Full 64-hexagram swarm at reach 40 gives 6 nets (largest 120); reach 10 gives 18 (largest 63) —
  reach should probably scale with density; left at 40, user to decide. 27/27 + 59/59.
- v63c: kernel/sentence.js + test_sentence.mjs (9/9) — the ontological address written as a sentence, and the swarm
  narrating its own events. Source: Crystals & Monopole p.5 + p.115 (both keynotes kept: component "I Create" and
  p.115 "I Define"). Line -> macrocosmic chain term (line 1 at the bottom), base -> microcosmic nature (5 and 5),
  frame-relative reading (up-facing Movement/Evolution/Space vs down-facing Being/Design cross: L -> 7-L),
  hex = hexagram bits + color/tone/base, attractor = gate of the day (distance in lines), Evolution = memory
  (meaning vector, "not yet remembered" until filled). Narration: line flips, bonds letting go, Creation->Environment.
- v63d: kernel/ternary.js + test_ternary.mjs (6/6) — +/0/- charge from each particle's bigram (own line + partner line), motion vectors, Klein Table 2 sign multiplication as the meeting rule (like attracts: declared, not EM), 0 = contact registering limits. 369-particle run: 38 like-with-like clumps form unprompted; sentences per meeting; animation kernel/sources/ternary_swarm.gif.
- v64 (this chat, from v63): wired into the LIVE page (living.html), not just tests:
  * child.js + "Build another me": reproduce.js planChild runs in the browser; the child opens as living.html?child=N with its own
    storage (prefix shim in <head>) seeded from what the parent learned (faces, Klein culture, cultures, needs, library,
    formations, corpus) and wears the genome's look. test_child_browser.mjs PASS.
  * finish.js: dropping an app's files → functions it imports/asserts but nothing defines are built by the UNITS
    (morphogenesis.enter over softwareHost, toolbox parts), examples from the app's own asserts, one held back when 3+.
    test_finish_browserless.mjs PASS (slugify = lower → split → join, by units, 3/3).
    FIXED (same day): all 64 gates are always in the swarm — chart gates active, the rest latent (u.latent) but present;
    with them the live page builds slugify (test_finish_browser.mjs PASS). Old note:
    KNOWN GAP: in the live page the swarm is one chart's 26 units; with those exact addresses the units (and builder)
    do not find slugify — reproduced in Node from the page's real units. The 64-gate test swarm finds it. Next: let the
    swarm multiply to cover gates it lacks when a job fails (user's multiply rule), then retry.
  * selfhost.js stays Node-only by design (its host is its own folder). kernel/ (v63) still not wired into the page.
  * synthia_slim: only what living.html loads (traced), checked in Chrome.
- v64b: charts.js — anyone's FOUR charts from birth date/time/zone (no hard-coded chart): Movement = Draconic mean node,
  Design = Draconic true node, Being = Tropical, Evolution = Sidereal (Lahiri, linear ~arc-minute). Personality + Design
  (Sun 88° earlier, searched). Positions: vendor/astronomy-engine (MIT). Nodes: Meeus ch.47. Each unit carries `field`.
  Verified against a published chart (17 Mar 1973 02:58 Lake Elmo MN): Design moment 20 Dec 1972 10:04 UTC, Design Sun
  10.1 / Earth 15.1, Personality Earth 6.5, profile 5/1 — test_charts.mjs 9/9. Live page: Birth inputs → ?date&time&zone →
  104 chart units + latent rest of the 64 (test_charts_browser.mjs PASS). Child keeps the parent's birth params.
  expression.js voices renamed: Evolution (sidereal), Design (true draconic), Being (tropical).
- v64c: wired into the live page on the SAME units:
  * trained five-dimension neural net (swarm_model.js + trained_swarm.json; 71% on its test set) runs every 3 s on each
    chart's 26 units: each unit gets Size/Closeness/Reach/Gaps/Perspective + a type reading; each chart gets a vote.
    test_nn_browser.mjs PASS.
  * kernel_bridge.js: v63 kernel on the live units — +/0/- charge and Klein sign-multiplication meeting (nudges positions),
    emergent nets with dissonance → changing line → flip written to u.current (birth address never overwritten),
    address sentence on tap. test_kernel_bridge.mjs 5/5, test_kernel_browser.mjs PASS. Shadow log bounded.
  * NOT yet wired: statespace.js (semantic state space), selfhost in the browser, kernel/swarmnet pipelines, hostworld.
