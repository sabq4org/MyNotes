import SwiftUI

struct NotesView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var vm: NotesViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var pendingDelete: Note?
    @State private var changePinOpen = false

    init(project: Project) {
        _vm = StateObject(wrappedValue: NotesViewModel(project: project))
    }

    var body: some View {
        ZStack {
            BrandedBackground()

            VStack(spacing: 0) {
                AppHeader(onChangePinTap: { changePinOpen = true })

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        Breadcrumb(project: vm.project, onBack: { dismiss() })
                        notesPanel
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 14)
                    .padding(.bottom, 24)
                }
                .refreshable { await vm.load() }
            }
        }
        .navigationBarHidden(true)
        .task { await vm.load() }
        .sheet(isPresented: $changePinOpen) { ChangePinSheet() }
        .alert("حذف الملاحظة",
               isPresented: Binding(get: { pendingDelete != nil },
                                    set: { if !$0 { pendingDelete = nil } })) {
            Button("إلغاء", role: .cancel) {}
            Button("حذف", role: .destructive) {
                if let target = pendingDelete {
                    Task { await vm.deleteNote(target); pendingDelete = nil }
                }
            }
        } message: {
            if let target = pendingDelete {
                let title = target.title.isEmpty ? "بلا عنوان" : target.title
                Text("هل تريد حذف \"\(title)\"؟ لا يمكن التراجع.")
            }
        }
    }

    // MARK: - Layout

    @ViewBuilder
    private var notesPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            NotesSidebar(
                vm: vm,
                onCreate: { Task { await vm.createNote() } },
                onSelect: { note in vm.select(note) },
                onTogglePin: { note in Task { await vm.togglePin(note) } },
                onDelete: { note in pendingDelete = note }
            )
            .frame(minHeight: 240)

            if let selected = vm.selectedNote {
                NoteDetailCard(
                    vm: vm,
                    note: selected,
                    onDelete: { pendingDelete = selected }
                )
            } else {
                EmptyDetailCard(hasNotes: !vm.notes.isEmpty,
                                onCreate: { Task { await vm.createNote() } })
            }
        }
    }
}

// MARK: - Breadcrumb

struct Breadcrumb: View {
    let project: Project
    let onBack: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onBack) {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .semibold))
                    Text("المشاريع")
                        .font(.system(size: 13))
                }
                .foregroundStyle(Theme.ink600)
            }
            .buttonStyle(.plain)

            Text("/")
                .foregroundStyle(Theme.ink300)
                .font(.system(size: 13))

            HStack(spacing: 7) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color(cssHex: project.color))
                    Text(project.displayGlyph)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                }
                .frame(width: 26, height: 26)

                Text(project.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.ink900)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Sidebar

struct NotesSidebar: View {
    @ObservedObject var vm: NotesViewModel
    let onCreate: () -> Void
    let onSelect: (Note) -> Void
    let onTogglePin: (Note) -> Void
    let onDelete: (Note) -> Void

