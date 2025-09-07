/**
 * 时间线状态管理
 * 
 * 管理时间线页面的筛选条件、分页信息和加载状态
 */

import { TimelineQueryParams, TimelineResponse } from '@/types/domain'

// 时间线状态接口
export interface TimelineState {
  /** 查询参数 */
  queryParams: TimelineQueryParams
  /** 时间线数据 */
  data: TimelineResponse | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 最后更新时间 */
  lastUpdated: number | null
}

// 默认查询参数
const DEFAULT_QUERY_PARAMS: TimelineQueryParams = {
  page: 1,
  pageSize: 50,
  sort: 'desc' // 默认倒序排列
}

// 状态存储
let timelineState: TimelineState = {
  queryParams: DEFAULT_QUERY_PARAMS,
  data: null,
  isLoading: false,
  error: null,
  lastUpdated: null
}

// 状态变更监听器
type StateChangeListener = (state: TimelineState) => void
const listeners = new Set<StateChangeListener>()

/**
 * 通知状态变更
 */
function notifyStateChange() {
  listeners.forEach(listener => {
    try {
      listener(timelineState)
    } catch (error) {
      console.error('Error in timeline state listener:', error)
    }
  })
}

/**
 * 添加状态变更监听器
 * @param listener 监听器函数
 * @returns 取消监听的函数
 */
export function addTimelineStateListener(listener: StateChangeListener): () => void {
  listeners.add(listener)
  
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 获取当前状态
 */
export function getTimelineState(): TimelineState {
  return { ...timelineState }
}

/**
 * 设置查询参数
 * @param params 查询参数
 */
export function setTimelineQueryParams(params: Partial<TimelineQueryParams>) {
  timelineState.queryParams = {
    ...timelineState.queryParams,
    ...params
  }
  notifyStateChange()
}

/**
 * 重置查询参数
 */
export function resetTimelineQueryParams() {
  timelineState.queryParams = { ...DEFAULT_QUERY_PARAMS }
  notifyStateChange()
}

/**
 * 设置加载状态
 * @param isLoading 是否正在加载
 */
export function setTimelineLoading(isLoading: boolean) {
  timelineState.isLoading = isLoading
  notifyStateChange()
}

/**
 * 设置时间线数据
 * @param data 时间线数据
 */
export function setTimelineData(data: TimelineResponse | null) {
  timelineState.data = data
  timelineState.error = null
  timelineState.lastUpdated = Date.now()
  notifyStateChange()
}

/**
 * 设置错误信息
 * @param error 错误信息
 */
export function setTimelineError(error: string | null) {
  timelineState.error = error
  timelineState.isLoading = false
  notifyStateChange()
}

/**
 * 清除时间线数据
 */
export function clearTimelineData() {
  timelineState.data = null
  timelineState.error = null
  timelineState.lastUpdated = null
  notifyStateChange()
}

/**
 * 刷新时间线数据
 */
export function refreshTimeline() {
  timelineState.lastUpdated = null
  notifyStateChange()
}