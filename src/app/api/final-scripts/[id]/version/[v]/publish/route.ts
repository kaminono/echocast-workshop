import { NextRequest, NextResponse } from 'next/server'
import { getVersion, updateFinalScript } from '@/lib/server-data'
import type { FinalScript } from '@/types/domain'

/**
 * 设置发布时间的请求参数
 */
interface SetPublishTimeRequest {
  publishAtUtc: string | null
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: string
  message: string
}

/**
 * 验证发布时间格式
 */
function validatePublishTime(publishAtUtc: string | null): { valid: boolean; error?: string } {
  if (publishAtUtc === null) {
    return { valid: true } // 清除发布时间是允许的
  }

  if (typeof publishAtUtc !== 'string') {
    return { valid: false, error: '发布时间格式错误' }
  }

  // 验证 ISO 8601 格式
  const date = new Date(publishAtUtc)
  if (isNaN(date.getTime())) {
    return { valid: false, error: '发布时间格式无效' }
  }

  // 验证是否为 UTC 格式（以 Z 结尾或包含时区信息）
  if (!publishAtUtc.endsWith('Z') && !publishAtUtc.includes('+') && !publishAtUtc.includes('-', 10)) {
    return { valid: false, error: '发布时间必须是 UTC 格式' }
  }

  return { valid: true }
}

/**
 * 更新 FinalScript 的发布时间
 */
async function updateFinalScriptPublishTime(
  finalScriptId: string, 
  versionNumber: number, 
  publishAtUtc: string | null
): Promise<FinalScript> {
  // 获取现有的 FinalScript
  const finalScript = await getVersion(finalScriptId, versionNumber)
  if (!finalScript) {
    throw new Error('定稿版本不存在')
  }

  // 更新发布时间和状态
  const updates = {
    publishAtUtc: publishAtUtc || undefined,
    publishStatus: publishAtUtc ? 'scheduled' as const : 'unscheduled' as const
  }

  // 调用数据库更新方法
  return await updateFinalScript(finalScript.id, updates)
}

/**
 * PUT /api/final-scripts/[id]/version/[v]/publish
 * 设置或更新指定版本的发布时间
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; v: string }> }
): Promise<NextResponse> {
  try {
    const { id: finalScriptId, v: versionStr } = await params

    // 验证参数
    if (!finalScriptId || !versionStr) {
      return NextResponse.json(
        { code: 'INVALID_PARAMS', message: '参数错误' } as ErrorResponse,
        { status: 400 }
      )
    }

    const versionNumber = parseInt(versionStr, 10)
    if (isNaN(versionNumber) || versionNumber < 1) {
      return NextResponse.json(
        { code: 'INVALID_VERSION', message: '版本号无效' } as ErrorResponse,
        { status: 400 }
      )
    }

    // 解析请求体
    let body: SetPublishTimeRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { code: 'INVALID_JSON', message: '请求格式错误' } as ErrorResponse,
        { status: 400 }
      )
    }

    // 验证请求参数
    const validation = validatePublishTime(body.publishAtUtc)
    if (!validation.valid) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error! } as ErrorResponse,
        { status: 400 }
      )
    }

    // 检查定稿是否存在
    const existingFinalScript = await getVersion(finalScriptId, versionNumber)
    if (!existingFinalScript) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: '定稿版本不存在' } as ErrorResponse,
        { status: 404 }
      )
    }

    // 检查是否已发布（已发布的版本不允许修改发布时间）
    if (existingFinalScript.publishStatus === 'published') {
      return NextResponse.json(
        { code: 'ALREADY_PUBLISHED', message: '已发布的版本不允许修改发布时间' } as ErrorResponse,
        { status: 403 }
      )
    }

    // 更新发布时间
    const updatedFinalScript = await updateFinalScriptPublishTime(
      finalScriptId,
      versionNumber,
      body.publishAtUtc
    )

    // 返回更新后的 FinalScript 片段
    const response = {
      id: updatedFinalScript.id,
      ideaId: updatedFinalScript.ideaId,
      versionNumber: updatedFinalScript.versionNumber,
      publishAtUtc: updatedFinalScript.publishAtUtc,
      publishStatus: updatedFinalScript.publishStatus,
      updatedAt: updatedFinalScript.updatedAt
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('设置发布时间失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    
    if (errorMessage.includes('不存在')) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: errorMessage } as ErrorResponse,
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/final-scripts/[id]/version/[v]/publish
 * 处理 CORS 预检请求
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'PUT, OPTIONS',
    },
  })
}