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

    res.send(`<pre>${gptReply}</pre>`);
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
