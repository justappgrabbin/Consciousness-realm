# Synthia organism — one relational swarm, many expressions

Run tests: `node test.mjs` (49 checks). Run the live swarm: `python3 -m http.server` in this folder, open `index.html`.

- `address.js` 13-field address, Human Design connection laws, no-skip match law, Type rule
- `swarm_model.js` the trained five-dimension swarm in pure JS (matches Python robot-for-robot)
- `organism.js` agents, 5 dimensions x 2 aspects (identity / expression, E = I(B,R,P)), relations, actions, outcomes, learning, text intake
- `encoding.js` BHANTUGH: Binary, Hex, ASCII, NATO (+IPA), Transliteration, Unicode, Geometry, HTML + SHA-256; reversible decode
- `hexagram.js`, `kingwen.js` six-bit extraction, trigrams, changing lines, verified King Wen table (OEIS A102241), U+4DC0..U+4DFF
- `expression.js` sound -> color -> geometry from one state; register = four fields
- `index.html` renderer: observes only, never writes state
- `learn_from_experience.py` feeds the swarm's recorded experience back into the original Python learner

Inferences made from the user's own statements (correct any of them):
Reach=Movement/Where, Closeness=Evolution/What, Size=Being/When, Gaps=Design/Why, Perspective=Space/Who (Colors p.40);
address `dimension` = the Base's dimension; register 0-3 = Mind, Movement, Heart, Body fields (Personality/Design side x inward/outward color);
sound first, then color and shape; upper trigram (lines 4-6, outward) sets hue, lower (1-3, inward) sets depth.
Charts in the tests are synthetic (no ephemeris); pass real longitudes to `loadChart()`.

## Added (Nov 19) — nothing removed
- `lexicon.json` — extracted by script from the user's three Drive docs (Consciousness Causal Graph spec + two companions): all 64 gates (name, archetype, base, entry anchor node, zodiac, house, astrological meanings, center, biology, harmonic), 324 line expressions (54 gates complete; gates 8,12,15,16,20,23,34,35,42,45 have no line table in the sources), zodiac/house, axis, Base×Tone matrix, Tone×Color interlock, line trajectories.
- `lexicon.js` — Section 6 engine exactly: Rule O → base chain → gate anchor → line trajectory → tone & colour lens → resonance 2× → sentence. Words only from tables/chains. 23,040 valid sentences across the 64 hexagrams.
- Aspects are now FUNCTION (what it can say/do: the sentence, which partners it reaches) and VISUAL (sound→colour→shape). Identity is the Who: `agent.who` = Space reading the other four. Old `identity`/`expression` keys kept as aliases.
- Open: anchors "Orientation" (gates 7, 31) and "Being" (gate 10) are not words in any chain; line 4 "external nodes" read as the nature-chain tail, line 5 "universalizing" read as the gate's sign keywords — both my readings, correct them.
- Retraining on these words (state space positions from sentences) is the next step.
