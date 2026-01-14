import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, polygon } = await req.json();

    if (!name || !polygon) {
      return NextResponse.json({ error: "Missing name or polygon" }, { status: 400 });
    }

    const field = await prisma.field.create({
      data: {
        name,
        polygon: JSON.stringify(polygon),
        userId,
      },
    });

    return NextResponse.json(field);
  } catch (error) {
    console.error("Field creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
