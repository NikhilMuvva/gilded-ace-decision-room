// Descriptive rank, not a calibrated probability of machine failure.
export function rankPeers(scores) {
  const valid = scores
    .filter((s) => Number.isFinite(s.index))
    .sort((a, b) => a.index - b.index);
  return scores.map((s) => {
    const rank = Number.isFinite(s.index)
      ? valid.findIndex((x) => x.index === s.index) + 1
      : null;
    return {
      ...s,
      peerRank: rank,
      peerPopulation: valid.length,
      peerPercentile:
        rank === null
          ? null
          : valid.length < 2
            ? 50
            : (100 * (rank - 1)) / (valid.length - 1),
    };
  });
}
export function peerSupport(rows) {
  return {
    days: rows.length,
    fallbackDays: rows.filter((r) => r[17] < 24).length,
    minimumPeerHours: rows.length ? Math.min(...rows.map((r) => r[17])) : null,
    availableHours: rows.reduce((sum, r) => sum + r[8], 0),
  };
}
