import { reactive } from "vue"
import { AccessTokenListContract } from "../../common/AccessToken"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class AccessTokenListProxy extends AccessTokenListContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}