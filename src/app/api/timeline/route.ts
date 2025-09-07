import { NextRequest, NextResponse } from 'next/server'
import { getAllFinalScripts, toTimelineItem } from '@/lib/server-data'
import type { TimelineQueryParams, TimelineResponse, TimelineItem } from '@/types/domain'

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: string
  message: string
}

/**
 * 验证查询参数
 */
function validateQueryParams(params: URLSearchParams): { valid: boolean; error?: string; queryParams?: TimelineQueryParams } {
  const queryParams: TimelineQueryParams = {}

  // 解析页码
  const pageStr = params.get('page')
  if (pageStr) {
    const page = parseInt(pageStr, 10)
    if (isNaN(page) || page < 1) {
      return { valid: false, error: '页码必须是正整数' }
    }
    queryParams.page = page
  } else {
    queryParams.page = 1
  }

  // 解析每页大小
  const pageSizeStr = params.get('pageSize')
  if (pageSizeStr) {
    const pageSize = parseInt(pageSizeStr, 10)
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return { valid: false, error: '每页大小必须在1-100之间' }
    }
    queryParams.pageSize = pageSize
  } else {
    queryParams.pageSize = 50
  }

  // 解析排序方式
  const sort = params.get('sort')
  if (sort && (sort === 'asc' || sort === 'desc')) {
    queryParams.sort = sort
  } else {
    queryParams.sort = 'asc'
  }

  // 解析日期范围
  const from = params.get('from')
  if (from) {
    const fromDate = new Date(from)
    if (isNaN(fromDate.getTime())) {
      return { valid: false, error: '开始日期格式无效' }
    }
    queryParams.from = from
  }

  const to = params.get('to')
  if (to) {
    const toDate = new Date(to)
    if (isNaN(toDate.getTime())) {
      return { valid: false, error: '结束日期格式无效' }
    }
    queryParams.to = to
  }

  // 状态筛选已移除，仅显示已排期定稿

  // 解析关键词搜索
  const q = params.get('q')
  if (q && q.trim()) {
    queryParams.q = q.trim()
  }

  return { valid: true, queryParams }
}

// getAllFinalScripts 方法已从 @/lib/server-data 导入

/**
 * 筛选时间线项目
 */
function filterTimelineItems(
  items: any[],
  queryParams: TimelineQueryParams
): any[] {
  let filtered = items

  // 按发布时间筛选
  if (queryParams.from || queryParams.to) {
    filtered = filtered.filter(item => {
      if (!item.publishAtUtc) return false
      
      const publishDate = new Date(item.publishAtUtc)
      
      if (queryParams.from) {
        const fromDate = new Date(queryParams.from)
        if (publishDate < fromDate) return false
      }
      
      if (queryParams.to) {
        const toDate = new Date(queryParams.to)
        toDate.setHours(23, 59, 59, 999) // 包含整天
        if (publishDate > toDate) return false
      }
      
      return true
    })
  }

  // 状态筛选已移除，仅显示已排期定稿

  // 按关键词搜索
  if (queryParams.q) {
    const query = queryParams.q.toLowerCase()
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(query)
    )
  }

  return filtered
}

/**
 * 排序时间线项目
 */
function sortTimelineItems(items: any[], sort: 'asc' | 'desc'): any[] {
  return items.sort((a, b) => {
    const aTime = a.publishAtUtc ? new Date(a.publishAtUtc).getTime() : 0
    const bTime = b.publishAtUtc ? new Date(b.publishAtUtc).getTime() : 0
    
    if (sort === 'asc') {
      return aTime - bTime
    } else {
      return bTime - aTime
    }
  })
}

/**
 * 分页处理
 */
function paginateItems<T>(items: T[], page: number, pageSize: number): { items: T[]; totalPages: number } {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = items.slice(startIndex, endIndex)
  const totalPages = Math.ceil(items.length / pageSize)
  
  return { items: paginatedItems, totalPages }
}

// toTimelineItem 方法已从 @/lib/server-data 导入

/**
 * GET /api/timeline
 * 获取时间线数据
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)

    // 验证查询参数
    const validation = validateQueryParams(searchParams)
    if (!validation.valid) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error! } as ErrorResponse,
        { status: 400 }
      )
    }

    const queryParams = validation.queryParams!

    // 获取所有 FinalScript 数据
    const allFinalScripts = await getAllFinalScripts()

    // 筛选数据
    const filteredItems = filterTimelineItems(allFinalScripts, queryParams)

    // 排序数据
    const sortedItems = sortTimelineItems(filteredItems, queryParams.sort!)

    // 分页处理
    const { items: paginatedItems, totalPages } = paginateItems(
      sortedItems,
      queryParams.page!,
      queryParams.pageSize!
    )

    // 转换为时间线项目格式
    const timelineItems: TimelineItem[] = paginatedItems.map(toTimelineItem)

    // 构建响应
    const response: TimelineResponse = {
      range: {
        from: queryParams.from || '',
        to: queryParams.to || ''
      },
      items: timelineItems,
      page: queryParams.page!,
      totalPages,
      total: sortedItems.length
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('获取时间线数据失败:', error)
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '服务器内部错误' } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/timeline
 * 处理 CORS 预检请求
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  })
}