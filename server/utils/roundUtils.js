/**
 * Normalizes selection rounds for a placement drive directly from DB configuration.
 * Returns an empty array if no rounds are configured (NO hardcoded fallback rounds).
 */
const getNormalizedRounds = (drive) => {
  if (!drive) return [];

  let rounds = [];

  if (Array.isArray(drive.selectionProcess) && drive.selectionProcess.length > 0) {
    rounds = drive.selectionProcess.map((r, idx) => ({
      order: Number(r.order) || idx + 1,
      roundName: (r.roundName || `Round ${idx + 1}`).trim(),
      roundType: r.roundType || 'Other',
      description: r.description || '',
      mode: r.mode || 'Online',
      duration: r.duration || null,
      date: r.date || null
    }));
  } else if (Array.isArray(drive.selectionRounds) && drive.selectionRounds.length > 0) {
    rounds = drive.selectionRounds.map((r, idx) => ({
      order: Number(r.roundNumber) || idx + 1,
      roundName: (r.name || `Round ${idx + 1}`).trim(),
      roundType: 'Other',
      description: '',
      mode: r.mode || 'Offline',
      duration: null,
      date: r.date || null
    }));
  }

  // Ensure rounds sorted by order ascending
  rounds.sort((a, b) => a.order - b.order);
  return rounds;
};

/**
 * Maps round type or round name to a valid Application.status enum value
 */
const getClearedStatusForRound = (roundType, roundName = '') => {
  const typeStr = (roundType || '').toLowerCase();
  const nameStr = (roundName || '').toLowerCase();

  if (typeStr.includes('aptitude') || nameStr.includes('aptitude')) return 'APTITUDE_CLEARED';
  if (typeStr.includes('coding') || nameStr.includes('coding')) return 'CODING_CLEARED';
  if (typeStr.includes('technical') || nameStr.includes('technical')) return 'TECHNICAL_CLEARED';
  if (typeStr.includes('hr') || nameStr.includes('hr')) return 'HR_CLEARED';

  return 'SHORTLISTED';
};

/**
 * Safely finds candidate's current round index within normalized drive rounds.
 * Tries currentRoundOrder match first, then exact roundName, then partial roundName match.
 */
const findCurrentRoundIndex = (driveRounds, currentRoundOrder, currentRoundName) => {
  if (!Array.isArray(driveRounds) || driveRounds.length === 0) return -1;

  // 1. Try order match
  if (currentRoundOrder !== undefined && currentRoundOrder !== null) {
    const orderIdx = driveRounds.findIndex((r) => r.order === Number(currentRoundOrder));
    if (orderIdx !== -1) return orderIdx;
  }

  // 2. Try name match
  if (currentRoundName) {
    const target = currentRoundName.trim().toLowerCase();
    const nameIdx = driveRounds.findIndex((r) => r.roundName.trim().toLowerCase() === target);
    if (nameIdx !== -1) return nameIdx;

    const partialIdx = driveRounds.findIndex(
      (r) => target.includes(r.roundName.trim().toLowerCase()) || r.roundName.trim().toLowerCase().includes(target)
    );
    if (partialIdx !== -1) return partialIdx;
  }

  return 0;
};

module.exports = {
  getNormalizedRounds,
  getClearedStatusForRound,
  findCurrentRoundIndex
};
