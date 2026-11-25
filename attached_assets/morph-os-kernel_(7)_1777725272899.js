/* ═══════════════════════════════════════════════════════════════════
   MORPH OS KERNEL v4.0 — 5D × 13P × 64S Substrate Mesh

   Architecture:
   - 5 Dimensions (Movement, Evolution, Being, Design, Space)
   - 13 Planets distributed across dimensions
   - 64 States per planet (codon/hexagram structure)
   - Each node: 6 connection vectors (yao lines)
   - Cross-circuit wiring creates emergent graphs
   - 9 Centers map to the bodygraph topology
   ═══════════════════════════════════════════════════════════════════ */

class MorphSubstrate {
  constructor() {
    // 5 Dimensions with their planetary distribution
    this.dimensions = [
      { name: 'Movement', planets: 3, color: '#ff6b6b', quality: 'energy' },      // D1: Energy/Monopole
      { name: 'Evolution', planets: 3, color: '#ffb347', quality: 'gravity' },     // D2: Gravity/Personality
      { name: 'Being', planets: 2, color: '#00d4aa', quality: 'matter' },          // D3: Matter/Atom
      { name: 'Design', planets: 3, color: '#773cdd', quality: 'structure' },      // D4: Structure/Design
      { name: 'Space', planets: 2, color: '#9b5eff', quality: 'form' }             // D5: Form/Personality
    ];

    // 13 Planets with their dimensional assignment
    this.planets = [
      { name: 'Sun', dim: 0, role: 'life_force' },
      { name: 'Earth', dim: 2, role: 'grounding' },
      { name: 'Moon', dim: 1, role: 'drive' },
      { name: 'Mercury', dim: 3, role: 'communication' },
      { name: 'Venus', dim: 2, role: 'values' },
      { name: 'Mars', dim: 0, role: 'action' },
      { name: 'Jupiter', dim: 1, role: 'expansion' },
      { name: 'Saturn', dim: 3, role: 'discipline' },
      { name: 'Uranus', dim: 4, role: 'awakening' },
      { name: 'Neptune', dim: 4, role: 'dreaming' },
      { name: 'Pluto', dim: 1, role: 'transformation' },
      { name: 'North Node', dim: 0, role: 'direction' },
      { name: 'South Node', dim: 0, role: 'past' }
    ];

    // 64 Codon states (hexagrams) — each with 6 yao lines
    this.codons = Array.from({length: 64}, (_, i) => ({
      id: i,
      binary: i.toString(2).padStart(6, '0'),
      hex: this._toHexagram(i),
      lines: [0,1,2,3,4,5].map(l => ({
        position: l,
        value: (i >> l) & 1,
        changing: false,
        connections: [] // 6 vectors per line
      }))
    }));

    // 9 Centers (BodyGraph topology)
    this.centers = [
      { name: 'Head', dim: 4, gates: [64,47,24,61,63,4], color: '#9b5eff' },
      { name: 'Ajna', dim: 3, gates: [47,24,4,17,11,43], color: '#773cdd' },
      { name: 'Throat', dim: 0, gates: [8,12,16,20,23,31,33,35,45,56], color: '#00d4aa' },
      { name: 'G', dim: 2, gates: [1,2,7,10,13,15,25,40,46,51], color: '#ffb347' },
      { name: 'Heart', dim: 0, gates: [21,26,40,51], color: '#ff6b6b' },
      { name: 'Spleen', dim: 1, gates: [18,28,32,44,48,50,57], color: '#00d4aa' },
      { name: 'Sacral', dim: 2, gates: [3,5,9,14,27,29,34,42,59], color: '#ffb347' },
      { name: 'Solar Plexus', dim: 1, gates: [6,22,30,36,37,49,55], color: '#ff6b6b' },
      { name: 'Root', dim: 0, gates: [19,38,39,41,53,54,58,60], color: '#9b5eff' }
    ];

    // Active mesh nodes (runtime state)
    this.nodes = new Map();
    this.crossCircuits = new Map();
    this.emergentGraphs = new Map();

    // Initialize the substrate
    this._initMesh();
  }

