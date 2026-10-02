const { Worker } = require('bullmq');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { redisConfig, isRedisEnabled } = require('../config/redis');
const { EXPORT_QUEUE_NAME } = require('../queues/exportQueue');
const ExportJob = require('../models/ExportJob');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const Department = require('../models/Department');
const Section = require('../models/Section');
const { buildStudentFilterQuery } = require('../utils/studentFilter');
const { createAuditLog } = require('../services/auditLogService');

const CONCURRENCY = parseInt(process.env.EXPORT_WORKER_CONCURRENCY || '2', 10);

let exportWorker = null;

const createExportWorker = () => {
  if (!isRedisEnabled()) {
    console.warn('[ExportWorker] Redis is disabled. Export worker will not be started.');
    return null;
  }

  // Ensure export upload directory exists
  const exportsDir = path.join(__dirname, '..', 'uploads', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  exportWorker = new Worker(
    EXPORT_QUEUE_NAME,
    async (job) => {
      const t0 = Date.now();
      const { exportJobId, filters: jobFilters, user: currentUser, academicYear, filterMeta } = job.data;
      const queueWaitTime = job.timestamp ? (Date.now() - job.timestamp) : 0;
      console.log(`[StudentExport] Job received. Queue wait time: ${queueWaitTime}ms for ExportJob ID: ${exportJobId}`);

      const exportJobDoc = await ExportJob.findById(exportJobId);
      if (!exportJobDoc) {
        throw new Error(`ExportJob ${exportJobId} not found in database.`);
      }

      exportJobDoc.status = 'PROCESSING';
      exportJobDoc.startedAt = new Date();
      await exportJobDoc.save();

      try {
        const effectiveFilters = jobFilters || exportJobDoc.filters || {};
        console.log('[StudentExport] Active Filters:', JSON.stringify(effectiveFilters, null, 2));

        const tQueryStart = Date.now();
        const query = await buildStudentFilterQuery(effectiveFilters, currentUser);
        console.log('[StudentExport] Built Mongo Query:', JSON.stringify(query));

        // 1. Count total matching records
        const total = await Student.countDocuments(query);
        exportJobDoc.totalRecords = total;
        await exportJobDoc.save();
        console.log(`[StudentExport] Total Matching Students: ${total} (Count completed in ${Date.now() - tQueryStart}ms)`);

        const tFetchStart = Date.now();
        const students = await Student.find(query)
          .select('user enrollmentNo department section branch year cgpa percentage tenthPercentage twelfthPercentage backlogs dateOfBirth studentMobileNumber parentMobileNumber permanentAddress permanentPinCode temporaryAddress temporaryPinCode pinCode skills profileLinks phone resumeUrl bio academicYear createdAt')
          .populate('user', 'name email status role avatar academicYear createdAt')
          .populate('department', 'name code isActive status')
          .populate('section', 'name code isActive status')
          .sort({ createdAt: -1 })
          .lean();
        console.log(`[StudentExport] Fetched ${students.length} matching students in ${Date.now() - tFetchStart}ms`);

        const userIds = students.map((s) => s.user?._id).filter(Boolean);
        const studentIds = students.map((s) => s._id);

        // Bulk fetch linked Resumes and Applications with lean queries
        const [resumes, applications] = await Promise.all([
          Resume.find({ user: { $in: userIds } })
            .select('user links professionalLinks codingProfiles')
            .lean(),
          Application.find({ student: { $in: studentIds } })
            .select('student status')
            .lean()
        ]);

        const resumeMap = new Map();
        resumes.forEach((r) => {
          if (r.user) resumeMap.set(r.user.toString(), r);
        });

        const placementStatusMap = new Map();
        applications.forEach((app) => {
          const sId = app.student ? app.student.toString() : '';
          if (!sId) return;
          const current = placementStatusMap.get(sId);
          if (app.status === 'SELECTED') {
            placementStatusMap.set(sId, 'Placed');
          } else if (!current && ['SHORTLISTED', 'IN_PROGRESS', 'APTITUDE_CLEARED', 'CODING_CLEARED', 'TECHNICAL_CLEARED', 'HR_CLEARED'].includes(app.status)) {
            placementStatusMap.set(sId, 'In Process');
          } else if (!current && app.status === 'REGISTERED') {
            placementStatusMap.set(sId, 'Applied');
          } else if (!current && (app.status === 'REJECTED' || app.status === 'WITHDRAWN')) {
            placementStatusMap.set(sId, 'Not Placed');
          }
        });

        // Date formatter helper
        const formatDate = (val) => {
          if (!val) return 'N/A';
          const d = new Date(val);
          if (isNaN(d.getTime())) return 'N/A';
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        const filterSummary = filterMeta?.summary || 'Standard Filter';
        const academicYearStr = academicYear || filterMeta?.academicYear || 'All Academic Years';

        // 1. Metadata Header Rows
        const rows = [
          ['CampusPro - Smart Placement & Interview Management Platform'],
          ['Student Directory Report'],
          [`Academic Year: ${academicYearStr}`],
          [`Filters Applied: ${filterSummary}`],
          [`Generated On: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`, '', `Total Records: ${students.length}`],
          [] // Blank separator row
        ];

        // 2. Table Headers
        const headers = [
          'Student Name',
          'Enrollment Number',
          'Email',
          'Student Mobile Number',
          'Parent Mobile Number',
          'Date of Birth',
          'Department',
          'Section',
          'Academic Year',
          'Current CGPA',
          'Current Percentage',
          '10th Percentage',
          '12th Percentage',
          'Active Backlogs',
          'Placement Status',
          'Permanent Address',
          'Permanent PIN Code',
          'Temporary Address',
          'Temporary PIN Code',
          'Registered Date',
          'Skills',
          'Resume URL',
          'LinkedIn',
          'GitHub',
          'LeetCode',
          'GFG'
        ];
        rows.push(headers);

        // 3. Process each student row (strict N/A rule for missing links, no fake URLs)
        students.forEach((s) => {
          const uId = s.user?._id ? s.user._id.toString() : '';
          const resume = uId ? resumeMap.get(uId) : null;
          const placementStatus = placementStatusMap.get(s._id.toString()) || 'Not Applied';

          const skillsStr = Array.isArray(s.skills) && s.skills.length > 0 ? s.skills.join(', ') : 'N/A';
          const deptStr = s.department?.name ? `${s.department.name} (${s.department.code || ''})` : (s.branch || 'N/A');
          const secStr = s.section?.name || 'N/A';

          const cgpaStr = s.cgpa !== undefined && s.cgpa !== null ? s.cgpa : 'N/A';
          const currentPctStr = s.percentage !== undefined && s.percentage !== null
            ? `${s.percentage}%`
            : (s.cgpa !== undefined && s.cgpa !== null ? `${(s.cgpa * 10).toFixed(1)}%` : 'N/A');
          const tenthStr = s.tenthPercentage !== undefined && s.tenthPercentage !== null ? `${s.tenthPercentage}%` : 'N/A';
          const twelfthStr = s.twelfthPercentage !== undefined && s.twelfthPercentage !== null ? `${s.twelfthPercentage}%` : 'N/A';
          const backlogsVal = s.backlogs !== undefined && s.backlogs !== null ? s.backlogs : 0;

          const getCleanLink = (primary, linkName) => {
            if (primary && typeof primary === 'string' && primary.trim() && !primary.includes('/username')) {
              return primary.trim();
            }
            const found = resume?.links?.find(l => l.name && l.name.toLowerCase().includes(linkName.toLowerCase()));
            if (found && found.url && typeof found.url === 'string' && found.url.trim() && !found.url.includes('/username')) {
              return found.url.trim();
            }
            return 'N/A';
          };

          const linkedinUrl = getCleanLink(s.profileLinks?.linkedin || resume?.professionalLinks?.linkedin, 'linkedin');
          const githubUrl = getCleanLink(s.profileLinks?.github || resume?.professionalLinks?.github, 'github');
          const leetcodeUrl = getCleanLink(s.profileLinks?.leetcode || resume?.codingProfiles?.leetcode, 'leetcode');
          const gfgUrl = getCleanLink(s.profileLinks?.geeksforgeeks || resume?.codingProfiles?.geeksforgeeks, 'gfg') !== 'N/A'
            ? getCleanLink(s.profileLinks?.geeksforgeeks || resume?.codingProfiles?.geeksforgeeks, 'gfg')
            : getCleanLink(s.profileLinks?.geeksforgeeks || resume?.codingProfiles?.geeksforgeeks, 'geeksforgeeks');

          const studentMobile = s.studentMobileNumber || s.phone || 'N/A';
          const permPin = s.permanentPinCode || s.pinCode || 'N/A';
          const tempPin = s.temporaryPinCode || (s.permanentPinCode || s.pinCode || 'N/A');

          rows.push([
            s.user?.name || 'N/A',
            s.enrollmentNo || 'N/A',
            s.user?.email || 'N/A',
            studentMobile,
            s.parentMobileNumber || 'N/A',
            formatDate(s.dateOfBirth),
            deptStr,
            secStr,
            s.academicYear || s.user?.academicYear || 'N/A',
            cgpaStr,
            currentPctStr,
            tenthStr,
            twelfthStr,
            backlogsVal,
            placementStatus,
            s.permanentAddress || 'N/A',
            permPin,
            s.temporaryAddress || 'N/A',
            tempPin,
            formatDate(s.createdAt || s.user?.createdAt),
            skillsStr,
            s.resumeUrl || 'N/A',
            linkedinUrl,
            githubUrl,
            leetcodeUrl,
            gfgUrl
          ]);
        });

        // 4. Generate Excel Sheet
        const tExcelStart = Date.now();
        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws['!cols'] = [
          { wch: 22 }, { wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 22 },
          { wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
          { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
          { wch: 32 }, { wch: 18 }, { wch: 32 }, { wch: 18 }, { wch: 16 },
          { wch: 30 }, { wch: 35 }, { wch: 28 }, { wch: 28 }, { wch: 24 },
          { wch: 24 }
        ];

        ws['!autofilter'] = { ref: `A7:Z${rows.length}` };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Student Directory');

        // Dynamic unique filename
        const timestamp = Date.now();
        const baseName = (filterMeta?.filenamePrefix || 'CampusPro_Students').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const filename = `${baseName}_${timestamp}.xlsx`;
        const filePath = path.join(exportsDir, filename);

        // Write file to disk
        XLSX.writeFile(wb, filePath);
        console.log(`[StudentExport] Excel generated and written in ${Date.now() - tExcelStart}ms`);

        // 5. Update ExportJob Document
        exportJobDoc.status = 'COMPLETED';
        exportJobDoc.fileName = filename;
        exportJobDoc.filePath = filePath;
        exportJobDoc.fileUrl = `/uploads/exports/${filename}`;
        exportJobDoc.processedRecords = students.length;
        exportJobDoc.completedAt = new Date();
        await exportJobDoc.save();

        if (currentUser) {
          await createAuditLog({
            user: currentUser,
            actionType: 'EXPORT_COMPLETED',
            targetEntity: 'Student',
            targetName: filename,
            details: `Completed background Excel export for ${students.length} students: ${filename}`,
            status: 'SUCCESS'
          });
        }

        console.log(`[StudentExport] Successfully generated ${filename} (${students.length} records). Total worker time: ${Date.now() - t0}ms`);
        return { success: true, fileName: filename, totalRecords: students.length };
      } catch (err) {
        console.error(`[ExportWorker] Error generating Excel for job ${job.id}:`, err);
        exportJobDoc.status = 'FAILED';
        exportJobDoc.errorMessage = err.message || 'Excel generation failed';
        await exportJobDoc.save();
        throw err;
      }
    },
    {
      connection: redisConfig,
      concurrency: CONCURRENCY
    }
  );

  exportWorker.on('completed', (job) => {
    console.log(`[ExportWorker] Job ${job.id} completed successfully`);
  });

  exportWorker.on('failed', (job, err) => {
    console.error(`[ExportWorker] Job ${job?.id} failed: ${err.message}`);
  });

  exportWorker.on('error', (err) => {
    console.error('[ExportWorker Error]', err.message);
  });

  console.log(`[Worker] Export worker started with concurrency ${CONCURRENCY}`);
  return exportWorker;
};

module.exports = {
  createExportWorker,
  getExportWorker: () => exportWorker
};
