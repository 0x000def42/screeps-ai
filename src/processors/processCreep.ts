import roles from "roles";

import actions, {settings} from "actions";

export default function process(creep : Creep) {
  if(creep.spawning) return
  if(creep.hits < creep.hitsMax){
    if(creep.room.controller && creep.room.controller.my) {}
    else if (!Memory.badRoomNames[creep.room.name]){
      Memory.badRoomNames[creep.room.name] = true
      settings.exits = {}
      settings.gamePaths = {}
      console.log('BAD ROOM!', creep.room.name)
    }
  }

  const role = roles.filter(role => role.name == creep.memory.role)[0]
  if(!role) return

  // Reset action on finish
  if(creep.memory.action != "idle"){
    const action = actions[creep.memory.action]
    if(action.isFinish(creep)){
      if(role.actions.filter(a => a.name == creep.memory.action)[0]?.storePrevAction){
        creep.memory.prevAction = creep.memory.action
        creep.memory.prevTargetId = creep.memory.targetId
      } else {
        creep.memory.prevAction = "idle"
        creep.memory.prevTargetId = null
      }
      creep.memory.action = "idle"
      creep.memory.targetId = null
    }
  }

  // Select action and target
  if(creep.memory.action == "idle"){
    role.actions.sort((a, b) => a.priority - b.priority)
    .forEach((roleAction) => {
      if(creep.memory.action == "idle"){
        if(roleAction.closure(creep)) {
          const action = actions[roleAction.name]
          const targetId = action.targetId(creep)
          if(targetId){
            const canStart = action.canStart(creep)
            if(canStart) {
              creep.memory.action = action.name
              creep.memory.targetId = targetId
            }
          }
        }
      }
    })
  }

  // Process action
  if(creep.memory.action != "idle"){
    const action = actions[creep.memory.action]
    const targetId = creep.memory.targetId as Id<_HasId>
    const target = Game.getObjectById(targetId) as any
    const actResult = action.act(creep, target)
    if(actResult == OK) return
    if(actResult == ERR_BUSY) return
    if(actResult == ERR_NOT_IN_RANGE) {
      creep.moveTo(target, {
        reusePath: 2,
        costCallback: creep.room.costCallback,
      })
      return
    }
    if((actResult as number) == -6){
      creep.memory.targetId = null
      return
    }
    if((actResult as number) == -7){
      creep.memory.action = "idle"
      creep.memory.targetId = null
      return
    }
    creep.say(`${action.name}:${actResult}`)
  }
}