    var body: some View {
        CardContainer(padding: 0, radius: 18) {
            VStack(alignment: .leading, spacing: 0) {
                // Header (count + new button)
                HStack {
                    HStack(spacing: 4) {
                        Text("الملاحظات").font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.ink700)
                        Text("(\(vm.notes.count))").font(.system(size: 12))
                            .foregroundStyle(Theme.ink400)
                    }
                    Spacer()
                    Button(action: onCreate) {
                        HStack(spacing: 5) {
                            Image(systemName: "plus").font(.system(size: 12, weight: .bold))
                            Text("جديدة").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 11)
                        .padding(.vertical, 7)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Theme.brand600)
                        )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
                .padding(.bottom, 10)

                // Search
                searchBox.padding(.horizontal, 14)

                // Tag chips
                if !vm.projectTags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(vm.projectTags.prefix(12), id: \.name) { tag in
                                let key = tag.name.lowercased()
                                let isActive = vm.tagFilter == key
                                TagChipView(
                                    name: tag.name,
                                    size: .xs,
                                    active: isActive,
                                    onTap: {
                                        vm.tagFilter = isActive ? nil : key
                                    }
                                )
                            }
                            if vm.tagFilter != nil {
                                Button("مسح الفلتر") {
                                    vm.tagFilter = nil
                                }
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.ink500)
                            }
                        }
                        .padding(.horizontal, 14)
                    }
                    .padding(.top, 10)
                }

                Divider()
                    .background(Theme.ink100)
                    .padding(.top, 12)

                // Note rows
                if vm.filteredNotes.isEmpty {
                    Text(vm.search.isEmpty
                         ? "لا توجد ملاحظات بعد. اضغط \"جديدة\" لإنشاء أوّل ملاحظة."
                         : "لا نتائج تطابق بحثك.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.ink400)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 28)
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(vm.filteredNotes) { note in
                            NoteListItemView(
                                note: note,
                                isActive: note.id == vm.selectedId,
                                onSelect: { onSelect(note) },
                                onTogglePin: { onTogglePin(note) },
                                onDelete: { onDelete(note) }
                            )
                        }
                    }
                    .padding(8)
                }
            }
        }
    }

    private var searchBox: some View {
        HStack(spacing: 6) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.ink400)
                .font(.system(size: 12))
            TextField("ابحث في الملاحظات…", text: $vm.search)
                .font(.system(size: 13))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Theme.ink200, lineWidth: 1)
        )
    }
}

// MARK: - Note row in sidebar

struct NoteListItemView: View {
    let note: Note
    let isActive: Bool
    let onSelect: () -> Void
    let onTogglePin: () -> Void
    let onDelete: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 5) {
                        if note.isPinned {
                            Image(systemName: "pin.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(Theme.brand500)
                        }
                        Text(note.title.trimmingCharacters(in: .whitespaces).isEmpty
                             ? "بلا عنوان" : note.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(isActive ? Theme.brand900 : Theme.ink900)
                            .lineLimit(1)
                    }
                    Text(previewText)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.ink500)
                        .lineLimit(1)
                    if let tags = note.tags, !tags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 4) {
                                ForEach(tags.prefix(3)) { tag in
                                    TagChipView(name: tag.name, size: .xs)
                                }
                                if tags.count > 3 {
                                    Text("+\(tags.count - 3)")
                                        .font(.system(size: 10))
                                        .foregroundStyle(Theme.ink400)
                                }
                            }
                        }
                    }
                    if let updated = note.updatedAt {
                        Text(RelativeTime.format(updated))
                            .font(.system(size: 10))
                            .foregroundStyle(Theme.ink400)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(spacing: 2) {
                    Button(action: onTogglePin) {
                        Image(systemName: note.isPinned ? "pin.fill" : "pin")
                            .font(.system(size: 11))
                            .foregroundStyle(note.isPinned ? Theme.amber600 : Theme.ink400)
                            .padding(4)
                    }
                    .buttonStyle(.plain)
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.ink400)
                            .padding(4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(isActive ? Theme.brand50 : Color.white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isActive ? Theme.brand200 : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var previewText: String {
        let stripped = note.content.htmlStripped
        if stripped.isEmpty { return "لا يوجد محتوى" }
        return String(stripped.prefix(80))
    }
}

// MARK: - Empty detail card

private struct EmptyDetailCard: View {
    let hasNotes: Bool
    let onCreate: () -> Void
    var body: some View {
        CardContainer(padding: 36, radius: 18) {
            VStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Theme.brand50)
                        .frame(width: 50, height: 50)
                    Image(systemName: hasNotes ? "doc.text" : "note.text.badge.plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Theme.brand600)
                }
                Text(hasNotes ? "اختر ملاحظة" : "لا توجد ملاحظات بعد")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.ink900)
                Text(hasNotes
                     ? "اختر ملاحظة من القائمة، أو أنشئ واحدة جديدة."
                     : "ابدأ بإنشاء أوّل ملاحظة في هذا المشروع.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.ink500)
                    .multilineTextAlignment(.center)
                Button {
                    onCreate()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus").font(.system(size: 12, weight: .bold))
                        Text("ملاحظة جديدة")
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
