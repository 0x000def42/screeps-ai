type EnergyFlow = "harvested" | "upgraded" | "built" | "repaired" | "spawned" | "towers"

const sinkFlows: EnergyFlow[] = ["upgraded", "built", "repaired", "spawned", "towers"]
const rolesRecycledOnSpawn = ["suicider"]

function flowsOf(roomName: string) {
  Memory.metrics ||= { rooms: {} }
  Memory.metrics.rooms[roomName] ||= {}
  return Memory.metrics.rooms[roomName]
}

function track(roomName: string, flow: EnergyFlow, amount: number) {
  if (!(amount > 0)) return
  const flows = flowsOf(roomName)
  flows[flow] = (flows[flow] || 0) + amount
  if (sinkFlows.indexOf(flow) >= 0) flows.spent = (flows.spent || 0) + amount
}

function workPower(creep: Creep, perPart: number) {
  return creep.getActiveBodyparts(WORK) * perPart
}

function instrumentCreep() {
  const harvest = Creep.prototype.harvest
  Creep.prototype.harvest = function (this: Creep, target: Source | Mineral | Deposit) {
    const result = harvest.call(this, target as Source)
    const source = target as Source
    if (result == OK && typeof source.energy == "number") {
      track(this.room.name, "harvested", Math.min(workPower(this, HARVEST_POWER), source.energy))
    }
    return result
  }

  const upgradeController = Creep.prototype.upgradeController
  Creep.prototype.upgradeController = function (this: Creep, target: StructureController) {
    const result = upgradeController.call(this, target)
    if (result == OK) {
      track(this.room.name, "upgraded", Math.min(workPower(this, UPGRADE_CONTROLLER_POWER), this.store[RESOURCE_ENERGY]))
    }
    return result
  }

  const build = Creep.prototype.build
  Creep.prototype.build = function (this: Creep, target: ConstructionSite) {
    const result = build.call(this, target)
    if (result == OK) {
      const remaining = target.progressTotal - target.progress
      track(this.room.name, "built", Math.min(workPower(this, BUILD_POWER), this.store[RESOURCE_ENERGY], remaining))
    }
    return result
  }

  const repair = Creep.prototype.repair
  Creep.prototype.repair = function (this: Creep, target: Structure) {
    const result = repair.call(this, target)
    if (result == OK) {
      const missing = (target.hitsMax - target.hits) * REPAIR_COST
      track(this.room.name, "repaired", Math.min(workPower(this, REPAIR_POWER * REPAIR_COST), this.store[RESOURCE_ENERGY], missing))
    }
    return result
  }
}

function instrumentSpawn() {
  const spawnCreep = StructureSpawn.prototype.spawnCreep
  StructureSpawn.prototype.spawnCreep = function (
    this: StructureSpawn,
    body: BodyPartConstant[],
    name: string,
    opts?: SpawnOptions
  ) {
    const result = spawnCreep.call(this, body, name, opts)
    const role = opts && opts.memory ? opts.memory.role : ""
    if (result == OK && !(opts && opts.dryRun) && rolesRecycledOnSpawn.indexOf(role) < 0) {
      track(this.room.name, "spawned", body.reduce((total, part) => total + BODYPART_COST[part], 0))
    }
    return result
  }
}

function instrumentTower() {
  const trackTowerShot = (tower: StructureTower, result: ScreepsReturnCode) => {
    if (result == OK) track(tower.room.name, "towers", TOWER_ENERGY_COST)
    return result
  }

  const attack = StructureTower.prototype.attack
  StructureTower.prototype.attack = function (this: StructureTower, target: AnyCreep | Structure) {
    return trackTowerShot(this, attack.call(this, target as AnyCreep))
  }

  const towerRepair = StructureTower.prototype.repair
  StructureTower.prototype.repair = function (this: StructureTower, target: Structure) {
    return trackTowerShot(this, towerRepair.call(this, target))
  }

  const heal = StructureTower.prototype.heal
  StructureTower.prototype.heal = function (this: StructureTower, target: AnyCreep) {
    return trackTowerShot(this, heal.call(this, target))
  }
}

export function accrueSourcePotential() {
  const perSourcePerTick = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME
  Object.values(Game.rooms).forEach(room => {
    if (!(room.controller && room.controller.my)) return
    const flows = flowsOf(room.name)
    flows.sourceCount = room.sources.length
    flows.sourcePotential = (flows.sourcePotential || 0) + room.sources.length * perSourcePerTick
  })
}

export default function defineMetrics() {
  Memory.metrics ||= { rooms: {} }
  instrumentCreep()
  instrumentSpawn()
  instrumentTower()
}
