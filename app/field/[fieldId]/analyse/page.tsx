"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Leaf, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Droplet, 
  Wind, 
  Thermometer, 
  Info,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export default function AnalysisResultsPage({ params }: { params: { fieldId: string } }) {
  const [activeSection, setActiveSection] = useState("predictions");

  // Mock analysis data
  const data = {
    field: "North Valley Field",
    status: "HEALTHY", // HEALTHY, MODERATE_STRESS, HIGH_STRESS
    meanNDVI: 0.62,
    trend: "STABLE", // IMPROVING, STABLE, DECLINING
    weather: {
      avgTemp: 28.5,
      totalRainfall: 12,
    },
    risks: {
      waterStress: false,
      disease: true,
    },
    history: [
      { date: "Dec 01", ndvi: 0.58 },
      { date: "Dec 08", ndvi: 0.60 },
      { date: "Dec 15", ndvi: 0.61 },
      { date: "Dec 22", ndvi: 0.62 },
      { date: "Dec 29", ndvi: 0.62 },
      { date: "Jan 05", ndvi: 0.63 },
      { date: "Jan 12", ndvi: 0.62 },
    ]
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-20">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/field/${params.fieldId}`}>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Analysis Results</h1>
            <Badge variant="outline" className="ml-2 font-normal text-slate-500">
              Jan 14, 2026
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
        {/* Section A: Field Summary */}
        <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="h-32 w-32 rounded-full border-8 border-emerald-100 flex items-center justify-center relative shrink-0">
             <div className="text-3xl font-bold text-emerald-600">92%</div>
             <div className="absolute -bottom-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">HEALTHY</div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Vegetation is looking great</h2>
            <p className="text-slate-500 max-w-md">Your <b>{data.field}</b> is showing healthy vegetation patterns. The mean NDVI is currently <b>{data.meanNDVI}</b>, which is optimal for tobacco in this growth stage.</p>
          </div>
        </section>

        {/* C: Predictions & Risks */}
        <div className="grid sm:grid-cols-2 gap-4">
           <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-slate-400">Trend Analysis</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl">
                   {data.trend === "IMPROVING" ? <TrendingUp className="text-emerald-500" /> : <Activity className="text-blue-500" />}
                   {data.trend === "IMPROVING" ? "Improving" : data.trend === "STABLE" ? "Stable" : "Declining"}
                </CardTitle>
              </CardHeader>
           </Card>
           
           <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-slate-400">Risk Flags</CardDescription>
                <div className="flex gap-2">
                  <Badge className={`${data.risks.waterStress ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} border-transparent`}>
                    Water Stress {data.risks.waterStress ? '⚠️' : '✅'}
                  </Badge>
                  <Badge className={`${data.risks.disease ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} border-transparent`}>
                    Disease {data.risks.disease ? '⚠️' : '✅'}
                  </Badge>
                </div>
              </CardHeader>
           </Card>
        </div>

        {/* D: Recommendations */}
        <section className="space-y-4">
           <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Info className="h-5 w-5 text-emerald-600" /> Farmer Recommendations
           </h3>
           <div className="grid gap-3">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-4">
                 <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center shrink-0 border border-emerald-200">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                 </div>
                 <div>
                    <p className="font-bold text-emerald-900">Crop health is stable</p>
                    <p className="text-sm text-emerald-700">No immediate action is required regarding fertilizers or growth regulators.</p>
                 </div>
              </div>

              {data.risks.disease && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-4">
                   <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center shrink-0 border border-amber-200">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                   </div>
                   <div>
                      <p className="font-bold text-amber-900">Disease Monitoring Recommended</p>
                      <p className="text-sm text-amber-700">Irregular vegetation patterns detected. Inspect the field for possible disease or pest activity.</p>
                   </div>
                </div>
              )}
           </div>
        </section>

        {/* B: Raw Data (Collapsible) */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="technical" className="border-slate-200 bg-white px-6 rounded-2xl border">
            <AccordionTrigger className="hover:no-underline font-bold text-slate-700">Technical Details / Raw Data</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-4">
               {/* NDVI Chart */}
               <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">NDVI History (Satellite Data)</p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 1]} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="ndvi" stroke="#059669" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Environment Grid */}
               <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-50 rounded-lg">
                        <Droplet className="h-5 w-5 text-blue-600" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400">RAINFALL</p>
                        <p className="text-base font-bold text-slate-900">{data.weather.totalRainfall} mm</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-orange-50 rounded-lg">
                        <Thermometer className="h-5 w-5 text-orange-600" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400">AVG TEMP</p>
                        <p className="text-base font-bold text-slate-900">{data.weather.avgTemp}°C</p>
                     </div>
                  </div>
               </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
}
