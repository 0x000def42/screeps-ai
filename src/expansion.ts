import { barrierTargetHits } from "processors/processRoom"

const scoutSearchDepth = 12

const ownedRooms = () => Object.values(Game.rooms).filter(room => !!room.controller && room.controller.my)

export function recordIntel() {
  Memory.intel ||= {}

  Object.values(Game.rooms).forEach(room => {
    const controller = room.controller
    Memory.intel[room.name] = {
      sources: room.find(FIND_SOURCES).length,
      owner: controller && controller.owner ? controller.owner.username : null,
      claimable: !!controller,
      keeper: room.find(FIND_STRUCTURES, {
        filter: structure => structure.structureType == STRUCTURE_KEEPER_LAIR
      }).length > 0,
      seen: Game.time
    }
  })
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
      Memory.expansion = null
    }
    return
  }
  if(owned.length >= Game.gcl.level){
    Memory.expansion = null
    Memory.scoutTarget = null
    return
  }


  const bases = owned.filter(readyToExpand)
  if(bases.length == 0){
    Memory.scoutTarget = null
    return
  }

  const target = bestExpansion(bases)
  if(target){
    console.log(`expansion into ${target.room} from ${target.base}`)
    Memory.expansion = { room: target.room, base: target.base }
    Memory.scoutTarget = null
    return
  }

  Memory.scoutTarget = nextScoutTarget()
}
