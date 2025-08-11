import actions, { CreepAction } from 'actions'

interface CreepRole {
  name: string;
  body: BodyPartConstant[];
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
  name: "upgrader",
  body: [WORK, MOVE, CARRY],
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
  body: [WORK, WORK, MOVE, CARRY],
  priority: 1,
  size: (room: Room) => room.find(FIND_MY_CONSTRUCTION_SITES).length == 0 ? 0 : _.min([room.sources.length, 3]),
  actions: [
    buildAction(actions.harvestSolo, 0),
    buildAction(actions.build, 1),
    buildAction(actions.transferToNearestExtension, 2)
  ]
});

export default roles;
