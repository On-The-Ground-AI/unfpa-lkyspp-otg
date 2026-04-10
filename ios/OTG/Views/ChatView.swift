import SwiftUI

/// ChatView provides a clinical chat interface for knowledge queries
/// Displays search results with citations and sources
public struct ChatView: View {
    @StateObject private var knowledgeService = KnowledgeService()
    @State private var query: String = ""
    @State private var selectedVertical: String = "all"
    @State private var messages: [ChatMessage] = []

    let verticals = ["all", "MOH_MMR", "WHO_PCPNC", "PROTOCOLS"]

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Clinical Knowledge Assistant")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Ask about clinical guidelines")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    if !knowledgeService.isInitialized {
                        ProgressView()
                            .tint(.blue)
                    }
                }

                // Vertical selector
                Picker("Filter", selection: $selectedVertical) {
                    ForEach(verticals, id: \.self) { v in
                        Text(v).tag(v)
                    }
                }
                .pickerStyle(.segmented)
            }
            .padding()
            .background(Color(.systemGray6))

            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(messages) { message in
                            ChatMessageView(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: messages) { _ in
                    if let lastMessage = messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            Spacer()

            // Input area
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    TextField("Ask about clinical topics...", text: $query)
                        .textFieldStyle(.roundedBorder)
                        .disabled(!knowledgeService.isInitialized)

                    Button(action: performSearch) {
                        if knowledgeService.isSearching {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .foregroundColor(.white)
                        }
                    }
                    .disabled(query.isEmpty || !knowledgeService.isInitialized || knowledgeService.isSearching)
                    .padding(8)
                    .background(Color.blue)
                    .clipShape(Circle())
                }

                if let error = knowledgeService.lastError {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.yellow)
                        Text(error.localizedDescription)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(8)
                    .background(Color(.systemYellow).opacity(0.1))
                    .cornerRadius(6)
                }
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .task {
            await knowledgeService.initialize()
        }
    }

    private func performSearch() {
        Task {
            let verticals = selectedVertical == "all" ? [] : [selectedVertical]
            await knowledgeService.search(query: query, verticals: verticals)

            // Add user message
            let userMsg = ChatMessage(
                id: UUID().uuidString,
                role: .user,
                content: query,
                timestamp: Date(),
                citations: []
            )
            messages.append(userMsg)

            // Add assistant response
            let resultContent = formatSearchResults(knowledgeService.searchResults)
            let assistantMsg = ChatMessage(
                id: UUID().uuidString,
                role: .assistant,
                content: resultContent,
                timestamp: Date(),
                citations: extractCitations(from: knowledgeService.searchResults)
            )
            messages.append(assistantMsg)

            query = ""
        }
    }

    private func formatSearchResults(_ results: [KnowledgeSearchResult]) -> String {
        guard !results.isEmpty else {
            return "No relevant information found. Please try a different query."
        }

        var formatted = ""
        for (index, result) in results.enumerated() {
            formatted += "\(index + 1). \(result.content)\n"
            formatted += "From: \(result.sourceDocument)\n\n"
        }
        return formatted
    }

    private func extractCitations(from results: [KnowledgeSearchResult]) -> [Citation] {
        results.map { result in
            Citation(
                chunkId: result.chunkId,
                sourceDocument: result.sourceDocument,
                sourceEdition: result.sourceSection,
                sourceSection: result.sourceSection,
                sourcePage: result.sourcePage,
                sourceUrl: result.sourceUrl,
                verbatimExcerpt: result.verbatimExcerpt
            )
        }
    }
}

// MARK: - Chat Message View

struct ChatMessageView: View {
    let message: ChatMessage

    var body: some View {
        VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 8) {
            HStack {
                if message.role == .user {
                    Spacer()
                }

                VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 6) {
                    Text(message.content)
                        .font(.body)
                        .padding(12)
                        .background(message.role == .user ? Color.blue : Color(.systemGray6))
                        .foregroundColor(message.role == .user ? .white : .primary)
                        .cornerRadius(12)

                    if !message.citations.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Sources:")
                                .font(.caption)
                                .fontWeight(.semibold)
                            ForEach(message.citations) { citation in
                                Text(citation.displayString)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(8)
                        .background(Color(.systemGray6))
                        .cornerRadius(6)
                    }
                }

                if message.role == .assistant {
                    Spacer()
                }
            }

            Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
    }
}

// MARK: - Types

struct ChatMessage: Identifiable {
    let id: String
    enum Role { case user, assistant }
    let role: Role
    let content: String
    let timestamp: Date
    let citations: [Citation]
}

#Preview {
    ChatView()
}
