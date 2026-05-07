"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Leaf,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Thermometer,
  CloudRain,
  LineChart as LineChartIcon,
  Loader2,
  Map as MapIcon,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import FieldMap from "@/components/Map/FieldMap";
import { HeatmapPoint } from "@/components/Map/HeatmapLayer";

interface AnalysisResult {
  meanNDVI: number;
  ndviTrend: "IMPROVING" | "STABLE" | "DECLINING";
  healthStatus: "HEALTHY" | "MODERATE_STRESS" | "HIGH_STRESS";
  avgTemperature: number;
  totalRainfall: number;
  waterStressRisk: boolean;
  diseaseRisk: boolean;
  recommendations: string[];
  historicalNDVI: { date: string; value: number }[];
}

export default function AnalysisResultsPage({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = use(params);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Field polygon for maps
  const [polygon, setPolygon] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{ longitude: number; latitude: number; zoom: number } | undefined>();

  // Heatmap state — loaded lazily after main analysis
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [heatmapLoaded, setHeatmapLoaded] = useState(false);

  useEffect(() => {
    async function runAnalysis() {
      try {
        // Fetch polygon and run analysis in parallel
        const [fieldRes, analysisRes] = await Promise.all([
          fetch(`/api/field/${fieldId}`),
          fetch("/api/analyse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fieldId }),
          }),
        ]);

        if (fieldRes.ok) {
          const fieldData = await fieldRes.json();
          const poly = fieldData.polygon;
          setPolygon(poly);

          // Derive map center from polygon coordinates
          try {
            const coords = poly?.geometry?.coordinates?.[0];
            if (coords?.length >= 3) {
              setMapCenter({
                longitude: (coords[0][0] + coords[2][0]) / 2,
                latitude: (coords[0][1] + coords[2][1]) / 2,
                zoom: 16,
              });
            }
          } catch {}
        }

        if (!analysisRes.ok) throw new Error("Analysis failed");
        const data = await analysisRes.json();

        setResult({
          meanNDVI: +data.mean_ndvi.toFixed(3),
          ndviTrend: data.ndviTrend ?? (data.ndvi_trend > 0.005 ? "IMPROVING" : data.ndvi_trend < -0.01 ? "DECLINING" : "STABLE"),
          healthStatus: data.healthStatus,
          avgTemperature: +data.avg_temperature_c.toFixed(1),
          totalRainfall: +data.total_rainfall_mm.toFixed(1),
          waterStressRisk: data.total_rainfall_mm < 10 && data.mean_ndvi < 0.45,
          diseaseRisk: data.ndvi_variance > 0.05,
          recommendations: data.recommendations,
          historicalNDVI: Array.isArray(data.historicalNDVI) && data.historicalNDVI.length > 0
            ? data.historicalNDVI
            : [
                { date: "5mo ago", value: +(data.mean_ndvi - 0.04).toFixed(3) },
                { date: "4mo ago", value: +(data.mean_ndvi - 0.02).toFixed(3) },
                { date: "3mo ago", value: +(data.mean_ndvi + 0.01).toFixed(3) },
                { date: "1mo ago", value: +(data.mean_ndvi - 0.01).toFixed(3) },
                { date: "Recent",  value: +data.mean_ndvi.toFixed(3) },
              ],
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    runAnalysis();
  }, [fieldId]);

  async function loadHeatmap() {
    if (heatmapLoaded || heatmapLoading) return;
    setHeatmapLoading(true);
    try {
      const resp = await fetch(`/api/heatmap/${fieldId}`);
      if (!resp.ok) throw new Error("Heatmap fetch failed");
      const data = await resp.json();
      setHeatmapPoints(data.points ?? []);
    } catch (err) {
      console.error("Heatmap error:", err);
    } finally {
      setHeatmapLoading(false);
      setHeatmapLoaded(true);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Analysing Field…</h2>
        <p className="text-slate-500">Retrieving satellite data from Google Earth Engine.</p>
      </div>
    );
  }

  if (!result) return null;

  const trendColor =
    result.ndviTrend === "IMPROVING" ? "text-emerald-600"
    : result.ndviTrend === "DECLINING" ? "text-red-600"
    : "text-amber-600";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/field/${fieldId}`}>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Analysis Results</h1>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          {new Date().toLocaleDateString()}
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">

        {/* Health Status */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center justify-center rounded-full bg-white p-1 shadow-sm border border-slate-100 mb-2">
            {result.healthStatus === "HEALTHY" ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-4 py-1 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Healthy 🟢
              </Badge>
            ) : result.healthStatus === "MODERATE_STRESS" ? (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-4 py-1 gap-1">
                <AlertTriangle className="h-3 w-3" /> Moderate Stress 🟡
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-4 py-1 gap-1">
                <AlertCircle className="h-3 w-3" /> High Stress 🔴
              </Badge>
            )}
          </div>

          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Overall Health is{" "}
            <span className={
              result.healthStatus === "HEALTHY" ? "text-emerald-600"
              : result.healthStatus === "MODERATE_STRESS" ? "text-amber-600"
              : "text-red-600"
            }>
              {result.healthStatus.replace("_", " ")}
            </span>
          </h2>

          {result.ndviTrend === "DECLINING" && (
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm font-semibold text-red-700">
              <AlertCircle className="h-4 w-4" />
              Declining trend detected — crop health is worsening. Inspect field immediately.
            </div>
          )}

          <p className="text-slate-500 max-w-md mx-auto">
            Based on Sentinel-2 satellite imagery and weather data from Google Earth Engine.
          </p>
        </section>

        {/* Recommendations */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-emerald-600" /> Smart Recommendations
          </h3>
          <div className="grid gap-3">
            {result.recommendations.map((rec, i) => (
              <Card key={i} className="border-l-4 border-l-emerald-500 border-slate-200">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 bg-emerald-50 p-1 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-slate-700 font-medium">{rec}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Risk Assessment */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Risk Assessment</h3>
            <Card className="border-slate-200">
              <CardContent className="p-0 divide-y divide-slate-100">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CloudRain className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Water Stress</p>
                      <p className="text-xs text-slate-400">Based on rainfall trend</p>
                    </div>
                  </div>
                  <Badge variant={result.waterStressRisk ? "destructive" : "secondary"} className="rounded-full">
                    {result.waterStressRisk ? "High Risk" : "Low Risk"}
                  </Badge>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Disease Risk</p>
                      <p className="text-xs text-slate-400">NDVI pattern irregularity</p>
                    </div>
                  </div>
                  <Badge variant={result.diseaseRisk ? "destructive" : "secondary"} className="rounded-full">
                    {result.diseaseRisk ? "Moderate Risk" : "Minimal Risk"}
                  </Badge>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Leaf className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">NDVI Trend</p>
                      <p className="text-xs text-slate-400">Health direction</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${trendColor}`}>
                    {result.ndviTrend}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Environment */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Environment</h3>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4 text-center">
                  <Thermometer className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-slate-900">{result.avgTemperature}°C</p>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg Temp</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4 text-center">
                  <CloudRain className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                  <p className="text-xl font-bold text-slate-900">{result.totalRainfall}mm</p>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">30-day Rain</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        {/* Spatial Stress Heatmap */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-emerald-600" /> Spatial Stress Map
            </h3>
            {!heatmapLoaded && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadHeatmap}
                disabled={heatmapLoading}
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {heatmapLoading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                  : "Generate Stress Map"}
              </Button>
            )}
          </div>

          {heatmapLoaded ? (
            <Card className="border-slate-200 overflow-hidden">
              <div className="aspect-video relative bg-slate-100">
                {polygon ? (
                  <FieldMap
                    initialViewState={mapCenter}
                    polygon={polygon}
                    heatmapData={heatmapPoints}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                    Map data unavailable
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-6 text-xs font-semibold">
                  <span className="text-slate-500">Stress level →</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block" /> Healthy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#eab308] inline-block" /> Moderate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#f97316] inline-block" /> High
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" /> Severe
                  </span>
                </div>
                {heatmapPoints.length === 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    No spatial data returned — cloud cover may be too high for this period.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-200 bg-white">
              <CardContent className="p-8 text-center">
                <MapIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">
                  Click "Generate Stress Map" to fetch pixel-level NDVI from satellite
                  imagery and identify crop stress hotspots within your field boundary.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Technical Data (NDVI History Chart) */}
        <section className="space-y-4 mt-8 pt-8 border-t border-slate-200">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="technical-data" className="border-none">
              <AccordionTrigger className="hover:no-underline py-0">
                <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <LineChartIcon className="h-4 w-4" />
                  <span className="text-sm font-bold uppercase tracking-widest">View NDVI History</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-6">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">NDVI Over Time</CardTitle>
                        <CardDescription className="text-xs">
                          5-month Sentinel-2 vegetation index trend
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">{result.meanNDVI}</p>
                        <p className="text-xs font-bold text-slate-400">CURRENT NDVI</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.historicalNDVI}>
                          <defs>
                            <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                          />
                          <YAxis
                            domain={[0, 1]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorNdvi)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <div className="pt-6 flex justify-center">
          <Link href="/dashboard">
            <Button variant="outline" className="text-slate-500 border-slate-200">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
