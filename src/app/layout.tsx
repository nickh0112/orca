import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orca - Creator Vetting",
  description: "Research content creators for brand safety risks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
