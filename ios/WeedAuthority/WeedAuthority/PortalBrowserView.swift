import SwiftUI
import WebKit

struct PortalBrowserView: View {
    let url: URL
    let stateName: String
    @Environment(AuthorityStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    
    @State private var webView = WKWebView()
    @State private var canGoBack = false
    @State private var canGoForward = false
    @State private var isSourceLoading = false
    @State private var syncStatus: SyncStatus = .ready
    @State private var animateSync = false
    
    // Auto-Sync Overlay States
    @State private var isAutoSyncing = false
    @State private var autoSyncStep = ""
    
    enum SyncStatus: Equatable {
        case ready
        case syncing
        case success(flower: Double, concentrate: Double)
        case error(String)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.authorityInk.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Browser Web View
                    WebViewContainer(
                        webView: webView,
                        url: url,
                        canGoBack: $canGoBack,
                        canGoForward: $canGoForward,
                        isLoading: $isSourceLoading,
                        onPageLoaded: handlePageLoad,
                        onMessageReceived: handleSyncMessage
                    )
                    .ignoresSafeArea(.all, edges: .bottom)
                }
                
                // Floating Sync Action Overlay (Hidden during Auto-Sync)
                if !isAutoSyncing {
                    VStack {
                        Spacer()
                        floatingSyncCard
                            .padding(.horizontal, 16)
                            .padding(.bottom, 22)
                    }
                }
                
                // Fullscreen Auto-Sync Loading Overlay
                if isAutoSyncing {
                    ZStack {
                        Color.authorityInk.ignoresSafeArea()
                        
                        VStack(spacing: 28) {
                            Spacer()
                            
                            // App Logo with pulse animation
                            ZStack {
                                Circle()
                                    .fill(Color.authorityGreen.opacity(0.12))
                                    .frame(width: 90, height: 90)
                                    .scaleEffect(animateSync ? 1.15 : 1.0)
                                    .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: animateSync)
                                
                                AuthorityLogo()
                                    .scaleEffect(1.2)
                            }
                            
                            VStack(spacing: 10) {
                                Text("Weed Authority Sync")
                                    .font(.system(size: 21, weight: .black, design: .rounded))
                                    .foregroundStyle(Color.authorityText)
                                
                                Text(autoSyncStep)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(Color.authorityMuted)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 36)
                                    .lineSpacing(4)
                                    .frame(height: 52, alignment: .center)
                            }
                            
                            // Glowing Loader bar
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.white.opacity(0.08))
                                    .frame(width: 220, height: 6)
                                
                                Capsule()
                                    .fill(LinearGradient(colors: [.authorityGreen, .authorityGold], startPoint: .leading, endPoint: .trailing))
                                    .frame(width: animateSync ? 220 : 30, height: 6)
                                    .animation(.easeInOut(duration: 1.8).repeatForever(autoreverses: false), value: animateSync)
                            }
                            .shadow(color: Color.authorityGreen.opacity(0.35), radius: 8)
                            
                            Spacer()
                            
