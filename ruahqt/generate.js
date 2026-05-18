/**
 * RuahQT — Daily QT Page Generator
 * 매일 00:07 (KST) 에 오늘 날짜의 data/YYYY-MM-DD.json 을 읽어
 * qt/index.html 을 생성합니다.
 *
 * 실행: node generate.js
 * PM2: pm2 start generate.js --name ruahqt
 */

"use strict";

const cron     = require("node-cron");
const ejs      = require("ejs");
const fs       = require("fs");
const path     = require("path");

const ROOT     = __dirname;                          // /var/www/ruahqt
const DATA_DIR = path.join(ROOT, "data");            // /var/www/ruahqt/data
const TMPL     = path.join(ROOT, "templates", "qt.ejs");
const OUT_DIR  = path.join(ROOT, "qt");              // /var/www/ruahqt/qt  (Nginx root)
const OUT_FILE = path.join(OUT_DIR, "index.html");

/* ── 00:07 KST = 15:07 UTC ──────────────────────────────────────────────── */
/* 서버 시간이 UTC 기준일 때 */
cron.schedule("7 15 * * *", () => {
  console.log(`[${ts()}] ⏰ Cron fired — generating today's QT page...`);
  generate();
}, { timezone: "UTC" });

/* 서버 시간이 이미 KST(Asia/Seoul) 기준일 때는 아래 줄 사용 (위 줄 주석 처리) */
// cron.schedule("7 0 * * *", generate, { timezone: "Asia/Seoul" });

/* ── 시작 시 즉시 한 번 실행 (선택) ─────────────────────────────────────── */
console.log(`[${ts()}] 🚀 RuahQT generator started.`);
generate();

/* ═══════════════════════════════════════════════════════════════════════════
   generate()  — 오늘 날짜 JSON → qt/index.html
   ═════════════════════════════════════════════════════════════════════════ */
async function generate() {
  const today    = getKSTDate();          // "2026-05-18"
  const dataFile = path.join(DATA_DIR, `${today}.json`);

  /* 데이터 파일 확인 */
  if (!fs.existsSync(dataFile)) {
    console.error(`[${ts()}] ❌ Data file not found: ${dataFile}`);
    return;
  }

  let qt;
  try {
    qt = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (err) {
    console.error(`[${ts()}] ❌ JSON parse error:`, err.message);
    return;
  }

  /* 출력 디렉터리 보장 */
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  /* EJS 렌더링 */
  let html;
  try {
    html = await ejs.renderFile(TMPL, { qt, processHL }, { async: true });
  } catch (err) {
    console.error(`[${ts()}] ❌ Template render error:`, err.message);
    return;
  }

  /* 파일 저장 */
  try {
    fs.writeFileSync(OUT_FILE, html, "utf-8");
    console.log(`[${ts()}] ✅ Generated: ${OUT_FILE}  (date: ${today})`);
  } catch (err) {
    console.error(`[${ts()}] ❌ File write error:`, err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   processHL()  — [[color]]text[[/color]] → <span class="hl-color">text</span>
   ═════════════════════════════════════════════════════════════════════════ */
function processHL(text) {
  if (!text) return "";
  return text
    .replace(/\[\[yellow\]\](.*?)\[\[\/yellow\]\]/gs, '<span class="hl-yellow">$1</span>')
    .replace(/\[\[amber\]\](.*?)\[\[\/amber\]\]/gs,   '<span class="hl-amber">$1</span>')
    .replace(/\[\[coral\]\](.*?)\[\[\/coral\]\]/gs,   '<span class="hl-coral">$1</span>')
    .replace(/\[\[green\]\](.*?)\[\[\/green\]\]/gs,   '<span class="hl-green">$1</span>')
    .replace(/\[\[blue\]\](.*?)\[\[\/blue\]\]/gs,     '<span class="hl-blue">$1</span>')
    .replace(/\[\[pink\]\](.*?)\[\[\/pink\]\]/gs,     '<span class="hl-pink">$1</span>');
}

/* ═══════════════════════════════════════════════════════════════════════════
   helpers
   ═════════════════════════════════════════════════════════════════════════ */

/** UTC 기준으로 KST(+9) 날짜를 YYYY-MM-DD 형식으로 반환 */
function getKSTDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
