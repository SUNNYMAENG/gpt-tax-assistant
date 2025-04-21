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

app.post('/chat', async (req, res) => {
  const userMessage = req.body.userMessage;
  chatHistory.push({ role: 'user', content: userMessage });
  console.log("📨 사용자 질문:", userMessage);

  const apiKey = process.env.OPENAI_API_KEY;
  let gptReply = '';
  let deductionSummary = '';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `당신은 일본 실무형 세무비서 GPT입니다. 사용자의 질문 목적에 따라 아래 항목 중 필요한 조건만 확인하여 처리하세요.

📌 항목별 조건 요구사항:
- 급여명세서: 고용형태, 거주지, 건강보험 여부, 연금가입 여부, 고용보험 여부, 부양가족 수, 급여액
- 퇴직금 계산: 고용형태, 입사일, 퇴사일, 마지막 급여
- 연말정산: 부양가족 수, 보험료 납입 여부, 기부금 여부, 연간 총소득
- 마이넘버 서식: 고용형태, 외국인 여부, 주민번호 유무
- 법인세 신고: 결산월, 사업소득, 비용 항목, 세무대리인 유무
- 부가세 신고: 과세기간, 간이/일반 여부, 매출/매입 내역
- 원천세 신고: 인건비 지급월, 지급총액, 인원수
- 소득세 신고: 종합소득 항목, 경비, 각종 공제 여부

❗조건이 부족한 경우에는 다음과 같이 자연스럽게 유도하십시오:
"정확한 산출을 위해 다음 항목들을 확인해 주세요:\n① 고용형태 (정직원 / 프리랜서 / 일용직 / 외국인)\n② 일본 거주 여부 (예/아니오)\n③ 건강보험 가입 여부\n④ 연금 가입 여부\n⑤ 고용보험 적용 여부\n⑥ 부양가족 수\n⑦ 금액 (예: 월 급여, 퇴직금 등)"

정보가 충분한 경우 아래 JSON 형식으로 응답하십시오:
{
  "type": "정직원",
  "amount": 2500000,
  "hasHealth": true,
  "hasPension": true,
  "hasEmpIns": true,
  "dependents": 0
}`
          },
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
        const generateResponse = await axios.post('https://gpt-tax-assistant.onrender.com/generate', condition);
        const result = generateResponse.data;
        deductionSummary = `
        <ul class="text-sm leading-6">
          <li>💰 <strong>지급액:</strong> ¥${result.deductions.gross}</li>
          <li>🩺 건강보험: ¥${result.deductions.health}</li>
          <li>💼 연금: ¥${result.deductions.pension}</li>
          <li>🛡️ 고용보험: ¥${result.deductions.empIns}</li>
          <li>💸 소득세: ¥${result.deductions.tax}</li>
          <li>✅ <strong>차감 후 수령액:</strong> ¥${result.deductions.net}</li>
        </ul>`;
      } catch (jsonErr) {
        console.warn('⚠️ 조건 파싱 실패:', jsonErr.message);
      }
    }

    const chatHtml = chatHistory.map(msg => {
      const style = msg.role === 'user' ? 'bg-gray-200 text-left' : 'bg-green-100 text-left';
      return `<div class="my-2 p-3 rounded ${style}"><strong>${msg.role === 'user' ? '🙋‍♂️ 질문' : '🤖 GPT'}:</strong><br>${msg.content}</div>`;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>GPT 세무 비서 대화형</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 text-gray-900 font-sans p-6">
          <div class="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md">
            <h1 class="text-xl font-bold mb-4 text-center">GPT 세무 비서 (채팅형)</h1>
            <div class="overflow-y-auto max-h-[500px] mb-6 scroll-smooth pr-1">${chatHtml}</div>
            ${deductionSummary ? `<div class="mb-6 bg-blue-50 p-4 rounded-md">📊 <strong>계산 결과 요약</strong><br>${deductionSummary}</div>` : ''}
            <form method="POST" action="/chat" class="flex space-x-2">
              <input type="text" name="userMessage" placeholder="질문을 입력하세요..." required class="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300" />
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">전송</button>
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
