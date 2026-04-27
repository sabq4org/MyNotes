import SwiftUI

// MARK: - Detail card (used by NotesView for the selected note)

struct NoteDetailCard: View {
    @ObservedObject var vm: NotesViewModel
    let note: Note
    let onDelete: () -> Void

    var body: some View {
        CardContainer(padding: 0, radius: 18) {
            VStack(spacing: 0) {
                NoteDetailHeader(vm: vm, note: note, onDelete: onDelete)

                Divider().background(Theme.ink100)

                Group {
                    if vm.mode == .edit {
                        NoteEditPane(vm: vm)
                    } else {
                        NoteReadPane(vm: vm, note: note)
                    }
                }
            }
        }
    }
}

// MARK: - Detail header

private struct NoteDetailHeader: View {
    @ObservedObject var vm: NotesViewModel
    let note: Note
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                if vm.mode == .edit {
                    TextField("عنوان الملاحظة", text: Binding(
                        get: { vm.draftTitle },
                        set: { vm.updateTitle($0) }
                    ))
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.ink900)
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(vm.draftTitle.trimmingCharacters(in: .whitespaces).isEmpty
                         ? "بلا عنوان" : vm.draftTitle)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(vm.draftTitle.isEmpty ? Theme.ink300 : Theme.ink900)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if vm.mode == .edit {
                    SaveStatusIndicator(status: vm.saveStatus)
                    Button {
                        Task { await vm.flushSave(); vm.mode = .view }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark").font(.system(size: 11, weight: .bold))
                            Text("تم").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Theme.brand600))
                    }
                    .buttonStyle(.plain)
                } else {
                    Button {
                        Task { await vm.togglePin(note) }
                    } label: {
                        Image(systemName: note.isPinned ? "pin.slash" : "pin")
                            .font(.system(size: 13))
                            .foregroundStyle(note.isPinned ? Theme.amber600 : Theme.ink500)
                            .padding(7)
                    }
                    .buttonStyle(.plain)

                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.ink500)
                            .padding(7)
                    }
                    .buttonStyle(.plain)

                    Button {
                        vm.mode = .edit
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "pencil").font(.system(size: 11, weight: .bold))
                            Text("تحرير").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Theme.brand600))
                    }
                    .buttonStyle(.plain)
                }
            }

            // Tags row (visible in both modes; editable in edit mode)
            if vm.mode == .edit {
                TagInputView(
                    tags: vm.draftTags,
                    suggestions: vm.allTags.map { $0.name },
                    onChange: { vm.updateTags($0) }
                )
            } else if !vm.draftTags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(vm.draftTags, id: \.self) { name in
                            TagChipView(
                                name: name,
                                size: .xs,
                                onTap: {
                                    let key = name.lowercased()
                                    vm.tagFilter = vm.tagFilter == key ? nil : key
                                }
                            )
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }
}

// MARK: - Read pane (HTML render)

private struct NoteReadPane: View {
    @ObservedObject var vm: NotesViewModel
    let note: Note
    @State private var contentHeight: CGFloat = 200

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if note.updatedAt != nil || note.createdAt != nil {
                HStack(spacing: 6) {
                    if let updated = note.updatedAt {
                        Text("آخر تحديث: ").foregroundStyle(Theme.ink400)
                        + Text(RelativeTime.format(updated)).foregroundStyle(Theme.ink600)
                    }
                    if let created = note.createdAt, created != note.updatedAt {
                        Text("·").foregroundStyle(Theme.ink300).padding(.horizontal, 2)
                        Text("أنشئت: ").foregroundStyle(Theme.ink400)
                        + Text(RelativeTime.format(created)).foregroundStyle(Theme.ink600)
                    }
                }
                .font(.system(size: 11))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.ink50.opacity(0.4))
            }

            NoteContentView(
                html: vm.draftContent,
                contentHeight: $contentHeight,
                onTaskToggle: { html in vm.updateContent(html) }
            )
            .frame(height: max(220, contentHeight))
        }
    }
}

// MARK: - Edit pane

