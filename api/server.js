const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ─── 미들웨어 ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Rate limiting: IP당 1분에 10회
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.' }
});
app.use('/api/', limiter);

// ─── 헬스체크 (Render 필수) ───────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', name: 'verse-craft-api' }));

// ─── 말씀 검색 API ────────────────────────────────────────────────
app.post('/api/verse', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt가 필요합니다.' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[verse error]', err);
    res.status(500).json({ error: '말씀 검색 중 오류가 발생했습니다.' });
  }
});

// ─── 배경 이미지 생성 API ─────────────────────────────────────────
app.post('/api/image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt가 필요합니다.' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 }
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[image error]', err);
    res.status(500).json({ error: '이미지 생성 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ verse-craft API server running on port ${PORT}`);
});
