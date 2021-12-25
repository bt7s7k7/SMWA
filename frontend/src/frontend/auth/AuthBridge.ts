import { User } from "../../common/User"
import { Auth } from "../../simpleAuth/Auth"

export class AuthBridge extends Auth.makeAuthBridge(User.ref()) { }