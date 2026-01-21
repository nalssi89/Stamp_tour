# 11시 자동 매칭 설정 가이드

## 개요

매일 오전 11시(KST)에 자동으로 매칭을 실행하는 기능입니다.
Supabase Edge Function + pg_cron을 사용합니다.

---

## 1. Edge Function 배포

### 1.1 Supabase CLI 설치

```bash
npm install -g supabase
```

### 1.2 로그인

```bash
supabase login
```

### 1.3 프로젝트 연결

```bash
cd lunch-roulette
supabase link --project-ref cofpgarbgzbptkduxonl
```

### 1.4 Edge Function 배포

```bash
supabase functions deploy auto-match
```

### 1.5 환경 변수 확인

Edge Function은 자동으로 다음 환경 변수를 사용합니다:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Cron 스케줄 설정

Supabase Dashboard에서 **pg_cron** 확장을 사용하여 매일 11시에 실행되도록 설정합니다.

### 2.1 pg_cron 활성화

Supabase Dashboard → **Database** → **Extensions** → `pg_cron` 검색 → **Enable**

### 2.2 Cron Job 등록

**SQL Editor**에서 실행:

```sql
-- Edge Function URL (배포 후 확인)
-- https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match

-- cron job 등록 (매일 오전 11시 KST = UTC 02:00)
SELECT cron.schedule(
  'auto-match-daily',
  '0 2 * * *',  -- UTC 02:00 = KST 11:00
  $$
  SELECT net.http_post(
    url := 'https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'
  );
  $$
);
```

### 2.3 Service Role Key 설정

SQL Editor에서 실행:

```sql
-- Service Role Key 설정 (Supabase Dashboard → Settings → API에서 확인)
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
```

> ⚠️ **주의**: Service Role Key는 절대 클라이언트에 노출하지 마세요!

---

## 3. 대안: Supabase Cron (권장)

Supabase는 최근 **Database Webhooks** 기능을 제공합니다.
더 간단하게 설정할 수 있습니다.

### 3.1 Supabase Dashboard 설정

1. **Database** → **Webhooks** 메뉴
2. **Create a new webhook** 클릭
3. 설정:
   - Name: `auto-match-cron`
   - Table: (cron 테이블 또는 커스텀)
   - Events: INSERT
   - HTTP request:
     - Method: POST
     - URL: `https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match`
     - Headers: `Authorization: Bearer <service-role-key>`

---

## 4. 수동 테스트

Edge Function을 수동으로 호출하여 테스트:

```bash
curl -X POST \
  'https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

또는 Supabase Dashboard → **Edge Functions** → `auto-match` → **Invoke**

---

## 5. 외부 Cron 서비스 사용 (가장 간단)

무료 Cron 서비스를 사용하면 pg_cron 설정 없이 가능합니다.

### 추천 서비스

1. **cron-job.org** (무료)
   - https://cron-job.org
   - 계정 생성 후 새 Cron Job 추가
   - URL: `https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match`
   - Schedule: `0 11 * * *` (KST 기준으로 설정)
   - Headers: `Authorization: Bearer <service-role-key>`

2. **Easycron** (무료)
   - https://www.easycron.com

3. **GitHub Actions** (무료)
   - Repository에 workflow 추가

### GitHub Actions 예시

`.github/workflows/auto-match.yml`:

```yaml
name: Auto Match Cron

on:
  schedule:
    - cron: '0 2 * * *'  # UTC 02:00 = KST 11:00
  workflow_dispatch:  # 수동 실행 가능

jobs:
  trigger-match:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Auto Match
        run: |
          curl -X POST \
            'https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}' \
            -H 'Content-Type: application/json'
```

GitHub → Repository → **Settings** → **Secrets and variables** → **Actions** →
`SUPABASE_SERVICE_ROLE_KEY` 추가

---

## 6. 매칭 알고리즘 설명

1. 오늘 `pending` 상태의 신청자 조회
2. 부서별로 분류 후 셔플
3. Round-Robin 방식으로 3-4명 그룹 생성
   - 각 부서에서 1명씩 선택하여 그룹 구성
   - 타과 교류 최대화
4. 남은 인원은 기존 그룹에 배분 (최대 4명)
5. 그룹 및 멤버 DB 저장
6. 신청 상태를 `matched`로 업데이트

---

## 7. 모니터링

### Edge Function 로그 확인

Supabase Dashboard → **Edge Functions** → `auto-match` → **Logs**

### Cron Job 실행 이력

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-match-daily')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 작성일
2026년 1월 18일
