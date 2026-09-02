// global.h.checkLayout("sim", "containerLayout")
export function posByDirections(pos: RoomPosition, directions: number[]): RoomPosition {
  if(directions.length == 0) return pos

  let dx = 0, dy = 0;
  const direction = directions.shift()
  switch (direction) {
    case TOP: dy = -1; break;
    case TOP_RIGHT: dx = 1; dy = -1; break;
    case RIGHT: dx = 1; break;
    case BOTTOM_RIGHT: dx = 1; dy = 1; break;
    case BOTTOM: dy = 1; break;
    case BOTTOM_LEFT: dx = -1; dy = 1; break;
    case LEFT: dx = -1; break;
    case TOP_LEFT: dx = -1; dy = -1; break;
  }

  return posByDirections(new RoomPosition(pos.x + dx, pos.y + dy, pos.roomName), directions);
}

const sourceContainerLayout = (room : Room) => {
  const positions: { pos: RoomPosition; type: "container"; }[] = []
  const spawnPos = room.spawns[0].pos
  const controller = room.controller as StructureController
  const direction = spawnPos.getDirectionTo(controller.pos.x, controller.pos.y)
  positions.push({
    pos: posByDirections(spawnPos, [direction]),
    type: STRUCTURE_CONTAINER
  })

  room.sources.filter(s => !s.container).forEach(source => {
    positions.push({
      pos: room.fromPathStep(source.pos.findPathTo(room.spawns[0], {ignoreCreeps: true})[0]),
      type: STRUCTURE_CONTAINER
    })
  })

  return positions
}

const sourceExtensionsLayout = (room : Room) => {
  const positions : any = []

  if(!room.spawns[0].anotherContainer){
    const spawnPos = room.spawns[0].pos
    const controller = room.controller as StructureController
    const direction = spawnPos.getDirectionTo(controller.pos.x, controller.pos.y)

    positions.push({
      pos: posByDirections(spawnPos, [((direction + 3) % 8) + 1]),
      type: STRUCTURE_CONTAINER
    })
  }

  room.sources.filter(s => !s.extension).forEach(source => {
    positions.push({
      pos: room.fromPathStep(source.pos.findPathTo(room.spawns[0], {ignoreCreeps: true})[1]),
      type: STRUCTURE_EXTENSION
    })
  })

  return positions
}

const extensions = (room : Room) => {
  const positions : any = []
  const terrain = Game.map.getRoomTerrain(room.name)
  const spawnPos = room.spawns[0].pos
  const controller = room.controller as StructureController
  const direction = ((spawnPos.getDirectionTo(controller.pos.x, controller.pos.y) + 3) % 8) + 1
  const centerPos = posByDirections(spawnPos, [direction, direction, direction, direction])
  const limit = CONTROLLER_STRUCTURES["extension"][controller.level]
  let i = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_EXTENSION
  }).length
  const posADdir = ((direction + 5) % 8) + 1
  const posBDir = ((posADdir + 3) % 8) + 1

  const initialPoses = [
    ['A', posByDirections(centerPos, [posADdir, posADdir])],
    ['A', posByDirections(centerPos, [direction, posADdir])],
    ['B', posByDirections(centerPos, [direction, posBDir])],
    ['B', posByDirections(centerPos, [posBDir, posBDir])],
    ['A', posByDirections(centerPos, [posADdir, posADdir, posADdir])],
    ['A', posByDirections(centerPos, [posADdir, direction, direction])],
    ['B', posByDirections(centerPos, [posBDir, posBDir, posBDir])],
    ['B', posByDirections(centerPos, [posBDir, direction, direction])],
  ] as any

  const directions = {
    'A' : posADdir,
    'B' : posBDir
  } as any

  const insideBuildableArea = (pos : RoomPosition) => pos.x > 2 && pos.x < 48 && pos.y > 2 && pos.y < 48

  const freeForExtension = (pos : RoomPosition) => {
    if(terrain.get(pos.x, pos.y) == TERRAIN_MASK_WALL) return false
    if(pos.lookFor(LOOK_CONSTRUCTION_SITES)[0]) return false
    return !pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType != STRUCTURE_ROAD && s.structureType != STRUCTURE_RAMPART)[0]
  }

  let nextPoses = initialPoses
  let nextNextPoses : any
  while(i < limit && nextPoses.length > 0){
    nextNextPoses = []
    nextPoses.forEach((nextPos : any) => {
      if(i >= limit) return
      const pos = nextPos[1] as RoomPosition
      if(!insideBuildableArea(pos)) return
      if(freeForExtension(pos)){
        positions.push({ pos, type: STRUCTURE_EXTENSION })
        i++
      }
      nextNextPoses.push([nextPos[0], posByDirections(pos, [direction, directions[nextPos[0]]])])
    })
    nextPoses = nextNextPoses
  }

  return positions
}
// global.h.checkLayout("sim", "roadsLayout")
const roadsLayout = (room : Room) => {
  const positions : any = []

  room.sources.forEach(source => {
    source.pos.findPathTo(room.spawns[0].pos, {ignoreCreeps: true}).forEach(step => {
      positions.push({
        pos: room.fromPathStep(step), type: STRUCTURE_ROAD
      })
    })
  })

  return positions
}

export default {
  sourceContainerLayout, roadsLayout, sourceExtensionsLayout, extensions
}
