import { posByDirections } from "buildings/layouts"
import profiler from "screeps-profiler"

function getContainer(this: StructureSpawn){
  let id = this.memory.containerId

  if(!id && Game.time % 50 == 0){
    const controller = this.room.controller as StructureController
    const direction = this.pos.getDirectionTo(controller.pos.x, controller.pos.y)
    const toControllerPos = posByDirections(this.pos, [direction])

    this.memory.containerId = toControllerPos.lookFor(LOOK_STRUCTURES).filter(l => l.structureType == STRUCTURE_CONTAINER)[0]?.id
  }

  if(id) {
    const container = Game.getObjectById(id)
    if(!container) this.memory.containerId = undefined
    return container
  }

  return null
}

function getAnotherContainer(this: StructureSpawn){
  if(!this.container) return null
  let id = this.memory.anotherContainerId

  if(!id && Game.time % 50 == 0){
    this.memory.anotherContainerId = this.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType == STRUCTURE_CONTAINER && s.id != (this.container as StructureContainer).id
    })[0]?.id
  }

  id ||= this.memory.anotherContainerId

  if(id) {
    const container = Game.getObjectById(id)
    if(!container) this.memory.anotherContainerId = undefined
    return container
  }

  return null
}

function getNearestExtensions(this: StructureSpawn){
  if(!this.memory.nearestExtensionIds || Game.time % 50){
    this.memory.nearestExtensionIds = this.pos.findInRange(FIND_MY_STRUCTURES, 5, {
      filter:  str => str.structureType == STRUCTURE_EXTENSION
    }).map(str => str.id)
  }

  return _.compact(this.memory.nearestExtensionIds.map(id => Game.getObjectById(id) as StructureExtension))
}

export default function definePrototypes(){
  Object.defineProperties(Spawn.prototype, {
    container: { get : getContainer },
    nearestExtensions: { get : getNearestExtensions },
    anotherContainer: { get : getAnotherContainer }
  })
}
