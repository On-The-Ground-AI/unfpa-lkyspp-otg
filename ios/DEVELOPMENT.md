# iOS Development Guide

## Project Structure

```
ios/
├── README.md                          # Project overview and setup
├── ARCHITECTURE.md                    # Architecture and design patterns
├── DEPLOYMENT.md                      # Build and release process
├── DEVELOPMENT.md                     # This file - development guidelines
├── Podfile                            # Dependency management
├── Podfile.lock                       # Locked dependency versions
├── OTG.xcodeproj/                     # Xcode project configuration
│   └── project.pbxproj               # Build settings and file references
└── OTG/                               # Main app source code
    ├── App.swift                      # App entry point
    ├── Info.plist                     # App configuration
    ├── Models/                        # Data models
    │   ├── KnowledgeChunk.swift       # 384-dim semantic chunks
    │   ├── KnowledgeDoc.swift         # Document metadata
    │   ├── FormularyEntry.swift       # Drug database
    │   ├── ClinicalSource.swift       # Citation tracking
    │   └── AuditLogEntry.swift        # Query audit logs
    ├── Services/                      # Business logic
    │   ├── KnowledgeService.swift     # Search and retrieval
    │   ├── EmbeddingService.swift     # Text-to-vector
    │   ├── BundleService.swift        # Content management
    │   └── SyncService.swift          # Background sync
    ├── Views/                         # SwiftUI screens
    │   ├── ChatView.swift             # Clinical chat interface
    │   ├── DrugLookupView.swift       # Drug formulary
    │   ├── ClinicalProtocolsView.swift# Emergency protocols
    │   └── OfflineIndicatorView.swift # Connectivity status
    ├── Database/                      # Data persistence
    │   ├── OTGDatabase.swift          # Core Data manager
    │   └── OTG.xcdatamodeld/          # Data model schema
    ├── Clinical/                      # Clinical domain logic
    │   ├── ClinicalProtocols.swift    # Emergency protocols
    │   ├── DrugCalculator.swift       # Dose calculations
    │   └── ClinicalGuidelineView.swift# Guideline display
    └── Utilities/                     # Shared helpers
        ├── LocalizationManager.swift  # Multi-language support
        └── AccessibilityHelper.swift  # WCAG compliance
```

## Getting Started

### 1. Environment Setup

```bash
# Install Xcode command line tools
xcode-select --install

# Verify Swift version (5.9+)
swift --version

# Clone repository
git clone https://github.com/unfpa/lkyspp-otg.git
cd lkyspp-otg/ios

# Install dependencies
pod install

# Open workspace
open OTG.xcworkspace
```

### 2. First Build

```bash
# Build for simulator
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -sdk iphonesimulator \
  -configuration Debug

# Or use Xcode
Product → Build (Cmd+B)
```

### 3. Run on Simulator

```bash
# Run on default simulator
xcodebuild -workspace OTG.xcworkspace \
  -scheme OTG \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath build

# Or use Xcode
Product → Run (Cmd+R)
```

## Development Workflow

### Creating a New Feature

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/clinical-calculator
   ```

2. **Create Service**
   ```swift
   // OTG/Services/NewService.swift
   public class NewService: ObservableObject {
       @Published var state = ""
       
       public init() {}
       
       public func doSomething() async {
           // Implementation
       }
   }
   ```

3. **Create View**
   ```swift
   // OTG/Views/NewView.swift
   public struct NewView: View {
       @StateObject private var service = NewService()
       
       public var body: some View {
           // UI implementation
       }
   }
   ```

4. **Add to App Navigation**
   ```swift
   // OTG/App.swift
   TabView(selection: $selectedTab) {
       NewView()
           .tabItem {
               Label("New", systemImage: "icon")
           }
           .tag(4)
   }
   ```

5. **Test and Commit**
   ```bash
   # Run tests
   xcodebuild test -workspace OTG.xcworkspace -scheme OTG
   
   # Commit with clear message
   git commit -m "feat: add new clinical feature"
   ```

### Code Style Guidelines

**SwiftUI Components**
```swift
// ✅ Good: Clear, documented, reusable
struct ComponentView: View {
    @State private var state = ""
    
