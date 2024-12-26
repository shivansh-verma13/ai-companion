import { StreamingTextResponse, LangChainStream, streamText } from "ai";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CallbackManager } from "langchain/callbacks";
import { Replicate } from "@langchain/community/llms/replicate";
import { NextResponse } from "next/server";
import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";
import { createStreamableValue } from "ai/rsc";

export async function POST(
  request: Request,
  { params }: { params: { chatID: string } }
) {
  try {
    const { prompt } = await request.json();
    const user = await currentUser();
    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identifier = request.url + "-" + user.id;
    const { success } = await rateLimit(identifier);
    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const companion = await prismadb.companion.update({
      where: {
        id: params?.chatID,
      },
      data: {
        messages: {
          create: {
            content: prompt,
            role: "user",
            userId: user.id,
          },
        },
      },
    });

    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    const name = companion.id;
    const companion_file_name = name + ".txt";

    const companionKey = {
      companionName: name,
      userID: user.id,
      modelName: "llama2-13b",
    };

    const memoryManager = await MemoryManager.getInstance();

    const records = await memoryManager.readLatestHistory(companionKey);

    if (records.length === 0) {
      await memoryManager.seedChatHistory(companion.seed, "\n\n", companionKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);

    const recentChatHistory = await memoryManager.readLatestHistory(
      companionKey
    );

    const similarDocs = await memoryManager.vectorSearch(
      recentChatHistory,
      companion_file_name
    );

    let relevantHistory = "";

    // console.log("similarDocs", similarDocs);

    if (!!similarDocs && similarDocs.length !== 0) {
      relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
    }

    // console.log("relevnat", relevantHistory);

    // const {handlers} = LangChainStream();

    const model = new Replicate({
      model:
        "a16z-infra/llama13b-v2-chat:df7690f1994d94e96ad9d568eac121aecf50684a0b0963b25a41cc40061269e5",
      input: {
        max_length: 2048,
      },
      apiKey: process.env.REPLICATE_API_TOKEN,
      //   callbackManager: CallbackManager.fromHandlers(handlers),
    });

    model.verbose = true;

    const resp = String(
      await model
        .invoke(
          `
                        ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix.
                        
                        ${companion.instructions}

                        Below are the relevant details about ${companion.name}'s past and the conversation you are in.
                        ${relevantHistory}

                        ${recentChatHistory}\n${companion.name}:
                    `
        )
        .catch(console.error)
    );

    const cleaned = resp.replaceAll(",", "");
    const chunks = cleaned.split("\n");
    // console.log("chunks", chunks);
    const response = chunks[chunks.length - 1];

    // console.log("response", response);

    await memoryManager.writeToHistory("" + response.trim(), companionKey);
    const Readable = require("stream").Readable;

    // const stream = createStreamableValue('');

    // (async () => {
    //   const { textStream } = streamText({
    //     model: model,
    //     prompt: response,
    //   });

    //   for await (const delta of textStream) {
    //     stream.update(delta);
    //   }

    //   stream.done();
    // })();

    const stream = new Readable();
    stream.push(response);
    stream.push(null);

    // console.log("s", stream);

    // console.log()

    // (async () => {
    //     const { textStream } = streamText({
    //         model: "llama2-13b",
    //       prompt: response,
    //     });

    //     for await (const delta of textStream) {
    //       stream.update(delta);
    //     }

    //     stream.done();
    //   })();

    if (response !== undefined && response.length > 1) {
      memoryManager.writeToHistory("" + response.trim(), companionKey);

      await prismadb.companion.update({
        where: {
          id: params.chatID,
        },
        data: {
          messages: {
            create: {
              content: response.trim(),
              role: "system",
              userId: user.id,
            },
          },
        },
      });
    }

    // return NextResponse.json({ result: response }, { status: 200 });

    // return new streamText.toDataStreamResponse(stream);
    return new StreamingTextResponse(stream);
    // return new streamText()
  } catch (err) {
    console.log("[CHAT_POST]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
