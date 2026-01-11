import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: 'Orca - AI-Powered Creator Vetting',
  description: 'Automate creator due diligence with AI. Analyze content, detect risks, and protect your brand at scale.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
