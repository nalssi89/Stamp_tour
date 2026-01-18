import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Utensils, Calendar, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { ROUTES } from '../../constants'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function MatchResult() {
  const { profile } = useAuth()
  const [myGroup, setMyGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    if (profile?.id) {
      fetchMyGroup()
    }
  }, [profile?.id, selectedDate])

  const fetchMyGroup = async () => {
    setLoading(true)

    try {
      // 내가 속한 그룹 찾기
      const { data: memberData, error: memberError } = await supabase
        .from('match_group_members')
        .select(`
          group_id,
          match_groups!inner (
            id,
            match_date,
            group_number
          )
        `)
        .eq('user_id', profile.id)
        .eq('match_groups.match_date', selectedDate)
        .single()

      if (memberError || !memberData) {
        setMyGroup(null)
        setGroupMembers([])
        setLoading(false)
        return
      }

      setMyGroup(memberData.match_groups)

      // 같은 그룹의 모든 멤버 조회
      const { data: membersData, error: membersError } = await supabase
        .from('match_group_members')
        .select(`
          profiles:user_id (
            id,
            name,
            department,
            employee_number
          )
        `)
        .eq('group_id', memberData.group_id)

      if (!membersError && membersData) {
        setGroupMembers(membersData.map(m => m.profiles))
      }
    } catch (error) {
      console.error('Error fetching group:', error)
    } finally {
      setLoading(false)
    }
  }

  // 날짜 변경 핸들러
  const handleDateChange = (days) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(format(date, 'yyyy-MM-dd'))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')
  const otherMembers = groupMembers.filter(m => m.id !== profile?.id)

  return (
    <div className="space-y-6">
      {/* 날짜 선택 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {format(new Date(selectedDate), 'yyyy년 M월 d일', { locale: ko })}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(selectedDate), 'EEEE', { locale: ko })}
              {isToday && <span className="ml-2 text-blue-600 text-sm">(오늘)</span>}
            </p>
          </div>
          <button
            onClick={() => handleDateChange(1)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={isToday}
          >
            →
          </button>
        </div>
      </div>

      {/* 매칭 결과 */}
      {myGroup ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* 그룹 헤더 */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">매칭 완료</p>
                <h2 className="text-2xl font-bold">그룹 {myGroup.group_number}</h2>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* 그룹 멤버 목록 */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              함께하는 동료 ({groupMembers.length}명)
            </h3>
            <div className="space-y-3">
              {groupMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    member.id === profile?.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                      {member.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.name}
                        {member.id === profile?.id && (
                          <span className="ml-2 text-xs text-blue-600">(나)</span>
                        )}
                      </p>
                      {member.employee_number && (
                        <p className="text-xs text-gray-500">
                          사번: {member.employee_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    member.department === '기획과'
                      ? 'bg-purple-100 text-purple-700'
                      : member.department === '기술과'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {member.department}
                  </span>
                </div>
              ))}
            </div>

            {/* 타과 교류 표시 */}
            {(() => {
              const departments = new Set(groupMembers.map(m => m.department))
              const hasCrossDept = departments.size >= 2
              return hasCrossDept && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  🎉 타과 교류 매칭! {departments.size}개 부서가 함께합니다
                </div>
              )
            })()}

            {/* 점심 인증 버튼 */}
            {isToday && (
              <Link
                to={ROUTES.LUNCH_RECORD}
                className="mt-6 w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <Utensils className="w-5 h-5 mr-2" />
                점심 인증하기
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">매칭 결과 없음</h2>
          <p className="text-gray-500 mt-2">
            {isToday
              ? '오늘은 아직 매칭이 완료되지 않았습니다'
              : '해당 날짜에 매칭 기록이 없습니다'}
          </p>
          {isToday && (
            <Link
              to={ROUTES.MATCH_REQUEST}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              매칭 신청하러 가기
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
