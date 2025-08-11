export default function definePrototypes(){
  Object.defineProperties(Creep.prototype, {
    target: {
      get() : _HasId {
        return Game.getObjectById((this as Creep).memory.targetId as Id<_HasId>) as _HasId
      }
    }
  })
}
