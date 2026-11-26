// toolbox.js — the swarm's own pure parts, offered to itself when it grows itself (selfhost.js).
// Each run is self-contained (no outside names), so a grown file can carry it after the swarm leaves.
// `about` words let what it has read (books, instructions) rank which parts to offer first.
export const TYPES = { text: x => typeof x === "string", words: x => Array.isArray(x) && x.every(s => typeof s === "string"),
  numbers: x => Array.isArray(x) && x.every(n => typeof n === "number" && Number.isFinite(n)), number: x => typeof x === "number" && Number.isFinite(x) };
export const TOOLBOX = [
  { id: "lower", inputs: { value: "text" }, output: "text", dimension: "Being", about: "lowercase small letters", run: ({ value }) => value.toLowerCase() },
  { id: "upper", inputs: { value: "text" }, output: "text", dimension: "Being", about: "uppercase capital letters shout", run: ({ value }) => value.toUpperCase() },
  { id: "trim", inputs: { value: "text" }, output: "text", dimension: "Design", about: "trim spaces clean edges", run: ({ value }) => value.trim() },
  { id: "concat", inputs: { a: "text", b: "text" }, output: "text", dimension: "Movement", about: "join append attach combine text", run: ({ a, b }) => a + b },
  { id: "split", inputs: { value: "text", separator: "text" }, output: "words", dimension: "Movement", about: "split break words tokens", guard: ({ separator }) => separator.length > 0, run: ({ value, separator }) => value.split(separator) },
  { id: "join", inputs: { items: "words", separator: "text" }, output: "text", dimension: "Design", about: "join words together", run: ({ items, separator }) => items.join(separator) },
  { id: "reverseWords", inputs: { items: "words" }, output: "words", dimension: "Evolution", about: "reverse order backwards", run: ({ items }) => [...items].reverse() },
  { id: "count", inputs: { items: "words" }, output: "number", dimension: "Being", about: "count how many length", run: ({ items }) => items.length },
  { id: "sum", inputs: { values: "numbers" }, output: "number", dimension: "Being", about: "sum total add up", run: ({ values }) => values.reduce((a, b) => a + b, 0) },
  { id: "size", inputs: { values: "numbers" }, output: "number", dimension: "Being", about: "count how many length size", run: ({ values }) => values.length },
  { id: "max", inputs: { values: "numbers" }, output: "number", dimension: "Evolution", about: "largest biggest maximum peak", run: ({ values }) => values.length ? Math.max(...values) : 0 },
  { id: "min", inputs: { values: "numbers" }, output: "number", dimension: "Evolution", about: "smallest least minimum", run: ({ values }) => values.length ? Math.min(...values) : 0 },
  { id: "add", inputs: { a: "number", b: "number" }, output: "number", dimension: "Design", about: "add plus more", run: ({ a, b }) => a + b },
  { id: "subtract", inputs: { a: "number", b: "number" }, output: "number", dimension: "Design", about: "subtract minus difference less", run: ({ a, b }) => a - b },
  { id: "multiply", inputs: { a: "number", b: "number" }, output: "number", dimension: "Movement", about: "multiply times product scale", run: ({ a, b }) => a * b },
  { id: "divide", inputs: { a: "number", b: "number" }, output: "number", dimension: "Movement", about: "divide ratio average mean per share", guard: ({ b }) => b !== 0, run: ({ a, b }) => a / b },
];
