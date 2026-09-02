import { barrierTargetHits } from "processors/processRoom"
import { posByDirections } from "buildings/layouts"

const scoutSearchDepth = 12

const ownedRooms = () => Object.values(Game.rooms).filter(room => !!room.controller && room.controller.my)

export function recordIntel() {
  Memory.intel ||= {}

  Object.keys(Memory.intel).forEach(name => {
    const entry = Memory.intel[name]
    if(!entry.sourcePositions || entry.fit === undefined) delete Memory.intel[name]
  })

  Object.values(Game.rooms).forEach(room => {
    const controller = room.controller
    const sources = room.find(FIND_SOURCES)
    const known = Memory.intel[room.name]

    Memory.intel[room.name] = {
      sources: sources.length,
      sourcePositions: sources.map(source => ({ x: source.pos.x, y: source.pos.y })),
      controller: controller ? { x: controller.pos.x, y: controller.pos.y } : null,
      owner: controller && controller.owner ? controller.owner.username : null,
      claimable: !!controller,
      keeper: room.find(FIND_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_KEEPER_LAIR
      }).length > 0,
      fit: known && known.fit !== undefined ? known.fit : 0,
      seen: Game.time
    }

    if(!known || known.fit === undefined) Memory.intel[room.name].fit = layoutCapacity(room.name)
  })
}

const minimumExtensionCapacity = 40
const fullExtensionCapacity = 60

export function layoutCapacity(roomName : string) {
  const intel = Memory.intel ? Memory.intel[roomName] : null
  if(!intel || !intel.controller || !intel.sourcePositions || intel.sourcePositions.length < 2) return 0

  const terrain = Game.map.getRoomTerrain(roomName)
  const rock = (x : number, y : number) => x < 1 || x > 48 || y < 1 || y > 48 || terrain.get(x, y) == TERRAIN_MASK_WALL
  const controller = new RoomPosition(intel.controller.x, intel.controller.y, roomName)
  const sources = intel.sourcePositions.map(position => new RoomPosition(position.x, position.y, roomName))
  const key = (pos : RoomPosition) => pos.x + ":" + pos.y

  const clearAround = (pos : RoomPosition) => {
    for(let dx = -1; dx <= 1; dx++){
      for(let dy = -1; dy <= 1; dy++){
        if(rock(pos.x + dx, pos.y + dy)) return false
      }
    }
    return true
  }

  let spawn : RoomPosition | null = null
  let bestScore = 0

  for(let distance = 3; distance <= 4 && !spawn; distance++){
    for(let dx = -distance; dx <= distance; dx++){
      for(let dy = -distance; dy <= distance; dy++){
        if(Math.max(Math.abs(dx), Math.abs(dy)) != distance) continue
        const x = controller.x + dx
        const y = controller.y + dy
        if(x < 4 || x > 45 || y < 4 || y > 45) continue

        const pos = new RoomPosition(x, y, roomName)
        if(!clearAround(pos)) continue

        const toController = pos.getDirectionTo(controller)
        const container = posByDirections(pos, [toController])
        if(rock(container.x, container.y) || container.getRangeTo(controller) > 3) continue

        const another = posByDirections(pos, [((toController + 3) % 8) + 1])
        if(rock(another.x, another.y)) continue
        if(sources.filter(source => pos.getRangeTo(source) < 3)[0]) continue

        const score = sources.reduce((total, source) => total + pos.getRangeTo(source), 0)
        if(!spawn || score < bestScore){
          spawn = pos
          bestScore = score
        }
      }
    }
  }

  if(!spawn) return 0

  const direction = ((spawn.getDirectionTo(controller) + 3) % 8) + 1
  const posADdir = ((direction + 5) % 8) + 1
  const posBDir = ((posADdir + 3) % 8) + 1
  const centerPos = posByDirections(spawn, [direction, direction, direction, direction])
  const towerBase = posByDirections(spawn, [direction, direction])

  const taken : { [tile : string] : boolean } = {}
  taken[key(spawn)] = true
  taken[key(controller)] = true
  sources.forEach(source => taken[key(source)] = true)

  const towerOffsets = [[], [posADdir], [posBDir], [posADdir, posADdir], [posBDir, posBDir], [posADdir, posADdir, posADdir]]
  towerOffsets.forEach(offset => taken[key(posByDirections(towerBase, offset.slice()))] = true)

  const branch : any = { A: posADdir, B: posBDir }
  let queue : any[] = [
    ['A', posByDirections(centerPos, [posADdir, posADdir])],
    ['A', posByDirections(centerPos, [direction, posADdir])],
    ['B', posByDirections(centerPos, [direction, posBDir])],
    ['B', posByDirections(centerPos, [posBDir, posBDir])],
    ['A', posByDirections(centerPos, [posADdir, posADdir, posADdir])],
    ['A', posByDirections(centerPos, [posADdir, direction, direction])],
    ['B', posByDirections(centerPos, [posBDir, posBDir, posBDir])],
    ['B', posByDirections(centerPos, [posBDir, direction, direction])]
  ]

  let fitted = 0
  while(fitted < fullExtensionCapacity && queue.length > 0){
    const next : any[] = []
    queue.forEach((entry : any) => {
      if(fitted >= fullExtensionCapacity) return
      const pos = entry[1] as RoomPosition
      if(pos.x <= 2 || pos.x >= 48 || pos.y <= 2 || pos.y >= 48) return
      if(!rock(pos.x, pos.y) && !taken[key(pos)]){
        taken[key(pos)] = true
        fitted++
      }
      next.push([entry[0], posByDirections(pos, [direction, branch[entry[0]]])])
    })
    queue = next
  }

  return fitted
}

