import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Plus, Activity, Calendar, MapPin } from "lucide-react";

export default function DashboardPage() {
  // Mock data for the prototype
  const hasField = true;
  const field = {
    id: "field_123",
    name: "North Valley Field",
    lastAnalysis: "January 12, 2026",
    status: "HEALTHY", // Healthy
    location: "Mashonaland West"
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sidebar/Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">TobaccoGuard</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">John Doe</span>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600">Logout</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome, John</h1>
            <p className="text-slate-500">Overview of your tobacco cultivation status.</p>
          </div>
          {!hasField && (
            <Link href="/field/create">
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Create Your Field
              </Button>
            </Link>
          )}
        </div>

        {!hasField ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <MapPin className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No fields detected</h2>
            <p className="text-slate-500 mb-8 max-w-xs">You haven't added any fields yet. Start by drawing your field boundary on the map.</p>
            <Link href="/field/create">
              <Button className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6">
                Get Started
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" /> Your Active Fields
            </h2>
            
            <Card className="hover:shadow-md transition-shadow border-slate-200">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl font-bold">{field.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {field.location}
                  </CardDescription>
                </div>
                {field.status === "HEALTHY" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                    Healthy 🟢
                  </Badge>
                ) : field.status === "MODERATE_STRESS" ? (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                    Moderate 🟡
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                    Stressed 🔴
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  Last analysis: {field.lastAnalysis}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 flex justify-end gap-3 rounded-b-lg border-t border-slate-100">
                <Link href={`/field/${field.id}`}>
                  <Button variant="outline">View Details</Button>
                </Link>
                <Link href={`/field/${field.id}/analyse`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Analyse Field</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
