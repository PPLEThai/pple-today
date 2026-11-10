// Compiled into both targets via `_shared`, but only usable in the app: started at
// launch by `NotificationActionsAppDelegateSubscriber` through `NSClassFromString`
// (that pod cannot see this main-target type), and queried by
// `NotificationActionsModule` the same way.
//
// What it does, all natively because the app is often launched in the background
// by a push-to-start with no JS runtime (docs/interactive-notifications.md,
// "Live Activity (iOS)"):
//  - tracks the push-to-start token and Live Activity enablement, and posts
//    `registrationDidChangeNotification` when either changes (the module turns it
//    into the JS event that re-registers the device);
//  - uploads each running activity's update token, and ends activities the server
//    reports as answered, closed or expired (also the reconcile at launch).
//
// `pushTokenUpdates` streams are unreliable while the process lives (S5), so a
// token is read from the `activity.pushToken` property on every trigger: launch,
// a new activity, a stream emission and every return to the foreground.
import ActivityKit
import Foundation
import UIKit
import os

@available(iOSApplicationExtension, unavailable)
@objc(PPLELiveActivityObserver)
public final class PPLELiveActivityObserver: NSObject {
  /// Posted when the start token or enablement changes. `NotificationActionsModule`
  /// listens by this literal name.
  public static let registrationDidChangeNotification = Notification.Name(
    "PPLELiveActivityRegistrationDidChange")

  private static let log = Logger(subsystem: "th.or.peoplesparty.pple-today", category: "live-activity")
  private static let uploadedKey = "pple.la.uploadedTokens"

  private static let lock = NSLock()
  private static var started = false
  private static var observedActivities = Set<String>()
  private static var inFlight = [String: String]()  // activity id -> token being uploaded
  private static var lastPublished: String?

  // MARK: - Entry points (called by name from the pod)

