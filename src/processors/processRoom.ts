const wallTargetHits = 10000
const rampartTargetHits = 5000

export const barrierTargetHits = (structure : AnyStructure) => {
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
  }
}
