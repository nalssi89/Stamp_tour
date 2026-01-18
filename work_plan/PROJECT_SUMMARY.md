# 점심 룰렛 (Lunch Roulette) 프로젝트 요약

## 프로젝트 개요

수치예보센터(약 100명, 3개 부서) 직원들을 위한 랜덤 점심 매칭 웹 애플리케이션

### 목적
- 부서 간 교류 활성화
- 새로운 동료와의 점심 기회 제공
- 포인트/랭킹 시스템으로 참여 동기 부여

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (@tailwindcss/vite) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Routing | React Router v6 |
| Charts | Recharts |
| Icons | Lucide React |
| Date | date-fns |

---

## 프로젝트 구조

```
lunch-roulette/
├── .env.local                    # Supabase 환경 변수
├── vite.config.js
├── tailwind.config.js
├── package.json
├── src/
│   ├── App.jsx                   # 라우팅 설정
│   ├── main.jsx
│   ├── index.css
│   ├── lib/
│   │   └── supabase.js           # Supabase 클라이언트
│   ├── constants/
│   │   └── index.js              # 상수 (부서, 상태, 포인트, 라우트)
│   ├── hooks/
│   │   └── useAuth.jsx           # 인증 Context Provider
│   ├── utils/
│   │   └── matchingAlgorithm.js  # 매칭 알고리즘
│   └── components/
│       ├── auth/
│       │   ├── LoginForm.jsx
│       │   ├── SignUpForm.jsx
│       │   └── ProtectedRoute.jsx
│       ├── common/
│       │   ├── Layout.jsx
│       │   ├── Header.jsx
│       │   └── Navigation.jsx
│       ├── user/
│       │   ├── Dashboard.jsx
│       │   ├── MatchRequest.jsx
│       │   ├── MatchResult.jsx
│       │   ├── LunchRecord.jsx
│       │   ├── MyStats.jsx
│       │   └── Ranking.jsx
│       └── admin/
│           ├── AdminDashboard.jsx
│           ├── EmployeeManagement.jsx
│           ├── MatchingManagement.jsx
│           └── AdminStats.jsx
└── supabase/
    └── migrations/
        ├── 001_create_profiles.sql
        ├── 002_create_match_tables.sql
        ├── 003_create_lunch_tables.sql
        ├── 004_create_point_history.sql
        └── 005_create_rls_policies.sql
```

---

## 데이터베이스 스키마

### 테이블 구조

#### profiles
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | auth.users 연동 |
| name | VARCHAR(50) | 이름 |
| email | VARCHAR(255) | 이메일 |
| department | ENUM | 기획과, 기술과, 활용팀 |
| employee_number | VARCHAR(20) | 사번 |
| is_active | BOOLEAN | 활성 상태 |
| is_admin | BOOLEAN | 관리자 여부 |
| total_points | INTEGER | 총 포인트 |

#### match_requests
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| user_id | UUID (FK) | profiles.id |
| request_date | DATE | 신청 날짜 |
| status | ENUM | pending, matched, cancelled |

#### match_groups
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| match_date | DATE | 매칭 날짜 |
| group_number | INTEGER | 그룹 번호 |

#### match_group_members
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| group_id | UUID (FK) | match_groups.id |
| user_id | UUID (FK) | profiles.id |

#### lunch_records
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| recorder_id | UUID (FK) | 기록자 |
| group_id | UUID (FK) | 매칭 그룹 (nullable) |
| record_date | DATE | 기록 날짜 |
| comment | TEXT | 한줄평 |
| photo_url | TEXT | 사진 URL |

#### lunch_participants
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| record_id | UUID (FK) | lunch_records.id |
| participant_id | UUID (FK) | 참여자 |

#### point_history
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| user_id | UUID (FK) | profiles.id |
| points | INTEGER | 포인트 |
| reason | ENUM | 적립 사유 |
| reference_id | UUID | 관련 ID |

---

## 주요 기능

### 사용자 기능