    /// Initialize component
    public init() {}
    
    public var body: some View {
        // Implementation
    }
}

// ❌ Avoid: Unclear naming, no docs
struct View1: View {
    @State var s = ""
    
    var body: some View {
        Text(s)
    }
}
```

**Services**
```swift
// ✅ Good: Type-safe, error handling
public func search(query: String) async throws -> [Result] {
    guard !query.isEmpty else {
        throw SearchError.emptyQuery
    }
    return try await performSearch(query)
}

// ❌ Avoid: Loose typing, silent failures
public func search(_ q: String) -> [Result]? {
    return query == "" ? nil : performSearch(query)
}
```

**Error Handling**
```swift
// ✅ Good: Explicit error types
enum SearchError: LocalizedError {
    case emptyQuery
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .emptyQuery: return "Search query cannot be empty"
        case .networkError(let err): return err.localizedDescription
        }
    }
}

// ❌ Avoid: Generic errors
throw NSError(domain: "error", code: -1)
```

## Testing

### Unit Tests

```swift
// OTGTests/KnowledgeServiceTests.swift
import XCTest
@testable import OTG

class KnowledgeServiceTests: XCTestCase {
    var service: KnowledgeService!
    
    override func setUp() {
        super.setUp()
        service = KnowledgeService(database: OTGDatabase(inMemory: true))
    }
    
    func testSearch() async throws {
        let results = try await service.search(query: "test")
        XCTAssertTrue(!results.isEmpty)
    }
}
```

### UI Tests

```swift
// OTGUITests/ChatViewTests.swift
import XCTest

class ChatViewTests: XCTestCase {
    func testSearchUI() throws {
        let app = XCUIApplication()
        app.launch()
        
        let searchField = app.textFields["Ask about clinical topics..."]
        searchField.tap()
        searchField.typeText("hemorrhage")
        
        let searchButton = app.buttons["paperplane.fill"]
        searchButton.tap()
        
        let result = app.staticTexts["postpartum hemorrhage"]
        XCTAssertTrue(result.exists)
    }
}
```

### Run Tests

```bash
# All tests
xcodebuild test -workspace OTG.xcworkspace -scheme OTG

# Specific test class
xcodebuild test -workspace OTG.xcworkspace \
  -scheme OTG \
  -only-testing "OTGTests/KnowledgeServiceTests"

# With coverage
xcodebuild test \
  -workspace OTG.xcworkspace \
  -scheme OTG \
  -enableCodeCoverage YES
```

## Debugging

### Console Logging

```swift
// ✅ Good: Structured logging
print("[\(Date())] KnowledgeService: Searching for '\(query)'")

// ❌ Avoid: Debug prints in production
print(searchResults)  // Remove before committing
```

### LLDB Debugging

```bash
# Break on function
(lldb) breakpoint set --method "perform"

# Print variable
(lldb) p searchResults

# Continue execution
(lldb) continue

# Step into
(lldb) step

# Step over
(lldb) next
```

### Instruments Profiling

```bash
# Open Instruments
Xcode → Product → Profile (Cmd+I)

# Available instruments:
- Time Profiler - CPU usage
- Allocations - Memory leaks
- System Trace - All system activity
- Core Data - Database performance
```

## Common Tasks

### Add a New Dependency

```bash
# Edit Podfile
vim Podfile

# Add pod
pod 'Alamofire', '~> 5.7'

# Install
pod install
```

### Add a New Model

```swift
// 1. Add Core Data entity in OTG.xcdatamodeld
// 2. Create NSManaged class in Models/
// 3. Create view model struct
// 4. Add CRUD methods to OTGDatabase
// 5. Add service methods
```

### Localize a String

```swift
// 1. Add to Strings.en.strings:
"welcome_message" = "Welcome to OTG";

