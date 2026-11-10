import EXNotifications
import Foundation
import UIKit
import UserNotifications

/// Submits an interactive notification's answer when the user presses a tray
/// action that does not open the app, entirely natively.
///
/// A tap on such an action launches the app in the background (if it is not
/// running) and hands it the response. JS cannot be relied on there:
/// `expo-notifications` forwards the response to JS only once the bundle has
/// loaded, which on a cold background launch is too late. So the POST happens
/// here, with `URLSession`, needing no keychain, session or JS.
///
/// The `pple.ix.*` category, the action ids and the `pple_interaction` payload are
/// the other half of a contract with `assets/NotificationService.m` (which builds
/// the category) and `utils/tray-interaction.ts` (the Android and in-app side).
///
/// `NotificationCenterManager` calls the system completion handler itself once
/// its delegates return, so this delegate never calls it; `beginBackgroundTask`
/// keeps the process alive for the POST instead.
final class TrayActionDelegate: NotificationDelegate {
  private static let categoryPrefix = "pple.ix."
  /// Category of the local notification that reports a failed answer. Matched by
  /// `app/_layout.tsx`, which routes its tap to the detail screen.
  private static let resultCategory = "pple.result"
  private static let requestTimeout: TimeInterval = 15

  func didReceive(_ response: UNNotificationResponse, completionHandler: @escaping () -> Void) -> Bool {
    let content = response.notification.request.content
    guard content.categoryIdentifier.hasPrefix(Self.categoryPrefix),
      response.actionIdentifier != UNNotificationDefaultActionIdentifier,
      response.actionIdentifier != UNNotificationDismissActionIdentifier,
      let submission = Submission(response: response)
    else {
      // Not ours, or an action that opens the app: leave it to JS.
      return false
    }

    let userInfo = content.userInfo
    let backgroundTask = BackgroundTask(name: "pple-tray-answer")
    submit(submission) { status in
      guard status != 200 else {
        // iOS has already removed the notification when the user tapped.
        backgroundTask.end()
        return
      }
      Self.postFailureNotification(for: content, userInfo: userInfo, status: status) {
        backgroundTask.end()
      }
    }
    return true
  }

  // MARK: - Request

  /// What to send, read from the response. `nil` unless this is a background
  /// action on a payload we can read.
  private struct Submission {
    let notificationId: String
    let token: String
    let body: [String: Any]

    init?(response: UNNotificationResponse) {
      let userInfo = response.notification.request.content.userInfo
      guard let notificationId = userInfo["notificationId"] as? String, !notificationId.isEmpty,
        let token = userInfo["pple_response_token"] as? String, !token.isEmpty,
        let raw = userInfo["pple_interaction"] as? String,
        let data = raw.data(using: .utf8),
        let interaction = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let interactionId = interaction["id"] as? String,
        response.notification.request.content.categoryIdentifier == "pple.ix." + interactionId
      else {
        return nil
      }

      switch interaction["kind"] as? String {
      case "reply":
        // One action with a text input; it is always a background action.
        guard let actionId = interaction["actionId"] as? String,
          let fieldId = interaction["fieldId"] as? String,
          response.actionIdentifier == actionId,
          let textResponse = response as? UNTextInputNotificationResponse
        else { return nil }
        self.body = ["actionId": actionId, "values": [fieldId: textResponse.userText]]

      case "buttons":
        guard let actions = interaction["actions"] as? [[String: Any]],
          let action = actions.first(where: { ($0["id"] as? String) == response.actionIdentifier }),
          // `bg: false` is `.foreground`: the app opens and JS submits from the form.
          (action["bg"] as? Bool) == true
        else { return nil }
        self.body = ["actionId": response.actionIdentifier]

      default:
        return nil
      }
      self.notificationId = notificationId
      self.token = token
    }
  }

  /// POSTs the answer. Calls `completion` once with the HTTP status, or `nil` for
  /// anything that is not a response (no base URL, a network error, a timeout).
  /// Never retried: the failure notification tells the user to answer in the app.
  private func submit(_ submission: Submission, completion: @escaping (Int?) -> Void) {
    guard let base = Bundle.main.object(forInfoDictionaryKey: "PPLEBackendBaseURL") as? String,
      var components = URLComponents(string: base),
      let encodedId = submission.notificationId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
      let bodyData = try? JSONSerialization.data(withJSONObject: submission.body)
    else {
      completion(nil)
      return
    }
    var path = components.path
    while path.hasSuffix("/") { path.removeLast() }
    components.path = path + "/notifications/" + encodedId + "/response"
    guard let url = components.url else {
      completion(nil)
      return
    }

    var request = URLRequest(url: url, timeoutInterval: Self.requestTimeout)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(submission.token, forHTTPHeaderField: "X-Notification-Response-Token")
    request.httpBody = bodyData

    let session = URLSession(configuration: .ephemeral)
    session.dataTask(with: request) { _, response, _ in
      completion((response as? HTTPURLResponse)?.statusCode)
      session.finishTasksAndInvalidate()
    }.resume()
  }

  // MARK: - Feedback

  private static func message(for status: Int?) -> String {
    switch status {
    case 409: return "คุณตอบกลับแล้ว"
    case 410: return "ปิดรับคำตอบแล้ว"
    default: return "ส่งคำตอบไม่สำเร็จ แตะเพื่อตอบในแอป"
    }
  }

  /// A local notification with no actions that opens the detail screen when
  /// tapped. It carries the original's routing keys (`link`, `notificationId`),
  /// which is the data shape the app's tap handler already reads.
  private static func postFailureNotification(
    for original: UNNotificationContent,
    userInfo: [AnyHashable: Any],
    status: Int?,
    completion: @escaping () -> Void
  ) {
    let content = UNMutableNotificationContent()
    content.title = original.title
    content.subtitle = original.subtitle
    content.body = message(for: status)
    content.categoryIdentifier = resultCategory
    var routing: [String: Any] = [:]
    for key in ["link", "notificationId", "appName", "appIconUrl"] {
      if let value = userInfo[key] as? String, !value.isEmpty { routing[key] = value }
    }
    content.userInfo = routing

    let identifier = "pple.result." + ((routing["notificationId"] as? String) ?? UUID().uuidString)
    UNUserNotificationCenter.current().add(
      UNNotificationRequest(identifier: identifier, content: content, trigger: nil)
    ) { _ in completion() }
  }
}

/// Keeps the process running after `NotificationCenterManager` has returned: it
/// calls iOS's completion handler as soon as its delegates do, after which iOS
/// may suspend the app. `beginBackgroundTask` buys about 30 s, comfortably more
/// than the 15 s request timeout.
private final class BackgroundTask {
  private var identifier: UIBackgroundTaskIdentifier = .invalid
  private let lock = NSLock()

  init(name: String) {
    let begin = {
      self.identifier = UIApplication.shared.beginBackgroundTask(withName: name) { [weak self] in
        // Out of time: let go, the answer is lost and the user can answer in the app.
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