private struct NoteEditPane: View {
    @ObservedObject var vm: NotesViewModel
    @FocusState private var bodyFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // We render a plain TextEditor in edit mode for fast typing; the
            // saved content is wrapped into HTML by the server via the
            // `asSimpleHTML` helper below. For long-form editing, the web's
            // rich-text Tiptap editor is the canonical surface.
            ZStack(alignment: .topLeading) {
                if textRepresentation.isEmpty {
                    Text("ابدأ الكتابة هنا…")
                        .foregroundStyle(Theme.ink300)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 14)
                }
                TextEditor(text: editorBinding)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.ink900)
                    .scrollContentBackground(.hidden)
                    .focused($bodyFocused)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
            }
            .frame(minHeight: 260)
            .background(Color.white)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("تم") { bodyFocused = false }
            }
        }
        .onAppear { bodyFocused = true }
    }

    private var textRepresentation: String {
        vm.draftContent.htmlStripped
    }

    private var editorBinding: Binding<String> {
        Binding(
            get: { textRepresentation },
            set: { newValue in
                vm.updateContent(newValue.asSimpleHTML)
            }
        )
    }
}

// MARK: - Save status indicator

private struct SaveStatusIndicator: View {
    let status: NotesViewModel.SaveStatus
    var body: some View {
        switch status {
        case .saving:
            HStack(spacing: 4) {
                ProgressView().scaleEffect(0.6).frame(width: 14, height: 14)
                Text("جاري الحفظ").font(.system(size: 11)).foregroundStyle(Theme.ink500)
            }
        case .saved:
            HStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green).font(.system(size: 12))
                Text("تم الحفظ").font(.system(size: 11)).foregroundStyle(Theme.ink500)
            }
        case .error:
            HStack(spacing: 4) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Theme.rose600).font(.system(size: 12))
                Text("فشل الحفظ").font(.system(size: 11)).foregroundStyle(Theme.rose600)
            }
        case .idle: EmptyView()
        }
    }
}

// MARK: - Tag input (chips + suggestions)

struct TagInputView: View {
    let tags: [String]
    let suggestions: [String]
    let onChange: ([String]) -> Void

    @State private var draft: String = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            FlowLayout(spacing: 6) {
                ForEach(tags, id: \.self) { name in
                    TagChipView(
                        name: name,
                        size: .xs,
                        onRemove: {
                            onChange(tags.filter { $0 != name })
                        }
                    )
                }
                HStack(spacing: 4) {
                    Image(systemName: "tag")
                        .font(.system(size: 10))
                        .foregroundStyle(Theme.ink400)
                    TextField("أضف وسم…", text: $draft)
                        .font(.system(size: 12))
                        .submitLabel(.done)
                        .focused($focused)
                        .onSubmit { commit() }
                        .frame(minWidth: 70)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule().stroke(Theme.ink200, lineWidth: 1)
                )
            }

            if !filteredSuggestions.isEmpty && focused {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(filteredSuggestions, id: \.self) { name in
                            Button {
                                add(name)
                            } label: {
                                Text("#\(name)")
                                    .font(.system(size: 11, weight: .medium))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Capsule().fill(Theme.ink50))
                                    .overlay(Capsule().stroke(Theme.ink200, lineWidth: 1))
                                    .foregroundStyle(Theme.ink700)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var filteredSuggestions: [String] {
        let lower = draft.trimmingCharacters(in: .whitespaces).lowercased()
        return suggestions
            .filter { !tags.contains($0) }
            .filter { lower.isEmpty || $0.lowercased().contains(lower) }
            .prefix(8)
            .map { $0 }
    }

    private func commit() {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        add(trimmed)
    }

    private func add(_ name: String) {
        let normalized = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty, !tags.contains(normalized) else {
            draft = ""; return
        }
        onChange(tags + [normalized])
        draft = ""
    }
}

// MARK: - Tiny flow layout used by tag input

struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        let rows = arrange(subviews: subviews, in: width)
        let h = rows.map { $0.height }.reduce(0, +) + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: width.isFinite ? width : 0, height: h)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = arrange(subviews: subviews, in: bounds.width)
        var y = bounds.minY
        for row in rows {
            var x = bounds.maxX
            for item in row.items {
                x -= item.size.width
                item.subview.place(at: CGPoint(x: x, y: y),
                                   proposal: ProposedViewSize(item.size))
                x -= spacing
            }
            y += row.height + spacing
        }
    }

    private func arrange(subviews: Subviews, in width: CGFloat) -> [Row] {
        var rows: [Row] = []
        var current = Row(items: [], height: 0)
        var x: CGFloat = 0

        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if x + size.width > width, !current.items.isEmpty {
                rows.append(current)
                current = Row(items: [], height: 0)
                x = 0
            }
            current.items.append(.init(subview: sv, size: size))
            current.height = max(current.height, size.height)
            x += size.width + spacing
        }
        if !current.items.isEmpty { rows.append(current) }
        return rows
    }

    struct Item { let subview: LayoutSubview; let size: CGSize }
    struct Row { var items: [Item]; var height: CGFloat }
}
