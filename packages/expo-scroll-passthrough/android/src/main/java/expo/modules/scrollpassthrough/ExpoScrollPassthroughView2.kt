package expo.modules.scrollpassthrough

import android.content.Context
import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ViewConfiguration
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.abs

private const val TAG = "ExpoScrollPassthroughView2"

class ExpoScrollPassthroughView2(context: Context, appContext: AppContext) :
    ExpoView(context, appContext) {
//    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
//        return true
//    }

    private var downX = 0f
    private var downY = 0f
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var isScrolling = false
    private var downEvent: MotionEvent? = null

    // --- Part 1: The GestureDetector to handle the details of the intercepted gesture ---
    private val gestureDetector =
        GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {

            override fun onScroll(
                e1: MotionEvent?,
                e2: MotionEvent,
                distanceX: Float,
                distanceY: Float
            ): Boolean {
                // This onScroll will ONLY be called if onInterceptTouchEvent returned true.
                // We can now assume it's a horizontal pan and use the detailed information.
                // You can implement your specific logic here (e.g., move a child view).
                Log.d(
                    TAG,
                    "GestureDetector.onScroll: Handling horizontal pan. DistanceX: $distanceX"
                )
                return true
            }

            override fun onDown(e: MotionEvent): Boolean {
                Log.d(TAG, "GestureDetector.onDown ${e.x}, ${e.y}")
                return true
            }
        })

    // --- Part 2: The onInterceptTouchEvent to make the initial decision ---
//    override fun onInterceptTouchEvent(event: MotionEvent?): Boolean {
//        Log.d(TAG, "onInterceptTouchEvent called")
//        event?.let {
//            when (it.action) {
//                MotionEvent.ACTION_DOWN -> {
//                    Log.d(TAG, "onInterceptTouchEvent.ACTION_DOWN ${event.x}, ${event.y}")
//                    // Record the initial touch point and return false to see what happens next.
//                    downX = it.x
//                    downY = it.y
//                    return false
//                }
//                MotionEvent.ACTION_MOVE -> {
//                    val dx = it.x - downX
//                    val dy = it.y - downY
//
//                    if (abs(dx) > touchSlop && abs(dx) > abs(dy)) {
//                        // We see it's a horizontal pan and take control of the gesture.
//                        Log.i(TAG, "onInterceptTouchEvent: Detected a horizontal pan. Intercepting!")
//                        return true
//                    }
//
//                    Log.i(TAG, "onInterceptTouchEvent: Detected a vertical pan. Let them pass")
//                    // For all other gestures (vertical, diagonal, etc.), let them pass.
//                    return false
//                }
//                else -> return false
//            }
//        }
//        return false
//    }
//
//    // --- Part 3: The onTouchEvent to pass the intercepted event to the GestureDetector ---
//    override fun onTouchEvent(event: MotionEvent): Boolean {
//        Log.d(TAG, "onTouchEvent called")
//        // This method will only be called if onInterceptTouchEvent returned true.
//        // We now have the gesture and can pass it to the GestureDetector for detailed analysis.
//        // The GestureDetector's onTouchEvent will return true if a gesture was recognized.
//        val handledByDetector = gestureDetector.onTouchEvent(event)
//
//        Log.d(TAG, "onTouchEvent: Event passed to GestureDetector. Handled: $handledByDetector")
//
//        // We return true here because we have successfully intercepted and handled the event.
//        return handledByDetector
//    }

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        val result = super.onInterceptTouchEvent(ev)
        Log.d("ExpoScrollPassthroughView", "onInterceptTouchEvent $result $ev")
        return result
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
//        val result = super.dispatchTouchEvent(ev)

        if (isScrolling) {
            Log.d("ExpoScrollPassthroughView", "dispatchTouchEvent super $ev")
            return super.dispatchTouchEvent(ev)
        }

        when (ev.action) {
            MotionEvent.ACTION_DOWN -> {
                downX = ev.x
                downY = ev.y
                downEvent = MotionEvent.obtain(ev)
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                isScrolling = false
                downEvent?.recycle()
                downEvent = null
            }
            MotionEvent.ACTION_MOVE -> {
                if (abs(ev.x - downX) > touchSlop || abs(ev.y - downY) > touchSlop) {
                    isScrolling = true
                    Log.d("ExpoScrollPassthroughView", "dispatchTouchEvent super $ev")
                    if (downEvent != null) {
                        super.dispatchTouchEvent(downEvent)
                    }
                    return super.dispatchTouchEvent(ev)
                }
            }
        }

//        Log.d("ExpoScrollPassthroughView", "dispatchTouchEvent $result $ev")
        Log.d("ExpoScrollPassthroughView", "dispatchTouchEvent false $ev")
        return false
    }

}
