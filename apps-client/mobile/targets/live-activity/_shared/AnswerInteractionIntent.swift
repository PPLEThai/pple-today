// Compiled into both the app and the LiveActivity extension (`_shared`): the
// extension needs the type for `Button(intent:)`, and iOS runs `perform()` in the
// app's process (LiveActivityIntent), launching it in the background if needed.
import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct AnswerInteractionIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "ตอบคำถาม"
  static var openAppWhenRun: Bool = false
  // On the Lock Screen iOS asks for Face ID / passcode before perform(), like a
  // tray action does (verified on device, S4).
  static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

  @Parameter(title: "Notification") var notificationId: String
  @Parameter(title: "Action") var actionId: String

  init() {}

  init(notificationId: String, actionId: String) {
    self.notificationId = notificationId
    self.actionId = actionId
  }

  func perform() async throws -> some IntentResult {
    guard
      let activity = Activity<PPLEInteractionAttributes>.activities.first(where: {
        $0.attributes.notificationId == notificationId
      })
    else { return .result() }

    let result = await PPLEBackend.post(
      notificationId: notificationId,
      suffix: "/response",
      token: activity.attributes.responseToken,
      json: ["actionId": actionId]
    )

    let label = activity.attributes.actions.first(where: { $0.id == actionId })?.label
    let final: PPLEInteractionAttributes.ContentState
    switch result.status {
    case 200: final = .init(status: "answered", label: label)
    case 409: final = .init(status: "answered", label: nil)
    case 410: final = .init(status: "closed", label: nil)
    default:
      // Leave it open so the user can try again.
      await activity.update(ActivityContent(state: .init(status: "failed", label: nil), staleDate: nil))
      return .result()
    }
    await PPLELiveActivityFinish.end(activity, state: final)
    return .result()
  }
}
