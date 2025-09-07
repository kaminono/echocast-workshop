/**
 * 时间处理工具库
 * 
 * 提供 UTC 转换、本地化渲染和时区处理功能
 */

// 常量配置
export const ALLOW_PAST_PUBLISH = false // 是否允许设置过去时间

/**
 * 将本地时间转换为 UTC 时间
 * @param localDateTimeString 本地时间字符串（格式：YYYY-MM-DDTHH:mm）
 * @param timezone IANA 时区标识符
 * @returns UTC 时间字符串（ISO 8601 格式）
 */
export function toUtc(localDateTimeString: string, timezone: string): string {
  try {
    // 创建本地时间对象
    const localDate = new Date(localDateTimeString)
    
    // 验证时间有效性
    if (isNaN(localDate.getTime())) {
      throw new Error('Invalid date format')
    }
    
    // 使用 Intl.DateTimeFormat 获取时区信息
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    // 获取时区偏移量（分钟）
    const utcDate = new Date(localDate.getTime())
    const localTime = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }))
    const utcTime = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }))
    const offsetMinutes = (localTime.getTime() - utcTime.getTime()) / (1000 * 60)
    
    // 转换为 UTC 时间
    const utcResult = new Date(localDate.getTime() - offsetMinutes * 60000)
    return utcResult.toISOString()
  } catch (error) {
    throw new Error(`Failed to convert to UTC: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 将 UTC 时间转换为本地时间
 * @param utcString UTC 时间字符串（ISO 8601 格式）
 * @param timezone IANA 时区标识符
 * @param locale 语言环境
 * @returns 本地化的日期和时间对象
 */
export function toLocal(utcString: string, timezone: string, locale: string = 'zh-CN'): { date: string; time: string } {
  try {
    const utcDate = new Date(utcString)
    
    if (isNaN(utcDate.getTime())) {
      throw new Error('Invalid UTC date format')
    }
    
    // 格式化日期
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    // 格式化时间
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return {
      date: dateFormatter.format(utcDate),
      time: timeFormatter.format(utcDate)
    }
  } catch (error) {
    throw new Error(`Failed to convert to local time: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 格式化日期时间
 * @param utcString UTC 时间字符串
 * @param timezone IANA 时区标识符
 * @param locale 语言环境
 * @returns 格式化的日期时间字符串
 */
export function formatDateTime(utcString: string, timezone: string, locale: string = 'zh-CN'): string {
  try {
    const utcDate = new Date(utcString)
    
    if (isNaN(utcDate.getTime())) {
      throw new Error('Invalid UTC date format')
    }
    
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return formatter.format(utcDate)
  } catch (error) {
    throw new Error(`Failed to format date time: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 获取当前时区
 * @returns 当前浏览器的时区标识符
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * 验证时间是否在未来
 * @param localDateTimeString 本地时间字符串
 * @param timezone IANA 时区标识符
 * @returns 是否为未来时间
 */
export function isFutureTime(localDateTimeString: string, timezone: string): boolean {
  try {
    const localDate = new Date(localDateTimeString)
    const now = new Date()
    
    // 转换为同一时区进行比较
    const localTime = localDate.getTime()
    const currentTime = now.getTime()
    
    return localTime > currentTime
  } catch {
    return false
  }
}

/**
 * 获取时区显示名称
 * @param timezone IANA 时区标识符
 * @param locale 语言环境
 * @returns 时区显示名称
 */
export function getTimezoneDisplayName(timezone: string, locale: string = 'zh-CN'): string {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      timeZoneName: 'long'
    })
    
    const parts = formatter.formatToParts(new Date())
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')
    
    return timeZoneName?.value || timezone
  } catch {
    return timezone
  }
}

/**
 * 获取常用时区列表
 * @returns 常用时区数组
 */
export function getCommonTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'Asia/Shanghai', label: '中国标准时间 (CST)' },
    { value: 'Asia/Tokyo', label: '日本标准时间 (JST)' },
    { value: 'Asia/Seoul', label: '韩国标准时间 (KST)' },
    { value: 'America/New_York', label: '美国东部时间 (EST/EDT)' },
    { value: 'America/Los_Angeles', label: '美国西部时间 (PST/PDT)' },
    { value: 'Europe/London', label: '英国时间 (GMT/BST)' },
    { value: 'Europe/Paris', label: '中欧时间 (CET/CEST)' },
    { value: 'Australia/Sydney', label: '澳大利亚东部时间 (AEST/AEDT)' },
    { value: 'UTC', label: '协调世界时 (UTC)' }
  ]
}

/**
 * 搜索时区
 * @param query 搜索关键词
 * @returns 匹配的时区列表
 */
export function searchTimezones(query: string): Array<{ value: string; label: string }> {
  const commonTimezones = getCommonTimezones()
  const lowerQuery = query.toLowerCase()
  
  return commonTimezones.filter(tz => 
    tz.value.toLowerCase().includes(lowerQuery) ||
    tz.label.toLowerCase().includes(lowerQuery)
  )
}

/**
 * 获取日期格式（根据语言环境）
 * @param locale 语言环境
 * @returns 日期格式字符串
 */
export function getDateFormat(locale: string): string {
  const formats: Record<string, string> = {
    'zh-CN': 'YYYY-MM-DD',
    'en-US': 'MM/DD/YYYY',
    'ja-JP': 'YYYY/MM/DD'
  }
  
  return formats[locale] || formats['zh-CN']
}

/**
 * 格式化日期（根据语言环境）
 * @param date 日期对象
 * @param locale 语言环境
 * @returns 格式化的日期字符串
 */
export function formatDate(date: Date, locale: string = 'zh-CN'): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return formatter.format(date)
}

/**
 * 格式化时间（根据语言环境）
 * @param date 日期对象
 * @param locale 语言环境
 * @returns 格式化的时间字符串
 */
export function formatTime(date: Date, locale: string = 'zh-CN'): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  return formatter.format(date)
}