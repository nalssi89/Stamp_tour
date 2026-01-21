// 11시 자동 매칭 Edge Function
// Supabase Edge Function으로 배포하여 cron으로 실행

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Profile {
  id: string
  name: string
  department: string
}

interface MatchRequest {
  id: string
  user_id: string
  profiles: Profile
}

// 매칭 알고리즘: 타과 교류 우선
function createGroups(requests: MatchRequest[]): MatchRequest[][] {
  // 부서별로 분류
  const byDept: Record<string, MatchRequest[]> = {}

  for (const req of requests) {
    const dept = req.profiles.department
    if (!byDept[dept]) byDept[dept] = []
    byDept[dept].push(req)
  }

  // 각 부서 셔플
  for (const dept in byDept) {
    byDept[dept] = shuffle(byDept[dept])
  }

  const departments = Object.keys(byDept)
  const groups: MatchRequest[][] = []

  // Round-Robin으로 그룹 생성 (3-4명)
  let hasMore = true
  while (hasMore) {
    const group: MatchRequest[] = []

    // 각 부서에서 1명씩 선택
    for (const dept of departments) {
      if (byDept[dept].length > 0) {
        group.push(byDept[dept].shift()!)
      }
    }

    if (group.length >= 3) {
      groups.push(group)
    } else if (group.length > 0) {
      // 남은 인원을 기존 그룹에 배분
      for (const person of group) {
        if (groups.length > 0) {
          // 가장 적은 인원의 그룹에 추가 (최대 4명)
          const smallestGroup = groups
            .filter(g => g.length < 4)
            .sort((a, b) => a.length - b.length)[0]

          if (smallestGroup) {
            smallestGroup.push(person)
          } else {
            // 모든 그룹이 4명이면 새 그룹 생성
            groups.push([person])
          }
        } else {
          groups.push([person])
        }
      }
      hasMore = false
    } else {
      hasMore = false
    }
  }

  // 2명 이하 그룹 처리
  const validGroups = groups.filter(g => g.length >= 2)
  const invalidGroups = groups.filter(g => g.length < 2)

  for (const invalid of invalidGroups) {
    for (const person of invalid) {
      const target = validGroups
        .filter(g => g.length < 4)
        .sort((a, b) => a.length - b.length)[0]

      if (target) {
        target.push(person)
      }
    }
  }

  return validGroups
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

Deno.serve(async (req) => {
  try {
    // 오늘 날짜 (KST)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstDate = new Date(now.getTime() + kstOffset)
    const today = kstDate.toISOString().split('T')[0]

    console.log(`[${today}] Starting auto-match...`)

    // 오늘의 pending 상태 신청자 조회
    const { data: requests, error: fetchError } = await supabase
      .from('match_requests')
      .select(`
        id,
        user_id,
        profiles:user_id (
          id,
          name,
          department
        )
      `)
      .eq('request_date', today)
      .eq('status', 'pending')

    if (fetchError) {
      throw new Error(`Failed to fetch requests: ${fetchError.message}`)
    }

    if (!requests || requests.length < 2) {
      console.log(`Not enough requests (${requests?.length || 0}). Skipping.`)
      return new Response(
        JSON.stringify({ success: true, message: 'Not enough requests', count: requests?.length || 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${requests.length} pending requests`)

    // 그룹 생성
    const groups = createGroups(requests as MatchRequest[])

    console.log(`Created ${groups.length} groups`)

    // DB에 그룹 저장
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const groupNumber = i + 1

      // match_groups 생성
      const { data: matchGroup, error: groupError } = await supabase
        .from('match_groups')
        .insert({
          match_date: today,
          group_number: groupNumber,
        })
        .select()
        .single()

      if (groupError) {
        console.error(`Failed to create group ${groupNumber}:`, groupError)
        continue
      }

      // match_group_members 생성
      const members = group.map(req => ({
        group_id: matchGroup.id,
        user_id: req.user_id,
      }))

      const { error: membersError } = await supabase
        .from('match_group_members')
        .insert(members)

      if (membersError) {
        console.error(`Failed to add members to group ${groupNumber}:`, membersError)
        continue
      }

      // match_requests 상태 업데이트
      const userIds = group.map(req => req.user_id)
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ status: 'matched' })
        .eq('request_date', today)
        .in('user_id', userIds)

      if (updateError) {
        console.error(`Failed to update request status:`, updateError)
      }

      console.log(`Group ${groupNumber}: ${group.map(r => r.profiles.name).join(', ')}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-match completed',
        totalRequests: requests.length,
        groupsCreated: groups.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto-match error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
