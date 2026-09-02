import layouts from "buildings/layouts"

export default () => {
  global.h.checkLayout = (roomName : string, name : string) => {
    Object.values(Game.flags).filter(f => f.color == COLOR_YELLOW).forEach(f => f.remove())
    const room = Game.rooms[roomName]
    const layoutPositions = (layouts as any)[name](room)
    let i = 0
    layoutPositions.forEach((pos: { pos: RoomPosition, type: any }) => {
      console.log(room.createFlag(pos.pos, `${pos.type}:${Game.time}:${i++}`, COLOR_YELLOW))
    })
  }
}
