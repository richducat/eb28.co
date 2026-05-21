import Foundation
import MapKit

enum AuthorityTab: String, CaseIterable, Identifiable, Codable {
    case explore
    case rec
    case deals
    case learn
    case account

    var id: String { rawValue }

    var title: String {
        switch self {
        case .explore: "Explore"
        case .rec: "Rec"
        case .deals: "Deals"
        case .learn: "Learn"
        case .account: "Account"
        }
    }

    var icon: String {
        switch self {
        case .explore: "map.fill"
        case .rec: "checkmark.shield.fill"
        case .deals: "tag.fill"
        case .learn: "book.closed.fill"
        case .account: "person.crop.circle.fill"
        }
    }
}

enum RetailerType: String, CaseIterable, Identifiable, Codable {
    case storefront = "Storefront"
    case delivery = "Delivery"
    case medical = "Medical"
    case adultUse = "Adult Use"

    var id: String { rawValue }
}

enum ProductKind: String, CaseIterable, Identifiable, Codable {
    case flower = "Flower"
    case preroll = "Pre-roll"
    case edible = "Edible"
    case vape = "Vape"
    case concentrate = "Concentrate"
    case topical = "Topical"
    case tincture = "Tincture"

    var id: String { rawValue }
}

enum PurchaseUnit: String, CaseIterable, Identifiable, Codable {
    case gramsFlower = "grams flower"
    case gramsConcentrate = "grams concentrate"
    case milligramsTHC = "mg THC"
    case ouncesFlower = "ounces flower"

    var id: String { rawValue }

    var shortLabel: String {
        switch self {
        case .gramsFlower: "g flower"
        case .gramsConcentrate: "g concentrate"
        case .milligramsTHC: "mg THC"
        case .ouncesFlower: "oz flower"
        }
    }
}

struct StateProgram: Identifiable, Hashable, Codable {
    let id: String
    let name: String
    let adultUseAge: String
    let medicalAge: String
    let portalTitle: String
    let portalURL: URL
    let regulatorURL: URL
    let limitSummary: String
    let officialCheckSummary: String
    let defaultWindowDays: Int
    let flowerLimitGrams: Double?
    let concentrateLimitGrams: Double?
    let thcLimitMilligrams: Double?
    let sourceTitle: String
}

struct RecProfile: Codable, Equatable {
    var legalName: String = ""
    var stateId: String = "CA"
    var cardNumber: String = ""
    var practitioner: String = ""
    var expirationDate: Date = Calendar.current.date(byAdding: .month, value: 7, to: .now) ?? .now
    var notes: String = ""
    var acceptedPrivacy: Bool = false

    var isStarted: Bool {
        !legalName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
        !cardNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

struct PurchaseEntry: Identifiable, Codable, Hashable {
    var id = UUID()
    var productName: String
    var amount: Double
    var unit: PurchaseUnit
    var purchasedAt: Date
    var retailerName: String

    var formattedAmount: String {
        let formatted = amount.formatted(.number.precision(.fractionLength(0...2)))
        return "\(formatted) \(unit.shortLabel)"
    }
}

struct Retailer: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let city: String
    let state: String
    let address: String
    let distanceText: String
    let rating: Double
    let license: String
    let types: [RetailerType]
    let openStatus: String
    let pickupETA: String
    let deliveryETA: String
    let coordinateLatitude: Double
    let coordinateLongitude: Double
    let highlights: [String]
    let sourceURL: URL

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: coordinateLatitude, longitude: coordinateLongitude)
    }
}

struct AuthorityPlace: Identifiable, Hashable {
    let id: String
    let name: String
    let address: String
    let phone: String
    let url: URL?
    let latitude: Double
    let longitude: Double

    init(mapItem: MKMapItem) {
        let placemark = mapItem.placemark
        id = [
            mapItem.name ?? "Place",
            placemark.coordinate.latitude.formatted(),
            placemark.coordinate.longitude.formatted()
        ].joined(separator: "-")
        name = mapItem.name ?? "Cannabis retailer"
        address = [
            placemark.subThoroughfare,
            placemark.thoroughfare,
            placemark.locality,
            placemark.administrativeArea
        ]
        .compactMap { $0 }
        .joined(separator: " ")
        phone = mapItem.phoneNumber ?? ""
        url = mapItem.url
        latitude = placemark.coordinate.latitude
        longitude = placemark.coordinate.longitude
    }
}

