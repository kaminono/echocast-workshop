import { NextRequest, NextResponse } from 'next/server'
import { simpleChat } from '@/lib/ai/x1Chat'

/**
 * 请求参数接口
 */
interface OptimizeIdeaRequest {
  input: string
}

/**
 * 响应结果接口
 */
interface OptimizeIdeaResponse {
  title: string
  summary: string
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: string
  message: string
}

/**
 * 验证请求参数
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体格式错误' }
  }

  if (!body.input || typeof body.input !== 'string') {
    return { valid: false, error: '输入内容不能为空' }
  }

  if (body.input.trim().length === 0) {
    return { valid: false, error: '输入内容不能为空' }
  }

  if (body.input.length > 2000) {
    return { valid: false, error: '输入内容过长，请控制在2000字符以内' }
  }

  return { valid: true }
}

/**
 * 解析 AI 回复为结构化数据
 */
function normalizeText(text: string): string {
  // 去除 Markdown 代码块包裹，如 ```json 或 ``` 等
  let t = text.trim();
  t = t.replace(/^```[a-zA-Z]*\s*/g, '').replace(/```\s*$/g, '').trim();
  // 去除多余引号或反引号
  t = t.replace(/^`+|`+$/g, '').trim();
  return t;
}

function parseAIResponse(response: string): OptimizeIdeaResponse {
  const cleaned = normalizeText(response);
  try {
    // 尝试解析 JSON 格式
    const parsed = JSON.parse(cleaned)
    if (parsed.title && parsed.summary) {
      return {
        title: String(parsed.title).trim(),
        summary: String(parsed.summary).trim()
      }
    }
  } catch {
    // JSON 解析失败，尝试文本解析
  }

  // 文本解析：寻找标题和摘要
  const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let title = ''
  let summary = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 查找标题
    if (line.includes('标题') || line.includes('题目') || line.includes('Title')) {
      const titleMatch = line.match(/[:：](.+)/) || line.match(/[：:](.+)/)
      if (titleMatch) {
        title = titleMatch[1].trim()
      }
    }
    
    // 查找摘要
    if (line.includes('摘要') || line.includes('简介') || line.includes('Summary')) {
      const summaryMatch = line.match(/[:：](.+)/) || line.match(/[：:](.+)/)
      if (summaryMatch) {
        summary = summaryMatch[1].trim()
      }
    }
  }
  
  // 如果没有找到明确的标题和摘要，使用第一行作为标题，其余作为摘要
  if (!title && !summary && lines.length > 0) {
    title = lines[0]
    summary = lines.slice(1).join(' ').substring(0, 200)
  }
  
  return {
    title: (title || '优化后的播客创意').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').trim(),
    summary: (summary || '基于您的想法生成的播客创意摘要').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').trim()
  }
}

/**
 * POST /api/ideas/optimize
 * 优化创意点子，使其更适合播客内容
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 解析请求体
    let body: OptimizeIdeaRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { code: 'INVALID_JSON', message: '请求格式错误' } as ErrorResponse,
        { status: 400 }
      )
    }

    // 验证请求参数
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error! } as ErrorResponse,
        { status: 400 }
      )
    }

    // 构建 AI 提示词
    const systemPrompt = `你是一个专业的播客内容策划师。请将用户提供的创意想法优化为更适合播客的内容。

要求：
1. 生成一个吸引人的播客标题（15-30字）
2. 写一段简要摘要（50-150字），描述这个播客内容的核心价值和听众收获

请用以下JSON格式回复：
{
  "title": "播客标题",
  "summary": "播客摘要"
}

或者使用以下格式：
标题：播客标题
摘要：播客摘要`

    // 调用 X1 模型
    let aiResponse: string
    try {
      const result = await simpleChat(
        body.input,
        systemPrompt,
        {
          temperature: 0.7,
          maxTokens: 500,
          timeout: 30000 // 30秒超时
        }
      )
      aiResponse = result.text
    } catch (error) {
      console.error('AI 调用失败:', error)
      
      // 根据错误类型返回不同的错误码
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        return NextResponse.json(
          { code: 'TIMEOUT', message: '请求超时，请稍后重试' } as ErrorResponse,
          { status: 408 }
        )
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return NextResponse.json(
          { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后重试' } as ErrorResponse,
          { status: 429 }
        )
      }
      
      if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        return NextResponse.json(
          { code: 'AUTH_ERROR', message: '服务配置错误，请联系管理员' } as ErrorResponse,
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { code: 'AI_ERROR', message: '内容生成服务暂时不可用，请稍后重试' } as ErrorResponse,
        { status: 503 }
      )
    }

    // 解析 AI 响应
    let optimizedResult: OptimizeIdeaResponse
    try {
      optimizedResult = parseAIResponse(aiResponse)
    } catch (error) {
      console.error('解析 AI 响应失败:', error)
      return NextResponse.json(
        { code: 'PARSE_ERROR', message: '内容生成结果格式错误，请重试' } as ErrorResponse,
        { status: 500 }
      )
    }

    // 验证结果有效性
    if (!optimizedResult.title || !optimizedResult.summary) {
      return NextResponse.json(
        { code: 'EMPTY_RESULT', message: '生成的内容为空，请重试' } as ErrorResponse,
        { status: 500 }
      )
    }

    // 返回成功结果
    return NextResponse.json(optimizedResult, { status: 200 })

  } catch (error) {
    console.error('API 处理失败:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/ideas/optimize
 * 处理 CORS 预检请求（如需要）
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
    },
  })
}
