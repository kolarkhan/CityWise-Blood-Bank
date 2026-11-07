import Link from "next/link";
import Image from "next/image";

export function AppLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="relative inline-flex h-10 w-10 overflow-hidden rounded-lg border border-red-100 bg-white">
        <Image
          src="/logo.png"
          alt="CityWise logo"
          fill
          sizes="40px"
          className="object-contain p-1"
          priority
        />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold uppercase tracking-widest text-red-600">CityWise</span>
        <span className="text-base font-semibold text-slate-900">Blood Bank Platform</span>
      </span>
    </Link>
  );
}
