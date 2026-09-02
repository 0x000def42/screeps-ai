export function measure<T>(section : string, body : () => T) : T {
  const started = Game.cpu.getUsed()
  const result = body()

  Memory.metrics ||= { rooms: {}, cpu: {} }
  Memory.metrics.cpu ||= {}
  Memory.metrics.cpu[section] = (Memory.metrics.cpu[section] || 0) + Game.cpu.getUsed() - started

  return result
}
