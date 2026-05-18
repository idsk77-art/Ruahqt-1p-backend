/**
 * lib/fetchSheet.js
 * 구글 시트를 CSV로 내보내어 오늘 날짜에 해당하는 행을 반환합니다.
 *
 * 사전 조건: 구글 시트 공유 설정을 "링크가 있는 모든 사용자 → 뷰어"로 설정해야 합니다.
 */

import { parse } from "csv-parse/sync";

const SHEET_ID  = "1dH5npAo-c2wnhBRvt50aWKsM5q8lxhcLU7-R37c8_RU";
const CSV_URL   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

/**
 * 오늘(KST) 날짜의 데이터를 구글 시트에서 가져옵니다.
 * @param {string} dateStr  "YYYY-MM-DD" 형식 (없으면 오늘 KST)
 * @returns {Object|null}   raw row 객체 또는 null
 */
export async function fetchTodayRow(dateStr) {
  const today = dateStr ?? getKSTDate();

  /* ── CSV 다운로드 ── */
  const res = await fetch(CSV_URL, { headers: { "User-Agent": "RuahQT/2.0" } });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  const csvText = await res.text();

  /* ── CSV 파싱 ── */
  const rows = parse(csvText, {
    columns: true,          // 첫 행을 헤더로 사용
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  /* ── 날짜 매칭 ── */
  // 시트 A열 헤더 이름: "날짜"
  const row = rows.find((r) => {
    const d = (r["날짜"] || "").trim().replace(/\//g, "-");
    return d === today;
  });

  if (!row) {
    console.warn(`[fetchSheet] No data found for date: ${today}`);
    return null;
  }
  return row;
}

/** UTC 기준으로 KST(+9) 날짜를 YYYY-MM-DD 형식으로 반환 */
export function getKSTDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
