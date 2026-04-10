import Foundation

/// EmbeddingService handles text embedding operations
/// Uses on-device embedding model for offline capability
public class EmbeddingService {
    public init() {}

    /// Embed text query into 384-dimensional vector
    public func embed(_ text: String) async throws -> [Float] {
        // TODO: Integrate with on-device embedding model
        // For now, return placeholder embedding
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        let seed = UInt32(trimmed.hashValue)
        var generator = RandomNumberGenerator(seed: seed)

        return (0..<384).map { _ in
            Float.random(in: -1...1, using: &generator)
        }
    }

    /// Batch embed multiple texts
    public func embedBatch(_ texts: [String]) async throws -> [[Float]] {
        var embeddings: [[Float]] = []
        for text in texts {
            let embedding = try await embed(text)
            embeddings.append(embedding)
        }
        return embeddings
    }
}

/// Seeded random number generator for reproducible embeddings
private struct RandomNumberGenerator: RandomNumberGenerator {
    private var state: UInt32

    init(seed: UInt32) {
        self.state = seed
    }

    mutating func next() -> UInt64 {
        state = state &* 1103515245 &+ 12345
        return UInt64(state) << 32 | UInt64(state &* 1103515245 &+ 12345)
    }
}
