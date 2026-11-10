import EXNotifications
import ExpoModulesCore
import UIKit

/// Registers `TrayActionDelegate` with `expo-notifications`' `NotificationCenterManager`.
///
/// This runs in `didFinishLaunching`, so on a cold launch caused by a tray action
/// the handler is in place before iOS delivers the response (which it does only
/// after launch has finished). See docs/interactive-notifications.md, "iOS".
public class NotificationActionsAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  // `NotificationCenterManager` keeps its delegates in an array, which holds them
  // strongly; this reference only makes the lifetime obvious.
  private let delegate = TrayActionDelegate()

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    NotificationCenterManager.shared.addDelegate(delegate)
    // Live Activity: the observer is a main-target type (targets/live-activity/_shared),
    // invisible to this pod at compile time, so it is started by name.
    if let observer: AnyObject = NSClassFromString("PPLELiveActivityObserver") {
      let start = NSSelectorFromString("start")
      if observer.responds(to: start) {
        _ = observer.perform(start)
      }
    }
    return true
  }
}
