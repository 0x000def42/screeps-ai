import roles from "roles"
import profiler from "screeps-profiler"

function creepName(roomName : string, role : string){
  return `${roomName}:${role} ${Game.time}`
}

function getAvailableSpawning(spawn: StructureSpawn){
  const creeps = Object.values(Game.creeps).filter(creep => creep.room == spawn.room && (creep.ticksToLive || 100) > 50)
  const creepsByRole = _.groupBy(creeps, (creep) => creep.memory.role)
  return roles.sort((a, b) => a.priority - b.priority)
  .filter(role => role.size(spawn.room) > (creepsByRole[role.name]?.length || 0))[0]
}

const defaultMemory = {
  action: 'idle',
  prevAction: 'idle',
  targetId: null,
  prevTargetId: null,
  flagName: null
}

function processNextSpawning(spawn : StructureSpawn, nextSpawning : any){
  if(nextSpawning){
    spawn.memory.nextSpawning = true
    const spawnRes = spawn.spawnCreep(nextSpawning.body(spawn.room), creepName(spawn.room.name, nextSpawning.name), {
      memory: {
        role: nextSpawning.name,
        ...defaultMemory
      },
      energyStructures: [
        ...spawn.room.extensions.filter(ext => ext && !ext.pos.findInRange(FIND_SOURCES, 2)),
        ...spawn.room.extensions,
        spawn
      ]
    })
  } else {
    spawn.memory.nextSpawning = false
  }

  if(!spawn.spawning && spawn.room.sources.filter(s => s.extension && s.extension.store[RESOURCE_ENERGY] >= 50).length > 0){
    const container = _.compact([spawn.anotherContainer, spawn.container]).filter((c) => (c as StructureContainer).store[RESOURCE_ENERGY] < 1900)[0]
    if(container && container.store[RESOURCE_ENERGY] < 1900){
      let body = [MOVE, MOVE]
      if(spawn.room.creeps.filter(c => c.memory.role == "harvester").length < 2 || spawn.spawning && spawn.room.sources.filter(s => s.extension && s.extension.store[RESOURCE_ENERGY] >= 50).length < 2) body = [MOVE]
      spawn.spawnCreep(body, creepName(spawn.room.name, 'suicider'), {
        memory: {
          role: "suicider",
          ...defaultMemory
        },
        directions: [spawn.pos.getDirectionTo(container)],
        energyStructures: [
          ..._.compact(spawn.room.sources.map(s => s.extension)),
        ]
      })
    }
  }
}

const wrappedGetAvailableSpawning = getAvailableSpawning // profiler.registerFN(getAvailableSpawning, 'getAvailableSpawning')
const wrappedProcessNextSpawning = processNextSpawning // profiler.registerFN(processNextSpawning, 'processNextSpawning')

export default function process (spawn : StructureSpawn){
  if(spawn.spawning) return
  const nextSpawning = wrappedGetAvailableSpawning(spawn)
  wrappedProcessNextSpawning(spawn, nextSpawning)
}
