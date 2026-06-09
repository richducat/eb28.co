import ActivityKit
import SwiftUI
import WidgetKit

struct CadetCatchActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ScanActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 6) {
                Text(context.attributes.cadetName)
                    .font(.headline)
                Text(context.state.progressString)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
            .padding()
            .activityBackgroundTint(Color(.systemBackground))
            .activitySystemActionForegroundColor(.orange)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.cadetName)
                        .font(.caption)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.isScanning ? "Scanning" : "Done")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.progressString)
                        .font(.caption2)
                        .lineLimit(2)
                }
            } compactLeading: {
                Image(systemName: "photo.on.rectangle")
            } compactTrailing: {
                Image(systemName: context.state.isScanning ? "magnifyingglass" : "checkmark")
            } minimal: {
                Image(systemName: "photo")
            }
        }
    }
}

@main
struct CadetCatchWidgetBundle: WidgetBundle {
    var body: some Widget {
        CadetCatchActivityWidget()
    }
}