struct Deal: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let retailer: String
    let city: String
    let expiresText: String
    let kind: ProductKind
    let medicalOnly: Bool
    let finePrint: String
}

struct Product: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let brand: String
    let kind: ProductKind
    let thc: String
    let cbd: String
    let effects: [String]
    let terpenes: [String]
    let priceText: String
    let retailer: String
}

struct EducationArticle: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let category: String
    let readTime: String
    let bullets: [String]
}

struct WebDestination: Identifiable, Hashable {
    let id = UUID()
    let url: URL
}

enum AuthorityContent {
    static let states: [StateProgram] = [
        StateProgram(
            id: "CA",
            name: "California",
            adultUseAge: "21+",
            medicalAge: "18+ with physician recommendation",
            portalTitle: "California DCC license and consumer resources",
            portalURL: URL(string: "https://search.cannabis.ca.gov/")!,
            regulatorURL: URL(string: "https://www.cannabis.ca.gov/")!,
            limitSummary: "Adult-use daily sale limit: 28.5 g non-concentrated cannabis, 8 g concentrate, and 6 immature plants. Medicinal limits can be higher with physician recommendation.",
            officialCheckSummary: "California does not provide one central patient allotment login in this app. Use licensed retailers and your physician recommendation for official medicinal limits.",
            defaultWindowDays: 1,
            flowerLimitGrams: 28.5,
            concentrateLimitGrams: 8,
            thcLimitMilligrams: nil,
            sourceTitle: "California Department of Cannabis Control"
        ),
        StateProgram(
            id: "FL",
            name: "Florida",
            adultUseAge: "Medical only",
            medicalAge: "Qualified patient",
            portalTitle: "Florida Medical Marijuana Use Registry",
            portalURL: URL(string: "https://mmuregistry.flhealth.gov/")!,
            regulatorURL: URL(string: "https://knowthefactsmmj.com/registry/")!,
            limitSummary: "Florida recommendations are route-specific and recorded in the Medical Marijuana Use Registry. The official amount-available page is the source of truth.",
            officialCheckSummary: "Open the Florida MMUR to view your patient certifications, orders, and amount-available calculation page.",
            defaultWindowDays: 70,
            flowerLimitGrams: nil,
            concentrateLimitGrams: nil,
            thcLimitMilligrams: nil,
            sourceTitle: "Florida Office of Medical Marijuana Use"
        ),
        StateProgram(
            id: "AZ",
            name: "Arizona",
            adultUseAge: "21+",
            medicalAge: "Qualified patient",
            portalTitle: "Arizona medical marijuana resources",
            portalURL: URL(string: "https://individual-licensing.azdhs.gov/")!,
            regulatorURL: URL(string: "https://www.azdhs.gov/licensing/medical-marijuana/")!,
            limitSummary: "Arizona medical patients may purchase up to 2.5 oz of medical marijuana in a 14-day window.",
            officialCheckSummary: "Use Arizona's individual licensing portal for card status. Retailers log medical allotment activity at sale.",
            defaultWindowDays: 14,
            flowerLimitGrams: 70.87,
            concentrateLimitGrams: nil,
            thcLimitMilligrams: nil,
            sourceTitle: "Arizona Department of Health Services"
        ),
        StateProgram(
            id: "NY",
            name: "New York",
            adultUseAge: "21+",
            medicalAge: "Certified patient",
            portalTitle: "New York Medical Cannabis Data Management System",
            portalURL: URL(string: "https://cannabis.ny.gov/patient-registration-instructions")!,
            regulatorURL: URL(string: "https://cannabis.ny.gov/")!,
            limitSummary: "New York patients use certification and state medical cannabis systems. Patients should confirm current dispensation rules in MCDMS or with a registered organization.",
            officialCheckSummary: "Open New York patient registration instructions and MCDMS access to confirm card and certification details.",
            defaultWindowDays: 60,
            flowerLimitGrams: nil,
            concentrateLimitGrams: nil,
            thcLimitMilligrams: nil,
            sourceTitle: "New York Office of Cannabis Management"
        ),
        StateProgram(
            id: "PA",
            name: "Pennsylvania",
            adultUseAge: "Medical only",
            medicalAge: "Certified patient",
            portalTitle: "Pennsylvania Medical Marijuana Registry",
            portalURL: URL(string: "https://padohmmp.custhelp.com/app/login")!,
            regulatorURL: URL(string: "https://www.pa.gov/agencies/health/programs/medical-marijuana/medical-marijuana-patients.html")!,
            limitSummary: "Pennsylvania patients use the state registry and may obtain medical marijuana from approved dispensaries with a valid ID card.",
            officialCheckSummary: "Use the Pennsylvania registry for profile, certification, card, and program status.",
            defaultWindowDays: 30,
            flowerLimitGrams: nil,
            concentrateLimitGrams: nil,
            thcLimitMilligrams: nil,
            sourceTitle: "Pennsylvania Department of Health"
        ),
        StateProgram(
            id: "OH",
            name: "Ohio",
            adultUseAge: "21+",
            medicalAge: "Registered patient",
            portalTitle: "Ohio Medical Marijuana Registry",
            portalURL: URL(string: "https://medicalmarijuana.ohio.gov/")!,
            regulatorURL: URL(string: "https://com.ohio.gov/divisions-and-programs/cannabis-control")!,
            limitSummary: "Ohio medical purchase limits and day-supply rules can change. Confirm current days-supply and purchase status in the registry.",
            officialCheckSummary: "Open Ohio's medical marijuana resources and registry support for official remaining days and recommendation details.",
            defaultWindowDays: 90,
            flowerLimitGrams: nil,
            concentrateLimitGrams: nil,
            thcLimitMilligrams: nil,
            sourceTitle: "Ohio Division of Cannabis Control"
        ),
        StateProgram(
            id: "NV",
            name: "Nevada",
            adultUseAge: "21+",
            medicalAge: "Cardholder",
            portalTitle: "Nevada Cannabis Compliance Board",
            portalURL: URL(string: "https://ccb.nv.gov/")!,
            regulatorURL: URL(string: "https://ccb.nv.gov/")!,
            limitSummary: "Nevada purchase and possession limits vary by adult-use or medical status. Confirm cardholder status through Nevada state resources.",
            officialCheckSummary: "Use Nevada Cannabis Compliance Board resources and your dispensary receipt history for official compliance.",
            defaultWindowDays: 14,
            flowerLimitGrams: 70.87,
            concentrateLimitGrams: nil,
            thcLimitMilligrams: nil,
            sourceTitle: "Nevada Cannabis Compliance Board"
        )
    ]

