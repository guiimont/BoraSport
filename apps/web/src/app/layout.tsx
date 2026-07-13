import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="pt-BR">
      <body suppressHydrationWarning>
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
