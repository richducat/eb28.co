import Foundation

enum AllotmentUnit: String, CaseIterable, Codable, Hashable, Sendable {
    case milligrams
    case grams
    case ounces

    var abbreviation: String {
        switch self {
        case .milligrams: "mg"
        case .grams: "g"
        case .ounces: "oz"
        }
    }
}

enum AllotmentMeasurementKind: String, Codable, Hashable, Sendable {
    case smokingEligibleNow
    case routeEligibleNow
    case doctorOrderRemaining
    case remainingAllotment

    var displayTitle: String {
        switch self {
        case .smokingEligibleNow: "Smoking eligible now"
        case .routeEligibleNow: "Route eligible now"
        case .doctorOrderRemaining: "Doctor order remaining"
        case .remainingAllotment: "Remaining allotment"
        }
    }
}

struct AllotmentMeasurement: Identifiable, Codable, Equatable, Hashable, Sendable {
    let kind: AllotmentMeasurementKind
    let amount: Double
    let unit: AllotmentUnit
    let route: String?
    let sourceLabel: String
    let parserVersion: String

    var id: String {
        [kind.rawValue, route ?? "none", sourceLabel, parserVersion]
            .joined(separator: "|")
    }

    init?(
        kind: AllotmentMeasurementKind,
        amount: Double,
        unit: AllotmentUnit,
        route: String?,
        sourceLabel: String,
        parserVersion: String
    ) {
        guard amount.isFinite, amount >= 0 else { return nil }

        self.kind = kind
        self.amount = amount
        self.unit = unit
        self.route = route
        self.sourceLabel = sourceLabel
        self.parserVersion = parserVersion
    }
}

struct AllotmentSnapshot: Codable, Equatable, Sendable {
    static let freshnessLifetime: TimeInterval = 24 * 60 * 60

    let stateID: String
    let capturedAt: Date
    let parserVersion: String
    let measurements: [AllotmentMeasurement]
    var invalidatedAt: Date?
    var userConfirmedAt: Date?

    init(
        stateID: String,
        capturedAt: Date,
        parserVersion: String,
        measurements: [AllotmentMeasurement],
        invalidatedAt: Date? = nil,
        userConfirmedAt: Date? = nil
    ) {
        self.stateID = stateID
        self.capturedAt = capturedAt
        self.parserVersion = parserVersion
        self.measurements = measurements
        self.invalidatedAt = invalidatedAt
        self.userConfirmedAt = userConfirmedAt
    }

    func isStale(at date: Date = .now) -> Bool {
        guard invalidatedAt == nil, capturedAt <= date else { return true }
        return date.timeIntervalSince(capturedAt) >= Self.freshnessLifetime
    }

    mutating func invalidate(at date: Date = .now) {
        invalidatedAt = date
    }
}

struct ParsedAllotmentCandidate: Codable, Equatable, Hashable, Sendable {
    let stateID: String
    let kind: AllotmentMeasurementKind
    let amount: Double
    let unit: AllotmentUnit
    let route: String?
    let sourceLabel: String
    let parserVersion: String

    var measurement: AllotmentMeasurement? {
        AllotmentMeasurement(
            kind: kind,
            amount: amount,
            unit: unit,
            route: route,
            sourceLabel: sourceLabel,
            parserVersion: parserVersion
        )
    }
}
