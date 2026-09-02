import actions, { CreepAction } from 'actions'
import profiler from "screeps-profiler"

interface CreepRole {
  name: string;
  body: (room: Room) => BodyPartConstant[];
  priority: number;
  size: (room: Room) => number;
  actions: CreepRoleAction[];
}

interface CreepRoleAction {
  name: string;
  priority: number;
  closure: (creep: Creep) => boolean;
  storePrevAction: boolean
}

export function buildAction(action: CreepAction, priority: number, opts : any = {}) {
  opts.closure ||= () => true
  opts.storePrevAction ||= false
  return {
    name: action.name,
    priority,
    closure: opts.closure,
    storePrevAction: opts.storePrevAction
  } as CreepRoleAction;
}

const roles: CreepRole[] = [];

roles.push({
  name: "remoteBuilder",
  body: (room) => {
    const size = Math.floor((room.energy - 100) / 200)
    return [..._.flatten(_.times(size, () => [WORK, CARRY, MOVE]))]
  },
  priority: 10,
  size: (room: Room) => {
    if((room.controller as StructureController).level < 4) return 0
    if(room.spawns[0].anotherContainer && room.spawns[0].anotherContainer.store[RESOURCE_ENERGY] < 1900) return 0
    const flag = Object.values(Game.flags).filter(flag => flag.name == "claim")[0]
    if(flag){
      if(flag.room && flag.room.controller && flag.room.controller.my){
        // console.log(`Remote builder lenght: ${Object.values(Game.creeps).filter(creep => creep.memory.role == "remoteBuilder").length}`)
        return 6 - Object.values(Game.creeps).filter(creep => creep.memory.role == "remoteBuilder").length
      }
    }
    return 0
  },
  actions: [
    buildAction(actions.gotoClaim, 0, {closure: (creep : Creep) => !!Game.flags['claim'] && !!Game.flags['claim'].room && !!Game.flags['claim'].room.controller && Game.flags['claim'].room.controller.my}),
    buildAction(actions.upgrade, 0, {closure: (creep: Creep) => (creep.room.controller as StructureController).ticksToDowngrade < 1000}),
    buildAction(actions.build, 1),
    buildAction(actions.harvestBalanced, 2),
    buildAction(actions.upgrade, 3)
  ]
})

roles.push({
  name: "claimer",
  body: (room) => {
    return [MOVE, CLAIM]
  },
  priority: 0,
  size: (room: Room) => {
    if((room.controller as StructureController).level < 4) return 0
    const claimFlag = Object.values(Game.flags).filter(flag => flag.name == "claim")[0]
    if(!claimFlag) return 0
    const controller = claimFlag.room?.controller
    if(!controller || !controller.my) return Object.values(Game.flags).filter(flag => flag.name == "claim").length * 1- Object.values(Game.creeps).filter(creep => creep.memory.role == "claimer").length
    return 0
  },
  actions: [
    buildAction(actions.claimRoom, 0)
  ]
})

// roles.push({
//   name: "scout",
//   body: (room) => {
//     const size = Math.floor((room.energy - 70) / 100)
//     const realSize =_.min([size, 10])
//     return [..._.flatten(_.times(realSize, () => [MOVE, TOUGH]))]
//   },
//   priority: 0,
//   size: (room: Room) => {
//     if((room.controller as StructureController).level < 4) return 0
//     const scoutFlag = Object.values(Game.flags).filter(flag => flag.name == "scout" && flag.memory.nearestRoomName == room.name)[0]
//     if(scoutFlag) return 1 - Object.values(Game.creeps).filter(creep => creep.memory.role == "scout").length
//     return 0
//     // if(!claimFlag) return 0
//     // const controller = claimFlag.room?.controller
//     // if(!controller || !controller.my) return Object.values(Game.flags).filter(flag => flag.name == "claim").length * 1 - Object.values(Game.creeps).filter(creep => creep.memory.role == "scout").length
//     // return 0
//   },
//   actions: [
//     buildAction(actions.scout, 0)
//   ]
// })

roles.push({
  name: "worker",
  body: (room) => {
    if(room.creeps.filter(c => c.memory.role == "harvester").length < 1) return [WORK, MOVE, CARRY]
    const size = Math.floor(room.energy / 200)
    const realSize =_.min([size, 2])
    return [..._.flatten(_.times(realSize, () => [WORK, MOVE, CARRY]))]
  },
  priority: 1,
  size: (room) => {
    const size = Math.floor(room.energy / 200)
    return Math.ceil(room.sources.length * 3 / size) //- room.creeps.filter(c => c.memory.role == "upgrader").length
  },
  actions: [
    buildAction(actions.transferToSpawn, 0, {closure: (creep : Creep) => !creep.room.creeps.find(creep => creep.memory.role == 'filler')}),
    buildAction(actions.upgrade, 1, {closure: (creep : Creep) => creep.room.controller?.my && creep.room.controller.level < 2 }),
    buildAction(actions.repair, 1),
    buildAction(actions.buildNearSpawn, 2),
    buildAction(actions.build, 7),
    buildAction(actions.upgrade, 8),
    buildAction(actions.withdrawFromNearestContainer, 3, {closure: (creep : Creep) => !!creep.room.find(FIND_CONSTRUCTION_SITES)[0]}),
    buildAction(actions.withdrawFromSourceContainer, 4),
    buildAction(actions.harvestBalanced, 5),
    buildAction(actions.withdrawFromHarvestCreep, 6),
  ]
})

