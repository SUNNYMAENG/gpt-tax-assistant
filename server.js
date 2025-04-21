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

let chatHistory = [];

const i18n = {
  ko: {
    title: "GPT 세무 비서 (채팅형)",
    input: "질문을 입력하세요...",
    send: "전송",
    user: "🙋‍♂️ 질문",
    gpt: "🤖 GPT",
    summary: "📊 계산 결과 요약",
    labels: ["지급액", "건강보험", "연금", "고용보험", "소득세", "차감 후 수령액"]
  },
  ja: {
    title: "GPT税務アシスタント（チャット形式）",
    input: "質問を入力してください...",
    send: "送信",
    user: "🙋‍♂️ 質問",
    gpt: "🤖 GPT",
    summary: "📊 計算結果の概要",
    labels: ["支給額", "健康保険", "厚生年金", "雇用保険", "所得税", "差引支給額"]
  },
  zh: {
    title: "GPT 税务助理（聊天模式）",
    input: "请输入您的问题...",
    send: "发送",
    user: "🙋‍♂️ 问题",
    gpt: "🤖 GPT",
    summary: "📊 计算结果概要",
    labels: ["工资总额", "健康保险", "养老金", "就业保险", "所得税", "净支付"]
  },
  en: {
    title: "GPT Tax Assistant (Chat Mode)",
    input: "Enter your question...",
    send: "Send",
    user: "🙋‍♂️ Question",
    gpt: "🤖 GPT",
    summary: "📊 Calculation Summary",
    labels: ["Gross Pay", "Health Insurance", "Pension", "Employment Insurance", "Income Tax", "Net Pay"]
  }
};

const systemMessages = {
  ko: `당신은 일본 실무형 세무비서 GPT입니다. 사용자의 질문 목적에 따라 아래 항목 중 필요한 조건만 확인하여 처리하세요.`,
  ja: `あなたは日本の実務型税務アシスタントGPTです。ユーザーの質問目的に応じて、必要な条件を確認して処理してください。`,
  zh: `你是一个日本实务型税务助手GPT。请根据用户的问题目的，确认以下所需的条件后再处理：`,
  en: `You are a Japanese tax assistant GPT. Depending on the user's intent, confirm the necessary items below and respond accordingly.`
};

app.post('/chat', async (req, res) => {
  const userMessage = req.body.userMessage;
  chatHistory.push({ role: 'user', content: userMessage });
  console.log("📨 사용자 질문:", userMessage);

  const lang = req.headers['accept-language'] || 'ko';
  const currentLang = lang.startsWith('ja') ? 'ja' : lang.startsWith('zh') ? 'zh' : lang.startsWith('en') ? 'en' : 'ko';
  const t = i18n[currentLang];
  const systemPrompt = systemMessages[currentLang];

  const apiKey = process.env.OPENAI_API_KEY;
  let gptReply = '';
  let deductionSummary = '';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    gptReply = response.data.choices[0].message.content;
    chatHistory.push({ role: 'assistant', content: gptReply });
    await supabase.from('user_queries').insert([{ message: userMessage, reply: gptReply }]);

    const jsonMatch = gptReply.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const condition = JSON.parse(jsonMatch[0]);
        const generateResponse = await axios.post('http://localhost:3000/generate', condition);
        const result = generateResponse.data;
        deductionSummary = `
        <ul class="text-sm leading-6">
          <li>💰 <strong>${t.labels[0]}:</strong> ¥${result.deductions.gross}</li>
          <li>🩺 ${t.labels[1]}: ¥${result.deductions.health}</li>
          <li>💼 ${t.labels[2]}: ¥${result.deductions.pension}</li>
          <li>🛡️ ${t.labels[3]}: ¥${result.deductions.empIns}</li>
          <li>💸 ${t.labels[4]}: ¥${result.deductions.tax}</li>
          <li>✅ <strong>${t.labels[5]}:</strong> ¥${result.deductions.net}</li>
        </ul>`;
      } catch (jsonErr) {
        console.warn('⚠️ 조건 파싱 실패:', jsonErr.message);
      }
    }

    const chatHtml = chatHistory.map(msg => {
      const style = msg.role === 'user' ? 'bg-gray-200 text-left' : 'bg-green-100 text-left';
      const label = msg.role === 'user' ? t.user : t.gpt;
      return `<div class="my-2 p-3 rounded ${style}"><strong>${label}:</strong><br>${msg.content}</div>`;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="${currentLang}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${t.title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 text-gray-900 font-sans p-6">
          <div class="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md">
            <h1 class="text-xl font-bold mb-4 text-center">${t.title}</h1>
            <div class="overflow-y-auto max-h-[500px] mb-6 scroll-smooth pr-1">${chatHtml}</div>
            ${deductionSummary ? `<div class="mb-6 bg-blue-50 p-4 rounded-md">${t.summary}<br>${deductionSummary}</div>` : ''}
            <form method="POST" action="/chat" class="flex space-x-2">
              <input type="text" name="userMessage" placeholder="${t.input}" required class="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300" />
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">${t.send}</button>
            </form>
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
