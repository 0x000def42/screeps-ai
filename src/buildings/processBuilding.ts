import layouts, { exitGates } from "buildings/layouts"

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

function placeSites(room : Room, positions : { pos : { x : number, y : number }, type : BuildableStructureConstant }[]) {
  positions.forEach(position => {
    const result = room.createConstructionSite(position.pos.x, position.pos.y, position.type)
    if(result != OK) console.log(`${room.name}: cannot place ${position.type} at ${position.pos.x},${position.pos.y} -> ${result}`)
  })
}

export default () => {
  Object.values(Game.rooms).forEach(room => {
    if(!room.controller || !room.controller.my) return
    if(Game.time % 10 != 0) return
    if(room.find(FIND_CONSTRUCTION_SITES).length > 0) return

    if(!room.spawns[0]){
      placeSites(room, layouts.firstSpawnLayout(room))
      return
    }

    if(Game.time % 50 == 0){
      exitGates(room).forEach(gateway => {
        gateway.gate.lookFor(LOOK_STRUCTURES)
          .filter(structure => structure.structureType == STRUCTURE_WALL)
          .forEach(structure => structure.destroy())
      })
    }

    const layout = checks[Math.floor(Game.time / 10) % checksLenght](room)
    if(layout) placeSites(room, layout(room))
  })
}
