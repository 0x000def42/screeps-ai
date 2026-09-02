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

const towerPositions = (room : Room) => {
  const spawnPos = room.spawns[0].pos
  const controller = room.controller as StructureController
  const direction = ((spawnPos.getDirectionTo(controller.pos.x, controller.pos.y) + 3) % 8) + 1
  const posADdir = ((direction + 5) % 8) + 1
  const posBDir = ((posADdir + 3) % 8) + 1
  const basePos = posByDirections(spawnPos, [direction, direction])

  return [
    [],
    [posADdir],
    [posBDir],
    [posADdir, posADdir],
    [posBDir, posBDir],
    [posADdir, posADdir, posADdir]
  ].map(offset => posByDirections(basePos, offset.slice()))
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

  const reservedForTowers = towerPositions(room).map(pos => pos.x + ":" + pos.y)

  const freeForExtension = (pos : RoomPosition) => {
    if(terrain.get(pos.x, pos.y) == TERRAIN_MASK_WALL) return false
    if(reservedForTowers.indexOf(pos.x + ":" + pos.y) >= 0) return false
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
const towersLayout = (room : Room) => {
  const positions : any = []
  const terrain = Game.map.getRoomTerrain(room.name)
  const controller = room.controller as StructureController
  const limit = CONTROLLER_STRUCTURES["tower"][controller.level]
  let built = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_TOWER
  }).length

  towerPositions(room).forEach(pos => {
    if(built >= limit) return
    if(pos.x <= 2 || pos.x >= 48 || pos.y <= 2 || pos.y >= 48) return
    if(terrain.get(pos.x, pos.y) == TERRAIN_MASK_WALL) return
    if(pos.lookFor(LOOK_CONSTRUCTION_SITES)[0]) return
    if(pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType != STRUCTURE_ROAD && s.structureType != STRUCTURE_RAMPART)[0]) return
    positions.push({ pos, type: STRUCTURE_TOWER })
    built++
  })

  return positions
}

const wallEdges = [
  (depth : number, index : number) => [depth, index],
  (depth : number, index : number) => [49 - depth, index],
  (depth : number, index : number) => [index, depth],
  (depth : number, index : number) => [index, 49 - depth]
]

const wallsLayout = (room : Room) => {
  const positions : any = []
  const terrain = Game.map.getRoomTerrain(room.name)
  const batchLimit = 10

  const isRock = (x : number, y : number) => terrain.get(x, y) == TERRAIN_MASK_WALL

  const claim = (x : number, y : number) => {
    if(positions.length >= batchLimit) return
    if(x < 1 || x > 48 || y < 1 || y > 48) return
    if(isRock(x, y)) return
    const pos = new RoomPosition(x, y, room.name)
    if(pos.lookFor(LOOK_CONSTRUCTION_SITES)[0]) return
    if(pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType != STRUCTURE_ROAD)[0]) return
    positions.push({ pos, type: STRUCTURE_WALL })
  }

  const sealRun = (edge : (depth : number, index : number) => number[], from : number, to : number) => {
    const lo = Math.max(1, from - 2)
    const hi = Math.min(48, to + 2)
    for(let i = lo; i <= hi; i++){
      const line = edge(2, i)
      claim(line[0], line[1])
    }
    const lowCap = edge(1, lo)
    claim(lowCap[0], lowCap[1])
    const highCap = edge(1, hi)
    claim(highCap[0], highCap[1])
  }

  wallEdges.forEach(edge => {
    let runStart = -1
    for(let i = 0; i <= 50; i++){
      const border = i < 50 ? edge(0, i) : null
      const open = !!border && !isRock(border[0], border[1])
      if(open && runStart < 0) runStart = i
      if(!open && runStart >= 0){
        sealRun(edge, runStart, i - 1)
        runStart = -1
      }
    }
  })

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
  sourceContainerLayout, roadsLayout, sourceExtensionsLayout, extensions, towersLayout, wallsLayout
}
