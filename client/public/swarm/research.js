// research.js — the swarm looks things up. Ported from the user's Synthia Research Mesh (arXiv Atom API, PubMed
// E-utilities, keyword scoring), plus GitHub search, plus BM25 ranking over everything it has read. No AI model.
// Network: in the user's Android shell, requests go through its native bridge (window.Native.fetch → onNativeFetch),
// exactly as the Research Mesh does, because a plain web page may be refused by arXiv. Elsewhere it uses fetch().
const wait = new Map(); let seq = 0;
if (typeof window !== "undefined" && !window.onNativeFetch) window.onNativeFetch = payload => {
  try { const p = JSON.parse(payload), w = wait.get(p.id); if (!w) return; wait.delete(p.id); p.ok ? w.resolve(p.body) : w.reject(new Error(p.error || "fetch error")); } catch {} };
export function getText(url, { timeout = 35000 } = {}) {
  return new Promise((resolve, reject) => { const id = "f" + (++seq);
    const timer = setTimeout(() => { wait.delete(id); reject(new Error("timeout")); }, timeout);
    const ok = v => { clearTimeout(timer); resolve(v); }, no = e => { clearTimeout(timer); reject(e); };
    if (typeof window !== "undefined" && window.Native?.fetch) { wait.set(id, { resolve: ok, reject: no }); window.Native.fetch(id, url); }
    else fetch(url).then(r => r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status))).then(ok, no); });
}
const clean = s => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// ---------- sources (from the Research Mesh) ----------
export function parseArxiv(xml) {
  return xml.split("<entry>").slice(1).map(e => ({ title: clean((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]), text: clean((e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]),
    url: clean((e.match(/<id>([\s\S]*?)<\/id>/) || [])[1]), provider: "arXiv" })).filter(x => x.title);
}
export async function arxiv(q, n = 8) { return parseArxiv(await getText(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${n}&sortBy=relevance&sortOrder=descending`)); }
export async function pubmed(q, n = 8) {
  const s = JSON.parse(await getText(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${n}&term=${encodeURIComponent(q)}`));
  const ids = s.esearchresult?.idlist ?? []; if (!ids.length) return [];
  const d = JSON.parse(await getText(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`));
  return ids.map(x => d.result?.[x]).filter(Boolean).map(x => ({ title: x.title || "PubMed article", text: `${x.title ?? ""} ${x.sortfirstauthor ?? ""} ${x.pubdate ?? ""}`, url: `https://pubmed.ncbi.nlm.nih.gov/${x.uid}/`, provider: "PubMed" }));
}
export async function githubRepos(q, n = 8) {
  const r = JSON.parse(await getText(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${n}`));
  return (r.items ?? []).map(x => ({ title: x.full_name, text: `${x.full_name} ${x.description ?? ""} ${(x.topics ?? []).join(" ")}`, url: x.html_url, provider: "GitHub", repo: x.full_name, stars: x.stargazers_count }));
}

// ---------- what it has read: BM25 over its own corpus (the classic pre-AI ranking) ----------
const STOP = new Set("the and that this with from have into your you are for not but was were will can its they them their what when where who why how our out all use using used one two more has had then than also each only same should would could about over under".split(" "));
export const words = t => (String(t).toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || []).filter(w => !STOP.has(w));
export class Corpus {
  constructor(docs = []) { this.docs = []; this.df = new Map(); this.len = 0; docs.forEach(d => this.add(d)); }
  add(d) { const w = words(`${d.title ?? ""} ${d.text ?? ""}`), tf = new Map(); for (const x of w) tf.set(x, (tf.get(x) ?? 0) + 1);
    for (const x of tf.keys()) this.df.set(x, (this.df.get(x) ?? 0) + 1); this.docs.push({ ...d, tf, n: w.length }); this.len += w.length; return this; }
  search(q, k = 8, { k1 = 1.2, b = 0.75 } = {}) { const N = this.docs.length, avg = this.len / (N || 1), qs = [...new Set(words(q))];
    return this.docs.map(d => ({ d, s: qs.reduce((s, t) => { const f = d.tf.get(t) ?? 0; if (!f) return s; const idf = Math.log(1 + (N - this.df.get(t) + 0.5) / (this.df.get(t) + 0.5));
      return s + idf * f * (k1 + 1) / (f + k1 * (1 - b + b * d.n / avg)); }, 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map(({ d, s }) => ({ ...d, tf: undefined, score: +s.toFixed(3) })); }
  export() { return this.docs.map(({ tf, n, ...d }) => d); }
}

/** Look something up everywhere it can; whatever fails is reported, not hidden. */
export async function lookUp(q, { sources = ["arxiv", "pubmed", "github"] } = {}) {
  const fns = { arxiv, pubmed, github: githubRepos }, found = [], failed = [];
  await Promise.all(sources.map(async s => { try { found.push(...await fns[s](q)); } catch (e) { failed.push({ source: s, why: String(e.message ?? e) }); } }));
  return { found, failed };
}
