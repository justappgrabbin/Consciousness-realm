import { createHabitat, occupancyCondition } from '../client/src/engine/littleMiraclesHabitat.mjs';
function runTests(createHabitat,occupancyCondition){
  let n=0;
  const check=(v,name)=>{if(!v)throw Error(name);n++;};
  const fails=(f)=>{try{f();return false}catch{return true}};
  const world={time:{day:1,hour:8,minute:0},activeGates:new Set([10]),consciousnessLevel:1,agents:new Map([["a",{id:"a",currentPlace:"x",needs:{growth:20}}]]),places:new Map([["x",{artifacts:[]}],["y",{artifacts:[]}]])};
  const habitat=createHabitat(world,{conditions:[occupancyCondition()],instantiate(genome){
    // Test-only descendant fixture. Not Claude's Little Miracles.
    return {run(snapshot){if(genome.bad)return {};return Object.fromEntries(snapshot.places.map(p=>[p.id,snapshot.agents.filter(a=>a.currentPlace===p.id).length]))}};
  }});
  const session=habitat.enter("fixture-swarm");
  check(session.conditions()[0].id==="world-occupancy","condition visible");
  const observed=session.observe(); observed.agents[0].needs.growth=999;
  check(world.agents.get("a").needs.growth===20,"observation isolated");
  check(fails(()=>session.settle({conditionId:"world-occupancy",descendantId:"bad",genome:{bad:true}})),"reject invalid candidate");
  check(habitat.residentIds().length===0,"no invalid installation");
  check(session.settle({conditionId:"world-occupancy",descendantId:"good",genome:{bad:false}}).verifiedSamples===3,"three challenge samples");
  check(habitat.tick()[0].result.x===1,"resident executes");
  check(session.extract().descendants[0]==="good","extract receipt");
  check(fails(()=>session.observe()),"session revoked");
  world.agents.get("a").currentPlace="y";
  check(habitat.tick()[0].result.y===1&&habitat.results()[0].result.x===0,"resident still responds after extraction");
  check(fails(()=>session.settle({conditionId:"world-occupancy",descendantId:"late",genome:{}})),"extracted swarm cannot install");
  return n;
}
console.log(`${runTests(createHabitat,occupancyCondition)} host fixture assertions passed`);
