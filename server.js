const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST'],
}));

app.set('trust proxy', 1);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.' }
});
app.use('/api/', limiter);

app.get('/health', (req, res) => res.json({ status: 'ok', name: 'verse-craft-api' }));

// ─── 말씀 검색 API ────────────────────────────────────────────────
app.post('/api/verse', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt가 필요합니다.' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

// ─── 배경 이미지 API (Unsplash) ───────────────────────────────────
app.get('/api/image', async (req, res) => {
  if (!UNSPLASH_ACCESS_KEY) return res.status(500).json({ error: 'Unsplash 키가 설정되지 않았습니다.' });

  // 자연/감성 키워드 랜덤 선택
  const keywords = ['nature', 'sky', 'forest', 'sunrise', 'mountains', 'ocean', 'flowers', 'peaceful', 'light', 'clouds'];
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${keyword}&orientation=portrait&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
      }
    );
    const data = await response.json();
    if (data.urls?.regular) {
      res.json({ imageUrl: data.urls.regular });
    } else {
      throw new Error('이미지를 가져오지 못했습니다.');
    }
  } catch (err) {
    console.error('[image error]', err);
    res.status(500).json({ error: '이미지를 가져오는 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ verse-craft API server running on port ${PORT}`);
});
