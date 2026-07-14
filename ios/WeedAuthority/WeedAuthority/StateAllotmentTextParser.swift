import Foundation

enum StateAllotmentTextParser {
    static let floridaParserVersion = "fl.mmur.ocr-text.v1"
    static let arizonaParserVersion = "az.my-id-cards.ocr-text.v1"

    static let floridaSmokingLabel = "Smoking Amount Eligible to be Dispensed"
    static let floridaMedicalLabel = "Medical Marijuana Amount Eligible to be Dispensed"
    static let floridaOrderRemainingLabel = "Amount Remaining"
    static let arizonaRemainingLabel = "Remaining Allotment"

    static func candidates(stateID: String, text: String) -> [ParsedAllotmentCandidate] {
        switch stateID.uppercased() {
        case "FL":
            parseFlorida(text) ?? []
        case "AZ":
            parseArizona(text) ?? []
        default:
            []
        }
    }

    static func snapshot(
        stateID: String,
        text: String,
        capturedAt: Date = .now
    ) -> AllotmentSnapshot? {
        let normalizedStateID = stateID.uppercased()
        let parsed = candidates(stateID: normalizedStateID, text: text)
        guard
            !parsed.isEmpty,
            let parserVersion = parsed.first?.parserVersion,
            parsed.allSatisfy({ $0.stateID == normalizedStateID && $0.parserVersion == parserVersion })
        else {
            return nil
        }

        let measurements = parsed.compactMap(\.measurement)
        guard measurements.count == parsed.count else { return nil }

        return AllotmentSnapshot(
            stateID: normalizedStateID,
            capturedAt: capturedAt,
            parserVersion: parserVersion,
            measurements: measurements,
            invalidatedAt: nil,
            userConfirmedAt: nil
        )
    }
}

private extension StateAllotmentTextParser {
    struct LocatedMeasurement {
        let labelIndex: Int
        let amount: Double
        let unit: AllotmentUnit
    }

    struct Extraction {
        let sawLabel: Bool
        let isInvalid: Bool
        let measurements: [LocatedMeasurement]
    }

    struct CandidateIdentity: Hashable {
        let stateID: String
        let kind: AllotmentMeasurementKind
        let route: String?
    }

    static let floridaRoutes: [(canonical: String, exactHeadings: [String])] = [
        (
            "Smoking Marijuana",
            [
                "Smoking Marijuana",
                "Marijuana in a form for Smoking",
                "Route: Smoking Marijuana",
                "Route of Administration: Smoking Marijuana"
            ]
        ),
        ("Inhalation", ["Inhalation", "Medical Marijuana - Inhalation", "Route: Inhalation", "Route of Administration: Inhalation"]),
        ("Oral", ["Oral", "Medical Marijuana - Oral", "Route: Oral", "Route of Administration: Oral"]),
        ("Edibles", ["Edibles", "Medical Marijuana - Edibles", "Route: Edibles", "Route of Administration: Edibles"]),
        ("Sublingual", ["Sublingual", "Medical Marijuana - Sublingual", "Route: Sublingual", "Route of Administration: Sublingual"]),
        ("Topical", ["Topical", "Medical Marijuana - Topical", "Route: Topical", "Route of Administration: Topical"]),
        ("Suppository", ["Suppository", "Medical Marijuana - Suppository", "Route: Suppository", "Route of Administration: Suppository"])
    ]

