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
        try visible(text("توزيع الحركة"), within: 45)
        try visible(text("الأسعار المتاحة"))
        try visible(text("حداثة الأسعار"))
        try visible(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "أسعار العيّنة · ")).firstMatch, interactive: true)
        try verifyComparableCardBounds()
        try confirmUnobstructed()
        capture("tvos-brief")
    }

    @MainActor
    func testMapRendersRegionalClocks() throws {
        defer { capture("final-map") }
        try open("map")
        try visible(text("التوقيت المحلي"))
        try visible(app.images.matching(identifier: "assets/assets/world-atlas.png").firstMatch)
        for city in ["مدينة الكويت", "لندن", "نيويورك", "طوكيو"] {
            try visible(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", " · \(city) · ")).firstMatch, interactive: true)
        }
        try confirmUnobstructed()
        capture("tvos-map")
    }

    @MainActor
    func testAccountRendersPhoneHandoff() throws {
        defer { capture("final-account") }
        try open("account")
        try visible(text("https://www.the-sfm.com/profile"))
        try visible(text("عدّل اسمك وصورتك وبيانات ملفك الشخصي من صفحة الحساب على هاتفك."))
        try visible(app.images.matching(NSPredicate(format: "label == %@", "امسح الرمز بهاتفك أو افتح هذا العنوان.")).firstMatch)
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
    private func text(_ label: String) -> XCUIElement {
        // React Native exposes a text wrapper and child with the same label.
        app.staticTexts.matching(NSPredicate(format: "label == %@", label)).firstMatch
    }

    @MainActor
    private func verifyComparableCardBounds() throws {
        let highlights = app.buttons.matching(NSPredicate(format: "label == %@", "أبرز التحركات")).firstMatch
        // Prices-only fallback notes can intentionally scroll. The normal
        // comparable/highlights page must show each displayed card's metadata.
        guard highlights.exists, highlights.isSelected else { return }
        let results = app.scrollViews.firstMatch
        try visible(results)
        let viewport = results.frame
        var checked = 0
        for item in results.descendants(matching: .staticText).allElementsBoundByIndex {
            guard !item.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { continue }
            let frame = item.frame
            guard frame.width > 0, frame.height > 0, viewport.contains(frame) else {
                throw failure("Brief card text is clipped outside its result viewport: \(item.label), frame \(frame), viewport \(viewport)")
            }
            checked += 1
        }
        guard checked > 0 else { throw failure("The comparable brief contains no visible card text") }
    }

    @MainActor
    private func visible(_ element: XCUIElement, within timeout: TimeInterval = 15, interactive: Bool = false) throws {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if element.exists {
                let frame = element.frame
                // Static text and images need not be remote-focus targets. All
                // required content must fit on screen; buttons must also be hittable.
                if frame.width > 0, frame.height > 0, app.frame.contains(frame), !interactive || element.isHittable {
                    return
                }
            }
            Thread.sleep(forTimeInterval: 0.2)
        } while Date() < deadline
        throw failure("Expected visible \(scene) content was not rendered: \(element)")
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
