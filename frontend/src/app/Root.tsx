import { mdiChevronLeft, mdiMenu } from "@mdi/js"
import { computed, defineComponent } from "vue"
import { useRoute, useRouter } from "vue-router"
import { DirectAccessButtons } from "../frontend/DirectAccessButtons"
import { Sidebar } from "../frontend/Sidebar"
import { STATE } from "../frontend/State"
import { UserView } from "../frontend/auth/UserView"
import "../frontend/style.scss"
import { Button } from "../vue3gui/Button"
import { Icon } from "../vue3gui/Icon"
import { useResizeWatcher } from "../vue3gui/util"

export const Root = defineComponent({
    name: "Root",
    setup(props, ctx) {
        const route = useRoute()
        const router = useRouter()

        const size = useResizeWatcher()
        const isSidebarExpanded = computed(() => route.query["sidebar"] == "1")
        const bigMode = computed(() => size.width > 900)

        function expandSidebar() {
            router.push({ query: { sidebar: "1" } })
        }

        function collapseSidebar() {
            const state = history.state
            if (state.back != null && router.resolve(state.back).name == route.name) {
                router.back()
            } else {
                router.push({ query: { sidebar: null } })
            }
        }

        return () => (
            <div class="flex-fill flex column">
                <div class="border-bottom flex row p-2 gap-2 center-cross">
                    <div>
                        {!bigMode.value && (
                            isSidebarExpanded.value ? (
                                <Button clear onClick={collapseSidebar}> <Icon icon={mdiChevronLeft} /> </Button>
                            ) : (
                                <Button clear onClick={expandSidebar}> <Icon icon={mdiMenu} /> </Button>
                            )
                        )}
                        <DirectAccessButtons />
                    </div>
                    <div>{STATE.device?.config.label}</div>
                    <div class="flex-fill" />
                    <UserView />
                </div>
                <div class="flex-fill flex row">
                    <Sidebar fullPageMode={!bigMode.value} class={["flex bg-white", bigMode.value ? "flex-basis-200 border-right" : isSidebarExpanded.value ? "" : "hidden"]}></Sidebar>
                    <router-view class={isSidebarExpanded.value && "hidden"} />
                </div>
            </div>
        )
    }
})
