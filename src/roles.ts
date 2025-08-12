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
  body: (_room) => [WORK, MOVE, CARRY],
  priority: 0,
  size: (_room: Room) => 2,
  actions: [
    buildAction(actions.harvest, 0),
    buildAction(actions.upgrade, 1, (creep: Creep) => creep.room.controller?.level == 1),
    buildAction(actions.transfer, 2),
    buildAction(actions.upgrade, 3)
  ]
});

roles.push({
  name: "extension_builder",
  body: (_room) => [WORK, WORK, MOVE, CARRY],
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
  body: (_room) => [WORK, WORK, WORK, CARRY, MOVE],
  priority: 2,
  size: (_room: Room) => 3,
  actions: [
    buildAction(actions.withdraw, 0),
    buildAction(actions.transferToNearestExtension, 1),
    buildAction(actions.buildNear, 2, (creep: Creep) => !creep.room.spawns[0].memory.nextSpawning),
    buildAction(actions.upgrade, 3, (creep: Creep) => !creep.room.spawns[0].memory.nextSpawning)
  ]
})

roles.push({
  name: "suicider",
  body: (_room) => [CARRY, MOVE],
  priority: 0,
  size: (room: Room) => room.extensions.filter(ext => ext.pos.findInRange(FIND_SOURCES, 2)).length >= 2 && room.spawns[0].store[RESOURCE_ENERGY] <= 250 ? 1 : 0,
  actions: [
    buildAction(actions.transfer, 0),
    buildAction(actions.pickupNear, 1),
    buildAction(actions.withdrawNearTombstone, 2),
    buildAction(actions.recycle, 3),
  ],

})

export default roles;
