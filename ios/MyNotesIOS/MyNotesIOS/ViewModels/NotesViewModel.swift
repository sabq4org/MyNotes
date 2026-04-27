import Foundation

@MainActor
final class NotesViewModel: ObservableObject {
    // Source data
    @Published var notes: [Note] = []
    @Published var allTags: [NoteTag] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Selection / draft (matches `frontend/src/pages/ProjectPage.jsx`)
    @Published var selectedId: Int?
    @Published var draftTitle: String = ""
    @Published var draftContent: String = ""
    @Published var draftTags: [String] = []
    @Published var mode: EditorMode = .view

    // Sidebar filters
    @Published var search: String = ""
    @Published var tagFilter: String? = nil   // lowercase tag name

    // Auto-save status
    @Published var saveStatus: SaveStatus = .idle
    @Published var saveError: String?

    enum EditorMode { case view, edit }
    enum SaveStatus { case idle, saving, saved, error }

    let project: Project
    private let service = MyNotesService()
    private var saveTask: Task<Void, Never>?

    init(project: Project) {
        self.project = project
    }

    // MARK: - Loading

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let notesTask = service.notes(projectId: project.id)
            async let tagsTask  = (try? service.tags()) ?? []
            let (loadedNotes, loadedTags) = try await (notesTask, tagsTask)
            notes = loadedNotes.sorted(by: NotesViewModel.sort)
            allTags = loadedTags
            if selectedId == nil, let first = notes.first {
                select(first, openEditor: false)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Selection

    var selectedNote: Note? {
        guard let id = selectedId else { return nil }
        return notes.first(where: { $0.id == id })
    }

    func select(_ note: Note, openEditor: Bool = true) {
        Task { await flushSave() }
        selectedId = note.id
        draftTitle = note.title
        draftContent = note.content
        draftTags = (note.tags ?? []).map { $0.name }
        mode = .view
        if openEditor {
            // No-op on iPhone navigation since the View handles routing.
        }
    }

    // MARK: - Draft mutations + debounced auto-save

    func updateTitle(_ value: String) {
        draftTitle = value
        scheduleSave()
    }

    func updateContent(_ html: String) {
        draftContent = html
        scheduleSave()
    }

    func updateTags(_ tags: [String]) {
        draftTags = tags
        scheduleSave()
    }

    private func scheduleSave() {
        guard let id = selectedId else { return }
        let title = draftTitle
        let content = draftContent
        let tags = draftTags
        saveTask?.cancel()
        saveStatus = .saving
        saveTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 700_000_000)
            if Task.isCancelled { return }
            await self?.commitSave(noteID: id, title: title, content: content, tags: tags)
        }
    }

    /// Flushes any pending save immediately. Called when switching notes or
    /// leaving edit mode so the user never loses in-flight edits.
    func flushSave() async {
        guard let id = selectedId else { return }
        if let task = saveTask {
            task.cancel()
            saveTask = nil
        }
        await commitSave(
            noteID: id,
            title: draftTitle,
            content: draftContent,
            tags: draftTags
        )
    }

    private func commitSave(noteID: Int, title: String, content: String, tags: [String]) async {
        saveStatus = .saving
        do {
            let updated = try await service.updateNote(
                noteID,
                title: title,
                content: content,
                tags: tags
            )
            applyUpdated(updated)
            // Tag set may have shifted — refresh the suggestions in the
            // background so the chip palette stays in sync.
            Task { try? await self.refreshTags() }
            saveStatus = .saved
        } catch {
            saveStatus = .error
            saveError = error.localizedDescription
        }
    }

    private func refreshTags() async throws {
        allTags = try await service.tags()
    }

    private func applyUpdated(_ updated: Note) {
        if let idx = notes.firstIndex(where: { $0.id == updated.id }) {
            notes[idx] = updated
        }
        notes.sort(by: NotesViewModel.sort)
    }

    // MARK: - Pin / Delete / Create

    func togglePin(_ note: Note) async {
        do {
            let updated = try await service.updateNote(note.id, isPinned: !note.isPinned)
            applyUpdated(updated)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteSelected() async {
        guard let id = selectedId else { return }
        do {
            try await service.deleteNote(id)
            notes.removeAll { $0.id == id }
            selectedId = nil
            draftTitle = ""; draftContent = ""; draftTags = []
            try? await refreshTags()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteNote(_ note: Note) async {
        do {
            try await service.deleteNote(note.id)
            notes.removeAll { $0.id == note.id }
            if selectedId == note.id {
                selectedId = nil
                draftTitle = ""; draftContent = ""; draftTags = []
            }
            try? await refreshTags()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createNote() async -> Note? {
        await flushSave()
        do {
            let new = try await service.createNote(projectId: project.id)
            notes.insert(new, at: 0)
            notes.sort(by: NotesViewModel.sort)
            select(new, openEditor: true)
            mode = .edit
            return new
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    // MARK: - Filtering

    /// Notes after applying search query and tag filter, with the live draft
    /// substituted for the currently-selected note (so typing reflects in
    /// the sidebar instantly, just like the web).
    var filteredNotes: [Note] {
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let live = notes.map { note -> Note in
            guard note.id == selectedId else { return note }
            var copy = note
            copy.title = draftTitle
            copy.content = draftContent
            copy.tags = draftTags.enumerated().map { NoteTag(id: -($0 + 1), name: $1) }
            return copy
        }
        return live.filter { note in
            if let tagFilter, !(note.tags ?? []).contains(where: { $0.name.lowercased() == tagFilter }) {
                return false
            }
            if q.isEmpty { return true }
            let title = note.title.lowercased()
            let content = note.content.htmlStripped.lowercased()
            let tagText = (note.tags ?? []).map { $0.name }.joined(separator: " ").lowercased()
            return title.contains(q) || content.contains(q) || tagText.contains(q)
        }
    }

    /// Distinct tags within this project, sorted by usage frequency. Mirrors
    /// the chip strip the web shows above the notes search box.
    var projectTags: [(name: String, count: Int)] {
        var map: [String: (name: String, count: Int)] = [:]
        for note in notes {
            for tag in (note.tags ?? []) {
                let key = tag.name.lowercased()
                let prev = map[key] ?? (name: tag.name, count: 0)
                map[key] = (name: tag.name, count: prev.count + 1)
            }
        }
        return map.values.sorted { lhs, rhs in
            if lhs.count != rhs.count { return lhs.count > rhs.count }
            return lhs.name.localizedCompare(rhs.name) == .orderedAscending
        }
    }

    // MARK: - Sorting helper (pinned first, then most-recently-updated)

    static func sort(_ a: Note, _ b: Note) -> Bool {
        if a.isPinned != b.isPinned { return a.isPinned }
        return (a.updatedAt ?? "") > (b.updatedAt ?? "")
    }
}
