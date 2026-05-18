/**
 * RuahQT generate.js  v2.1
 * ─────────────────────────────────────────────────────────────
 * 프로젝트 루트 = /var/www/qt/
 * 출력 파일     = /var/www/qt/index.html  (Nginx 서빙 진입점)
 *
 * 매일 00:07 KST 에 구글 시트 → index.html 을 자동 생성합니다.
 *
 * 실행:   node generate.js
 * PM2:    pm2 start generate.js --name ruahqt --time
 * ─────────────────────────────────────────────────────────────
 */

import cron    from "node-cron";
import ejs     from "ejs";
import fs      from "fs";
import path    from "path";
import { fileURLToPath } from "url";

import { fetchTodayRow, getKSTDate } from "./lib/fetchSheet.js";
import { parseRow }                  from "./lib/parseData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TMPL     = path.join(__dirname, "templates", "qt.ejs");
const OUT_FILE = path.join(__dirname, "index.html");   // ← 루트에 바로 생성

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   크론 스케줄  —  매일 00:07 KST
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UTC 서버  (기본): 15:07 UTC = 00:07 KST
   KST 서버        : 아래 주석 교체
*/
cron.schedule("7 15 * * *", () => {
  log("⏰ Cron fired (00:07 KST)");
  generate();
}, { timezone: "UTC" });

// KST 서버일 때 위 줄 대신:
// cron.schedule("7 0 * * *", () => { log("⏰ Cron fired"); generate(); }, { timezone: "Asia/Seoul" });

/* 시작 시 즉시 1회 실행 */
log("🚀 RuahQT generator started.");
generate();

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   generate()
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function generate(dateStr) {
  const today = dateStr ?? getKSTDate();
  log(`📥 Fetching sheet data for ${today} ...`);

  let row;
  try {
    row = await fetchTodayRow(today);
  } catch (err) {
    log(`❌ Sheet fetch error: ${err.message}`);
    return;
  }

  if (!row) {
    log(`⚠️  No data for ${today}. index.html is NOT updated.`);
    return;
  }

  let qt;
  try {
    qt = parseRow(row);
  } catch (err) {
    log(`❌ Parse error: ${err.message}`);
    return;
  }

  let html;
  try {
    html = await ejs.renderFile(TMPL, { qt }, { async: true });
  } catch (err) {
    log(`❌ Template error: ${err.message}`);
    return;
  }

  try {
    fs.writeFileSync(OUT_FILE, html, "utf-8");
    log(`✅ Generated: ${OUT_FILE}  (${(html.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    log(`❌ Write error: ${err.message}`);
  }
}

function log(msg) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}
