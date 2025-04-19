const axios = require('axios');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { supabase } = require('./utils/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// 📦 post 요청 데이터 파싱
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
await supabase
  .from('user_queries')  
  .insert([{ message: userMessage, reply: gptReply }]);

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

const PDFDocument = require('pdfkit');

// 📄 PDF 생성 라우트
app.get('/generate-pdf', (req, res) => {
  const doc = new PDFDocument();
  const filename = 'tax-summary.pdf';
  
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/pdf');

  doc.pipe(res);

  // PDF 내용 예시
  doc.fontSize(20).text('GPT 세무 비서 요약 리포트', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`날짜: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.text('이 문서는 테스트용으로 생성된 세무 요약 리포트입니다.');
  doc.text('향후 실제 세무 계산 결과를 기반으로 자동 생성될 예정입니다.');

  doc.end();
});

// 🚀 서버 시작
// 📝 Q&A 로그 페이지
app.get('/log', async (req, res) => {
  const { data, error } = await supabase
    .from('user_queries')  // 👈 테이블 이름
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    return res.send("⚠️ Q&A 기록을 불러오는 데 실패했습니다.");
  }

  const rows = data.map(row => `
    <tr>
      <td>${new Date(row.created_at).toLocaleString()}</td>
      <td>${row.message}</td>
      <td>${row.reply}</td>
    </tr>
  `).join('');

  res.send(`
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>Q&A 로그</title>
      </head>
      <body>
        <h1>💬 GPT 질문 & 답변 로그</h1>
        <table border="1" cellpadding="8">
          <thead>
            <tr><th>날짜</th><th>질문</th><th>답변</th></tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <br />
        <a href="/">← 메인으로</a>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

