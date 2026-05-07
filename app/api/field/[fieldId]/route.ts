import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fieldId } = await params;
    const field = await prisma.field.findUnique({
      where: { id: fieldId, userId },
    });

    if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

    return NextResponse.json({
      id: field.id,
      name: field.name,
      polygon: typeof field.polygon === 'string' ? JSON.parse(field.polygon) : field.polygon,
      area: field.area,
      location: field.location,
      cropType: field.cropType,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch field" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fieldId } = await params;

    // Verify ownership before deleting
    const field = await prisma.field.findUnique({
      where: { 
        id: fieldId,
        userId: userId,
      },
    });

    if (!field) {
      return NextResponse.json({ error: "Field not found or access denied" }, { status: 404 });
    }

    // Delete associated analyses first (if any)
    await prisma.analysis.deleteMany({
      where: { fieldId: fieldId },
    });

    // Delete the field
    await prisma.field.delete({
      where: { id: fieldId },
    });

    return NextResponse.json({ success: true, message: "Field deleted successfully" });
  } catch (error) {
    console.error("Field deletion error:", error);
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}
