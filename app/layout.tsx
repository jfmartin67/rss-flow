import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Red_Hat_Display } from "next/font/google";

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-red-hat-display",
});

export const metadata: Metadata = {
  title: "RSS Flow",
  description: "A minimal, web-based RSS reader with river of news style interface",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RSS Flow",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={redHatDisplay.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') ||
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
