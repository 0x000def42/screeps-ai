import { ErrorMapper } from "utils/ErrorMapper";

import defineRoomPrototypes from "prototypes/room"
import defineSourcePrototypes from "prototypes/source"
import defineCreepPrototypes from "prototypes/creep"

import processSpawn from "./processors/processSpawn"
import processCreep from "./processors/processCreep"
import processFlags from "./processors/flagsProcessor"

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
  }

  interface CreepMemory {
    role: string;
    action: string;
    targetId: Id<_HasId> | null
    prevAction: string;
    prevTargetId: Id<_HasId> | null
  }

  interface SpawnMemory {
    nextSpawning: boolean;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

defineRoomPrototypes()
defineSourcePrototypes()
defineCreepPrototypes()

global.log = (some : any) => {
  console.log(JSON.stringify(some))
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  if(Game.time % 10 == 0) console.log(`Current game tick is ${Game.time}`);

  Object.values(Game.spawns).forEach(spawn => {
    processSpawn(spawn)
  })

  Object.values(Game.creeps).forEach(creep => {
    processCreep(creep)
  })

  Object.values(Game.rooms).forEach(room => {
    processFlags(room)
  })
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
