// Compiled into both the app and the LiveActivity extension (`_shared`). The
// network calls and the "end the activity" rules shared by the answer intent and
// the app's token observer. The pod in `modules/notification-actions` cannot see
// main-target code, so `TrayActionDelegate` keeps its own copy of the URL logic.
import ActivityKit
import Foundation

enum PPLEBackend {
  static let requestTimeout: TimeInterval = 15

  /// `{PPLEBackendBaseURL}/notifications/{id}{suffix}`, tolerating a trailing
  /// slash on the base URL. `nil` when the base URL is not configured.
  static func notificationURL(_ notificationId: String, suffix: String) -> URL? {
    guard let base = Bundle.main.object(forInfoDictionaryKey: "PPLEBackendBaseURL") as? String,
      var components = URLComponents(string: base),
      let encodedId = notificationId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)
    else { return nil }
    var path = components.path
    while path.hasSuffix("/") { path.removeLast() }
    components.path = path + "/notifications/" + encodedId + suffix
    return components.url
  }

  /// POSTs JSON with the response token as the credential. `status` is `nil` for
  /// anything that is not an HTTP response (no base URL, network error, timeout).
  static func post(
    notificationId: String,
    suffix: String,
    token: String,
    json: [String: Any]
  ) async -> (status: Int?, data: Data?) {
    guard let url = notificationURL(notificationId, suffix: suffix),
      let body = try? JSONSerialization.data(withJSONObject: json)
    else { return (nil, nil) }
    var request = URLRequest(url: url, timeoutInterval: requestTimeout)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(token, forHTTPHeaderField: "X-Notification-Response-Token")
    request.httpBody = body
    let session = URLSession(configuration: .ephemeral)
    defer { session.finishTasksAndInvalidate() }
    do {
      let (data, response) = try await session.data(for: request)
      return ((response as? HTTPURLResponse)?.statusCode, data)
    } catch {
      return (nil, nil)
    }
  }
}

@available(iOS 16.2, *)
enum PPLELiveActivityFinish {
  typealias State = PPLEInteractionAttributes.ContentState
  /// How long the final status stays on the Lock Screen.
  static let lingerSeconds: TimeInterval = 15 * 60

  /// Ends with a final status line that stays for `lingerSeconds`.
  static func end(_ activity: Activity<PPLEInteractionAttributes>, state: State) async {
    await activity.end(
      ActivityContent(state: state, staleDate: nil),
      dismissalPolicy: .after(Date().addingTimeInterval(lingerSeconds))
    )
  }

  static func endImmediately(_ activity: Activity<PPLEInteractionAttributes>) async {
    await activity.end(nil, dismissalPolicy: .immediate)
  }

  /// The final state for the `state` of a `POST /notifications/:id/live-activity`
  /// response (`OPEN` is not final: `nil`).
  static func finalState(uploadState: String?, actionLabel: String?) -> State? {
    switch uploadState {
    case "RESPONDED": return State(status: "answered", label: actionLabel)
    case "CLOSED": return State(status: "closed", label: nil)
    case "EXPIRED": return State(status: "expired", label: nil)
    default: return nil
    }
  }
}
