import Foundation
import SwiftUI
@preconcurrency import GoogleSignIn

@MainActor
@Observable
class GoogleDriveAuthManager {
    static let shared = GoogleDriveAuthManager()
    
    var isSignedIn: Bool = false
    var currentUser: GIDGoogleUser?
    
    private let driveScope = "https://www.googleapis.com/auth/drive.readonly"
    
    init() {
        checkStatus()
    }
    
    func checkStatus() {
        Task { @MainActor in
            do {
                let user = try await GIDSignIn.sharedInstance.restorePreviousSignIn()
                self.currentUser = user
                self.isSignedIn = true
                self.ensureDriveScope()
            } catch {
                self.isSignedIn = false
                self.currentUser = nil
            }
        }
    }
    
    nonisolated func getAccessToken() async -> String? {
        await MainActor.run {
            if self.isSignedIn, let user = self.currentUser {
                return user.accessToken.tokenString
            }
            return nil
        }
    }
    
    func ensureDriveScope() {
        guard let user = currentUser else { return }
        if let scopes = user.grantedScopes, scopes.contains(driveScope) {
            return
        }
    }
    
    func signIn() async throws {
        guard let windowScene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
              let rootViewController = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
            throw NSError(domain: "GoogleDriveAuthManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Could not find root view controller"])
        }
        
        let result = try await GIDSignIn.sharedInstance.signIn(
            withPresenting: rootViewController,
            hint: nil,
            additionalScopes: [driveScope]
        )
        self.currentUser = result.user
        self.isSignedIn = true
    }
    
    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        self.currentUser = nil
        self.isSignedIn = false
    }

    nonisolated func fetchImages(folderId: String) async -> [URL] {
        guard let token = await getAccessToken() else { return [] }
        var fetchedURLs: [URL] = []
        var pageToken: String? = nil

        let query = "'\(folderId)' in parents and (mimeType contains 'image/jpeg' or mimeType contains 'image/png') and trashed = false"
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return [] }

        repeat {
            var urlString = "https://www.googleapis.com/drive/v3/files?q=\(encodedQuery)&fields=nextPageToken,files(id)&pageSize=1000"
            if let tokenStr = pageToken {
                urlString += "&pageToken=\(tokenStr)"
            }

            guard let url = URL(string: urlString) else { break }
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.timeoutInterval = 15

            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
                    print("Google Drive API Error: Status code \((response as? HTTPURLResponse)?.statusCode ?? 0)")
                    break
                }
                
                guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { break }
                
                if let files = json["files"] as? [[String: Any]] {
                    for file in files {
                        if let id = file["id"] as? String, let imageURL = URL(string: "https://drive.google.com/uc?id=\(id)") {
                            fetchedURLs.append(imageURL)
                        }
                    }
                }
                pageToken = json["nextPageToken"] as? String
            } catch {
                print("Google Drive API Exception: \(error)")
                break
            }
        } while pageToken != nil && !fetchedURLs.isEmpty

        return fetchedURLs
    }
}
