package expo.modules.scrollpassthrough

import android.content.Context
import android.util.Log
import android.view.MotionEvent
import android.view.ViewConfiguration
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.abs

private const val TAG = "ExpoScrollPassthroughView"

class ExpoScrollPassthroughView(context: Context, appContext: AppContext) :
    ExpoView(context, appContext) {

    private var downX = 0f
    private var downY = 0f
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var isScrollingX = false
    private var isScrollingY = false
    private var downEvent: MotionEvent? = null

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        val result = super.onInterceptTouchEvent(ev)
        Log.d(TAG, "onInterceptTouchEvent $result $ev")
        return result
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        val view2 = (parent.parent as ExpoScrollPassthroughView3).expoScrollPassthroughView2!!
        var shouldScrollVertical = false

        when (ev.action) {
            MotionEvent.ACTION_DOWN -> {
                downX = ev.x
                downY = ev.y
                downEvent = MotionEvent.obtain(ev).also {
                    it.offsetLocation(translationX, translationY)
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                shouldScrollVertical = isScrollingY
                isScrollingX = false
                isScrollingY = false
                downEvent?.recycle()
                downEvent = null
            }
            MotionEvent.ACTION_MOVE -> {
                if (abs(ev.x - downX) > touchSlop && !isScrollingX && !isScrollingY) {
                    isScrollingX = true
                }
                if (abs(ev.y - downY) > touchSlop && !isScrollingX && !isScrollingY) {
                    isScrollingY = true
                    Log.d(TAG, "dispatchTouchEvent view2 $ev")
                    if (downEvent != null) {
                        view2.dispatchTouchEvent(downEvent)
                    }
                }
                shouldScrollVertical = isScrollingY
            }
        }
        if (shouldScrollVertical) {
            Log.i(TAG, "ACTION_MOVE ${ev.x} ${ev.y} $translationX $translationY")
            val offsetX: Float = translationX
            val offsetY: Float = translationY
            ev.offsetLocation(offsetX, offsetY)
            val handled = view2.dispatchTouchEvent(ev)
            ev.offsetLocation(-offsetX, -offsetY)
            return handled
        }
        Log.d(TAG, "dispatchTouchEvent super $ev")
        return super.dispatchTouchEvent(ev)
    }
}
