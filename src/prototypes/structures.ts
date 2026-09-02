export default function definePrototypes(){
  Object.defineProperties(StructureContainer.prototype, {
    carryBodyparts: {
      get() : number {
        const container = (this as StructureContainer)
        return _.sum(container.creeps.map(creep => creep.body.filter(part => part.type == CARRY).length))
      }
    },
    creeps: {
      get() : Creep[] {
        const container = (this as StructureContainer)
        return Object.values(Game.creeps).filter(creep => creep.memory.targetId == container.id)
      }
    },
  })
}