    static let retailers: [Retailer] = [
        Retailer(
            id: "ca-greenline",
            name: "Greenline Reserve",
            city: "Los Angeles",
            state: "CA",
            address: "Arts District, Los Angeles",
            distanceText: "2.4 mi",
            rating: 4.8,
            license: "Verify in CA DCC search",
            types: [.storefront, .adultUse, .medical],
            openStatus: "Open until 9 PM",
            pickupETA: "18 min",
            deliveryETA: "55-75 min",
            coordinateLatitude: 34.0407,
            coordinateLongitude: -118.2468,
            highlights: ["DCC verification link", "Medical queue", "Express pickup"],
            sourceURL: URL(string: "https://search.cannabis.ca.gov/")!
        ),
        Retailer(
            id: "az-sonoran",
            name: "Sonoran Relief Market",
            city: "Phoenix",
            state: "AZ",
            address: "Central Phoenix",
            distanceText: "4.1 mi",
            rating: 4.7,
            license: "Verify with AZDHS",
            types: [.storefront, .adultUse, .medical],
            openStatus: "Open until 10 PM",
            pickupETA: "22 min",
            deliveryETA: "Unavailable",
            coordinateLatitude: 33.4484,
            coordinateLongitude: -112.0740,
            highlights: ["Medical allotment aware", "Staff picks", "Veteran discount"],
            sourceURL: URL(string: "https://www.azdhs.gov/licensing/medical-marijuana/")!
        ),
        Retailer(
            id: "fl-coastal",
            name: "Coastal Patient Supply",
            city: "Tampa",
            state: "FL",
            address: "South Tampa",
            distanceText: "3.8 mi",
            rating: 4.9,
            license: "Florida MMTC verification",
            types: [.storefront, .medical],
            openStatus: "Open until 8 PM",
            pickupETA: "15 min",
            deliveryETA: "Tomorrow AM",
            coordinateLatitude: 27.9506,
            coordinateLongitude: -82.4572,
            highlights: ["MMUR friendly", "Route-specific menu", "Same-day pickup"],
            sourceURL: URL(string: "https://knowthefactsmmj.com/")!
        ),
        Retailer(
            id: "ny-hudson",
            name: "Hudson Licensed Cannabis",
            city: "New York",
            state: "NY",
            address: "Lower Manhattan",
            distanceText: "1.7 mi",
            rating: 4.6,
            license: "Verify with OCM",
            types: [.storefront, .adultUse, .medical],
            openStatus: "Open until 11 PM",
            pickupETA: "25 min",
            deliveryETA: "60-90 min",
            coordinateLatitude: 40.7193,
            coordinateLongitude: -74.0020,
            highlights: ["OCM resource link", "Live menu ready", "Terpene filters"],
            sourceURL: URL(string: "https://cannabis.ny.gov/dispensary-location-verification")!
        )
    ]

