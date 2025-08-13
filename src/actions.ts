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
const creepNotFull = (creep : Creep) => creep.store[RESOURCE_ENERGY] < creep.store.getCapacity()
const structureFull = (structure : StructureSpawn | StructureExtension | StructureTower) => structure.store[RESOURCE_ENERGY] == structure.store.getCapacity(RESOURCE_ENERGY)

const actions = {
  harvest: {
    name: "harvest",
    targetId: creep => creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)?.id,
    canStart: creepNotFull,
    isFinish: creepFull,
    act: (creep, target : Source) => creep.harvest(target)
  },
  harvestSolo: {
    name: "harvestSolo",
    targetId: creep => creep.pos.findClosestByPath(FIND_SOURCES, {
      filter: (source) => source.creeps.filter(cr => cr != creep && (cr.memory.action == "harvestSolo" || cr.memory.prevAction == "harvestSolo")).length == 0 && source.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length == 0
    })?.id,
    canStart: creepNotFull,
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
  transferToSpawn: {
    name: "transferToSpawn",
    targetId: creep => creep.room.find(FIND_MY_SPAWNS, {
      filter: function(structure){
        return structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id || creep.room.spawns[0].pos.findInRange(FIND_MY_STRUCTURES, 5, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_EXTENSION && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepNotFull(creep) || structureFull(creep.target as (StructureExtension | StructureSpawn)),
    act: (creep, target : StructureExtension | StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToSpawnContainer: {
    name: "transferToSpawnContainer",
    targetId: creep => creep.room.spawns[0].container?.id,
    canStart: creepNotEmpty,
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
  restoreExtension: {
    name: "restoreExtension",
    targetId: creep => creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_EXTENSION && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureExtension),
    act: (creep, target : StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  fillTowers: {
    name: "fillTowers",
    targetId: creep => creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_TOWER && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureTower),
    act: (creep, target : StructureTower) => creep.transfer(target, RESOURCE_ENERGY)
  },
  fillNearTowers: {
    name: "fillNearTowers",
    targetId: creep => creep.pos.findInRange(FIND_MY_STRUCTURES, 2, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_TOWER && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureTower),
    act: (creep, target : StructureTower) => creep.transfer(target, RESOURCE_ENERGY)
  },
  buildNear: {
    name: "buildNear",
    targetId: creep => creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3,
      // { filter: (site) => Object.values(Game.creeps).filter(cr => cr != creep && (cr.memory.targetId == site.id || cr.memory.prevTargetId == site.id)).length == 0 }
    )[0]?.id,
    canStart: creepFull,
    isFinish: (creep) => !creep.target || creepEmpty(creep),
    act: (creep, target : ConstructionSite) => creep.build(target)
  },
  build: {
    name: "build",
    targetId: creep => creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => !creep.target || creepEmpty(creep),
    act: (creep, target : ConstructionSite) => creep.build(target)
  },
  buildWalls: {
    name: "buildWalls",
    targetId: creep => creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
      filter: (site) => site.structureType == STRUCTURE_WALL || site.structureType == STRUCTURE_RAMPART
    })?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => !creep.target || creepEmpty(creep),
    act: (creep, target : ConstructionSite) => creep.build(target)
  },
  withdrawFromSpawn: {
    name: "withdrawFromSpawn",
    targetId: creep => creep.room.spawns[0].id,
    canStart: creepEmpty,
    isFinish: creepFull,
    act: (creep, target : StructureSpawn) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  withdrawFromSpawnContainer: {
    name: "withdrawFromSpawnContainer",
    targetId: creep => {
      const container = creep.room.spawns[0].container as StructureContainer
      if(container.store[RESOURCE_ENERGY] == 0) return undefined
      return container.id
    },
    canStart: creepEmpty,
    isFinish: (creep) => creepFull(creep) || creep.room.spawns[0].container?.store[RESOURCE_ENERGY] == 0,
    act: (creep, target : StructureContainer) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  pickupNear: {
    name: "pickupNear",
    targetId: creep => creep.pos.findInRange(FIND_DROPPED_RESOURCES, 4)[0]?.id,
    canStart: creepNotFull,
    isFinish: (creep) => creepNotEmpty(creep) || !creep.target,
    act: (creep, target : Resource) => creep.pickup(target)
  },
  withdrawNearTombstone: {
    name: "withdrawNearTombstone",
    targetId: creep => creep.pos.findInRange(FIND_TOMBSTONES, 4, {
      filter: (tomb) => tomb.store[RESOURCE_ENERGY] > 0
    })[0]?.id,
    canStart: creepNotFull,
    isFinish: (creep) => creepNotEmpty(creep) || !creep.target || (creep.target as Tombstone).store[RESOURCE_ENERGY] == 0,
    act: (creep, target : Tombstone) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  recycle: {
    name: "recycle",
    targetId: creep => creep.room.spawns[0].id,
    canStart: (creep) => creep.store[RESOURCE_ENERGY] == 0,
    isFinish: () => false,
    act: (creep, target : StructureSpawn) => target.recycleCreep(creep)
  }
} as Record<string, CreepAction>

const actionsProxy = new Proxy(actions, {
  get(target, prop: string) {
    if (!(prop in target)) {
      console.log(`Attempted to access undefined action: ${prop}`);
      return undefined; // Возвращаем undefined для несуществующего ключа
    }
    return target[prop];
  }
});

export default actionsProxy;

