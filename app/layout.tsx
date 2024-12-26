import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignInButton,
} from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "bg-secondary",
            `${geistSans.variable} ${geistMono.variable} antialiased`
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {/* <SignedIn> */}
            {children}
            <Toaster />
            {/* </SignedIn> */}
            {/* <SignedOut>
              <RedirectToSignIn />
            </SignedOut> */}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
