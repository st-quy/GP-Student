const express = require('express');
const router = express.Router();
const { upload, uploadFile, deleteFileHandler } = require('../controller/FileController');

// Multipart file upload
router.post('/upload', upload.single('file'), uploadFile);

// Delete a file
router.delete('/', deleteFileHandler);

module.exports = router;