                            Text("Secure local extraction active")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundStyle(Color.authorityMuted)
                                .opacity(0.7)
                        }
                    }
                    .transition(.opacity)
                    .onAppear {
                        animateSync = true
                    }
                }
            }
            .navigationTitle("\(stateName) Portal Sync")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 12) {
                        Button {
                            webView.goBack()
                        } label: {
                            Image(systemName: "chevron.left")
                        }
                        .disabled(!canGoBack || isAutoSyncing)
                        .foregroundStyle(canGoBack && !isAutoSyncing ? Color.authorityGreen : Color.authorityMuted)
                        
                        Button {
                            webView.goForward()
                        } label: {
                            Image(systemName: "chevron.right")
                        }
                        .disabled(!canGoForward || isAutoSyncing)
                        .foregroundStyle(canGoForward && !isAutoSyncing ? Color.authorityGreen : Color.authorityMuted)
                        
                        Button {
                            webView.reload()
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .disabled(isAutoSyncing)
                        .foregroundStyle(!isAutoSyncing ? Color.authorityGreen : Color.authorityMuted)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isAutoSyncing ? "Cancel" : "Done") {
                        dismiss()
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color.authorityGreen)
                }
            }
        }
    }
    
    private var floatingSyncCard: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(syncColor.opacity(0.14))
                        .frame(width: 38, height: 38)
                    Image(systemName: syncIcon)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(syncColor)
                        .rotationEffect(.degrees(animateSync ? 360 : 0))
                }
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(syncTitle)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.authorityText)
                    Text(syncSubtitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.authorityMuted)
                }
                Spacer()
            }
            
            HStack(spacing: 10) {
                // Secondary Simulation Button for Demo/App Store Review
                Button {
                    simulateDemoSync()
                } label: {
                    Label("Demo Sync", systemImage: "sparkles")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.authorityGold)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                
                // Primary Sync Button
                Button {
                    triggerRegistryExtraction()
                } label: {
                    Text("Sync Live Allotment")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.authorityInk)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(Color.authorityGreen, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(Color.authorityPanel.opacity(0.92))
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(syncColor.opacity(0.24), lineWidth: 1.5)
        )
        .shadow(color: Color.black.opacity(0.35), radius: 18, x: 0, y: 8)
    }
    
    private var syncColor: Color {
        switch syncStatus {
        case .ready: return Color.authorityGreen
        case .syncing: return Color.authorityGold
        case .success: return Color.authorityGreen
        case .error: return Color.authorityCoral
        }
    }
    
    private var syncIcon: String {
        switch syncStatus {
        case .ready: return "arrow.triangle.2.circlepath"
        case .syncing: return "arrow.triangle.2.circlepath"
        case .success: return "checkmark.circle.fill"
        case .error: return "exclamationmark.circle.fill"
        }
    }
    
    private var syncTitle: String {
        switch syncStatus {
        case .ready: return "Registry Sync Companion"
        case .syncing: return "Extracting Allotment..."
        case .success: return "Sync Completed!"
        case .error: return "Sync Issue"
        }
    }
    
    private var syncSubtitle: String {
        switch syncStatus {
        case .ready: return "Log in once, and Weed Authority will auto-extract your limits."
        case .syncing: return "Scanning page details..."
        case .success(let flower, let concentrate):
            return "Extracted \(flower.formatted(.number.precision(.fractionLength(0...1))))g flower / \(concentrate.formatted(.number.precision(.fractionLength(0...1))))g conc."
        case .error(let msg): return msg
        }
    }
    
    private func handlePageLoad(url: URL?) {
        guard let urlString = url?.absoluteString.lowercased() else { return }
        
        // Detect login redirection
        let isLoginPath = urlString.contains("login") || urlString.contains("auth") || urlString == "about:blank"
        
        if !isLoginPath {
            withAnimation(.easeInOut) {
                if !isAutoSyncing {
                    isAutoSyncing = true
                    autoSyncStep = "Logged in securely. Accessing your registry card..."
                    syncStatus = .syncing
                    animateSync = true
                }
            }
            
            // Execute automatic extraction sequence after page loads completely
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                executeAutoNavigation()
            }
        }
    }
    
    private func executeAutoNavigation() {
        let autoScript = """
        (function() {
            // Step 1: Scan for allotment tables first
            var data = {};
            var tables = document.getElementsByTagName('table');
            var foundAllotment = false;
            
            for (var i = 0; i < tables.length; i++) {
                var table = tables[i];
                var rows = table.getElementsByTagName('tr');
                for (var j = 0; j < rows.length; j++) {
                    var row = rows[j];
                    var cells = row.getElementsByTagName('td');
                    if (cells.length >= 3) {
                        var rowText = (row.innerText || row.textContent || "").toLowerCase();
                        var isFlower = rowText.includes("smoking") || rowText.includes("flower") || rowText.includes("smokable");
                        var isConc = rowText.includes("inhalation") || rowText.includes("concentrate") || rowText.includes("distillate");
                        
                        if (isFlower || isConc) {
                            for (var c = cells.length - 1; c >= 0; c--) {
                                var cellText = (cells[c].innerText || cells[c].textContent || "").trim();
                                var numMatch = cellText.match(/([0-9,.]+)/);
                                if (numMatch) {
                                    var numStr = numMatch[1].replace(/,/g, '');
                                    var numVal = parseFloat(numStr);
                                    if (!isNaN(numVal) && numVal > 0) {
                                        if (isFlower && !data.flowerGrams) {
                                            foundAllotment = true;
                                            if (cellText.toLowerCase().includes("oz") || cellText.toLowerCase().includes("ounce")) {
                                                data.flowerGrams = numVal * 28.3495;
                                            } else {
                                                data.flowerGrams = numVal;
                                            }
                                            break;
                                        } else if (isConc && !data.concentrateGrams) {
                                            foundAllotment = true;
                                            if (cellText.toLowerCase().includes("mg") || cellText.toLowerCase().includes("milligram")) {
                                                data.concentrateGrams = numVal / 1000.0;
                                            } else {
                                                data.concentrateGrams = numVal;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            if (foundAllotment) {
                return JSON.stringify({ status: "extracted", data: data });
            }
            
            // Step 2: If tables are not found, look for profile or allotment buttons/links with a priority score
            var candidates = [];
            var elements = Array.from(document.getElementsByTagName('a'))
                .concat(Array.from(document.getElementsByTagName('button')))
                .concat(Array.from(document.getElementsByTagName('span')));
                
            for (var k = 0; k < elements.length; k++) {
                var el = elements[k];
                var text = (el.innerText || el.textContent || "").trim().toLowerCase();
                
                if (text.includes("logout") || text.includes("log out") || text.includes("signout") || text.includes("sign out") || text.includes("exit")) {
                    continue;
                }
                
                var score = 0;
                if (text.includes("dispensable") && text.includes("amount")) {
                    score += 100;
                } else if (text.includes("dispensable") || text.includes("allotment")) {
                    score += 50;
                } else if (text.includes("amount") || text.includes("limit")) {
                    score += 20;
                } else if (text.includes("profile")) {
                    score += 10;
                } else if (text.includes("expand") || text.includes("show") || text.includes("details") || text.includes("open")) {
                    score += 5;
                }
                
                if (score > 0) {
                    candidates.push({ element: el, score: score });
                }
            }
            
            if (candidates.length > 0) {
                // Sort by score descending
                candidates.sort(function(a, b) { return b.score - a.score; });
                candidates[0].element.click();
                return JSON.stringify({ status: "clicked", clickedText: (candidates[0].element.innerText || candidates[0].element.textContent || "").trim() });
            }
            
            return JSON.stringify({ status: "seeking" });
        })()
        """
        
        webView.evaluateJavaScript(autoScript) { result, error in
            guard error == nil, let jsonString = result as? String,
                  let jsonData = jsonString.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let status = json["status"] as? String else {
                withAnimation {
                    autoSyncStep = "Auto-crawling page details..."
                }
                return
            }
            
            if status == "extracted", let parsedData = json["data"] as? [String: Any] {
                // Extraction Succeeded!
                let flower = parsedData["flowerGrams"] as? Double
                let concentrate = parsedData["concentrateGrams"] as? Double
                let flowerVal = flower ?? 0.0
                let concentrateVal = concentrate ?? 0.0
                
                store.updateSyncedAllotment(flowerGrams: flowerVal, concentrateGrams: concentrateVal)
                
                withAnimation {
                    autoSyncStep = "Limits synced successfully!"
                    syncStatus = .success(flower: flowerVal, concentrate: concentrateVal)
                }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    dismiss()
                }
            } else if status == "clicked" {
                // Clicked an intermediate navigation link. Page reload will trigger handlePageLoad again
                let clickedText = json["clickedText"] as? String ?? "allotment portal"
                withAnimation {
                    autoSyncStep = "Navigating: Accessing \(clickedText)..."
                }
            } else {
                withAnimation {
                    autoSyncStep = "Scanning page limits..."
                }
            }
        }
    }
    
    private func triggerRegistryExtraction() {
        withAnimation(.easeInOut) {
            syncStatus = .syncing
            animateSync = true
        }
        executeAutoNavigation()
    }
    
    private func handleSyncMessage(_ jsonString: String) {
        guard let jsonData = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            withAnimation {
                syncStatus = .error("Invalid allotment layout on screen.")
                animateSync = false
            }
            return
        }
        
        let flower = json["flowerGrams"] as? Double
        let concentrate = json["concentrateGrams"] as? Double
        
        if flower == nil && concentrate == nil {
            withAnimation {
                syncStatus = .error("No active limits parsed. Ensure you clicked 'Show Dispensable Amounts'.")
                animateSync = false
            }
            return
        }
        
        let flowerVal = flower ?? 0.0
        let concentrateVal = concentrate ?? 0.0
        
        store.updateSyncedAllotment(flowerGrams: flowerVal, concentrateGrams: concentrateVal)
        
        withAnimation {
            syncStatus = .success(flower: flowerVal, concentrate: concentrateVal)
            animateSync = false
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            dismiss()
        }
    }
    
    private func simulateDemoSync() {
        withAnimation(.easeInOut) {
            isAutoSyncing = true
            autoSyncStep = "Logged in securely. Accessing your registry card..."
            syncStatus = .syncing
            animateSync = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
            withAnimation {
                autoSyncStep = "Navigating to your dispensable amounts..."
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                let flowerVal = 35.4
                let concentrateVal = 14.5
                
                store.updateSyncedAllotment(flowerGrams: flowerVal, concentrateGrams: concentrateVal)
                
                withAnimation {
                    autoSyncStep = "Limits synced successfully!"
                    syncStatus = .success(flower: flowerVal, concentrate: concentrateVal)
                }
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    dismiss()
                }
            }
        }
    }
}

// WKWebView Coordinator Container
private struct WebViewContainer: UIViewRepresentable {
    let webView: WKWebView
    let url: URL
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var isLoading: Bool
    let onPageLoaded: (URL?) -> Void
    let onMessageReceived: (String) -> Void
    
    func makeUIView(context: Context) -> WKWebView {
        webView.navigationDelegate = context.coordinator
        
        let request = URLRequest(url: url)
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebViewContainer
        
        init(_ parent: WebViewContainer) {
            self.parent = parent
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.canGoBack = webView.canGoBack
            parent.canGoForward = webView.canGoForward
            parent.isLoading = false
            parent.onPageLoaded(webView.url)
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }
    }
}
