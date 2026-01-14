import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { predictCropHealth, MLFeatures } from "@/lib/ml/inference";
import { getRecommendations } from "@/lib/analysis/recommendations";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fieldId } = body;

    // 1. Fetch field from DB (and verify ownership)
    const field = await prisma.field.findUnique({
      where: { 
        id: fieldId,
        userId: userId,
      },
    });

    if (!field) {
      return NextResponse.json({ error: "Field not found or access denied" }, { status: 404 });
    }

    // 2. Simulate sensor/satellite data for prototype
    // In production, this data would come from GEE API for the field.polygon
    const simulatedFeatures: MLFeatures = {
      mean_ndvi: 0.58 + Math.random() * 0.1,
      ndvi_trend: 0.02 + (Math.random() - 0.5) * 0.05,
      ndvi_variance: 0.03 + Math.random() * 0.04,
      avg_temperature_c: 26 + Math.random() * 5,
      total_rainfall_mm: 5 + Math.random() * 15,
    };

    // 3. Run Inference
    const healthStatus = predictCropHealth(simulatedFeatures);

    // 4. Get Recommendations
    const recommendations = getRecommendations({
      meanNDVI: simulatedFeatures.mean_ndvi,
      trend: simulatedFeatures.ndvi_trend > 0 ? "IMPROVING" : simulatedFeatures.ndvi_trend < -0.01 ? "DECLINING" : "STABLE",
      avgTemp: simulatedFeatures.avg_temperature_c,
      totalRainfall: simulatedFeatures.total_rainfall_mm,
      ndviVariance: simulatedFeatures.ndvi_variance,
    });

    // 5. Save Analysis to DB
    const analysis = await prisma.analysis.create({
      data: {
        fieldId: fieldId,
        healthStatus: healthStatus,
        meanNDVI: simulatedFeatures.mean_ndvi,
        ndviTrend: simulatedFeatures.ndvi_trend > 0 ? "IMPROVING" : simulatedFeatures.ndvi_trend < -0.01 ? "DECLINING" : "STABLE",
        recommendations: JSON.stringify(recommendations),
        dataPoints: JSON.stringify({
            temp: simulatedFeatures.avg_temperature_c,
            rain: simulatedFeatures.total_rainfall_mm,
            variance: simulatedFeatures.ndvi_variance
        })
      }
    });

    return NextResponse.json({
        id: analysis.id,
        ...simulatedFeatures,
        healthStatus,
        recommendations
    });
  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: "Failed to run analysis" }, { status: 500 });
  }
}
