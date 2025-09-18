// backend/src/services/vectorStore.js
require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION = process.env.QDRANT_COLLECTION || "news_passages";

let client;

// Initialize Qdrant client
function initClient() {
  if (!client) {
    client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY || undefined,
      timeout: 60000,
    });
  }
  return client;
}

// Ensure collection exists
async function ensureCollectionExists(vectSize = 768, distance = "Cosine") {
  const cli = initClient();
  const res = await cli.getCollections();
  const collections = res.collections || [];
  const exists = collections.some((c) => c.name === COLLECTION);

  if (!exists) {
    console.log(
      `Creating collection ${COLLECTION} with vector size ${vectSize}`
    );
    await cli.createCollection({
      name: COLLECTION,
      vectors: { size: vectSize, distance },
      replication_factor: 1,
      write_consistency_factor: 1,
      shard_number: 1, // unsharded
    });
  } else {
    console.log(`Collection ${COLLECTION} already exists`);
  }
}

// Upsert vectors
async function upsertVectors(vectors) {
  if (!vectors || vectors.length === 0) return;

  const cli = initClient();
  await ensureCollectionExists(vectors[0].vector.length);

  // Upsert points
  await cli.upsert({
    collection: COLLECTION,
    points: vectors.map((v) => ({
      id: v.id,
      vector: v.vector,
      payload: v.payload,
    })),
  });

  console.log(`Upserted ${vectors.length} vectors into ${COLLECTION}`);
}

// Query vectors
async function queryVectors(embedding, topK = 5) {
  if (!embedding) throw new Error("No embedding passed to queryVectors");

  const cli = initClient();
  await ensureCollectionExists(embedding.length);

  // Use correct search method for v1.6.0
  const searchResult = await cli.search(COLLECTION, {
    vector: embedding,
    limit: topK,
    with_payload: true,
  });

  const points = searchResult.result || [];

  return points.map((pt) => ({
    id: pt.id,
    score: pt.score,
    text: pt.payload?.text ?? "[no text]",
    metadata: pt.payload?.metadata ?? {},
  }));
}

module.exports = {
  initClient,
  ensureCollectionExists,
  upsertVectors,
  queryVectors,
};
