import actions, {CreepAction} from 'actions'

interface CreepRole {
  name: string,
  body: any,
  priority: number,
  size: number,
  actions: CreepRoleAction[]
}

interface CreepRoleAction {
  name: string,
  priority: number
}

export function buildAction(action : CreepAction, priority : number){
  return {
    name: action.name,
    priority: priority
  } as CreepRoleAction
}

const roles = [] as CreepRole[]

export default roles
