const multer = require('multer');
const os = require('os');
const LocalFileService = require('../services/LocalFileService');

const upload = multer({ dest: os.tmpdir() });

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const category = req.body.type || req.body.category || 'audio';
    const result = await LocalFileService.saveFile(req.file, category);
    return res.status(200).json({
      fileUrl: result.fileUrl,
      objectKey: result.objectKey,
    });
  } catch (error) {
    console.error('uploadFile error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const deleteFileHandler = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }
    const result = await LocalFileService.deleteFile(fileUrl);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  upload,
  uploadFile,
  deleteFileHandler,
};
