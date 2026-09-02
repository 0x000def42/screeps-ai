import layouts, { exitGate } from "buildings/layouts"

const checks: any[] = []
checks.push((room: Room) => {
  if(room.sources.filter(s => !s.container).length == 0 && room.spawns[0].container) return

  return layouts.sourceContainerLayout
})

checks.push((room: Room) => {
  if(((room.sources.filter(s => !s.extension).length == 0) && room.spawns[0].anotherContainer) || room.controller?.my && room.controller.level < 2) return
  return layouts.sourceExtensionsLayout
})

checks.push((room : Room) => {
  const controller = room.controller as StructureController
  if( room.extensions.length < CONTROLLER_STRUCTURES["extension"][controller.level] && room.spawns[0].anotherContainer) return layouts.extensions
  return
})

checks.push((room : Room) => {
  const controller = room.controller as StructureController
  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_EXTENSION
  }).length
  if(extensions < CONTROLLER_STRUCTURES["extension"][controller.level]) return

  const built = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_TOWER
  }).length
  if(built < CONTROLLER_STRUCTURES["tower"][controller.level]) return layouts.towersLayout
  return
})

checks.push((room : Room) => {
  const controller = room.controller as StructureController
  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_EXTENSION
  }).length
  if(extensions < CONTROLLER_STRUCTURES["extension"][controller.level]) return

  const towers = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_TOWER
  }).length
  if(towers < CONTROLLER_STRUCTURES["tower"][controller.level]) return

  return layouts.wallsLayout
})

const checksLenght = checks.length

export default () => {
  Object.values(Game.rooms).forEach(room => {
    if(Game.time % 10 == 0){
      const gateway = exitGate(room)
      if(gateway){
        gateway.gate.lookFor(LOOK_STRUCTURES)
          .filter(structure => structure.structureType == STRUCTURE_WALL)
          .forEach(structure => structure.destroy())
      }

      if(room.find(FIND_CONSTRUCTION_SITES).length == 0){
        const layout = checks[Math.floor(Game.time / 10) % checksLenght](room)
        if(layout){
          const layoutPositions = layout(room)

          layoutPositions.forEach((layoutPosition: { pos: { x: number; y: number }; type: BuildableStructureConstant }) => {
            const result = room.createConstructionSite(layoutPosition.pos.x, layoutPosition.pos.y, layoutPosition.type)
            if(result != OK) console.log(`${room.name}: cannot place ${layoutPosition.type} at ${layoutPosition.pos.x},${layoutPosition.pos.y} -> ${result}`)
          })
        }
      }
    }
  })
  // global.h.checkLayout = (roomName : string, name : string) => {
  //   Object.values(Game.flags).filter(f => f.color == COLOR_GREY).forEach(f => f.remove())
  //   const room = Game.rooms[roomName]
  //   const layoutPositions = (layouts as any)[name](room)
  //   let i = 0
  //   layoutPositions.forEach((pos: { pos: RoomPosition, type: any }) => {
  //     console.log(room.createFlag(pos.pos, `${pos.type}:${i++}`, COLOR_GREY))
  //   })
  // }
}
