import { AccessToken, AccessTokenListContract } from "../common/AccessToken"
import { ClientError } from "../structSync/StructSyncServer"
import { DATABASE } from "./DATABASE"

export class AccessTokenListController extends AccessTokenListContract.defineController() {
    protected tokenLookup = new Map<string, AccessToken>()

    public impl = super.impl({
        addToken: async ({ label }) => {
            const token = AccessToken.make(label)
            DATABASE.put("token", token)
            this.mutate(v => v.tokens.set(token.id, token))
            this.tokenLookup.set(token.token, token)
        },
        deleteToken: async ({ id }) => {
            const token = this.tokens.get(id)
            if (!token) throw new ClientError("Token not found")
            DATABASE.delete("token", id)
            this.mutate(v => v.tokens.delete(id))
            this.tokenLookup.delete(token.token)
        }
    })

    public testToken(token: string) {
        const tokenInstance = this.tokenLookup.get(token)
        if (!tokenInstance) return false
        this.mutate(v => v.tokens.get(tokenInstance.id)!.lastUsed = Date.now())
        return true
    }

    public static make() {
        const tokens = new Map(DATABASE.getAll("token"))
        const list = new AccessTokenListController({ tokens })
        for (const token of tokens.values()) {
            list.tokenLookup.set(token.token, token)
        }
        return list
    }
}