# RuahQT 루아큐티 v2.1 — 서버 설치 가이드

## 개요

매일 **00:07 KST** 에 구글 시트 데이터를 읽어 `index.html` 을 생성합니다.
Nginx 는 이 정적 파일만 반환하므로 서버 부하가 거의 없습니다.

```
구글 시트 → (00:07 KST) generate.js → index.html → Nginx → 접속자
```

---

## 서버 디렉터리 구조

```
/var/www/qt/                ← 업로드 위치 (이 폴더 자체가 qt/)
├── index.html              ← 매일 00:07 자동 생성 (시작 파일)
├── generate.js             ← 크론 + 생성 스크립트
├── package.json
├── nginx.conf              ← 참고용
├── README.md
├── lib/
│   ├── fetchSheet.js       ← 구글 시트 CSV 가져오기
│   └── parseData.js        ← 파싱 + 하이라이트 처리
└── templates/
    └── qt.ejs              ← HTML 템플릿
```

접속 URL:
```
http://도메인/qt/    ← index.html 자동 서빙
http://도메인/       ← /qt/ 로 자동 리다이렉트
```

---

## ❗ 첫 번째: 구글 시트 공유 설정

1. 구글 시트 열기
2. 우상단 **공유** 클릭
3. **"링크가 있는 모든 사용자"** → **"뷰어"** 설정
4. 확인

이 설정이 되어야 서버에서 CSV 다운로드가 가능합니다.

---

## 설치 순서

### 1. 파일 업로드

```bash
# zip 압축 해제 후 서버의 /var/www/qt/ 에 업로드
scp -r ./qt  user@your-server:/var/www/

# 결과: /var/www/qt/ 폴더가 생성됨
```

### 2. 의존성 설치

```bash
cd /var/www/qt
npm install
```

### 3. Nginx 설정

```bash
sudo cp /var/www/qt/nginx.conf /etc/nginx/sites-available/ruahqt

# 도메인 수정 (있는 경우)
sudo nano /etc/nginx/sites-available/ruahqt

sudo ln -s /etc/nginx/sites-available/ruahqt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. PM2 로 영구 실행

```bash
npm install -g pm2

cd /var/www/qt
pm2 start generate.js --name ruahqt --time
pm2 save
pm2 startup   # → 출력된 명령어 실행
```

### 5. 확인

```bash
pm2 logs ruahqt   # 로그 확인
ls -la /var/www/qt/index.html   # 파일 생성 확인
```

---

## 구글 시트 컬럼 규칙

| 열 | 헤더 | 내용 |
|----|------|------|
| A | 날짜 | `YYYY-MM-DD` (예: `2026-05-18`) |
| B | 주제 | QT 제목 |
| C | 본문주소 | 성경 본문 (예: `갈라디아서 5:16-25`) |
| D | 본문내용 | 성경 구절 (절 번호 + 내용) |
| E | 말씀묵상 | 묵상 내용 (섹션 기호로 구분) |
| F | 기도 | 오늘의 기도 |

### 말씀묵상 섹션 기호

```
❝ 핵심 구절 ❞    → 검은 인용 박스
◼︎ 배경           → 일반 섹션
◼︎ 말씀 깊이 보기  → 일반 섹션
◼︎ 오늘을 살아내며 → 파란 강조 섹션
✔ 오늘의 실천     → 왼쪽 선 강조 박스
```

### 형광펜 / 색연필 문법

| 입력 | 효과 |
|------|------|
| `**[텍스트]**` | 🖊 노란 형광펜 |
| `*[텍스트]*` | 🖍 붉은 색연필 밑줄 |
| `` `텍스트` `` | 인라인 강조 |

---

## 서버 시간대

```bash
timedatectl   # 서버 시간대 확인
```

- **UTC 서버** (기본): `generate.js` 수정 불필요
- **KST 서버**: `generate.js` 에서 주석 한 줄 교체

---

## 수동 재생성

```bash
pm2 restart ruahqt   # 재시작 시 즉시 1회 실행
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `403 Forbidden` | 시트 공유 설정 미완료 | 구글 시트 공유 → 뷰어 설정 |
| `No data found` | 해당 날짜 행 없음 | 시트에 오늘 날짜 행 추가 |
| 페이지 안 열림 | Nginx alias 경로 오류 | `sudo nginx -t` 로 설정 확인 |
