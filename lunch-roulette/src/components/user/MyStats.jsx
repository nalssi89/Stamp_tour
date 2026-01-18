import { useState, useEffect } from 'react'
import { Users, Utensils, Trophy, TrendingUp, Calendar } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function MyStats() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalParticipations: 0,
    uniquePeople: 0,
    crossDeptRate: 0,
    monthlyData: [],
  })
  const [metPeople, setMetPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchStats()
    }
  }, [profile?.id])

  const fetchStats = async () => {
    try {
      // 1. 내가 기록한 점심 인증 조회
      const { data: records, error: recordsError } = await supabase
        .from('lunch_records')
        .select(`
          id,
          record_date,
          lunch_participants (
            participant_id,
            profiles:participant_id (id, name, department)
          )
        `)
        .eq('recorder_id', profile.id)
        .order('record_date', { ascending: false })

      if (recordsError) throw recordsError

      // 2. 통계 계산
      const totalParticipations = records?.length || 0

      // 만난 사람 집계
      const peopleMap = new Map()
      let crossDeptCount = 0

      records?.forEach(record => {
        record.lunch_participants?.forEach(p => {
          const participant = p.profiles
          if (participant) {
            if (!peopleMap.has(participant.id)) {
              peopleMap.set(participant.id, {
                ...participant,
                meetCount: 0,
              })
            }
            peopleMap.get(participant.id).meetCount++

            // 타과 여부 체크
            if (participant.department !== profile.department) {
              crossDeptCount++
            }
          }
        })
      })

      const uniquePeople = peopleMap.size
      const totalMeetings = Array.from(peopleMap.values()).reduce(
        (sum, p) => sum + p.meetCount,
        0
      )
      const crossDeptRate = totalMeetings > 0
        ? Math.round((crossDeptCount / totalMeetings) * 100)
        : 0

      // 최근 6개월 월별 데이터
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i)
        const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd')

        const monthRecords = records?.filter(r => {
          return r.record_date >= monthStart && r.record_date <= monthEnd
        }) || []

        monthlyData.push({
          month: format(monthDate, 'M월', { locale: ko }),
          count: monthRecords.length,
        })
      }

      setStats({
        totalParticipations,
        uniquePeople,
        crossDeptRate,
        monthlyData,
      })

      // 만난 사람 목록 (만난 횟수 순)
      const sortedPeople = Array.from(peopleMap.values())
        .sort((a, b) => b.meetCount - a.meetCount)
        .slice(0, 20)

      setMetPeople(sortedPeople)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
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
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">내 통계</h1>
        <p className="mt-1 text-purple-100">{profile?.name}님의 활동 기록</p>
        <div className="mt-4 flex items-center space-x-2">
          <Trophy className="w-5 h-5" />
          <span className="font-medium">{profile?.total_points || 0} 포인트</span>
        </div>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Utensils className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalParticipations}
              </p>
              <p className="text-sm text-gray-500">총 참여 횟수</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.uniquePeople}
              </p>
              <p className="text-sm text-gray-500">만난 사람 수</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 col-span-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.crossDeptRate}%
              </p>
              <p className="text-sm text-gray-500">타과 교류 비율</p>
            </div>
          </div>
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.crossDeptRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 월별 참여 추이 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          월별 참여 추이
        </h2>
        {stats.monthlyData.some(d => d.count > 0) ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value}회`, '참여']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            아직 참여 기록이 없습니다
          </p>
        )}
      </div>

      {/* 만난 사람 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          만난 사람들
        </h2>

        {metPeople.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {metPeople.map((person, index) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400 w-6">
                    {index + 1}
                  </span>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                    {person.name?.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900">
                    {person.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    person.department === profile?.department
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {person.department}
                  </span>
                  <span className="text-sm text-blue-600 font-medium">
                    {person.meetCount}회
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            아직 만난 사람이 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
