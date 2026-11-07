// import type { Metadata } from "next";
// import { JetBrains_Mono, Manrope } from "next/font/google";

// import { ToasterProvider } from "@/components/providers/toaster-provider";
// import "./globals.css";

// const manrope = Manrope({
//   variable: "--font-sans",
//   subsets: ["latin"],
// });

// const jetbrainsMono = JetBrains_Mono({
//   variable: "--font-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "CityWise Blood Bank & Donor Platform",
//   description: "Find blood donors and blood banks by city with role-based workflows.",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}>
//         {children}
//         <ToasterProvider />
//       </body>
//     </html>
//   );
// }



import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";

import { ToasterProvider } from "@/components/providers/toaster-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CityWise Blood Bank & Donor Platform",
  description:
    "Find blood donors and blood banks by city with role-based workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}

        <ToasterProvider />

        <Script
          src="http://localhost:3000/widget.js"
          data-agent-id="6a9a05953c1417186c7d6780"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}