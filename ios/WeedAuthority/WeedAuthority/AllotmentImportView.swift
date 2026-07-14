import ImageIO
import PhotosUI
import SwiftUI
import Vision

struct AllotmentImportSheet: View {
    @Environment(AuthorityStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    let program: StateProgram

    @State private var selectedItem: PhotosPickerItem?
    @State private var reviewItems: [AllotmentReviewItem] = []
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var acknowledged = false
    @State private var showingManualEntry = false

    var body: some View {
        NavigationStack {
            ZStack {
                AuthorityBackground()
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 18) {
                        explanationPanel
                        portalPanel
                        importPanel
                        if !reviewItems.isEmpty {
                            reviewPanel
                        }
                    }
                    .padding(18)
                }
            }
            .navigationTitle("Import allotment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(Color.authorityGreen)
                }
            }
            .onChange(of: selectedItem) { _, newItem in
                guard let newItem else { return }
                Task { await importScreenshot(newItem) }
            }
            .sheet(isPresented: $showingManualEntry) {
                ManualAllotmentEntrySheet(program: program) { snapshot in
                    store.saveConfirmedAllotment(snapshot)
                    dismiss()
                }
            }
        }
    }

    private var explanationPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(eyebrow: program.id, title: program.portalImportInstructions?.pageTitle ?? "Official portal")
                Text("Weed Authority never receives your portal password, MFA code, or Safari cookies. Recognition happens on this device after you choose a screenshot.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)
                Label("The selected image is not saved by Weed Authority.", systemImage: "lock.shield.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.authorityGreen)
            }
        }
    }

    private var portalPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 13) {
                SectionHeader(eyebrow: "Step 1", title: "Open the official portal")
                if let instructions = program.portalImportInstructions {
                    ForEach(Array(instructions.steps.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .top, spacing: 10) {
                            Text("\(index + 1)")
                                .font(.system(size: 11, weight: .black, design: .rounded))
                                .foregroundStyle(Color.authorityInk)
                                .frame(width: 22, height: 22)
                                .background(Color.authorityGreen, in: Circle())
                            Text(step)
                                .font(.system(size: 13))
                                .foregroundStyle(Color.authorityMuted)
                                .lineSpacing(3)
                        }
                    }
                }
                PrimaryActionButton(title: "Open in Safari", systemImage: "safari") {
                    guard program.hasAllowedImportPortal else {
                        errorMessage = "The configured portal address did not pass the official-domain check."
                        return
                    }
                    openURL(program.portalURL)
                }
                .opacity(program.hasAllowedImportPortal ? 1 : 0.45)
                .disabled(!program.hasAllowedImportPortal)
            }
        }
    }

    private var importPanel: some View {
        let processing = isProcessing

        return AuthorityPanel {
            VStack(alignment: .leading, spacing: 13) {
                SectionHeader(eyebrow: "Step 2", title: "Choose the portal screenshot")
                Text("Only exact Florida MMUR or Arizona Remaining Allotment labels with an explicit unit are accepted. Unclear or conflicting text is rejected.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(3)

                PhotosPicker(selection: $selectedItem, matching: .images, preferredItemEncoding: .current) {
                    HStack {
                        Image(systemName: "photo.badge.plus")
                        Text(processing ? "Reading on this device..." : "Import screenshot")
                        Spacer()
                        if processing {
                            ProgressView()
                                .tint(Color.authorityInk)
                        } else {
                            Image(systemName: "arrow.right")
                        }
                    }
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.authorityInk)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .background(Color.authorityGreen, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(processing)

                SecondaryActionButton(title: "Enter a displayed value manually", systemImage: "square.and.pencil") {
                    showingManualEntry = true
                }

                if let errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.authorityCoral)
                }
            }
        }
    }

    private var reviewPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Step 3", title: "Review every value")
                Text(program.portalImportInstructions?.reviewNotice ?? "Compare every value with the official portal before saving.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(3)

                ForEach($reviewItems) { $item in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(item.title)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.authorityText)
                        if let route = item.candidate.route {
                            Text(route)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.authorityGold)
                        }
                        HStack {
                            TextField("Amount", text: $item.amountText)
                                .keyboardType(.decimalPad)
                                .authorityImportField()
                            Text(item.candidate.unit.abbreviation)
                                .font(.system(size: 15, weight: .black, design: .rounded))
                                .foregroundStyle(Color.authorityGreen)
                                .frame(width: 46)
                        }
                        Text("Matched: \(item.candidate.sourceLabel)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.authorityMuted)
                    }
                    .padding(12)
                    .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                Toggle(isOn: $acknowledged) {
                    Text("I compared these values with the official portal and understand this saved copy is not authorization to purchase.")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.authorityText)
                }
                .tint(Color.authorityGreen)

                PrimaryActionButton(title: "Confirm and save snapshot", systemImage: "checkmark.shield.fill") {
                    saveReviewedSnapshot()
                }
                .opacity(canSaveReviewedSnapshot ? 1 : 0.45)
                .disabled(!canSaveReviewedSnapshot)
            }
        }
    }

    private var canSaveReviewedSnapshot: Bool {
        acknowledged
            && !reviewItems.isEmpty
            && reviewItems.allSatisfy { $0.measurement != nil }
    }

    @MainActor
    private func importScreenshot(_ item: PhotosPickerItem) async {
        isProcessing = true
        errorMessage = nil
        reviewItems = []
        acknowledged = false

        defer {
            isProcessing = false
            selectedItem = nil
        }

        do {
            guard program.hasAllowedImportPortal else {
                throw PortalScreenshotError.untrustedPortalConfiguration
            }
            guard let imageData = try await item.loadTransferable(type: Data.self) else {
                throw PortalScreenshotError.unreadableImage
            }
            let recognizedText = try await PortalScreenshotTextRecognizer.recognizedText(from: imageData)
            let candidates = StateAllotmentTextParser.candidates(stateID: program.id, text: recognizedText)
            guard !candidates.isEmpty else {
                throw PortalScreenshotError.noExactAllotment
            }
            reviewItems = candidates.map(AllotmentReviewItem.init)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription
                ?? "The screenshot could not be read. Try a tighter screenshot with the label, value, unit, and page heading visible."
        }
    }

    private func saveReviewedSnapshot() {
        let measurements = reviewItems.compactMap(\.measurement)
        guard
            canSaveReviewedSnapshot,
            measurements.count == reviewItems.count,
            let parserVersion = reviewItems.first?.candidate.parserVersion,
            reviewItems.allSatisfy({ $0.candidate.parserVersion == parserVersion })
        else {
            return
        }

        store.saveConfirmedAllotment(
            AllotmentSnapshot(
                stateID: program.id,
                capturedAt: .now,
                parserVersion: parserVersion,
                measurements: measurements,
                userConfirmedAt: .now
            )
        )
        dismiss()
    }
}

