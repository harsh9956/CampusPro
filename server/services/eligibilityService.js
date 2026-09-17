/**
 * Eligibility Engine Service
 * Evaluates student profile against placement drive criteria
 */
const checkEligibility = (student, drive) => {
  const reasons = [];
  
  if (!student || !drive) {
    return { eligible: false, reasons: ['Student profile or placement drive information missing'] };
  }

  // 1. CGPA Check
  if (student.cgpa < drive.minCgpa) {
    reasons.push(`Required CGPA: ${drive.minCgpa} | Your CGPA: ${student.cgpa}`);
  }

  // 2. Backlog Check
  if (student.backlogs > drive.maxBacklogs) {
    reasons.push(`Max Allowed Active Backlogs: ${drive.maxBacklogs} | Your Active Backlogs: ${student.backlogs}`);
  }

  // 3. Branch / Department Check
  const studentBranch = (student.department || student.branch || '').toUpperCase();
  const eligibleBranchesNormalized = (drive.eligibleBranches || []).map(b => b.toUpperCase());
  
  if (eligibleBranchesNormalized.length > 0 && !eligibleBranchesNormalized.includes(studentBranch) && !eligibleBranchesNormalized.includes('ALL')) {
    reasons.push(`Eligible Branches: ${drive.eligibleBranches.join(', ')} | Your Branch: ${student.department || student.branch}`);
  }

  // 4. Registration Deadline Check
  const now = new Date();
  if (drive.deadline && new Date(drive.deadline) < now) {
    reasons.push(`Registration deadline expired on ${new Date(drive.deadline).toLocaleDateString()}`);
  }

  // 5. Drive Status Check
  if (drive.status === 'COMPLETED' || drive.status === 'CANCELLED') {
    reasons.push(`Placement drive status is ${drive.status}`);
  }

  const eligible = reasons.length === 0;
  return { eligible, reasons };
};

module.exports = { checkEligibility };
