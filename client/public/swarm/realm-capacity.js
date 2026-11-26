// Host conditions for Claude's Little Miracles. The native organism supplies the executable formation.
import { LivingSwarm } from './living.js';
import { OrganismSwarm } from './organism_swarm.js';
import { addressOf } from './address.js';
import { appHost } from './hosts.js';
import { enter } from './morphogenesis.js';

export function createRealmOrganism(seed = 7) {
  const living = new LivingSwarm({seed});
  // A synthetic, reproducible set of addresses for the habitat, not a person's chart.
  for (let i=0; i<64; i++) living.add(addressOf(i, (i*5.625+303)%360, 100), 'item', .5+(i%8)*.006, .5+Math.floor(i/8)*.006);
  living.link(.2);
  return new OrganismSwarm(living);
}

export function growCapacityResident(organism, name = 'canEnter') {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('invalid function name');
  // The missing behavior is specified by its truth table, not its implementation.
  const host = appHost([{path:'test.js',text:`import { ${name} } from './${name}.js';\nassert(${name}(0,0)===0);assert(${name}(0,1)===1);assert(${name}(1,0)===1);assert(${name}(1,1)===1);`}]);
  const report = enter(organism,host);
  if (!report.ok || !report.descendant?.standalone) throw new Error('native swarm did not establish standalone capacity resident');
  const source = host.app.files.find(f=>f.path===`${name}.js`)?.text;
  if (!source) throw new Error('native descendant missing');
  // The native appHost emits source from its fixed Boolean primitive vocabulary.
  // No external files, text, or user-authored JS are passed to this compiler.
  const execute = new Function(source.replace('export function ', 'function ') + `\nreturn ${name};`)();
  for (const [a,b,out] of [[0,0,0],[0,1,1],[1,0,1],[1,1,1]]) if (execute(a,b)!==out) throw new Error('standalone verification failed');
  const resident = (place, agent) => execute(Number(place.currentAgents.length < place.capacity),Number(place.id===agent.currentPlace))===1;
  return {resident,source,report};
}
