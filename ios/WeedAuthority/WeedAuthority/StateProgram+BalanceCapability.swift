import Foundation

enum StateBalanceCapability: String, Codable, Equatable, Hashable, Sendable {
    case portalTextImport
    case officialPortalOnly
}

struct StatePortalImportInstructions: Codable, Equatable, Hashable, Sendable {
    let pageTitle: String
    let steps: [String]
    let acceptedLabels: [String]
    let reviewNotice: String
}

extension StateProgram {
    var balanceCapability: StateBalanceCapability {
        switch id.uppercased() {
        case "FL", "AZ": .portalTextImport
        default: .officialPortalOnly
        }
    }

    var portalImportInstructions: StatePortalImportInstructions? {
        switch id.uppercased() {
        case "FL":
            StatePortalImportInstructions(
                pageTitle: "Florida MMUR amount available",
                steps: [
                    "Sign in to the official Medical Marijuana Use Registry.",
                    "Open Patient Profile, then Show Dispensable Amounts for current eligibility.",
                    "For a doctor's order balance, open that order's detail so its route, Amount Ordered, Mg Per Day, and Amount Remaining are visible.",
                    "Import the visible text, review every recognized value and unit, then confirm before saving."
                ],
                acceptedLabels: [
                    StateAllotmentTextParser.floridaSmokingLabel,
                    StateAllotmentTextParser.floridaMedicalLabel,
                    StateAllotmentTextParser.floridaOrderRemainingLabel
                ],
                reviewNotice: "Eligibility and order balance are different values. Weed Authority saves neither until you explicitly confirm the parsed result."
            )
        case "AZ":
            StatePortalImportInstructions(
                pageTitle: "Arizona My ID Cards",
                steps: [
                    "Sign in to the official Arizona Individual Licensing Portal.",
                    "Open Medical Marijuana Patient, then My ID Cards.",
                    "Scroll until Remaining Allotment and its grams or ounces unit are both visible.",
                    "Import the visible text, review the recognized value and unit, then confirm before saving."
                ],
                acceptedLabels: [StateAllotmentTextParser.arizonaRemainingLabel],
                reviewNotice: "The portal remains the source of truth. Weed Authority saves no imported value until you explicitly confirm it."
            )
        default:
            nil
        }
    }

    var hasAllowedImportPortal: Bool {
        guard let host = portalURL.host(percentEncoded: false)?.lowercased() else { return false }
        switch id.uppercased() {
        case "FL": return host == "mmuregistry.flhealth.gov"
        case "AZ": return host == "individual-licensing.azdhs.gov"
        default: return false
        }
    }
}
