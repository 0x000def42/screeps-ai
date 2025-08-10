import roles from "roles"

function creepName(role : string){
  return `${role} ${Game.time}`
}

export default function process (spawn : StructureSpawn){
  const creeps = Object.values(Game.creeps).filter(creep => creep.room == spawn.room)
  const creepsByRole = _.groupBy(creeps, (creep) => creep.memory.role)
  const availableSpawnings = roles.sort((a, b) => a.priority - b.priority)
  .filter(role => role.size > (creepsByRole[role.name]?.length || 0))

  const nextSpawning = availableSpawnings[0]
  if(nextSpawning){
    spawn.spawnCreep(nextSpawning.body, creepName(nextSpawning.name), {
      memory: {
        role: nextSpawning.name,
        action: 'idle',
        targetId: null
      }
    })
  }
}
