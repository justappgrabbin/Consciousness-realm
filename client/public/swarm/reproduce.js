// reproduce.js — the "build another you" request (pure: plans the child; reproduce_node.mjs writes it to disk).
// Agreed with the user (Nov 24). A request carries the text ("build another you") and extra instructions. Steps:
//   1 read      — the swarm reads its sources first (books on the shelf, per field). What was read is recorded; if
//                 nothing is on the shelf the step says so (the child is still built, and its description says it).
//   2 inventory — both halves of the dual swarm: FUNCTIONS (particles + what each was seen doing) and FORMS
//                 (form_particles.json: colours, fonts, radii, components, layouts, motion).
//   3 sides     — lay both halves on the four sides. Functions go to the side of the units that earned them.
//                 Forms go by the shape of each Black Book page: Movement = grouped (header/tray/chip),
//                 Evolution = macro/micro pairs (card + chip, input + button), Being = a column (list/text),
//                 Design = a grid (grid layouts/modals). Space is what comes out of the four — not stored, computed.
//                 [This mapping of component kinds to sides is Claude's reading of the layouts — the user may correct it.]
//   4 form      — choose the child's look from the harvested tokens by MEASURE, not taste: background + text pair must
//                 pass WCAG contrast 4.5:1; accent must stand out from the background (≥3:1); font/radius = most used.
//   5 genome    — the child's own description: request, parent, sides (function ids + form particles), bindings
//                 (which form shows which function), look — so the child can read itself and build the next one.
// Holes (something the request needs that no particle covers) are filled with the best-fitting candidate and LABELLED
// as a best guess with its score; nothing is left blank.

const hex = c => { c = c.trim().toLowerCase(); let m = c.match(/^#([0-9a-f]{3,8})$/);
  if (m) { let h = m[1]; if (h.length <= 4) h = [...h].map(x => x + x).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  m = c.match(/^rgba?\((\d+),(\d+),(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const SIDE_OF_KIND = { header: "Movement", tray: "Movement", chip: "Movement", card: "Evolution", input: "Evolution", button: "Evolution", list: "Being", text: "Being", grid: "Design", modal: "Design" };

export function chooseLook(forms) {
  const cols = forms.tokens.colors.map(c => ({ ...c, rgb: hex(c.value) })).filter(c => c.rgb && !/^#[0-9a-f]{8}$|^#[0-9a-f]{4}$/i.test(c.value));   // solid colours only
  const darks = cols.filter(c => lum(c.rgb) < 0.05).sort((a, b) => b.pages - a.pages || b.uses - a.uses);
  const bg = darks[0] ?? cols[0], score = [];
  for (const t of cols) { const k = contrast(bg.rgb, t.rgb); if (k >= 4.5) score.push({ t, k }); }
  const text = score.filter(s => lum(s.t.rgb) > 0.5).sort((a, b) => b.t.pages - a.t.pages || b.t.uses - a.t.uses)[0];
  const accent = cols.filter(c => c !== bg && c !== text?.t && contrast(bg.rgb, c.rgb) >= 3 && Math.max(...c.rgb) - Math.min(...c.rgb) > 90)   // saturated
    .sort((a, b) => b.uses - a.uses)[0];
  const font = forms.tokens.fonts.find(f => !/var\(|inherit/.test(f.value))?.value ?? "system-ui, sans-serif";
  const radius = forms.tokens.radii[0]?.value ?? "8px";
  return { background: bg.value, text: text?.t.value ?? "#ffffff", accent: accent?.value ?? "#44e6ff", font, radius,
    measured: { textContrast: +(text ? text.k : contrast(bg.rgb, [255, 255, 255])).toFixed(2), accentContrast: accent ? +contrast(bg.rgb, accent.rgb).toFixed(2) : null },
    why: "background = darkest colour used on the most pages; text = most-used colour passing 4.5:1 against it; accent = most-used saturated colour passing 3:1" };
}

export function planChild({ request, extra = "", parent = "synthia", shelf = [], functions = [], does = {}, units = [], forms }) {
  const steps = [];
  // 1 read
  const read = { Movement: [], Evolution: [], Being: [], Design: [] };
  for (const b of shelf) (read[b.field] ??= []).push(b.title ?? b.name);
  const nRead = Object.values(read).flat().length;
  steps.push({ step: "read", done: nRead > 0, read, note: nRead ? `${nRead} source(s) read` : "no books on the shelf yet — nothing read; the child carries this note" });
  // 2 inventory
  steps.push({ step: "inventory", functions: functions.length, learnedJobs: Object.keys(does).length, forms: { components: forms.components.length, layouts: forms.layouts.length, colors: forms.tokens.colors.length } });
  // 3 sides
  const sides = Object.fromEntries(["Movement", "Evolution", "Being", "Design"].map(s => [s, { functions: new Set(), forms: [] }]));
  for (const u of units) if (u.face?.id && sides[u.address?.dimension]) sides[u.address.dimension].functions.add(u.face.id);
  const byKind = {}; for (const c of forms.components) (byKind[c.kind] ??= []).push(c);
  for (const [kind, list] of Object.entries(byKind)) { const s = SIDE_OF_KIND[kind]; if (s) sides[s].forms.push(...list.slice(0, 6).map(c => ({ kind, selector: c.selector, css: c.css, from: c.from }))); }
  const holes = [];
  for (const [s, v] of Object.entries(sides)) if (!v.functions.size) {   // best guess, labelled: functions seen doing any job, most-seen first
    const guess = Object.entries(does).map(([id, sig]) => [id, Object.values(sig).reduce((n, x) => n + x.n, 0)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    guess.forEach(([id]) => v.functions.add(id));
    holes.push({ side: s, filledWith: guess.map(g => g[0]), label: guess.length ? "best guess: no unit on this side has earned a function yet; used the functions seen working most often" : "best guess impossible: no function has been seen working yet", score: guess.length ? +(guess[0][1] / Math.max(1, guess.reduce((n, g) => n + g[1], 0))).toFixed(2) : 0 });
  }
  steps.push({ step: "sides", sides: Object.fromEntries(Object.entries(sides).map(([k, v]) => [k, { functions: v.functions.size, forms: v.forms.length }])), holes });
  // 4 form
  const look = chooseLook(forms); steps.push({ step: "form", look });
  // 5 genome
  const bindings = []; for (const [s, v] of Object.entries(sides)) { const fns = [...v.functions]; v.forms.forEach((f, i) => { if (fns.length) bindings.push({ side: s, form: f.selector, fn: fns[i % fns.length] }); }); }
  const genome = { schema: "synthia-child/1", request, extra, parent, born: new Date().toISOString(), read, look, holes,
    sides: Object.fromEntries(Object.entries(sides).map(([k, v]) => [k, { functions: [...v.functions], forms: v.forms }])), bindings,
    space: "not stored: emerges from the four sides together",
    howToBuildTheNext: "read this genome, then run the same request steps (reproduce.js planChild) with yourself as parent" };
  steps.push({ step: "genome", bindings: bindings.length });
  return { steps, genome };
}

/** the look as CSS the child's page wears (overrides only colours/type/radius — layout and behaviour stay the swarm's) */
export const lookCSS = l => `:root{--child-bg:${l.background};--child-text:${l.text};--child-accent:${l.accent}}
body{background:${l.background}!important;color:${l.text}!important;font-family:${l.font}!important}
button,select,input,textarea{border-radius:${l.radius}!important;border-color:${l.accent}!important;color:${l.text}!important;background:${l.background}!important}
button:hover{background:${l.accent}!important;color:${l.background}!important}`;
