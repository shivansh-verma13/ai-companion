import prismadb from "@/lib/prismadb";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { companionID: string } }
) {
  try {
    const body = await req.json();
    const user = await currentUser();
    const { src, name, description, instructions, seed, categoryID } = body;

    // console.log("user", user);

    if (!params.companionID) {
      return new NextResponse("Companion ID is required", { status: 400 });
    }

    if (!user || !user.id) {
      // console.log("user", user);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (
      !src ||
      !name ||
      !description ||
      !instructions ||
      !seed ||
      !categoryID
    ) {
      return new NextResponse("Missing Required Fields", { status: 400 });
    }

    // Check for subscription(TODO)

    const companion = await prismadb.companion.update({
      where: {
        id: params.companionID,
        userId: user.id,
      },
      data: {
        categoryID,
        userId: user.id,
        userName: user.firstName || "",
        src,
        name,
        description,
        instructions,
        seed,
      },
    });
    return NextResponse.json(companion);
  } catch (error) {
    console.log("[COMPANION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { companionID: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const companion = await prismadb.companion.delete({
      where: {
        userId,
        id: params.companionID,
      },
    });
    return NextResponse.json(companion);
  } catch (error) {
    console.log("[COMPANION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// const HUGGING_FACE_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";

// export async function POST(req: Request) {
//     try {
//         // Extract input text from the request body
//         const { text } = await req.json();

//         if (!text) {
//             return NextResponse.json({ error: "Text is required" }, { status: 400 });
//         }

//         // Call Hugging Face API
//         const response = await axios.post(
//             HUGGING_FACE_API_URL,
//             { inputs: text },
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.HUGGING_FACE_API_TOKEN}`,
//                 },
//             }
//         );

//         // Return the embeddings
//         return NextResponse.json(response.data, { status: 200 });
//     } catch (error: any) {
//         console.error("Error calling Hugging Face API:", error.message);
//         return NextResponse.json({ error: error.message }, { status: 500 });
//     }
// }
