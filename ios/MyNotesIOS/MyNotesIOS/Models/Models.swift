import Foundation

// MARK: - Auth

struct AuthStatus: Codable {
    let isSetup: Bool
}

struct AuthResponse: Codable {
    let ok: Bool
    let token: String
    let expiresInHours: Int?
}

// MARK: - Project / Note / Tag (mirror server JSON exactly)

struct Project: Identifiable, Codable, Hashable {
    let id: Int
    var name: String
    var description: String?
    var color: String?
    var icon: String?
    var position: Int?
    var notesCount: Int?
    var createdAt: String?
    var updatedAt: String?

    /// Single-character fallback used by the project icon-tile when the user
    /// hasn't picked an emoji. Mirrors web's `project.name.slice(0,1).toUpperCase()`.
    var fallbackInitial: String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return String(trimmed.prefix(1)).uppercased()
    }

    /// Glyph that renders inside the colored tile — emoji if the user picked
    /// one, otherwise the first letter of the name (matches the web).
    var displayGlyph: String {
        if let icon, !icon.isEmpty { return icon }
        return fallbackInitial.isEmpty ? "📝" : fallbackInitial
    }
}

struct NoteTag: Identifiable, Codable, Hashable {
    let id: Int
    let name: String
}

struct Note: Identifiable, Codable, Hashable {
    let id: Int
    let projectId: Int
    var title: String
    var content: String
    var isPinned: Bool
    var tags: [NoteTag]?
    var createdAt: String?
    var updatedAt: String?
}

// MARK: - Server envelopes

struct ProjectsEnvelope: Codable { let projects: [Project] }
struct ProjectEnvelope: Codable { let project: Project }
struct NotesEnvelope: Codable { let notes: [Note] }
struct NoteEnvelope: Codable { let note: Note }
struct TagsEnvelope: Codable { let tags: [NoteTag] }

struct APIErrorEnvelope: Codable {
    let error: String?
    let message: String?
}

struct OKResponse: Codable { let ok: Bool? }
