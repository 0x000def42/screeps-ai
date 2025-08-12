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
    }
  })
}
