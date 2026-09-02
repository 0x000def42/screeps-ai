const wallTargetHits = 10000
const rampartTargetHits = 25000

const barrierTargetHits = (structure : AnyStructure) => {
  if(structure.structureType == STRUCTURE_RAMPART) return rampartTargetHits
  if(structure.structureType == STRUCTURE_WALL) return wallTargetHits
  return 0
}

export default function process(room : Room){
  const hostile = room.find(FIND_HOSTILE_CREEPS)[0]
  if(hostile){
    const username = hostile.owner.username
    if(username == "maded12") {
      room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_RAMPART
      }).forEach(s => (s as StructureRampart).setPublic(true))
      return
    } else {
      room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_RAMPART
      }).forEach(s => (s as StructureRampart).setPublic(false))
    }
    Game.notify(`${username} is room`)
    room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => structure.structureType == STRUCTURE_TOWER
    }).forEach(tower => (tower as StructureTower).attack(hostile))
  } else {

    const walls : (StructureWall | StructureRampart)[] = room.find(FIND_STRUCTURES, {
      filter: (structure : AnyStructure) => structure.hits < barrierTargetHits(structure)
    }) as (StructureWall | StructureRampart)[]

    let structure : (StructureContainer | StructureRampart | StructureWall) = room.find(FIND_STRUCTURES, {
      filter: (structure : AnyStructure) => (structure.hitsMax > structure.hits && structure.structureType == STRUCTURE_CONTAINER)
    })[0] as (StructureContainer | StructureRampart | StructureWall)

    structure ||= walls.sort((a, b) => a.hits - b.hits)[0]

    if(structure){
      room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => structure.structureType == STRUCTURE_TOWER && structure.store[RESOURCE_ENERGY] > 800
      }).forEach(tower => (tower as StructureTower).repair(structure))
    }
  }
}