roles.push({
  name: "harvester",
  body: (room) => {
    if(room.creeps.filter(c => c.memory.role == "harvester").length < 1) return [WORK, WORK, MOVE, CARRY]
    const size = Math.floor(room.energy / 100) - 1
    const realSize =_.min([size, 6])
    return [..._.flatten(_.times(realSize, () => [WORK])), MOVE, CARRY]
  },
  priority: 1,
  size: (room) => {
    const size = Math.floor(room.energy / 100) - 1
    if(size < 6) return _.sum(room.sources.map(s => _.min([s.spots.length, 3])))
    return room.sources.length
  },
  actions: [
    buildAction(actions.harvestBalanced, 0, {storePrevAction: true}),
    buildAction(actions.transferToNearestExtension, 1),
    buildAction(actions.transferToNearestContainer, 2),
    buildAction(actions.buildNear, 3),
    buildAction(actions.repairNear, 4),
  ]
}),
roles.push({
  name: "courier",
  body: (room) => {
    const size = Math.floor(room.energy / 100)
    const realSize =_.min([size, 5])
    return [..._.flatten(_.times(realSize, () => [MOVE, CARRY]))]
  },
  priority: 2,
  size: (room) => {
    return 0
  },
  actions: [
    buildAction(actions.transferToSpawn, 1),
    buildAction(actions.transferToAnotherContainer, 2),
    buildAction(actions.transferToSpawnContainer, 3),
    buildAction(actions.withdrawFromSourceContainer, 5),
    buildAction(actions.withdrawFromHarvestCreep, 6),
  ]
})

roles.push({
  name: "upgrader",
  body: (room) => {
    const size = Math.floor(room.energy / 100) - 1
    let realSize =_.min([size, 8])
    let anotherBody = [MOVE, CARRY]
    if(room.energy >= 1700){
      realSize = 15
      anotherBody = [MOVE, CARRY, CARRY, CARRY]
    }
    return [..._.flatten(_.times(realSize, () => [WORK])), ...anotherBody]
  },
  priority: 3,
  size: (room: Room) => {
    if(room.energy >= 1700) return 1
    if(room.find(FIND_CONSTRUCTION_SITES).length > 0) return 0
    if(room.spawns[0].anotherContainer && room.spawns[0].anotherContainer.store[RESOURCE_ENERGY] < 1900) return 0
    if(!room.spawns[0].container || room.sources.filter(s => s.container).length == 0) return 0
    const size = Math.floor(room.energy / 100) - 1
    const realSize =_.min([size, 8])
    return _.min([Math.floor(16 / realSize), 3])
  },
  actions: [
    buildAction(actions.withdrawFromSpawnContainer, 0, (creep: Creep) => !!creep.room.spawns[0].container),
    buildAction(actions.upgrade, 3),
    buildAction(actions.moveAway, 7)
  ]
})

roles.push({
  name: "filler",
  body: (_room) => [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
  priority: 0,
  size: (room: Room) => {
    if(room.spawns[0].anotherContainer) return 1
    return 0
  },
  actions: [
    buildAction(actions.transferToSpawn, 1),
    buildAction(actions.transferToHomeExtensions, 3),
    buildAction(actions.withdrawFromAnotherSpawnContainer, 4),
    buildAction(actions.withdrawFromSpawnContainer, 5),
    buildAction(actions.withdrawFromNearestContainer, 6),
    buildAction(actions.moveAway, 7),
  ],
})

roles.push({
  name: "suicider",
  body: (_room) => [MOVE],
  priority: 999,
  size: (room: Room) => 0,
  actions: [
    buildAction(actions.recycle, 7),
  ],
})

// roles.push({
//   name: "suicider",
//   body: (_room) => [CARRY, MOVE],
//   priority: 0,
//   size: (room: Room) => 3,
//   actions: [
//     buildAction(actions.transferToSpawn, 0),
//     buildAction(actions.restoreExtension, 1, (creep : Creep) => creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length < _.min([creep.room.sources.length, 3])),
//     buildAction(actions.transferToSpawnContainer, 2, (creep : Creep) => {
//       if(!!creep.room.spawns[0].container && creep.room.spawns[0].container.store[RESOURCE_ENERGY] < 250) return true
//       // if(Game.flags['claim'] && creep.room.spawns[0].container && creep.room.spawns[0].container.store[RESOURCE_ENERGY] > 400) return false
//       if(creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length == _.min([creep.room.sources.length, 3])) return true
//       return false
//     }),
//     buildAction(actions.pickupNear, 3),
//     buildAction(actions.withdrawNearTombstone, 4),
//     buildAction(actions.transferToNearestExtension, 5),
//     buildAction(actions.withdrawFromSpawnContainer, 6, (creep: Creep) => !!creep.room.spawns[0].container && creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length < _.min([creep.room.sources.length, 3])),
//     buildAction(actions.recycle, 7, (creep : Creep) => creep.store[RESOURCE_ENERGY] == 0),
//   ],
// })

export default roles;