private struct AllotmentReviewItem: Identifiable {
    let id = UUID()
    let candidate: ParsedAllotmentCandidate
    var amountText: String

    init(_ candidate: ParsedAllotmentCandidate) {
        self.candidate = candidate
        amountText = String(candidate.amount)
    }

    var title: String {
        candidate.kind.displayTitle
    }

    var measurement: AllotmentMeasurement? {
        guard let amount = parseLocalAmount(amountText) else { return nil }
        return AllotmentMeasurement(
            kind: candidate.kind,
            amount: amount,
            unit: candidate.unit,
            route: candidate.route,
            sourceLabel: candidate.sourceLabel,
            parserVersion: candidate.parserVersion
        )
    }
}

private struct ManualAllotmentEntrySheet: View {
    @Environment(\.dismiss) private var dismiss

    let program: StateProgram
    let onSave: (AllotmentSnapshot) -> Void

    @State private var amountText = ""
    @State private var unit: AllotmentUnit
    @State private var kind: AllotmentMeasurementKind
    @State private var route: String
    @State private var acknowledged = false

    init(program: StateProgram, onSave: @escaping (AllotmentSnapshot) -> Void) {
        self.program = program
        self.onSave = onSave
        let isArizona = program.id == "AZ"
        _unit = State(initialValue: isArizona ? .ounces : .ounces)
        _kind = State(initialValue: isArizona ? .remainingAllotment : .smokingEligibleNow)
        _route = State(initialValue: isArizona ? "" : "Smoking Marijuana")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AuthorityBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Copy one value exactly as displayed in the official portal. This does not calculate or verify purchase eligibility.")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(4)

                        if program.id == "FL" {
                            Picker("Value type", selection: $kind) {
                                Text("Smoking eligible now").tag(AllotmentMeasurementKind.smokingEligibleNow)
                                Text("Route eligible now").tag(AllotmentMeasurementKind.routeEligibleNow)
                                Text("Doctor order remaining").tag(AllotmentMeasurementKind.doctorOrderRemaining)
                            }
                            .authorityPicker()

                            if kind != .smokingEligibleNow {
                                Picker("Route", selection: $route) {
                                    ForEach(availableRoutes, id: \.self) { route in
                                        Text(route).tag(route)
                                    }
                                }
                                .authorityPicker()
                            }
                        }

                        TextField("Amount shown in portal", text: $amountText)
                            .keyboardType(.decimalPad)
                            .authorityImportField()

                        Picker("Unit", selection: $unit) {
                            ForEach(allowedUnits, id: \.self) { unit in
                                Text(unit.abbreviation).tag(unit)
                            }
                        }
                        .authorityPicker()

                        Toggle(isOn: $acknowledged) {
                            Text("I copied this value and unit from the official portal and understand the state registry and dispensary remain authoritative.")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.authorityText)
                        }
                        .tint(Color.authorityGreen)

