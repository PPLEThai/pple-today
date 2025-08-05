package expo.modules.scrollpassthrough

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL

class ExpoScrollPassthroughModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoScrollPassthrough")

    View(ExpoScrollPassthroughView::class) {}
    View(ExpoScrollPassthroughView2::class) {}
    View(ExpoScrollPassthroughView3::class) {}
  }
}
