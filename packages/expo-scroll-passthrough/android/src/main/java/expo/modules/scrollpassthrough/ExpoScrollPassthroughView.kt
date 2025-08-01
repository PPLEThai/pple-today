package expo.modules.scrollpassthrough

import android.content.Context
import android.view.MotionEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class ExpoScrollPassthroughView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
    return true
  }
}
