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
    buildAction(actions.upgrade, 1, (creep: Creep) => creep.room.controller?.level == 1),
    buildAction(actions.transfer, 2, (creep: Creep) => creep.room.extensions.length < 2),
    buildAction(actions.build, 3),
    buildAction(actions.harvest, 4),
    buildAction(actions.upgrade, 5),
  ]
});

roles.push({
  name: "extension_builder",
  body: (room) => {
    const size = (room.energy - 50) / 250
    return [..._.flatten(_.times(size, () => [WORK, WORK, MOVE])), CARRY]
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
  size: (room: Room) => room.extensions.filter(ext => ext.pos.findInRange(FIND_SOURCES, 2)).length >= 2 && room.spawns[0].store[RESOURCE_ENERGY] < 300 ? 1 : 0,
  actions: [
    buildAction(actions.transfer, 0),
    buildAction(actions.pickupNear, 1),
    buildAction(actions.withdrawNearTombstone, 2),
    buildAction(actions.recycle, 3, (creep) => creep.room.spawns[0].store[RESOURCE_ENERGY] < 300),
  ],

})

export default roles;
