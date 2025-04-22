// chat.js

// GPT 응답을 받아 자동으로 /generate에 POST 요청 보내는 함수
function handleGptReply(gptResponse) {
  const jsonMatch = gptResponse.match(/{[\s\S]*}/);
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[0]);

      // 금액 문자열 보정
      if (typeof jsonData.amount === "string") {
        const amountStr = jsonData.amount.replace(/[^\d]/g, "");
        const amountNum = parseInt(amountStr, 10);
        jsonData.amount = isNaN(amountNum) ? 0 : amountNum;
      }

      // 누락 보정
      if (jsonData.dependents === "なし" || jsonData.dependents === false) jsonData.dependents = 0;
      if (jsonData.dependents === "あり" || jsonData.dependents === true) jsonData.dependents = 1;
      if (!jsonData.dependents && jsonData.dependents !== 0) jsonData.dependents = 0;

      fetch('/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
      })
        .then(res => res.json())
        .then(result => {
          const d = result.deductions;
          const summary = `💴 실수령액 계산 결과\n\n` +
            `• 지급액: ¥${d.gross.toLocaleString()}\n` +
            `• 건강보험: ¥${d.health.toLocaleString()}\n` +
            `• 연금: ¥${d.pension.toLocaleString()}\n` +
            `• 고용보험: ¥${d.empIns.toLocaleString()}\n` +
            `• 소득세: ¥${d.tax.toLocaleString()}\n` +
            `• 주민세: ¥${d.residentTax.toLocaleString()}\n` +
            `✅ 실수령액: ¥${d.net.toLocaleString()}`;

          appendToChat("GPT", summary);
        })
        .catch(err => console.error('📛 계산 실패:', err));

    } catch (e) {
      console.warn('⚠️ JSON 파싱 실패:', e);
    }
  } else {
    console.log('⚠️ GPT 응답에 JSON이 포함되어 있지 않음');
  }
}

// 사용자의 메시지를 처리하고 GPT 응답을 받은 후 자동 처리 연결
async function handleUserMessage(userInput) {
  const gptResponse = await getGptReply(userInput);     // GPT 응답 받기
  appendToChat("GPT", gptResponse);                     // 사용자 화면에 응답 표시
  handleGptReply(gptResponse);                          // ✅ GPT 응답에서 JSON 감지 후 /generate 호출
}

// 실제 GPT API를 연동할 수 있는 구조로 교체 필요
async function getGptReply(message) {
  // 테스트용 고정 JSON 반환
  return `{
    "type": "정직원",
    "amount": 2500000,
    "hasHealth": true,
    "hasPension": true,
    "hasEmpIns": true,
    "dependents": 0,
    "lang": "ko"
  }`;
}

// 예시 실행 (실제에선 사용자 입력에 따라 호출)
handleUserMessage("급여대장 만들어줘");
