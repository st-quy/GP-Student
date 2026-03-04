const express = require('express');
const path = require('path');
const router = express.Router();

// Importing route modules
const userRoutes = require('./UserRoute');
const topicRoutes = require('./TopicRoute');
const ClassRoutes = require('./ClassRoute');
const SessionRoutes = require('./SessionRoute');
const StudentAnswerRoutes = require('./StudentAnswerRoute');
const StudentAnswerDraftRoutes = require('./StudentAnswerDraftRoute');
const Excels = require('./ExcelTemplateRoute');
const File = require('./PresignedUrlRouter');

// Health check
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'GP API is running' });
});

// Serve uploaded files statically (local file storage)
router.use('/files/audio', express.static(path.join(__dirname, '..', 'uploads', 'audio')));
router.use('/files/images', express.static(path.join(__dirname, '..', 'uploads', 'images')));

// File upload/delete routes (local storage)
router.use('/files', require('./FileRoute'));

// Defining routes
router.use('/users', userRoutes);
router.use('/topics', topicRoutes);
router.use('/classes', ClassRoutes);
router.use('/sessions', SessionRoutes);
router.use('/student-answers', StudentAnswerRoutes);
router.use('/student-answer-draft', StudentAnswerDraftRoutes);
router.use('/excel', Excels);
router.use('/session-requests', require('./SessionRequestRoute'));
router.use('/session-participants', require('./SessionParticipantRoute'));
router.use('/send-email', require('./SendMailRouter'));
router.use('/grades', require('./GradeRoute'));
router.use('/presigned-url', File);
router.use('/questions', require('./QuestionRoute'));
router.use('/parts', require('./PartRoute'));
router.use('/topicsections', require('./TopicSectionRoute'));
router.use('/sections', require('./SectionRoute'));

module.exports = router;
