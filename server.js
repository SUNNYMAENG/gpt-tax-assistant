// ✅ 언어 감지 및 질문 흐름 개선 + 세무 GPT 운영 지침 반영
// 📁 적용 대상: server.js

/*
=====================================================
🧾 실무형 세무비서 GPT 운영지침 (v2025.04.21 기준)
=====================================================
- GPT는 일본 내 급여, 사회보험, 소비세, 소득세, 원천징수 등 실무 세무 관련 질문에 대해
  반드시 아래 지침에 따라 응답해야 한다.

1. 법령 기반 실무 안내 (관련 조문, 통달 등 명시)
2. 사용자 조건 확인: 고용형태 / 거주지 / 건강보험 / 부양가족
3. 조건 미제공 시 참고용임을 명시하고 전문가 상담 유도
4. 산출내역을 먼저 제시 후 양식 제공 (Excel / PDF / Word)
5. 전문용어는 쉽게 설명 + 예시 제공
6. 법적 판단 요구 질문은 응답 자제 + 전문가 연결
7. 링크 제공 시 유효성 체크 후 명확한 안내 포함
8. 응답 마지막 줄에 면책 문구 삽입
9. 출력파일은 Netlify 자동 업로드 연동 or /mnt/data 제공
10. 출력 흐름: 질문 → 조건 확인 → 산출 → 양식 → 주의사항
=====================================================
*/

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

const detectLang = (text) => {
  if (/[ぁ-んァ-ン一-龯]/.test(text)) return 'ja';
  if (/[가-힣]/.test(text)) return 'ko';
  if (/[一-龥]/.test(text)) return 'zh';
  return 'en';
};

const i18n = {
  en: { title: "GPT Tax Assistant (Chat Mode)", input: "Enter your question...", send: "Send", user: "🙋‍♂️ Question", gpt: "🤖 GPT", summary: "📊 Calculation Summary", labels: ["Gross Pay", "Health Insurance", "Pension", "Employment Insurance", "Income Tax", "Net Pay"] },
  ko: { title: "GPT Tax Assistant (Chat Mode)", input: "질문을 입력하세요...", send: "전송", user: "🙋‍♂️ 질문", gpt: "🤖 GPT", summary: "📊 계산 결과 요약", labels: ["지급액", "건강보험", "연금", "고용보험", "소득세", "차감 후 수령액"] },
  ja: { title: "GPT Tax Assistant (Chat Mode)", input: "質問を入力してください...", send: "送信", user: "🙋‍♂️ 質問", gpt: "🤖 GPT", summary: "📊 計算結果の概要", labels: ["支給額", "健康保険", "厚生年金", "雇用保険", "所得税", "差引支給額"] },
  zh: { title: "GPT Tax Assistant (Chat Mode)", input: "请输入您的问题...", send: "发送", user: "🙋‍♂️ 问题", gpt: "🤖 GPT", summary: "📊 计算结果概要", labels: ["工资总额", "健康保险", "养老金", "就业保险", "所得税", "净支付"] }
};

const systemMessages = {
  en: `You are a Japanese tax assistant GPT. Please ask the user for any necessary information such as employment type, residence, social insurance, and dependents before calculating their tax sheet or form.`,
  ko: `당신은 일본 실무형 세무비서 GPT입니다. 사용자의 급여대장 또는 서식을 생성하기 위해 고용형태, 거주지, 사회보험, 부양가족 여부 등을 반드시 먼저 확인하세요.`,
  ja: `あなたは日本の税務アシスタントGPTです。給与台帳や帳票を作成する前に、雇用形態、居住地、社会保険、扶養家族の有無などの情報を必ず確認してください。`,
  zh: `你是日本税务助理GPT。在生成薪资或表单之前，请确认雇佣类型、居住地、社会保险和家属信息。`
};

app.post('/chat', async (req, res) => {
  const userMessage = req.body.userMessage;
  const lang = detectLang(userMessage);
  const t = i18n[lang];
  const systemPrompt = `${systemMessages[lang]}

以下のチェック項目にユーザーがすべて回答していない場合は、やさしく案内してください：
1. 雇用形態（例：正社員、フリーランスなど）
2. 居住地（例：東京、日本国外など）
3. 社会保険加入状況（加入／未加入）
4. 扶養家族の有無（あり／なし）

上記のいずれかが不足している場合は、
「ご入力いただいていない項目があります。より正確な結果をご希望の場合は、以下の情報をご入力ください：...」と案内してください。

それでも条件がすべて揃わない場合は、以下の一般的な仮定で計算を進めてください：
- 雇用形態：正社員
- 居住地：東京
- 社会保険：加入
- 扶養家族：なし

その上で、以下の形式でJSONを返してください：
{ type, amount, hasHealth, hasPension, hasEmpIns, dependents }`

条件がすべて揃ったら、以下の形式でJSONを返してください: { type, amount, hasHealth, hasPension, hasEmpIns, dependents }`;
  chatHistory.push({ role: 'user', content: userMessage });

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
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    let gptReply = response.data.choices[0].message.content;
    chatHistory.push({ role: 'assistant', content: gptReply });
    await supabase.from('user_queries').insert([{ message: userMessage, reply: gptReply }]);

    let deductionSummary = '<p class="text-sm italic text-gray-500">※ 条件が未入力または不完全なため、計算結果はまだ表示されていません。</p>';
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
      } catch (err) {
        console.warn('⚠️ 계산 실패:', err.message);
      }
    }

    const chatHtml = chatHistory.map(msg => {
  const style = msg.role === 'user' ? 'bg-gray-200 text-left whitespace-pre-line' : 'bg-green-100 text-left whitespace-pre-line';
  const label = msg.role === 'user' ? t.user : t.gpt;
  return `<div class="my-2 p-3 rounded ${style}"><strong>${label}:</strong><br>${msg.content}</div>`;
}).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="${lang}">
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
    console.error("❌ GPT 오류:", error.message);
    res.send("⚠️ GPT 응답에 실패했습니다. 다시 시도해주세요.");
  }
});

app.get('/chat', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