    static func parseFlorida(_ text: String) -> [ParsedAllotmentCandidate]? {
        let lines = normalizedLines(text)
        guard !lines.isEmpty else { return nil }

        let smoking = extract(
            label: floridaSmokingLabel,
            allowedUnits: [.grams, .ounces],
            from: lines
        )
        let medical = extract(
            label: floridaMedicalLabel,
            allowedUnits: [.milligrams],
            from: lines
        )
        let orderRemaining = extract(
            label: floridaOrderRemainingLabel,
            allowedUnits: [.milligrams, .grams, .ounces],
            from: lines
        )

        guard smoking.sawLabel || medical.sawLabel || orderRemaining.sawLabel else { return nil }
        guard !smoking.isInvalid, !medical.isInvalid, !orderRemaining.isInvalid else { return nil }

        var parsed: [ParsedAllotmentCandidate] = smoking.measurements.map {
            ParsedAllotmentCandidate(
                stateID: "FL",
                kind: .smokingEligibleNow,
                amount: $0.amount,
                unit: $0.unit,
                route: "Smoking Marijuana",
                sourceLabel: floridaSmokingLabel,
                parserVersion: floridaParserVersion
            )
        }

        for value in medical.measurements {
            guard
                let route = floridaRoute(before: value.labelIndex, in: lines),
                route != "Smoking Marijuana"
            else {
                return nil
            }

            parsed.append(
                ParsedAllotmentCandidate(
                    stateID: "FL",
                    kind: .routeEligibleNow,
                    amount: value.amount,
                    unit: value.unit,
                    route: route,
                    sourceLabel: floridaMedicalLabel,
                    parserVersion: floridaParserVersion
                )
            )
        }

        for value in orderRemaining.measurements {
            guard
                let route = floridaRoute(before: value.labelIndex, in: lines),
                hasExactLabel("Amount Ordered", near: value.labelIndex, in: lines),
                hasExactLabel("Mg Per Day", near: value.labelIndex, in: lines),
                unit(value.unit, isValidForFloridaRoute: route)
            else {
                return nil
            }

            parsed.append(
                ParsedAllotmentCandidate(
                    stateID: "FL",
                    kind: .doctorOrderRemaining,
                    amount: value.amount,
                    unit: value.unit,
                    route: route,
                    sourceLabel: floridaOrderRemainingLabel,
                    parserVersion: floridaParserVersion
                )
            )
        }

        return deduplicated(parsed)
    }

    static func parseArizona(_ text: String) -> [ParsedAllotmentCandidate]? {
        let lines = normalizedLines(text)
        guard !lines.isEmpty else { return nil }

        let remaining = extract(
            label: arizonaRemainingLabel,
            allowedUnits: [.grams, .ounces],
            from: lines
        )
        guard remaining.sawLabel, !remaining.isInvalid else { return nil }

        var parsed: [ParsedAllotmentCandidate] = []
        for value in remaining.measurements {
            guard hasExactLabel("My ID Cards", before: value.labelIndex, within: 20, in: lines) else {
                return nil
            }

            parsed.append(
                ParsedAllotmentCandidate(
                    stateID: "AZ",
                    kind: .remainingAllotment,
                    amount: value.amount,
                    unit: value.unit,
                    route: nil,
                    sourceLabel: arizonaRemainingLabel,
                    parserVersion: arizonaParserVersion
                )
            )
        }

        return deduplicated(parsed)
    }

    static func extract(
        label: String,
        allowedUnits: Set<AllotmentUnit>,
        from lines: [String]
    ) -> Extraction {
        var sawLabel = false
        var isInvalid = false
        var measurements: [LocatedMeasurement] = []

        for (index, line) in lines.enumerated() {
            if equals(line, label) || equals(line, "\(label):") {
                sawLabel = true
                guard
                    lines.indices.contains(index + 1),
                    let value = strictMeasurement(lines[index + 1]),
                    allowedUnits.contains(value.unit)
                else {
                    isInvalid = true
                    continue
                }
                measurements.append(LocatedMeasurement(labelIndex: index, amount: value.amount, unit: value.unit))
                continue
            }

            guard let suffix = exactColonSuffix(of: line, after: label) else { continue }
            sawLabel = true
            guard let value = strictMeasurement(suffix), allowedUnits.contains(value.unit) else {
                isInvalid = true
                continue
            }
            measurements.append(LocatedMeasurement(labelIndex: index, amount: value.amount, unit: value.unit))
        }

        return Extraction(sawLabel: sawLabel, isInvalid: isInvalid, measurements: measurements)
    }

    static func strictMeasurement(_ text: String) -> (amount: Double, unit: AllotmentUnit)? {
        let normalized = normalizeWhitespace(text)
        guard let unitStart = normalized.firstIndex(where: \.isLetter) else { return nil }

        let numberText = String(normalized[..<unitStart]).trimmingCharacters(in: .whitespaces)
        let unitText = String(normalized[unitStart...]).trimmingCharacters(in: .whitespaces)
        guard
            let amount = strictNonnegativeNumber(numberText),
            let unit = exactUnit(unitText)
        else {
            return nil
        }
        return (amount, unit)
    }