  _toHexagram(n) {
    const names = ['Qian','Kun','Zhun','Meng','Xu','Song','Shi','Bi','Xiao Chu','Lu',
      'Tai','Pi','Tong Ren','Da You','Qian','Yu','Sui','Gu','Lin','Guan',
      'Shi He','Bi','Bo','Fu','Wu Wang','Da Chu','Yi','Da Guo','Kan','Li',
      'Xian','Heng','Dun','Da Zhuang','Jin','Ming Yi','Jia Ren','Kui','Jian','Jie',
      'Sun','Yi','Guai','Gou','Cui','Sheng','Kun','Jing','Ge','Ding',
      'Zhen','Gen','Jian','Gui Mei','Feng','Lu','Xun','Dui','Huan','Jie',
      'Zhong Fu','Xiao Guo','Ji Ji','Wei Ji'];
    return names[n] || 'Unknown';
  }

  _initMesh() {
    // Create nodal mesh: each planet gets 64 state nodes
    this.planets.forEach((planet, pi) => {
      this.codons.forEach((codon, ci) => {
        const nodeId = `P${pi}_C${ci}`;
        const node = {
          id: nodeId,
          planet: pi,
          codon: ci,
          dimension: planet.dim,
          center: this._findCenter(ci),
          state: 'dormant',
          activation: 0,

          // ═══════════════════════════════════════════
          // FRACTAL NODE STRUCTURE — Human Design imprint
          // ═══════════════════════════════════════════

          // Level 1: The Gate (Hexagram / Codon)
          gate: {
            number: ci + 1,  // Gates are 1-64
            name: this.codons[ci].hex,
            binary: this.codons[ci].binary,
            circuit: this._getCircuit(ci + 1),
            center: this._findCenter(ci)
          },

          // Level 2: The 6 Lines (Yao)
          // Each line has its own personality/profile
          lines: [1,2,3,4,5,6].map(lineNum => ({
            number: lineNum,
            active: ((ci >> (lineNum - 1)) & 1) === 1,
            profile: this._getLineProfile(lineNum),
            // Level 3: Colors (6 per line)
            colors: [1,2,3,4,5,6].map(colorNum => ({
              number: colorNum,
              motivation: this._getColorMotivation(colorNum),
              // Level 4: Tones (6 per color)
              tones: [1,2,3,4,5,6].map(toneNum => ({
                number: toneNum,
                mind: this._getToneMind(toneNum),
                // Level 5: Bases (5 per tone)
                bases: [1,2,3,4,5].map(baseNum => ({
                  number: baseNum,
                  // Level 6: Degrees / Minutes / Seconds / Arcseconds
                  geometry: {
                    degrees: (baseNum - 1) * 72,  // 360/5 = 72 degrees per base
                    minutes: lineNum * 10 + colorNum,
                    seconds: toneNum * 10 + baseNum,
                    arcseconds: (ci * 3375 + lineNum * 562 + colorNum * 93 + toneNum * 15 + baseNum * 3) % 3600
                  }
                }))
              }))
            }))
          })),

          // 6 connection vectors (the windmill you described)
          // Each vector carries the full fractal imprint
          vectors: [0,1,2,3,4,5].map(vi => ({
            direction: vi,
            // The 6 directions map to HD mechanics:
            // 0=Behavior, 1=Motivation, 2=Connection, 3=Environment, 4=Degree, 5=Arc
            aspect: ['behavior','motivation','connection','environment','degree','arc'][vi],
            active: ((ci >> vi) & 1) === 1,
            target: null,
            weight: 0,
            // Each vector carries the full nested structure
            imprint: {
              line: ((ci >> vi) & 1) + 1,
              color: (ci % 6) + 1,
              tone: (ci % 6) + 1,
              base: (ci % 5) + 1
            }
          })),

          // Cross-circuit connections (the windmill underneath)
          crossWires: [],

          // Local state
          memory: new Map(),
          timestamp: Date.now()
        };
        this.nodes.set(nodeId, node);
      });
    });

    // Wire cross-circuits: nodes with same codon across planets connect
    this._wireCrossCircuits();

    // Build emergent graphs from active connections
    this._buildEmergentGraphs();
  }

