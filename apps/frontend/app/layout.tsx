import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { readAuthView } from "../src/auth/view";
import { loadWorkspace } from "../src/productivity/load";
import { WorkspaceProvider } from "../src/workspace/store";
import { WorkspaceShell } from "../src/components/WorkspaceShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Second Brain",
  description: "A personal workspace for tasks, events, notes, and reminders.",
};

const themeBoot = `(function(){try{var t=localStorage.getItem("second-brain-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.theme=t||"system";}catch(e){}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await readAuthView();
  const workspace =
    auth.status === "ready"
      ? await loadWorkspace()
      : {
          status: auth.status === "error" ? ("error" as const) : ("signed-out" as const),
          message: auth.status === "error" ? auth.message : undefined,
          records: [],
          timeZone: "UTC",
        };
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <WorkspaceProvider initial={workspace}>
          <WorkspaceShell auth={auth}>{children}</WorkspaceShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
