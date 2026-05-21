import SwiftUI

struct LearnView: View {
    @Environment(AuthorityStore.self) private var store
    @State private var webDestination: WebDestination?

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 22) {
                    header
                    complianceStrip
                    stateMatrix
                    articleList
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $webDestination) { destination in
                SafariSheet(url: destination.url)
                    .ignoresSafeArea()
            }
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            AuthorityLogo()
            VStack(alignment: .leading, spacing: 2) {
                Text("Learn")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(Color.authorityText)
                Text("State sources, product literacy, and safer shopping.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
            Spacer()
        }
    }

    private var complianceStrip: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Authority standard", title: "No license, no order")
                HStack(spacing: 10) {
                    ComplianceStep(number: "1", title: "Verify", detail: "Open the state source.")
                    ComplianceStep(number: "2", title: "Match", detail: "Check name and address.")
                    ComplianceStep(number: "3", title: "Limit", detail: "Confirm card and allotment.")
                }
            }
        }
    }

    private var stateMatrix: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "States", title: "Official cannabis sources")
            ForEach(AuthorityContent.states) { state in
                AuthorityPanel {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(state.name)
                                    .font(.system(.headline, design: .rounded, weight: .bold))
                                    .foregroundStyle(Color.authorityText)
                                Text(state.sourceTitle)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Color.authorityMuted)
                            }
                            Spacer()
                            Button {
                                webDestination = WebDestination(url: state.regulatorURL)
                            } label: {
                                Image(systemName: "safari")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(Color.authorityInk)
                                    .frame(width: 38, height: 38)
                                    .background(Color.authorityGreen, in: Circle())
                            }
                            .buttonStyle(.plain)
                        }

                        Text(state.limitSummary)
                            .font(.system(size: 13))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(3)

                        HStack(spacing: 8) {
                            Pill(text: state.adultUseAge, systemImage: "person.fill", tint: Color.authorityGold)
                            Pill(text: "\(state.defaultWindowDays)d", systemImage: "calendar", tint: Color.authorityText)
                        }
                    }
                }
            }
        }
    }

    private var articleList: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "Guides", title: "What matters at checkout")
            ForEach(AuthorityContent.education) { article in
                AuthorityPanel {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Pill(text: article.category, systemImage: "book.fill", tint: Color.authorityGold)
                            Spacer()
                            Text(article.readTime)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Color.authorityMuted)
                        }
                        Text(article.title)
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(Color.authorityText)
                        Text(article.subtitle)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(4)
                        VStack(alignment: .leading, spacing: 9) {
                            ForEach(article.bullets, id: \.self) { bullet in
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Color.authorityGreen)
                                    Text(bullet)
                                        .font(.system(size: 13))
                                        .foregroundStyle(Color.authorityText)
                                        .lineSpacing(3)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct ComplianceStep: View {
    let number: String
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(number)
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(Color.authorityInk)
                .frame(width: 30, height: 30)
                .background(Color.authorityGreen, in: Circle())
            Text(title)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(Color.authorityText)
            Text(detail)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.authorityMuted)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
