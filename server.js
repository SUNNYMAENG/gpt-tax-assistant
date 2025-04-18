const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 테스트용 기본 라우팅
app.get('/', (req, res) => {
  res.send('✅ Hello from GPT Tax Assistant!');
});

// Render가 인식할 수 있도록 반드시 이 포트 바인딩 코드가 필요함
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
