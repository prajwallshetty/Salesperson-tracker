import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://salesgrid.live";
const TITLE = "Sales Grid | Field Sales Management Software";
const DESCRIPTION =
  "Sales Grid is a modern field sales management platform for managing sales teams, customers, visits, leads, targets, GPS tracking, orders and performance.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Sales Grid",
  },
  description: DESCRIPTION,
  keywords: [
    "sales force management software",
    "field sales management software",
    "sales team management software",
    "field sales tracking",
    "sales tracking software",
    "sales CRM",
    "salesperson tracking",
    "field visit management",
    "sales performance management",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Sales Grid",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sales Grid",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "3000",
    highPrice: "25000",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