    static let deals: [Deal] = [
        Deal(id: "daily-flower", title: "Fresh eighths under $28", retailer: "Greenline Reserve", city: "Los Angeles", expiresText: "Today", kind: .flower, medicalOnly: false, finePrint: "Availability and purchase limits vary by state and retailer."),
        Deal(id: "patient-vape", title: "Medical vape cartridge bundle", retailer: "Coastal Patient Supply", city: "Tampa", expiresText: "This week", kind: .vape, medicalOnly: true, finePrint: "Requires active Florida MMUR eligibility and route availability."),
        Deal(id: "edible-low-dose", title: "Low-dose edible sampler", retailer: "Hudson Licensed Cannabis", city: "New York", expiresText: "Weekend", kind: .edible, medicalOnly: false, finePrint: "Adults 21+ only unless a state medical program applies."),
        Deal(id: "terpene-topicals", title: "Topical relief set", retailer: "Sonoran Relief Market", city: "Phoenix", expiresText: "Ends soon", kind: .topical, medicalOnly: false, finePrint: "Confirm local availability before traveling.")
    ]

    static let products: [Product] = [
        Product(id: "blue-citrus", name: "Blue Citrus Gelato", brand: "North Coast", kind: .flower, thc: "24% THC", cbd: "<1% CBD", effects: ["Calm", "Creative", "Even"], terpenes: ["Limonene", "Caryophyllene"], priceText: "$32 eighth", retailer: "Greenline Reserve"),
        Product(id: "ratio-mint", name: "Ratio Mint 5:1", brand: "Hudson Lab", kind: .edible, thc: "5 mg THC", cbd: "25 mg CBD", effects: ["Balanced", "Soft", "Low intensity"], terpenes: ["Myrcene"], priceText: "$18 pack", retailer: "Hudson Licensed Cannabis"),
        Product(id: "desert-diesel", name: "Desert Diesel Live", brand: "Sonoran Extracts", kind: .vape, thc: "78% THC", cbd: "<1% CBD", effects: ["Bright", "Focused", "Social"], terpenes: ["Terpinolene", "Pinene"], priceText: "$42 cart", retailer: "Sonoran Relief Market"),
        Product(id: "route-cream", name: "Relief Route Cream", brand: "Coastal Patient", kind: .topical, thc: "300 mg THC", cbd: "300 mg CBD", effects: ["Localized", "Non-inhaled"], terpenes: ["Linalool"], priceText: "$38 jar", retailer: "Coastal Patient Supply")
    ]

    static let education: [EducationArticle] = [
        EducationArticle(
            id: "licensed-retail",
            title: "Verify the retailer first",
            subtitle: "Every state has its own license lookup or regulator page.",
            category: "Safety",
            readTime: "3 min",
            bullets: [
                "Use state regulator links before ordering from a new retailer.",
                "Match the business name, address, and license details before pickup.",
                "Avoid QR codes or social links that cannot be traced to a state license."
            ]
        ),
        EducationArticle(
            id: "allotment",
            title: "Know your official allotment",
            subtitle: "The state registry or retailer POS system is the authority.",
            category: "Medical",
            readTime: "4 min",
            bullets: [
                "Use Weed Authority as a private planning ledger, not a medical dosage calculator.",
                "Florida route limits, Ohio days supply, and Arizona rolling windows all work differently.",
                "If an in-app estimate conflicts with a state registry, the registry wins."
            ]
        ),
        EducationArticle(
            id: "labels",
            title: "Read cannabinoids and route",
            subtitle: "THC percent, milligrams, and form do not mean the same thing.",
            category: "Products",
            readTime: "5 min",
            bullets: [
                "Flower labels usually show percent by weight.",
                "Edibles and tinctures usually show milligrams per serving and package.",
                "Medical programs may track routes separately, especially in Florida."
            ]
        )
    ]
}
