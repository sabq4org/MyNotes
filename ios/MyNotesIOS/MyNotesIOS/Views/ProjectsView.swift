import SwiftUI

struct ProjectsView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var vm = ProjectsViewModel()

    @State private var pendingDelete: Project?
    @State private var changePinOpen = false

    var body: some View {
        NavigationStack {
            ZStack {
                BrandedBackground()

                VStack(spacing: 0) {
                    AppHeader(
                        onChangePinTap: { changePinOpen = true }
                    )

                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            DashboardHeading(
                                count: vm.projects.count,
                                isLoading: vm.isLoading,
                                onRefresh: { Task { await vm.load() } },
                                onCreate: { vm.openCreate() }
                            )

                            if let message = vm.errorMessage {
                                ErrorBanner(message: message)
                            }

                            if vm.isLoading && vm.projects.isEmpty {
                                CardContainer(padding: 36) {
                                    HStack { Spacer(); ProgressView().tint(Theme.brand600); Spacer() }
                                }
                            } else if vm.projects.isEmpty {
                                EmptyProjectsCard(onCreate: { vm.openCreate() })
                            } else {
                                LazyVGrid(
                                    columns: [GridItem(.flexible(), spacing: 14)],
                                    spacing: 14
                                ) {
                                    ForEach(vm.projects) { project in
                                        NavigationLink(value: project) {
                                            ProjectCard(
                                                project: project,
                                                onEdit: { vm.openEdit(project) },
                                                onDelete: { pendingDelete = project }
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.top, 18)
                        .padding(.bottom, 60)
                    }
                    .refreshable { await vm.load() }
                }
            }
            .navigationDestination(for: Project.self) { project in
                NotesView(project: project)
            }
            .navigationBarHidden(true)
            .task { await vm.load() }
            .sheet(isPresented: $vm.formOpen) {
                ProjectFormSheet(vm: vm)
            }
            .sheet(isPresented: $changePinOpen) {
                ChangePinSheet()
            }
            .alert("حذف المشروع",
                   isPresented: Binding(get: { pendingDelete != nil },
                                        set: { if !$0 { pendingDelete = nil } })) {
                Button("إلغاء", role: .cancel) {}
                Button("نعم، احذف", role: .destructive) {
                    if let project = pendingDelete {
                        Task { await vm.delete(project); pendingDelete = nil }
                    }
                }
            } message: {
                if let project = pendingDelete {
                    Text("سيتم حذف مشروع \"\(project.name)\" وجميع ملاحظاته بشكل دائم.")
                }
            }
        }
    }
}

// MARK: - Heading row (matches "مشاريعي" + count + actions)

private struct DashboardHeading: View {
    let count: Int
    let isLoading: Bool
    let onRefresh: () -> Void
    let onCreate: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("مشاريعي")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(Theme.ink900)
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.ink500)
            }

            Spacer(minLength: 0)

            Button(action: onRefresh) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .medium))
                    .rotationEffect(.degrees(isLoading ? 360 : 0))
                    .animation(isLoading ? .linear(duration: 1).repeatForever(autoreverses: false) : .default,
                               value: isLoading)
            }
            .buttonStyle(GhostButtonStyle())
            .disabled(isLoading)

            Button(action: onCreate) {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .bold))
                    Text("مشروع جديد")
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }

    private var subtitle: String {
        if count == 0 { return "كل أفكارك في مكان واحد. ابدأ بإنشاء مشروع." }
        if count == 1 { return "لديك مشروع واحد." }
        return "لديك \(count) مشاريع."
    }
}

// MARK: - Empty state card

private struct EmptyProjectsCard: View {
    let onCreate: () -> Void
    var body: some View {
        CardContainer(padding: 36, radius: 22) {
            VStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Theme.brand50)
                        .frame(width: 56, height: 56)
                    Image(systemName: "folder.badge.plus")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(Theme.brand600)
                }
                Text("لا توجد مشاريع بعد")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.ink900)
                Text("ابدأ بإنشاء أول مشروع لك. كل مشروع هو مجلّد يحتوي ملاحظاتك ومهامك المتعلقة بفكرة معينة.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.ink500)
                    .multilineTextAlignment(.center)
                Button("إنشاء أول مشروع", action: onCreate)
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top, 4)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - ProjectCard (mirrors `ProjectCard.jsx`)

