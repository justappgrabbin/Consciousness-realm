// charts.js — anyone's four charts from their birth data (user, Nov 24): no hard-coded chart.
//   Movement  (Individuality) = Draconic, mean node     Design (Ego)  = Draconic, true node
//   Being     (Body)          = Tropical                Evolution (Mind) = Sidereal (Vedic, Lahiri)
//   Space has no chart of its own: it shows in the Personality Crystal with Evolution.
// Each chart has the Personality side (birth moment) and the Design side (the moment the Sun was 88° earlier).
// Positions: astronomy-engine (MIT, Don Cross; vendor/astronomy-engine) — geocentric, apparent, ecliptic of date.
// Lunar nodes: Meeus, Astronomical Algorithms ch. 47 (mean node 47.7; true node = mean + the five largest periodic terms).
// Ayanamsa: Lahiri, linear (23.853° at J2000, 50.29"/yr) — good to about an arc-minute, not to the arc-second.
import * as A from "./vendor/astronomy-engine/astronomy.js";
import { addressOf, BODIES } from "./address.js";

const norm = x => ((x % 360) + 360) % 360, rad = Math.PI / 180;
const PLANETS = { Mercury: A.Body.Mercury, Venus: A.Body.Venus, Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn,
  Uranus: A.Body.Uranus, Neptune: A.Body.Neptune, Pluto: A.Body.Pluto };

/** Local wall-clock time at an IANA zone (e.g. "America/Los_Angeles") or a fixed offset in hours → a UTC Date. */
export function toUTC(date, time = "12:00", zone = "UTC") {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number), guess = Date.UTC(y, mo - 1, d, h, mi);
  if (typeof zone === "number") return new Date(guess - zone * 3600e3);
  const off = t => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(t)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t; };
  let t = guess - off(guess); t = guess - off(t); return new Date(t);   // twice, so a DST edge settles
}

const T = time => (time.tt) / 36525;   // Julian centuries from J2000 (terrestrial time)
export function meanNode(time) { const t = T(time); return norm(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + t ** 3 / 467441 - t ** 4 / 60616000); }
export function trueNode(time) { const t = T(time);
  const D = (297.8501921 + 445267.1114034 * t) * rad, M = (357.5291092 + 35999.0502909 * t) * rad, Mp = (134.9633964 + 477198.8675055 * t) * rad, F = (93.2720950 + 483202.0175233 * t) * rad;
  return norm(meanNode(time) - 1.4979 * Math.sin(2 * (D - F)) - 0.1500 * Math.sin(M) - 0.1226 * Math.sin(2 * D) + 0.1176 * Math.sin(2 * F) - 0.0801 * Math.sin(2 * (Mp - F))); }
export const lahiri = time => 23.853 + (time.tt / 365.25) * (50.29 / 3600);

/** Tropical longitudes of the 13 bodies (BODIES order) at a moment; nodes given both ways. */
export function tropical(time) {
  const sun = A.SunPosition(time).elon, moon = A.EclipticGeoMoon(time).lon;
  const pl = Object.fromEntries(Object.entries(PLANETS).map(([k, b]) => [k, A.Ecliptic(A.GeoVector(b, time, true)).elon]));
  const row = nn => [sun, norm(sun + 180), moon, nn, norm(nn + 180), pl.Mercury, pl.Venus, pl.Mars, pl.Jupiter, pl.Saturn, pl.Uranus, pl.Neptune, pl.Pluto];
  return { mean: row(meanNode(time)), true: row(trueNode(time)), meanNode: meanNode(time), trueNode: trueNode(time), ayanamsa: lahiri(time) };
}

/** The four charts for one person. Returns per dimension: 26 longitudes (13 Personality + 13 Design) and their addresses. */
export function fourCharts({ date, time = "12:00", zone = "UTC" }) {
  const utc = toUTC(date, time, zone), pt = A.MakeTime(utc);
  const sunP = A.SunPosition(pt).elon, target = norm(sunP - 88);
  const found = A.SearchSunLongitude(target, A.MakeTime(new Date(utc.getTime() - 100 * 864e5)), 30);
  if (!found) throw new Error("could not find the Design moment (Sun 88° earlier)");
  const P = tropical(pt), D = tropical(found);
  const frame = {
    Being: { system: "Tropical", lon: s => s.true },   // tropical nodes: true node (common HD convention) — same Sun/planets either way
    Evolution: { system: "Sidereal (Lahiri)", lon: s => s.true.map(l => norm(l - s.ayanamsa)) },
    Movement: { system: "Draconic (mean node)", lon: s => s.mean.map(l => norm(l - s.meanNode)) },
    Design: { system: "Draconic (true node)", lon: s => s.true.map(l => norm(l - s.trueNode)) } };
  const out = { utc: utc.toISOString(), designUtc: found.date.toISOString(), charts: {} };
  for (const [dim, f] of Object.entries(frame)) {
    const lons = [...f.lon(P), ...f.lon(D)];
    out.charts[dim] = { system: f.system, lons, addresses: lons.map((l, i) => ({ ...addressOf(i, l), field: dim, chart: f.system })) };
  }
  return out;
}
export { BODIES };
