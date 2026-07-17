import Script from "next/script";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const edgeBaseUrl = process.env.NEXT_PUBLIC_EDGE_BASE_URL || "";
const tenantAssetsScript = `
  (function () {
    var edge = ${JSON.stringify(edgeBaseUrl)};
    if (!edge) return;

    var baseUrl = edge.replace(/\\/$/, "");
    var host = window.location.host;

    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = baseUrl + "/theme.css?host=" + encodeURIComponent(host);
    document.head.appendChild(css);

    var manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = baseUrl + "/manifest.webmanifest?host=" + encodeURIComponent(host);
    document.head.appendChild(manifest);
  })();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={manrope.variable} lang="pt-BR">
      <body className={manrope.className} suppressHydrationWarning>
        {edgeBaseUrl ? (
          <Script
            dangerouslySetInnerHTML={{
              __html: tenantAssetsScript,
            }}
            id="tenant-assets"
            strategy="beforeInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