struct ProjectCard: View {
    let project: Project
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var menuOpen = false

    var body: some View {
        CardContainer(padding: 16, radius: 18) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color(cssHex: project.color))
                        Text(project.displayGlyph)
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    .frame(width: 48, height: 48)
                    .shadow(color: Color.black.opacity(0.06), radius: 4, x: 0, y: 2)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(project.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.ink900)
                            .lineLimit(1)
                        if let description = project.description, !description.isEmpty {
                            Text(description)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.ink500)
                                .lineLimit(2)
                        } else {
                            Text("بلا وصف")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.ink400)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Menu {
                        Button {
                            onEdit()
                        } label: {
                            Label("تعديل", systemImage: "pencil")
                        }
                        Button(role: .destructive) {
                            onDelete()
                        } label: {
                            Label("حذف", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.ink400)
                            .padding(8)
                            .contentShape(Rectangle())
                    }
                    .onTapGesture { /* swallow card tap */ }
                }

                HStack(spacing: 6) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.ink500)
                    Text("\(project.notesCount ?? 0) ملاحظة")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.ink500)
                }
            }
        }
    }
}

// MARK: - Project new/edit sheet (mirrors `ProjectFormModal.jsx`)

struct ProjectFormSheet: View {
    @ObservedObject var vm: ProjectsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                BrandedBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(vm.formMode == .create ? "مشروع جديد" : "تعديل المشروع")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundStyle(Theme.ink900)
                            Text("اختَر اسماً، لوناً، وأيقونة لتمييز المشروع.")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.ink500)
                        }

                        VStack(alignment: .leading, spacing: 14) {
                            FormField(label: "اسم المشروع") {
                                BrandedTextField(text: $vm.formName, placeholder: "مثال: تطوير")
                            }

                            FormField(label: "وصف (اختياري)") {
                                BrandedTextField(
                                    text: $vm.formDescription,
                                    placeholder: "وصف قصير للمشروع",
                                    multiline: true
                                )
                            }

                            FormField(label: "اللون") {
                                ColorPickerStrip(selection: $vm.formColor)
                            }

                            FormField(label: "الأيقونة") {
                                IconPickerGrid(selection: $vm.formIcon, color: vm.formColor)
                            }
                        }

                        if let message = vm.formError {
                            ErrorBanner(message: message)
                        }

                        HStack(spacing: 10) {
                            Button("إلغاء") { dismiss() }
                                .buttonStyle(GhostButtonStyle())
                            Spacer()
                            Button {
                                Task {
                                    await vm.submitForm()
                                    if !vm.formOpen { dismiss() }
                                }
                            } label: {
                                HStack {
                                    if vm.formBusy { ProgressView().tint(.white) }
                                    Text(vm.formMode == .create ? "إنشاء" : "حفظ")
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(vm.formBusy || vm.formName.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                        .padding(.top, 4)
                    }
                    .padding(20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                        .foregroundStyle(Theme.ink600)
                }
            }
        }
    }
}

private struct FormField<Content: View>: View {
    let label: String
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.ink700)
            content()
        }
    }
}

struct BrandedTextField: View {
    @Binding var text: String
    var placeholder: String = ""
    var multiline: Bool = false
    @FocusState private var focused: Bool

    var body: some View {
        Group {
            if multiline {
                TextField(placeholder, text: $text, axis: .vertical)
                    .lineLimit(3...8)
            } else {
                TextField(placeholder, text: $text)
            }
        }
        .focused($focused)
        .font(.system(size: 14))
        .foregroundStyle(Theme.ink900)
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focused ? Theme.brand400 : Theme.ink200, lineWidth: 1)
        )
        .shadow(color: focused ? Theme.brand500.opacity(0.16) : .clear,
                radius: focused ? 6 : 0)
        .animation(.easeOut(duration: 0.12), value: focused)
    }
}

// MARK: - Color picker strip (mirrors `ColorPicker.jsx`)

