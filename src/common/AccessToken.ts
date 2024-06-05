import { makeRandomID } from "../comTypes/util"
import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class AccessToken extends Struct.define("AccessToken", {
    id: Type.string,
    label: Type.string,
    token: Type.string,
    lastUsed: Type.number
}) {
    public static make(label: string) {
        return new AccessToken({
            id: makeRandomID(),
            label,
            lastUsed: -1,
            token: makeRandomID()
        })
    }
}

export const AccessTokenListContract = StructSyncContract.define(class AccessTokenList extends Struct.define("AccessTokenList", {
    tokens: AccessToken.ref().as(Type.map)
}) { }, {
    addToken: ActionType.define("addToken", Type.object({ label: Type.string }), Type.empty),
    deleteToken: ActionType.define("deleteToken", Type.object({ id: Type.string }), Type.empty)
})
