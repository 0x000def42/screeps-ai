interface Room {
  _ignoredPos: RoomPosition[] | undefined
  ignoredPos: RoomPosition[]
  costCallback: () => any,
  energy: number
  sources: Source[]
  spawns: StructureSpawn[]
  extensions: StructureExtension[]
  creeps: Creep[]
  fromPathStep: (step : PathStep) => RoomPosition
}

interface Source {
  extension: any
  memory: any
  spots: RoomPosition[]
  creeps: Creep[]
  workBodyparts: number
  container: StructureContainer | null
}

interface Creep {
  target: _HasId
  withoutWithdrawal : boolean
}

interface StructureSpawn {
  anotherContainer: StructureContainer | null
  container: StructureContainer | null
  nearestExtensions: StructureExtension[]
}

interface StructureContainer {
  creeps: Creep[]
  carryBodyparts: number
}

