import { ErrorMapper } from "utils/ErrorMapper";

import defineRoomPrototypes from "prototypes/room"
import defineSourcePrototypes from "prototypes/source"
import defineCreepPrototypes from "prototypes/creep"
import defineStructuresPrototypes from "prototypes/structures"
import defineSpawnPrototypes from "prototypes/spawn"

import processSpawn from "./processors/processSpawn"
import processCreep from "./processors/processCreep"
import processFlags from "./processors/flagsProcessor"
import processRoom from "./processors/processRoom"

import defineLayouts from "./buildings/check"
import processBuilding from "buildings/processBuilding";
import defineMetrics, { accrueSourcePotential } from "./metrics"
import manageExpansion from "./expansion"
import { measure } from "./profiler"
import exportStats from "./stats"
// import profiler from "screeps-profiler"


declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    badRoomNames: any
    sources: any
    metrics: { rooms: { [roomName: string]: { [flow: string]: number } }, cpu: { [section: string]: number } }
    intel: { [roomName: string]: { sources: number, sourcePositions: { x: number, y: number }[], controller: { x: number, y: number } | null, owner: string | null, claimable: boolean, keeper: boolean, fit: number, seen: number } }
    expansion: { room: string, base: string } | null
    scoutTarget: string | null
    gates: { [roomName: string]: { [edgeIndex: string]: number } }
  }

  interface RoomMemory {
    _extensionsIds: Array<Id<_HasId>>
  }

  interface FlagMemory {
    nearestRoomName: string | undefined
  }

  interface CreepMemory {
    role: string;
    action: string;
    targetId: Id<_HasId> | null
    prevAction: string;
    prevTargetId: Id<_HasId> | null
    flagName: string | null
    sourceId: Id<_HasId> | null
  }

  interface SpawnMemory {
    nextSpawning: boolean;
    containerId: Id<_HasId> | undefined
    anotherContainerId: Id<_HasId> | undefined
    nearestExtensionIds: Array<Id<_HasId>>
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
      h: any;
    }
  }
}


global.h = {}
defineLayouts()

if(!Memory.badRoomNames) Memory.badRoomNames = {}


defineRoomPrototypes()
defineSourcePrototypes()
defineCreepPrototypes()
defineStructuresPrototypes()
defineSpawnPrototypes()
defineMetrics()

global.log = (some : any) => {
  console.log(JSON.stringify(some))
}

Memory.sources ||= {}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code

// const wrappedExportStats = profiler.registerFN(exportStats, "exportStats")
// const wrappedProcessSpawn = profiler.registerFN(processSpawn, "processSpawn")
// const wrappedProcessRoom = profiler.registerFN(processRoom, "processRoom")
// const wrappedProcessCreep = profiler.registerFN(processCreep, "processCreep")

// profiler.enable()

export const loop = ErrorMapper.wrapLoop(() => {
  if(Game.time % 10 == 0) console.log(`Current game tick is ${Game.time}`);

  measure("creeps", () => {
    Object.values(Game.creeps).forEach(creep => {
      measure(`creep.${creep.memory.role}`, () => processCreep(creep))
    })
  })

  measure("rooms", () => {
    Object.values(Game.rooms).forEach(room => {
      measure("rooms.flags", () => processFlags(room))
      measure("rooms.defence", () => processRoom(room))
    })
  })

  measure("cleanup", () => {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  })

  measure("building", () => processBuilding())

  measure("spawns", () => {
    Object.values(Game.spawns).forEach(spawn => {
      processSpawn(spawn)
    })
  })

  measure("expansion", () => manageExpansion())
  measure("sourcePotential", () => accrueSourcePotential())
  measure("stats", () => exportStats())
});
