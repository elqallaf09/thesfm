import XCTest

/// Exercises the installed production renderer through its public deep links.
/// This target has no dependency on, launch arguments for, or bridge into the app.
final class NativeTVSmokeTests: XCTestCase {
    @MainActor private var app: XCUIApplication { XCUIApplication(bundleIdentifier: "com.thesfm.marketstv.native") }
    @MainActor private var system: XCUIApplication { XCUIApplication(bundleIdentifier: "com.apple.PineBoard") }
    private var scene = "launch"

    @MainActor
    func testBriefRendersSampleMetrics() throws {
        defer { capture("final-brief") }
        try open("brief")
        try visible(app.staticTexts["توزيع الحركة"], within: 45)
        try visible(app.staticTexts["الأسعار المتاحة"])
        try visible(app.staticTexts["حداثة الأسعار"])
        try visible(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "أسعار العيّنة · ")).firstMatch)
        try confirmUnobstructed()
        capture("tvos-brief")
    }

    @MainActor
    func testMapRendersRegionalClocks() throws {
        defer { capture("final-map") }
        try open("map")
        try visible(app.staticTexts["التوقيت المحلي"])
        for city in ["مدينة الكويت", "لندن", "نيويورك", "طوكيو"] {
            try visible(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", " · \(city) · ")).firstMatch)
        }
        try confirmUnobstructed()
        capture("tvos-map")
    }

    @MainActor
    func testAccountRendersPhoneHandoff() throws {
        defer { capture("final-account") }
        try open("account")
        try visible(app.staticTexts["https://www.the-sfm.com/profile"])
        try visible(app.staticTexts["عدّل اسمك وصورتك وبيانات ملفك الشخصي من صفحة الحساب على هاتفك."])
        try visible(app.images["امسح الرمز بهاتفك أو افتح هذا العنوان."])
        try confirmUnobstructed()
        capture("tvos-account")
    }

    @MainActor
    private func open(_ destination: String) throws {
        scene = destination
        app.open(URL(string: "sfm-tv-native://\(destination)")!)
        // XCUIApplication.open is the supported UI automation entry point. Some
        // tvOS runtimes can still present a system confirmation: accept only this
        // app's exact Open action when it already owns the remote focus.
        try acceptAppOpenPromptIfPresent()
        guard app.wait(for: .runningForeground, timeout: 15) else {
            throw failure("SFM Markets TV did not enter the foreground for \(destination)")
        }
    }

    @MainActor
    private func visible(_ element: XCUIElement, within timeout: TimeInterval = 15) throws {
        let predicate = NSPredicate(format: "exists == true AND hittable == true")
        let ready = XCTNSPredicateExpectation(predicate: predicate, object: element)
        guard XCTWaiter.wait(for: [ready], timeout: timeout) == .completed else {
            throw failure("Expected visible \(scene) content was not rendered: \(element)")
        }
    }

    @MainActor
    private func acceptAppOpenPromptIfPresent() throws {
        // A short bounded wait also covers confirmation arriving just after open().
        let deadline = Date().addingTimeInterval(3)
        repeat {
            for owner in [system, app] {
                let alert = owner.alerts.firstMatch
                guard alert.exists else { continue }
                let namesApp = alert.label.contains("SFM Markets TV") || alert.staticTexts
                    .matching(NSPredicate(format: "label CONTAINS %@", "SFM Markets TV")).firstMatch.exists
                let button = alert.buttons["Open"]
                guard namesApp, button.exists, button.hasFocus else {
                    throw failure("Unexpected or unfocused system prompt; no action was accepted")
                }
                XCUIRemote.shared.press(.select)
                let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: alert)
                guard XCTWaiter.wait(for: [dismissed], timeout: 5) == .completed else {
                    throw failure("The SFM Open confirmation did not dismiss")
                }
                return
            }
            Thread.sleep(forTimeInterval: 0.2)
        } while Date() < deadline
    }

    @MainActor
    private func confirmUnobstructed() throws {
        guard app.state == .runningForeground, !app.alerts.firstMatch.exists, !system.alerts.firstMatch.exists else {
            throw failure("A feature remained obscured by a system or application alert")
        }
    }

    @MainActor
    private func capture(_ name: String) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        for (suffix, hierarchy) in [("-ax", app.debugDescription), ("-system-ax", system.debugDescription)] {
            let attachment = XCTAttachment(string: hierarchy)
            attachment.name = name + suffix
            attachment.lifetime = .keepAlways
            add(attachment)
        }
    }

    @MainActor
    private func failure(_ message: String) -> NSError {
        capture("failure-\(scene)")
        return NSError(domain: "NativeTVSmoke", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}
