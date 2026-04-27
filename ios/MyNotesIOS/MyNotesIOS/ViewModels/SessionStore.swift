import Foundation

@MainActor
final class SessionStore: ObservableObject {
    enum State: Equatable {
        case loading
        case needsSetup
        case needsLogin
        case authenticated
    }

    @Published var state: State = .loading
    @Published var errorMessage: String?
    @Published var isWorking = false

    private let service: MyNotesService
    private let api: APIClient

    init(api: APIClient) {
        self.api = api
        self.service = MyNotesService(api: api)
        Task { await bootstrap() }
    }

    func bootstrap() async {
        state = .loading
        do {
            let status = try await service.authStatus()
            if api.token != nil {
                state = .authenticated
            } else {
                state = status.isSetup ? .needsLogin : .needsSetup
            }
        } catch {
            errorMessage = error.localizedDescription
            state = api.token == nil ? .needsLogin : .authenticated
        }
    }

    func submit(pin: String) async {
        let clean = pin.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count >= 4 else {
            errorMessage = "الرقم السري يجب أن يكون 4 خانات على الأقل."
            return
        }
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            let response: AuthResponse
            if state == .needsSetup {
                response = try await service.setup(pin: clean)
            } else {
                response = try await service.login(pin: clean)
            }
            api.token = response.token
            state = .authenticated
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func changePin(currentPin: String, newPin: String) async throws {
        _ = try await service.changePin(currentPin: currentPin, newPin: newPin)
    }

    func logout() {
        api.clearSession()
        state = .needsLogin
    }
}
