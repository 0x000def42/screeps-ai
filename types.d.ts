interface Room {
  sources: Source[]
  spawns: StructureSpawn[]
  extensions: StructureExtension[]
}

interface Source {
  spots: RoomPosition[]
  creeps: Creep[]
}

interface Creep {
  target: _HasId
}
