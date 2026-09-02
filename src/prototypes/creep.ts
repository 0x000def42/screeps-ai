import profiler from "screeps-profiler"

function target(this: Creep){
  return Game.getObjectById(this.memory.targetId as Id<_HasId>)
}

export default function definePrototypes(){
  Object.defineProperties(Creep.prototype, {
    withoutWithdrawal: {
      get() : boolean {
        return Object.values(Game.creeps).filter(c => c.memory.targetId == this.id).length == 0
      }
    },
    target: { get: profiler.registerFN(target, "Creep.target") as () => any }
  })
}
