import XCTest
@testable import WeedAuthority

final class StateAllotmentTextParserTests: XCTestCase {
    func testFloridaKeepsEligibleBalancesSeparateFromDoctorOrderRemaining() throws {
        let candidates = StateAllotmentTextParser.candidates(
            stateID: "FL",
            text: PortalAllotmentTextFixtures.floridaEligibleAndOrder
        )

        XCTAssertEqual(candidates.count, 3)

        let smoking = try XCTUnwrap(candidates.first(where: { $0.kind == .smokingEligibleNow }))
        XCTAssertEqual(smoking.amount, 1.25)
        XCTAssertEqual(smoking.unit, .ounces)
        XCTAssertEqual(smoking.route, "Smoking Marijuana")

        let routeEligible = try XCTUnwrap(candidates.first(where: { $0.kind == .routeEligibleNow }))
        XCTAssertEqual(routeEligible.amount, 4_500)
        XCTAssertEqual(routeEligible.unit, .milligrams)
        XCTAssertEqual(routeEligible.route, "Oral")

        let order = try XCTUnwrap(candidates.first(where: { $0.kind == .doctorOrderRemaining }))
        XCTAssertEqual(order.amount, 3_250)
        XCTAssertEqual(order.unit, .milligrams)
        XCTAssertEqual(order.route, "Inhalation")
        XCTAssertNotEqual(routeEligible.kind, order.kind)
    }

    func testFloridaAcceptsZeroAndDeduplicatesExactOCRRepeats() throws {
        let candidates = StateAllotmentTextParser.candidates(
            stateID: "FL",
            text: PortalAllotmentTextFixtures.floridaZeroRepeated
        )

        let candidate = try XCTUnwrap(candidates.first)
        XCTAssertEqual(candidates.count, 1)
        XCTAssertEqual(candidate.amount, 0)
        XCTAssertEqual(candidate.unit, .grams)
    }

    func testFloridaRejectsConflictingValuesForSameExactLabel() {
        XCTAssertTrue(
            StateAllotmentTextParser.candidates(
                stateID: "FL",
                text: PortalAllotmentTextFixtures.floridaAmbiguous
            ).isEmpty
        )
    }

    func testFloridaRejectsExactLabelWithoutExplicitUnit() {
        XCTAssertTrue(
            StateAllotmentTextParser.candidates(
                stateID: "FL",
                text: PortalAllotmentTextFixtures.floridaMissingUnit
            ).isEmpty
        )
    }

    func testFloridaRejectsGenericBalanceText() {
        XCTAssertTrue(
            StateAllotmentTextParser.candidates(
                stateID: "FL",
                text: "Available balance: 2.5 ounces"
            ).isEmpty
        )
    }

    func testFloridaRejectsOrderRemainingWithoutRouteAndOrderContext() {
        XCTAssertTrue(
            StateAllotmentTextParser.candidates(
                stateID: "FL",
                text: "Amount Remaining: 500 mg"
            ).isEmpty
        )
    }

    func testArizonaParsesRemainingAllotmentOnMyIDCards() throws {
        let candidate = try XCTUnwrap(
            StateAllotmentTextParser.candidates(
                stateID: "AZ",
                text: PortalAllotmentTextFixtures.arizona
            ).first
        )

        XCTAssertEqual(candidate.kind, .remainingAllotment)
        XCTAssertEqual(candidate.amount, 1.75)
        XCTAssertEqual(candidate.unit, .ounces)
        XCTAssertNil(candidate.route)
        XCTAssertEqual(candidate.parserVersion, StateAllotmentTextParser.arizonaParserVersion)
    }

    func testArizonaRejectsMissingMyIDCardsContextOrUnit() {
        XCTAssertTrue(
            StateAllotmentTextParser.candidates(
                stateID: "AZ",
                text: "Remaining Allotment: 1.75 ounces"
            ).isEmpty
        )
        XCTAssertTrue(
            StateAllotmentTextParser.candidates(
                stateID: "AZ",
                text: "My ID Cards\nRemaining Allotment: 1.75"
            ).isEmpty
        )
    }

    func testSnapshotIsUnconfirmedAndExpiresAfterTwentyFourHours() throws {
        let capturedAt = Date(timeIntervalSince1970: 1_700_000_000)
        var snapshot = try XCTUnwrap(
            StateAllotmentTextParser.snapshot(
                stateID: "AZ",
                text: PortalAllotmentTextFixtures.arizona,
                capturedAt: capturedAt
            )
        )

        XCTAssertNil(snapshot.userConfirmedAt)
        XCTAssertFalse(snapshot.isStale(at: capturedAt.addingTimeInterval(86_399)))
        XCTAssertTrue(snapshot.isStale(at: capturedAt.addingTimeInterval(86_400)))

        snapshot.invalidate(at: capturedAt.addingTimeInterval(60))
        XCTAssertTrue(snapshot.isStale(at: capturedAt.addingTimeInterval(61)))
    }
}
