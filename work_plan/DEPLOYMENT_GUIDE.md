# 배포 가이드

## 1. 사전 준비

### Supabase 설정 확인
- [ ] 모든 테이블 생성 완료
- [ ] Storage 버킷 (`lunch-photos`) 생성
- [ ] 이메일 확인 비활성화 (또는 Site URL 설정)
- [ ] 관리자 계정 설정

### 코드 정리
- [ ] 디버그 console.log 제거
- [ ] 환경 변수 확인
- [ ] 빌드 테스트

---

## 2. 빌드

```bash
cd lunch-roulette
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## 3. 배포 옵션

### 옵션 A: Vercel (권장)

1. [Vercel](https://vercel.com) 가입/로그인
2. GitHub 저장소 연결 또는 CLI 사용
3. 환경 변수 설정:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 배포

```bash
# Vercel CLI 사용 시
npm i -g vercel
vercel
```

### 옵션 B: Netlify

1. [Netlify](https://netlify.com) 가입/로그인
2. `dist/` 폴더 드래그 앤 드롭 또는 Git 연동
3. 환경 변수 설정
4. 배포

### 옵션 C: 자체 서버

```bash
# 빌드 후 dist 폴더를 웹 서버로 서빙
# Nginx 예시
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/lunch-roulette/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 4. Supabase URL 설정

배포 후 Supabase 대시보드에서 URL 설정 업데이트:

1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://yourdomain.com`
3. **Redirect URLs**에 추가:
   - `https://yourdomain.com`
   - `https://yourdomain.com/**`

---

## 5. RLS 활성화 (보안)

배포 후 RLS를 활성화하여 데이터 보안 강화:

```sql
-- SQL Editor에서 실행
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- 정책 추가 (DATABASE_SETUP.md 참고)
```

---

## 6. 모니터링

### Supabase 대시보드
- Database → 쿼리 성능
- Auth → 사용자 활동
- Storage → 용량 확인

### 애플리케이션 로그
- Vercel/Netlify 대시보드에서 확인

---

## 7. 도메인 연결 (선택)

### Vercel
1. Settings → Domains
2. 도메인 추가
3. DNS 설정 (CNAME 또는 A 레코드)

### Netlify
1. Domain settings
2. Add custom domain
3. DNS 설정

---

## 체크리스트

배포 전:
- [ ] 빌드 성공 확인
- [ ] 환경 변수 설정
- [ ] Supabase 테이블/정책 확인

배포 후:
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 매칭 신청 테스트
- [ ] 관리자 기능 테스트
- [ ] RLS 활성화
- [ ] Site URL 업데이트
