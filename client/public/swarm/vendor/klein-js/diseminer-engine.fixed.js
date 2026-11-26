// ESM copy of the user's klein_fixes/js/diseminer-engine.fixed.js (klein_tools_contact_model_v15): only the CommonJS export/require lines changed.
"use strict";
/**
 * diseminer-engine.fixed.ts : your DISEMINER, corrected to the 1968 paper, as a SUBCLASS.
 * diseminer-engine.ts is untouched; this file imports it and overrides two things.
 *
 *  1. computeClosure(): the paper's merged matrix M holds every transitive path, every transitive path with a
 *     final intransitive link, AND every single intransitive link (formula (1): the last link is "t or i" for any
 *     path of two or more nodes). The original left the single intransitive links out.
 *  2. infer({type:'plausibility'}): the 1968 system answers from M only. The original also says "plausible"
 *     when two stems' embeddings are similar (> 0.5) with no dependency path. strictPlausibility (default true)
 *     answers from M only; set it false to get the original behaviour back.
 *
 * Added, from the paper:  allLinksTrue(pairs)  (questions: every dependency pair must be in M, else the missing
 * ones are listed) and  riddle(stems, nouns)  (the intersection of the sets {t : stem -> t in M}).
 * Verified against the paper and against klein_diseminer.py: see klein_fixes/parity_test.js.
 */
import * as diseminer_engine_1 from "./diseminer-engine.js";
class DISEMINERFixed extends diseminer_engine_1.DISEMINER {
    constructor() {
        super(...arguments);
        this.strictPlausibility = true;
    }
    computeClosure() {
        super.computeClosure();
        for (const [i, row] of this.intransitiveMatrix) {
            if (!this.mergedMatrix.has(i))
                this.mergedMatrix.set(i, new Map());
            const m = this.mergedMatrix.get(i);
            for (const [j, w] of row)
                m.set(j, Math.max(m.get(j) || 0, w));
        }
    }
    inLinked(x, y) {
        return (this.mergedMatrix.get(x)?.get(y) || 0) > 0;
    }
    allLinksTrue(pairs) {
        const missing = pairs.filter(([x, y]) => !this.inLinked(x, y));
        return { possible: missing.length === 0, missing };
    }
    riddle(stems, nouns) {
        // note: the original merged matrix stores a 0 for every stem pair with no link, so only weights above 0 count
        const sets = stems.map(s => new Set([...(this.mergedMatrix.get(s) || new Map()).entries()].filter(([, w]) => w > 0).map(([t]) => t)));
        if (!sets.length)
            return [];
        return [...sets[0]].filter(t => sets.every(s => s.has(t)) && nouns.has(t)).sort();
    }
    infer(query) {
        if (this.strictPlausibility && query.type === 'plausibility') {
            const ok = this.inLinked(query.subject, query.object);
            return { plausible: ok, confidence: ok ? 1 : 0, path: [], semanticDistance: ok ? 1 : Infinity, alternativePaths: [], anomalyFlag: false };
        }
        return super.infer(query);
    }
}

export { DISEMINERFixed };
