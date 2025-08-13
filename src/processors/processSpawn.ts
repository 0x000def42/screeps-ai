import roles from "roles"

function creepName(role : string){
  return `${role} ${Game.time}`
}

export default function process (spawn : StructureSpawn){
  // if(Game.time % 5 != 0){
  //   return
  // }
  const creeps = Object.values(Game.creeps).filter(creep => creep.room == spawn.room && (creep.ticksToLive || 0) > 50)
  const creepsByRole = _.groupBy(creeps, (creep) => creep.memory.role)
  const availableSpawnings = roles.sort((a, b) => a.priority - b.priority)
  .filter(role => role.size(spawn.room) > (creepsByRole[role.name]?.length || 0))

  const nextSpawning = availableSpawnings[0]
  if(nextSpawning){
    spawn.memory.nextSpawning = true
    spawn.spawnCreep(nextSpawning.body(spawn.room), creepName(nextSpawning.name), {
      memory: {
        role: nextSpawning.name,
        action: 'idle',
        prevAction: 'idle',
        targetId: null,
        prevTargetId: null
      },
      directions: [spawn.pos.getDirectionTo(spawn.room.controller?.pos as RoomPosition), LEFT, RIGHT, TOP, BOTTOM],
      energyStructures: [
        ...spawn.room.extensions.filter(ext => !ext.pos.findInRange(FIND_SOURCES, 2)),
        ...spawn.room.extensions,
        spawn
      ]
    })
  } else {
    spawn.memory.nextSpawning = false
  }
}
