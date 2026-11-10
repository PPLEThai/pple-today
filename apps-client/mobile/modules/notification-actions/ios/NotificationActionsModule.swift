import ExpoModulesCore

/// The Live Activity half of `modules/notification-actions` (the tray half is
/// `TrayActionDelegate`). Wrapped by `libs/live-activity.ts`.
///
/// The observer is a main-target type (`targets/live-activity/_shared`) that this
/// pod cannot see at compile time, so it is called by name.
public class NotificationActionsModule: Module {
  /// Posted by `PPLELiveActivityObserver` when the start token or enablement changes.
  private static let registrationChanged = Notification.Name("PPLELiveActivityRegistrationDidChange")
  private var observation: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("NotificationActions")

    Events("onLiveActivityRegistrationChange")

    OnStartObserving {
      self.observation = NotificationCenter.default.addObserver(
        forName: Self.registrationChanged, object: nil, queue: .main
      ) { [weak self] _ in
        guard let self = self, let registration = Self.registration() else { return }
        self.sendEvent("onLiveActivityRegistrationChange", registration)
      }
    }

    OnStopObserving {
      if let observation = self.observation {
        NotificationCenter.default.removeObserver(observation)
        self.observation = nil
      }
    }

    /// `{ startToken: string | null, enabled: boolean }`, or `null` before iOS 17.2.
    Function("getLiveActivityRegistration") { () -> [String: Any]? in
      Self.registration()
    }

    /// Ends every interactive Live Activity immediately (logout).
    Function("endAllLiveActivities") {
      _ = Self.callObserver("endAllActivities")
    }
  }

  private static func registration() -> [String: Any]? {
    callObserver("registration") as? [String: Any]
  }

  private static func callObserver(_ name: String) -> Any? {
    guard let observer: AnyObject = NSClassFromString("PPLELiveActivityObserver") else { return nil }
    let selector = NSSelectorFromString(name)
    guard observer.responds(to: selector) else { return nil }
    return observer.perform(selector)?.takeUnretainedValue()
  }
}