    static func strictNonnegativeNumber(_ text: String) -> Double? {
        let decimalParts = text.split(separator: ".", omittingEmptySubsequences: false)
        guard decimalParts.count == 1 || decimalParts.count == 2 else { return nil }

        let integerPart = String(decimalParts[0])
        guard !integerPart.isEmpty else { return nil }

        let groups = integerPart.split(separator: ",", omittingEmptySubsequences: false)
        guard !groups.isEmpty else { return nil }
        if groups.count == 1 {
            guard isASCIIDigits(groups[0]) else { return nil }
        } else {
            guard (1...3).contains(groups[0].utf8.count), isASCIIDigits(groups[0]) else { return nil }
            guard groups.dropFirst().allSatisfy({ $0.utf8.count == 3 && isASCIIDigits($0) }) else { return nil }
        }

        if decimalParts.count == 2 {
            guard !decimalParts[1].isEmpty, isASCIIDigits(decimalParts[1]) else { return nil }
        }

        let machineNumber = text.replacingOccurrences(of: ",", with: "")
        guard let value = Double(machineNumber), value.isFinite, value >= 0 else { return nil }
        return value
    }

    static func exactUnit(_ text: String) -> AllotmentUnit? {
        switch text.lowercased() {
        case "mg", "milligram", "milligrams": .milligrams
        case "g", "gram", "grams": .grams
        case "oz", "ounce", "ounces": .ounces
        default: nil
        }
    }

    static func floridaRoute(before index: Int, in lines: [String]) -> String? {
        let lowerBound = max(0, index - 12)
        guard lowerBound < index else { return nil }

        for cursor in stride(from: index - 1, through: lowerBound, by: -1) {
            for route in floridaRoutes where route.exactHeadings.contains(where: { equals(lines[cursor], $0) }) {
                return route.canonical
            }
        }
        return nil
    }

    static func unit(_ unit: AllotmentUnit, isValidForFloridaRoute route: String) -> Bool {
        if route == "Smoking Marijuana" {
            return unit == .grams || unit == .ounces
        }
        return unit == .milligrams
    }

    static func hasExactLabel(_ label: String, near index: Int, in lines: [String]) -> Bool {
        let lowerBound = max(0, index - 8)
        let upperBound = min(lines.count - 1, index + 8)
        return lines[lowerBound...upperBound].contains(where: { isExactLabelLine($0, label: label) })
    }

    static func hasExactLabel(
        _ label: String,
        before index: Int,
        within maximumDistance: Int,
        in lines: [String]
    ) -> Bool {
        let lowerBound = max(0, index - maximumDistance)
        guard lowerBound < index else { return false }
        return lines[lowerBound..<index].contains(where: { isExactLabelLine($0, label: label) })
    }

    static func isExactLabelLine(_ line: String, label: String) -> Bool {
        equals(line, label) || equals(line, "\(label):") || exactColonSuffix(of: line, after: label) != nil
    }

    static func exactColonSuffix(of line: String, after label: String) -> String? {
        let prefix = "\(label):"
        guard line.count > prefix.count else { return nil }
        let actualPrefix = String(line.prefix(prefix.count))
        guard equals(actualPrefix, prefix) else { return nil }
        let suffix = String(line.dropFirst(prefix.count)).trimmingCharacters(in: .whitespaces)
        return suffix.isEmpty ? nil : suffix
    }

    static func deduplicated(_ candidates: [ParsedAllotmentCandidate]) -> [ParsedAllotmentCandidate]? {
        var byIdentity: [CandidateIdentity: ParsedAllotmentCandidate] = [:]
        var ordered: [ParsedAllotmentCandidate] = []

        for candidate in candidates {
            let identity = CandidateIdentity(
                stateID: candidate.stateID,
                kind: candidate.kind,
                route: candidate.route
            )
            if let existing = byIdentity[identity] {
                guard existing == candidate else { return nil }
                continue
            }
            byIdentity[identity] = candidate
            ordered.append(candidate)
        }
        return ordered.isEmpty ? nil : ordered
    }

    static func normalizedLines(_ text: String) -> [String] {
        text
            .replacingOccurrences(of: "\u{00A0}", with: " ")
            .components(separatedBy: .newlines)
            .map(normalizeWhitespace)
            .filter { !$0.isEmpty }
    }

    static func normalizeWhitespace(_ text: String) -> String {
        text
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
    }

    static func equals(_ lhs: String, _ rhs: String) -> Bool {
        lhs.caseInsensitiveCompare(rhs) == .orderedSame
    }

    static func isASCIIDigits<S: StringProtocol>(_ value: S) -> Bool {
        !value.isEmpty && value.utf8.allSatisfy { (48...57).contains($0) }
    }
}
