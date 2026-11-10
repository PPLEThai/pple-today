// Compiled into both the app and the LiveActivity extension (`_shared`).
// The struct name is the wire `attributes-type` of the push-to-start payload, and
// the coding keys are the JSON keys of `attributes` / `content-state`. Keep both
// in step with the server (`buildLiveActivityStart` in apps-api).
import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct PPLEInteractionAttributes: ActivityAttributes {
  public struct Action: Codable, Hashable {
    public var id: String
    public var label: String
    public var icon: String?
    public var destructive: Bool?
    public var bg: Bool
  }

  public struct ContentState: Codable, Hashable {
    /// open | answered | closed | expired | failed
    public var status: String
    /// The answered action's label, for "ตอบแล้ว: <label>".
    public var label: String?
  }

  public var notificationId: String
  public var appName: String
  public var header: String
  public var message: String
  public var actions: [Action]
  public var responseToken: String
}

extension Data {
  var ppleHex: String { map { String(format: "%02x", $0) }.joined() }
}