export function readyToExpand(room : Room) {
  const controller = room.controller
  if(!controller || !controller.my || controller.level < 3) return false
  if(!room.spawns[0]) return false
  if(room.find(FIND_CONSTRUCTION_SITES).length > 0) return false

  return room.find(FIND_STRUCTURES, {
    filter: structure => structure.hits < barrierTargetHits(structure)
  }).length == 0
}

function nextScoutTarget() {
  const visited : { [roomName: string]: boolean } = {}
  let frontier = ownedRooms().map(room => room.name)
  frontier.forEach(name => visited[name] = true)

  for(let depth = 0; depth < scoutSearchDepth && frontier.length > 0; depth++){
    const next : string[] = []
    frontier.forEach(name => {
      const exits = Game.map.describeExits(name) || {}
      Object.values(exits).forEach(neighbour => {
        if(!neighbour || visited[neighbour]) return
        visited[neighbour] = true
        const intel = Memory.intel[neighbour]
        if(!intel) {
          next.unshift(neighbour)
          return
        }
        if(intel.keeper) return
        next.push(neighbour)
      })
    })
    const unknown = next.filter(name => !Memory.intel[name])[0]
    if(unknown) return unknown
    frontier = next
  }

  return null
}

function keeperAware(roomName : string) {
  const intel = Memory.intel[roomName]
  return intel && intel.keeper ? Infinity : 1
}

interface ExpansionPlan {
  room : string
  base : string
  distance : number
}

function bestExpansion(bases : Room[]) : ExpansionPlan | null {
  let best : ExpansionPlan | null = null

  Object.keys(Memory.intel).forEach(name => {
    const intel = Memory.intel[name]
    if(intel.keeper || intel.owner || !intel.claimable || intel.sources < 2) return
    if((intel.fit || 0) < minimumExtensionCapacity) return


    bases.forEach(base => {
      if(base.name == name) return
      const route = Game.map.findRoute(base.name, name, { routeCallback: keeperAware })
      if(route == ERR_NO_PATH) return
      const distance = (route as { exit : ExitConstant, room : string }[]).length
      if(!best || distance < best.distance) best = { room: name, base: base.name, distance }
    })
  })

  return best
}

export default function manageExpansion() {
  recordIntel()

  const owned = ownedRooms()

  const unfinished = owned.filter(room => room.find(FIND_MY_SPAWNS).length == 0)[0]
  if(unfinished && (!Memory.expansion || Memory.expansion.room != unfinished.name)){
    const base = owned.filter(room => room.find(FIND_MY_SPAWNS).length > 0)[0]
    if(base) Memory.expansion = { room: unfinished.name, base: base.name }
  }

  if(Memory.expansion){
    const claimed = Game.rooms[Memory.expansion.room]
    if(claimed && claimed.controller && claimed.controller.my && claimed.find(FIND_MY_SPAWNS).length > 0){
      console.log(`expansion into ${Memory.expansion.room} finished`)
      Object.values(Game.creeps).forEach(creep => {
        if(creep.memory.role != "remoteBuilder") return
        creep.memory.role = "worker"
        creep.memory.action = "idle"
        creep.memory.targetId = null
        creep.memory.prevAction = "idle"
        creep.memory.prevTargetId = null
      })
      Memory.expansion = null
    }
    return
  }
  if(owned.length >= Game.gcl.level){
    Memory.expansion = null
    Memory.scoutTarget = null
    return
  }


  const candidateKnown = Object.keys(Memory.intel).some(name => {
    const intel = Memory.intel[name]
    return !intel.keeper && !intel.owner && intel.claimable && intel.sources >= 2 && (intel.fit || 0) >= minimumExtensionCapacity
  })

  if(!candidateKnown){
    Memory.scoutTarget = nextScoutTarget()
    return
  }

  Memory.scoutTarget = null

  const bases = owned.filter(readyToExpand)
  if(bases.length == 0) return

  const target = bestExpansion(bases)
  if(target){
    console.log(`expansion into ${target.room} from ${target.base}`)
    Memory.expansion = { room: target.room, base: target.base }
  }
}
