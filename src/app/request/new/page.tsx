import Link from "next/link";

import { RequestCreateForm } from "@/components/forms/request-create-form";
import { Button } from "@/components/ui/button";

export default function NewRequestPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Blood Request</h1>
            <p className="text-sm text-slate-600">
              Login as receiver/hospital to create requests and track matching.
            </p>
          </div>
          <Link href="/auth/login">
            <Button variant="outline">Login</Button>
          </Link>
        </div>
        <RequestCreateForm />
      </div>
    </main>
  );
}
