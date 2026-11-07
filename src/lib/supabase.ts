import { createClient } from '@supabase/supabase-js'

// 공개 키(publishable)만 쓴다. 화면 코드에 들어가는 값이라 비밀이 아니다.
// 비밀 키(service role)는 이 앱에서 쓰지 않는다.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null
