# OTG iOS App

Clinical knowledge application for maternal and child health in low-resource settings.

## Overview

The OTG iOS app provides offline-first access to clinical guidelines, drug formularies, and emergency protocols. Built with SwiftUI and Core Data, it mirrors the Android architecture for feature parity across platforms.

## Features

- **Clinical Chat Interface** - Ask clinical questions and receive evidence-based guidance
- **Drug Formulary** - Searchable medication database with dosing information
- **Emergency Protocols** - Quick-reference guidelines for common clinical emergencies
- **Offline-First** - Full functionality without internet connectivity
- **Multi-language Support** - English, Swahili, Amharic, French, Tigrinya, Somali
- **Background Sync** - Automatic content updates when online
- **Signature Verification** - Ed25519 verification for content integrity

## Project Structure

```
ios/
├── OTG/
│   ├── Models/
│   │   ├── KnowledgeChunk.swift          # Knowledge chunk entity
│   │   ├── KnowledgeDoc.swift            # Document entity
│   │   ├── FormularyEntry.swift          # Drug database
│   │   └── ClinicalSource.swift          # Citation tracking
│   ├── Services/
│   │   ├── KnowledgeService.swift        # Search & knowledge retrieval
│   │   ├── EmbeddingService.swift        # Vector embeddings
│   │   ├── BundleService.swift           # Bundle download/verification
│   │   └── SyncService.swift             # Background sync
│   ├── Views/
│   │   ├── ChatView.swift                # Clinical chat UI
│   │   ├── DrugLookupView.swift          # Drug formulary UI
│   │   ├── ClinicalProtocolsView.swift   # Protocols & guidelines
│   │   └── OfflineIndicatorView.swift    # Sync status indicator
│   ├── Database/
│   │   ├── OTGDatabase.swift             # Core Data manager
│   │   └── OTG.xcdatamodeld/             # Core Data schema
│   ├── Utilities/
│   │   ├── LocalizationManager.swift     # i18n support
│   │   └── AccessibilityHelper.swift     # WCAG compliance
│   ├── App.swift                         # SwiftUI app entry point
│   ├── Info.plist                        # App configuration
│   └── Assets.xcassets/                  # App icons & images
├── Podfile                                # Dependency management
└── OTG.xcodeproj/                        # Xcode project
```

## Architecture

### Models
- **KnowledgeChunk**: 384-dimensional semantic chunk with embedding and citation metadata
- **KnowledgeDoc**: Document metadata tracking and vertical classification
- **FormularyEntry**: Drug with indications, dosing, contraindications, warnings
- **ClinicalSource**: Source citation with verification status

### Database
- **Core Data** with SQLite backend
- Offline persistence with automatic sync
- Relationships: KnowledgeDoc → KnowledgeChunks
- Indexed queries for fast search

### Services
- **KnowledgeService**: Semantic search with cosine similarity
- **EmbeddingService**: Text-to-vector encoding (384-dimensional)
- **BundleService**: Downloads and verifies bundles with Ed25519 signatures
- **SyncService**: Background task scheduling with NetworkMonitor

### UI
- **SwiftUI** (iOS 15+)
- **Tab-based navigation** (Chat, Drugs, Protocols, Settings)
- **Responsive design** for phones and tablets
- **Dark mode support**

## Getting Started

### Requirements
- Xcode 15.4+
- iOS 15.0+
- Swift 5.9+
- CocoaPods (for dependency management)

### Installation

1. Clone the repository
```bash
git clone https://github.com/unfpa/lkyspp-otg.git
cd lkyspp-otg/ios
```

2. Install dependencies
```bash
pod install
```

3. Open Xcode project
```bash
open OTG.xcworkspace
```

4. Build and run
```bash
xcode-select --install  # if needed
xcodebuild -workspace OTG.xcworkspace -scheme OTG -configuration Debug
```

## Building from Command Line

