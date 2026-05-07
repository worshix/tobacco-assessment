import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSatelliteHeatmap } from "@/lib/gee/heatmap";

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

    const polygon = typeof field.polygon === 'string'
      ? JSON.parse(field.polygon)
      : field.polygon;

    const points = await getSatelliteHeatmap(polygon);

    return NextResponse.json({ points });
  } catch (error) {
    console.error("Heatmap error:", error);
    return NextResponse.json({ error: "Failed to generate heatmap" }, { status: 500 });
  }
}
