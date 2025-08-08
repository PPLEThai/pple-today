// https://github.com/bluesky-social/social-app/blob/main/modules/expo-scroll-forwarder/ios/ExpoScrollForwarderView.swift
import ExpoModulesCore


// This view will be used as a native component. Make sure to inherit from `ExpoView`
// to apply the proper styling (e.g. border radius and shadows).
class ExpoScrollForwarderView: ExpoView, UIGestureRecognizerDelegate {
    var scrollViewTag: Int? {
        didSet {
            self.tryFindScrollView()
        }
    }

    private var rctScrollView: RCTScrollView? {
        didSet {
          if let oldValue {
                removeGestureRecognizer(oldValue.scrollView.panGestureRecognizer)
            }
            if let rctScrollView {
                addGestureRecognizer(rctScrollView.scrollView.panGestureRecognizer)
            }
        }
    }
    
    func tryFindScrollView() {
        guard let scrollViewTag = scrollViewTag else {
            return
        }

        self.rctScrollView = self.appContext?
            .findView(withTag: scrollViewTag, ofType: RCTScrollView.self)
        
        if (self.rctScrollView == nil) {
            print("ExpoScrollForwarder: ScrollView \(scrollViewTag) is not found")
        } else {
            print("ExpoScrollForwarder: ScrollView \(scrollViewTag) is found")
        }
    }
}
