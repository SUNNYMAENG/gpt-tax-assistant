// chat.js

// GPT 응답을 받아 자동으로 /generate에 POST 요청 보내는 함수
function handleGptReply(gptResponse) {
  const jsonMatch = gptResponse.match(/{[\s\S]*}/);
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[0]);

      // /generate로 JSON 데이터 전송
      fetch('/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
      })
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          window.open(url); // 결과 문서 새 탭으로 열기
        })
        .catch(err => console.error('📛 문서 생성 실패:', err));

    } catch (e) {
      console.warn('⚠️ JSON 파싱 실패:', e);
    }
  } else {
    console.log('⚠️ GPT 응답에 JSON이 포함되어 있지 않음');
  }
}

// 예시 실행: 실제 구현에서는 GPT 응답 받은 후 아래 함수에 넣어줘야 함
// handleGptReply(`{
//   "type": "정직원",
//   "amount": 2500000,
//   "hasHealth": true,
//   "hasPension": true,
//   "hasEmpIns": true,
//   "dependents": 0
// }`);
