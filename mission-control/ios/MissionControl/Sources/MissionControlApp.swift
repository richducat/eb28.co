import SwiftUI
import VisionKit

@main
struct MissionControlApp: App {
    @StateObject private var model = AppModel()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .preferredColorScheme(.dark)
                .tint(.gold)
                .onChange(of: phase) { _, p in
                    if p == .active, model.pairing != nil { model.startPolling() } else { model.stopPolling() }
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject var model: AppModel
    #if DEBUG
    @State private var tab = Int(ProcessInfo.processInfo.environment["MC_TAB"] ?? "0") ?? 0
    #else
    @State private var tab = 0
    #endif

    var body: some View {
        Group {
            if model.pairing == nil {
                PairView()
            } else {
                TabView(selection: $tab) {
                    TodayView().tabItem { Label("Today", systemImage: "sun.max") }.tag(0)
                    HomeView().tabItem { Label("Inbox", systemImage: "tray.full") }.tag(1)
                        .badge(model.board?.jobs("needs_you").count ?? 0)
                    CalendarAgendaView().tabItem { Label("Calendar", systemImage: "calendar") }.tag(2)
                    ChatView().tabItem { Label("Chief of Staff", systemImage: "bubble.left.and.bubble.right") }.tag(3)
                    MoreView().tabItem { Label("More", systemImage: "square.grid.2x2") }.tag(4)
                }
                .onAppear { model.startPolling() }
            }
        }
        .overlay(alignment: .top) {
            if let t = model.toast {
                Text(t)
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.3), value: model.toast)
    }
}

// MARK: pairing

struct PairView: View {
    @EnvironmentObject var model: AppModel
    @State private var scanning = false
    @State private var pasted = ""
    @State private var problem: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("🕹️").font(.system(size: 64))
                    Text("Mission Control").font(.largeTitle.bold())
                    Text("Answer your agents, talk to your chief of staff and keep an eye on trading, right from your phone.")
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 10) {
                        step(1, "On your Mac, open Mission Control and click **📱 Phone**.")
                        step(2, "Turn on phone access. A code appears.")
                        step(3, "Scan it here. Your phone needs to be on the same Wi-Fi as the Mac.")
                    }
                    .padding()
                    .background(Color.panel, in: RoundedRectangle(cornerRadius: 16))

                    if DataScannerViewController.isSupported {
                        Button {
                            scanning = true
                        } label: {
                            Label("Scan pairing code", systemImage: "qrcode.viewfinder")
                                .frame(maxWidth: .infinity).padding(.vertical, 6)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                    }

                    DisclosureGroup("Or paste the code") {
                        TextField("Pairing code", text: $pasted, axis: .vertical)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .font(.footnote.monospaced())
                            .lineLimit(3...6)
                            .padding(10)
                            .background(Color.panel, in: RoundedRectangle(cornerRadius: 10))
                        Button("Pair") { tryPair(pasted) }.buttonStyle(.bordered)
                    }
                    .tint(.gold)

                    if let problem { Text(problem).foregroundStyle(Color.needs).font(.footnote) }

                    VStack(alignment: .leading, spacing: 4) {
                        SupportPrivacyLinks()
                    }
                }
                .padding(24)
            }
            .sheet(isPresented: $scanning) {
                QRScanner { code in
                    scanning = false
                    tryPair(code)
                }
                .ignoresSafeArea()
            }
        }
    }

    private func step(_ n: Int, _ text: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(n)").font(.headline).frame(width: 26, height: 26).background(Color.gold, in: Circle()).foregroundStyle(.black)
            Text(text)
        }
    }

    private func tryPair(_ text: String) {
        if model.pair(with: text) { problem = nil } else { problem = "That doesn't look like a Mission Control pairing code." }
    }
}

/// Public help and privacy information is available before and after pairing.
struct SupportPrivacyLinks: View {
    var body: some View {
        Group {
            Link(destination: URL(string: "https://eb28.co/missioncontrol/support/")!) {
                Label("Support", systemImage: "questionmark.circle")
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .accessibilityHint("Opens Mission Control support in your browser")

            Link(destination: URL(string: "https://eb28.co/missioncontrol/privacy/")!) {
                Label("Privacy Policy", systemImage: "hand.raised")
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .accessibilityHint("Opens Mission Control privacy policy in your browser")
        }
    }
}

/// Live camera QR scanner (VisionKit).
struct QRScanner: UIViewControllerRepresentable {
    var onCode: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.qr])], qualityLevel: .balanced, isHighlightingEnabled: true)
        vc.delegate = context.coordinator
        try? vc.startScanning()
        return vc
    }

    func updateUIViewController(_ vc: DataScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onCode: (String) -> Void
        var done = false
        init(onCode: @escaping (String) -> Void) { self.onCode = onCode }

        func dataScanner(_ s: DataScannerViewController, didAdd items: [RecognizedItem], allItems: [RecognizedItem]) {
            for item in items {
                if case .barcode(let b) = item, let v = b.payloadStringValue, !done {
                    done = true
                    s.stopScanning()
                    onCode(v)
                }
            }
        }
    }
}
