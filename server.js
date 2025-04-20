const axios = require('axios');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { supabase } = require('./utils/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/chat', async (req, res) => {
  const userMessage = req.body.userMessage;
  console.log("\uD83D\uDCEC 사용자 질문:", userMessage);

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
    await supabase
      .from('user_queries')
      .insert([{ message: userMessage, reply: gptReply }]);

    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>GPT Tax Assistant</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 text-gray-900 font-sans p-6">
          <div class="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">
            <h1 id="title" class="text-2xl font-bold mb-4 text-center">GPT 세무 비서 응답</h1>
            <form method="POST" action="/chat" class="mb-6">
              <label for="userMessage" id="q" class="block text-sm font-semibold text-gray-700 mb-2">질문:</label>
              <input type="text" id="userMessage" name="userMessage" placeholder="세금 관련 질문을 입력하세요" required class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300" />
              <button type="submit" id="button" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">질문 보내기</button>
            </form>
            <div class="mb-6">
              <p class="text-sm font-semibold text-gray-700">이전 질문:</p>
              <p class="mt-1 p-3 bg-gray-100 rounded-md whitespace-pre-wrap">${userMessage}</p>
            </div>
            <div class="mb-6">
              <p class="text-sm font-semibold text-gray-700" id="a">답변:</p>
              <p class="mt-1 p-3 bg-green-50 rounded-md whitespace-pre-wrap">${gptReply}</p>
            </div>
            <div class="text-center">
              <a id="back" href="/" class="text-blue-600 hover:underline">← 돌아가기</a>
            </div>
          </div>
          <script>
            const lang = navigator.language || navigator.userLanguage;
            const i18n = {
              ko: { title: "GPT 세무 비서 응답", back: "← 돌아가기", q: "질문:", a: "답변:", button: "질문 보내기" },
              ja: { title: "GPT税務アシスタントの応答", back: "← 戻る", q: "質問：", a: "回答：", button: "送信" },
              zh: { title: "GPT 税务助理的回答", back: "← 返回", q: "问题：", a: "回答：", button: "发送" },
              en: { title: "GPT Tax Assistant Response", back: "← Back", q: "Question:", a: "Answer:", button: "Send" },
            };
            const currentLang = lang.startsWith("ja") ? "ja" : lang.startsWith("ko") ? "ko" : lang.startsWith("zh") ? "zh" : "en";
            const t = i18n[currentLang];
            document.getElementById("title").textContent = t.title;
            document.getElementById("q").textContent = t.q;
            document.getElementById("a").textContent = t.a;
            document.getElementById("back").textContent = t.back;
            document.getElementById("button").textContent = t.button;
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ GPT 응답 오류:", error.message);
    res.send("⚠️ GPT 응답에 실패했습니다. 다시 시도해주세요.");
  }
});

app.get('/chat', (req, res) => {
  res.redirect('/');
});

const PDFDocument = require('pdfkit');

app.get('/generate-pdf', (req, res) => {
  const doc = new PDFDocument();
  const filename = 'tax-summary.pdf';

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/pdf');

  doc.pipe(res);
  doc.fontSize(20).text('GPT 세무 비서 요약 리포트', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`날짜: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.text('이 문서는 테스트용으로 생성된 세무 요약 리포트입니다.');
  doc.text('향후 실제 세무 계산 결과를 기반으로 자동 생성될 예정입니다.');

  doc.end();
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
