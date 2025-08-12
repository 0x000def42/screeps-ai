interface Room {
  sources: Source[]
  spawns: StructureSpawn[]
}

interface Source {
  spots: RoomPosition[]
  creeps: Creep[]
}

interface Creep {
  target: _HasId
}
