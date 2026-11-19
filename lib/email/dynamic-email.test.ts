import { render } from "react-email";
import { describe, expect, it } from "vitest";

import { DynamicEmail } from "@/emails/dynamic";

describe("DynamicEmail", () => {
  it("sets the language and text direction on the HTML document", async () => {
    const html = await render(
      DynamicEmail({
        heading: "مرحبا",
        body: "مرحبا بالعالم",
        language: "ar",
        direction: "rtl",
      }),
    );

    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
  });

  it("strips scripts, event handlers and unsafe link schemes from injected HTML", async () => {
    const html = await render(
      DynamicEmail({
        heading: "Review",
        body: "Body",
        htmlBody:
          '<p>Safe paragraph</p><script>alert("x")</script><img src="x" onerror="alert(1)"><a href="javascript:alert(2)">Bad link</a>',
      }),
    );

    expect(html).toContain("Safe paragraph");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });

  it("keeps safe links and formatting from rendered markdown", async () => {
    const html = await render(
      DynamicEmail({
        heading: "Review",
        body: "Body",
        htmlBody:
          '<p><strong>Bold</strong> <a href="https://example.test">Open</a></p>',
      }),
    );

    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain('href="https://example.test"');
  });
});
