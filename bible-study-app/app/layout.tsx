import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Study Assistant",
  description:
    "A Reformed Bible study assistant informed by MacArthur, Sproul, and Wes Huff with hermeneutical and eschatological analysis.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-stone-950 text-stone-100 antialiased">
        {children}
      </body>
    </html>
  );
}
