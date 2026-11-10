// SPIKE. Compiled into both the app and the LiveActivity extension (`_shared`).
// The struct name is the wire `attributes-type` of the push-to-start payload, and
// the coding keys are the JSON keys of `attributes` / `content-state`.
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

/// The shared debug log (UserDefaults of the app process). Read by the hidden
/// debug screen through `NotificationActionsModule.getLiveActivityLog`.
enum PPLELiveActivityLog {
  static let key = "pple.la.log"

  static func append(_ line: String) {
    let stamp = ISO8601DateFormatter().string(from: Date())
    let defaults = UserDefaults.standard
    var lines = defaults.stringArray(forKey: key) ?? []
    lines.append("\(stamp) \(line)")
    if lines.count > 300 { lines.removeFirst(lines.count - 300) }
    defaults.set(lines, forKey: key)
  }
}

extension Data {
  var ppleHex: String { map { String(format: "%02x", $0) }.joined() }
}
