"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, ArrowLeft, Map as MapIcon, Save } from "lucide-react";

export default function CreateFieldPage() {
  const router = useRouter();
  const [fieldName, setFieldName] = useState("");

  const handleSave = () => {
    // Simulate save
    router.push("/dashboard");
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
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
            <h1 className="text-lg font-bold text-slate-900">Create New Field</h1>
          </div>
        </div>
        <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Save className="h-4 w-4" /> Save Field
        </Button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Instructions */}
        <div className="w-80 border-r border-slate-200 bg-white p-6 overflow-y-auto hidden md:block">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-emerald-600" /> Instructions
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">1</div>
              <p className="text-sm font-medium text-slate-700">Name your field</p>
              <p className="text-xs text-slate-500">Choose a name that helps you identify this specific tobacco field.</p>
              <div className="pt-2">
                <Label htmlFor="fieldName" className="sr-only">Field Name</Label>
                <Input 
                  id="fieldName" 
                  value={fieldName} 
                  onChange={(e) => setFieldName(e.target.value)} 
                  placeholder="e.g. North Plot B" 
                  className="border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">2</div>
              <p className="text-sm font-medium text-slate-700">Zoom to your farm</p>
              <p className="text-xs text-slate-500">Navigate the map to find your cultivation area.</p>
            </div>

            <div className="space-y-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">3</div>
              <p className="text-sm font-medium text-slate-700">Draw field boundary</p>
              <p className="text-xs text-slate-500">Use the polygon tool on the right to click around the edges of your field.</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Metadata</p>
              <div className="space-y-2">
                <Label className="text-xs">Crop Type</Label>
                <Input value="Tobacco" disabled className="bg-slate-50 border-slate-200 h-8 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-slate-200">
          {/* Mock Map View */}
          <div className="absolute inset-0 flex items-center justify-center opacity-50 flex-col gap-4">
             <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                <MapIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900">Interactive Map</h3>
                <p className="text-slate-500 max-w-xs">Mapbox implementation placeholder. <br/> Drawing tool active.</p>
             </div>
          </div>

          {/* Map Controls Mock */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button size="icon" className="bg-white hover:bg-slate-100 text-slate-900 shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18m-9-18 9 9-9 9-9-9 9-9Z"/></svg>
            </Button>
            <Button size="icon" className="bg-white hover:bg-slate-100 text-slate-900 shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </Button>
            <Button size="icon" className="bg-white hover:bg-slate-100 text-slate-900 shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
