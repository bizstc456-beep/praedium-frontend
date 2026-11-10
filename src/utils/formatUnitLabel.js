// A landlord's "unit" field is free text, so values like "3", "Unit 3",
// "Suite B", or "Logement 2" are all valid input. If the raw value isn't
// already recognizable as a unit/suite/apartment label, prefix it with the
// given unit word so a tenant list never reads as a bare, out-of-context
// number (e.g. "lex — 3" instead of "lex — Unit 3").
const LOOKS_LIKE_UNIT_LABEL = /^(unit|suite|apt|apartment|logement|local|unité|unite)\b/i;

export function formatUnitLabel(rawUnitLabel, unitWord) {
  const trimmed = (rawUnitLabel || '').trim();
  if (!trimmed) return '';
  return LOOKS_LIKE_UNIT_LABEL.test(trimmed) ? trimmed : `${unitWord} ${trimmed}`;
}
