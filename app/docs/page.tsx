"use client";

import { useEffect, useRef, useState } from "react";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export default function DocsPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadScript(
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
    )
      .then(() =>
        loadScript(
          "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js",
        ),
      )
      .then(() => {
        const SwaggerUIBundle = (window as unknown as Record<string, unknown>)
          .SwaggerUIBundle as Record<string, unknown> | undefined;
        const SwaggerUIStandalonePreset = (
          window as unknown as Record<string, unknown>
        ).SwaggerUIStandalonePreset as { default?: unknown } | undefined;

        if (!SwaggerUIBundle) {
          setError("Swagger UI failed to load.");
          return;
        }

        (
          SwaggerUIBundle as Record<string, unknown> & {
            (...args: unknown[]): void;
          }
        )({
          url: "/api/docs",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            (SwaggerUIBundle as { presets: { apis: unknown } }).presets.apis,
            SwaggerUIStandalonePreset,
          ],
          layout: "StandaloneLayout",
          defaultModelsExpandDepth: -1,
          docExpansion: "list",
          filter: true,
          tryItOutEnabled: true,
          persistAuthorization: true,
        });
        setReady(true);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
      />
      <div style={{ height: "100vh" }}>
        <div id="swagger-ui" />
        {!ready && !error ? (
          <div className="text-muted-foreground p-10 text-center text-sm">
            Loading API documentation...
          </div>
        ) : null}
        {error ? (
          <div className="text-destructive p-10 text-center text-sm">
            {error}
          </div>
        ) : null}
      </div>
    </>
  );
}
