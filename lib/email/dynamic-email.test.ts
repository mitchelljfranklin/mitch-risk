import { render } from "@react-email/components";
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
});
