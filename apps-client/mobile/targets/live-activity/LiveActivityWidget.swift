// The interactive-notification Live Activity: Lock Screen and Dynamic
// Island. Buttons with `bg` answer in the background through
// `AnswerInteractionIntent`; the rest open the detail screen.
import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct PPLELiveActivityBundle: WidgetBundle {
  var body: some Widget {
    PPLEInteractionLiveActivity()
  }
}

/// PPLE Today's brand orange (#FF6A13).
private let brandOrange = Color(red: 1.0, green: 106.0 / 255.0, blue: 19.0 / 255.0)

private func detailURL(_ notificationId: String) -> URL? {
  URL(string: "pple-today://notification/\(notificationId)")
}

private func sfSymbol(_ icon: String?) -> String? {
  switch icon {
  // Mirrors PPLESymbolMap in assets/NotificationService.m and the icon allowlist
  // in @pple-today/api-common. Keep the three in step.
  case "check": return "checkmark"
  case "x": return "xmark"
  case "thumbs-up": return "hand.thumbsup"
  case "thumbs-down": return "hand.thumbsdown"
  case "calendar-check": return "calendar.badge.checkmark"
  case "calendar-x": return "calendar.badge.minus"
  case "clock": return "clock"
  case "send": return "paperplane"
  case "heart": return "heart"
  case "star": return "star"
  case "flag": return "flag"
  case "user-check": return "person.badge.checkmark"
  case "user-x": return "person.badge.minus"
  case "help": return "questionmark.circle"
  default: return nil
  }
}

private func statusText(_ state: PPLEInteractionAttributes.ContentState) -> String? {
  switch state.status {
  case "answered": return state.label.map { "ตอบแล้ว: \($0)" } ?? "ตอบแล้ว"
  case "closed": return "ปิดรับคำตอบแล้ว"
  case "expired": return "หมดเวลาตอบกลับ"
  case "failed": return "ส่งคำตอบไม่สำเร็จ ลองอีกครั้ง"
  default: return nil
  }
}

struct ActionButtons: View {
  let attributes: PPLEInteractionAttributes

  var body: some View {
    HStack(spacing: 8) {
      ForEach(attributes.actions, id: \.id) { action in
        let tint: Color = action.destructive == true ? Color.red : brandOrange
        if action.bg {
          Button(intent: AnswerInteractionIntent(notificationId: attributes.notificationId, actionId: action.id)) {
            label(action)
          }
          .buttonStyle(.borderedProminent)
          .tint(tint)
        } else if let url = URL(string: "pple-today://notification/\(attributes.notificationId)?action=\(action.id)") {
          Link(destination: url) {
            label(action)
              .padding(.vertical, 6)
              .frame(maxWidth: .infinity)
              .background(tint.opacity(0.2), in: Capsule())
          }
        }
      }
    }
  }

  @ViewBuilder
  private func label(_ action: PPLEInteractionAttributes.Action) -> some View {
    if let symbol = sfSymbol(action.icon) {
      Label(action.label, systemImage: symbol).font(.subheadline.bold()).frame(maxWidth: .infinity)
    } else {
      Text(action.label).font(.subheadline.bold()).frame(maxWidth: .infinity)
    }
  }
}

/// The party mark, bundled in the extension's asset catalog (`partyLogo`).
struct PartyLogo: View {
  var size: CGFloat = 18

  var body: some View {
    Image("partyLogo")
      .resizable()
      .scaledToFit()
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

struct LockScreenView: View {
  let context: ActivityViewContext<PPLEInteractionAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        PartyLogo()
        Text(context.attributes.appName).font(.caption).foregroundStyle(.secondary)
      }
      Text(context.attributes.header).font(.headline).lineLimit(1)
      Text(context.attributes.message).font(.subheadline).lineLimit(2)
      if let status = statusText(context.state), context.state.status != "failed" {
        Text(status).font(.subheadline.bold()).foregroundStyle(.secondary)
      } else {
        if let status = statusText(context.state) {
          Text(status).font(.caption).foregroundStyle(.red)
        }
        ActionButtons(attributes: context.attributes)
      }
    }
    .padding(14)
  }
}

struct PPLEInteractionLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PPLEInteractionAttributes.self) { context in
      LockScreenView(context: context)
        .widgetURL(detailURL(context.attributes.notificationId))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PartyLogo(size: 28)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.header).font(.headline).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            Text(context.attributes.message).font(.subheadline).lineLimit(2)
            if let status = statusText(context.state), context.state.status != "failed" {
              Text(status).font(.subheadline.bold())
            } else {
              ActionButtons(attributes: context.attributes)
            }
          }
        }
      } compactLeading: {
        PartyLogo()
      } compactTrailing: {
        Text((context.state.status == "open" || context.state.status == "failed") ? "ตอบ" : "✓").font(.caption.bold())
      } minimal: {
        PartyLogo()
      }
      .widgetURL(detailURL(context.attributes.notificationId))
    }
  }
}
