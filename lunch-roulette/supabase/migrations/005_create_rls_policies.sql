-- ============================================
-- Row Level Security (RLS) 정책 설정
-- ============================================

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles 정책
-- ============================================

-- 모든 인증된 사용자가 프로필 조회 가능
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- 본인 프로필만 삽입 가능
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- match_requests 정책
-- ============================================

-- 모든 인증된 사용자가 매칭 요청 조회 가능
CREATE POLICY "match_requests_select_policy" ON match_requests
  FOR SELECT TO authenticated
  USING (true);

-- 본인 매칭 요청만 삽입 가능
CREATE POLICY "match_requests_insert_policy" ON match_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 매칭 요청만 수정 가능
CREATE POLICY "match_requests_update_policy" ON match_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 본인 매칭 요청만 삭제 가능
CREATE POLICY "match_requests_delete_policy" ON match_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- match_groups 정책
-- ============================================

-- 모든 인증된 사용자가 매칭 그룹 조회 가능
CREATE POLICY "match_groups_select_policy" ON match_groups
  FOR SELECT TO authenticated
  USING (true);

-- 관리자만 매칭 그룹 삽입 가능
CREATE POLICY "match_groups_insert_policy" ON match_groups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 관리자만 매칭 그룹 수정 가능
CREATE POLICY "match_groups_update_policy" ON match_groups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 관리자만 매칭 그룹 삭제 가능
CREATE POLICY "match_groups_delete_policy" ON match_groups
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============================================
-- match_group_members 정책
-- ============================================

-- 모든 인증된 사용자가 그룹 멤버 조회 가능
CREATE POLICY "match_group_members_select_policy" ON match_group_members
  FOR SELECT TO authenticated
  USING (true);

-- 관리자만 그룹 멤버 삽입 가능
CREATE POLICY "match_group_members_insert_policy" ON match_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============================================
-- lunch_records 정책
-- ============================================

-- 모든 인증된 사용자가 점심 기록 조회 가능
CREATE POLICY "lunch_records_select_policy" ON lunch_records
  FOR SELECT TO authenticated
  USING (true);

-- 본인 점심 기록만 삽입 가능
CREATE POLICY "lunch_records_insert_policy" ON lunch_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = recorder_id);

-- 본인 점심 기록만 수정 가능
CREATE POLICY "lunch_records_update_policy" ON lunch_records
  FOR UPDATE TO authenticated
  USING (auth.uid() = recorder_id);

-- 본인 점심 기록만 삭제 가능
CREATE POLICY "lunch_records_delete_policy" ON lunch_records
  FOR DELETE TO authenticated
  USING (auth.uid() = recorder_id);

-- ============================================
-- lunch_participants 정책
-- ============================================

-- 모든 인증된 사용자가 참여자 조회 가능
CREATE POLICY "lunch_participants_select_policy" ON lunch_participants
  FOR SELECT TO authenticated
  USING (true);

-- 본인이 기록한 점심의 참여자만 삽입 가능
CREATE POLICY "lunch_participants_insert_policy" ON lunch_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lunch_records
      WHERE lunch_records.id = record_id AND lunch_records.recorder_id = auth.uid()
    )
  );

-- ============================================
-- point_history 정책
-- ============================================

-- 본인 포인트 이력만 조회 가능
CREATE POLICY "point_history_select_policy" ON point_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 포인트 삽입은 서비스 역할(service_role)로만 가능
-- 일반 사용자는 직접 포인트를 추가할 수 없음
-- 서버 사이드 또는 Edge Functions에서 service_role key 사용

-- ============================================
-- Realtime 구독 설정
-- ============================================

-- 실시간 구독이 필요한 테이블 설정
ALTER PUBLICATION supabase_realtime ADD TABLE match_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE match_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE match_group_members;
