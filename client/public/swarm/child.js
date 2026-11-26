// child.js — "build another me" in the browser (user, Nov 24: cloning must happen in the live swarm, not only from Node).
// The child is the same page opened with ?child=N. It gets its OWN storage (keys prefixed, set up by the shim in
// living.html's <head>), seeded with what the parent actually learned: faces (placements + learned jobs), Klein
// culture, cultures by identity, needs, the grown library and the genome (reproduce.js planChild: read → inventory →
// sides → form → genome). Nothing is copied by hand; the child then lives on its own and keeps learning.
import { planChild, lookCSS } from "./reproduce.js";
import { shelf } from "./bookshelf.js";

const get = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };

export async function makeChild({ S, FA, K, KL, N, LIB, extra = "", request = "build another you" }) {
  const forms = await fetch("./form_particles.json").then(r => r.json());
  let books = []; try { books = await shelf(); } catch {}
  const fx = FA.export();
  const { steps, genome } = planChild({ request, extra, shelf: books.map(b => ({ field: b.field, title: b.title ?? b.name })),
    functions: FA.list ?? [], does: fx.does ?? {}, units: S.units.filter(u => !u.broken), forms });
  const pack = { genome, look: lookCSS(genome.look),
    inherit: { "synthia-faces": fx, "synthia-klein": K.export(), "synthia-cultures": KL.exportCultures(S), "synthia-needs": N.export(),
      "synthia-library": LIB, "synthia-formations": get("synthia-formations"), "synthia-corpus": get("synthia-corpus") } };
  let n = 1; while (localStorage.getItem("synthia-child:" + n)) n++;
  localStorage.setItem("synthia-child:" + n, JSON.stringify(pack));
  return { n, steps, genome, url: location.pathname + "?" + (() => { const q = new URLSearchParams(location.search); q.set("child", n); return q.toString(); })() };
}
