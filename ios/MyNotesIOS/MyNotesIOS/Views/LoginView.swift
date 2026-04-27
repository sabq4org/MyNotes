import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: SessionStore
    let isSetup: Bool

    @State private var pin = ""
    @State private var confirm = ""
    @State private var localError: String?
    @FocusState private var focused: Field?

    enum Field { case pin, confirm }

    var body: some View {
        ZStack {
            BrandedBackground()
            ScrollView {
                VStack(spacing: 26) {
                    Spacer().frame(height: 30)
                    BrandHeader()

                    CardContainer(padding: 24, radius: 22) {
                        VStack(alignment: .leading, spacing: 14) {
                            Text(isSetup ? "أهلاً بك! اختر رقمك السري" : "مرحباً بعودتك")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Theme.ink900)

                            Text(subtitle)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.ink500)
                                .lineSpacing(2)

                            VStack(alignment: .leading, spacing: 8) {
                                Text("الرقم السري")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Theme.ink700)
                                PinField(text: $pin, placeholder: "الرقم السري")
                                    .focused($focused, equals: .pin)
                            }
                            .padding(.top, 6)

                            if isSetup {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("أعد إدخال الرقم")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(Theme.ink700)
                                    PinField(text: $confirm, placeholder: "تأكيد الرقم")
                                        .focused($focused, equals: .confirm)
                                }
                            }

                            if let message = displayedError {
                                ErrorBanner(message: message)
                            }

                            Button {
                                Task { await submit() }
                            } label: {
                                HStack(spacing: 8) {
                                    if session.isWorking {
                                        ProgressView().tint(.white)
                                    }
                                    Text(isSetup ? "إنشاء الرقم والدخول" : "دخول")
                                    Image(systemName: "arrow.left")
                                        .font(.system(size: 13, weight: .semibold))
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle(fullWidth: true))
                            .disabled(!canSubmit)
                            .opacity(canSubmit ? 1 : 0.5)
                            .padding(.top, 6)
                        }
                    }
                    .frame(maxWidth: 420)

                    Text("المساحة الشخصية لمشاريعك وملاحظاتك")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.ink400)
                        .padding(.top, 6)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
                .frame(maxWidth: .infinity)
            }
        }
        .onAppear {
            // Slight delay so the keyboard doesn't fight the entrance animation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                focused = .pin
            }
        }
    }

    private var subtitle: String {
        isSetup
            ? "هذا هو رقمك الشخصي للدخول إلى مفكرتك. لا يمكن استرداده، فاحفظه جيداً."
            : "أدخل رقمك السري للدخول إلى مفكرتك."
    }

    private var displayedError: String? {
        localError ?? session.errorMessage
    }

    private var canSubmit: Bool {
        guard !session.isWorking else { return false }
        if isSetup { return pin.count >= 4 && pin == confirm }
        return pin.count >= 4
    }

    private func submit() async {
        localError = nil
        if isSetup {
            guard pin.count >= 4 else {
                localError = "الرقم السري يجب أن يكون 4 خانات على الأقل."; return
            }
            guard pin == confirm else {
                localError = "الرقم السري غير متطابق."; return
            }
        }
        await session.submit(pin: pin)
    }
}

// MARK: - Header (logo + title + tagline)

private struct BrandHeader: View {
    var body: some View {
        VStack(spacing: 10) {
            BrandLogo(size: 60)
            Text("مفكرتي")
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(Theme.ink900)
            Text("المساحة الشخصية لمشاريعك وملاحظاتك")
                .font(.system(size: 13))
                .foregroundStyle(Theme.ink500)
        }
    }
}

// MARK: - Inline error banner (matches `bg-rose-50 border-rose-100 rounded-lg`)

struct ErrorBanner: View {
    let message: String
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Theme.rose600)
                .font(.system(size: 14))
            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(Theme.rose600)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Theme.rose50)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Theme.rose600.opacity(0.18), lineWidth: 1)
        )
    }
}

// MARK: - PIN field — text-tracked monospace box matching `PinInput.jsx`

struct PinField: View {
    @Binding var text: String
    var placeholder: String
    @State private var visible = false
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: 8) {
            Group {
                if visible {
                    TextField(placeholder, text: $text)
                        .keyboardType(.numberPad)
                        .textContentType(.password)
                } else {
                    SecureField(placeholder, text: $text)
                        .keyboardType(.numberPad)
                        .textContentType(.password)
                }
            }
            .font(.system(size: 18, weight: .medium, design: .rounded).monospacedDigit())
            .multilineTextAlignment(.center)
            .environment(\.layoutDirection, .leftToRight)
            .focused($isFocused)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity)

            Button {
                visible.toggle()
            } label: {
                Image(systemName: visible ? "eye.slash" : "eye")
                    .foregroundStyle(Theme.ink400)
                    .padding(.horizontal, 10)
            }
            .buttonStyle(.plain)
        }
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(isFocused ? Theme.brand400 : Theme.ink200, lineWidth: 1)
        )
        .shadow(color: isFocused ? Theme.brand500.opacity(0.18) : .clear,
                radius: isFocused ? 8 : 0, x: 0, y: 0)
        .animation(.easeOut(duration: 0.15), value: isFocused)
    }
}

/// Used by the change-PIN modal to bind to the same component above.
extension PinField {
    init(text: Binding<String>) { self.init(text: text, placeholder: "الرقم السري") }
}