```bash
# Debug build
xcodebuild -workspace OTG.xcworkspace -scheme OTG -configuration Debug

# Release build
xcodebuild -workspace OTG.xcworkspace -scheme OTG -configuration Release

# Build for simulator
xcodebuild -workspace OTG.xcworkspace -scheme OTG -sdk iphonesimulator

# Build for device
xcodebuild -workspace OTG.xcworkspace -scheme OTG -sdk iphoneos
```

## Testing

```bash
# Run all tests
xcodebuild test -workspace OTG.xcworkspace -scheme OTG

# Run specific test
xcodebuild test -workspace OTG.xcworkspace -scheme OTG -only-testing "OTGTests/KnowledgeServiceTests"
```

## Configuration

### Environment Variables

Set in `Info.plist`:
```xml
<key>API_BASE_URL</key>
<string>https://api.example.com</string>
<key>SUPABASE_URL</key>
<string>https://supabase.example.com</string>
```

### Localization

Add language strings in `Resources/Strings.{language}.strings`:
- `en` - English
- `sw` - Swahili
- `am` - Amharic
- `fr` - French
- `ti` - Tigrinya
- `so` - Somali

## Features in Detail

### Clinical Chat

Search clinical knowledge by natural language query:
```swift
await knowledgeService.search(
    query: "postpartum hemorrhage treatment",
    topK: 5,
    verticals: ["MOH_MMR"]
)
```

Results include:
- Chunk content with citation
- Source document reference
- Similarity score

### Drug Formulary

Search by drug name or indication:
```swift
let formularys = database.fetchAllFormularyEntries()
let oxytocin = database.fetchFormularyEntry(by: "oxytocin")
```

Includes:
- Generic and local names
- Routes and dosing
- Contraindications and warnings
- WHO EML listing status

### Emergency Protocols

Quick-reference clinical algorithms:
- Step-by-step guidance
- Key medications with doses
- Precautions and contraindications
- Source citations

### Offline Sync

Background synchronization (every 12 hours):
- Checks server for updates
- Verifies signatures with Ed25519
- Downloads only changed content
- Atomic updates with rollback

## Security

### Signature Verification
- All bundles signed with Ed25519
- Public key bundled in app
- Unverified bundles rejected silently
- No automatic fallback to unsigned

### Data Protection
- Core Data encryption at rest
- HTTPS for all network calls
- Credential storage in Keychain
- No sensitive data in logs

## Performance

- Vector search: O(n) with cosine similarity
- Database queries: Indexed by slug, docSlug
- Chunk loading: Lazy with pagination
- Sync: Incremental, delta-based updates

## Accessibility

WCAG 2.1 AA compliance:
- VoiceOver support
- Minimum 44pt touch targets
- Sufficient color contrast
- Semantic labels on all interactive elements
- Keyboard navigation support

## Multi-Language Support

Automatic detection of system language, with fallback to English:
```swift
let manager = LocalizationManager()
let translated = manager.localize("welcome_message")
```

Supported languages:
- English (default)
- Kiswahili
- አማርኛ (Amharic)
- Français
- ትግርኛ (Tigrinya)
- Af Soomaali

## Troubleshooting

### App crashes on startup
1. Check that `knowledge/index.json` exists in app bundle
2. Verify `embeddings/vectors.bin` is present
3. Clear app data: Settings → General → Storage → OTG → Offload App

### Database errors
1. Delete app and reinstall
2. Check database file permissions
3. Review Core Data schema migrations

### Sync not working
1. Check network connectivity
2. Verify public key in bundle
3. Review sync logs in Console app

### Search returns no results
1. Ensure knowledge base is initialized
2. Check that chunks are loaded into database
3. Try broader search terms

## Contributing

Please follow the Android architecture patterns when contributing:
- One file per entity/service
- SwiftUI for all UI
- Core Data for persistence
- Proper error handling with Result types
- Comprehensive documentation

## License

This project is licensed under the UNFPA License.

## Support

For issues, questions, or contributions, please open an issue on GitHub:
https://github.com/unfpa/lkyspp-otg/issues
