import { useState, useEffect } from 'react'
import { Trophy, Medal, Users, TrendingUp } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function Ranking() {
  const { profile } = useAuth()
  const [rankings, setRankings] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [period, setPeriod] = useState('month') // 'month' | 'all'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
  }, [period, profile?.id])

  const fetchRankings = async () => {
    setLoading(true)

    try {
      if (period === 'all') {
        // 전체 기간: profiles의 total_points 사용
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, department, total_points')
          .eq('is_active', true)
          .order('total_points', { ascending: false })
          .limit(50)

        if (error) throw error

        const rankedData = data?.map((user, index) => ({
          ...user,
          rank: index + 1,
          points: user.total_points,
        })) || []

        setRankings(rankedData)

        // 내 순위 찾기
        const myPosition = rankedData.find(r => r.id === profile?.id)
        setMyRank(myPosition || null)
      } else {
        // 월간: 이번 달 lunch_records 기준
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

        // 이번 달 점심 기록 조회
        const { data: records, error } = await supabase
          .from('lunch_records')
          .select(`
            recorder_id,
            profiles:recorder_id (id, name, department)
          `)
          .gte('record_date', monthStart)
          .lte('record_date', monthEnd)

        if (error) throw error

        // 사용자별 참여 횟수 집계
        const countMap = new Map()
        records?.forEach(record => {
          const userId = record.recorder_id
          const user = record.profiles
          if (user) {
            if (!countMap.has(userId)) {
              countMap.set(userId, { ...user, count: 0 })
            }
            countMap.get(userId).count++
          }
        })

        // 랭킹 정렬
        const rankedData = Array.from(countMap.values())
          .sort((a, b) => b.count - a.count)
          .map((user, index) => ({
            ...user,
            rank: index + 1,
            points: user.count * 3, // 참여당 3포인트로 가정
          }))
          .slice(0, 50)

        setRankings(rankedData)

        // 내 순위 찾기
        const myPosition = rankedData.find(r => r.id === profile?.id)
        setMyRank(myPosition || null)
      }
    } catch (error) {
      console.error('Error fetching rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-medium">{rank}</span>
    }
  }

  const getRankBgColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200'
      case 2:
        return 'bg-gray-50 border-gray-200'
      case 3:
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-white border-gray-200'
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
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center">
          <Trophy className="w-7 h-7 mr-2" />
          랭킹
        </h1>
        <p className="mt-1 text-yellow-100">
          {period === 'month'
            ? format(new Date(), 'yyyy년 M월', { locale: ko }) + ' 랭킹'
            : '전체 랭킹'}
        </p>
      </div>

      {/* 기간 선택 */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        <button
          onClick={() => setPeriod('month')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            period === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          이번 달
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            period === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
      </div>

      {/* 내 순위 */}
      {myRank && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 mb-2">내 순위</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getRankIcon(myRank.rank)}
              <div>
                <p className="font-semibold text-gray-900">{myRank.name}</p>
                <p className="text-sm text-gray-500">{myRank.department}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{myRank.points}</p>
              <p className="text-sm text-gray-500">포인트</p>
            </div>
          </div>
        </div>
      )}

      {/* 랭킹 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* TOP 3 */}
        {rankings.slice(0, 3).length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-center items-end space-x-4">
              {/* 2등 */}
              {rankings[1] && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold">
                    {rankings[1].name?.charAt(0)}
                  </div>
                  <Medal className="w-6 h-6 text-gray-400 mx-auto" />
                  <p className="font-medium text-gray-900 mt-1">{rankings[1].name}</p>
                  <p className="text-sm text-gray-500">{rankings[1].points}pt</p>
                </div>
              )}

              {/* 1등 */}
              {rankings[0] && (
                <div className="text-center -mt-4">
                  <div className="w-20 h-20 bg-yellow-200 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl font-bold ring-4 ring-yellow-400">
                    {rankings[0].name?.charAt(0)}
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-500 mx-auto" />
                  <p className="font-bold text-gray-900 mt-1">{rankings[0].name}</p>
                  <p className="text-sm text-yellow-600 font-medium">{rankings[0].points}pt</p>
                </div>
              )}

              {/* 3등 */}
              {rankings[2] && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold">
                    {rankings[2].name?.charAt(0)}
                  </div>
                  <Medal className="w-6 h-6 text-amber-600 mx-auto" />
                  <p className="font-medium text-gray-900 mt-1">{rankings[2].name}</p>
                  <p className="text-sm text-gray-500">{rankings[2].points}pt</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4등 이하 */}
        <div className="divide-y divide-gray-100">
          {rankings.slice(3).map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 ${
                user.id === profile?.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {getRankIcon(user.rank)}
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-medium">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.name}
                    {user.id === profile?.id && (
                      <span className="ml-2 text-xs text-blue-600">(나)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{user.department}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{user.points}</p>
                <p className="text-xs text-gray-500">포인트</p>
              </div>
            </div>
          ))}
        </div>

        {rankings.length === 0 && (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">아직 랭킹 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
