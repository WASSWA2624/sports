function normalizeReferenceValue(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export function buildReferenceCandidates(value) {
  const normalized = normalizeReferenceValue(value);

  if (normalized == null) {
    return [];
  }

  const direct = String(normalized).trim();
  if (!direct) {
    return [];
  }

  const candidates = [direct];

  try {
    const decoded = decodeURIComponent(direct).trim();

    if (decoded) {
      candidates.push(decoded);
    }
  } catch {
    // Keep the original reference when decoding fails.
  }

  return [...new Set(candidates)];
}

export function buildReferenceWhere(value, fields = ["id", "code"]) {
  const candidates = buildReferenceCandidates(value);

  if (!candidates.length || !fields.length) {
    return null;
  }

  return {
    OR: candidates.flatMap((candidate) => fields.map((field) => ({ [field]: candidate }))),
  };
}
