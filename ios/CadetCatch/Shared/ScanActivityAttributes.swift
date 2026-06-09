import ActivityKit

struct ScanActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var progressString: String
        var isScanning: Bool
    }

    var cadetName: String
}
