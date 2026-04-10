import SwiftUI

/// AccessibilityHelper provides utilities for WCAG compliance
public struct AccessibilityHelper {
    /// Mark content as important for voice over
    public static func announceForAccessibility(_ message: String) {
        UIAccessibility.post(notification: .announcement, argument: message)
    }

    /// Add semantic label
    public static func addLabel(_ label: String, to view: View) -> some View {
        view.accessibilityLabel(Text(label))
    }

    /// Add hint for voice over
    public static func addHint(_ hint: String, to view: View) -> some View {
        view.accessibilityHint(Text(hint))
    }

    /// Create accessible button
    public static func accessibleButton(
        _ label: String,
        hint: String? = nil,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
        }
        .accessibilityLabel(Text(label))
        .accessibilityHint(Text(hint ?? ""))
    }

    /// Ensure minimum touch target size (44pt recommended)
    public static let minimumTouchTarget = 44.0
}

// MARK: - Accessibility Modifiers

extension View {
    /// Add semantic header for accessibility
    public func accessibilityHeader(_ header: String) -> some View {
        self.accessibilityLabel(Text(header))
            .accessibilityAddTraits(.isHeader)
    }

    /// Mark as list item for voice over
    public func accessibilityListItem() -> some View {
        self.accessibilityAddTraits(.isList)
    }

    /// Mark button as primary
    public func accessibilityPrimaryButton() -> some View {
        self.accessibilityAddTraits(.isButton)
            .accessibilityAddTraits(.startsMediaSession)
    }

    /// Add accessible help text
    public func accessibilityHelp(_ help: String) -> some View {
        self.accessibilityHint(Text(help))
    }
}
