import fs from 'node:fs';
import path from 'node:path';

const packagePath = path.resolve('ios/App/CapApp-SPM/Package.swift');
let source = fs.readFileSync(packagePath, 'utf8');

const dependencySnippet = '        .package(url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git", exact: "13.2.0"),\n';
const umpDependencySnippet = '        .package(url: "https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git", exact: "3.1.0"),\n';
const productSnippet = '                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),\n';
const umpProductSnippet = '                .product(name: "GoogleUserMessagingPlatform", package: "swift-package-manager-google-user-messaging-platform"),\n';

if (!source.includes('swift-package-manager-google-mobile-ads.git')) {
  source = source.replace(
    '    dependencies: [\n        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),\n',
    '    dependencies: [\n        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),\n' + dependencySnippet
  );
}

if (!source.includes('swift-package-manager-google-user-messaging-platform.git')) {
  source = source.replace(
    '    dependencies: [\n        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),\n',
    '    dependencies: [\n        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),\n' + umpDependencySnippet
  );
}

if (!source.includes('.product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads")')) {
  source = source.replace(
    '            dependencies: [\n                .product(name: "Capacitor", package: "capacitor-swift-pm"),\n                .product(name: "Cordova", package: "capacitor-swift-pm"),\n',
    '            dependencies: [\n                .product(name: "Capacitor", package: "capacitor-swift-pm"),\n                .product(name: "Cordova", package: "capacitor-swift-pm"),\n' + productSnippet
  );
}

if (!source.includes('.product(name: "GoogleUserMessagingPlatform", package: "swift-package-manager-google-user-messaging-platform")')) {
  source = source.replace(
    '                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),\n',
    '                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),\n' + umpProductSnippet
  );
}

fs.writeFileSync(packagePath, source);
console.log(`Ensured AdMob and UMP SPM dependencies in ${packagePath}`);
