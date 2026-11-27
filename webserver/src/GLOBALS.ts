import { version } from './version'

export const VERSION: string = version

// The port the server listens on.  Set once at startup from the runtime config.
export let listening_port = 8101
export function setListeningPort(port: number) { listening_port = port }
