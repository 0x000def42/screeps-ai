export interface CreepAction {
  name: string,
  targetId: (room: Room) => Id<_HasId> | null,
  canStart: (creep: Creep) => boolean
  isFinish: (creep: Creep) => boolean
  act: (creep : Creep, target : any) => CreepActionReturnCode
}

const actions = {
} as Record<string, CreepAction>

export default actions

