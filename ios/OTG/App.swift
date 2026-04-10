import SwiftUI

@main
struct OTGApp: App {
    @StateObject private var database = OTGDatabase.shared
    @State private var selectedTab = 0

    var body: some Scene {
        WindowGroup {
            TabView(selection: $selectedTab) {
                // Chat
                ChatView()
                    .tabItem {
                        Label("Chat", systemImage: "bubble.left.and.bubble.right.fill")
                    }
                    .tag(0)

                // Drug Lookup
                DrugLookupView()
                    .tabItem {
                        Label("Drugs", systemImage: "pills.fill")
                    }
                    .tag(1)

                // Protocols
                ClinicalProtocolsView()
                    .tabItem {
                        Label("Protocols", systemImage: "doc.text.fill")
                    }
                    .tag(2)

                // Settings
                SettingsView()
                    .tabItem {
                        Label("Settings", systemImage: "gear")
                    }
                    .tag(3)
            }
            .environment(\.managedObjectContext, database.viewContext)
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @StateObject private var knowledgeService = KnowledgeService()
    @StateObject private var syncService = SyncService()
    @State private var showingAlert = false
    @State private var alertMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                // Knowledge Base Section
                Section("Knowledge Base") {
                    let stats = knowledgeService.getStatistics()

                    HStack {
                        Text("Documents")
                        Spacer()
                        Text("\(stats.documentCount)")
                            .fontWeight(.semibold)
                    }

                    HStack {
                        Text("Chunks")
                        Spacer()
                        Text("\(stats.chunkCount)")
                            .fontWeight(.semibold)
                    }

                    HStack {
                        Text("Formulary Entries")
                        Spacer()
                        Text("\(stats.formularyCount)")
                            .fontWeight(.semibold)
                    }
                }

                // Sync Section
                Section("Synchronization") {
                    if let lastSync = syncService.lastSyncDate {
                        HStack {
                            Text("Last Sync")
                            Spacer()
                            Text(lastSync.formatted(date: .abbreviated, time: .shortened))
                                .foregroundColor(.secondary)
                        }
                    }

                    Button(action: syncNow) {
                        if syncService.isSyncing {
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.8, anchor: .center)
                                Text("Syncing...")
                            }
                        } else {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Sync Now")
                            }
                        }
                    }
                    .disabled(syncService.isSyncing)

                    if let error = syncService.lastError {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.yellow)
                            Text(error.localizedDescription)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // App Information
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Build")
                        Spacer()
                        Text("1")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Organization")
                        Spacer()
                        Text("UNFPA")
                            .foregroundColor(.secondary)
                    }
                }

                // Advanced Section
                Section("Advanced") {
                    Button(action: clearDatabase) {
                        HStack {
                            Image(systemName: "trash.fill")
                                .foregroundColor(.red)
                            Text("Clear Knowledge Base")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Confirm", isPresented: $showingAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Clear", role: .destructive) {
                    let db = OTGDatabase()
                    db.deleteAll()
                    alertMessage = "Knowledge base cleared"
                }
            } message: {
                Text("This will clear all offline knowledge. You will need to sync to restore it.")
            }
        }
    }

    private func syncNow() {
        Task {
            await syncService.syncNow()
        }
    }

    private func clearDatabase() {
        showingAlert = true
    }
}

#Preview {
    OTGApp()
}
