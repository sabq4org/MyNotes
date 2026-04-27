import SwiftUI

@main
struct MyNotesIOSApp: App {
    @StateObject private var session = SessionStore(api: APIClient.shared)

    init() {
        // Make the navigation bar match the brand-colored web header. We tint
        // bar buttons with the brand color and use a translucent white
        // background like `bg-white/80 backdrop-blur` on the web.
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor.white.withAlphaComponent(0.85)
        appearance.titleTextAttributes = [.foregroundColor: UIColor(Theme.ink900)]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor(Theme.ink900)]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().tintColor = UIColor(Theme.brand600)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environment(\.layoutDirection, .rightToLeft)
                .tint(Theme.brand600)
        }
    }
}

// MARK: - Theme (mirrors `frontend/tailwind.config.js`)

enum Theme {
    // Brand (indigo) — matches Tailwind `brand` palette
    static let brand50  = Color(hex: 0xEEF2FF)
    static let brand100 = Color(hex: 0xE0E7FF)
    static let brand200 = Color(hex: 0xC7D2FE)
    static let brand300 = Color(hex: 0xA5B4FC)
    static let brand400 = Color(hex: 0x818CF8)
    static let brand500 = Color(hex: 0x6366F1)
    static let brand600 = Color(hex: 0x4F46E5)
    static let brand700 = Color(hex: 0x4338CA)
    static let brand800 = Color(hex: 0x3730A3)
    static let brand900 = Color(hex: 0x312E81)

    // Ink (neutral) — matches Tailwind `ink` palette
    static let ink50  = Color(hex: 0xF7F7F8)
    static let ink100 = Color(hex: 0xEEEEF0)
    static let ink200 = Color(hex: 0xD9D9DE)
    static let ink300 = Color(hex: 0xB7B7BF)
    static let ink400 = Color(hex: 0x8D8D97)
    static let ink500 = Color(hex: 0x6E6E78)
    static let ink600 = Color(hex: 0x54545D)
    static let ink700 = Color(hex: 0x3F3F47)
    static let ink800 = Color(hex: 0x27272D)
    static let ink900 = Color(hex: 0x18181C)

    // Status colours
    static let rose600   = Color(hex: 0xE11D48)
    static let rose50    = Color(hex: 0xFFF1F2)
    static let amber50   = Color(hex: 0xFFFBEB)
    static let amber600  = Color(hex: 0xD97706)

    // Catalog of palette swatches that the web app's `ColorPicker` exposes.
    // Used both by the project form and to find the closest matching swatch
    // for a project's saved colour.
    static let projectPalette: [String] = [
        "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
        "#F59E0B", "#10B981", "#06B6D4", "#0EA5E9", "#64748B"
    ]

    // Catalog of icons offered by the web's `IconPicker`. Kept here so the
    // iOS app can render them too (using the saved emoji when present).
    static let projectIcons: [String] = [
        "📝", "📌", "📁", "🗂️", "📰", "💼", "💡", "🚀", "✅",
        "📚", "🧠", "🏥", "💪", "🍎", "💰", "🏠", "🎯", "⭐"
    ]
}

extension Color {
    /// Convenience initialiser for hex literals like `Color(hex: 0x4F46E5)`.
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }

    /// Parses a CSS-style hex string (`#RRGGBB` / `#RGB`). Falls back to
    /// `brand500` when the input is missing or invalid.
    init(cssHex: String?) {
        guard let raw = cssHex?.trimmingCharacters(in: .whitespaces),
              raw.hasPrefix("#") else {
            self = Theme.brand500
            return
        }
        var hex = String(raw.dropFirst())
        if hex.count == 3 {
            hex = hex.map { "\($0)\($0)" }.joined()
        }
        guard hex.count == 6, let value = UInt32(hex, radix: 16) else {
            self = Theme.brand500
            return
        }
        self.init(hex: value)
    }
}

// MARK: - Reusable button styles (mirror `.btn-primary`, `.btn-ghost`, etc.)

