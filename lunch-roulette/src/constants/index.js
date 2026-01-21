// 부서 목록
export const DEPARTMENTS = ['수치예보기획과', '수치예보기술과', '수치예보활용팀']

// 매칭 상태
export const MATCH_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  CANCELLED: 'cancelled',
}

// 포인트 규칙
export const POINTS = {
  MATCH_REQUEST: 1,      // 매칭 신청
  LUNCH_VERIFIED: 3,     // 점심 인증 완료
  CROSS_DEPT: 2,         // 타과 인원과 식사 (인당)
  FIRST_MEET: 3,         // 처음 만나는 사람과 식사 (인당)
  COMMENT: 1,            // 한줄평 작성
  PHOTO: 1,              // 사진 업로드
}

// 포인트 적립 사유
export const POINT_REASONS = {
  MATCH_REQUEST: 'match_request',
  LUNCH_VERIFIED: 'lunch_verified',
  CROSS_DEPT: 'cross_dept',
  FIRST_MEET: 'first_meet',
  COMMENT: 'comment',
  PHOTO: 'photo',
}

// 매칭 설정
export const MATCHING_CONFIG = {
  MIN_GROUP_SIZE: 3,
  MAX_GROUP_SIZE: 4,
  DEADLINE_HOUR: 11,  // 오전 11시 마감
}

// 라우트 경로
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  MATCH_REQUEST: '/match/request',
  MATCH_RESULT: '/match/result',
  LUNCH_RECORD: '/lunch/record',
  MY_STATS: '/stats',
  RANKING: '/ranking',
  ADMIN: '/admin',
  ADMIN_EMPLOYEES: '/admin/employees',
  ADMIN_MATCHING: '/admin/matching',
  ADMIN_STATS: '/admin/stats',
}
