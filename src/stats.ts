// @ts-nocheck
const energyFlows = ["harvested", "upgraded", "built", "repaired", "spawned", "towers", "spent", "sourcePotential"];

export default function() {
  // Reset stats object
  Memory.stats = {
    gcl: {},
    rooms: {},
    cpu: {},
  };

  Memory.stats.time = Game.time;

  // Collect room stats
  for (let roomName in Game.rooms) {
    let room = Game.rooms[roomName];
    let isMyRoom = (room.controller ? room.controller.my : false);
    if (isMyRoom) {
      let roomStats = Memory.stats.rooms[roomName] = {};
      roomStats.storageEnergy           = (room.storage ? room.storage.store.energy : 0);
      roomStats.terminalEnergy          = (room.terminal ? room.terminal.store.energy : 0);
      roomStats.energyAvailable         = room.energyAvailable;
      roomStats.energyCapacityAvailable = room.energyCapacityAvailable;
      roomStats.controllerProgress      = room.controller.progress;
      roomStats.controllerProgressTotal = room.controller.progressTotal;
      roomStats.controllerLevel         = room.controller.level;
    }
  }

  const metricRooms = (Memory.metrics && Memory.metrics.rooms) || {};
  for (let roomName in metricRooms) {
    Memory.stats.rooms[roomName] = Memory.stats.rooms[roomName] || {};
  }
  for (let roomName in Memory.stats.rooms) {
    const flows = metricRooms[roomName] || {};
    const energy = Memory.stats.rooms[roomName].energy = {};
    for (let i = 0; i < energyFlows.length; i++) {
      energy[energyFlows[i]] = flows[energyFlows[i]] || 0;
    }
    Memory.stats.rooms[roomName].sourceCount = flows.sourceCount || 0;
  }

  // Collect GCL stats
  Memory.stats.gcl.progress      = Game.gcl.progress;
  Memory.stats.gcl.progressTotal = Game.gcl.progressTotal;
  Memory.stats.gcl.level         = Game.gcl.level;

  // Collect CPU stats
  Memory.stats.cpu.bucket        = Game.cpu.bucket;
  Memory.stats.cpu.limit         = Game.cpu.limit;
  Memory.stats.cpu.used          = Game.cpu.getUsed();
}
