import type { Metadata } from "next";
import { Open_Sans, Nunito } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import AuthProvider from "@/components/AuthProvider";
import PushNotificationSetup from "@/components/PushNotificationSetup";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Family Hub",
  description: "Hub familial pour gérer sport, repas et activités",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${openSans.variable} ${nunito.variable} h-full`}>
        <AuthProvider>
          <PushNotificationSetup />
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
