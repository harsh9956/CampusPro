/**
 * Eligibility Engine Service
 * Evaluates student profile against placement drive criteria dynamically
 */
const checkEligibility = (student, drive, options = {}) => {
  const reasons = [];
  
  if (!student || !drive) {
    return { eligible: false, reasons: ['Student profile or placement drive information missing'] };
  }

  // Parse eligibility criteria structure with legacy fallback
  const crit = drive.eligibilityCriteria || {};
  
  // Parse eligibility criteria structure: criteria is canonical source of truth
  let minAcademic = crit.minimumAcademic;
  if (!minAcademic) {
    if (drive.minCgpa !== undefined && drive.minCgpa !== null) {
      minAcademic = {
        enabled: true,
        type: 'CGPA',
        value: Number(drive.minCgpa)
      };
    } else {
      minAcademic = { enabled: false, type: 'CGPA', value: 0 };
    }
  }
  
  const highSchool = crit.highSchool || {
    enabled: false,
    minimumPercentage: 0
  };
  
  const intermediate = crit.intermediate || {
    enabled: false,
    minimumPercentage: 0
  };

  // 1. Minimum Academic Criteria (CGPA or Percentage) - Only if enabled!
  if (minAcademic.enabled) {
    const isPercentage = (minAcademic.type || '').toUpperCase() === 'PERCENTAGE';
    const targetVal = Number(minAcademic.value) || 0;

    if (isPercentage) {
      // Calculate student academic percentage (direct or derived from CGPA * 10)
      const studentPct = student.percentage !== undefined
        ? Number(student.percentage)
        : (student.cgpa !== undefined ? Number(student.cgpa) * 10 : 0);

      if (studentPct < targetVal) {
        reasons.push(`Required Academic Percentage: ${targetVal}% | Your Percentage: ${studentPct}%`);
      }
    } else {
      // CGPA Mode: criteria value is canonical, never silently overridden via Math.max
      const requiredCgpa = targetVal;
      const studentCgpa = student.cgpa !== undefined ? Number(student.cgpa) : 0;
      if (studentCgpa < requiredCgpa) {
        reasons.push(`Required CGPA: ${requiredCgpa} | Your CGPA: ${studentCgpa}`);
      }
    }
  }

  // 2. High School (10th) Criteria - Only if enabled!
  if (highSchool.enabled) {
    const target10th = Number(highSchool.minimumPercentage !== undefined ? highSchool.minimumPercentage : (highSchool.value ?? 0));
    const student10th = student.tenthPercentage !== undefined
      ? Number(student.tenthPercentage)
      : (student.highSchoolPercentage !== undefined ? Number(student.highSchoolPercentage) : 0);

    if (student10th < target10th) {
      reasons.push(`Required 10th/High School Percentage: ${target10th}% | Your 10th Percentage: ${student10th}%`);
    }
  }

  // 3. Intermediate (12th) Criteria - Only if enabled!
  if (intermediate.enabled) {
    const target12th = Number(intermediate.minimumPercentage !== undefined ? intermediate.minimumPercentage : (intermediate.value ?? 0));
    const student12th = student.twelfthPercentage !== undefined
      ? Number(student.twelfthPercentage)
      : (student.intermediatePercentage !== undefined ? Number(student.intermediatePercentage) : 0);

    if (student12th < target12th) {
      reasons.push(`Required 12th/Intermediate Percentage: ${target12th}% | Your 12th Percentage: ${student12th}%`);
    }
  }

  // 4. Backlog Check
  const maxBacklogs = drive.maxBacklogs !== undefined && drive.maxBacklogs !== null ? Number(drive.maxBacklogs) : Infinity;
  const studentBacklogs = student.backlogs !== undefined ? Number(student.backlogs) : 0;
  if (maxBacklogs !== Infinity && studentBacklogs > maxBacklogs) {
    reasons.push(`Max Allowed Active Backlogs: ${maxBacklogs} | Your Active Backlogs: ${studentBacklogs}`);
  }

  // 5. Branch / Department Check
  const deptCode = (student.department?.code || '').toUpperCase();
  const deptName = (student.department?.name || '').toUpperCase();
  const deptStr = (typeof student.department === 'string' ? student.department : '').toUpperCase();
  const branchStr = (student.branch || '').toUpperCase();
  const eligibleBranchesNormalized = (drive.eligibleBranches || []).map(b => String(b).trim().toUpperCase());
  
  const isBranchEligible =
    eligibleBranchesNormalized.length === 0 ||
    eligibleBranchesNormalized.includes('ALL') ||
    (deptCode && eligibleBranchesNormalized.includes(deptCode)) ||
    (deptName && eligibleBranchesNormalized.includes(deptName)) ||
    (deptStr && eligibleBranchesNormalized.includes(deptStr)) ||
    (branchStr && eligibleBranchesNormalized.includes(branchStr));

  if (!isBranchEligible) {
    const studentDeptDisplay = student.department?.name || student.department?.code || student.department || student.branch || 'N/A';
    reasons.push(`Eligible Branches: ${drive.eligibleBranches.join(', ')} | Your Branch: ${studentDeptDisplay}`);
  }

  // 6. Target Audience / Section Check (Strictly enforced)
  const audienceType = (drive.targetAudience?.type || drive.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS').toUpperCase();
  if (audienceType === 'SPECIFIC_SECTIONS') {
    const rawTargetSections = (
      drive.targetAudience?.sectionIds ||
      drive.notificationSettings?.targetSections ||
      []
    );

    const targetSectionIds = rawTargetSections.map(id => (id?._id || id).toString());
    const targetSectionCodes = rawTargetSections
      .map(id => (id?.code || id?.name || '').toUpperCase())
      .filter(Boolean);

    const studentSectionId = student.section?._id
      ? student.section._id.toString()
      : (student.section ? student.section.toString() : null);
    const studentSecCode = (student.section?.code || '').toUpperCase();
    const studentSecName = (student.section?.name || '').toUpperCase();

    const isSectionMatched = Boolean(
      (studentSectionId && targetSectionIds.includes(studentSectionId)) ||
      (studentSecCode && (targetSectionCodes.includes(studentSecCode) || targetSectionIds.includes(studentSecCode))) ||
      (studentSecName && (targetSectionCodes.includes(studentSecName) || targetSectionIds.includes(studentSecName)))
    );

    if (!isSectionMatched) {
      reasons.push('You are not eligible for this placement drive because your section is not included in the target audience.');
    }
  }

  // 7. Registration Deadline Check
  if (!options.ignoreDeadline) {
    const now = new Date();
    if (drive.deadline && new Date(drive.deadline) < now) {
      reasons.push(`Registration deadline expired on ${new Date(drive.deadline).toLocaleDateString()}`);
    }
  }

  // 8. Drive Status Check
  if (drive.status === 'COMPLETED' || drive.status === 'CANCELLED') {
    reasons.push(`Placement drive status is ${drive.status}`);
  }

  const eligible = reasons.length === 0;
  return { eligible, reasons };
};

module.exports = { checkEligibility };
