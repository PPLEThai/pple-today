import ExpoModulesCore

/// SPIKE (Live Activity): exposes the native Live Activity log and tokens to the
/// hidden debug screen (`app/debug/live-activity.tsx`).
public class NotificationActionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NotificationActions")

    Function("getLiveActivityLog") { () -> [String: Any] in
      let defaults = UserDefaults.standard
      return [
        "startToken": defaults.string(forKey: "pple.la.startToken") ?? "",
        "log": defaults.stringArray(forKey: "pple.la.log") ?? [],
      ]
    }

    Function("clearLiveActivityLog") {
      UserDefaults.standard.removeObject(forKey: "pple.la.log")
    }
  }
}
