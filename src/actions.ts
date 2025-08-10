export interface CreepAction {
  name: string,
  targetId: (room: Room) => Id<_HasId> | null,
  canStart: (creep: Creep) => boolean
  isFinish: (creep: Creep) => boolean
  act: (creep : Creep, target : any) => CreepActionReturnCode
}

const actions = {
  harvest: {
    name: "harvest",
    targetId: room => room.find(FIND_SOURCES)[0]?.id,
    canStart: creep => creep.store[RESOURCE_ENERGY] == 0,
    isFinish: creep => creep.store[RESOURCE_ENERGY] == creep.store.getCapacity(),
    act: (creep, target : Source) => creep.harvest(target)
  },
  upgrade: {
    name: "upgrade",
    targetId: room => room.controller?.id,
    canStart: creep => creep.store[RESOURCE_ENERGY] == creep.store.getCapacity(),
    isFinish: creep => creep.store[RESOURCE_ENERGY] == 0,
    act: (creep, target : StructureController) => creep.upgradeController(target)
  }
} as Record<string, CreepAction>

export default actions

