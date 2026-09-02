import profiler from "screeps-profiler"

function getSources(this: Room){
  return this.find(FIND_SOURCES)
}

function getSpawns(this: Room){
  return this.find(FIND_MY_SPAWNS)
}

function getExtensions(this: Room){
  if(Game.time % 100 == 0 || !this.memory._extensionsIds) {
    this.memory._extensionsIds = this.find(FIND_MY_STRUCTURES, {
      filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
    }).map(str => str.id)
  }
  return _.flatten(this.memory._extensionsIds.map(id => Game.getObjectById(id)))
}

function getEnergy(this: Room){
  let size = Math.max(this.extensions.length, 2) - 2
  return size * 50 + 300
}

function getCreeps(this: Room){
  return this.find(FIND_MY_CREEPS)
}

function costCallback(this: Room){
  return (roomName : string, costMatrix : CostMatrix) => {
    this.ignoredPos.forEach(pos => {
      costMatrix.set(pos.x, pos.y, 255)
    })
  }
}

function ignoredPos(this: Room) {
  if (this._ignoredPos) return this._ignoredPos

  const ignoredPos: RoomPosition[] = []

  this.find(FIND_HOSTILE_CREEPS).forEach(creep => {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const x = creep.pos.x + dx
        const y = creep.pos.y + dy
        if (x >= 0 && x < 50 && y >= 0 && y < 50) {
          ignoredPos.push(new RoomPosition(x, y, this.name))
        }
      }
    }
  })
  if(this.controller && this.controller.my){
    const spawn = this.spawns[0]
    if(spawn){
      _.compact([spawn.container, spawn.anotherContainer]).forEach((c) => ignoredPos.push((c as StructureContainer).pos))
    }
  }

  this._ignoredPos = ignoredPos
  return ignoredPos
}

export default function definePrototypes(){
  Room.prototype.fromPathStep = function(step : PathStep){
    return new RoomPosition(step.x, step.y, this.name)
  }

  Object.defineProperties(Room.prototype, {
    ignoredPos: { get: ignoredPos },
    sources: { get: getSources },
    spawns: { get: getSpawns },
    extensions: { get: getExtensions },
    energy: { get: getEnergy },
    creeps: { get: getCreeps },
    costCallback: { get: costCallback }
    // sources: { get: profiler.registerFN(getSources, "Room.sources") as () => any },
    // spawns: { get: profiler.registerFN(getSpawns, "Room.spawns") as () => any },
    // extensions: { get: profiler.registerFN(getExtensions, "Room.extensions") as () => any },
    // energy: { get: profiler.registerFN(getEnergy, "Room.energy") as () => any },
    // creeps: { get: profiler.registerFN(getCreeps, "Room.creeps") as () => any }
  })
}
