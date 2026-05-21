import SwiftUI

struct AuthView: View {
    @Environment(AuthSession.self) private var auth
    @State private var mode: AuthMode = .signUp
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 10) {
                    SmallCapsLabel(text: "Ring Tone Creator Pro", color: Theme.cyan)
                    Text("Make premium ringtones from your music, videos, and recordings.")
                        .font(.system(size: 42, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(4)
                        .minimumScaleFactor(0.72)
                    Text("Create an email account to claim three free ringtone exports. Your credits sync securely with Firebase and your audio stays on this iPhone.")
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(4)
                }

                PremiumPanel {
                    VStack(spacing: 14) {
                        Picker("Mode", selection: $mode) {
                            Text("Create").tag(AuthMode.signUp)
                            Text("Sign In").tag(AuthMode.signIn)
                        }
                        .pickerStyle(.segmented)

                        TextField("Email", text: $email)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textContentType(.emailAddress)
                            .padding(14)
                            .background(Theme.elevated, in: RoundedRectangle(cornerRadius: 16))

                        SecureField("Password", text: $password)
                            .textContentType(mode == .signUp ? .newPassword : .password)
                            .padding(14)
                            .background(Theme.elevated, in: RoundedRectangle(cornerRadius: 16))

                        Button {
                            Task {
                                if mode == .signUp {
                                    await auth.signUp(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
                                } else {
                                    await auth.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
                                }
                            }
                        } label: {
                            HStack {
                                if auth.isBusy {
                                    ProgressView().tint(.white)
                                }
                                Text(mode.actionTitle)
                            }
                        }
                        .buttonStyle(GradientButtonStyle(disabled: !canSubmit || auth.isBusy))
                        .disabled(!canSubmit || auth.isBusy)

                        Button("Send Password Reset") {
                            Task {
                                await auth.resetPassword(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
                            }
                        }
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Theme.cyan)
                        .disabled(email.isEmpty || auth.isBusy)
                    }
                }

                if let message = auth.message {
                    Text(message)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                        .padding(.horizontal, 4)
                }

                HStack(spacing: 12) {
                    Link("Privacy", destination: AppConfig.privacyURL)
                    Link("Terms", destination: AppConfig.termsURL)
                    Link("Support", destination: AppConfig.supportURL)
                }
                .font(.caption.weight(.bold))
                .foregroundStyle(Theme.muted)
            }
            .padding(24)
        }
    }

    private var canSubmit: Bool {
        email.contains("@") && email.contains(".") && password.count >= 6
    }
}
