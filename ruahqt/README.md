# RuahQT 루아큐티 — 서버 설치 가이드

매일 **00:07 KST** 에 오늘 날짜의 QT 데이터를 읽어 `qt/index.html` 을 자동 생성합니다.
Nginx 는 요청이 올 때마다 이 정적 파일만 반환하므로 서버 부하가 거의 없습니다.

---

## 디렉터리 구조

```
/var/www/ruahqt/              ← 서버 업로드 루트
├── generate.js               ← 크론 + 생성 스크립트 (Node.js)
├── package.json
├── templates/
│   └── qt.ejs                ← HTML 템플릿
├── data/
│   ├── 2026-05-18.json       ← 오늘 QT 데이터
│   ├── 2026-05-19.json       ← 내일 QT 데이터 (미리 업로드)
│   └── ...
├── qt/                       ← Nginx 서빙 폴더 (자동 생성)
│   └── index.html            ← 매일 00:07 에 덮어쓰기
└── nginx.conf                ← 참고용 (직접 /etc/nginx 에 설치)
```

---

## 1. 서버 파일 업로드

```bash
# 로컬에서 서버로 업로드 (SCP 예시)
scp -r ./ruahqt  user@your-server:/var/www/

# 또는 rsync
rsync -avz ./ruahqt/  user@your-server:/var/www/ruahqt/
```

---

## 2. Node.js 의존성 설치

```bash
cd /var/www/ruahqt
npm install
```

---

## 3. Nginx 설정

```bash
# nginx.conf 내용을 sites-available 에 복사
sudo cp /var/www/ruahqt/nginx.conf /etc/nginx/sites-available/ruahqt

# server_name 수정 (도메인이 있다면)
sudo nano /etc/nginx/sites-available/ruahqt

# 심링크로 활성화
sudo ln -s /etc/nginx/sites-available/ruahqt /etc/nginx/sites-enabled/ruahqt

# 문법 체크 후 재시작
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. PM2 로 Node 프로세스 영구 실행

```bash
# PM2 전역 설치 (최초 1회)
npm install -g pm2

# 앱 시작
cd /var/www/ruahqt
pm2 start generate.js --name ruahqt --time

# 서버 재부팅 후 자동 시작 등록
pm2 save
pm2 startup
# → 출력된 명령어를 복사 후 실행

# 로그 확인
pm2 logs ruahqt
```

---

## 5. 데이터 파일 규칙

`data/YYYY-MM-DD.json` 형식으로 미리 준비해두면 됩니다.

| 필드 | 설명 |
|------|------|
| `date` | 화면 표시 날짜 (예: `"2026.05.18"`) |
| `title` | 제목 (`\n` 으로 줄바꿈 가능) |
| `verses[]` | 성경 구절 배열 |
| `observation[]` | 내용 관찰 문단 배열 |
| `keywords[]` | 핵심 단어 배열 |
| `guide[]` | 길잡이 문단 배열 |
| `meditation[]` | 연구와 묵상 문단 배열 |
| `decision[]` | 결단과 적용 문단 배열 |
| `prayer[]` | 기도 문단 배열 |

### 하이라이트 문법

텍스트 안에 `[[color]]내용[[/color]]` 형식으로 작성합니다.

```
[[yellow]]   노란 밑줄 배경
[[amber]]    주황 밑줄 배경
[[coral]]    붉은 실선 밑줄
[[green]]    초록 밑줄 배경
[[blue]]     파란 실선 밑줄
[[pink]]     분홍 점선 배경
```

---

## 6. 접속 URL

```
http://your-domain.com/qt/
http://your-server-ip/qt/
```

`/qt/` 까지만 입력하면 `index.html` 이 자동으로 서빙됩니다.

---

## 7. 서버 시간 확인

`generate.js` 의 cron 시간은 **서버 시간 기준** 입니다.

```bash
# 서버 시간대 확인
timedatectl

# UTC 서버인 경우 → generate.js 의 기본 설정 사용 (15:07 UTC = 00:07 KST)
# KST 서버인 경우 → generate.js 에서 주석 교체 (0:07 KST)
```

---

## 8. 수동 재생성

데이터를 수정한 뒤 즉시 반영하려면:

```bash
cd /var/www/ruahqt
pm2 restart ruahqt   # generate.js 재시작 시 즉시 1회 실행됨
# 또는
node -e "require('./generate.js')"
```
