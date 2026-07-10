import SwiftUI
import WebKit

/// Hosts the bundled Limitless Credit GPS web app inside a WKWebView.
/// Assets are served from the app bundle through a custom URL scheme so the
/// site's root-relative paths (/assets/..., /limitless/...) resolve offline,
/// and localStorage-backed state persists between launches.
struct WebShellView: UIViewRepresentable {
    static let scheme = "creditgps"
    static var startURL: URL {
        // QA hook: launch a specific route in the simulator, e.g.
        // SIMCTL_CHILD_CREDITGPS_START_PATH=/limitless/quiz/ simctl launch ...
        let path = ProcessInfo.processInfo.environment["CREDITGPS_START_PATH"] ?? "/limitless/"
        return URL(string: "\(scheme)://app\(path)") ?? URL(string: "\(scheme)://app/limitless/")!
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: Self.scheme)
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 2 / 255, green: 6 / 255, blue: 23 / 255, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.load(URLRequest(url: Self.startURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Keep bundled content in the shell; hand external links to Safari.
            if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }
    }
}

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private static let mimeTypes: [String: String] = [
        "html": "text/html",
        "js": "text/javascript",
        "mjs": "text/javascript",
        "css": "text/css",
        "json": "application/json",
        "webmanifest": "application/manifest+json",
        "svg": "image/svg+xml",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
        "ico": "image/x-icon",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "ttf": "font/ttf",
        "txt": "text/plain",
        "xml": "application/xml",
    ]

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url,
              let webRoot = Bundle.main.resourceURL?.appendingPathComponent("WebRoot", isDirectory: true)
        else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let fileURL = Self.resolve(path: url.path, webRoot: webRoot)

        guard let data = try? Data(contentsOf: fileURL) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let ext = fileURL.pathExtension.lowercased()
        let mimeType = Self.mimeTypes[ext] ?? "application/octet-stream"
        let response = URLResponse(
            url: url,
            mimeType: mimeType,
            expectedContentLength: data.count,
            textEncodingName: mimeType.hasPrefix("text/") || mimeType.contains("javascript") ? "utf-8" : nil
        )

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private static func resolve(path: String, webRoot: URL) -> URL {
        var relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        if relative.isEmpty { relative = "limitless/" }

        var candidate = webRoot.appendingPathComponent(relative)
        let fileManager = FileManager.default

        var isDirectory: ObjCBool = false
        if fileManager.fileExists(atPath: candidate.path, isDirectory: &isDirectory) {
            if isDirectory.boolValue {
                candidate.appendPathComponent("index.html")
            }
            if fileManager.fileExists(atPath: candidate.path) {
                return candidate
            }
        }

        // SPA fallback: unknown extension-less routes render the app shell so
        // client-side routing (history.pushState) survives reloads.
        if candidate.pathExtension.isEmpty {
            return webRoot.appendingPathComponent("limitless/index.html")
        }

        return candidate
    }
}