  _findCenter(codonIndex) {
    for (const center of this.centers) {
      if (center.gates.includes(codonIndex + 1)) return center.name;
    }
    return null;
  }

  _getCircuit(gateNum) {
    // Human Design circuits
    const circuits = {
      'understanding': [1,2,10,13,15,17,25,43,44,47,62,63],
      'sensing': [5,7,9,14,29,30,34,46,50,53,55,56],
      'defense': [3,4,6,11,12,16,20,23,24,27,35,36,37,40,42,45,48,49,51,52,57,58,59,60,61,64]
    };
    for (const [name, gates] of Object.entries(circuits)) {
      if (gates.includes(gateNum)) return name;
    }
    return 'individual';
  }

  _getLineProfile(lineNum) {
    const profiles = [
      'investigator','hermit','martyr','opportunist','heretic','role_model'
    ];
    return profiles[lineNum - 1] || 'unknown';
  }

  _getColorMotivation(colorNum) {
    const motivations = [
      'fear','hope','desire','need','guilt','innocence'
    ];
    return motivations[colorNum - 1] || 'unknown';
  }

  _getToneMind(toneNum) {
    const minds = [
      'acceptance','survival','uncertainty','confidence','doubt','conceptual'
    ];
    return minds[toneNum - 1] || 'unknown';
  }

  _wireCrossCircuits() {
    // Cross-circuit: same codon, different planets = resonance
    this.codons.forEach((codon, ci) => {
      const sameCodonNodes = [];
      this.planets.forEach((_, pi) => {
        sameCodonNodes.push(this.nodes.get(`P${pi}_C${ci}`));
      });

      // Wire each node to others with same codon (dimensional resonance)
      sameCodonNodes.forEach((node, i) => {
        sameCodonNodes.forEach((other, j) => {
          if (i !== j) {
            const wire = {
              from: node.id,
              to: other.id,
              type: 'resonance',
              strength: 1 / Math.abs(node.dimension - other.dimension + 1),
              active: false
            };
            node.crossWires.push(wire);
            this.crossCircuits.set(`${node.id}->${other.id}`, wire);
          }
        });
      });
    });

    // Adjacent codon wiring (sequential flow)
    this.planets.forEach((_, pi) => {
      for (let ci = 0; ci < 64; ci++) {
        const node = this.nodes.get(`P${pi}_C${ci}`);
        const next = this.nodes.get(`P${pi}_C${(ci + 1) % 64}`);
        const prev = this.nodes.get(`P${pi}_C${(ci + 63) % 64}`);

        node.vectors.forEach((v, vi) => {
          if (v.active) {
            // Connect to adjacent codons based on line position
            if (vi < 3) v.target = prev.id; // Lower lines → previous
            else v.target = next.id; // Upper lines → next
            v.weight = 0.5 + (Math.random() * 0.5);
          }
        });
      }
    });
  }

  _buildEmergentGraphs() {
    // Find connected components in the active mesh
    const visited = new Set();
    let graphId = 0;

    this.nodes.forEach((node, id) => {
      if (visited.has(id)) return;

      const graph = {
        id: `G${graphId++}`,
        nodes: [],
        edges: [],
        dimension: node.dimension,
        center: node.center,
        emergent: false
      };

      const stack = [id];
      while (stack.length > 0) {
        const currId = stack.pop();
        if (visited.has(currId)) continue;
        visited.add(currId);

        const curr = this.nodes.get(currId);
        graph.nodes.push(currId);

        // Follow active vectors
        curr.vectors.forEach(v => {
          if (v.active && v.target && !visited.has(v.target)) {
            graph.edges.push({ from: currId, to: v.target, weight: v.weight });
            stack.push(v.target);
          }
        });

        // Follow cross-circuits
        curr.crossWires.forEach(w => {
          if (w.active && !visited.has(w.to)) {
            graph.edges.push({ from: currId, to: w.to, weight: w.strength });
            stack.push(w.to);
          }
        });
      }

      // Mark as emergent if it spans multiple dimensions
      const dims = new Set(graph.nodes.map(nid => this.nodes.get(nid).dimension));
      graph.emergent = dims.size > 1;

      this.emergentGraphs.set(graph.id, graph);
    });
  }

