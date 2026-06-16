import XCTest

final class CadetCatchUITests: XCTestCase {
    @MainActor
    func testAppLaunches() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
    }

    @MainActor
    func testSyntheticHardFaceMatchScan() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--cadetcatch-ui-test-hard-match"]
        app.launchEnvironment = [
            "CADETCATCH_UI_TEST_PROFILE_JPEG_BASE64": try fixtureBase64(named: "synthetic-reference-baseline.jpg"),
            "CADETCATCH_UI_TEST_SOURCE_JPEG_BASE64": try fixtureBase64(named: "synthetic-hard-source.jpg")
        ]
        app.terminate()
        app.launch()

        XCTAssertTrue(app.staticTexts["Synthetic QA Cadet"].waitForExistence(timeout: 12))

        let checkPhotos = app.buttons["Check Photos"]
        if !checkPhotos.waitForExistence(timeout: 4), app.buttons["Home"].exists {
            app.buttons["Home"].tap()
        }
        XCTAssertTrue(checkPhotos.waitForExistence(timeout: 12))
        checkPhotos.tap()

        XCTAssertTrue(app.staticTexts["Scan Complete"].waitForExistence(timeout: 90))
        XCTAssertTrue(app.staticTexts["Matches Found"].exists)

        let viewMatches = app.buttons["View Matches"]
        XCTAssertTrue(viewMatches.waitForExistence(timeout: 10))
        viewMatches.tap()

        XCTAssertTrue(app.staticTexts["Synthetic QA Cadet"].waitForExistence(timeout: 12))

        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = "Synthetic hard face match result"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func fixtureBase64(named filename: String) throws -> String {
        let fixtureURL = URL(fileURLWithPath: "/tmp/cadetcatch-face-test").appendingPathComponent(filename)
        guard FileManager.default.fileExists(atPath: fixtureURL.path) else {
            throw XCTSkip("Missing local CadetCatch face fixture: \(fixtureURL.path)")
        }
        return try Data(contentsOf: fixtureURL).base64EncodedString()
    }
}
