package expo.modules.scrollforwarder

import android.content.Context
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.abs

private const val TAG = "ExpoScrollForwarderView"

class ExpoScrollForwarderView(context: Context, appContext: AppContext) :
    ExpoView(context, appContext) {

    var scrollViewTag: Int? = null
        set (scrollViewTag) {
            field = scrollViewTag
            tryFindScrollView()
        }
    private var scrollView: View? = null
    private var downX = 0f
    private var downY = 0f
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var isScrollingX = false
    private var isScrollingY = false
    private var downEvent: MotionEvent? = null

    private fun tryFindScrollView() {
        val scrollViewTag = scrollViewTag
        if (scrollViewTag == null) {
            scrollView = null
            return
        }
        scrollView = this.getRootView().findViewById(scrollViewTag)
        Log.d(TAG, "scrollView $scrollView")
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        val scrollView = scrollView
        if (scrollView == null) {
            return super.dispatchTouchEvent(ev)
        }
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
                    if (downEvent != null) {
                        scrollView.dispatchTouchEvent(downEvent)
                    }
                }
                shouldScrollVertical = isScrollingY
            }
        }
        if (shouldScrollVertical) {
            val offsetX: Float = translationX
            val offsetY: Float = translationY
            ev.offsetLocation(offsetX, offsetY)
            val handled = scrollView.dispatchTouchEvent(ev)
            ev.offsetLocation(-offsetX, -offsetY)
            return handled
        }
        return super.dispatchTouchEvent(ev)
    }
}
