import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, ArrowLeft, Map as MapIcon, Info, Play } from "lucide-react";

export default function FieldOverviewPage({ params }: { params: { fieldId: string } }) {
  // Mock data
  const field = {
    id: params.fieldId,
    name: "North Valley Field",
    crop: "Tobacco",
    area: "4.2 Hectares",
    location: "Mashonaland West, ZW",
    lastAnalysis: "2 days ago"
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">{field.name}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="overflow-hidden border-slate-200">
              <div className="aspect-video bg-slate-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 flex-col">
                  <MapIcon className="h-12 w-12 mb-2" />
                  <span className="text-sm font-medium">Field Boundary Map</span>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{field.name}</h2>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Info className="h-4 w-4" /> This is your primary tobacco cultivation plot.
                    </p>
                  </div>
                  <Link href={`/field/${field.id}/analyse`}>
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                      <Play className="h-4 w-4" /> Run Analysis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
               <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Area</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-slate-900">{field.area}</p>
                  </CardContent>
               </Card>
               <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Crop</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-emerald-700">{field.crop}</p>
                  </CardContent>
               </Card>
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Location Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">DISTRICT / PROVINCE</p>
                  <p className="text-sm text-slate-700 font-medium">{field.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400">LAST SYNCED</p>
                  <p className="text-sm text-slate-700 font-medium">{field.lastAnalysis}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100">
                   <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100">
                      Delete Field
                   </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
