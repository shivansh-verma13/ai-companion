import prismadb from "@/lib/prismadb";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await currentUser();
    // console.log("user", user);
    const { src, name, description, instructions, seed, categoryID } = body;

    // console.log("user", user);

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

    const companion = await prismadb.companion.create({
      data: {
        categoryID,
        userId: user.id,
        userName: user?.firstName || "",
        src,
        name,
        description,
        instructions,
        seed,
      },
    });
    return NextResponse.json(companion);
  } catch (error) {
    console.log("[COMPANION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
