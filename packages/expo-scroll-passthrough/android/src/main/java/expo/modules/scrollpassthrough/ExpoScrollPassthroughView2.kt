package expo.modules.scrollpassthrough

import android.content.Context
import android.util.Log
import android.view.MotionEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

private const val TAG = "ExpoScrollPassthroughView2"

class ExpoScrollPassthroughView2(context: Context, appContext: AppContext) :
    ExpoView(context, appContext) {

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        (parent.parent as ExpoScrollPassthroughView3).expoScrollPassthroughView2 = this
        val result = super.onInterceptTouchEvent(ev)
        Log.d(TAG, "onInterceptTouchEvent $result $ev")
        return result
    }
}
