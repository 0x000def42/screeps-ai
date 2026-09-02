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

const edgeDirections = [LEFT, RIGHT, TOP, BOTTOM]

const internalEdges = (room : Room) => {
  const owner = room.controller && room.controller.owner ? room.controller.owner.username : null
  const exits = Game.map.describeExits(room.name) || {}
  const internal : number[] = []

  edgeDirections.forEach((direction, index) => {
    const neighbour = (exits as any)[String(direction)]
    if(!neighbour) return
    const intel = Memory.intel ? Memory.intel[neighbour] : null
    if(intel && owner && intel.owner == owner) internal.push(index)
  })

  return internal
}

const oppositeEdge = [1, 0, 3, 2]

const neighbourGateIndex = (room : Room, edgeIndex : number) => {
  const owner = room.controller && room.controller.owner ? room.controller.owner.username : null
  if(!owner) return null

  const exits = Game.map.describeExits(room.name) || {}
  const neighbour = (exits as any)[String(edgeDirections[edgeIndex])]
  if(!neighbour) return null

  const intel = Memory.intel ? Memory.intel[neighbour] : null
  if(!intel || intel.owner != owner) return null
  if(room.name < neighbour) return null

  const gates = Memory.gates ? Memory.gates[neighbour] : null
  if(!gates) return null

  const index = gates[String(oppositeEdge[edgeIndex])]
  return index === undefined ? null : index
}

const exitEdges = [
  {
    find: FIND_EXIT_LEFT,
    depthOf: (x : number, _y : number) => x,
    indexOf: (_x : number, y : number) => y,
    at: (room : Room, depth : number, index : number) => new RoomPosition(depth, index, room.name)
  },
  {
    find: FIND_EXIT_RIGHT,
    depthOf: (x : number, _y : number) => 49 - x,
    indexOf: (_x : number, y : number) => y,
    at: (room : Room, depth : number, index : number) => new RoomPosition(49 - depth, index, room.name)
  },
  {
    find: FIND_EXIT_TOP,
    depthOf: (_x : number, y : number) => y,
    indexOf: (x : number, _y : number) => x,
    at: (room : Room, depth : number, index : number) => new RoomPosition(index, depth, room.name)
  },
  {
    find: FIND_EXIT_BOTTOM,
    depthOf: (_x : number, y : number) => 49 - y,
    indexOf: (x : number, _y : number) => x,
    at: (room : Room, depth : number, index : number) => new RoomPosition(index, 49 - depth, room.name)
  }
] as any

export const exitGates = (room : Room) => {
  const spawn = room.spawns[0]
  const gates : { gate : RoomPosition, guards : RoomPosition[] }[] = []
  if(!spawn) return gates

  const terrain = Game.map.getRoomTerrain(room.name)
  Memory.gates ||= {}
  Memory.gates[room.name] ||= {}

  exitEdges.forEach((edge : any, index : number) => {
    const tiles = room.find(edge.find) as RoomPosition[]
    if(tiles.length == 0) return

    const passable = (position : number) => {
      const outer = edge.at(room, 1, position) as RoomPosition
      const inner = edge.at(room, 2, position) as RoomPosition
      return terrain.get(outer.x, outer.y) != TERRAIN_MASK_WALL && terrain.get(inner.x, inner.y) != TERRAIN_MASK_WALL
    }

    let gateIndex : number | null = neighbourGateIndex(room, index)
    if(gateIndex !== null && !passable(gateIndex)) gateIndex = null

    if(gateIndex === null){
      const exit = spawn.pos.findClosestByPath(tiles, { ignoreDestructibleStructures: true, ignoreCreeps: true })
      if(!exit) return

      const path = room.findPath(spawn.pos, exit, { ignoreDestructibleStructures: true, ignoreCreeps: true })
      if(path.length == 0) return

      for(let step = path.length - 1; step >= 0 && gateIndex === null; step--){
        if(edge.depthOf(path[step].x, path[step].y) == 2) gateIndex = edge.indexOf(path[step].x, path[step].y)
      }
    }

    if(gateIndex === null) return

    Memory.gates[room.name][String(index)] = gateIndex

    const guards = [gateIndex - 1, gateIndex, gateIndex + 1]
      .filter(position => position > 0 && position < 49)
      .map(position => edge.at(room, 3, position) as RoomPosition)

    gates.push({ gate: edge.at(room, 2, gateIndex) as RoomPosition, guards })
  })

  return gates
}

