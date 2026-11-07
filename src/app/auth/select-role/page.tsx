import { GoogleRoleSelectionForm } from "@/components/auth/google-role-selection-form";

export default function SelectRolePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <GoogleRoleSelectionForm />
    </main>
  );
}
