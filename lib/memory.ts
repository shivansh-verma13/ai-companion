import { Redis } from "@upstash/redis";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";

export type CompanionKey = {
  companionName: string;
  modelName: string;
  userID: string;
};

export class MemoryManager {
  private static instance: MemoryManager;
  private history: Redis;
  private vectorDBClient: Pinecone;

  public constructor() {
    this.history = Redis.fromEnv();
    this.vectorDBClient = new Pinecone();
  }

  public async init() {
    if (this.vectorDBClient instanceof Pinecone) {
      this.vectorDBClient = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
    }
  }

  public async vectorSearch(
    recentChatHistory: string,
    companionFileName: string
  ) {
    const pinecone = <Pinecone>this.vectorDBClient;
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX! || "");

    const vectorStore = await PineconeStore.fromExistingIndex(
      new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HUGGING_FACE_API_TOKEN,
        // model: "Xenova/all-MiniLM-L6-v2",
      }),
      { pineconeIndex }
    );

    const similarDocs = await vectorStore
      .similaritySearch(recentChatHistory, 3, { fileName: companionFileName })
      .catch((err) => {
        console.log("Failed to get vector search results", err);
      });

    return similarDocs;
  }

  public static async getInstance(): Promise<MemoryManager> {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
      await MemoryManager.instance.init();
    }

    return MemoryManager.instance;
  }

  private generateRedisCompanionKey(companionKey: CompanionKey): string {
    return `${companionKey.companionName}-${companionKey.modelName}-${companionKey.userID}`;
  }

  public async writeToHistory(text: string, companionKey: CompanionKey) {
    if (!companionKey || typeof companionKey.userID == "undefined") {
      console.log("Companion key set incorrectly");
      return "";
    }

    const key = this.generateRedisCompanionKey(companionKey);
    const result = await this.history.zadd(key, {
      score: Date.now(),
      member: text,
    });

    return result;
  }

  public async readLatestHistory(companionKey: CompanionKey): Promise<string> {
    if (!companionKey || typeof companionKey.userID == "undefined") {
      console.log("Companion key set incorrectly");
      return "";
    }

    const key = this.generateRedisCompanionKey(companionKey);
    let result = await this.history.zrange(key, 0, Date.now(), {
      byScore: true,
    });

    result = result.slice(-30).reverse();
    const recentChats = result.reverse().join("\n");
    return recentChats;
  }

  public async seedChatHistory(
    seedContent: string,
    delimiter: string = "\n",
    companionKey: CompanionKey
  ) {
    const key = this.generateRedisCompanionKey(companionKey);
    if (await this.history.exists(key)) {
      console.log("User already has chat history");
      return;
    }

    const content = seedContent.split(delimiter);
    let counter = 0;
    for (const line of content) {
      await this.history.zadd(key, {
        score: counter,
        member: line,
      });
      counter += 1;
    }
  }
}
