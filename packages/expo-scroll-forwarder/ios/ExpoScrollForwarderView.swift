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

    private var scrollView: UIScrollView? {
        didSet {
          if let oldValue {
                removeGestureRecognizer(oldValue.panGestureRecognizer)
            }
            if let scrollView {
                addGestureRecognizer(scrollView.panGestureRecognizer)
            }
        }
    }
    
    func tryFindScrollView() {
        guard let scrollViewTag = scrollViewTag else {
            return
        }
        
        let rctScrollView = self.appContext?.reactBridge?.uiManager.view(forReactTag: NSNumber(value: scrollViewTag)) as? UIView
        if (rctScrollView != nil) {
            self.scrollView = self.findScrollView(in: rctScrollView!)
        }
        
        if (self.scrollView == nil) {
            print("ExpoScrollForwarder: ScrollView \(scrollViewTag) is not found")
        } else {
            print("ExpoScrollForwarder: ScrollView \(scrollViewTag) is found")
        }
    }
    
    
    private func findScrollView(in view: UIView) -> UIScrollView? {
      if let sv = view as? UIScrollView { return sv }
      for child in view.subviews {
        if let found = findScrollView(in: child) {
          return found
        }
      }
      return nil
    }
    

}
