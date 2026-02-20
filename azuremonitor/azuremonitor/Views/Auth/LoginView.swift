import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @EnvironmentObject var authService: AuthService

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xl) {
                Spacer()

                // Logo
                VStack(spacing: Spacing.md) {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.brandPrimary)

                    Text("Quartz Monitor")
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)

                    Text("Infrastructure Monitoring")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Sign in with Microsoft (Primary)
                Button(action: { Task { await viewModel.signInWithAzure() } }) {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: "building.2.fill")
                        Text("Sign in with Microsoft")
                    }
                    .font(.labelLarge)
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.white)
                    .padding(.vertical, Spacing.md)
                    .background(Color.brandPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                // Divider
                HStack {
                    Rectangle()
                        .fill(Color.textTertiary.opacity(0.3))
                        .frame(height: 1)
                    Text("or")
                        .font(.labelMedium)
                        .foregroundColor(.textTertiary)
                    Rectangle()
                        .fill(Color.textTertiary.opacity(0.3))
                        .frame(height: 1)
                }

                // API Key form
                VStack(spacing: Spacing.md) {
                    SecureField("API Key", text: $viewModel.apiKey)
                        .textContentType(.password)
                        .autocapitalization(.none)
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    PrimaryButton(
                        title: "Sign In with API Key",
                        action: { Task { await viewModel.signInWithAPIKey() } },
                        isLoading: viewModel.isLoading,
                        isDisabled: !viewModel.isFormValid
                    )
                }

                // Biometric option
                if viewModel.showBiometricOption {
                    Button(action: { Task { await viewModel.signInWithBiometrics() } }) {
                        HStack {
                            Image(systemName: "faceid")
                            Text("Sign in with Face ID")
                        }
                        .font(.labelMedium)
                        .foregroundColor(.brandPrimary)
                    }
                }

                Spacer()
            }
            .padding(Spacing.lg)
            .alert("Error", isPresented: .constant(viewModel.error != nil)) {
                Button("OK") { viewModel.error = nil }
            } message: {
                Text(viewModel.error?.localizedDescription ?? "")
            }
        }
    }
}
