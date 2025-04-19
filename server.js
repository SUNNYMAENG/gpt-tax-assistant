const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 📦 post 요청 데이터 파싱
app.use(bodyParser.urlencoded({ extended: true }));

// 🌐 정적 파일 서빙 (index.html 포함)
app.use(express.static(path.join(__dirname, 'public')));

// 🤖 질문 처리 라우터
app.post('/chat', (req, res) => {
  const userMessage = req.body.userMessage;
  console.log("📨 사용자 질문:", userMessage);

  // 간단한 응답 예시
  const reply = `💬 GPT 세무비서 응답 예시: "${userMessage}"에 대한 답변은 준비 중입니다.`;

  res.send(`
    <html>
      <head><meta charset="UTF-8"><title>답변</title></head>
      <body>
        <p>${reply}</p>
        <a href="/">← 돌아가기</a>
      </body>
    </html>
  `);
});

// 🚀 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// POST /chat 처리
app.post('/chat', (req, res) => {
  const userMessage = req.body.userMessage;
  console.log('사용자 질문:', userMessage);

  // 여기서는 일단 고정된 답변 예시
  const answer = `"${userMessage}"에 대한 GPT 세무 비서의 답변입니다. (예시 답변)`;

  res.send(`
    <h1>GPT 세무 비서 응답</h1>
    <p><strong>질문:</strong> ${userMessage}</p>
    <p><strong>답변:</strong> ${answer}</p>
    <a href="/">돌아가기</a>
  `);
});