struct PrimaryButtonStyle: ButtonStyle {
    var fullWidth: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Theme.brand600)
            )
            .shadow(color: Theme.brand600.opacity(0.18), radius: 12, x: 0, y: 4)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(Theme.ink700)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(configuration.isPressed ? Theme.ink100 : Color.clear)
            )
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.rose600)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

// MARK: - Soft card container (matches `.card { rounded-2xl shadow-soft }`)

struct CardContainer<Content: View>: View {
    var padding: CGFloat = 16
    var radius: CGFloat = 18
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(Color.white)
                    .shadow(color: Color.black.opacity(0.04), radius: 1, x: 0, y: 1)
                    .shadow(color: Color.black.opacity(0.05), radius: 16, x: 0, y: 8)
            )
    }
}

// MARK: - Branded gradient screen background

struct BrandedBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Theme.ink50, .white],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}

// MARK: - Branded logo (NotebookPen on indigo square — same as web AuthLayout)

struct BrandLogo: View {
    var size: CGFloat = 56
    var iconSize: CGFloat? = nil
    var cornerRadius: CGFloat? = nil

    var body: some View {
        let radius = cornerRadius ?? max(10, size * 0.28)
        let iSize  = iconSize ?? max(14, size * 0.46)
        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .fill(Theme.brand600)
                .shadow(color: Theme.brand600.opacity(0.30), radius: 10, x: 0, y: 6)
            // SF Symbol that visually mirrors lucide's NotebookPen.
            Image(systemName: "square.and.pencil")
                .font(.system(size: iSize, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Tag chip (matches web's deterministic colour-from-name palette)

struct TagChipView: View {
    let name: String
    var size: ChipSize = .sm
    var active: Bool = false
    var onRemove: (() -> Void)? = nil
    var onTap: (() -> Void)? = nil

    enum ChipSize { case xs, sm }

    private static let palette: [(bg: UInt32, fg: UInt32, ring: UInt32)] = [
        (0xF0F9FF, 0x0369A1, 0xBAE6FD), // sky
        (0xECFDF5, 0x047857, 0xA7F3D0), // emerald
        (0xFFFBEB, 0xB45309, 0xFDE68A), // amber
        (0xFFF1F2, 0xBE123C, 0xFECDD3), // rose
        (0xF5F3FF, 0x6D28D9, 0xDDD6FE), // violet
        (0xFDF4FF, 0xA21CAF, 0xF5D0FE), // fuchsia
        (0xF0FDFA, 0x0F766E, 0x99F6E4), // teal
        (0xFFF7ED, 0xC2410C, 0xFED7AA), // orange
    ]

    private var palette: (bg: Color, fg: Color, ring: Color) {
        let s = name.lowercased()
        var h: UInt32 = 0
        for c in s.unicodeScalars { h = h &* 31 &+ c.value }
        let p = Self.palette[Int(h % UInt32(Self.palette.count))]
        return (Color(hex: p.bg), Color(hex: p.fg), Color(hex: p.ring))
    }

    var body: some View {
        let p = palette
        let bg = active ? Theme.brand600 : p.bg
        let fg = active ? Color.white : p.fg
        let ring = active ? Theme.brand600 : p.ring

        let label = HStack(spacing: 4) {
            Text("#\(name)")
                .font(.system(size: size == .xs ? 11 : 12, weight: .medium))
                .lineLimit(1)
            if let onRemove {
                Button {
                    onRemove()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .heavy))
                }
                .buttonStyle(.plain)
                .foregroundStyle(fg)
            }
        }
        .padding(.horizontal, size == .xs ? 8 : 10)
        .padding(.vertical, size == .xs ? 2 : 4)
        .background(
            Capsule().fill(bg)
        )
        .overlay(
            Capsule().stroke(ring, lineWidth: 1)
        )
        .foregroundStyle(fg)

        if let onTap {
            Button(action: onTap) { label }
                .buttonStyle(.plain)
        } else {
            label
        }
    }
}

// MARK: - Misc helpers

extension View {
    /// Wraps content in the standard branded background gradient so login,
    /// dashboard and project pages all share the same surface as the web.
    func brandedBackground() -> some View {
        ZStack {
            BrandedBackground()
            self
        }
    }
}
