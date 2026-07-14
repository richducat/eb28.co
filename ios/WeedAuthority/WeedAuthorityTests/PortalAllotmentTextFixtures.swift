import Foundation

enum PortalAllotmentTextFixtures {
    static let floridaEligibleAndOrder = """
    Smoking Amount Eligible to be Dispensed
    1.25 ounces

    Medical Marijuana - Oral
    Medical Marijuana Amount Eligible to be Dispensed: 4,500 mg

    Medical Marijuana - Inhalation
    Amount Ordered
    14,000 mg
    Mg Per Day
    200
    Amount Remaining: 3,250 mg
    """

    static let floridaZeroRepeated = """
    Smoking Amount Eligible to be Dispensed: 0 grams
    Smoking Amount Eligible to be Dispensed: 0 grams
    """

    static let floridaAmbiguous = """
    Smoking Amount Eligible to be Dispensed: 1 ounce
    Smoking Amount Eligible to be Dispensed: 2 ounces
    """

    static let floridaMissingUnit = """
    Smoking Amount Eligible to be Dispensed
    1.25
    """

    static let arizona = """
    Medical Marijuana Patient
    My ID Cards
    Card Status: Active
    Remaining Allotment: 1.75 ounces
    """
}
