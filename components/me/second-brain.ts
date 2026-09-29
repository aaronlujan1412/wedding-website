/**
 * The Second Brain write-up, as data.
 *
 * Deliberately no addresses, ports, hostnames or tokens in here: the service
 * runs on a private network and none of that is what makes the project
 * interesting. What's public is the architecture and the reasoning.
 */

/** The spec strip under the lead. */
export const SB_SPEC: [string, string][] = [
  ["Scale", "~3,400 markdown notes"],
  ["Interface", "MCP over HTTP — any client that speaks it"],
  ["Retrieval", "BM25 + vector, fused, reranked, diversified"],
  ["Stack", "Python, FastMCP, fastembed (ONNX), NumPy"],
  ["Storage", "A file. No vector database."],
  ["Host", "Self-hosted, CPU only, private network"],
];

export type Decision = {
  /** The claim, as a full sentence — the same rule the notes themselves follow. */
  claim: string;
  /** What it's avoiding. */
  because: string;
};

/** Why the search is built the way it is. */
export const SB_RETRIEVAL: Decision[] = [
  {
    claim: "Hybrid retrieval, not vectors alone.",
    because:
      "Cosine similarity is good at paraphrase and bad at rare literal tokens — a kernel module name, a CIDR block, an exact error string. Keyword search is the reverse. Reciprocal rank fusion combines the two on rank rather than score, so there is nothing to normalise and nothing to tune, which matters a great deal when there is no labelled data to tune against.",
  },
  {
    claim: "Eight reranked results beat thirty unranked ones.",
    because:
      "Each search pulls a hundred candidates and a cross-encoder rescores all of them, reading the question and the note together instead of comparing two vectors that never met. It is the slow part of a six-to-eight-second query and the only reason the answer is worth waiting for.",
  },
  {
    claim: "Redundancy is what breaks a big vault, not size.",
    because:
      "Two thousand notes is a few megabytes of vectors and still sub-millisecond to scan. The real failure is that the same insight gets written down a dozen times over a year, so a plain top-k spends five of its eight slots on one idea and you never see the other seven things you had forgotten. Near-identical hits are dropped outright, and a diversity pass spreads what remains. A unit test is what proved the soft pass alone was not enough: its penalty caps out, so a near-duplicate with slightly higher relevance still wins.",
  },
  {
    claim: "A whole note is one vector.",
    because:
      "The embedding model was chosen for an 8,192-token window specifically so a note would not have to be cut up. Fixed-size chunking hands back fragments that no longer state what they are about. Long notes split on their headings instead, and every piece re-attaches the title.",
  },
  {
    claim: "A file, not a vector database.",
    because:
      "At this size a brute-force scan is sub-millisecond. A database would add a network hop, a failure mode and a shared-collection footgun in exchange for nothing measurable. Chunks are keyed by content hash, so filing two notes into a 3,375-note index reindexes in 1.7 seconds — nothing unchanged is embedded twice.",
  },
  {
    claim: "Rerank batch size turned out to be a memory control, not a throughput knob.",
    because:
      "At the library's default of 64 pairs per call, resident memory went from 1.9 GB to 3.7 GB over five searches and was still climbing. At 8 it went from 534 MB to 670 MB and flattened. The host has no GPU and a fixed amount of RAM; this was the difference between a service that stays up and one that doesn't.",
  },
];

/** Why the write path is built the way it is. */
export const SB_SAFETY: Decision[] = [
  {
    claim: "The write path refuses instead of quietly fixing.",
    because:
      "A note with no tags, a title that names a topic instead of making a claim, or a body matching a credential pattern is rejected with the reason. A refusal gets corrected; a silent fix teaches nothing and happens again next week.",
  },
  {
    claim: "No tool takes a path.",
    because:
      "The vault root comes from the environment, so there is no parameter through which a model can point the service at a different directory — which is the whole privacy guarantee of keeping a second, private vault somewhere else. The one tool that does accept a path resolves it first and then proves the result is still under the root.",
  },
  {
    claim: "Capability comes from the mount, not the code.",
    because:
      "Two instances run the identical image. One has the vault mounted read-only end to end and reports itself read-only; the other adds exactly one writable staging directory and nothing else. A bug in the write path cannot open an existing note, because the filesystem will not let it.",
  },
  {
    claim: "Nothing enters the brain without a human.",
    because:
      "New notes land in a staging directory that is excluded from the index, so they are not findable until someone promotes them. Edits are worse than additions, so an agent can only propose one: the diff is reviewed, every apply snapshots to git first, and a proposal whose note changed underneath it is refused rather than merged.",
  },
];