  @objc public static func start() {
    lock.lock()
    let alreadyStarted = started
    started = true
    lock.unlock()
    guard !alreadyStarted else { return }
    guard #available(iOS 17.2, *) else { return }

    lastPublished = registrationSignature()

    Task {
      for await _ in Activity<PPLEInteractionAttributes>.pushToStartTokenUpdates {
        publishRegistrationIfChanged()
      }
    }
    let info = ActivityAuthorizationInfo()
    Task {
      for await _ in info.activityEnablementUpdates {
        publishRegistrationIfChanged()
      }
    }
    Task {
      for await activity in Activity<PPLEInteractionAttributes>.activityUpdates {
        track(activity)
      }
    }
    NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
    ) { _ in
      publishRegistrationIfChanged()
      refreshAllActivities()
    }
    refreshAllActivities()
  }

  /// `{ startToken: String | NSNull, enabled: Bool }`, or `nil` when Live
  /// Activities are unsupported here (iOS < 17.2).
  @objc public static func registration() -> NSDictionary? {
    guard #available(iOS 17.2, *) else { return nil }
    var result: [String: Any] = ["enabled": ActivityAuthorizationInfo().areActivitiesEnabled]
    if let token = currentStartToken() {
      result["startToken"] = token
    } else {
      result["startToken"] = NSNull()
    }
    return result as NSDictionary
  }

  /// Ends every interactive Live Activity immediately (logout).
  ///
  /// Returns an object, not `Void`: it is called through `perform(_:)`, whose
  /// result the caller reads, and a `Void` method would hand back garbage.
  @objc public static func endAllActivities() -> NSNumber {
    guard #available(iOS 16.2, *) else { return NSNumber(value: false) }
    UserDefaults.standard.removeObject(forKey: uploadedKey)
    Task {
      for activity in Activity<PPLEInteractionAttributes>.activities {
        await PPLELiveActivityFinish.endImmediately(activity)
      }
    }
    return NSNumber(value: true)
  }

  // MARK: - Registration

  @available(iOS 17.2, *)
  private static func currentStartToken() -> String? {
    Activity<PPLEInteractionAttributes>.pushToStartToken?.ppleHex
  }

  @available(iOS 17.2, *)
  private static func registrationSignature() -> String {
    "\(currentStartToken() ?? "")|\(ActivityAuthorizationInfo().areActivitiesEnabled)"
  }

  @available(iOS 17.2, *)
  private static func publishRegistrationIfChanged() {
    let signature = registrationSignature()
    lock.lock()
    let changed = signature != lastPublished
    lastPublished = signature
    lock.unlock()
    guard changed else { return }
    NotificationCenter.default.post(name: registrationDidChangeNotification, object: nil)
  }

  // MARK: - Activities

  @available(iOS 17.2, *)
  private static func refreshAllActivities() {
    let running = Activity<PPLEInteractionAttributes>.activities
    pruneUploaded(keeping: Set(running.map { $0.id }))
    for activity in running {
      track(activity)
    }
  }

  /// Syncs the activity's token now, and again on every `pushTokenUpdates` emission.
  @available(iOS 17.2, *)
  private static func track(_ activity: Activity<PPLEInteractionAttributes>) {
    syncToken(activity)
    lock.lock()
    let isNew = observedActivities.insert(activity.id).inserted
    lock.unlock()
    guard isNew else { return }
    Task {
      for await _ in activity.pushTokenUpdates {
        syncToken(activity)
      }
    }
  }

  @available(iOS 17.2, *)
  private static func syncToken(_ activity: Activity<PPLEInteractionAttributes>) {
    switch activity.activityState {
    case .ended, .dismissed: return
    default: break
    }
    guard let token = activity.pushToken?.ppleHex else { return }
    let id = activity.id
    lock.lock()
    let skip = uploadedTokens()[id] == token || inFlight[id] == token
    if !skip { inFlight[id] = token }
    lock.unlock()
    guard !skip else { return }

    let background = BackgroundTask(name: "pple-live-activity-token")
    Task {
      await upload(token: token, for: activity)
      finishInFlight(id)
      background.end()
    }
  }

  @available(iOS 17.2, *)
  private static func upload(token: String, for activity: Activity<PPLEInteractionAttributes>) async {
    let notificationId = activity.attributes.notificationId
    let result = await PPLEBackend.post(
      notificationId: notificationId,
      suffix: "/live-activity",
      token: activity.attributes.responseToken,
      json: ["pushToken": token]
    )
    switch result.status {
    case 200:
      rememberUploaded(token, for: activity.id)
      var uploadState: String?
      var actionLabel: String?
      if let data = result.data,
        let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      {
        uploadState = object["state"] as? String
        actionLabel = object["actionLabel"] as? String
      }
      if let final = PPLELiveActivityFinish.finalState(uploadState: uploadState, actionLabel: actionLabel) {
        await PPLELiveActivityFinish.end(activity, state: final)
      }
    case 401, 404:
      // The server does not know this notification or token (logged out, deleted).
      rememberUploaded(token, for: activity.id)
      await PPLELiveActivityFinish.endImmediately(activity)
    default:
      // Not recorded: the next trigger (foreground, token emission) retries.
      log.notice("token upload failed status=\(result.status ?? -1, privacy: .public)")
    }
  }

  private static func finishInFlight(_ id: String) {
    lock.lock()
    inFlight[id] = nil
    lock.unlock()
  }

  // MARK: - Uploaded-token memory (UserDefaults, so a relaunch does not re-upload)

  private static func uploadedTokens() -> [String: String] {
    UserDefaults.standard.dictionary(forKey: uploadedKey) as? [String: String] ?? [:]
  }

  private static func rememberUploaded(_ token: String, for id: String) {
    lock.lock()
    var all = uploadedTokens()
    all[id] = token
    UserDefaults.standard.set(all, forKey: uploadedKey)
    lock.unlock()
  }

  private static func pruneUploaded(keeping ids: Set<String>) {
    lock.lock()
    let all = uploadedTokens()
    let kept = all.filter { ids.contains($0.key) }
    if kept.count != all.count { UserDefaults.standard.set(kept, forKey: uploadedKey) }
    lock.unlock()
  }
}

/// Keeps the process running for the upload when the app was launched in the
/// background or is suspended right after. `beginBackgroundTask` buys about 30 s,
/// more than the 15 s request timeout.
@available(iOSApplicationExtension, unavailable)
private final class BackgroundTask {
  private var identifier: UIBackgroundTaskIdentifier = .invalid
  private let lock = NSLock()

  init(name: String) {
    let begin = {
      self.identifier = UIApplication.shared.beginBackgroundTask(withName: name) { [weak self] in
        self?.end()
      }
    }
    if Thread.isMainThread { begin() } else { DispatchQueue.main.sync { begin() } }
  }

  func end() {
    lock.lock()
    let current = identifier
    identifier = .invalid
    lock.unlock()
    guard current != .invalid else { return }
    DispatchQueue.main.async { UIApplication.shared.endBackgroundTask(current) }
  }
}
