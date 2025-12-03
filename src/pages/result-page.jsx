import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownloadOutlined,
  LeftOutlined,
  SoundOutlined,
  WarningOutlined,
  BulbFilled,
  ReadOutlined,
  EditOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { fetchExamReview } from '@features/grade/api'
import SharedHeader from '@shared/ui/base-header'
import { Button, Card, Col, Empty, Layout, Row, Spin, Tabs, Tag, Typography, message, Select } from 'antd'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

// --- HELPERS ---

const renderAudioPlayer = (audioUrl) => (
  <div className="w-full bg-[#F0F7FF] p-4 rounded-lg mb-4 flex items-center gap-3">
      <div className="bg-blue-500 rounded-full p-2 text-white flex items-center justify-center"><SoundOutlined /></div>
      <audio controls src={audioUrl} className="w-full" />
  </div>
)

const formatAnswerText = (data) => {
  if (data === null || data === undefined || data === '') return <Text type="secondary">No answer provided</Text>;
  let parsedData = data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try { parsedData = JSON.parse(data); } catch (e) { }
    }
  }
  if (Array.isArray(parsedData)) {
    return (
      <div className="flex flex-col gap-2">
        {parsedData.map((item, idx) => {
            if (typeof item === 'string') return <div key={idx} className="bg-white p-2 rounded border border-gray-200">{item}</div>;
            const label = item.key || item.left || item.questionId;
            const value = item.value || item.right || item.answerText;
            return (
                <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-sm flex flex-wrap items-center">
                    {label && <span className="font-semibold text-gray-600 mr-2">{label}</span>}
                    {label && value && <span className="mx-1 text-gray-400">➔</span>}
                    {value && <span className="font-bold text-[#003087] ml-2">{value}</span>}
                </div>
            )
        })}
      </div>
    )
  }
  if (typeof parsedData === 'object' && parsedData !== null) {
      return (
          <div className="flex flex-col gap-1">
             {Object.entries(parsedData).map(([k, v]) => (
                 <div key={k} className="text-sm"><span className="font-semibold">{k}:</span> {String(v)}</div>
             ))}
          </div>
      )
  }
  return String(parsedData);
}

// --- SUB-COMPONENTS ---

