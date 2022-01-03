import { reactive } from "vue"
import { ServiceManagerContract } from "../../common/Service"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class ServiceManagerProxy extends ServiceManagerContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}