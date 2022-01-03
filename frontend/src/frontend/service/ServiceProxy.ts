import { reactive } from "vue"
import { ServiceContract } from "../../common/Service"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class ServiceProxy extends ServiceContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}