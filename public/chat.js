// chat.js

// GPT 응답을 받아 자동으로 /generate에 POST 요청 보내는 함수
function handleGptReply(gptResponse) {
  const jsonMatch = gptResponse.match(/```json\s*({[\s\S]*?})\s*```|```([\s\S]*?)```|({[\s\S]*})/);
  if (jsonMatch) {
    try {
      const rawJson = jsonMatch[1] || jsonMatch[2] || jsonMatch[3];
      const jsonData = JSON.parse(rawJson);

      // 금액 문자열 보정
      if (typeof jsonData.amount === "string") {
        const amountStr = jsonData.amount.replace(/[^\d]/g, "");
        const amountNum = parseInt(amountStr, 10);
        jsonData.amount = isNaN(amountNum) ? 0 : amountNum;
      }

      // 누락 보정
      const dep = jsonData.dependents;
      if (typeof dep === "string") {
        if (dep.includes("없음") || dep.includes("なし") || dep === "X" || dep === "0명") {
          jsonData.dependents = 0;
        } else if (dep.includes("있음") || dep.includes("あり") || dep === "O" || dep === "1명") {
          jsonData.dependents = 1;
        } else {
          const parsed = parseInt(dep);
          jsonData.dependents = isNaN(parsed) ? 0 : parsed;
        }
      } else if (dep === false) {
        jsonData.dependents = 0;
      } else if (dep === true) {
        jsonData.dependents = 1;
      }

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

// ✅ 실제 GPT 응답을 받아 자동 처리하는 함수 (외부에서 호출)
function handleUserMessageFromServer(gptResponse) {
  appendToChat("GPT", gptResponse);
  handleGptReply(gptResponse);
}

// 👇 테스트용 getGptReply 및 자동 실행 제거됨
