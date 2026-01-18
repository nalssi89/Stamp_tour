import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Utensils, Trophy, TrendingUp } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { ROUTES, MATCH_STATUS } from '../../constants'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function Dashboard() {
  const { profile } = useAuth()
  const [todayMatch, setTodayMatch] = useState(null)
  const [todayGroup, setTodayGroup] = useState(null)
  const [stats, setStats] = useState({ totalMatches: 0, uniquePeople: 0 })
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (profile?.id) {
      fetchTodayData()
      fetchStats()
    }
  }, [profile?.id])

  const fetchTodayData = async () => {
    try {
      // 오늘의 매칭 신청 확인
      const { data: matchRequest } = await supabase
        .from('match_requests')
        .select('*')
        .eq('user_id', profile.id)
        .eq('request_date', today)
        .single()

      setTodayMatch(matchRequest)

      // 오늘의 매칭 그룹 확인
      if (matchRequest?.status === MATCH_STATUS.MATCHED) {
        const { data: groupMember } = await supabase
          .from('match_group_members')
          .select(`
            group_id,
            match_groups!inner(id, match_date, group_number),
            profiles:user_id(id, name, department)
          `)
          .eq('user_id', profile.id)
          .eq('match_groups.match_date', today)
          .single()

        if (groupMember) {
          // 같은 그룹의 다른 멤버들 조회
          const { data: groupMembers } = await supabase
            .from('match_group_members')
            .select('profiles:user_id(id, name, department)')
            .eq('group_id', groupMember.group_id)
            .neq('user_id', profile.id)

          setTodayGroup({
            ...groupMember.match_groups,
            members: groupMembers?.map((m) => m.profiles) || [],
          })
        }
      }
    } catch (error) {
      console.error('Error fetching today data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // 총 참여 횟수
      const { count: totalMatches } = await supabase
        .from('lunch_records')
        .select('*', { count: 'exact', head: true })
        .eq('recorder_id', profile.id)

      // 만난 고유 인원 수
      const { data: participants } = await supabase
        .from('lunch_participants')
        .select('participant_id, lunch_records!inner(recorder_id)')
        .eq('lunch_records.recorder_id', profile.id)

      const uniquePeople = new Set(participants?.map((p) => p.participant_id) || []).size

      setStats({ totalMatches: totalMatches || 0, uniquePeople })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 인사말 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">안녕하세요, {profile?.name}님!</h1>
        <p className="mt-1 text-blue-100">
          {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
        </p>
        <div className="mt-4 flex items-center space-x-2">
          <Trophy className="w-5 h-5" />
          <span className="font-medium">{profile?.total_points || 0} 포인트</span>
        </div>
      </div>

      {/* 오늘의 매칭 상태 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘의 점심</h2>

        {!todayMatch ? (
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">아직 매칭을 신청하지 않았어요</p>
            <Link
              to={ROUTES.MATCH_REQUEST}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              매칭 신청하기
            </Link>
          </div>
        ) : todayMatch.status === MATCH_STATUS.PENDING ? (
          <div className="text-center py-6">
            <div className="animate-pulse">
              <Users className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            </div>
            <p className="text-gray-600 font-medium">매칭 대기 중</p>
            <p className="text-sm text-gray-500 mt-1">11시에 매칭 결과가 발표됩니다</p>
          </div>
        ) : todayMatch.status === MATCH_STATUS.MATCHED && todayGroup ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                매칭 완료!
              </span>
              <span className="text-sm text-gray-500">그룹 {todayGroup.group_number}</span>
            </div>
            <div className="space-y-3">
              {todayGroup.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium">{member.name}</span>
                  <span className="text-sm text-gray-500 px-2 py-0.5 bg-white rounded">
                    {member.department}
                  </span>
                </div>
              ))}
            </div>
            <Link
              to={ROUTES.LUNCH_RECORD}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Utensils className="w-4 h-4 mr-2" />
              점심 인증하기
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">매칭이 취소되었습니다</p>
          </div>
        )}
      </div>

      {/* 간단 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Utensils className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
              <p className="text-sm text-gray-500">총 참여</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.uniquePeople}</p>
              <p className="text-sm text-gray-500">만난 사람</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
