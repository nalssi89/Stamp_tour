import { useState, useEffect } from 'react'
import { BarChart3, Calendar, Users, TrendingUp, Utensils, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS } from '../../constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

export default function AdminStats() {
  const [period, setPeriod] = useState('month') // 'week' | 'month' | 'all'
  const [stats, setStats] = useState({
    totalParticipations: 0,
    averageGroupSize: 0,
    crossDeptRate: 0,
    dailyData: [],
    departmentData: [],
    topParticipants: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)

    try {
      let startDate, endDate
      const now = new Date()

      if (period === 'week') {
        startDate = format(subDays(now, 7), 'yyyy-MM-dd')
        endDate = format(now, 'yyyy-MM-dd')
      } else if (period === 'month') {
        startDate = format(startOfMonth(now), 'yyyy-MM-dd')
        endDate = format(endOfMonth(now), 'yyyy-MM-dd')
      } else {
        startDate = format(subMonths(now, 12), 'yyyy-MM-dd')
        endDate = format(now, 'yyyy-MM-dd')
      }

      // 점심 기록 조회
      const { data: records, error: recordsError } = await supabase
        .from('lunch_records')
        .select(`
          id,
          record_date,
          recorder_id,
          profiles:recorder_id (id, name, department),
          lunch_participants (
            participant_id,
            profiles:participant_id (id, name, department)
          )
        `)
        .gte('record_date', startDate)
        .lte('record_date', endDate)

      if (recordsError) throw recordsError

      // 매칭 그룹 조회
      const { data: groups, error: groupsError } = await supabase
        .from('match_groups')
        .select(`
          id,
          match_date,
          match_group_members (
            user_id,
            profiles:user_id (department)
          )
        `)
        .gte('match_date', startDate)
        .lte('match_date', endDate)

      if (groupsError) throw groupsError

      // 통계 계산
      const totalParticipations = records?.length || 0

      // 평균 그룹 크기
      const groupSizes = groups?.map(g => g.match_group_members?.length || 0) || []
      const averageGroupSize = groupSizes.length > 0
        ? (groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length).toFixed(1)
        : 0

      // 타과 교류 비율
      let crossDeptGroups = 0
      groups?.forEach(group => {
        const depts = new Set(group.match_group_members?.map(m => m.profiles?.department))
        if (depts.size >= 2) crossDeptGroups++
      })
      const crossDeptRate = groups?.length > 0
        ? Math.round((crossDeptGroups / groups.length) * 100)
        : 0

      // 일별 데이터
      const dailyMap = new Map()
      let dateRange

      if (period === 'week') {
        dateRange = eachDayOfInterval({
          start: subDays(now, 7),
          end: now,
        })
      } else if (period === 'month') {
        dateRange = eachDayOfInterval({
          start: startOfMonth(now),
          end: now,
        })
      } else {
        // 월별로 집계
        dateRange = []
        for (let i = 11; i >= 0; i--) {
          dateRange.push(subMonths(now, i))
        }
      }

      if (period === 'all') {
        // 월별 집계
        const monthlyMap = new Map()
        records?.forEach(record => {
          const month = format(new Date(record.record_date), 'yyyy-MM')
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1)
        })

        const dailyData = dateRange.map(date => {
          const month = format(date, 'yyyy-MM')
          return {
            date: format(date, 'M월', { locale: ko }),
            count: monthlyMap.get(month) || 0,
          }
        })
        stats.dailyData = dailyData
      } else {
        records?.forEach(record => {
          const date = record.record_date
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
        })

        const dailyData = dateRange.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd')
          return {
            date: period === 'week'
              ? format(date, 'E', { locale: ko })
              : format(date, 'd일', { locale: ko }),
            count: dailyMap.get(dateStr) || 0,
          }
        })
        stats.dailyData = dailyData
      }

      // 부서별 데이터
      const deptMap = new Map()
      DEPARTMENTS.forEach(dept => deptMap.set(dept, 0))

      records?.forEach(record => {
        const dept = record.profiles?.department
        if (dept) {
          deptMap.set(dept, (deptMap.get(dept) || 0) + 1)
        }
      })

      const departmentData = Array.from(deptMap.entries()).map(([name, value]) => ({
        name,
        value,
      }))

      // 상위 참여자
      const participantMap = new Map()
      records?.forEach(record => {
        const user = record.profiles
        if (user) {
          if (!participantMap.has(user.id)) {
            participantMap.set(user.id, { ...user, count: 0 })
          }
          participantMap.get(user.id).count++
        }
      })

      const topParticipants = Array.from(participantMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setStats({
        totalParticipations,
        averageGroupSize,
        crossDeptRate,
        dailyData: stats.dailyData || [],
        departmentData,
        topParticipants,
      })
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
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center">
          <BarChart3 className="w-7 h-7 mr-2" />
          통계 조회
        </h1>
        <p className="mt-1 text-purple-100">
          점심 룰렛 참여 현황 분석
        </p>
      </div>

      {/* 기간 선택 */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        <button
          onClick={() => setPeriod('week')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            period === 'week'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          최근 7일
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            period === 'month'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          이번 달
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            period === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          연간
        </button>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Utensils className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalParticipations}
              </p>
              <p className="text-sm text-gray-500">총 인증 횟수</p>
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
                {stats.averageGroupSize}명
              </p>
              <p className="text-sm text-gray-500">평균 그룹 크기</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.crossDeptRate}%
              </p>
              <p className="text-sm text-gray-500">타과 교류율</p>
            </div>
          </div>
        </div>
      </div>

      {/* 참여 추이 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          {period === 'week' ? '일별' : period === 'month' ? '일별' : '월별'} 참여 추이
        </h2>
        {stats.dailyData?.some(d => d.count > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value}회`, '인증']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            해당 기간에 데이터가 없습니다
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 부서별 분포 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            부서별 참여 분포
          </h2>
          {stats.departmentData?.some(d => d.value > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.departmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              해당 기간에 데이터가 없습니다
            </p>
          )}
          <div className="flex justify-center gap-4 mt-4">
            {stats.departmentData?.map((dept, index) => (
              <div key={dept.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-600">{dept.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 상위 참여자 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            상위 참여자
          </h2>
          {stats.topParticipants?.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.topParticipants.map((person, index) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-200 text-gray-600'
                        : index === 2
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {person.name?.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{person.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      person.department === '기획과'
                        ? 'bg-purple-100 text-purple-700'
                        : person.department === '기술과'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {person.department}
                    </span>
                    <span className="text-sm font-medium text-purple-600">
                      {person.count}회
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              해당 기간에 참여자가 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
