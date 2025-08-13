export default function definePrototypes(){
  Object.defineProperties(Room.prototype, {
    sources: {
      get() : Source[] {
        return (this as Room).find(FIND_SOURCES)
      }
    },
    spawns: {
      get() : StructureSpawn[] {
        return (this as Room).find(FIND_MY_SPAWNS)
      }
    },
    extensions: {
      get() : StructureExtension[] {
        return (this as Room).find(FIND_MY_STRUCTURES, {
          filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
        })
      }
    },
    energy: {
      get() : number {
        return (this as Room).extensions.length * 50 + 300
      }
    },
    creeps: {
      get() : Creep[] {
        return (this as Room).find(FIND_MY_CREEPS)
      }
    }
  })
}
