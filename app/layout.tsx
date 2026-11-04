import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ehdate | Canadians Meet Here", description: "A new place for Canadians to connect." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
