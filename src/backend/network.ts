import { AdminUIBridge } from "../adminUIBridge/AdminUIBridge"
import { VirtualRouter } from "../virtualNetwork/VirtualRouter"

export const ROOT_ROUTER = new VirtualRouter()
export const ADMIN_UI_BRIDGE = new AdminUIBridge({ parent: ROOT_ROUTER.connect() })