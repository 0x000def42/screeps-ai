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
const structureFull = (structure : StructureSpawn | StructureExtension | StructureTower | StructureContainer) => structure.store[RESOURCE_ENERGY] == structure.store.getCapacity(RESOURCE_ENERGY)

export const settings : any = {
  gamePaths: {},
  exits: {}
}

const actions = {
  harvest: {
    name: "harvest",
    targetId: creep => creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)?.id,
    canStart: creepNotFull,
    isFinish: creepFull,
    act: (creep, target : Source) => creep.harvest(target)
  },
  harvestBalanced: {
    name: "harvestBalanced",
    targetId: creep => {
      return creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {
        filter: (source) => {
          return source.spots.length > source.creeps.length &&
                 source.workBodyparts < 6 &&
                 !source.pos.findInRange(FIND_HOSTILE_CREEPS, 3)[0]
        }
      })?.id
    },
    canStart: creepNotFull,
    isFinish: creepFull,
    act: (creep, target : Source) => creep.harvest(target)
  },
  withdrawFromHarvestCreep: {
    name: "withdrawFromHarvestCreep",
    targetId: creep => {
      const sourceCreeps = _.flatten(creep.room.sources.map(s => s.creeps.filter(c => c.withoutWithdrawal)))
      return creep.pos.findClosestByPath(FIND_MY_CREEPS, {
        filter: c => sourceCreeps.includes(c)
      })?.id
    },
    canStart: creepNotFull,
    isFinish: (c) => creepFull(c) || !c.target || !(c.target as Creep).pos.findInRange(FIND_SOURCES_ACTIVE, 1)[0],
    act: (creep, target : Creep) =>  {
      if(!creep.pos.isNearTo(target)) return ERR_NOT_IN_RANGE
      if(target.store[RESOURCE_ENERGY] == target.store.getCapacity()){
        return target.transfer(creep, RESOURCE_ENERGY)
      }
      return OK
    }
  },
  withdrawFromSourceContainer: {
    name: "withdrawFromSourceContainer",
    targetId: creep => {
      return creep.room.find(FIND_SOURCES, {
        filter: (source) => {
          return source.container && source.container.carryBodyparts * 50 < source.container.store[RESOURCE_ENERGY] && creep.body.filter(b => b.type == CARRY).length * 50 <= source.container.store[RESOURCE_ENERGY]
        }
      }).sort((a,b) => (a.container as StructureContainer).pos.findPathTo(creep).length - (a.container as StructureContainer).pos.findPathTo(creep).length)[0]?.container?.id
    },
    canStart: creepNotFull,
    isFinish: (c) => creepFull(c) || !c.target,
    act: (creep, target : StructureContainer) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  harvestSolo: {
    name: "harvestSolo",
    targetId: creep => {
      if(creep.memory.prevAction == "harvestSolo") return creep.memory.prevTargetId
      return creep.pos.findClosestByPath(FIND_SOURCES, {
      filter: (source) => source.creeps.filter(cr => cr != creep && (cr.memory.action == "harvestSolo" || cr.memory.prevAction == "harvestSolo")).length == 0
    })?.id
    },
    canStart: creepNotFull,
    isFinish: creepFull,
    act: (creep, target : Source) => creep.harvest(target)
  },
  upgrade: {
    name: "upgrade",
    targetId: creep => creep.room.controller?.id,
    canStart: creepNotEmpty,
    isFinish: creepEmpty,
    act: (creep, target : StructureController) => {
      return creep.upgradeController(target)
    }
  },
  transferToSpawn: {
    name: "transferToSpawn",
    targetId: creep => {
      const spawn = creep.room.spawns[0]
      if(spawn.store[RESOURCE_ENERGY] < spawn.store.getCapacity(RESOURCE_ENERGY)) return spawn.id
      return undefined
    },
    canStart: creepNotEmpty,
    isFinish: (creep) => {
      if(!creep.target) return true
      const target = creep.target as StructureSpawn
      return creepEmpty(creep) || (structureFull(target) && creep.pos.isNearTo(target))
    },
    act: (creep, target : StructureExtension | StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToSpawnContainer: {
    name: "transferToSpawnContainer",
    targetId: creep => {
      const container = creep.room.spawns[0].container
      if(container){
        if(!structureFull(container)){
          return container.id
        }
      }
      return null
    },
    canStart: creepNotEmpty,
    isFinish: (creep) => !creep.target || creepEmpty(creep) || structureFull(creep.target as StructureSpawn),
    act: (creep, target : StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToAnotherContainer: {
    name: "transferToAnotherContainer",
    targetId: creep => {
      const container = creep.room.spawns[0].anotherContainer
      if(container){
        if(!structureFull(container)){
          return container.id
        }
      }
      return null
    },
    canStart: creepNotEmpty,
    isFinish: (creep) => !creep.target || creepEmpty(creep) || structureFull(creep.target as StructureSpawn),
    act: (creep, target : StructureSpawn) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToNearestExtension: {
    name: "transferToNearestExtension",
    targetId: creep => creep.pos.findInRange(FIND_MY_STRUCTURES, 5, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_EXTENSION && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureExtension),
    act: (creep, target : StructureExtension) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToHomeExtensions: {
    name: "transferToHomeExtensions",
    targetId: creep => creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_EXTENSION && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0) && !_.include(creep.room.sources.map(s => s.extension), structure)
      }
    })?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureExtension),
    act: (creep, target : StructureExtension) => creep.transfer(target, RESOURCE_ENERGY)
  },
  transferToNearestContainer: {
    name: "transferToNearestContainer",
    targetId: creep => creep.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: function(structure){
        return structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] < (structure.store.getCapacity(RESOURCE_ENERGY) || 0)
      }
    })[0]?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => creepEmpty(creep) || structureFull(creep.target as StructureExtension),
    act: (creep, target : StructureExtension) => creep.transfer(target, RESOURCE_ENERGY)
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
  buildNearSpawn: {
    name: "buildNearSpawn",
    targetId: creep => creep.room.spawns[0].pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 5)[0]?.id,
    canStart: creepFull,
    isFinish: (creep) => !creep.target || creepEmpty(creep),
    act: (creep, target : ConstructionSite) => creep.build(target)
  },
  repair: {
    name: "repair",
    targetId: creep => creep.room.find(FIND_STRUCTURES,
      { filter: (structure) => structure.structureType == STRUCTURE_CONTAINER && structure.hits < structure.hitsMax / 2}
    )[0]?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => !creep.target || creepEmpty(creep),
    act: (creep, target : AnyStructure) => creep.repair(target)
  },
  repairNear: {
    name: "repairNear",
    targetId: creep => creep.room.find(FIND_STRUCTURES,
      { filter: (structure) => structure.structureType == STRUCTURE_CONTAINER && structure.hits < structure.hitsMax && structure.pos.inRangeTo(creep, 3)}
    )[0]?.id,
    canStart: creepNotEmpty,
    isFinish: (creep) => !creep.target || creepEmpty(creep) || (creep.target as any).hits == (creep.target as any).hitsMax,
    act: (creep, target : AnyStructure) => creep.repair(target)
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
  withdrawFromNearestContainer: {
    name: "withdrawFromNearestContainer",
    targetId: creep => {
      return creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
      })?.id
    },
    canStart: creepNotFull,
    isFinish: (creep) => creepFull(creep),
    act: (creep, target : StructureContainer) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  withdrawFromSpawnContainer: {
    name: "withdrawFromSpawnContainer",
    targetId: creep => {
      const container = creep.room.spawns[0]?.container as StructureContainer
      if(!container || container.store[RESOURCE_ENERGY] == 0) return undefined
      return container.id
    },
    canStart: creepNotFull,
    isFinish: (creep) => creepFull(creep) || creep.room.spawns[0].container?.store[RESOURCE_ENERGY] == 0,
    act: (creep, target : StructureContainer) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  withdrawFromAnotherSpawnContainer: {
    name: "withdrawFromAnotherSpawnContainer",
    targetId: creep => {
      const container = creep.room.spawns[0]?.anotherContainer as StructureContainer
      if(!container || container.store[RESOURCE_ENERGY] == 0) return undefined
      return container.id
    },
    canStart: creepNotFull,
    isFinish: (creep) => creepFull(creep),
    act: (creep, target : StructureContainer) => creep.withdraw(target, RESOURCE_ENERGY)
  },
  moveAway: {
    name: "moveAway",
    targetId: creep => {
      return creep.id
    },
    canStart: (creep) => !!creep.pos.lookFor(LOOK_STRUCTURES)[0],
    isFinish: () => true,
    act: (creep, target : StructureContainer) => creep.move((Math.floor(Math.random() * 7 + 1)) as DirectionConstant)
  },
  pickupNear: {
    name: "pickupNear",
    targetId: creep => creep.pos.findInRange(FIND_DROPPED_RESOURCES, 4, {
      filter: res => res.resourceType == RESOURCE_ENERGY
    })[0]?.id,
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
  gotoClaim: {
    name: "gotoClaim",
    targetId: creep => creep.id,
    canStart: (creep) => {
      if(!Object.values(Game.flags).filter(flag => flag.name == "claim")[0]) return false
      return Object.values(Game.flags).filter(flag => flag.name == "claim")[0].room != creep.room
    },
    isFinish: (creep) => {
      if(!Object.values(Game.flags).filter(flag => flag.name == "claim")[0]) return true
      return Object.values(Game.flags).filter(flag => flag.name == "claim")[0].room == creep.room
    },
    act: (creep, target) => {
      const flag = Object.values(Game.flags).filter(flag => flag.name == "claim")[0]
      settings.gamePaths[creep.room + flag.pos.roomName] ||= Game.map.findRoute(creep.room, flag.pos.roomName, {
        routeCallback(roomName) {
          if(Memory.badRoomNames[roomName]) return Infinity;
          return 1
        }
      })

      const route = settings.gamePaths[creep.room + flag.pos.roomName]
      if(!route){
        console.log('No route')
      }
      if(route != ERR_NO_PATH){
        settings.exits[route[0]] = creep.pos.findClosestByRange(route[0].exit)
        if(settings.exits[route[0]]) {
          creep.moveTo(settings.exits[route[0]], {
          reusePath: 1
        })
       } else {
          console.log('Error with exist')
        }
      }
      return OK
    }
  },
  leaveBorder: {
    name: "leaveBorder",
    targetId: creep => creep.id,
    canStart: (creep) => creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49,
    isFinish: (creep) => creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49,
    act: (creep) => {
      creep.moveTo(new RoomPosition(25, 25, creep.room.name), { reusePath: 5 })
      return OK
    }
  },
  scoutRoom: {
    name: "scoutRoom",
    targetId: creep => creep.id,
    canStart: () => !!Memory.scoutTarget,
    isFinish: (creep) => !Memory.scoutTarget || creep.room.name == Memory.scoutTarget,
    act: (creep) => {
      const target = Memory.scoutTarget as string
      if(creep.room.name == target) return OK
      const exit = creep.room.findExitTo(target)
      if(exit == ERR_NO_PATH || exit == ERR_INVALID_ARGS) return OK
      const step = creep.pos.findClosestByPath(exit as ExitConstant)
      if(step) creep.moveTo(step, { reusePath: 10 })
      return OK
    }
  },
  scout: {
    name: "scout",
    targetId: creep => creep.id,
    canStart: (creep) => {
      if(!Object.values(Game.flags).filter(flag => flag.name == "scout")[0]) return false
      return Object.values(Game.flags).filter(flag => flag.name == "scout")[0].room != creep.room
    },
    isFinish: (creep) => {
      if(!Object.values(Game.flags).filter(flag => flag.name == "scout")[0]) return true
      return Object.values(Game.flags).filter(flag => flag.name == "scout")[0].room == creep.room
    },
    act: (creep, target) => {
      const flag = Object.values(Game.flags).filter(flag => flag.name == "scout")[0]
      settings.gamePaths[creep.room + flag.pos.roomName] ||= Game.map.findRoute(creep.room, flag.pos.roomName, {
        routeCallback(roomName) {
          if(Memory.badRoomNames[roomName]) return Infinity;
          return 1
        }
      })

      const route = settings.gamePaths[creep.room + flag.pos.roomName]
      if(!route){
        console.log('No route')
      }
      if(route != ERR_NO_PATH){
        settings.exits[route[0]] = creep.pos.findClosestByPath(route[0].exit, {costCallback: creep.room.costCallback})
        if(settings.exits[route[0]]) {
          creep.moveTo(settings.exits[route[0]], {
            reusePath: 1,
            visualizePathStyle: {
              fill: 'transparent',
              stroke: '#fff',
              lineStyle: 'dashed',
              strokeWidth: .15,
              opacity: .1
            },
            costCallback: creep.room.costCallback
          })
       } else {
          console.log('Error with exist')
        }
      }
      return OK
    }
  },
  claimRoom: {
    name: "claimRoom",
    targetId: creep => creep.id,
    canStart: (creep) => !!Object.values(Game.flags).filter(flag => flag.name == "claim")[0],
    isFinish: (creep) => !Object.values(Game.flags).filter(flag => flag.name == "claim")[0],
    act: (creep, target) => {
      const flag = Object.values(Game.flags).filter(flag => flag.name == "claim")[0]
      if(flag.room != creep.room){
        const route = Game.map.findRoute(creep.room, flag.pos.roomName, {
          routeCallback(roomName) {
            if(Memory.badRoomNames[roomName]) return Infinity;
            return 1
          }
        })
        if(route != ERR_NO_PATH){
          const exit = creep.pos.findClosestByRange(route[0].exit)
          if(exit) creep.moveTo(exit, {
            visualizePathStyle: {
              fill: 'transparent',
              stroke: '#fff',
              lineStyle: 'dashed',
              strokeWidth: .15,
              opacity: .1
            }
          })
        }
      } else {
        const controller = flag.room.controller as StructureController
        if(creep.room.controller?.my){
        } else {
          if(creep.pos.inRangeTo(controller, 1)){
            creep.claimController(flag.room.controller as StructureController)
          } else {
            creep.moveTo(controller)
          }
        }
      }

      return OK
    }
  },
  recycle: {
    name: "recycle",
    targetId: creep => creep.room.spawns[0].id,
    canStart: (creep) => creep.store[RESOURCE_ENERGY] == 0,
    isFinish: () => false,
    act: (creep, target : StructureSpawn) => {
      if(creep.ticksToLive && creep.ticksToLive < 1498) target.recycleCreep(creep)
      return OK
    }
  },
  attack: {
    name: "attack",
    targetId: creep => {
      return creep.pos.findClosestByPath(FIND_HOSTILE_SPAWNS)?.id
    },
    canStart: (creep) => true,
    isFinish: (creep) => !creep.target,
    act: (creep, target) => creep.attack(target)
  },
  renew: {
    name: "renew",
    targetId: creep => creep.room.spawns[0].id,
    canStart: (creep) => (creep?.ticksToLive || 0) < 200,
    isFinish: (creep) => (creep?.ticksToLive || 0) > 1000,
    act: (creep, target : StructureSpawn) => target.renewCreep(creep)
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

