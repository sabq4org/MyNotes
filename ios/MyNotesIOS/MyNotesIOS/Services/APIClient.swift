import Foundation

final class APIClient {
    static let shared = APIClient()

    /// Live API for the `mynotes` web app on Vercel.
    var baseURL = URL(string: "https://my-notes-kohl-nine.vercel.app/api")!
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    var token: String? {
        get { UserDefaults.standard.string(forKey: "mynotes.session.token") }
        set { UserDefaults.standard.set(newValue, forKey: "mynotes.session.token") }
    }

    private init() {
        decoder = JSONDecoder()
        encoder = JSONEncoder()
    }

    func clearSession() { token = nil }

    // MARK: - Verbs

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "GET", body: Optional<Data>.none)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let data = try encoder.encode(body)
        return try await request(path, method: "POST", body: data)
    }

    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let data = try encoder.encode(body)
        return try await request(path, method: "PATCH", body: data)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "DELETE", body: Optional<Data>.none)
    }

    private func request<T: Decodable>(_ path: String, method: String, body: Data?) async throws -> T {
        let trimmed = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let url = baseURL.appendingPathComponent(trimmed)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIClientError.invalidResponse }
        guard 200..<300 ~= http.statusCode else {
            let envelope = try? decoder.decode(APIErrorEnvelope.self, from: data)
            let message = envelope?.message
                ?? envelope?.error
                ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            if http.statusCode == 401 { APIClient.shared.clearSession() }
            throw APIClientError.server(status: http.statusCode, message: message)
        }
        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }
        if data.isEmpty {
            // Some endpoints (DELETE) return no body — provide a default empty value.
            if let empty = "{}".data(using: .utf8),
               let decoded = try? decoder.decode(T.self, from: empty) {
                return decoded
            }
            throw APIClientError.invalidResponse
        }
        return try decoder.decode(T.self, from: data)
    }
}

struct EmptyResponse: Codable {}

enum APIClientError: LocalizedError {
    case invalidResponse
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "استجابة غير صالحة من الخادم."
        case .server(_, let message): return message
        }
    }
}
