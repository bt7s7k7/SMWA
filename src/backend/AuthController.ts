import { User } from "../common/User"
import { Auth } from "../simpleAuth/Auth"

export class AuthController extends Auth.makeAuthController(User.ref()) { }