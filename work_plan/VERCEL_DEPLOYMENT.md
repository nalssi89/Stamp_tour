# Vercel 배포 가이드

## 1. 배포 개요

점심 룰렛 앱을 Vercel에 배포하여 직원들이 핸드폰에서 URL로 접속하거나 홈화면에 추가하여 사용할 수 있습니다.

---

## 2. GitHub 저장소

- **저장소**: https://github.com/nalssi89/Stamp_tour
- **브랜치**: main
- **프로젝트 폴더**: `lunch-roulette/`

---

## 3. Vercel 배포 단계

### 3.1 Vercel 가입 및 GitHub 연결

1. [Vercel](https://vercel.com) 접속
2. **Continue with GitHub** 클릭하여 GitHub 계정 연결
3. **Add New Project** 클릭
4. `Stamp_tour` 저장소 선택 → **Import**

### 3.2 프로젝트 설정

| 항목 | 설정값 |
|------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `lunch-roulette` ⚠️ 중요! |
| **Build Command** | `npm run build` (기본값) |
| **Output Directory** | `dist` (기본값) |

### 3.3 환경 변수 설정

**Settings → Environment Variables**에서 추가:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://cofpgarbgzbptkduxonl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZnBnYXJiZ3picHRrZHV4b25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NTYyMDMsImV4cCI6MjA4NDIzMjIwM30.C5J_bE8Mj9WjNH74sPIlFvEhACngqdshy5Ql57S_T8U` |

> ⚠️ 환경 변수 추가 후 **Redeploy** 필요

### 3.4 배포 완료

**Deploy** 버튼 클릭 후 배포 완료되면 URL이 제공됩니다.

예: `https://stamp-tour-xxxxx.vercel.app`

---

## 4. SPA 라우팅 설정

React Router를 사용하는 SPA는 직접 URL 접근 시 404 에러가 발생할 수 있습니다.
이를 해결하기 위해 `vercel.json` 파일이 필요합니다.

### vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

위치: `lunch-roulette/vercel.json`

이 설정은 모든 경로 요청을 `index.html`로 리다이렉트하여 React Router가 라우팅을 처리할 수 있게 합니다.

---

## 5. Supabase URL 설정 (배포 후)

Supabase 대시보드에서 배포된 URL을 등록해야 합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Authentication** → **URL Configuration**
4. 다음 설정 업데이트:

| 항목 | 값 |
|------|-----|
| **Site URL** | `https://your-app.vercel.app` |
| **Redirect URLs** | `https://your-app.vercel.app/**` |

---

## 6. 직원 사용 방법

### 6.1 URL 공유

배포된 URL을 직원들에게 공유합니다:
- 이메일, 메신저, QR코드 등

### 6.2 홈화면에 추가 (앱처럼 사용)

#### iPhone (Safari)
1. Safari에서 URL 접속
2. 하단 **공유 버튼** (↑ 아이콘) 탭
3. **홈 화면에 추가** 선택
4. 이름 입력 후 **추가** 탭

#### Android (Chrome)
1. Chrome에서 URL 접속
2. 우측 상단 **⋮ 메뉴** 탭
3. **홈 화면에 추가** 선택
4. **추가** 탭

---

## 7. 자동 배포

GitHub `main` 브랜치에 푸시하면 Vercel이 자동으로 재배포합니다.

```bash
# 코드 수정 후
git add .
git commit -m "Update feature"
git push origin main
# → Vercel 자동 배포 시작 (약 1-2분)
```

---

## 8. 트러블슈팅

### 404 Not Found 에러

**원인**: SPA 라우팅 미설정 또는 Root Directory 설정 오류

**해결**:
1. `vercel.json` 파일 확인
2. Vercel Settings → Root Directory가 `lunch-roulette`인지 확인
3. Redeploy 실행

### 환경 변수 미적용

**원인**: 환경 변수 추가 후 재배포하지 않음

**해결**:
1. Vercel Dashboard → Settings → Environment Variables 확인
2. Deployments 탭 → 최신 배포 → **⋯** → **Redeploy**

### 로그인/회원가입 실패

**원인**: Supabase URL Configuration 미설정

**해결**:
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL과 Redirect URLs에 Vercel URL 추가

---

## 9. 커스텀 도메인 (선택)

Vercel에서 커스텀 도메인을 연결할 수 있습니다.

1. Vercel Dashboard → Settings → Domains
2. **Add** 클릭
3. 도메인 입력 (예: `lunch.company.com`)
4. DNS 설정:
   - **CNAME**: `cname.vercel-dns.com`
   - 또는 **A Record**: `76.76.19.19`

---

## 10. 배포 체크리스트

### 배포 전
- [ ] 로컬에서 `npm run build` 성공 확인
- [ ] `.env.local` 환경 변수 확인
- [ ] `vercel.json` 파일 존재 확인
- [ ] GitHub에 최신 코드 푸시

### 배포 후
- [ ] Vercel URL 접속 확인
- [ ] 회원가입/로그인 테스트
- [ ] 매칭 신청 테스트
- [ ] 홈화면 추가 후 실행 테스트
- [ ] Supabase URL Configuration 업데이트

---

## 11. 현재 배포 정보

| 항목 | 값 |
|------|-----|
| GitHub Repo | https://github.com/nalssi89/Stamp_tour |
| Supabase Project | https://cofpgarbgzbptkduxonl.supabase.co |
| Vercel URL | (배포 후 확인) |

---

## 작성일
2026년 1월 18일