                        PrimaryActionButton(title: "Confirm manual snapshot", systemImage: "checkmark.shield.fill") {
                            save()
                        }
                        .opacity(canSave ? 1 : 0.45)
                        .disabled(!canSave)
                    }
                    .padding(18)
                }
            }
            .navigationTitle("Manual portal value")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.authorityGreen)
                }
            }
            .onChange(of: kind) { _, _ in normalizeSelection() }
            .onChange(of: route) { _, _ in normalizeSelection() }
        }
    }

    private var availableRoutes: [String] {
        if kind == .routeEligibleNow {
            return ["Inhalation", "Oral", "Edibles", "Sublingual", "Topical", "Suppository"]
        }
        return ["Smoking Marijuana", "Inhalation", "Oral", "Edibles", "Sublingual", "Topical", "Suppository"]
    }

    private var allowedUnits: [AllotmentUnit] {
        if program.id == "AZ" || kind == .smokingEligibleNow || route == "Smoking Marijuana" {
            return [.ounces, .grams]
        }
        return [.milligrams]
    }

    private var normalizedRoute: String? {
        if program.id == "AZ" { return nil }
        if kind == .smokingEligibleNow { return "Smoking Marijuana" }
        return route
    }

    private var parsedAmount: Double? {
        parseLocalAmount(amountText)
    }

    private var canSave: Bool {
        acknowledged && parsedAmount != nil && allowedUnits.contains(unit)
    }

    private func normalizeSelection() {
        if kind == .smokingEligibleNow {
            route = "Smoking Marijuana"
        } else if !availableRoutes.contains(route) {
            route = availableRoutes[0]
        }
        if !allowedUnits.contains(unit) {
            unit = allowedUnits[0]
        }
    }

    private func save() {
        guard
            let amount = parsedAmount,
            let measurement = AllotmentMeasurement(
                kind: kind,
                amount: amount,
                unit: unit,
                route: normalizedRoute,
                sourceLabel: "User-entered official portal value",
                parserVersion: "manual.portal.v1"
            )
        else {
            return
        }

        onSave(
            AllotmentSnapshot(
                stateID: program.id,
                capturedAt: .now,
                parserVersion: "manual.portal.v1",
                measurements: [measurement],
                userConfirmedAt: .now
            )
        )
    }
}

private enum PortalScreenshotTextRecognizer {
    static let maximumByteCount = 25 * 1_024 * 1_024

    static func recognizedText(from data: Data) async throws -> String {
        guard !data.isEmpty, data.count <= maximumByteCount else {
            throw PortalScreenshotError.imageTooLarge
        }
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            throw PortalScreenshotError.unreadableImage
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: 4_096
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            throw PortalScreenshotError.unreadableImage
        }

        let sendableImage = SendableCGImage(value: image)
        return try await Task.detached(priority: .userInitiated) {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["en-US"]

            let handler = VNImageRequestHandler(cgImage: sendableImage.value, options: [:])
            try handler.perform([request])

            let lines = request.results?.compactMap { observation in
                observation.topCandidates(1).first?.string
            } ?? []
            guard !lines.isEmpty else {
                throw PortalScreenshotError.noText
            }
            return lines.joined(separator: "\n")
        }.value
    }
}

private struct SendableCGImage: @unchecked Sendable {
    let value: CGImage
}

private enum PortalScreenshotError: LocalizedError {
    case imageTooLarge
    case unreadableImage
    case noText
    case noExactAllotment
    case untrustedPortalConfiguration

    var errorDescription: String? {
        switch self {
        case .imageTooLarge:
            "That image is too large. Crop it to the portal section containing the heading, label, value, and unit."
        case .unreadableImage:
            "That image could not be opened. Choose a clear PNG, HEIC, or JPEG screenshot."
        case .noText:
            "No readable text was found. Try a clear screenshot at the portal's normal text size."
        case .noExactAllotment:
            "No unambiguous official allotment label and unit were found. Include the page heading, exact label, value, unit, and Florida route when shown."
        case .untrustedPortalConfiguration:
            "The configured portal address did not pass the official-domain check, so import is disabled."
        }
    }
}

private extension View {
    func authorityImportField() -> some View {
        font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color.authorityText)
            .padding(.horizontal, 12)
            .padding(.vertical, 13)
            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    func authorityPicker() -> some View {
        pickerStyle(.menu)
            .tint(Color.authorityGreen)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private func parseLocalAmount(_ text: String) -> Double? {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }

    let groupingSeparator = Locale.current.groupingSeparator ?? ","
    let decimalSeparator = Locale.current.decimalSeparator ?? "."
    let withoutGrouping = trimmed.replacingOccurrences(of: groupingSeparator, with: "")
    let machineValue = withoutGrouping.replacingOccurrences(of: decimalSeparator, with: ".")
    guard let value = Double(machineValue), value.isFinite, value >= 0 else { return nil }
    return value
}
