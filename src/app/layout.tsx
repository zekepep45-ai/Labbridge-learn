import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabBridge Learn | Learn. Practice. Advance.",
  description: "A modern learning space for Medical Laboratory Science students and professionals in Ghana.",
  applicationName: "LabBridge Learn"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
