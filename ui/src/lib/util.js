
import { machineIdSync } from 'node-machine-id'

let _machineId = null

export function getMachineId() {
  if(_machineId !== null) {
    return _machineId
  }

  _machineId = machineIdSync()
  return _machineId
}
