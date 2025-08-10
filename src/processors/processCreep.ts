import roles from "roles";

import actions from "actions";

export default function process(creep : Creep) {
  const role = roles.filter(role => role.name == creep.memory.role)[0]

  // Reset action on finish
  if(creep.memory.action != "idle"){
    const action = actions[creep.memory.action]
    if(action.isFinish(creep)){
      creep.memory.action = "idle"
      creep.memory.targetId = null
    }
  }

  // Select action and target
  if(creep.memory.action == "idle"){
    role.actions.sort((a, b) => a.priority - b.priority)
    .forEach(({name}) => {
      if(creep.memory.action == "idle"){
        const action = actions[name]
        console.log(action.name)
        const targetId = action.targetId(creep.room)
        if(targetId){
          const canStart = action.canStart(creep)
          if(canStart) {
            creep.memory.action = name
            creep.memory.targetId = targetId
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
      creep.moveTo(target)
      return
    }
    creep.say(`${action.name}:${actResult}`)
  }
}
