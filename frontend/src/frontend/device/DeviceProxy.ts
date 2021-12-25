import { reactive } from "vue"
import { DeviceContract } from "../../common/Device"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class DeviceProxy extends DeviceContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}