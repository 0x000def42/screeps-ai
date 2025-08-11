export default function run(room : Room){
  Object.values(Game.flags).forEach(flag => flag.remove())
}
