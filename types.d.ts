interface Room {
  energy: number
  sources: Source[]
  spawns: StructureSpawn[]
  extensions: StructureExtension[]
  creeps: Creep[]
}

interface Source {
  spots: RoomPosition[]
  creeps: Creep[]
}

interface Creep {
  target: _HasId
}

interface StructureSpawn {
  container: StructureContainer | null
}
