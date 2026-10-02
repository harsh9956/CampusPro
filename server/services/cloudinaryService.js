const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Standard logical folder constants
const CLOUDINARY_FOLDERS = {
  STUDENT_RESUMES: 'campuspro/students/resumes',
  STUDENT_RESUME_ANALYSIS: 'campuspro/students/resume-analysis',
  DRIVE_JDS: 'campuspro/placement-drives/jd',
  COMPANY_JDS: 'campuspro/companies/jd',
  JOB_DESCRIPTIONS: 'campuspro/job-descriptions'
};

// Base local upload directory
const LOCAL_UPLOADS_BASE = path.join(__dirname, '..', 'uploads');

/**
 * Sanitize filename to prevent directory traversal and special character issues
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return `file_${Date.now()}`;
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 80);
  return { base: base || 'document', ext };
};

/**
 * Resolve local folder path based on logical Cloudinary folder
 */
const getLocalFolder = (logicalFolder) => {
  let subfolder = 'misc';
  if (logicalFolder.includes('resumes')) subfolder = 'resumes';
  else if (logicalFolder.includes('jd') || logicalFolder.includes('job-descriptions')) subfolder = 'jds';
  else if (logicalFolder.includes('resume-analysis')) subfolder = 'resume-analysis';

  const fullPath = path.join(LOCAL_UPLOADS_BASE, subfolder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return { fullPath, subfolder };
};

/**
 * Upload buffer to Cloudinary or fallback to local disk storage
 * @param {Object} options
 * @param {Buffer} options.buffer - Raw file buffer
 * @param {string} options.folder - Target folder (e.g. CLOUDINARY_FOLDERS.STUDENT_RESUMES)
 * @param {string} options.originalname - Original name of the file
 * @param {string} [options.mimetype] - MIME type of the file
 * @param {string} [options.resourceType] - 'auto' | 'raw' | 'image' (default 'auto')
 * @returns {Promise<Object>} Upload metadata
 */
const uploadBuffer = async ({
  buffer,
  folder = CLOUDINARY_FOLDERS.JOB_DESCRIPTIONS,
  originalname = 'document.pdf',
  mimetype = 'application/pdf',
  resourceType = 'auto'
}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid buffer is required for upload.');
  }

  const { base, ext } = sanitizeFilename(originalname);
  const uniqueName = `${base}_${Date.now()}`;

  // When Cloudinary credentials are valid, stream upload to Cloudinary
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      // Determine optimal resource_type:
      // PDF and office docs are best treated as 'auto' or 'raw' to avoid image transformation limitations
      const effectiveResourceType = (ext === '.doc' || ext === '.docx' || ext === '.txt') ? 'raw' : (resourceType || 'auto');

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: uniqueName,
          resource_type: effectiveResourceType,
          use_filename: false,
          unique_filename: false,
          overwrite: false
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload Stream Error]', error);
            const err = new Error(error.message || 'Failed to upload file to Cloudinary');
            err.code = 'STORAGE_UNAVAILABLE';
            err.statusCode = 502;
            return reject(err);
          }

          resolve({
            success: true,
            fileUrl: result.secure_url,
            secureUrl: result.secure_url,
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type || effectiveResourceType,
            format: result.format || ext.replace('.', ''),
            fileSize: result.bytes || buffer.length,
            fileName: originalname,
            fileType: mimetype,
            storageProvider: 'cloudinary',
            uploadedAt: new Date()
          });
        }
      );

      // Create readable stream from buffer and pipe to Cloudinary
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  // Production Storage Rule: In production, persistent cloud storage is mandatory.
  // Silent fallback to local disk storage is prohibited in production.
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('Persistent object storage (Cloudinary) is not configured in production environment. Upload blocked for data safety.');
    err.code = 'STORAGE_UNAVAILABLE';
    err.statusCode = 503;
    throw err;
  }

  // Fallback: Local disk storage (Permitted ONLY in development)
  try {
    const { fullPath, subfolder } = getLocalFolder(folder);
    const diskFileName = `${uniqueName}${ext}`;
    const destinationPath = path.join(fullPath, diskFileName);

    await fs.promises.writeFile(destinationPath, buffer);

    const relativeUrl = `/uploads/${subfolder}/${diskFileName}`;
    const localPublicId = `local:${subfolder}/${diskFileName}`;

    return {
      success: true,
      fileUrl: relativeUrl,
      secureUrl: relativeUrl,
      url: relativeUrl,
      publicId: localPublicId,
      resourceType: 'raw',
      format: ext.replace('.', ''),
      fileSize: buffer.length,
      fileName: originalname,
      fileType: mimetype,
      storageProvider: 'local',
      uploadedAt: new Date()
    };
  } catch (localErr) {
    console.error('[Local Storage Fallback Error]', localErr);
    throw new Error(`Failed to save file to local storage: ${localErr.message}`);
  }
};

/**
 * Delete a file by publicId (handles both Cloudinary and local disk)
 * @param {string} publicId - The publicId or local: path
 * @param {string} [resourceType='auto'] - Cloudinary resource type
 * @returns {Promise<Object>} Result of deletion
 */
const deleteAsset = async (publicId, resourceType = 'auto') => {
  if (!publicId || typeof publicId !== 'string') {
    return { success: true, message: 'No public ID specified' };
  }

  // Local file deletion
  if (publicId.startsWith('local:') || publicId.startsWith('/uploads/')) {
    try {
      const cleanPath = publicId.replace(/^local:/, '').replace(/^\/uploads\//, '');
      const fullPath = path.join(LOCAL_UPLOADS_BASE, cleanPath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
      return { success: true, storageProvider: 'local' };
    } catch (err) {
      console.warn(`[Local Delete Warning] Could not remove ${publicId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Cloudinary asset deletion
  if (isCloudinaryConfigured) {
    try {
      let result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      if (result.result !== 'ok' && resourceType !== 'raw') {
        // Try raw resource type if default didn't find the file
        result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      }
      return { success: true, result, storageProvider: 'cloudinary' };
    } catch (err) {
      console.warn(`[Cloudinary Destroy Warning] Could not delete ${publicId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: true, message: 'Storage provider not configured, skipped' };
};

/**
 * Safe replacement workflow:
 * 1. Upload new asset
 * 2. Return new asset metadata
 * 3. Caller saves to DB
 * 4. Caller calls finalizeReplacement(oldPublicId) on success, or rollbackUpload(newPublicId) on failure
 */
const rollbackUpload = async (newPublicId, resourceType = 'auto') => {
  if (newPublicId) {
    try {
      await deleteAsset(newPublicId, resourceType);
      console.log(`[Rollback] Cleaned up newly uploaded asset: ${newPublicId}`);
    } catch (err) {
      console.error(`[Rollback Failed] Could not clean up asset: ${newPublicId}`, err);
    }
  }
};

module.exports = {
  CLOUDINARY_FOLDERS,
  uploadBuffer,
  deleteAsset,
  rollbackUpload,
  sanitizeFilename,
  isCloudinaryConfigured
};