private struct ColorPickerStrip: View {
    @Binding var selection: String
    var body: some View {
        HStack(spacing: 10) {
            ForEach(Theme.projectPalette, id: \.self) { hex in
                let isActive = selection.uppercased() == hex.uppercased()
                Button {
                    selection = hex
                } label: {
                    ZStack {
                        Circle()
                            .fill(Color(cssHex: hex))
                            .frame(width: 32, height: 32)
                        if isActive {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .heavy))
                                .foregroundStyle(.white)
                        }
                    }
                    .overlay(
                        Circle()
                            .stroke(isActive ? Theme.ink900 : .clear, lineWidth: 2)
                            .padding(-3)
                    )
                }
                .buttonStyle(.plain)
            }
            Spacer(minLength: 0)
        }
    }
}

// MARK: - Icon picker grid (mirrors `IconPicker.jsx`)

private struct IconPickerGrid: View {
    @Binding var selection: String
    let color: String

    private let cols = Array(repeating: GridItem(.flexible(), spacing: 8), count: 6)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color(cssHex: color))
                    Text(selection.isEmpty ? "📝" : selection)
                        .font(.system(size: 22))
                }
                .frame(width: 48, height: 48)

                Text("اختر أيقونة للمشروع، واللون المختار يكون خلفيتها.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.ink500)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            LazyVGrid(columns: cols, spacing: 8) {
                ForEach(Theme.projectIcons, id: \.self) { icon in
                    Button {
                        selection = icon
                    } label: {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(selection == icon ? Theme.ink900 : Theme.ink100,
                                                lineWidth: selection == icon ? 1.5 : 1)
                                )
                            Text(icon).font(.system(size: 18))
                            if selection == icon {
                                Circle()
                                    .fill(Theme.ink900)
                                    .frame(width: 16, height: 16)
                                    .overlay(
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 9, weight: .heavy))
                                            .foregroundStyle(.white)
                                    )
                                    .offset(x: 18, y: -16)
                            }
                        }
                        .frame(height: 40)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// MARK: - Change PIN sheet (mirrors `ChangePinModal.jsx`)

struct ChangePinSheet: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss

    @State private var current = ""
    @State private var fresh = ""
    @State private var confirm = ""
    @State private var busy = false
    @State private var error: String?
    @State private var success = false

    var body: some View {
        NavigationStack {
            ZStack {
                BrandedBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Text("تغيير الرقم السري")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(Theme.ink900)
                        Text("سيتم استخدام الرقم الجديد عند الدخول التالي.")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.ink500)

                        VStack(alignment: .leading, spacing: 12) {
                            FormField(label: "الرقم الحالي") {
                                PinField(text: $current, placeholder: "الرقم الحالي")
                            }
                            FormField(label: "الرقم الجديد") {
                                PinField(text: $fresh, placeholder: "أربعة أرقام أو أكثر")
                            }
                            FormField(label: "تأكيد الرقم الجديد") {
                                PinField(text: $confirm, placeholder: "تأكيد")
                            }
                        }

                        if let error { ErrorBanner(message: error) }
                        if success {
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                                Text("تم تغيير الرقم بنجاح.")
                                    .foregroundStyle(Theme.ink700)
                            }
                            .font(.system(size: 13))
                        }

                        HStack {
                            Button("إغلاق") { dismiss() }
                                .buttonStyle(GhostButtonStyle())
                            Spacer()
                            Button {
                                Task { await save() }
                            } label: {
                                HStack(spacing: 6) {
                                    if busy { ProgressView().tint(.white) }
                                    Text("حفظ")
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(busy || !canSubmit)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var canSubmit: Bool {
        current.count >= 4 && fresh.count >= 4 && fresh == confirm
    }

    @MainActor
    private func save() async {
        error = nil
        success = false
        guard fresh == confirm else { error = "الرقم الجديد غير متطابق."; return }
        busy = true
        defer { busy = false }
        do {
            try await session.changePin(currentPin: current, newPin: fresh)
            success = true
            current = ""; fresh = ""; confirm = ""
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// Re-declare FormField inside ChangePinSheet's scope as well — it lives at file scope above.
// (The `private struct FormField` declaration is above; reused implicitly here.)