const QuestionList = ({ questions }) => {
  return (
    <div className="flex flex-col gap-4">
      <div><span className="bg-[#003087] text-white px-6 py-2 rounded-lg font-bold inline-block shadow-sm text-base">Questions</span></div>
      <div className="flex flex-col gap-3">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex gap-4 items-start hover:shadow-md transition-shadow">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003087] text-white flex items-center justify-center font-bold shadow-sm">{idx + 1}</div>
            <div className="text-gray-800 font-medium text-lg pt-0.5">{q.questionContent || q.Content || q.content || "No content"}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SpeakingPartView = ({ partName, questions }) => {
  const userAudio = questions.find(q => q.userResponse?.audio)?.userResponse?.audio
  const contextImage = questions.find(q => q.resources?.images?.length > 0)?.resources?.images?.[0]
  const teacherComment = questions.find(q => q.userResponse?.comment)?.userResponse?.comment

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
      <div className="border-b border-gray-100 pb-4 mb-6"><Title level={4} className="!mb-0 text-[#003087]">{partName}</Title></div>
      <div className="mb-8">
        {contextImage ? (
          <Row gutter={32}>
            <Col xs={24} md={10} className="mb-6 md:mb-0"><div className="h-full bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 p-2"><img src={contextImage} alt="Context" className="w-full h-auto object-contain max-h-[400px] rounded-md"/></div></Col>
            <Col xs={24} md={14}><QuestionList questions={questions} /></Col>
          </Row>
        ) : (
          <div className="w-full"><QuestionList questions={questions} /></div>
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="bg-[#F0F7FF] rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-full text-white shadow-sm"><SoundOutlined className="text-xl" /></div>
                <div><h4 className="font-bold text-gray-800 m-0 text-lg">Your Recording</h4><span className="text-gray-500 text-sm">Listen to your response for this part</span></div>
            </div>
            {userAudio ? (<div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm"><audio controls src={userAudio} className="w-full h-10" /></div>) : (<div className="bg-white p-4 rounded-xl text-center text-gray-400 italic border border-dashed border-gray-300">No recording found.</div>)}
            {teacherComment && (<div className="mt-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><div className="flex items-center gap-2 mb-2 text-[#003087] font-bold text-base"><EditOutlined />Teacher's Feedback</div><p className="text-gray-700 m-0 leading-relaxed text-base">{teacherComment}</p></div>)}
        </div>
      </div>
    </div>
  )
}

// --- COMPONENT: DROPDOWN LIST RESULT (Cập nhật logic tìm đáp án đúng) ---
const DropdownListResult = ({ question }) => {
    // 1. Parse User Response thành Map
    let userAnswersMap = {};
    try {
        const raw = question.userResponse?.text;
        if (raw) {
            let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    const k = item.key || item.left || item.questionId;
                    const v = item.value || item.right || item.answerText;
                    if (k) userAnswersMap[String(k).trim().toLowerCase()] = v;
                });
            } else if (typeof parsed === 'object' && parsed !== null) {
                Object.entries(parsed).forEach(([k, v]) => {
                    userAnswersMap[String(k).trim().toLowerCase()] = v;
                });
            }
        }
    } catch (e) { }

    // 2. Parse Content
    let correctAnswers = [];
    let leftItems = [];
    let optionsMap = {}; 
    let commonOptions = []; 
    let isCommonOptions = false;
    
    try {
        const rawContent = question.resources?.answerContent || question.AnswerContent;
        const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        
        if (contentObj) {
            if (contentObj.correctAnswer) {
                correctAnswers = Array.isArray(contentObj.correctAnswer) 
                    ? contentObj.correctAnswer 
                    : Object.entries(contentObj.correctAnswer).map(([k,v]) => ({key: k, value: v}));
            }
            if (contentObj.leftItems) leftItems = contentObj.leftItems;
            else if (contentObj.options && Array.isArray(contentObj.options)) {
                 leftItems = contentObj.options.map(opt => opt.key);
            }
            if (contentObj.rightItems && Array.isArray(contentObj.rightItems)) {
                isCommonOptions = true;
                commonOptions = contentObj.rightItems;
            } else if (contentObj.options && Array.isArray(contentObj.options)) {
                contentObj.options.forEach(opt => {
                    optionsMap[opt.key] = opt.value; 
                });
            }
        }
    } catch (e) { console.error("Error parsing content:", e); }

    const rowsToRender = leftItems.length > 0 ? leftItems : correctAnswers.map(c => c.key);

    if (rowsToRender.length === 0) return formatAnswerText(question.userResponse?.text);

    return (
        <div className="flex flex-col gap-4 mt-6">
            {rowsToRender.map((rowKey, idx) => {
                const normalize = (str) => String(str || '').trim().toLowerCase();
                const rawKeyText = typeof rowKey === 'string' ? rowKey : (rowKey?.key || `Question ${idx + 1}`);
                
                // Tìm đáp án đúng
                let correctItem = correctAnswers.find(c => c.key && normalize(c.key) === normalize(rawKeyText));
                if (!correctItem) correctItem = correctAnswers.find(c => String(c.key) === String(idx));
                if (!correctItem && correctAnswers[idx]) correctItem = correctAnswers[idx];

                // Tìm đáp án học sinh chọn
                const userSelectedValue = userAnswersMap[normalize(rawKeyText)] || userAnswersMap[String(idx)];
                
                const hasAnswer = userSelectedValue !== undefined && userSelectedValue !== null && userSelectedValue !== '';
                const isCorrect = hasAnswer && correctItem && normalize(userSelectedValue) === normalize(correctItem.value);

                // --- THAY ĐỔI Ở ĐÂY ---
                // Nếu có trả lời -> Hiện cái đã chọn.
                // Nếu KHÔNG trả lời -> Hiện null (để trống ô input)
                const displayValue = hasAnswer ? userSelectedValue : null;

                let currentOptions = isCommonOptions ? commonOptions : (optionsMap[rawKeyText] || optionsMap[String(idx)] || []);

                return (
                    <div key={idx} className="flex flex-col sm:flex-row items-center w-full gap-6 pb-4 border-b border-gray-100 last:border-0">
                        {/* Cột Trái: Nội dung câu hỏi */}
                        <div className="flex-1 min-w-[250px]">
                            <p className="text-base font-medium leading-relaxed text-gray-800 m-0">
                                {rawKeyText}
                            </p>
                        </div>

                        {/* Cột Phải: Dropdown */}
                        <div className="w-full sm:w-[300px] flex-shrink-0 relative">
                            <Select
                                value={displayValue}
                                placeholder={<span className="text-gray-400 italic">No answer provided</span>}
                                className={`w-full custom-result-select`}
                                style={{ 
                                    // Logic màu viền:
                                    // - Đúng: Xanh
                                    // - Sai (Có chọn nhưng sai): Đỏ
                                    // - Không chọn: Viền vàng/cam hoặc đỏ nhạt (tùy chọn) để báo hiệu chưa hoàn thành
                                    border: isCorrect ? '1px solid #52c41a' : (hasAnswer ? '1px solid #ff4d4f' : '1px solid #ffa39e'),
                                    borderRadius: '8px',
                                    // Màu nền:
                                    // - Đúng: Xanh nhạt
                                    // - Sai: Đỏ nhạt
                                    // - Không chọn: Trắng (cho cảm giác "trống")
                                    backgroundColor: isCorrect ? '#f6ffed' : (hasAnswer ? '#fff1f0' : '#ffffff'),
                                }}
                                bordered={false}
                                dropdownStyle={{ minWidth: '300px' }}
                            >
                                {currentOptions.map((opt, optIdx) => {
                                    const isOptCorrect = normalize(opt) === normalize(correctItem?.value);
                                    const isOptSelected = normalize(opt) === normalize(userSelectedValue);

                                    return (
                                        <Select.Option key={optIdx} value={opt}>
                                            <div className="flex justify-between items-center w-full">
                                                <span className={`flex-1 ${
                                                    isOptCorrect ? 'text-green-600 font-semibold' : 
                                                    (isOptSelected ? 'text-red-500' : 'text-gray-700')
                                                }`}>
                                                    {opt}
                                                </span>
                                                
                                                {/* Icon hiển thị TRONG danh sách xổ xuống */}
                                                {/* Khi bấm vào mới thấy đáp án đúng có tick xanh */}
                                                {isOptCorrect && <CheckCircleFilled className="text-green-500 ml-2 text-lg" />}
                                                {isOptSelected && !isOptCorrect && <CloseCircleFilled className="text-red-500 ml-2 text-lg" />}
                                            </div>
                                        </Select.Option>
                                    );
                                })}
                            </Select>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// --- NEW COMPONENT: MULTIPLE CHOICE RESULT ---
const MultipleChoiceResult = ({ question }) => {
    let options = [];
    try {
        const rawContent = question.resources?.answerContent || question.AnswerContent;
        const answerContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        // Xử lý trường hợp answerContent là mảng hoặc object
        const contentObj = Array.isArray(answerContent) ? answerContent[0] : answerContent;
        if (contentObj?.options) {
            options = contentObj.options;
        }
    } catch (e) { console.error("Error parsing MC options", e); }

    // Chuẩn hóa dữ liệu để so sánh
    const normalize = (str) => String(str || '').trim().toLowerCase();
    const userAns = normalize(question.userResponse?.text);
    const correctAns = normalize(question.correctAnswer);

    if (!options.length) return <div className="text-gray-400 italic">No options available.</div>;

    return (
        <div className="flex flex-col gap-3 mt-4">
            {options.map((opt, i) => {
                const optKey = opt.key || String.fromCharCode(65 + i); // A, B, C...
                const optValue = opt.value || opt;
                
                // Chuẩn hóa key và value của option hiện tại
                const currentOptKey = normalize(optKey);
                const currentOptValue = normalize(optValue);

                // Kiểm tra trạng thái
                // 1. Là đáp án đúng
                const isCorrectOption = currentOptKey === correctAns || currentOptValue === correctAns;
                
                // 2. Là đáp án học sinh đã chọn
                const isUserSelected = currentOptKey === userAns || currentOptValue === userAns;

                // --- XÁC ĐỊNH MÀU SẮC GIAO DIỆN ---
                let containerClass = "border-gray-200 bg-white"; // Mặc định
                let keyBoxClass = "bg-[#003087] text-white"; // Mặc định (Màu xanh đậm của thương hiệu cho ô A,B,C)
                let icon = null;

                if (isCorrectOption) {
                    // Đáp án ĐÚNG: Nền xanh lá nhạt, Viền xanh lá
                    containerClass = "border-green-500 bg-[#F6FFED]";
                    keyBoxClass = "bg-[#52C41A] text-white"; // Ô Key xanh lá đậm
                    icon = <CheckCircleFilled className="text-[#52C41A] text-xl" />;
                } else if (isUserSelected) {
                    // Đáp án SAI (Học sinh chọn nhưng sai): Nền đỏ nhạt, Viền đỏ
                    containerClass = "border-red-500 bg-[#FFF1F0]";
                    keyBoxClass = "bg-[#FF4D4F] text-white"; // Ô Key đỏ đậm
                    icon = <CloseCircleFilled className="text-[#FF4D4F] text-xl" />;
                } else {
                    // Các đáp án còn lại (Không chọn, không phải đáp án đúng)
                    keyBoxClass = "bg-white text-gray-500 border-r border-gray-200"; // Ô Key màu trắng, chữ xám
                }

                return (
                    <div 
                        key={i} 
                        className={`group flex items-stretch rounded-lg border overflow-hidden transition-all ${containerClass}`}
                        style={{ minHeight: '56px' }}
                    >
                        {/* PHẦN 1: Ô KEY (A, B, C) - Giống trong hình */}
                        <div className={`flex w-[56px] min-w-[56px] items-center justify-center font-bold text-lg flex-shrink-0 ${keyBoxClass}`}>
                            {optKey}
                        </div>

                        {/* PHẦN 2: NỘI DUNG ĐÁP ÁN */}
                        <div className="flex-1 flex items-center px-4 py-3 text-gray-800 font-medium text-base">
                            {optValue}
                        </div>

                        {/* PHẦN 3: ICON ĐÚNG/SAI */}
                        {icon && (
                            <div className="flex items-center justify-center px-4">
                                {icon}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// --- COMPONENT: GROUP ANSWER RESULT (Cho Listening Group) ---
const GroupAnswerComparison = ({ question }) => {
    let subQuestions = [];
    try {
        const rawContent = question.resources?.answerContent || question.AnswerContent;
        const answerContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        
        if (answerContent?.groupContent?.listContent) {
            subQuestions = answerContent.groupContent.listContent;
        } else if (Array.isArray(answerContent)) {
             subQuestions = answerContent;
        }
    } catch (e) { console.error(e); }

    // Map câu trả lời của học sinh
    let userAnswersMap = {};
    try {
        if (question.userResponse?.text) {
            const raw = JSON.parse(question.userResponse.text);
            if (Array.isArray(raw)) {
                raw.forEach(item => {
                    // --- THAY ĐỔI QUAN TRỌNG: Thêm 'ID' và 'answer' vào danh sách key cần tìm ---
                    const k = item.key || item.questionId || item.id || item.ID; // Thêm item.ID
                    const v = item.value || item.answerText || item.text || item.answer; // Thêm item.answer
                    if (k) userAnswersMap[String(k)] = v;
                });
            } else if (typeof raw === 'object') {
                Object.keys(raw).forEach(k => userAnswersMap[String(k)] = raw[k]);
            }
        }
    } catch (e) { console.error(e); }

    if (!subQuestions.length) return <div className="text-center text-gray-400 p-4">No details available.</div>;

    return (
        <div className="flex flex-col gap-6 mt-6">
            {subQuestions.map((subQ, index) => {
                const subID = String(subQ.ID);
                const parentID = String(question.id);
                const compositeKey = `${parentID}-${subID}`;
                
                // Tìm câu trả lời theo ID hoặc Index
                const userVal = userAnswersMap[subID] || userAnswersMap[String(index + 1)] || userAnswersMap[compositeKey];
                const correctVal = subQ.correctAnswer;

                return (
                    <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex gap-3 mb-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E6F0FA] text-[#003087] font-bold flex items-center justify-center">
                                {index + 1}
                            </div>
                            <div className="text-lg font-medium text-gray-900 pt-1">
                                {subQ.content || `Question ${index + 1}`}
                            </div>
                        </div>

                        {subQ.options && (
                            <div className="flex flex-col gap-3 ml-11">
                                {subQ.options.map((optText, i) => {
                                    const optKey = String.fromCharCode(65 + i); // A, B, C...
                                    
                                    // Chuẩn hóa để so sánh
                                    const normalize = s => String(s || '').trim().toLowerCase();
                                    const isUserSelected = normalize(userVal) === normalize(optKey) || normalize(userVal) === normalize(optText);
                                    const isCorrectOption = normalize(correctVal) === normalize(optKey) || normalize(correctVal) === normalize(optText);

                                    // --- LOGIC MÀU SẮC & ICON ---
                                    let styleClass = "border-gray-200 bg-white hover:bg-gray-50";
                                    let keyBoxClass = "bg-white text-gray-500 border-r border-gray-200"; // Mặc định
                                    let icon = null;

                                    if (isCorrectOption) {
                                        styleClass = "border-green-500 bg-[#F6FFED]";
                                        keyBoxClass = "bg-[#52C41A] text-white";
                                        icon = <CheckCircleFilled className="text-[#52C41A] text-xl" />;
                                    } else if (isUserSelected) {
                                        styleClass = "border-red-500 bg-[#FFF1F0]";
                                        keyBoxClass = "bg-[#FF4D4F] text-white";
                                        icon = <CloseCircleFilled className="text-[#FF4D4F] text-xl" />;
                                    }

                                    return (
                                        <div 
                                            key={i} 
                                            className={`group flex items-stretch rounded-lg border overflow-hidden transition-all ${styleClass}`}
                                            style={{ minHeight: '48px' }}
                                        >
                                            {/* Ô Key (A, B, C) */}
                                            <div className={`flex w-[48px] min-w-[48px] items-center justify-center font-bold text-base flex-shrink-0 ${keyBoxClass}`}>
                                                {optKey}
                                            </div>

                                            {/* Nội dung đáp án */}
                                            <div className="flex-1 flex items-center px-4 py-2 text-gray-800 font-medium text-base">
                                                {optText}
                                            </div>

                                            {/* Icon Đúng/Sai */}
                                            {icon && (
                                                <div className="flex items-center justify-center px-4">
                                                    {icon}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const ReadingInlineResult = ({ question }) => {
  // 1. Parse User Response
  let userAnswersMap = {};
  try {
    const raw = question.userResponse?.text;
    if (raw) {
      let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          const k = String(item.key || item.questionId).trim(); 
          const v = item.value || item.answerText;
          userAnswersMap[k] = v;
        });
      } else if (typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => userAnswersMap[String(k).trim()] = v);
      }
    }
  } catch (e) { }

  // 2. Parse Content & Options
  let optionsMap = {};
  let correctAnswersMap = {};
  
  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent;
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    
    if (contentObj) {
      if (contentObj.options && Array.isArray(contentObj.options)) {
        contentObj.options.forEach(opt => {
          optionsMap[String(opt.key).trim()] = opt.value;
        });
      }
      
      if (contentObj.correctAnswer) {
        if (Array.isArray(contentObj.correctAnswer)) {
           contentObj.correctAnswer.forEach(ans => correctAnswersMap[String(ans.key).trim()] = ans.value);
        } else {
           Object.entries(contentObj.correctAnswer).forEach(([k, v]) => correctAnswersMap[String(k).trim()] = v);
        }
      }
    }
  } catch (e) { console.error("Error parsing content:", e); }

  // 3. Xử lý nội dung câu hỏi
  const rawText = question.questionContent || question.Content || "";
  const cleanedQuestion = rawText.replace(/\s*\([^)]*\)/g, '');

  const renderGap = (gapKey) => {
    const key = gapKey.replace('.', '').trim(); // "1." -> "1"
    
    const userVal = userAnswersMap[key];
    const correctVal = correctAnswersMap[key];
    const currentOptions = optionsMap[key] || [];
    const isExample = key === '0';
    let hasAnswer, isCorrect, displayValue;

    if (isExample) {
        // Nếu là câu ví dụ 0.: Luôn coi là đúng và hiển thị đáp án mẫu
        hasAnswer = true;
        isCorrect = true;
        // Ưu tiên lấy đáp án đúng, nếu không có thì lấy option đầu tiên làm mẫu
        displayValue = correctVal || (currentOptions.length > 0 ? currentOptions[0] : "Example");
    } else {
        // Logic chấm điểm bình thường cho các câu 1, 2, 3...
        hasAnswer = userVal !== undefined && userVal !== null && userVal !== '';
        isCorrect = hasAnswer && String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
        displayValue = hasAnswer ? userVal : null;
    }

    
    // --- Logic xác định Class style ---
    let statusClass = 'select-missed'; // Mặc định là chưa làm (màu trắng/xám)
    if (isCorrect) {
        statusClass = 'select-correct'; // Đúng (Xanh)
    } else if (hasAnswer) {
        statusClass = 'select-wrong';   // Sai (Đỏ)
    }

    return (
      <span key={gapKey} className="inline-block mx-1 align-middle relative">
         <Select
            value={displayValue}
            placeholder={<span className="text-gray-400 italic">No answer provided</span>}
            className={`custom-result-select ${statusClass}`}
            style={{ 
                width: 'auto',
                minWidth: '120px',
                margin: '0 4px',
            }}
            dropdownStyle={{ minWidth: '200px' }}
            bordered={false}
         >
            {currentOptions.map((opt, idx) => {
                const isOptCorrect = String(opt).trim().toLowerCase() === String(correctVal).trim().toLowerCase();
                const isOptSelected = String(opt).trim().toLowerCase() === String(userVal).trim().toLowerCase();
                
                return (
                    <Select.Option key={idx} value={opt}>
                        <div className="flex justify-between items-center gap-2">
                            <span className={`flex-1 ${
                                isOptCorrect ? 'text-green-600 font-bold' : 
                                (isOptSelected ? 'text-red-500' : 'text-gray-700')
                            }`}>
                                {opt}
                            </span>
                            {isOptCorrect && <CheckCircleFilled className="text-green-500" />}
                            {isOptSelected && !isOptCorrect && <CloseCircleFilled className="text-red-500" />}
                        </div>
                    </Select.Option>
                )
            })}
         </Select>
      </span>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-4">
        {/* Style CSS tĩnh để tránh lỗi render loop */}
        <style>{`
            .custom-result-select .ant-select-selector {
                border-radius: 6px !important;
            }
            .select-correct .ant-select-selector {
                background-color: #f6ffed !important;
                border: 1px solid #52c41a !important;
            }
            .select-wrong .ant-select-selector {
                background-color: #fff1f0 !important;
                border: 1px solid #ff4d4f !important;
            }
            .select-missed .ant-select-selector {
                background-color: #ffffff !important;
                border: 1px solid #d9d9d9 !important;
            }
        `}</style>

        <div className="text-base text-gray-800 leading-loose whitespace-pre-wrap">
            {cleanedQuestion.split(/(\d+\.)/).map((part, index) => {
                if (part.match(/^\d+\.$/)) {
                    return renderGap(part);
                }
                return <span key={index}>{part}</span>;
            })}
        </div>
    </div>
  );
};

// --- COMPONENT: ORDERING RESULT (Cập nhật hiển thị Example) ---
const OrderingResult = ({ question }) => {
    let userList = [];
    let correctMap = {}; 

    // 1. Parse User Answer
    try {
        const raw = question.userResponse?.text;
        if (raw) {
            userList = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(userList)) {
                userList.sort((a, b) => a.value - b.value);
            }
        }
    } catch (e) { console.error("Error parsing ordering user answer", e); }

    // 2. Parse Correct Answer
    try {
        const rawContent = question.resources?.answerContent || question.AnswerContent;
        const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        
        if (contentObj?.correctAnswer && Array.isArray(contentObj.correctAnswer)) {
            contentObj.correctAnswer.forEach(item => {
                correctMap[item.value] = String(item.key).trim(); 
            });
        }
    } catch (e) { console.error("Error parsing ordering correct answer", e); }

    if (!userList || userList.length === 0) {
        return <div className="text-gray-400 italic">No answer provided.</div>;
    }

    // Kiểm tra đúng hết chưa
    const isFullyCorrect = userList.every(item => {
        const content = String(item.key).trim();
        return correctMap[item.value] === content;
    });

    // Lấy nội dung Example (câu đầu tiên làm mẫu)
    const exampleText = question.subContent;

    return (
        <div className="flex flex-col gap-6 mt-6 max-w-5xl">
            {/* --- PHẦN 1: BÀI LÀM CỦA HỌC SINH --- */}
            <div className="space-y-4">
                <div className="text-gray-600 font-semibold mb-2">Your Arrangement:</div>
                {userList.map((item, idx) => {
                    const order = item.value;
                    const content = String(item.key).trim();
                    const correctContentForThisSlot = correctMap[order];
                    const isCorrectPosition = correctContentForThisSlot === content;

                    return (
                        <div 
                            key={idx} 
                            className={`flex items-center rounded-xl border-2 p-4 transition-all duration-200 ${
                                isCorrectPosition 
                                    ? 'border-[#52c41a] bg-[#f6ffed]' 
                                    : 'border-[#ff4d4f] bg-[#fff1f0]'
                            }`}
                        >
                            <div className="mr-4 flex h-10 w-10 flex-shrink-0 select-none items-center justify-center rounded-lg bg-[#003087] text-lg font-bold text-white shadow-sm">
                                {order}
                            </div>
                            <div className="flex-1 text-base font-medium text-gray-800 leading-relaxed">
                                {content}
                            </div>
                            <div className="ml-4 text-2xl">
                                {isCorrectPosition 
                                    ? <CheckCircleFilled className="text-[#52c41a]" /> 
                                    : <CloseCircleFilled className="text-[#ff4d4f]" />
                                }
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* --- PHẦN 2: ĐÁP ÁN ĐÚNG --- */}
            {!isFullyCorrect && (
                <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-[#52c41a] font-bold text-lg mb-4 border-b border-gray-100 pb-2">
                        <CheckCircleFilled /> Correct Order
                    </div>
                    <div className="space-y-3">
                        {Object.entries(correctMap)
                            .sort((a, b) => Number(a[0]) - Number(b[0]))
                            .map(([order, content]) => (
                                <div key={order} className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <div className="mr-4 flex h-8 w-8 flex-shrink-0 select-none items-center justify-center rounded-md bg-gray-200 text-base font-bold text-gray-600">
                                        {order}
                                    </div>
                                    <div className="flex-1 text-base text-gray-700">
                                        {content}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}; 

// --- COMPONENT: ANSWER COMPARISON CHUNG ---
const AnswerComparison = ({ question }) => {
    // Lấy type từ API, đảm bảo chữ thường
    const qType = (question.type || question.Type || '').toLowerCase();
    const rawContent = question.resources?.answerContent || question.AnswerContent;
    
    // 1. Group Question (Listening)
    const isGroupQuestion = 
        qType === 'listening-questions-group' || 
        (rawContent && String(rawContent).includes('listContent'));

    if (isGroupQuestion) return <GroupAnswerComparison question={question} />;

    // 2. Multiple Choice
    if (qType === 'multiple-choice') return <MultipleChoiceResult question={question} />;

    // --- [SỬA LẠI PHẦN NÀY] ---
    // Kiểm tra nếu là dạng dropdown-list (theo Backend) VÀ nội dung có chứa pattern số (1., 2.) giống reading-test.jsx
    const isInlineGapFill = 
       (qType === 'dropdown-list' || qType === 'fill-in-the-blanks') && 
        /\d+\./.test(question.questionContent || question.Content);

    // SỬA LỖI: Dùng đúng tên biến isInlineGapFill
    if (isInlineGapFill) {
        return <ReadingInlineResult question={question} />;
    }
    // -------------------------------------------------------
    if (qType === 'ordering') {
        return <OrderingResult question={question} />;
    }

    if (qType === 'dropdown-list' || qType === 'matching') {
        return <DropdownListResult question={question} />; // Component cũ dạng bảng
    }

    // 4. Fallback (Các dạng khác)
    const { userResponse, correctAnswer, isCorrect } = question;
    return (
      <Row gutter={16} className="mt-4">
        {/* ... (Giữ nguyên phần hiển thị mặc định) ... */}
        <Col span={12} xs={24} md={12}>
            <div className={`h-full rounded-lg border p-4 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? <CheckCircleFilled className="text-green-500" /> : <CloseCircleFilled className="text-red-500" />}
                    <Text strong>Your Answer</Text>
                </div>
                <div className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {!isCorrect && <div className="text-xs uppercase font-bold mb-1">Incorrect</div>}
                    {formatAnswerText(userResponse?.text)}
                </div>
            </div>
        </Col>
        <Col span={12} xs={24} md={12}>
            <div className="h-full rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-2"><CheckCircleFilled className="text-green-500" /><Text strong>Correct Answer</Text></div>
                <div className="text-sm font-semibold text-green-700">{formatAnswerText(correctAnswer)}</div>
            </div>
        </Col>
      </Row>
    )
}

const SubjectiveAnswerView = ({ question }) => {
    const { userResponse } = question
    return (
      <div className="mt-4 flex flex-col gap-4">
        <div className="bg-[#F8F9FA] border border-gray-200 rounded-lg p-5">
            <Title level={5} className="text-[#003087] mb-3">Your Answer</Title>
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{userResponse?.text || <span className="text-gray-400 italic">No response recorded.</span>}</div>
        </div>
        {userResponse?.comment && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><EditOutlined className="text-[#003087]" /><Text strong className="text-lg">Teacher's Comment</Text></div>
                <Paragraph className="text-gray-600 mb-0">{userResponse.comment}</Paragraph>
            </div>
        )}
      </div>
    )
}

const checkIsFullyCorrect = (q) => {
    // 1. Nếu hệ thống đã đánh dấu sai -> Chắc chắn sai
    if (!q.isCorrect) return false;

    // 2. Kiểm tra kỹ hơn với các dạng bài phức tạp (Group, Dropdown)
    try {
        const rawUser = q.userResponse?.text;
        const rawContent = q.resources?.answerContent || q.AnswerContent;
        
        if (!rawUser || !rawContent) return q.isCorrect;

        let userAnswers = [];
        try { userAnswers = JSON.parse(rawUser); } catch { return q.isCorrect; }
        
        const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        const normalize = s => String(s || '').trim().toLowerCase();

        // A. Dạng Listening Group (Nhiều câu hỏi con)
        if (contentObj?.groupContent?.listContent) {
            const subQuestions = contentObj.groupContent.listContent;
            
            // Map câu trả lời của user để dễ tra cứu
            const userMap = {};
            if (Array.isArray(userAnswers)) {
                userAnswers.forEach(u => {
                    // Support nhiều định dạng key
                    const key = String(u.questionId || u.id || u.key);
                    userMap[key] = u.answer || u.value || u.text;
                });
            } else {
                // Dạng object { "1": "A", "2": "B" }
                Object.entries(userAnswers).forEach(([k, v]) => userMap[String(k)] = v);
            }

            // Duyệt qua tất cả câu hỏi con, nếu sai 1 câu -> Cả nhóm coi như sai (Red)
            for (const sub of subQuestions) {
                const subID = String(sub.ID || sub.id);
                // Một số trường hợp ID câu hỏi con trong userAnswers có thể là index (1, 2...) hoặc ID thật
                // Thử tìm theo ID thật trước, nếu không có thì tìm theo index
                let userVal = userMap[subID]; 
                
                // Nếu không tìm thấy theo ID, thử tìm trong mảng userAnswers theo thứ tự (nếu có)
                if (!userVal && Array.isArray(userAnswers)) {
                     // Logic fallback nếu cần
                }

                const correctVal = String(sub.correctAnswer || '').trim();
                
                // Nếu user không trả lời hoặc trả lời khác đáp án đúng
                if (normalize(userVal) !== normalize(correctVal)) {
                    return false; 
                }
            }
            return true;
        }

        // B. Dạng Dropdown / Matching (Nhiều ý nhỏ)
        if (contentObj.correctAnswer) {
            let correctList = Array.isArray(contentObj.correctAnswer) 
                ? contentObj.correctAnswer 
                : Object.entries(contentObj.correctAnswer).map(([k,v]) => ({key: k, value: v}));

            // Lấy danh sách câu hỏi gốc (Left Items) để đối chiếu Key
            let leftItems = contentObj.leftItems || (contentObj.options && contentObj.options.map(o => o.key)) || [];

            // Convert userAnswers sang dạng mảng chuẩn
            let userList = Array.isArray(userAnswers) 
                ? userAnswers 
                : Object.entries(userAnswers).map(([k,v]) => ({key: k, value: v}));

            for (const correctItem of correctList) {
                const correctKey = normalize(correctItem.key);
                const correctVal = normalize(correctItem.value);

                // Tìm câu trả lời của user
                let userItem = userList.find(u => normalize(u.key) === correctKey || normalize(u.left) === correctKey);

                // Nếu không tìm thấy theo Text, thử tìm theo Index (trường hợp key lưu là "0", "1"...)
                if (!userItem && leftItems.length > 0 && !Number.isNaN(Number(correctKey))) {
                    const index = parseInt(correctKey, 10);
                    if (leftItems[index]) {
                        const textKey = normalize(leftItems[index]);
                        userItem = userList.find(u => normalize(u.key) === textKey || normalize(u.left) === textKey);
                    }
                }

                // Nếu không trả lời hoặc trả lời sai
                if (!userItem || normalize(userItem.value || userItem.right) !== correctVal) {
                    return false;
                }
            }
            return true;
        }

    } catch (e) {
        console.error("Check correctness error:", e);
    }

    return q.isCorrect;
};

// --- MAIN PAGE ---
const ResultPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('speaking')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [filterPart, setFilterPart] = useState('All Parts')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetchExamReview(id)
        if (response && response.data) {
          setData(response.data)
          const skills = response.data.skills || {}
          const firstSkill = Object.keys(skills).find(k => skills[k]?.questions?.length > 0)
          if (firstSkill) setActiveTab(firstSkill)
        }
      } catch (error) {
        console.error("Load result error:", error)
        message.error('Unable to download test results.')
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  useEffect(() => {
    if (data && data.skills && data.skills[activeTab]?.questions?.length > 0) {
      setSelectedQuestionId(data.skills[activeTab].questions[0].id)
    } else {
      setSelectedQuestionId(null)
    }
  }, [activeTab, data])

  const currentSkillData = data?.skills[activeTab]
  const currentQuestion = currentSkillData?.questions.find(q => q.id === selectedQuestionId)

  const speakingGroups = useMemo(() => {
    if (activeTab !== 'speaking' || !currentSkillData?.questions) return {}
    const allQuestions = currentSkillData.questions;
    const groups = {};
    const chunkSize = 3; 
    for (let i = 0; i < allQuestions.length; i += chunkSize) {
        const chunk = allQuestions.slice(i, i + chunkSize);
        const partIndex = Math.floor(i / chunkSize) + 1;
        const partName = `Part ${partIndex}`; 
        if (filterPart !== 'All Parts' && partName !== filterPart) continue;
        groups[partName] = chunk;
    }
    return groups;
  }, [activeTab, currentSkillData, filterPart])

  const partOptions = useMemo(() => {
      if (!currentSkillData?.questions || activeTab !== 'speaking') return []
      const totalQuestions = currentSkillData.questions.length;
      const chunkSize = 3;
      const numberOfParts = Math.ceil(totalQuestions / chunkSize);
      const parts = [];
      for(let i=1; i<=numberOfParts; i++) { parts.push(`Part ${i}`); }
      return ['All Parts', ...parts];
  }, [currentSkillData, activeTab])

  if (loading) return <Spin size="large" className="flex h-screen items-center justify-center" />
  if (!data) return <Empty description="No data found" className="mt-20" />

  const tabIcons = {
    speaking: <SoundOutlined />,
    listening: <CustomerServiceOutlined />,
    reading: <ReadOutlined />,
    writing: <EditOutlined />,
    grammar: <AppstoreOutlined />
  }

  const isSpeakingTab = activeTab === 'speaking'
  const leftColSpan = isSpeakingTab ? 0 : 6
  const rightColSpan = isSpeakingTab ? 24 : 18

  const QuestionHeaderDisplay = ({ question }) => {
      const rawContent = question.resources?.answerContent || question.AnswerContent;
      const answerContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
      const isGroupQuestion = (question.type === 'listening-questions-group' || question.Type === 'listening-questions-group') || (answerContent?.groupContent?.listContent);
      const isInlineGapFill = 
        (question.type === 'dropdown-list' || question.Type === 'dropdown-list') && 
        /\d+\./.test(question.questionContent || question.Content);

      const formatPartContent = (content) => {
          if (!content) return null;
          // Nếu có chữ "Part X:", cắt bỏ đi để lấy nội dung hướng dẫn
          if (content.startsWith('Part')) {
              return content.includes(':') 
                  ? content.split(':')[1].trim() 
                  : content.split('-').slice(1).join(' ').trim();
          }
          return content;
      };

      const instructionText = formatPartContent(question.partContent);

      return (
        <div className="bg-[#F5F8FF] rounded-lg p-5 mb-4">
            {question.resources?.audio && renderAudioPlayer(question.resources.audio)}
            {instructionText && (
                <div className="text-gray-900 text-lg font-bold mb-3">
                    {instructionText.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            )}
            {question.partSubContent && (<div className="text-gray-500 text-sm mb-2 uppercase tracking-wide font-bold">{question.partSubContent}</div>)}
            
            {/* Nếu là dạng điền từ Inline thì KHÔNG hiện text gốc ở đây nữa (vì component kết quả đã render rồi) */}
            {!isInlineGapFill && (
                <span className="font-bold text-gray-900">Example: <div className="text-gray-800 text-lg leading-relaxed font-medium mb-2">
                    {question.questionContent || question.Content || question.content}
                </div>
                </span>
            )}

            {isGroupQuestion && <GroupAnswerComparison question={question} />}
            
            {/* Gọi ReadingGapFillResult ở đây HOẶC ở dưới AnswerComparison tuỳ bố cục bạn muốn. 
                Thường thì để dưới AnswerComparison như logic cũ là ổn, ở đây chỉ cần ẩn text đi thôi. */}
            
            {question.resources?.images?.length > 0 && (<div className="mt-4"><img src={question.resources.images[0]} alt="Question" className="max-h-[300px] rounded-lg border border-gray-200 shadow-sm" /></div>)}
        </div>
      )
  }

  const qType = currentQuestion?.type || currentQuestion?.Type || '';
  const rawContent = currentQuestion?.resources?.answerContent || currentQuestion?.AnswerContent;
  const isGroupQuestion = qType === 'listening-questions-group' || (rawContent && String(rawContent).includes('listContent'));

  return (
    <Layout className="min-h-screen bg-white">
      <SharedHeader />
      <Content className="mx-auto w-full max-w-7xl p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)} className="border-none shadow-none px-0">Back in history</Button>
          <div className="flex items-center gap-3">
             <Tag color="blue" className="px-3 py-1 text-sm">Level: {data.participantInfo.finalLevel || 'N/A'}</Tag>
             <Tag color="green" className="px-3 py-1 text-sm">Total score: {data.participantInfo.totalScore || 0}</Tag>
          </div>
        </div>
        
        <div className="flex justify-between items-start mb-6">
            <div>
                <Title level={2} className="!mb-1 !text-[#111827]">Full English Proficiency Exam - Answer Review</Title>
                <Text type="secondary">Review your answers and learn from detailed explanations</Text>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="text-gray-500 text-sm">Completed on {new Date(data.participantInfo.date).toLocaleDateString()}</div>
                <Button type="primary" icon={<DownloadOutlined />} className="bg-[#003087]">Download Report (PDF)</Button>
            </div>
        </div>

        <div className="mb-6 border-b border-gray-200">
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={Object.keys(data.skills).map(key => ({
                    key,
                    label: (<div className="flex items-center gap-2 px-2 py-1">{tabIcons[key]}<span className="capitalize">{key === 'grammar' ? 'Grammar & Vocabulary' : key}</span></div>)
                }))}
                className="custom-tabs"
            />
        </div>

        <div className="bg-[#003087] rounded-xl p-6 text-white mb-8 shadow-lg flex flex-col md:flex-row justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold mb-1 capitalize">{activeTab === 'grammar' ? 'Grammar & Vocabulary' : activeTab} Performance</h2>
                <p className="text-blue-100 opacity-90">Great job! You demonstrated strong communication skills.</p>
            </div>
            <div className="flex gap-8 mt-4 md:mt-0">
                <div className="text-center">
                    <div className="text-4xl font-bold">{currentSkillData?.score || 0}<span className="text-2xl text-blue-300 font-normal">/20</span></div>
                    <div className="text-xs uppercase tracking-wider opacity-80">Score</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-bold">{['writing', 'speaking'].includes(activeTab) ? '--' : `${currentSkillData?.questions.filter(q => q.isCorrect).length}/${currentSkillData?.questions.length}`}</div>
                    <div className="text-xs uppercase tracking-wider opacity-80">Correct</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-bold">{data.participantInfo.timeSpent || '28m'}</div>
                    <div className="text-xs uppercase tracking-wider opacity-80">Time Spent</div>
                </div>
            </div>
        </div>

        <Row gutter={24}>
            {(!isSpeakingTab || (isSpeakingTab && partOptions.length > 0)) && (
                <Col xs={24} lg={isSpeakingTab ? 24 : 6} className="mb-6">
                    {isSpeakingTab ? (
                        <div className="flex justify-end mb-4">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">Filter by Part:</span>
                                <Select value={filterPart} onChange={setFilterPart} className="w-[200px]" size="large">
                                    {partOptions.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <Card className="shadow-sm border border-gray-200 rounded-lg">
                            <Title level={5} className="mb-4">Filters</Title>
                            <div className="mb-6">
                                <Text className="block mb-2 text-gray-600 text-sm">Filter by Part</Text>
                                <Select defaultValue="All Parts" className="w-full" size="large"><Select.Option value="All Parts">All Parts</Select.Option></Select>
                            </div>
                            <Title level={5} className="mb-3 text-sm text-gray-600">Question Navigator</Title>
                            <div className="grid grid-cols-5 gap-2">
                                {currentSkillData?.questions.map((q, index) => {
                                    const isSelected = q.id === selectedQuestionId
                                    const isTrulyCorrect = checkIsFullyCorrect(q);
                                    let bgColor = isSelected 
                                        ? '!bg-[#003087] !text-white' 
                                        : (isTrulyCorrect ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600');
                                    
                                    if (['writing'].includes(activeTab) && !isSelected) bgColor = q.userResponse ? 'bg-blue-50 text-blue-600' : 'bg-gray-100'
                                    
                                    return (<div key={q.id} onClick={() => setSelectedQuestionId(q.id)} className={`h-10 flex items-center justify-center rounded font-semibold cursor-pointer transition-all ${bgColor} hover:opacity-80`}>{index + 1}</div>)
                                })}
                            </div>
                        </Card>
                    )}
                </Col>
            )}

            <Col xs={24} lg={rightColSpan}>
                {isSpeakingTab ? (
                    <div className="flex flex-col gap-6">
                        {Object.keys(speakingGroups).length > 0 ? (
                            Object.entries(speakingGroups).map(([partName, questions]) => (
                                <SpeakingPartView key={partName} partName={partName} questions={questions} />
                            ))
                        ) : (
                            <Empty description="No speaking questions found" />
                        )}
                    </div>
                ) : (
                    currentQuestion ? (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                            <div className="mb-4">
                                <Title level={4} className="!mb-4">{`Question ${currentSkillData.questions.indexOf(currentQuestion) + 1}:`}</Title>
                                <QuestionHeaderDisplay question={currentQuestion} />
                            </div>
                            
                            {activeTab === 'writing' ? <SubjectiveAnswerView question={currentQuestion} /> : (
                                !isGroupQuestion && <AnswerComparison question={currentQuestion} />
                            )}

                            {activeTab !== 'writing' && !isGroupQuestion && (
                                <div className="mt-6 bg-[#F0F9FF] border border-blue-100 rounded-lg p-5">
                                    <div className="flex items-center gap-2 mb-2 text-[#003087]"><div className="bg-blue-100 p-1 rounded text-blue-600"><BulbFilled /></div><span className="font-bold text-lg">Explanation</span></div>
                                    <div className="text-gray-700 leading-relaxed">The correct answer is derived from the key information provided in the question text.</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <WarningOutlined className="text-4xl mb-2" />
                            <span>Select a question to view details</span>
                        </div>
                    )
                )}
            </Col>
        </Row>
      </Content>
    </Layout>
  )
}

export default ResultPage