  /* ACTIVATE — Bring a node online with given state */
  activate(nodeId, state = 'active') {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    node.state = state;
    node.activation = 1;
    node.timestamp = Date.now();

    // Activate vectors based on codon lines
    node.vectors.forEach((v, i) => {
      v.active = (node.codon >> i) & 1 === 1;
      if (v.active && v.target) {
        const target = this.nodes.get(v.target);
        if (target) {
          // Resonance pulse
          this._pulse(node, target, v.weight);
        }
      }
    });

    // Activate cross-circuits
    node.crossWires.forEach(w => {
      w.active = true;
      const target = this.nodes.get(w.to);
      if (target) this._pulse(node, target, w.strength);
    });

    // Rebuild emergent graphs after activation
    this._buildEmergentGraphs();

    return node;
  }

  _pulse(from, to, strength) {
    // Message passing between nodes
    const msg = {
      from: from.id,
      to: to.id,
      strength,
      timestamp: Date.now(),
      data: from.memory
    };

    // Store in target's memory
    to.memory.set(from.id, msg);

    // Decay old memories
    const now = Date.now();
    for (const [key, val] of to.memory) {
      if (now - val.timestamp > 60000) to.memory.delete(key);
    }
  }

  /* GET STATE — Read the full substrate topology */
  getState() {
    return {
      dimensions: this.dimensions.length,
      planets: this.planets.length,
      codons: this.codons.length,
      centers: this.centers.length,
      nodes: this.nodes.size,
      activeNodes: Array.from(this.nodes.values()).filter(n => n.state !== 'dormant').length,
      activeGates: new Set(Array.from(this.nodes.values()).filter(n => n.state !== 'dormant').map(n => n.gate.number)).size,
      activeCircuits: new Set(Array.from(this.nodes.values()).filter(n => n.state !== 'dormant').map(n => n.gate.circuit)).size,
      crossCircuits: this.crossCircuits.size,
      emergentGraphs: Array.from(this.emergentGraphs.values()).map(g => ({
        id: g.id,
        nodes: g.nodes.length,
        edges: g.edges.length,
        emergent: g.emergent,
        dimension: g.dimension
      })),
      timestamp: Date.now()
    };
  }

  /* MIGRATE — Move activation patterns between nodes */
  migrate(fromId, toId, pattern) {
    const from = this.nodes.get(fromId);
    const to = this.nodes.get(toId);
    if (!from || !to) return false;

    // Transfer memory patterns
    for (const [key, val] of from.memory) {
      to.memory.set(key, { ...val, timestamp: Date.now() });
    }

    // Update cross-circuits
    to.crossWires.forEach(w => {
      if (w.to === fromId) w.active = true;
    });

    return true;
  }

  /* QUERY — Find paths between nodes */
  query(startId, endId, maxDepth = 5) {
    const visited = new Set();
    const queue = [{ node: startId, path: [startId], depth: 0 }];

    while (queue.length > 0) {
      const { node, path, depth } = queue.shift();

      if (node === endId) return path;
      if (depth >= maxDepth) continue;
      if (visited.has(node)) continue;
      visited.add(node);

      const curr = this.nodes.get(node);
      if (!curr) continue;

      // Follow vectors
      curr.vectors.forEach(v => {
        if (v.active && v.target && !visited.has(v.target)) {
          queue.push({ node: v.target, path: [...path, v.target], depth: depth + 1 });
        }
      });

      // Follow cross-circuits
      curr.crossWires.forEach(w => {
        if (w.active && !visited.has(w.to)) {
          queue.push({ node: w.to, path: [...path, w.to], depth: depth + 1 });
        }
      });
    }

    return null;
  }
}

/* Export for module use */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MorphSubstrate };
}
