import SwiftUI

struct DealsView: View {
    @Environment(AuthorityStore.self) private var store
    @State private var selectedKind: ProductKind? = nil
    @State private var searchText = ""

    private var filteredProducts: [Product] {
        AuthorityContent.products.filter { product in
            let matchesKind = selectedKind == nil || product.kind == selectedKind
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let matchesSearch = query.isEmpty ||
            product.name.lowercased().contains(query) ||
            product.brand.lowercased().contains(query) ||
            product.effects.joined(separator: " ").lowercased().contains(query)
            return matchesKind && matchesSearch
        }
    }

    private var filteredDeals: [Deal] {
        AuthorityContent.deals.filter { deal in
            selectedKind == nil || deal.kind == selectedKind
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 22) {
                    header
                    search
                    dealRail
                    products
                    saved
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            AuthorityLogo()
            VStack(alignment: .leading, spacing: 2) {
                Text("Deals")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(Color.authorityText)
                Text("Save products, compare forms, and check limits first.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
            Spacer()
        }
    }

    private var search: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Shop", title: "Product finder")
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.authorityMuted)
                    TextField("Search effects, brand, or product", text: $searchText)
                        .foregroundStyle(Color.authorityText)
                        .textInputAutocapitalization(.words)
                }
                .padding(12)
                .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ProductKindChip(title: "All", selected: selectedKind == nil) {
                            selectedKind = nil
                        }
                        ForEach(ProductKind.allCases) { kind in
                            ProductKindChip(title: kind.rawValue, selected: selectedKind == kind) {
                                selectedKind = selectedKind == kind ? nil : kind
                            }
                        }
                    }
                }
            }
        }
    }

    private var dealRail: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "Offers", title: "Current market signals")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(filteredDeals) { deal in
                        DealCard(deal: deal)
                            .frame(width: 260)
                    }
                }
                .padding(.horizontal, 1)
            }
        }
    }

    private var products: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "Menu", title: "Comparable products")

            if filteredProducts.isEmpty {
                EmptyStateView(
                    icon: "slider.horizontal.3",
                    title: "No matches",
                    message: "Try a broader effect, brand, or product category."
                )
            } else {
                ForEach(filteredProducts) { product in
                    ProductRow(
                        product: product,
                        saved: store.savedProductIDs.contains(product.id)
                    ) {
                        store.toggleProduct(product)
                    }
                }
            }
        }
    }

    private var saved: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Saved", title: "Your shortlist")
                if store.savedProducts.isEmpty {
                    Text("Bookmark products to build a visit-ready shortlist.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.authorityMuted)
                } else {
                    ForEach(store.savedProducts) { product in
                        HStack {
                            Image(systemName: "bookmark.fill")
                                .foregroundStyle(Color.authorityGold)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(product.name)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(Color.authorityText)
                                Text(product.retailer)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Color.authorityMuted)
                            }
                            Spacer()
                            Text(product.priceText)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Color.authorityGreen)
                        }
                    }
                }
            }
        }
    }
}

private struct ProductKindChip: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(selected ? Color.authorityInk : Color.authorityText)
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(selected ? Color.authorityGreen : Color.authorityRaised, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct DealCard: View {
    let deal: Deal

    var body: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Pill(text: deal.kind.rawValue, systemImage: "tag.fill", tint: Color.authorityGold)
                    Spacer()
                    Text(deal.expiresText)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color.authorityCoral)
                }
                Text(deal.title)
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundStyle(Color.authorityText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)
                VStack(alignment: .leading, spacing: 5) {
                    Text(deal.retailer)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.authorityGreen)
                    Text("\(deal.city) - \(deal.finePrint)")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.authorityMuted)
                        .lineSpacing(3)
                }
                if deal.medicalOnly {
                    Pill(text: "Medical eligibility", systemImage: "checkmark.shield", tint: Color.authorityGreen)
                }
            }
        }
    }
}

private struct ProductRow: View {
    let product: Product
    let saved: Bool
    let toggleSaved: () -> Void

    var body: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 13) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(product.name)
                            .font(.system(.headline, design: .rounded, weight: .bold))
                            .foregroundStyle(Color.authorityText)
                            .lineLimit(2)
                        Text("\(product.brand) - \(product.kind.rawValue)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.authorityMuted)
                    }
                    Spacer()
                    Button(action: toggleSaved) {
                        Image(systemName: saved ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(saved ? Color.authorityGold : Color.authorityMuted)
                            .frame(width: 36, height: 36)
                            .background(Color.authorityRaised, in: Circle())
                    }
                    .buttonStyle(.plain)
                }

                HStack(spacing: 8) {
                    Pill(text: product.thc, systemImage: "flame.fill")
                    Pill(text: product.cbd, systemImage: "drop.fill", tint: Color.authorityGold)
                }

                Text(product.effects.joined(separator: " - "))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Color.authorityText)

                Text("Terpenes: \(product.terpenes.joined(separator: ", "))")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.authorityMuted)

                HStack {
                    Text(product.retailer)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.authorityMuted)
                    Spacer()
                    Text(product.priceText)
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .foregroundStyle(Color.authorityGreen)
                }
            }
        }
    }
}
