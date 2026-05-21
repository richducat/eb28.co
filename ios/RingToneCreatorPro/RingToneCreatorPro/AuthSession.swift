import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import Foundation

private struct AuthIdentity: Sendable {
    let uid: String
    let email: String?
}

@MainActor
@Observable
final class AuthSession {
    var firebaseReady = false
    var currentUserID: String?
    var profile: UserProfile?
    var isBusy = false
    var message: String?

    @ObservationIgnored private var authHandle: AuthStateDidChangeListenerHandle?
    @ObservationIgnored private var profileListener: ListenerRegistration?

    var isSignedIn: Bool {
        currentUserID != nil
    }

    func start() async {
        firebaseReady = FirebaseApp.app() != nil
        guard firebaseReady else {
            message = "Account signup is being configured. You can explore the app, but free exports need the production Firebase setup."
            return
        }

        if authHandle == nil {
            authHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
                Task { @MainActor in
                    self?.currentUserID = user?.uid
                    self?.listenForProfile(user: user)
                }
            }
        }
    }

    func signUp(email: String, password: String) async {
        guard firebaseReady else {
            message = ToneError.firebaseNotConfigured.localizedDescription
            return
        }

        await runBusy { [self] in
            let identity = try await self.createUser(email: email, password: password)
            try await self.createProfileIfNeeded(uid: identity.uid, email: identity.email ?? email)
            self.message = "Account ready. Your first three ringtone exports are free."
        }
    }

    func signIn(email: String, password: String) async {
        guard firebaseReady else {
            message = ToneError.firebaseNotConfigured.localizedDescription
            return
        }

        await runBusy { [self] in
            let identity = try await self.signInUser(email: email, password: password)
            try await self.createProfileIfNeeded(uid: identity.uid, email: identity.email ?? email)
            self.message = "Signed in."
        }
    }

    func signOut() {
        do {
            try Auth.auth().signOut()
            profile = nil
            currentUserID = nil
            message = "Signed out."
        } catch {
            message = error.localizedDescription
        }
    }

    func resetPassword(email: String) async {
        guard firebaseReady else {
            message = ToneError.firebaseNotConfigured.localizedDescription
            return
        }

        await runBusy { [self] in
            try await self.sendPasswordReset(email: email)
            self.message = "Password reset email sent."
        }
    }

    func deleteAccount() async {
        guard let user = Auth.auth().currentUser else {
            message = ToneError.accountRequired.localizedDescription
            return
        }

        await runBusy { [self] in
            let uid = user.uid
            try await self.deleteProfile(uid: uid)
            try await self.deleteFirebaseUser(user)
            self.profile = nil
            self.currentUserID = nil
            self.message = "Account deleted."
        }
    }

    func mirrorSubscription(status: String, productID: String?) async {
        guard let uid = currentUserID, firebaseReady else { return }
        do {
            var payload: [String: Any] = [
                "subscriptionStatusMirror": status,
                "updatedAt": FieldValue.serverTimestamp(),
                "appVersion": AppConfig.appVersion
            ]
            if let productID {
                payload["subscriptionProductId"] = productID
            }
            try await updateUserDocument(uid: uid, data: payload)
        } catch {
            message = "Subscription is active locally. Cloud mirror update failed: \(error.localizedDescription)"
        }
    }

    func consumeFreeExportCredit() async -> Bool {
        guard firebaseReady else {
            message = ToneError.firebaseNotConfigured.localizedDescription
            return false
        }

        guard let uid = currentUserID else {
            message = ToneError.accountRequired.localizedDescription
            return false
        }

        do {
            let success = try await incrementExportCredit(uid: uid)
            if success {
                message = "Free export used. \(max(0, (profile?.freeExportsRemaining ?? 1) - 1)) free exports remain."
            }
            return success
        } catch {
            message = error.localizedDescription
            return false
        }
    }

    private func listenForProfile(user: User?) {
        profileListener?.remove()
        profileListener = nil
        profile = nil

        guard let user else { return }

        let ref = Firestore.firestore().collection("users").document(user.uid)
        profileListener = ref.addSnapshotListener { [weak self] snapshot, error in
            Task { @MainActor in
                if let error {
                    self?.message = error.localizedDescription
                    return
                }

                guard let data = snapshot?.data() else { return }
                self?.profile = UserProfile(
                    id: user.uid,
                    email: data["email"] as? String ?? user.email ?? "",
                    freeExportLimit: data["freeExportLimit"] as? Int ?? AppConfig.freeExportLimit,
                    freeExportsUsed: data["freeExportsUsed"] as? Int ?? 0,
                    subscriptionStatusMirror: data["subscriptionStatusMirror"] as? String ?? "free",
                    appVersion: data["appVersion"] as? String ?? AppConfig.appVersion,
                    lastExportAt: (data["lastExportAt"] as? Timestamp)?.dateValue()
                )
            }
        }
    }

    private func runBusy(_ operation: @escaping () async throws -> Void) async {
        isBusy = true
        defer { isBusy = false }

        do {
            try await operation()
        } catch {
            message = error.localizedDescription
        }
    }

    private func createUser(email: String, password: String) async throws -> AuthIdentity {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<AuthIdentity, Error>) in
            Auth.auth().createUser(withEmail: email, password: password) { result, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let result {
                    continuation.resume(returning: AuthIdentity(uid: result.user.uid, email: result.user.email))
                } else {
                    continuation.resume(throwing: ToneError.accountRequired)
                }
            }
        }
    }

    private func signInUser(email: String, password: String) async throws -> AuthIdentity {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<AuthIdentity, Error>) in
            Auth.auth().signIn(withEmail: email, password: password) { result, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let result {
                    continuation.resume(returning: AuthIdentity(uid: result.user.uid, email: result.user.email))
                } else {
                    continuation.resume(throwing: ToneError.accountRequired)
                }
            }
        }
    }

    private func sendPasswordReset(email: String) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Auth.auth().sendPasswordReset(withEmail: email) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    private func deleteFirebaseUser(_ user: User) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            user.delete { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    private func createProfileIfNeeded(uid: String, email: String) async throws {
        let ref = Firestore.firestore().collection("users").document(uid)
        let snapshot = try await getDocument(ref)
        guard !snapshot.exists else {
            try await updateUserDocument(uid: uid, data: [
                "updatedAt": FieldValue.serverTimestamp(),
                "appVersion": AppConfig.appVersion
            ])
            return
        }

        try await setDocument(ref, data: [
            "email": email,
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp(),
            "freeExportLimit": AppConfig.freeExportLimit,
            "freeExportsUsed": 0,
            "subscriptionProductId": "",
            "subscriptionStatusMirror": "free",
            "appVersion": AppConfig.appVersion
        ])
    }

    private func incrementExportCredit(uid: String) async throws -> Bool {
        let ref = Firestore.firestore().collection("users").document(uid)
        return try await withCheckedThrowingContinuation { continuation in
            Firestore.firestore().runTransaction({ transaction, errorPointer -> Any? in
                do {
                    let snapshot = try transaction.getDocument(ref)
                    let data = snapshot.data() ?? [:]
                    let limit = data["freeExportLimit"] as? Int ?? AppConfig.freeExportLimit
                    let used = data["freeExportsUsed"] as? Int ?? 0
                    guard used < limit else {
                        errorPointer?.pointee = NSError(
                            domain: "RingToneCreatorPro",
                            code: 402,
                            userInfo: [NSLocalizedDescriptionKey: ToneError.creditLimitReached.localizedDescription]
                        )
                        return nil
                    }

                    transaction.updateData([
                        "freeExportsUsed": used + 1,
                        "lastExportAt": FieldValue.serverTimestamp(),
                        "updatedAt": FieldValue.serverTimestamp(),
                        "appVersion": AppConfig.appVersion
                    ], forDocument: ref)
                    return true
                } catch let error as NSError {
                    errorPointer?.pointee = error
                    return nil
                }
            }, completion: { result, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: (result as? Bool) ?? false)
                }
            })
        }
    }

    private func getDocument(_ ref: DocumentReference) async throws -> DocumentSnapshot {
        try await withCheckedThrowingContinuation { continuation in
            ref.getDocument { snapshot, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let snapshot {
                    continuation.resume(returning: snapshot)
                } else {
                    continuation.resume(throwing: ToneError.accountRequired)
                }
            }
        }
    }

    private func setDocument(_ ref: DocumentReference, data: [String: Any]) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            ref.setData(data, merge: true) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    private func updateUserDocument(uid: String, data: [String: Any]) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Firestore.firestore().collection("users").document(uid).setData(data, merge: true) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    private func deleteProfile(uid: String) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Firestore.firestore().collection("users").document(uid).delete { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
}
