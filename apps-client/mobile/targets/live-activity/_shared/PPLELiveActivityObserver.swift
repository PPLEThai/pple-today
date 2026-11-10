// SPIKE (S5). Compiled into both targets via `_shared`, but only usable in the
// app: started at launch by `NotificationActionsAppDelegateSubscriber` through
// `NSClassFromString`, because that pod cannot see this main-target type.
// Everything it learns goes to `PPLELiveActivityLog` for the debug screen.
import ActivityKit
import Foundation
import UIKit

@available(iOSApplicationExtension, unavailable)
@objc(PPLELiveActivityObserver)
public final class PPLELiveActivityObserver: NSObject {
  private static var started = false
  private static var observedActivities = Set<String>()

  @objc public static func protectedDataAvailable() -> NSNumber {
    NSNumber(value: UIApplication.shared.isProtectedDataAvailable)
  }

  @objc public static func start() {
    guard !started else { return }
    started = true
    let state: String
    switch UIApplication.shared.applicationState {
    case .active: state = "active"
    case .inactive: state = "inactive"
    case .background: state = "background"
    @unknown default: state = "unknown"
    }
    PPLELiveActivityLog.append("launch state=\(state) protectedData=\(UIApplication.shared.isProtectedDataAvailable)")

    guard #available(iOS 17.2, *) else {
      PPLELiveActivityLog.append("unsupported: needs iOS 17.2")
      return
    }

    let info = ActivityAuthorizationInfo()
    PPLELiveActivityLog.append("enabled=\(info.areActivitiesEnabled)")
    Task {
      for await enabled in info.activityEnablementUpdates {
        PPLELiveActivityLog.append("enabled.update=\(enabled)")
      }
    }

    Task {
      for await token in Activity<PPLEInteractionAttributes>.pushToStartTokenUpdates {
        let hex = token.ppleHex
        UserDefaults.standard.set(hex, forKey: "pple.la.startToken")
        PPLELiveActivityLog.append("startToken \(hex)")
      }
    }

    for activity in Activity<PPLEInteractionAttributes>.activities {
      observe(activity, origin: "existing")
    }
    Task {
      for await activity in Activity<PPLEInteractionAttributes>.activityUpdates {
        observe(activity, origin: "new")
      }
    }
  }

  @available(iOS 17.2, *)
  private static func observe(_ activity: Activity<PPLEInteractionAttributes>, origin: String) {
    guard observedActivities.insert(activity.id).inserted else { return }
    let n = activity.attributes.notificationId
    PPLELiveActivityLog.append("activity.\(origin) n=\(n) state=\(activity.activityState) appState=\(UIApplication.shared.applicationState.rawValue)")
    Task {
      for await token in activity.pushTokenUpdates {
        PPLELiveActivityLog.append("updateToken n=\(n) \(token.ppleHex)")
      }
    }
    Task {
      for await state in activity.activityStateUpdates {
        PPLELiveActivityLog.append("activity.state n=\(n) \(state)")
      }
    }
  }
}
