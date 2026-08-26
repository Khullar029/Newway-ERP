import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Newway Agri ERP", description: "Operations hub for Newway Agri" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
