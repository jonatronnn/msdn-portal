import { describe, expect, it } from "vitest";
import { SIGNATURE_LOGO_URL, signatureHtml, signaturePlain, signatureShort } from "@/lib/signature";

describe("signatureHtml", () => {
  it("includes the name, role and website logo", () => {
    const html = signatureHtml("Emily Smith", "Room Leader");
    expect(html).toContain(">Emily Smith<");
    expect(html).toContain("Room Leader, Montagu Square Day Nursery");
    expect(html).toContain(`src="${SIGNATURE_LOGO_URL}"`);
  });

  it("escapes what people type", () => {
    const html = signatureHtml('<b>Emily & "Gina"</b>', "");
    expect(html).toContain("&lt;b&gt;Emily &amp; &quot;Gina&quot;&lt;/b&gt;");
    expect(html).not.toContain("<b>Emily");
  });

  it("leaves out the comma when there is no role", () => {
    expect(signatureHtml("Emily", "")).toContain(">Montagu Square Day Nursery<");
  });
});

describe("plain text versions", () => {
  it("match the HTML details", () => {
    const text = signaturePlain("Emily", "Manager");
    expect(text.split("\n").slice(0, 4)).toEqual(["Emily", "Manager, Montagu Square Day Nursery", "", "T  01480 475522"]);
    expect(signatureShort("Emily")).toBe("Emily\nMontagu Square Day Nursery\n01480 475522 | montagu-square.co.uk");
  });
});
