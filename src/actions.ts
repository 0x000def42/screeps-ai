export interface CreepAction {
  name: string,
  targetId: (creep: Creep) => Id<_HasId> | null,
  canStart: (creep: Creep) => boolean
  isFinish: (creep: Creep) => boolean
  act: (creep : Creep, target : any) => CreepActionReturnCode
}

const creepEmpty = (creep : Creep) => creep.store[RESOURCE_ENERGY] == 0
const creepFull = (creep : Creep) => creep.store[RESOURCE_ENERGY] == creep.store.getCapacity()
const creepNotEmpty = (creep : Creep) => creep.store[RESOURCE_ENERGY] > 0
const structureFull = (structure : StructureSpawn | StructureExtension) => structure.store[RESOURCE_ENERGY] == structure.store.getCapacity(RESOURCE_ENERGY)

const actions = {
  harvest: {
    name: "harvest",
    targetId: creep => creep.pos.findClosestByPath(FIND_SOURCES)?.id,
    canStart: creepEmpty,
    isFinish: creepFull,
    act: (creep, target : Source) => creep.harvest(target)
  },
  harvestSolo: {
    name: "harvestSolo",
    targetId: creep => creep.pos.findClosestByPath(FIND_SOURCES, {
      filter: (source) => source.creeps.filter(cr => cr != creep && cr.memory.action == "harvestSolo").length == 0
    })?.id,
    canStart: creepEmpty,
    isFinish: creepFull,
    act: (creep, target : Source) => creep.harvest(target)
  },
  upgrade: {
    name: "upgrade",
    targetId: creep => creep.room.controller?.id,
    canStart: creepNotEmpty,
    isFinish: creepEmpty,
    act: (creep, target : StructureController) => creep.upgradeController(target)
  },
  transfer: {
    name: "transfer",
    targetId: creep => creep.room.find(FIND_MY_SPAWNS, {
      filter: function(structure){
        return structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id,
    canStart: creepFull,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureSpawn),
    act: (creep, target : StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToNearestExtension: {
    name: "transferToNearestExtension",
    targetId: creep => creep.pos.findInRange(FIND_MY_STRUCTURES, 2, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_EXTENSION && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id,
    canStart: creepFull,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureExtension),
    act: (creep, target : StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  build: {
    name: "build",
    targetId: creep => creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
      filter: (site) => Object.values(Game.creeps).filter(cr => cr != creep && (cr.memory.targetId == site.id || cr.memory.prevTargetId == site.id)).length == 0
    })?.id,
    canStart: creepFull,
    isFinish: (creep) => !creep.target || creepEmpty(creep),
    act: (creep, target : ConstructionSite) => creep.build(target)
  }
} as Record<string, CreepAction>

export default actions

