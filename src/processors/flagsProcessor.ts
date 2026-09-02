export default function run(room : Room){


  const flags = Object.values(Game.flags)
  if(Game.time % 100 == 0){
    flags.forEach(flag => {
      if(flag.name == "claim"){
        if(flag.room && flag.room.controller && flag.room.controller.my && !!flag.room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_SPAWN})[0]) {
          flag.remove()
        }
      }
    })
  }


  flags.filter(flag => {
    return flag.color == COLOR_WHITE
  }).forEach(flag => {
    if(flag.name == "harass"){
      const pos = flag.pos
      flag.remove()
      pos.createFlag(`harass:${Game.time}`, COLOR_RED)
    }
  })

  const creeps = Object.values(Game.creeps)
  const harassers = creeps.filter(creep => creep.memory.role == "harasser")

  flags.filter(flag => flag.color == COLOR_RED).forEach(flag => {
    const harasserWithoutFlag = harassers.filter(creep => !creep.memory.flagName)[0]
    if(harasserWithoutFlag){
      harasserWithoutFlag.memory.flagName = flag.name
    }
  })

  const harassersWithFlag = harassers.filter(creep => creep.memory.flagName)
  harassersWithFlag.forEach(harasser => {
    if(harasser.memory.flagName){
      const flag = Game.flags[harasser.memory.flagName]
      if(flag){
        if(harasser.room != flag.room){
          const route = Game.map.findRoute(harasser.room, flag.pos.roomName)
          console.log(harasser.room)
          console.log(flag.room)
          if(route != ERR_NO_PATH){
            const exit = harasser.pos.findClosestByRange(route[0].exit)
            if(exit) harasser.moveTo(exit)
          }
        }
      }
    }
  })
}
