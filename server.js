const axios = require('axios');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { supabase } = require('./utils/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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
        messages: [
          { role: "system", content: "당신은 일본 실무형 세무비서 챗봇입니다. 사용자의 고용형태, 거주지, 건강보험 여부, 부양가족 유무를 파악한 뒤, 조건에 맞는 정보를 안내하고 자동 계산 또는 서식 생성을 연결합니다." },
          { role: "user", content: userMessage }
        ]
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
          <title>GPT 세무 비서 응답</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 text-gray-900 font-sans p-6">
          <div class="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">
            <h1 class="text-2xl font-bold mb-4 text-center">GPT 세무 비서 응답</h1>
            <div class="mb-6">
              <p class="text-sm font-semibold text-gray-700">최근 질문</p>
              <p class="mt-1 p-3 bg-gray-100 rounded-md whitespace-pre-wrap">${userMessage}</p>
            </div>
            <div class="mb-6">
              <p class="text-sm font-semibold text-gray-700">GPT의 응답</p>
              <p class="mt-1 p-3 bg-green-50 rounded-md whitespace-pre-wrap">${gptReply}</p>
            </div>
            <div class="text-center space-x-4 mt-6">
              <a href="/" class="inline-block px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">← 메인으로 돌아가기</a>
            </div>
          </div>
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

// ✅ 급여 계산 API 추가
app.post('/generate', (req, res) => {
  const { type, amount, hasHealth, hasPension, hasEmpIns, dependents } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const gross = Number(amount);
  const health = hasHealth ? gross * 0.03 : 0;
  const pension = hasPension ? gross * 0.07 : 0;
  const empIns = hasEmpIns ? gross * 0.003 : 0;
  const tax = gross * 0.05 - (dependents * 1000);
  const totalDeductions = health + pension + empIns + tax;
  const net = gross - totalDeductions;

  const result = {
    gross: Math.round(gross),
    health: Math.round(health),
    pension: Math.round(pension),
    empIns: Math.round(empIns),
    tax: Math.round(tax),
    net: Math.round(net)
  };

  res.json({
    summary: `支給額: ¥${result.gross}\n健康保険: ¥${result.health}\n厚生年金: ¥${result.pension}\n雇用保険: ¥${result.empIns}\n所得税: ¥${result.tax}\n———————————————\n差引支給額: ¥${result.net}`,
    netAmount: result.net,
    deductions: result,
    status: 'ok'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
