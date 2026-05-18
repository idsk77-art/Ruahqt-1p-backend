/**
 * lib/parseData.js
 * 구글 시트 원본 행 → 템플릿이 사용하는 구조화된 qt 객체로 변환합니다.
 *
 * 시트 컬럼:  날짜 | 주제 | 본문주소 | 본문내용 | 말씀묵상 | 기도
 */

/* ══════════════════════════════════════════════════════
   PUBLIC
   ══════════════════════════════════════════════════════ */

/**
 * @param {Object} row  csv-parse 가 반환한 raw 행
 * @returns {Object}    qt 데이터 객체
 */
export function parseRow(row) {
  const dateRaw   = (row["날짜"]    || "").trim();
  const title     = (row["주제"]    || "").trim();
  const reference = (row["본문주소"] || "").trim();
  const verseRaw  = (row["본문내용"] || "").trim();
  const meditRaw  = (row["말씀묵상"] || "").trim();
  const prayerRaw = (row["기도"]    || "").trim();

  return {
    date:      formatDisplayDate(dateRaw),   // "2026.05.18"
    title,
    reference,
    verses:    parseVerses(verseRaw),
    sections:  parseMeditation(meditRaw),
    prayer:    parsePrayer(prayerRaw),
  };
}

/* ══════════════════════════════════════════════════════
   VERSES  — "16 내가 이르노니...   17 육체의 소욕은..."
   ══════════════════════════════════════════════════════ */

function parseVerses(raw) {
  if (!raw) return [];

  /* 절 번호 경계: 연속 공백 + 숫자 + 공백 (또는 텍스트 시작의 숫자) */
  const pattern = /(?:^|\s{2,})(\d{1,3})\s+(?=\S)/g;
  const splits  = [];
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    splits.push({ idx: match.index + match[0].indexOf(match[1]), n: parseInt(match[1]) });
  }

  if (!splits.length) return [{ n: null, html: applyHL(raw) }];

  const verses = [];
  for (let i = 0; i < splits.length; i++) {
    const start   = splits[i].idx + String(splits[i].n).length;
    const end     = splits[i + 1]?.idx ?? raw.length;
    const text    = raw.slice(start, end).trim();
    verses.push({ n: splits[i].n, html: applyHL(text) });
  }
  return verses;
}

/* ══════════════════════════════════════════════════════
   MEDITATION  — ❝ / ◼︎ / ✔ 섹션으로 분리
   ══════════════════════════════════════════════════════ */

/*
  섹션 헤더 패턴:
    ❝ 핵심 구절 ❞
    ◼︎ 배경
    ◼︎ 말씀 깊이 보기
    ◼︎ 오늘을 살아내며
    ✔ 오늘의 실천
*/

const SECTION_RE = /^(❝[^❞]*❞|◼︎[^\n]*|✔[^\n]*)/m;

function parseMeditation(raw) {
  if (!raw) return [];

  /* 헤더 위치를 모두 찾는다 */
  const headerRe = /(❝[^❞\n]*❞|◼︎[^\n\r]*|✔[^\n\r]*)/g;
  const parts    = [];
  let   last     = { header: null, start: 0 };
  let   m;

  while ((m = headerRe.exec(raw)) !== null) {
    if (last.start < m.index) {
      /* 이전 섹션 바디 저장 */
      parts.push({ header: last.header, body: raw.slice(last.start, m.index).trim() });
    }
    last = { header: m[1], start: m.index + m[1].length };
  }
  /* 마지막 섹션 */
  parts.push({ header: last.header, body: raw.slice(last.start).trim() });

  /* 첫 번째가 헤더 없는 잔여 텍스트면 버림 */
  const sections = parts
    .filter((p) => p.header !== null)
    .map((p) => ({
      type:   classifyHeader(p.header),
      header: p.header.replace(/^(❝|◼︎|✔)\s*/, "").replace(/❞\s*$/, "").trim(),
      html:   applyHL(p.body),
    }));

  return sections;
}

function classifyHeader(h) {
  if (h.startsWith("❝")) return "keyverse";
  if (h.includes("배경")) return "background";
  if (h.includes("깊이") || h.includes("말씀")) return "insight";
  if (h.includes("살아내")) return "today";
  if (h.startsWith("✔")) return "practice";
  return "body";
}

/* ══════════════════════════════════════════════════════
   PRAYER  — 단락 배열로 반환
   ══════════════════════════════════════════════════════ */

function parsePrayer(raw) {
  if (!raw) return [];
  /* 빈 줄로 단락 구분 */
  return raw
    .split(/\n{2,}/)
    .map((p) => applyHL(p.trim()))
    .filter(Boolean);
}

/* ══════════════════════════════════════════════════════
   HIGHLIGHT  —  **[텍스트]** → <mark class="hl-*">
   ══════════════════════════════════════════════════════ */

/**
 * 시트 데이터의 강조 마크업을 HTML span 으로 변환합니다.
 *
 * 지원 패턴:
 *   **[텍스트]**          → hl-yellow  (노란 형광펜)
 *   *[텍스트]*            → hl-underline (색연필 밑줄)
 *   `텍스트`             → hl-inline   (인라인 강조)
 *   "따옴표 인용"         → hl-quote    (인용 강조)
 */
export function applyHL(text) {
  if (!text) return "";

  return text
    /* **[텍스트]** → 노란 형광펜 */
    .replace(/\*\*\[(.+?)\]\*\*/gs,
      '<mark class="hl-yellow">$1</mark>')

    /* *[텍스트]* → 색연필 밑줄 (coral) */
    .replace(/\*\[(.+?)\]\*/gs,
      '<span class="hl-coral">$1</span>')

    /* 백틱 인라인 강조 */
    .replace(/`([^`]+)`/g,
      '<span class="hl-inline">$1</span>')

    /* 줄바꿈 유지 */
    .replace(/\n/g, "<br />");
}

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */

function formatDisplayDate(d) {
  /* "2026-05-18" → "2026.05.18" */
  return d.replace(/-/g, ".");
}