1. **회원가입/로그인**
   - 이메일/비밀번호 인증
   - 프로필 설정 (이름, 부서, 사번)

2. **대시보드**
   - 오늘의 매칭 상태 확인
   - 매칭 그룹 멤버 표시
   - 간단 통계 (총 참여, 만난 사람)

3. **매칭 신청**
   - 오늘의 점심 매칭 신청/취소
   - 실시간 신청자 수 표시
   - 마감 시간 안내

4. **매칭 결과**
   - 날짜별 매칭 결과 조회
   - 그룹 멤버 정보 표시
   - 타과 교류 여부 표시

5. **점심 인증**
   - 함께 식사한 사람 선택
   - 한줄평 작성 (선택)
   - 사진 업로드 (선택)

6. **내 통계**
   - 총 참여 횟수
   - 만난 사람 수
   - 타과 교류 비율
   - 월별 참여 추이 차트
   - 만난 사람 목록

7. **랭킹**
   - 이번 달 / 전체 랭킹
   - TOP 3 시각화
   - 내 순위 표시

### 관리자 기능

1. **관리자 대시보드**
   - 오늘 현황 (신청, 매칭, 인증)
   - 빠른 메뉴 (직원/매칭/통계)
   - 시스템 정보

2. **직원 관리**
   - 직원 목록 조회 (검색, 필터)
   - 직원 추가/수정/삭제
   - 활성/비활성 상태 변경

3. **매칭 관리**
   - 날짜별 신청자 목록
   - 매칭 실행/재실행
   - 매칭 그룹 결과 확인

4. **통계 조회**
   - 기간별 참여 추이 (7일/월간/연간)
   - 부서별 참여 분포
   - 상위 참여자 목록

---

## 매칭 알고리즘

```javascript
// 타과 교류 우선 매칭 (Round-Robin 방식)
1. 부서별로 사용자 그룹화
2. 각 부서에서 라운드 로빈으로 한 명씩 선택
3. 3-4명 그룹 구성
4. 남은 인원 재배치
```

---

## 포인트 시스템

| 활동 | 포인트 |
|------|--------|
| 매칭 신청 | +1 |
| 점심 인증 | +3 |
| 타과 교류 | +2/인 |
| 첫 만남 | +3/인 |
| 한줄평 작성 | +1 |
| 사진 업로드 | +1 |

---

## Supabase 설정

### 환경 변수 (.env.local)
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 필수 설정
1. **Authentication** → **Providers** → **Email** → **Confirm email** OFF
2. **Storage** → `lunch-photos` 버킷 생성 (Public)
3. **SQL Editor**에서 마이그레이션 실행

### RLS 정책
- 현재 개발 단계에서는 비활성화
- 배포 전 활성화 필요

---

## 실행 방법

### 개발 서버
```bash
cd lunch-roulette
npm install
npm run dev
```

### 빌드
```bash
npm run build
```

### 관리자 설정
```sql
UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';
```

---

## 해결된 이슈

1. **RLS 정책 무한 재귀** - profiles 테이블 정책에서 자기 참조 시 발생
   - 해결: RLS 임시 비활성화, 배포 시 수정된 정책 적용

2. **회원가입 후 프로필 저장 실패** - 이메일 확인 활성화 시 세션 미생성
   - 해결: Supabase에서 이메일 확인 비활성화

3. **환경 변수 미적용** - 잘못된 anon key 사용
   - 해결: JWT 형식의 올바른 anon key로 교체

4. **브라우저 캐시 문제** - 이전 세션 정보 잔존
   - 해결: Local Storage 클리어 또는 강력 새로고침

---

## 추후 개선 사항

1. RLS 정책 재설정 및 활성화
2. 포인트 자동 적립 로직 구현 (Edge Functions)
3. 푸시 알림 (매칭 결과, 점심 시간 알림)
4. 실제 도메인 배포 및 Site URL 설정
5. 사진 업로드 최적화 (리사이징)
6. 매칭 히스토리 기반 중복 방지

---

## 작성일
2026년 1월 18일
