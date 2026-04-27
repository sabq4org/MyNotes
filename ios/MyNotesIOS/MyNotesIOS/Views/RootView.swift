import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        Group {
            switch session.state {
            case .loading:
                LoadingScreen()
            case .needsSetup, .needsLogin:
                LoginView(isSetup: session.state == .needsSetup)
            case .authenticated:
                ProjectsView()
            }
        }
    }
}

// MARK: - Loading screen — branded splash with logo

struct LoadingScreen: View {
    var body: some View {
        ZStack {
            BrandedBackground()
            VStack(spacing: 18) {
                BrandLogo(size: 64)
                ProgressView()
                    .tint(Theme.brand600)
                Text("جاري تجهيز مفكرتي…")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.ink500)
            }
        }
    }
}

// MARK: - App header (mirrors `frontend/src/components/AppHeader.jsx`)

struct AppHeader<Trailing: View>: View {
    @EnvironmentObject var session: SessionStore
    var onSearchTap: (() -> Void)? = nil
    var onChangePinTap: (() -> Void)? = nil
    @ViewBuilder var trailing: () -> Trailing

    init(onSearchTap: (() -> Void)? = nil,
         onChangePinTap: (() -> Void)? = nil,
         @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }) {
        self.onSearchTap = onSearchTap
        self.onChangePinTap = onChangePinTap
        self.trailing = trailing
    }

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 9) {
                BrandLogo(size: 32, iconSize: 16, cornerRadius: 8)
                Text("مفكرتي")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.ink900)
            }

            if onSearchTap != nil {
                Button(action: { onSearchTap?() }) {
                    HStack(spacing: 6) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 12, weight: .medium))
                        Text("بحث")
                            .font(.system(size: 13))
                    }
                    .foregroundStyle(Theme.ink500)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Theme.ink50)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Theme.ink100, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 4)
            }

            Spacer(minLength: 0)

            trailing()

            Menu {
                if let onChangePinTap {
                    Button {
                        onChangePinTap()
                    } label: {
                        Label("تغيير الرقم السري", systemImage: "key")
                    }
                }
                Button(role: .destructive) {
                    session.logout()
                } label: {
                    Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Theme.ink600)
                    .padding(8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            ZStack {
                Color.white.opacity(0.85)
                Rectangle()
                    .fill(Theme.ink100)
                    .frame(height: 1)
                    .frame(maxHeight: .infinity, alignment: .bottom)
            }
            .background(.ultraThinMaterial)
        )
    }
}
