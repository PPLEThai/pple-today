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

  /// The current push-to-start token, read directly (not from the stream).
  @objc public static func currentStartToken() -> NSString {
    guard #available(iOS 17.2, *) else { return "" }
    let hex = Activity<PPLEInteractionAttributes>.pushToStartToken?.ppleHex ?? ""
    if !hex.isEmpty { UserDefaults.standard.set(hex, forKey: "pple.la.startToken") }
    // S5: the pushTokenUpdates stream often never emits for push-started
    // activities. Read each running activity's token property directly.
    for activity in Activity<PPLEInteractionAttributes>.activities {
      observe(activity, origin: "refresh")
      PPLELiveActivityLog.append(
        "pushToken.property n=\(activity.attributes.notificationId) state=\(activity.activityState) \(activity.pushToken?.ppleHex ?? "nil")"
      )
    }
    return hex as NSString
  }

  /// Starts a Live Activity locally, with a dummy response token. For S4 (does a
  /// Lock Screen button ask for an unlock?) without a push, and to prompt iOS to
  /// issue the push-to-start token. Its answer is expected to fail (401).
  @objc public static func startLocalTest() -> NSString {
    guard #available(iOS 17.2, *) else { return "needs iOS 17.2" }
    let attributes = PPLEInteractionAttributes(
      notificationId: "local-\(Int(Date().timeIntervalSince1970))",
      appName: "Local test",
      header: "ทดสอบ Live Activity (local)",
      message: "กดปุ่มขณะล็อกเครื่อง เพื่อดูว่าต้องปลดล็อกก่อนหรือไม่",
      actions: [
        .init(id: "approve", label: "อนุมัติ", icon: "check", destructive: nil, bg: true),
        .init(id: "reject", label: "ไม่อนุมัติ", icon: "x", destructive: true, bg: true),
      ],
      responseToken: "local"
    )
    do {
      let activity = try Activity.request(
        attributes: attributes,
        content: ActivityContent(state: .init(status: "open", label: nil), staleDate: Date().addingTimeInterval(3600)),
        pushType: .token
      )
      observe(activity, origin: "local")
      PPLELiveActivityLog.append("local.started n=\(attributes.notificationId)")
      PPLELiveActivityLog.append("startToken.static=\(Activity<PPLEInteractionAttributes>.pushToStartToken?.ppleHex ?? "nil")")
      return "started"
    } catch {
      PPLELiveActivityLog.append("local.error \(error)")
      return "error: \(error.localizedDescription)" as NSString
    }
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

    PPLELiveActivityLog.append("iOS \(UIDevice.current.systemVersion) startToken.static=\(Activity<PPLEInteractionAttributes>.pushToStartToken?.ppleHex ?? "nil")")
    Task {
      PPLELiveActivityLog.append("startToken.subscribed")
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