// 2. Use in code:
let manager = LocalizationManager()
Text(manager.localize("welcome_message"))
```

### Add an Accessibility Label

```swift
Button(action: search) {
    Image(systemName: "paperplane.fill")
}
.accessibilityLabel(Text("Search"))
.accessibilityHint(Text("Search clinical knowledge base"))
```

## Performance Tips

### View Rendering

```swift
// ✅ Good: Computed properties
var filteredItems: [Item] {
    items.filter { $0.matches(filter) }
}

// ❌ Avoid: Heavy calculations in body
var body: some View {
    List {
        ForEach(items.filter { /* expensive */ }) { item in
            Text(item.name)  // Recalculates on every render
        }
    }
}
```

### Database Queries

```swift
// ✅ Good: Fetch only needed fields
let fetch = NSFetchRequest<FormularyEntryEntity>()
fetch.predicate = NSPredicate(format: "drug == %@", "oxytocin")
fetch.fetchLimit = 1

// ❌ Avoid: Fetching all records
let allDrugs = database.fetchAllFormularyEntries()
let oxytocin = allDrugs.first { $0.drug == "oxytocin" }
```

### Memory Management

```swift
// ✅ Good: Weak self in closures
Task { [weak self] in
    await self?.updateUI()
}

// ❌ Avoid: Strong reference cycles
Task {
    await self.updateUI()  // Can create cycle
}
```

## Troubleshooting

### Build Fails

```bash
# Clean everything
rm -rf ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Reinstall
pod install
xcodebuild clean -workspace OTG.xcworkspace -scheme OTG
xcodebuild -workspace OTG.xcworkspace -scheme OTG
```

### App Crashes on Startup

```swift
// Check Core Data initialization
let context = OTGDatabase.shared.viewContext

// Verify knowledge base loaded
let count = OTGDatabase.shared.getChunkCount()
print("Loaded \(count) chunks")

// Check for database corruption
rm ~/Library/Containers/org.unfpa.otg/Data/Library/Caches/otg_knowledge.db
```

### UI Not Updating

```swift
// Ensure property is @Published
@Published var items: [Item] = []

// Call on main thread
DispatchQueue.main.async {
    self.items = newItems
}

// Use @StateObject for services
@StateObject private var service = KnowledgeService()
```

## Git Workflow

### Commit Message Format

```
type(scope): subject

Body explaining what and why.

Closes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Example

```bash
git commit -m "feat(search): add semantic similarity scoring

Implement cosine similarity for vector search to improve
result relevance. Reduces noise in search results by 30%.

Fixes #45"
```

### Push and PR

```bash
# Push feature branch
git push -u origin feature/clinical-calculator

# Create PR on GitHub
# Add description and screenshots
# Request review from team
# Address feedback and push updates
```

## Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No debug code left
- [ ] Error handling implemented
- [ ] Accessibility considered
- [ ] Performance acceptable
- [ ] Security implications reviewed

## Resources

### Apple Documentation
- [SwiftUI](https://developer.apple.com/documentation/swiftui)
- [Core Data](https://developer.apple.com/documentation/coredata)
- [Concurrency](https://developer.apple.com/documentation/swift/concurrency)
- [Networking](https://developer.apple.com/documentation/foundation/urlsession)

### Community Resources
- [Swift Forums](https://forums.swift.org/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/swift)
- [GitHub Discussions](https://github.com/unfpa/lkyspp-otg/discussions)

### Internal Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [README.md](README.md)
- [Clinical Knowledge Base](../docs/CLINICAL_KNOWLEDGE_BASE.md)

## Support

For questions or issues:
1. Check existing GitHub issues
2. Ask in #ios-development Slack channel
3. Create new issue with detailed description
4. Contact project maintainers

Happy coding!
