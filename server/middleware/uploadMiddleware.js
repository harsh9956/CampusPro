const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Maximum upload file size: 10 MB across the application
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes

// Allowed document extensions and MIME types
const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
];

const RESUME_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const RESUME_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.bin', '.msi',
  '.js', '.mjs', '.cjs', '.vbs', '.py', '.php', '.html', '.htm',
  '.scr', '.pif', '.jar', '.com'
];

/**
 * Checks for path traversal and dangerous double-extension patterns
 */
const validateFilenameSafety = (filename) => {
  if (!filename || typeof filename !== 'string') {
    const err = new Error('Filename is missing or invalid.');
    err.code = 'INVALID_FILE_TYPE';
    return err;
  }

  // Check for path traversal or control characters
  if (filename.includes('..') || /[/\\]|\x00/.test(filename)) {
    const err = new Error('Path traversal or invalid characters detected in filename.');
    err.code = 'INVALID_FILE_TYPE';
    return err;
  }

  // Check for double extension tricks (e.g. resume.pdf.exe, jd.docx.js)
  const lowerName = filename.toLowerCase();
  for (const dangerous of DANGEROUS_EXTENSIONS) {
    if (lowerName.endsWith(dangerous)) {
      const err = new Error(`Dangerous executable or script extension detected (${dangerous}).`);
      err.code = 'INVALID_FILE_TYPE';
      return err;
    }
  }

  return null;
};

/**
 * File filter for Multer (initial check on extension and announced MIME type)
 */
const documentFileFilter = (req, file, cb) => {
  const safetyErr = validateFilenameSafety(file.originalname);
  if (safetyErr) {
    return cb(safetyErr, false);
  }

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (ALLOWED_DOC_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type (${ext || file.mimetype}). Supported formats are PDF, DOC, DOCX, and TXT.`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

/**
 * File filter for student resumes (PDF, DOC, DOCX)
 */
const resumeFileFilter = (req, file, cb) => {
  const safetyErr = validateFilenameSafety(file.originalname);
  if (safetyErr) {
    return cb(safetyErr, false);
  }

  const ext = path.extname(file.originalname).toLowerCase();

  if (RESUME_ALLOWED_EXTENSIONS.includes(ext) && RESUME_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid resume format (${ext || file.mimetype}). Supported formats are PDF, DOC, and DOCX.`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

/**
 * Inspect magic bytes / file signatures to prevent executable spoofing or renamed files
 */
const verifyFileMagicBytes = (buffer, filename) => {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File appears to be empty or corrupted.' };
  }

  // Reject executable file signatures regardless of announced extension
  // Windows DOS/PE executable ('MZ' -> 0x4D 0x5A)
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, error: 'Executable binary file detected. Execution and upload blocked.' };
  }
  // Linux ELF executable (\x7FELF -> 0x7F 0x45 0x4C 0x46)
  if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, error: 'Executable ELF binary detected. Upload blocked.' };
  }

  const ext = path.extname(filename).toLowerCase();

  // PDF check: starts with %PDF-
  if (ext === '.pdf') {
    const isPdf = buffer.slice(0, 5).toString('ascii') === '%PDF-';
    if (!isPdf) {
      return { valid: false, error: 'File content does not match a valid PDF document (invalid magic bytes).' };
    }
    return { valid: true };
  }

  // DOCX check: starts with PK\x03\x04 (ZIP container for Office Open XML)
  if (ext === '.docx') {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      return { valid: false, error: 'File content does not match a valid DOCX document (invalid zip container).' };
    }
    return { valid: true };
  }

  // Legacy DOC check: starts with \xD0\xCF\x11\xE0 (OLE compound file)
  if (ext === '.doc') {
    const isDoc = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
    if (!isDoc) {
      return { valid: false, error: 'File content does not match a valid legacy DOC document.' };
    }
    return { valid: true };
  }

  // TXT check: no null bytes in sample header
  if (ext === '.txt') {
    const sample = buffer.slice(0, Math.min(buffer.length, 512));
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0x00) {
        return { valid: false, error: 'File content contains binary null bytes and is not valid plain text.' };
      }
    }
    return { valid: true };
  }

  return { valid: true };
};

/**
 * Express middleware to validate magic bytes of uploaded memory files
 */
const validateMagicBytesMiddleware = (req, res, next) => {
  const filesToCheck = [];
  if (req.file && req.file.buffer) {
    filesToCheck.push(req.file);
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToCheck.push(...req.files);
    } else {
      Object.values(req.files).forEach((fileArr) => {
        if (Array.isArray(fileArr)) filesToCheck.push(...fileArr);
      });
    }
  }

  for (const file of filesToCheck) {
    if (file.buffer) {
      const check = verifyFileMagicBytes(file.buffer, file.originalname);
      if (!check.valid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE_TYPE',
          message: check.error || `File ${file.originalname} has invalid content signature.`
        });
      }
    }
  }

  next();
};

// --- Storage configurations ---
const memoryStorage = multer.memoryStorage();

const uploadsJdDir = path.join(__dirname, '..', 'uploads', 'jds');
const uploadsResumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
[uploadsJdDir, uploadsResumesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Single student resume upload in memory (max 10 MB)
const singleResumeUpload = multer({
  storage: memoryStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).single('resume');

// Resume Analyzer dual-upload in memory (max 10 MB each)
const resumeUpload = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).fields([
  { name: 'resume', maxCount: 1 },
  { name: 'jdFile', maxCount: 1 }
]);

// Placement Drive JD PDF upload in memory (max 10 MB)
const jdPdfUpload = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).single('jdFile');

// AI Prep Roadmap JD document upload in memory (max 10 MB)
const jdDocumentUpload = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).single('jdFile');

/**
 * Clean Multer error handling wrapper middleware.
 * Returns HTTP 413 for FILE_TOO_LARGE.
 * Returns HTTP 400 for INVALID_FILE_TYPE.
 */
const handleUploadError = (uploadMiddlewareFn) => {
  return (req, res, next) => {
    uploadMiddlewareFn(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds the 10 MB maximum limit. Please upload a smaller file.'
            });
          }
          return res.status(400).json({
            success: false,
            code: err.code,
            message: `File upload error: ${err.message}`
          });
        }

        const isLimitError = err.code === 'LIMIT_FILE_SIZE' || err.message?.includes('too large');
        const statusCode = isLimitError ? 413 : 400;
        const errorCode = isLimitError ? 'FILE_TOO_LARGE' : (err.code || 'INVALID_FILE_TYPE');

        return res.status(statusCode).json({
          success: false,
          code: errorCode,
          message: err.message || 'File upload failed validation.'
        });
      }
      next();
    });
  };
};

module.exports = {
  MAX_FILE_SIZE,
  ALLOWED_DOC_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  validateFilenameSafety,
  verifyFileMagicBytes,
  validateMagicBytesMiddleware,
  handleUploadError,
  singleResumeUpload,
  resumeUpload,
  jdPdfUpload,
  jdDocumentUpload,
  uploadsJdDir,
  uploadsResumesDir
};
