/**
 * Short axis labels for the compliance radar.
 *
 * Framework domains come in three shapes:
 *   - Coded with a parenthesised function/strategy tag: "Govern (GV)"
 *   - Coded with a leading identifier: "CC1 Control Environment", "A.5 …"
 *   - Free text from custom frameworks: "Access Control Policy"
 *
 * The preferred short form is the embedded code; free-text domains get an
 * initialism or a compact slice. Because none of these are guaranteed
 * unique, every label is de-duplicated with a numeric suffix so two axes can
 * never render identically — the full name remains available in tooltips and
 * the screen-reader table regardless.
 */

export function preferredShortDomainLabel(domain: string): string | null {
  const parenthesised = domain.match(/\(([A-Za-z0-9]{1,6})\)\s*$/);
  if (parenthesised) return parenthesised[1];
  // Only treat a leading token as a code when it contains a digit ("CC1",
  // "A.5", "PI1.3") — otherwise every capitalised English word would match.
  const leadingToken = domain.match(/^([A-Za-z][A-Za-z0-9.]*)/);
  if (leadingToken && /\d/.test(leadingToken[1])) return leadingToken[1];
  return null;
}

export function initialismForDomain(domain: string): string {
  const words = domain.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word));
  if (words.length > 1) {
    return words
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 5);
  }
  const compact = domain.replace(/[^A-Za-z0-9]/g, "");
  const sliced = (compact || domain).slice(0, 4).toUpperCase();
  return sliced;
}

export function buildShortDomainLabels(
  domains: string[],
): { domain: string; shortLabel: string }[] {
  const used = new Set<string>();

  return domains.map((domain) => {
    let base = preferredShortDomainLabel(domain);

    if (base === null || used.has(base)) {
      const fallbackBase = base ?? initialismForDomain(domain);
      let candidate = fallbackBase;
      let attempt = 2;
      while (used.has(candidate)) {
        candidate = `${fallbackBase}-${attempt}`;
        attempt += 1;
      }
      base = candidate;
    }

    used.add(base);
    return { domain, shortLabel: base };
  });
}
