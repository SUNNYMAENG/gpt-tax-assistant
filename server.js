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

  // 예시 응답
  const answer = `"${userMessage}"에 대한 GPT 세무 비서의 답변입니다. (예시 답변)`;

  res.send(`
    <html>
      <head><meta charset="UTF-8"><title>답변</title></head>
      <body>
        <h1>GPT 세무 비서 응답</h1>
        <p><strong>질문:</strong> ${userMessage}</p>
        <p><strong>답변:</strong> ${answer}</p>
        <a href="/">← 돌아가기</a>
      </body>
    </html>
  `);
});

// 🚀 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
