# iOS App Deployment Guide

## Build and Release Process

### Prerequisites

1. **Xcode Setup**
   ```bash
   xcode-select --install
   ```

2. **Apple Developer Account**
   - Enroll in Apple Developer Program
   - Create App ID and provisioning profiles
   - Set up code signing certificates

3. **Dependencies**
   ```bash
   cd ios
   pod install
   ```

### Development Build

```bash
# Open workspace
open OTG.xcworkspace

# Build for simulator
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -sdk iphonesimulator \
  -configuration Debug

# Build for device
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -sdk iphoneos \
  -configuration Debug
```

### Release Build

```bash
# Create release build
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -sdk iphoneos \
  -configuration Release \
  -archivePath OTG.xcarchive \
  archive

# Export app
xcodebuild -exportArchive \
  -archivePath OTG.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath build/
```

## Code Signing

### Certificates

1. **Development Certificate**
   ```bash
   # Generate certificate signing request in Keychain Access
   # Submit to Apple Developer Portal
   # Download and install in Keychain
   ```

2. **Distribution Certificate**
   ```bash
   # Create in Apple Developer Portal
   # Download and install in Keychain
   ```

### Provisioning Profiles

1. **Development Profile**
   - App ID: `org.unfpa.otg`
   - Devices: Test devices
   - Download and add to Xcode

2. **Distribution Profile**
   - App ID: `org.unfpa.otg`
   - Type: App Store
   - Download and add to Xcode

## App Store Submission

### Prepare for Release

1. **Update Version Numbers**
   ```
   Xcode Settings:
   - Marketing Version: 1.0.0
   - Build Number: 1
   ```

2. **Create Release Notes**
   ```
   Release Notes (App Store):
   - Bug fixes and performance improvements
   - Updated clinical guidelines
   - Support for new languages
   ```

3. **Screenshots and Metadata**
   - Device screenshots (all sizes)
   - App description (max 170 chars)
   - Keywords
   - Support URL
   - Privacy policy

4. **Compliance**
   - Encryption compliance declaration
   - Content rating
   - Health & fitness category

### Submit to App Store

1. **Use Transporter**
   ```bash
   # Download app from build folder
   # Open Transporter
   # Select app binary
   # Submit
   ```

2. **Or use Xcode**
   ```
   Xcode → Product → Archive → Distribute App → App Store Connect
   ```

## TestFlight Beta Testing

### Prepare Beta Build

```bash
# Create archive for TestFlight
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -configuration Release \
  -archivePath OTG.xcarchive \
  archive

# Export for TestFlight
xcodebuild -exportArchive \
  -archivePath OTG.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath build/
```

### Add Beta Testers

1. Log in to App Store Connect
2. Select app → TestFlight
3. Add beta testers (emails)
4. Send invitation

### Monitor Beta

```
App Store Connect:
- Crash reports
- Performance metrics
- User feedback
```

## Continuous Integration

### GitHub Actions Setup

Create `.github/workflows/ios-release.yml`:

```yaml
name: iOS Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
      
      - name: Install dependencies
        run: |
          cd ios
          pod install
      
      - name: Build
        run: |
          xcodebuild -workspace ios/OTG.xcworkspace \
            -scheme OTG \
            -configuration Release \
            -sdk iphoneos \
            -archivePath OTG.xcarchive \
            archive
      
      - name: Export
        run: |
          xcodebuild -exportArchive \
            -archivePath OTG.xcarchive \
            -exportOptionsPlist ios/exportOptions.plist \
            -exportPath build/
      
      - name: Upload to TestFlight
        env:
          APPLE_USERNAME: ${{ secrets.APPLE_USERNAME }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
        run: |
          xcrun altool --upload-app -f build/OTG.ipa \
            -u $APPLE_USERNAME \
            -p $APPLE_PASSWORD \
            --type ios
```

## Version Management

### Semantic Versioning

- **Major**: Breaking clinical changes
- **Minor**: New features
- **Patch**: Bug fixes

Example: `1.2.3`

### Update Version

```bash
# In Xcode
Target Settings → General → Version and Build

# Or via script
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.1.0" OTG/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 2" OTG/Info.plist
```

## Performance Monitoring

### XCTest Performance Tests

```swift
func testSearchPerformance() {
    let service = KnowledgeService()
    measure {
        let _ = try? await service.search(query: "postpartum hemorrhage")
    }
}
```

### Instruments

```bash
# Profile app
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -configuration Release \
  -resultBundlePath Profiling.xcresult \
  test -enableTestability

# Open in Instruments
open Profiling.xcresult
```

## Crash Reporting

### Enable Crash Reporting

1. **App Store Connect**
   - Automatically collected for App Store builds
   - View in Xcode Organizer

2. **Third-party Services**
   - Sentry: Error tracking
   - Firebase Crashlytics: Real-time monitoring

## Rollback Procedure

### If Issues Detected

1. **Review Crash Reports**
   - Check App Store Connect
   - Analyze stack traces

2. **Create Hotfix Build**
   ```bash
   git checkout -b hotfix/version-patch
   # Fix issues
   git commit
   git tag v1.0.1
   ```

3. **Submit Hotfix**
   - Increment build number
   - Update release notes
   - Submit as expedited release

## Monitoring After Release

### Key Metrics

1. **Stability**
   - Crash rate (target: < 0.1%)
   - Session crash rate
   - Top crash types

2. **Performance**
   - Launch time (target: < 2s)
   - Search latency (target: < 500ms)
   - Memory usage (target: < 200MB)

3. **Engagement**
   - Daily active users
   - Session length
   - Feature usage

### Analytics Setup

```swift
// Log events
Analytics.logEvent("search", parameters: [
    "query_length": query.count,
    "result_count": results.count
])
```

## Troubleshooting

### Build Issues

```bash
# Clear build cache
rm -rf ios/Pods ios/Podfile.lock
pod install

# Clean Xcode cache
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Code Signing Issues

```bash
# List certificates
security find-identity -v -p codesigning

# Reset Keychain
security default-keychain -s ~/Library/Keychains/login.keychain
```

### Upload Issues

```bash
# Check certificate expiry
security find-certificate -a -c "iPhone Distribution" -p | \
  openssl x509 -noout -dates

# Reset credentials
xcrun altool --reset-password
```

## Security Checklist

- [ ] Code signing enabled
- [ ] Entitlements configured
- [ ] Secrets not in source code
- [ ] HTTPS only for API calls
- [ ] Data encrypted at rest
- [ ] No debug symbols in release
- [ ] Privacy policy updated
- [ ] GDPR compliance verified

## Release Checklist

- [ ] Version numbers updated
- [ ] Release notes prepared
- [ ] Screenshots added
- [ ] Metadata verified
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] Security review complete
- [ ] Beta testing successful
- [ ] Crash reports reviewed
- [ ] Analytics enabled

## Support

For issues with deployment:
1. Check Xcode build logs
2. Review App Store Connect messages
3. Contact Apple Developer Support
4. Check GitHub Issues

## Related Documentation

- [README.md](README.md) - Setup instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - Code structure
- [Apple Developer Guides](https://developer.apple.com/ios/)
