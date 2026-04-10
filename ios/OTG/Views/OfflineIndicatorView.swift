import SwiftUI
import NetworkExtension
import Network

/// OfflineIndicatorView shows sync status and connectivity information
public struct OfflineIndicatorView: View {
    @StateObject private var syncService = SyncService()
    @StateObject private var networkMonitor = NetworkMonitor()
    @State private var showSyncDetails = false

    var syncStatusColor: Color {
        if networkMonitor.isConnected {
            return syncService.lastError != nil ? .orange : .green
        } else {
            return .gray
        }
    }

    var syncStatusIcon: String {
        if syncService.isSyncing {
            return "arrow.2.squarepath"
        } else if syncService.lastError != nil {
            return "exclamationmark.triangle.fill"
        } else if networkMonitor.isConnected {
            return "checkmark.circle.fill"
        } else {
            return "wifi.slash"
        }
    }

    var syncStatusText: String {
        if syncService.isSyncing {
            return "Syncing..."
        } else if syncService.lastError != nil {
            return "Sync failed"
        } else if !networkMonitor.isConnected {
            return "Offline"
        } else if let lastSync = syncService.lastSyncDate {
            let formatter = RelativeDateTimeFormatter()
            return "Last sync: \(formatter.localizedString(for: lastSync, relativeTo: Date()))"
        } else {
            return "Ready to sync"
        }
    }

    public var body: some View {
        VStack(spacing: 8) {
            // Compact indicator (always visible)
            HStack(spacing: 8) {
                if syncService.isSyncing {
                    ProgressView()
                        .scaleEffect(0.8, anchor: .center)
                        .tint(syncStatusColor)
                } else {
                    Image(systemName: syncStatusIcon)
                        .font(.caption)
                        .foregroundColor(syncStatusColor)
                }

                Text(syncStatusText)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if networkMonitor.isConnected && !syncService.isSyncing {
                    Button(action: { showSyncDetails.toggle() }) {
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .rotationEffect(.degrees(showSyncDetails ? 90 : 0))
                    }
                    .foregroundColor(.blue)
                }
            }
            .padding(8)
            .background(Color(.systemGray6))
            .cornerRadius(6)

            // Detailed sync options (expanded)
            if showSyncDetails {
                VStack(spacing: 8) {
                    if let lastError = syncService.lastError {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text(lastError.localizedDescription)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(8)
                        .background(Color(.systemOrange).opacity(0.1))
                        .cornerRadius(4)
                    }

                    HStack(spacing: 8) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Network Status")
                                .font(.caption)
                                .fontWeight(.semibold)
                            Text(networkMonitor.isConnected ? "Connected" : "Disconnected")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: networkMonitor.isConnected ? "wifi" : "wifi.slash")
                            .foregroundColor(networkMonitor.isConnected ? .green : .red)
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(4)

                    if let lastSync = syncService.lastSyncDate {
                        HStack(spacing: 8) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Last Sync")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                Text(lastSync.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                        .padding(8)
                        .background(Color(.systemGray6))
                        .cornerRadius(4)
                    }

                    if networkMonitor.isConnected && !syncService.isSyncing {
                        Button(action: syncNow) {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Sync Now")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(8)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(4)
                        }
                    }
                }
                .padding(8)
            }
        }
    }

    private func syncNow() {
        Task {
            await syncService.syncNow()
        }
    }
}

// MARK: - Network Monitor

public class NetworkMonitor: ObservableObject {
    @Published var isConnected = false

    private var monitor: NWPathMonitor?

    init() {
        startMonitoring()
    }

    private func startMonitoring() {
        monitor = NWPathMonitor()
        let queue = DispatchQueue(label: "NetworkMonitor")
        monitor?.start(queue: queue)

        monitor?.pathUpdateHandler = { path in
            DispatchQueue.main.async {
                self.isConnected = path.status == .satisfied
            }
        }
    }

    deinit {
        monitor?.cancel()
    }
}

// MARK: - Mini Sync Status Badge

public struct SyncBadge: View {
    @StateObject private var syncService = SyncService()
    @StateObject private var networkMonitor = NetworkMonitor()

    public var body: some View {
        HStack(spacing: 4) {
            if syncService.isSyncing {
                ProgressView()
                    .scaleEffect(0.6, anchor: .center)
                    .tint(.blue)
            } else {
                Image(systemName: networkMonitor.isConnected ? "checkmark.circle.fill" : "wifi.slash")
                    .font(.caption)
                    .foregroundColor(networkMonitor.isConnected ? .green : .red)
            }

            Text(syncService.isSyncing ? "Syncing" : (networkMonitor.isConnected ? "Online" : "Offline"))
                .font(.caption)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(.systemGray6))
        .cornerRadius(4)
    }
}

#Preview {
    VStack(spacing: 16) {
        OfflineIndicatorView()
        SyncBadge()
        Spacer()
    }
    .padding()
}
