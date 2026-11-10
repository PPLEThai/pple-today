// SPIKE. Compiled into both the app and the LiveActivity extension (`_shared`):
// the extension needs the type for `Button(intent:)`, and iOS runs `perform()`
// in the app's process (LiveActivityIntent), launching it in the background if
// needed.
import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct AnswerInteractionIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "ตอบคำถาม"
  static var openAppWhenRun: Bool = false
  // S4: does iOS ask for Face ID / passcode before perform() on the Lock Screen?
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  @Parameter(title: "Notification") var notificationId: String
  @Parameter(title: "Action") var actionId: String

  init() {}

  init(notificationId: String, actionId: String) {
    self.notificationId = notificationId
    self.actionId = actionId
  }

  func perform() async throws -> some IntentResult {
    // `isProtectedDataAvailable` is false while the device is locked. If it is
    // false here, perform() ran without an unlock (S4 fails).
    let unlocked = Self.protectedDataAvailable()
    PPLELiveActivityLog.append("intent.perform n=\(notificationId) a=\(actionId) protectedData=\(unlocked)")

    guard
      let activity = Activity<PPLEInteractionAttributes>.activities.first(where: {
        $0.attributes.notificationId == notificationId
      })
    else {
      PPLELiveActivityLog.append("intent.no-activity n=\(notificationId)")
      return .result()
    }

    let status = await Self.submit(
      notificationId: notificationId,
      actionId: actionId,
      token: activity.attributes.responseToken
    )
    PPLELiveActivityLog.append("intent.submit n=\(notificationId) status=\(status.map(String.init) ?? "nil")")

    let label = activity.attributes.actions.first(where: { $0.id == actionId })?.label
    let final: PPLEInteractionAttributes.ContentState
    switch status {
    case 200: final = .init(status: "answered", label: label)
    case 409: final = .init(status: "answered", label: nil)
    case 410: final = .init(status: "closed", label: nil)
    default:
      // Leave it open so the user can try again.
      await activity.update(ActivityContent(state: .init(status: "failed", label: nil), staleDate: nil))
      return .result()
    }
    await activity.end(
      ActivityContent(state: final, staleDate: nil),
      dismissalPolicy: .after(Date().addingTimeInterval(15 * 60))
    )
    return .result()
  }

  /// Calls the app-only observer at runtime: `UIApplication` is unavailable in
  /// the extension, where this file is also compiled.
  private static func protectedDataAvailable() -> String {
    guard let cls: AnyObject = NSClassFromString("PPLELiveActivityObserver") else { return "unknown" }
    let selector = NSSelectorFromString("protectedDataAvailable")
    guard cls.responds(to: selector), let value = cls.perform(selector)?.takeUnretainedValue() as? NSNumber
    else { return "unknown" }
    return value.boolValue ? "true" : "false"
  }

  private static func submit(notificationId: String, actionId: String, token: String) async -> Int? {
    guard let base = Bundle.main.object(forInfoDictionaryKey: "PPLEBackendBaseURL") as? String,
      var components = URLComponents(string: base),
      let encodedId = notificationId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
      let body = try? JSONSerialization.data(withJSONObject: ["actionId": actionId])
    else { return nil }
    var path = components.path
    while path.hasSuffix("/") { path.removeLast() }
    components.path = path + "/notifications/" + encodedId + "/response"
    guard let url = components.url else { return nil }

    var request = URLRequest(url: url, timeoutInterval: 15)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(token, forHTTPHeaderField: "X-Notification-Response-Token")
    request.httpBody = body
    do {
      let (_, response) = try await URLSession(configuration: .ephemeral).data(for: request)
      return (response as? HTTPURLResponse)?.statusCode
    } catch {
      PPLELiveActivityLog.append("intent.error \(error.localizedDescription)")
      return nil
    }
  }
}
