const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const PORT = process.env.PORT || 3010;
const FILE_BASE_URL =
  process.env.FILE_BASE_URL || `https://127.0.0.1:${PORT}/api/files`;

// Ensure upload directories exist on startup
const initializeStorage = () => {
  const dirs = [
    path.join(UPLOAD_DIR, 'audio'),
    path.join(UPLOAD_DIR, 'images'),
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  console.info('Local file storage initialized at:', UPLOAD_DIR);
};

// Build stored filename: uuid + extension
const buildStoredName = (originalFileName) => {
  const ext = path.extname(originalFileName) || '';
  return `${uuidv4()}${ext}`;
};

// Save an uploaded file (from multer) and record in DB
const saveFile = async (file, category = 'audio') => {
  const { File } = require('../models');

  const storedName = buildStoredName(file.originalname);
  const relPath = path.join(category, storedName);
  const fullPath = path.join(UPLOAD_DIR, relPath);
  const fileUrl = `${FILE_BASE_URL}/${category}/${storedName}`;

  // Move file from multer temp to final location
  fs.copyFileSync(file.path, fullPath);
  fs.unlinkSync(file.path);

  // Record in database
  const record = await File.create({
    OriginalName: file.originalname,
    StoredName: storedName,
    MimeType: file.mimetype,
    Size: file.size,
    Category: category,
    FilePath: relPath,
    Url: fileUrl,
  });

  return {
    fileUrl,
    objectKey: relPath,
    fileId: record.ID,
  };
};

// Delete a single file by its URL or path
const deleteFile = async (filePathOrUrl) => {
  const { File } = require('../models');

  try {
    let record = await File.findOne({ where: { Url: filePathOrUrl } });

    if (!record) {
      record = await File.findOne({ where: { FilePath: filePathOrUrl } });
    }

    if (!record) {
      const filename = filePathOrUrl.split('/').pop();
      record = await File.findOne({ where: { StoredName: filename } });
    }

    if (record) {
      const fullPath = path.join(UPLOAD_DIR, record.FilePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      await record.destroy();
    }

    return { status: 200, message: 'File deleted successfully' };
  } catch (err) {
    console.error('deleteFile error:', err);
    throw new Error('Failed to delete local file');
  }
};

// Delete multiple files
const deleteFiles = async (filePathsOrUrls) => {
  for (const item of filePathsOrUrls) {
    if (item) {
      await deleteFile(item);
    }
  }
  return {
    status: 200,
    message: `${filePathsOrUrls.length} files deleted`,
  };
};

module.exports = {
  initializeStorage,
  saveFile,
  deleteFile,
  deleteFiles,
};
