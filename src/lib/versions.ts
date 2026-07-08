/**
 * Pure version-pin checks against the protocol's live published matrix
 * (https://agenc.ag/api/versions, schema agenc.versions.v1). Extracted from
 * the /proof page so the containment rule is unit-tested — a wrong verdict
 * here would quietly misreport bounty compliance.
 */

/**
 * Whether a declared 0.x caret pin (e.g. `^0.10.0`) falls inside a published
 * supported range (e.g. `"0.8.x - 0.10.x"` or `"0.4.x"`). For 0.x semver a
 * caret locks the minor, so containment is a minor-number bounds check.
 * Unknown shapes return false (fail closed — /proof shows FAIL, never a
 * false PASS).
 */
export function pinWithinSupportedRange(
  declared: string,
  supported: string | null | undefined,
): boolean {
  if (!supported) return false;
  const declaredMinor = declared.match(/^\^?0\.(\d+)\./)?.[1];
  if (declaredMinor === undefined) return false;
  const bounds = [...supported.matchAll(/0\.(\d+)\./g)].map((m) =>
    Number(m[1]),
  );
  if (bounds.length === 0) return false;
  const minor = Number(declaredMinor);
  return minor >= Math.min(...bounds) && minor <= Math.max(...bounds);
}

/** One row of the /proof pins table. */
export interface VersionRow {
  name: string;
  declared: string;
  supported: string | null;
  current: string | null;
  ok: boolean;
}

/** Build the /proof pins table from declared deps + the live matrix. */
export function buildVersionRows(
  deps: Record<string, string>,
  published: Array<{ package: string; supported?: string; current?: string }>,
  tracked: string[],
): VersionRow[] {
  return tracked.map((name) => {
    const live = published.find((p) => p.package === name);
    const declared = deps[name] ?? "—";
    const supported = live?.supported ?? null;
    return {
      name,
      declared,
      supported,
      current: live?.current ?? null,
      ok: pinWithinSupportedRange(declared, supported),
    };
  });
}
