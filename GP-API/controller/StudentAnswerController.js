const StudentAnswerService = require("../services/StudentAnswerService");

const storeStudentAnswers = async (req, res) => {
  try {
    const { studentId, topicId, sessionId, questions } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }
    if (!topicId) {
      return res.status(400).json({ message: "Topic ID is required" });
    }
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Questions are required and must be a non-empty array" });
    }
    const result = await StudentAnswerService.storeStudentAnswers(req);
    res.status(result.status).json({
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error saving student answers:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { storeStudentAnswers };
