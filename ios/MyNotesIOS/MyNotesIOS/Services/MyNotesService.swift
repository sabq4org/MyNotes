import Foundation

// MARK: - Request bodies

struct LoginBody: Encodable { let pin: String }
struct ChangePinBody: Encodable { let currentPin: String; let newPin: String }

struct ProjectBody: Encodable {
    let name: String
    let description: String?
    let color: String?
    let icon: String?
}

struct NoteBody: Encodable {
    let title: String?
    let content: String?
    let isPinned: Bool?
    let tags: [String]?
}

// MARK: - Service (1-to-1 wrapper around `frontend/src/api/*.js`)

final class MyNotesService {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }

    // — Auth —
    func authStatus() async throws -> AuthStatus { try await api.get("auth/status") }
    func login(pin: String) async throws -> AuthResponse {
        try await api.post("auth/login", body: LoginBody(pin: pin))
    }
    func setup(pin: String) async throws -> AuthResponse {
        try await api.post("auth/setup", body: LoginBody(pin: pin))
    }
    func changePin(currentPin: String, newPin: String) async throws -> OKResponse {
        try await api.post("auth/change", body: ChangePinBody(currentPin: currentPin, newPin: newPin))
    }

    // — Projects —
    func projects() async throws -> [Project] {
        let env: ProjectsEnvelope = try await api.get("projects")
        return env.projects
    }
    func getProject(id: Int) async throws -> Project {
        let env: ProjectEnvelope = try await api.get("projects/\(id)")
        return env.project
    }
    func createProject(name: String,
                       description: String? = nil,
                       color: String = "#6366F1",
                       icon: String = "📝") async throws -> Project {
        let env: ProjectEnvelope = try await api.post(
            "projects",
            body: ProjectBody(name: name, description: description, color: color, icon: icon)
        )
        return env.project
    }
    func updateProject(id: Int,
                       name: String,
                       description: String?,
                       color: String?,
                       icon: String?) async throws -> Project {
        let env: ProjectEnvelope = try await api.patch(
            "projects/\(id)",
            body: ProjectBody(name: name, description: description, color: color, icon: icon)
        )
        return env.project
    }
    func deleteProject(id: Int) async throws {
        let _: EmptyResponse = try await api.delete("projects/\(id)")
    }

    // — Notes —
    func notes(projectId: Int) async throws -> [Note] {
        let env: NotesEnvelope = try await api.get("projects/\(projectId)/notes")
        return env.notes
    }
    func createNote(projectId: Int,
                    title: String = "",
                    content: String = "") async throws -> Note {
        let env: NoteEnvelope = try await api.post(
            "projects/\(projectId)/notes",
            body: NoteBody(title: title, content: content, isPinned: false, tags: [])
        )
        return env.note
    }
    func updateNote(_ id: Int,
                    title: String? = nil,
                    content: String? = nil,
                    isPinned: Bool? = nil,
                    tags: [String]? = nil) async throws -> Note {
        let env: NoteEnvelope = try await api.patch(
            "notes/\(id)",
            body: NoteBody(title: title, content: content, isPinned: isPinned, tags: tags)
        )
        return env.note
    }
    func deleteNote(_ id: Int) async throws {
        let _: EmptyResponse = try await api.delete("notes/\(id)")
    }

    // — Tags —
    func tags() async throws -> [NoteTag] {
        let env: TagsEnvelope = try await api.get("tags")
        return env.tags
    }
}