const firstSpawnLayout = (room : Room) => {
  const controller = room.controller as StructureController
  const terrain = Game.map.getRoomTerrain(room.name)
  const sources = room.find(FIND_SOURCES)

  const rock = (x : number, y : number) => terrain.get(x, y) == TERRAIN_MASK_WALL

  const clearAround = (pos : RoomPosition) => {
    for(let dx = -1; dx <= 1; dx++){
      for(let dy = -1; dy <= 1; dy++){
        if(rock(pos.x + dx, pos.y + dy)) return false
      }
    }
    return true
  }

  const upgradeSpotReady = (pos : RoomPosition) => {
    const toController = pos.getDirectionTo(controller.pos)
    const container = posByDirections(pos, [toController])
    if(rock(container.x, container.y)) return false
    if(container.getRangeTo(controller) > 3) return false
    const anotherContainer = posByDirections(pos, [((toController + 3) % 8) + 1])
    return !rock(anotherContainer.x, anotherContainer.y)
  }

  let best : { pos : RoomPosition, score : number } | null = null

  for(let distance = 3; distance <= 4 && !best; distance++){
    for(let dx = -distance; dx <= distance; dx++){
      for(let dy = -distance; dy <= distance; dy++){
        if(Math.max(Math.abs(dx), Math.abs(dy)) != distance) continue
        const x = controller.pos.x + dx
        const y = controller.pos.y + dy
        if(x < 4 || x > 45 || y < 4 || y > 45) continue
        const pos = new RoomPosition(x, y, room.name)
        if(!clearAround(pos)) continue
        if(!upgradeSpotReady(pos)) continue
        if(sources.filter(source => pos.getRangeTo(source) < 3)[0]) continue
        if(pos.lookFor(LOOK_STRUCTURES)[0]) continue
        const score = sources.reduce((total, source) => total + pos.getRangeTo(source), 0)
        if(!best || score < best.score) best = { pos, score }
      }
    }
  }

  return best ? [{ pos: best.pos, type: STRUCTURE_SPAWN }] : []
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
  const batchLimit = MAX_CONSTRUCTION_SITES - room.find(FIND_MY_CONSTRUCTION_SITES).length

  const isRock = (x : number, y : number) => terrain.get(x, y) == TERRAIN_MASK_WALL

  const gateways = exitGates(room)
  const isGate = (x : number, y : number) => !!gateways.find(gateway => gateway.gate.x == x && gateway.gate.y == y)

  const claim = (x : number, y : number, type : BuildableStructureConstant) => {
    if(positions.length >= batchLimit) return
    if(x < 1 || x > 48 || y < 1 || y > 48) return
    if(isRock(x, y)) return
    if(type == STRUCTURE_WALL && isGate(x, y)) return
    const pos = new RoomPosition(x, y, room.name)
    if(pos.lookFor(LOOK_CONSTRUCTION_SITES)[0]) return
    if(pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType != STRUCTURE_ROAD)[0]) return
    positions.push({ pos, type })
  }

  const sealRun = (edge : (depth : number, index : number) => number[], from : number, to : number) => {
    const lo = Math.max(1, from - 2)
    const hi = Math.min(48, to + 2)
    for(let i = lo; i <= hi; i++){
      const line = edge(2, i)
      claim(line[0], line[1], STRUCTURE_WALL)
    }
    const lowCap = edge(1, lo)
    claim(lowCap[0], lowCap[1], STRUCTURE_WALL)
    const highCap = edge(1, hi)
    claim(highCap[0], highCap[1], STRUCTURE_WALL)
  }

  wallEdges.forEach((edge, index) => {
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

  gateways.forEach(gateway => gateway.guards.forEach(pos => claim(pos.x, pos.y, STRUCTURE_RAMPART)))

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
  sourceContainerLayout, roadsLayout, sourceExtensionsLayout, extensions, towersLayout, wallsLayout, firstSpawnLayout
}
