const axios = require('axios');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 📦 post 요청 데이터 파싱
app.use(bodyParser.urlencoded({ extended: true }));

// 🌐 정적 파일 서빙 (index.html 포함)
app.use(express.static(path.join(__dirname, 'public')));

app.post('/chat', async (req, res) => {
  const userMessage = req.body.userMessage;
  console.log("📨 사용자 질문:", userMessage);

  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userMessage }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    const gptReply = response.data.choices[0].message.content;

    res.send(`
      <html>
        <head><meta charset="UTF-8"><title>답변</title></head>
        <body>
          <h1>GPT 세무 비서 응답</h1>
          <p><strong>질문:</strong> ${userMessage}</p>
          <p><strong>답변:</strong> ${gptReply}</p>
          <a href="/">← 돌아가기</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ GPT 응답 오류:", error.message);
    res.send("⚠️ GPT 응답에 실패했습니다. 다시 시도해주세요.");
  }
});


// 🚀 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
