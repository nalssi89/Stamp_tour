# 11시 자동 매칭 설정 가이드

## 개요

매일 오전 11시(KST)에 자동으로 매칭을 실행하는 기능입니다.
Supabase Edge Function + pg_cron + pg_net을 사용합니다.

**설정 완료일**: 2026년 1월 21일

---

## 현재 설정 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Edge Function 배포 | ✅ 완료 | `auto-match` |
| pg_cron 확장 | ✅ 활성화 | |
| pg_net 확장 | ✅ 활성화 | HTTP 호출용 |
| Cron Job 등록 | ✅ 완료 | 매일 UTC 02:00 (KST 11:00) |

---

## 1. Edge Function 배포 (완료)

### 1.1 Supabase CLI 설치

```bash
# Mac (Homebrew)
brew install supabase/tap/supabase

# 또는 npm (권장하지 않음)
# npm install -g supabase
```

### 1.2 로그인

```bash
supabase login
```
브라우저에서 인증 완료

### 1.3 프로젝트 연결

```bash
cd lunch-roulette
supabase link --project-ref cofpgarbgzbptkduxonl
```

### 1.4 Edge Function 배포

```bash
supabase functions deploy auto-match
```

### 1.5 환경 변수

Edge Function은 자동으로 다음 환경 변수를 사용:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Cron 스케줄 설정 (완료)

### 2.1 확장 활성화

Supabase Dashboard → **Database** → **Extensions**에서 활성화:
- `pg_cron` ✅
- `pg_net` ✅

### 2.2 Cron Job 등록 (완료)

**SQL Editor**에서 실행한 쿼리:

```sql
-- pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 매일 오전 11시 KST (= UTC 02:00) 자동 매칭 실행
SELECT cron.schedule(
  'auto-match-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZnBnYXJiZ3picHRrZHV4b25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY1NjIwMywiZXhwIjoyMDg0MjMyMjAzfQ.Uy7s7Fd7W7E5aA4ZXxkFKkl_0Sap8vGoUsIRTZtoqJQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

> ⚠️ **주의**: Service Role Key는 절대 클라이언트(프론트엔드)에 노출하지 마세요!

---

## 3. 동작 방식

```
오전 11시 전: 직원들이 앱에서 매칭 신청
       ↓
오전 11시 (KST): pg_cron이 Edge Function 호출
       ↓
Edge Function 실행:
  1. 오늘 pending 상태 신청자 조회
  2. 부서별 분류 및 셔플
  3. Round-Robin 방식 그룹 생성 (3-4명)
  4. match_groups, match_group_members 저장
  5. match_requests 상태를 'matched'로 업데이트
       ↓
직원들이 앱에서 매칭 결과 확인
```

---

## 4. 모니터링

### Cron Job 등록 확인

```sql
SELECT * FROM cron.job;
```

### Cron Job 실행 이력

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-match-daily')
ORDER BY start_time DESC
LIMIT 10;
```

### Edge Function 로그

Supabase Dashboard → **Edge Functions** → `auto-match` → **Logs**

---

## 5. 수동 테스트

### 방법 1: Supabase Dashboard

Edge Functions → `auto-match` → **Invoke** 버튼 클릭

### 방법 2: curl

```bash
curl -X POST \
  'https://cofpgarbgzbptkduxonl.supabase.co/functions/v1/auto-match' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

---

## 6. 매칭 알고리즘

1. 오늘 `pending` 상태의 신청자 조회
2. 부서별로 분류 (수치예보기획과, 수치예보기술과, 수치예보활용팀)
3. 각 부서 목록 랜덤 셔플
4. Round-Robin 방식으로 3-4명 그룹 생성
   - 각 부서에서 1명씩 선택하여 그룹 구성
   - 타과 교류 최대화
5. 남은 인원은 기존 그룹에 배분 (최대 4명)
6. 2명 미만 그룹은 다른 그룹에 합침
7. 그룹 및 멤버 DB 저장
8. 신청 상태를 `matched`로 업데이트

---

## 7. Cron Job 관리

### 일시 중지

```sql
SELECT cron.unschedule('auto-match-daily');
```

### 재등록

```sql
SELECT cron.schedule(
  'auto-match-daily',
  '0 2 * * *',
  $$ ... $$
);
```

### 시간 변경 (예: 10시 30분으로)

```sql
-- 기존 삭제
SELECT cron.unschedule('auto-match-daily');

-- 새로 등록 (UTC 01:30 = KST 10:30)
SELECT cron.schedule(
  'auto-match-daily',
  '30 1 * * *',
  $$ ... $$
);
```

---

## 8. 트러블슈팅

### Cron Job이 실행되지 않음

1. `SELECT * FROM cron.job;`으로 등록 확인
2. pg_cron, pg_net 확장 활성화 확인
3. Edge Function URL 및 Authorization 헤더 확인

### Edge Function 오류

1. Supabase Dashboard → Edge Functions → Logs 확인
2. Service Role Key가 올바른지 확인
3. 테이블명, 컬럼명 오타 확인

### 매칭이 안 됨

1. 신청자가 2명 미만이면 매칭 스킵
2. 신청자 상태가 `pending`인지 확인
3. `request_date`가 오늘 날짜인지 확인

---

## 작성일
2026년 1월 21일 (최종 업데이트)
