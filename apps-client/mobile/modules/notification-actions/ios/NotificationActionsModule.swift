import ExpoModulesCore

/// SPIKE (Live Activity): exposes the native Live Activity log and tokens to the
/// hidden debug screen (`app/debug/live-activity.tsx`).
public class NotificationActionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NotificationActions")

    Function("getLiveActivityLog") { () -> [String: Any] in
      _ = Self.callObserver("currentStartToken")
      let defaults = UserDefaults.standard
      return [
        "startToken": defaults.string(forKey: "pple.la.startToken") ?? "",
        "log": defaults.stringArray(forKey: "pple.la.log") ?? [],
      ]
    }

    Function("startLocalTestActivity") { () -> String in
      Self.callObserver("startLocalTest") ?? "observer unavailable"
    }

    Function("clearLiveActivityLog") {
      UserDefaults.standard.removeObject(forKey: "pple.la.log")
    }
  }

  /// The observer is a main-target type this pod cannot see; call it by name.
  private static func callObserver(_ name: String) -> String? {
    guard let observer: AnyObject = NSClassFromString("PPLELiveActivityObserver") else { return nil }
    let selector = NSSelectorFromString(name)
    guard observer.responds(to: selector) else { return nil }
    return observer.perform(selector)?.takeUnretainedValue() as? String
  }
}
