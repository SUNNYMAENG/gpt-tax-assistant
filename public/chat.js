// 이건 예시야. 실제 GPT 응답 받아오는 방식에 따라 조정 필요해.
async function handleGptReply(gptResponse) {
  const jsonMatch = gptResponse.match(/{[\s\S]*}/);
  if (jsonMatch) {
    const jsonData = JSON.parse(jsonMatch[0]);

    fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData)
    })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url);
    })
    .catch(err => console.error('문서 생성 실패:', err));
  }
}

