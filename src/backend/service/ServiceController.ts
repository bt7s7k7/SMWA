import { ServiceConfig, ServiceContract, ServiceDefinition, ServiceInfo } from "../../common/Service"

export class ServiceController extends ServiceContract.defineController() {
    public makeInfo() {
        return new ServiceInfo({
            id: this.config.id,
            label: this.config.label,
            state: this.state
        })
    }

    public static make(config: ServiceConfig, definition: ServiceDefinition) {
        return new ServiceController({
            config, definition,
            state: "stopped",
            terminal: null
        })
    }
}