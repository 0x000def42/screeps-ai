export default function definePrototypes(){
  Object.defineProperties(Spawn.prototype, {
    container: {
      get() : StructureContainer | null {
        return (this as StructureSpawn).pos.findInRange(FIND_STRUCTURES, 2, {
          filter: (structure) => structure.structureType == STRUCTURE_CONTAINER
        })[0] as StructureContainer
      }
    }
  })
}
