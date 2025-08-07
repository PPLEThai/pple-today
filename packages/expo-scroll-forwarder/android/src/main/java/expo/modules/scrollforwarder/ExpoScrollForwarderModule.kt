package expo.modules.scrollforwarder

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL

class ExpoScrollForwarderModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoScrollForwarder")

        View(ExpoScrollForwarderView::class) {
            Prop("scrollViewTag") { view: ExpoScrollForwarderView, scrollViewTag: Int? ->
                view.scrollViewTag = scrollViewTag
            }
        }
    }
}
