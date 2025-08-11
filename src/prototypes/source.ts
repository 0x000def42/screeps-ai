export default function definePrototypes(){
  Object.defineProperties(Source.prototype, {
    spots: {
      get() : RoomPosition[] {
        const source = (this as Source)
        const room = source.room
        const positions = room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true)
                              .filter((pos) => pos.terrain)
                              .filter((pos) => pos.terrain != "wall" )
        return positions.map(pos => new RoomPosition(pos.x, pos.y, room.name))
      }
    },
    creeps: {
      get() : Creep[] {
        const source = (this as Source)
        return Object.values(Game.creeps).filter(creep => creep.memory.targetId == source.id || creep.memory.prevTargetId == source.id)
      }
    }
  })
}
