import SwiftUI

struct UserManagementView: View {
    @StateObject private var viewModel = AdminViewModel()
    @State private var showCreateSheet = false
    @State private var selectedUser: ManagedUser?

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.users) { user in
                    UserDetailRow(user: user)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedUser = user
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                Task { await viewModel.deleteUser(user) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }

                            Button {
                                selectedUser = user
                            } label: {
                                Label("Edit", systemImage: "pencil")
                            }
                            .tint(.brandPrimary)
                        }
                }
            }
            .listStyle(.plain)
            .navigationTitle("User Management")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showCreateSheet = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadUsers()
            }
            .task {
                await viewModel.loadUsers()
            }
            .sheet(isPresented: $showCreateSheet) {
                CreateUserSheet(viewModel: viewModel)
            }
            .sheet(item: $selectedUser) { user in
                EditUserSheet(viewModel: viewModel, user: user)
            }
            .overlay {
                if viewModel.isLoading && viewModel.users.isEmpty {
                    LoadingView(message: "Loading users...")
                } else if viewModel.users.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: "No Users",
                        message: "Tap + to add a new user"
                    )
                }
            }
        }
    }
}

struct UserDetailRow: View {
    let user: ManagedUser

    var body: some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(Color.brandPrimary.opacity(0.1))
                    .frame(width: 44, height: 44)

                Text(initials)
                    .font(.labelLarge)
                    .foregroundColor(.brandPrimary)
            }

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                HStack {
                    Text(user.name ?? "No Name")
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    if !user.isActive {
                        Text("Inactive")
                            .font(.labelSmall)
                            .foregroundColor(.statusDown)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(Color.statusDown.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }

                Text(user.email)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)

                if let lastLogin = user.lastLoginAt {
                    Text("Last login: \(lastLogin.timeAgo)")
                        .font(.bodySmall)
                        .foregroundColor(.textTertiary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                RoleBadge(role: user.role)

                Text("Since \(user.createdAt.formatted(.dateTime.month().year()))")
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    private var initials: String {
        if let name = user.name {
            let parts = name.split(separator: " ")
            if parts.count >= 2 {
                return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
            } else if let first = parts.first {
                return String(first.prefix(2)).uppercased()
            }
        }
        return String(user.email.prefix(2)).uppercased()
    }
}

struct RoleBadge: View {
    let role: UserRole

    var body: some View {
        Text(role.displayName)
            .font(.labelSmall)
            .foregroundColor(roleColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 2)
            .background(roleColor.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var roleColor: Color {
        switch role {
        case .admin: return .severityCritical
        case .editor: return .brandPrimary
        case .viewer: return .textSecondary
        }
    }
}

struct CreateUserSheet: View {
    @ObservedObject var viewModel: AdminViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var name = ""
    @State private var role: UserRole = .viewer
    @State private var sendInvite = true

    var body: some View {
        NavigationStack {
            Form {
                Section("User Info") {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    TextField("Name (Optional)", text: $name)
                        .textContentType(.name)
                }

                Section("Role") {
                    Picker("Role", selection: $role) {
                        ForEach(UserRole.allCases, id: \.self) { role in
                            Text(role.displayName).tag(role)
                        }
                    }
                    .pickerStyle(.segmented)

                    Text(role.description)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                }

                Section {
                    Toggle("Send Invite Email", isOn: $sendInvite)
                }
            }
            .navigationTitle("New User")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await viewModel.createUser(email: email, name: name.isEmpty ? nil : name, role: role)
                            dismiss()
                        }
                    }
                    .disabled(email.isEmpty || !email.contains("@"))
                }
            }
        }
    }
}

struct EditUserSheet: View {
    @ObservedObject var viewModel: AdminViewModel
    let user: ManagedUser
    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var role: UserRole
    @State private var isActive: Bool

    init(viewModel: AdminViewModel, user: ManagedUser) {
        self.viewModel = viewModel
        self.user = user
        _name = State(initialValue: user.name ?? "")
        _role = State(initialValue: user.role)
        _isActive = State(initialValue: user.isActive)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("User Info") {
                    Text(user.email)
                        .foregroundColor(.textSecondary)

                    TextField("Name", text: $name)
                        .textContentType(.name)
                }

                Section("Role") {
                    Picker("Role", selection: $role) {
                        ForEach(UserRole.allCases, id: \.self) { role in
                            Text(role.displayName).tag(role)
                        }
                    }
                    .pickerStyle(.segmented)

                    Text(role.description)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                }

                Section("Status") {
                    Toggle("Active", isOn: $isActive)
                }
            }
            .navigationTitle("Edit User")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.updateUser(user, name: name.isEmpty ? nil : name, role: role, isActive: isActive)
                            dismiss()
                        }
                    }
                }
            }
        }
    }
}
