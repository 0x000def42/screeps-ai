interface Room {
  sources: Source[]
}

interface Source {
  spots: RoomPosition[]
  creeps: Creep[]
}

interface Creep {
  target: _HasId
}
