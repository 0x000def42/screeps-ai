export default function definePrototypes(){
  function getExtension(this: Source){
    let id = this.memory.extensionId

    if(!id || Game.time % 50 == 0){
      this.memory.extensionId = this.pos.findInRange(FIND_MY_STRUCTURES, 2, {
        filter: s => s.structureType == STRUCTURE_EXTENSION
      })[0]?.id
    }

    id ||= this.memory.extensionId

    if(id) {
      const extension = Game.getObjectById(id)
      if(!extension) this.memory.extensionId = undefined
      return extension
    }

    return null
  }

  function getContainer(this: Source){
    return (this.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (structure) => structure.structureType == STRUCTURE_CONTAINER
    }) as StructureContainer[])[0]
  }

  function getMemory(this: Source){
    return Memory.sources[this.id] ||= {}
  }

  Object.defineProperties(Source.prototype, {
    spots: {
      get() : RoomPosition[] {
        if(this._spots) return this._spots
        const source = (this as Source)
        const room = source.room
        const positions = room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true)
                              .filter((pos) => pos.terrain)
                              .filter((pos) => pos.terrain != "wall" )
        this._spots ||= positions.map(pos => new RoomPosition(pos.x, pos.y, room.name))
        return this._spots
      }
    },
    creeps: {
      get() : Creep[] {
        const source = (this as Source)
        return Object.values(Game.creeps).filter(creep => (creep.memory.targetId == source.id || creep.memory.prevTargetId == source.id) && creep.ticksToLive && creep.ticksToLive > 120)
      }
    },
    workBodyparts: {
      get() : number {
        const source = (this as Source)
        return _.sum(source.creeps.map(creep => creep.body.filter(part => part.type == WORK).length))
      }
    },
    extension: { get: getExtension},
    container: { get: getContainer},
    memory: { get: getMemory }
  })
}
