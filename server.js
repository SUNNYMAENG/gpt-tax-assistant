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

// 🤖 GPT 응답 라우팅 (다국어 대응)
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
      <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <title>GPT Tax Assistant</title>
        </head>
        <body>
          <h1 id="title">GPT 세무 비서 응답</h1>
          <p><strong id="q">질문:</strong> ${userMessage}</p>
          <p><strong id="a">답변:</strong> ${gptReply}</p>
          <a id="back" href="/">← 돌아가기</a>

          <script>
            const lang = navigator.language || navigator.userLanguage;
            const i18n = {
  ko: {
    title: "GPT 세무 비서 응답",
    back: "← 돌아가기",
    q: "질문:",
    a: "답변:"
  },
  ja: {
    title: "GPT税務アシスタントの応答",
    back: "← 戻る",
    q: "質問：",
    a: "回答："
  },
  zh: {
    title: "GPT 税务助理的回答",
    back: "← 返回",
    q: "问题：",
    a: "回答："
  },
  en: {
    title: "GPT Tax Assistant Response",
    back: "← Back",
    q: "Question:",
    a: "Answer:"
  }
};

            const currentLang = lang.startsWith("ja") ? "ja" :
                    lang.startsWith("ko") ? "ko" :
                    lang.startsWith("zh") ? "zh" : "en";
            const t = i18n[currentLang];
            document.getElementById("title").textContent = t.title;
            document.getElementById("q").textContent = t.q;
            document.getElementById("a").textContent = t.a;
            document.getElementById("back").textContent = t.back;
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ GPT 응답 오류:", error.message);
    res.send("⚠️ GPT 응답에 실패했습니다. 다시 시도해주세요.");
  }
});
// 🪄 보너스: GET 요청이 들어오면 홈으로 리디렉션
app.get('/chat', (req, res) => {
  res.redirect('/');
});
// 🚀 서버 시작
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

