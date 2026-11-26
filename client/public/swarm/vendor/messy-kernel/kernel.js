/*
 * Synthia/MESSY experimental semantic-simulation kernel v0.1
 * Independent, original implementation of a DELIBERATELY SMALL subset of
 * concepts in Matthew A. Applebaum's Meta-Symbolic Simulation System manual.
 * This is NOT the original MESSY implementation or an interpreter of its syntax.
 * It is NOT an integration into the user's installed Synthia computer.
 * No external libraries, network, eval, or code execution.
 */
(function(root,make){
  const api=make();
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  if(root) root.SynthiaMessyKernel=api;
})(typeof globalThis !== 'undefined' ? globalThis : this,function(){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const vars=x=>typeof x==='string' && x.charAt(0)==='?';
  const validText=x=>typeof x==='string' && x.length>0 && x.length<=300;
  function invariant(p,message){if(!p)throw new Error(message)}
  function value(term,b){
    if(vars(term))return Object.hasOwn(b,term)?b[term]:undefined;
    if(term&&typeof term==='object'&&!Array.isArray(term)){
      if(Object.hasOwn(term,'add'))return value(term.add[0],b)+value(term.add[1],b);
      if(Object.hasOwn(term,'mul'))return value(term.mul[0],b)*value(term.mul[1],b);
      if(Object.hasOwn(term,'sub'))return value(term.sub[0],b)-value(term.sub[1],b);
    }
    return term;
  }
  function matchTerm(pattern,actual,b){
    if(vars(pattern)){
      if(Object.hasOwn(b,pattern))return Object.is(b[pattern],actual)?b:null;
      return {...b,[pattern]:actual};
    }
    return Object.is(pattern,actual)?b:null;
  }
  const numericOps={
    double:{in:'number',out:'number',run:x=>x*2},
    add3:{in:'number',out:'number',run:x=>x+3},
    minus1:{in:'number',out:'number',run:x=>x-1},
    square:{in:'number',out:'number',run:x=>x*x}
  };
  class Kernel{
    constructor(seed=23){
      invariant(Number.isInteger(seed),'seed must be an integer');
      this.clock=0;this.seed=seed>>>0;this.nodes={};this.triples=[];
      this.groups={};this.functions={};this.events=[];this.eventId=0;this.tripleId=0;
    }
    event(type,data){const entry={id:++this.eventId,t:this.clock,type,data:clone(data)};this.events.push(entry);return entry;}
    node(id,meta={}){
      invariant(validText(id),'node id must be a non-empty string');
      if(!this.nodes[id]){this.nodes[id]={id,meta:clone(meta)};this.event('NODE',{id});}
      return this.nodes[id];
    }
    // Opaque user-authored meaning address. No invented geometric semantics.
    setAddress(id,address){
      invariant(validText(id)&&typeof address==='string'&&address.length>0&&address.length<=2000,'address must be an opaque, non-empty string');
      const n=this.node(id);n.meta.address=address;
      this.event('ADDRESS',{id,address});return n.meta.address;
    }
    assert(s,p,o,secondary={}){
      invariant(validText(s)&&validText(p),'subject and predicate must be names');
      invariant(o!==undefined && o!==null,'object must be defined');
      this.node(s);if(typeof o==='string')this.node(o);
      const prev=this.triples.find(t=>t.live&&t.s===s&&t.p===p&&Object.is(t.o,o));
      if(prev)return prev;
      const t={id:++this.tripleId,s,p,o,secondary:clone(secondary),created:this.clock,removed:null,live:true};
      this.triples.push(t);this.event('ASSERT',{id:t.id,s,p,o,secondary});return t;
    }
    neg(s,p,o){
      let count=0;
      for(const t of this.triples){if(t.live&&t.s===s&&t.p===p&&(o===undefined||Object.is(t.o,o))){t.live=false;t.removed=this.clock;count++;this.event('NEG',{id:t.id,s:t.s,p:t.p,o:t.o});}}
      return count;
    }
    set(s,p,o){
      invariant(o!==undefined&&o!==null,'SET requires value');
      this.neg(s,p);return this.assert(s,p,o);
    }
    active(){return this.triples.filter(t=>t.live);}
    query({s,p,o}={}){return this.active().filter(t=>(s===undefined||Object.is(t.s,s))&&(p===undefined||Object.is(t.p,p))&&(o===undefined||Object.is(t.o,o)));}
    // A relational join over triples. Variables are bound through the SAME graph.
    solutions(patterns,where=[]){
      invariant(Array.isArray(patterns),'patterns must be an array');
      let solutions=[{}];
      for(const pattern of patterns){
        const next=[];
        for(const b of solutions)for(const t of this.active()){
          let x=matchTerm(pattern.s,t.s,b);if(!x)continue;
          x=matchTerm(pattern.p,t.p,x);if(!x)continue;
          x=matchTerm(pattern.o,t.o,x);if(x)next.push(x);
        }
        solutions=next;
        if(!solutions.length)break;
      }
      return solutions.filter(b=>where.every(w=>{
        const l=value(w.left,b),r=value(w.right,b);
        switch(w.op){
          case 'eq':return Object.is(l,r);
          case 'neq':return !Object.is(l,r);
          case 'gt':return l>r;
          case 'gte':return l>=r;
          case 'lt':return l<r;
          case 'lte':return l<=r;
          default:throw new Error('unsupported where comparison: '+w.op);
        }
      }));
    }
    addGroup(id,{interval=1,enabled=true,rules=[]}={}){
      invariant(validText(id),'group requires id');
      invariant(Number.isInteger(interval)&&interval>0,'interval must be positive integer');
      invariant(Array.isArray(rules),'rules must be an array');
      this.groups[id]={id,interval,enabled:!!enabled,next:this.clock+interval,rules:clone(rules)};
      this.event('GROUP',{id,interval,enabled,rules:rules.length});
    }
    random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
    act(action,b){
      const s=value(action.s,b),p=value(action.p,b),o=value(action.o,b);
      switch(action.op){
        case 'ASSERT':return this.assert(s,p,o,action.secondary||{});
        case 'NEG':return this.neg(s,p,o);
        case 'SET':return this.set(s,p,o);
        case 'ENABLE':invariant(this.groups[s],'missing group: '+s);this.groups[s].enabled=true;this.event('ENABLE',{id:s});return;
        case 'DISABLE':invariant(this.groups[s],'missing group: '+s);this.groups[s].enabled=false;this.event('DISABLE',{id:s});return;
        default:throw new Error('unsupported action: '+action.op);
      }
    }
    tick(){
      this.clock++;
      let firings=0;
      for(const group of Object.values(this.groups)){
        if(!group.enabled||this.clock<group.next)continue;
        group.next=this.clock+group.interval;
        this.event('SCHEDULE',{group:group.id});
        for(const rule of group.rules){
          invariant(Array.isArray(rule.when)&&Array.isArray(rule.then),'rule must have when and then arrays');
          const odds=rule.probability===undefined?1:rule.probability;
          invariant(typeof odds==='number'&&odds>=0&&odds<=1,'probability must be 0..1');
          for(const b of this.solutions(rule.when,rule.where||[])){
            if(this.random()<odds){
              this.event('RULE',{group:group.id,rule:rule.id||null,bindings:b});
              for(const action of rule.then)this.act(action,b);
              firings++;
            }else this.event('SKIP',{group:group.id,rule:rule.id||null,bindings:b});
          }
        }
      }
      this.event('TICK_END',{firings});
      return {clock:this.clock,firings};
    }
    // A hypothetical run that does not affect the live state, event log or RNG.
    lookAhead(steps){
      invariant(Number.isInteger(steps)&&steps>=0&&steps<=1000,'invalid lookahead steps');
      const sim=Kernel.fromJSON(this.toJSON());
      const results=[];for(let i=0;i<steps;i++)results.push(sim.tick());
      return {results,simulated:sim.toJSON(),actualClock:this.clock};
    }
    // Search candidate COMPOSITIONS from approved primitive operations.
    // This is bounded synthesis against examples, not unconstrained AI learning.
    synthesize(id,examples,allowed=['double','add3','minus1','square'],maxDepth=3){
      invariant(validText(id),'function needs id');
      invariant(Array.isArray(examples)&&examples.length>=2,'two or more examples required');
      invariant(examples.every(e=>typeof e.input==='number'&&Number.isFinite(e.input)&&typeof e.output==='number'&&Number.isFinite(e.output)),'numeric examples required');
      invariant(Number.isInteger(maxDepth)&&maxDepth>=1&&maxDepth<=5,'depth must be 1..5');
      const ops=allowed.filter(n=>Object.hasOwn(numericOps,n));
      invariant(ops.length===allowed.length && ops.length>0,'unapproved primitive');
      let layer=[[]];let found=null;
      for(let depth=1;depth<=maxDepth && found===null;depth++){
        const next=[];
        for(const prefix of layer)for(const op of ops){
          const plan=[...prefix,op];
          const pass=examples.every(e=>Object.is(this.evalPlan(plan,e.input),e.output));
          if(pass){found=plan;break}
          next.push(plan);
        }
        layer=next;
      }
      if(!found){this.event('SYNTHESIS_FAILED',{id,examples,allowed,maxDepth});return null}
      const created={id,type:'number->number',plan:found,training:clone(examples),verified:examples.every(e=>Object.is(this.evalPlan(found,e.input),e.output)),provenance:{method:'bounded-enumeration',allowed:clone(allowed),maxDepth,createdAt:this.clock}};
      this.functions[id]=created;this.event('SYNTHESIS',{id,plan:found,examples});return clone(created);
    }
    evalPlan(plan,input){
      invariant(typeof input==='number'&&Number.isFinite(input),'numeric input required');
      let out=input;
      for(const n of plan){invariant(Object.hasOwn(numericOps,n),'unapproved primitive');out=numericOps[n].run(out)}
      return out;
    }
    executeFunction(id,input,{subject='Synthia',predicate='expression'}={}){
      const fn=this.functions[id];invariant(fn,'missing function: '+id);
      const output=this.evalPlan(fn.plan,input);
      invariant(Number.isFinite(output),'non-finite result');
      this.set(subject,predicate,output);
      this.event('EXECUTE',{id,input,output,subject,predicate});
      return output;
    }
    toJSON(){return clone({schema:'synthia-messy-kernel.v0.1',clock:this.clock,seed:this.seed,nodes:this.nodes,triples:this.triples,groups:this.groups,functions:this.functions,events:this.events,eventId:this.eventId,tripleId:this.tripleId});}
    static fromJSON(json){
      const d=typeof json==='string'?JSON.parse(json):clone(json);
      invariant(d&&d.schema==='synthia-messy-kernel.v0.1','unsupported snapshot schema');
      const k=new Kernel(d.seed);k.clock=d.clock;k.seed=d.seed;k.nodes=d.nodes;k.triples=d.triples;k.groups=d.groups;k.functions=d.functions;k.events=d.events;k.eventId=d.eventId;k.tripleId=d.tripleId;
      return k;
    }
  }
  function demoKernel(){
    const k=new Kernel(20261115);
    // A person's identity and expression are aspects of ONE network.
    k.node('Observer',{kind:'being'});k.node('Signal',{kind:'phenomenon'});
    k.assert('Observer','observes','Signal');
    k.set('Signal','level',1);
    k.addGroup('experience',{interval:1,rules:[{
      id:'observe-level',
      when:[{s:'?who',p:'observes',o:'?what'},{s:'?what',p:'level',o:'?level'}],
      where:[{left:'?level',op:'gte',right:1}],
      probability:1,
      then:[
        {op:'ASSERT',s:'?who',p:'experienced',o:'?what'},
        {op:'SET',s:'?what',p:'level',o:{add:['?level',1]}}
      ]
    }]});
    return k;
  }
  return {Kernel,demoKernel,PRIMITIVES:Object.keys(numericOps)};
});
