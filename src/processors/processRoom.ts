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

    let structure : (StructureContainer | StructureRampart | StructureWall)  = room.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType == STRUCTURE_CONTAINER
    })[0] as (StructureContainer | StructureRampart | StructureWall)

    const walls : (StructureWall | StructureRampart)[] = room.find(FIND_STRUCTURES, {
      filter: (structure : StructureWall | StructureRampart) => (structure.hitsMax > structure.hits && (structure.structureType as STRUCTURE_WALL) == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART)
    })

    structure ||= room.find(FIND_STRUCTURES, {
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
