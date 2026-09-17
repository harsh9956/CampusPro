/**
 * Strict Dynamic Round Eligibility & Statistics Engine
 * Ensures candidate eligibility is strictly calculated based on database round order and interview results.
 */

/**
 * Checks if a candidate (application) is strictly eligible for targetRoundOrder (N: 1, 2, 3...).
 * 
 * Rules:
 * 1. Application status must NOT be 'REJECTED' or 'WITHDRAWN'.
 * 2. If targetRoundOrder === 1: Eligible if application exists and is active.
 * 3. If targetRoundOrder > 1: Application MUST have passed ALL previous round orders 1..(targetRoundOrder - 1).
 *    That is, for every order r from 1 to targetRoundOrder - 1, there exists an InterviewResult with status === 'PASSED'.
 * 
 * @param {Object} application - Application Mongoose doc or plain object
 * @param {Number} targetRoundOrder - Numeric round order (1-indexed)
 * @param {Array} interviewResults - Array of InterviewResult documents for this application / drive
 * @returns {Object} { eligible: boolean, reason: string, clearedPriorCount: number }
 */
const checkStudentRoundEligibility = (application, targetRoundOrder, interviewResults = []) => {
  if (!application) {
    return { eligible: false, reason: 'Application does not exist', clearedPriorCount: 0 };
  }

  if (application.status === 'REJECTED') {
    return { eligible: false, reason: 'Candidate was rejected in a previous round', clearedPriorCount: 0 };
  }

  if (application.status === 'WITHDRAWN') {
    return { eligible: false, reason: 'Candidate withdrew application', clearedPriorCount: 0 };
  }

  const orderNum = Number(targetRoundOrder) || 1;
  if (orderNum <= 1) {
    return { eligible: true, reason: 'Eligible for Round 1', clearedPriorCount: 0 };
  }

  const appIdStr = (application._id || application).toString();

  // Filter interview results for this specific application
  const appResults = interviewResults.filter(
    (res) => (res.application?._id || res.application || '').toString() === appIdStr
  );

  let clearedPriorCount = 0;
  for (let r = 1; r < orderNum; r++) {
    const priorResult = appResults.find((res) => Number(res.roundOrder) === r);
    if (!priorResult || priorResult.status !== 'PASSED') {
      return {
        eligible: false,
        reason: `Candidate has not passed Round ${r}`,
        clearedPriorCount
      };
    }
    clearedPriorCount++;
  }

  return { eligible: true, reason: `Passed all ${clearedPriorCount} prior rounds`, clearedPriorCount };
};

/**
 * Calculates unified, consistent round statistics across all drive selection rounds.
 * Guarantees summary cards and filter logic share identical backend metrics.
 */
const calculateDriveRoundStatistics = (applications = [], results = [], driveRounds = []) => {
  return driveRounds.map((round) => {
    const roundOrder = Number(round.order);

    // Results recorded specifically for this round order
    const resultsInThisRound = results.filter((res) => Number(res.roundOrder) === roundOrder);
    const passedResults = resultsInThisRound.filter((res) => res.status === 'PASSED');
    const failedResults = resultsInThisRound.filter((res) => res.status === 'FAILED');

    // Applications strictly eligible for this round order
    const eligibleApps = applications.filter((app) => {
      const { eligible } = checkStudentRoundEligibility(app, roundOrder, results);
      return eligible;
    });

    const evaluatedAppIdSet = new Set(
      resultsInThisRound
        .filter((res) => res.status === 'PASSED' || res.status === 'FAILED')
        .map((res) => (res.application?._id || res.application || '').toString())
    );

    // Eligible candidates who have not yet been marked PASSED or FAILED in this round
    const pendingApps = eligibleApps.filter(
      (app) => !evaluatedAppIdSet.has((app._id || app).toString())
    );

    return {
      roundOrder,
      roundName: round.roundName,
      roundType: round.roundType,
      mode: round.mode || 'Online',
      totalEligible: eligibleApps.length,
      totalPassed: passedResults.length,
      totalFailed: failedResults.length,
      totalPending: pendingApps.length
    };
  });
};

module.exports = {
  checkStudentRoundEligibility,
  calculateDriveRoundStatistics
};
