import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EDU-SHARE",
  description: "Academic resource discovery and sharing — foundation build (M3).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main">Skip to content</a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
