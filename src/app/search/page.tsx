import Link from "next/link";

import { SearchBloodForm } from "@/components/forms/search-blood-form";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Search Blood</h1>
            <p className="text-sm text-slate-600">Find donors and blood banks by city and blood group.</p>
          </div>
          <Link href="/request/new">
            <Button>Raise Request</Button>
          </Link>
        </div>
        <SearchBloodForm />
      </div>
    </main>
  );
}
