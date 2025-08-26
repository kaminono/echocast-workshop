import { POST as GeneratePost } from '@/app/api/locale-variant/[finalScriptId]/[locale]/generate/route'

// 复用生成逻辑，允许对 failed 或空白状态进行重试
export const POST = GeneratePost

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


