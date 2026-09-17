const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Memory storage to process files directly as Buffers
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/octet-stream'
  ];

  if (allowedExts.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${ext || file.mimetype}). Only PDF and DOCX files are allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max size limit
  }
});

const resumeUpload = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'jdFile', maxCount: 1 }
]);

// --- JD PDF DISK STORAGE MIDDLEWARE ---
const uploadsJdDir = path.join(__dirname, '..', 'uploads', 'jds');
if (!fs.existsSync(uploadsJdDir)) {
  fs.mkdirSync(uploadsJdDir, { recursive: true });
}

const jdDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsJdDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}-${Date.now()}${ext}`);
  }
});

const jdFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ['application/pdf', 'application/x-pdf', 'application/octet-stream'];
  if (ext === '.pdf' || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for Job Description.'), false);
  }
};

const jdPdfUpload = multer({
  storage: jdDiskStorage,
  fileFilter: jdFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max limit
  }
});

module.exports = { resumeUpload, jdPdfUpload };
