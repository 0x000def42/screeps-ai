import actions, { CreepAction } from 'actions'

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
}

export function buildAction(action: CreepAction, priority: number, closure: (creep: Creep) => boolean = (creep: Creep) => true) {
  return {
    name: action.name,
    priority,
    closure
  } as CreepRoleAction;
}

const roles: CreepRole[] = [];

roles.push({
  name: "worker",
  body: (room) => {
    const size = room.energy / 200
    return _.flatten(_.times(size, () => [WORK, MOVE, CARRY]))
  },
  priority: 0,
  size: (room: Room) => {
    if(room.extensions.length < 2) return 2
    return 1
  },
  actions: [
    buildAction(actions.upgrade, 0, (creep: Creep) => creep.room.controller?.level == 1),
    buildAction(actions.restoreExtension, 1, (creep : Creep) => creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length < _.min([creep.room.sources.length, 3])),
    buildAction(actions.transferToSpawn, 2, (creep: Creep) => creep.room.extensions.length < 2),
    buildAction(actions.buildWalls, 3, (creep: Creep) => creep.room.extensions.length > 1),
    buildAction(actions.build, 4),
    buildAction(actions.harvest, 5),
    buildAction(actions.upgrade, 6),
  ]
});

roles.push({
  name: "extension_builder",
  body: (room) => {
    if(room.energy >= 700) return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE]
    if(room.energy >= 550) return [WORK, WORK, WORK, WORK, MOVE, MOVE, CARRY]
    return [WORK, WORK, MOVE, CARRY]
  },
  priority: 1,
  size: (room: Room) => _.min([room.sources.length, 3]),
  actions: [
    buildAction(actions.harvestSolo, 0),
    buildAction(actions.transferToNearestExtension, 1),
    buildAction(actions.buildNear, 2),
  ]
});

roles.push({
  name: "upgrader",
  body: (room) => {
    const size = (room.energy / 100) - 1
    return [..._.flatten(_.times(size, () => [WORK])), MOVE, CARRY]
  },
  priority: 2,
  size: (room: Room) => {
    if(room.extensions.length < 2) return 0
    return 3
  },
  actions: [
    buildAction(actions.withdrawFromSpawn, 0, (creep: Creep) => !creep.room.spawns[0].container),
    buildAction(actions.withdrawFromSpawnContainer, 0, (creep: Creep) => !!creep.room.spawns[0].container),
    buildAction(actions.transferToNearestExtension, 1),
    buildAction(actions.buildNear, 2, (creep : Creep) => creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length == _.min([creep.room.sources.length, 3])),
    buildAction(actions.upgrade, 3, (creep : Creep) => creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length == _.min([creep.room.sources.length, 3]))
  ]
})

roles.push({
  name: "suicider",
  body: (_room) => [CARRY, MOVE],
  priority: 0,
  size: (room: Room) => room.extensions.filter(ext => ext.pos.findInRange(FIND_SOURCES, 2)).length >= 2 && (room.spawns[0].store[RESOURCE_ENERGY] < 300 || (room.spawns[0].container && room.spawns[0].container.store[RESOURCE_ENERGY] < 2000)) ? 2 : 0,
  actions: [
    buildAction(actions.transferToSpawn, 0),
    buildAction(actions.restoreExtension, 1, (creep : Creep) => creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length < _.min([creep.room.sources.length, 3])),
    buildAction(actions.transferToSpawnContainer, 2, (creep : Creep) => creep.room.creeps.filter((creep) => creep.memory.role == "extension_builder").length == _.min([creep.room.sources.length, 3])),
    buildAction(actions.pickupNear, 3),
    buildAction(actions.withdrawNearTombstone, 4),
    buildAction(actions.recycle, 5, (creep) => creep.room.spawns[0].store[RESOURCE_ENERGY] < 300 || (!!creep.room.spawns[0].container && creep.room.spawns[0].container.store[RESOURCE_ENERGY] < 2000)),
  ],

})

export default roles;
