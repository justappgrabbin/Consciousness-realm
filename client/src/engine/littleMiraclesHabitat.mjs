/** Host conditions for Claude's Little Miracles. No swarm implementation is bundled here. */
export function createHabitat(engine, options) {
  const copy = value => JSON.parse(JSON.stringify(value));
  const {conditions, instantiate} = options;
  if (typeof instantiate !== "function") throw Error("A trusted descendant runtime must be provided");
  const specs = new Map(conditions.map(c=>[c.id,c]));
  const residents = new Map(), sessions = new Set(), outputs = new Map();
  function observe() {
    return copy({
      time: engine.time,
      activeGates: Array.from(engine.activeGates),
      consciousnessLevel: engine.consciousnessLevel,
      agents: Array.from(engine.agents.values(),a=>({id:a.id,gate:a.gate,circuit:a.circuit,currentPlace:a.currentPlace,needs:a.needs,lifeStage:a.lifeStage})),
      places: Array.from(engine.places.entries(),([id,p])=>({id,artifactIds:(p.artifacts||[]).map(a=>a.id)}))
    });
  }
  function enter(id) {
    if(typeof id!=="string"||!id.trim()||sessions.has(id)) throw Error("Invalid or duplicate swarm session");
    sessions.add(id);
    const requirePresent=()=>{if(!sessions.has(id))throw Error("Swarm has extracted")};
    return Object.freeze({
      observe(){requirePresent();return observe()},
      conditions(){requirePresent();return Array.from(specs.values(),s=>copy({id:s.id,description:s.description,output:s.output}))},
      settle({conditionId,descendantId,genome}) {
        requirePresent();
        const spec=specs.get(conditionId);
        if(!spec||typeof descendantId!=="string"||!descendantId||residents.has(descendantId))throw Error("Unknown condition or invalid descendant ID");
        const inherited=copy(genome);
        const challenges=[observe(),...copy(spec.challenges||[])];
        for(const sample of challenges){
          const trial=instantiate(copy(inherited));
          if(!trial||typeof trial.run!=="function")throw Error("Runtime did not instantiate a descendant");
          const result=trial.run(copy(sample));
          if(!spec.verify(copy(sample),copy(result)))throw Error("Host verification failed");
        }
        const live=instantiate(copy(inherited));
        if(!live||typeof live.run!=="function")throw Error("Resident instantiation failed");
        residents.set(descendantId,{conditionId,owner:id,genome:inherited,live});
        return {descendantId,conditionId,verifiedSamples:challenges.length};
      },
      extract(){requirePresent();sessions.delete(id);return {swarmId:id,descendants:Array.from(residents).filter(([,r])=>r.owner===id).map(([key])=>key)}}
    });
  }
  function tick(){
    const snapshot=observe();
    for(const [id,resident] of residents){
      try{
        const result=resident.live.run(copy(snapshot));
        if(!specs.get(resident.conditionId).verify(copy(snapshot),copy(result)))throw Error("Resident failed host verification");
        outputs.set(id,{ok:true,result:copy(result)});
      }catch(error){outputs.set(id,{ok:false,error:String(error)})}
    }
    return results();
  }
  function results(){return Array.from(outputs,([id,record])=>({id,...copy(record)}))}
  return Object.freeze({enter,observe,tick,results,residentIds:()=>Array.from(residents.keys())});
}

export function occupancyCondition(){
  return {
    id:"world-occupancy",
    description:"Derive the number of agents at every existing world place from the current snapshot. Return zero for unoccupied places.",
    output:"JSON object keyed by existing place ID, values are nonnegative integer agent counts.",
    challenges:[
      {agents:[{id:"a",currentPlace:"x"},{id:"b",currentPlace:"x"},{id:"c",currentPlace:"y"}],places:[{id:"x"},{id:"y"},{id:"z"}]},
      {agents:[{id:"a",currentPlace:"y"}],places:[{id:"x"},{id:"y"}]}
    ],
    verify(snapshot,result){
      if(!result||typeof result!=="object"||Array.isArray(result)||Object.keys(result).length!==snapshot.places.length)return false;
      return snapshot.places.every(p=>Object.prototype.hasOwnProperty.call(result,p.id)&&result[p.id]===snapshot.agents.filter(a=>a.currentPlace===p.id).length);
    }
  };
}
