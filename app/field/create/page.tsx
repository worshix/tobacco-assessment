"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, ArrowLeft, Map as MapIcon, Save } from "lucide-react";
import FieldMap from "@/components/Map/FieldMap";
import PolygonDrawer from "@/components/Map/PolygonDrawer";

export default function CreateFieldPage() {
  const router = useRouter();
  const [fieldName, setFieldName] = useState("");
  const [polygon, setPolygon] = useState<any>(null);

  const onUpdate = useCallback((e: any) => {
    setPolygon(e.features[0]);
  }, []);

  const onCreate = useCallback((e: any) => {
    setPolygon(e.features[0]);
  }, []);

  const onDelete = useCallback(() => {
    setPolygon(null);
  }, []);

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fieldName || !polygon) {
      alert("Please name your field and draw its boundary on the map.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/field", {
        method: "POST",
        body: JSON.stringify({ name: fieldName, polygon }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to save field");

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Error saving field. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <Button 
          onClick={handleSave} 
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          disabled={loading}
        >
          <Save className="h-4 w-4" /> 
          {loading ? "Saving..." : "Save Field"}
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
          <FieldMap>
            <PolygonDrawer 
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </FieldMap>
        </div>
      </main>
    </div>
  );
}
