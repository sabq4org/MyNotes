import Foundation

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Form state used by the new/edit modal
    @Published var formOpen = false
    @Published var formMode: FormMode = .create
    @Published var editingProject: Project? = nil
    @Published var formName = ""
    @Published var formDescription = ""
    @Published var formColor = "#6366F1"
    @Published var formIcon = "📝"
    @Published var formBusy = false
    @Published var formError: String?

    enum FormMode { case create, edit }

    private let service = MyNotesService()

    // MARK: - Loading

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            projects = try await service.projects()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Form handling

    func openCreate() {
        formMode = .create
        editingProject = nil
        formName = ""
        formDescription = ""
        formColor = Theme.projectPalette.first ?? "#6366F1"
        formIcon = Theme.projectIcons.first ?? "📝"
        formError = nil
        formOpen = true
    }

    func openEdit(_ project: Project) {
        formMode = .edit
        editingProject = project
        formName = project.name
        formDescription = project.description ?? ""
        formColor = project.color ?? "#6366F1"
        formIcon = project.icon ?? "📝"
        formError = nil
        formOpen = true
    }

    func submitForm() async {
        let trimmedName = formName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            formError = "اسم المشروع مطلوب."
            return
        }
        formBusy = true
        formError = nil
        defer { formBusy = false }
        do {
            switch formMode {
            case .create:
                let project = try await service.createProject(
                    name: trimmedName,
                    description: formDescription.isEmpty ? nil : formDescription,
                    color: formColor,
                    icon: formIcon
                )
                projects.append(project)
            case .edit:
                guard let editing = editingProject else { return }
                let project = try await service.updateProject(
                    id: editing.id,
                    name: trimmedName,
                    description: formDescription.isEmpty ? nil : formDescription,
                    color: formColor,
                    icon: formIcon
                )
                if let idx = projects.firstIndex(where: { $0.id == project.id }) {
                    projects[idx] = project
                }
            }
            formOpen = false
        } catch {
            formError = error.localizedDescription
        }
    }

    // MARK: - Delete

    func delete(_ project: Project) async {
        do {
            try await service.deleteProject(id: project.id)
            projects.removeAll { $0.id == project.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
