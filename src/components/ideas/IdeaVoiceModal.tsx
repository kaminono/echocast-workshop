'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * 语音收集弹窗的状态机
 */
type VoiceModalState = 
  | 'idle'               // 初始状态
  | 'recording'          // 录音中
  | 'recorded'           // 录音完成
  | 'submittingASR'      // 提交ASR转写中
  | 'asrDone'            // ASR转写完成
  | 'submittingLLM'      // 提交LLM优化中
  | 'llmDone'            // LLM优化完成
  | 'saving'             // 保存中
  | 'done'               // 完成
  | 'failed'             // 失败

/**
 * ASR 响应接口
 */
interface ASRResponse {
  success: boolean
  text?: string
  error?: string
  errorCode?: string
  processingTime?: number
}

/**
 * LLM 优化响应接口
 */
interface LLMResponse {
  title: string
  summary: string
}

/**
 * LLM 错误响应接口
 */
interface LLMErrorResponse {
  code: string
  message: string
}

interface IdeaVoiceModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean
  /** 关闭弹窗回调 */
  onClose: () => void
  /** 保存创意回调 */
  onSave: (data: {
    title: string
    summary: string
    rawInputText: string
    audioBlob: Blob
    audioMimeType: string
    audioDurationMs: number
    optimizeModel: 'x1'
  }) => Promise<void>
}

export default function IdeaVoiceModal({ isOpen, onClose, onSave }: IdeaVoiceModalProps) {
  // 状态管理
  const [state, setState] = useState<VoiceModalState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [rawInputText, setRawInputText] = useState('')
  const [optimizedResult, setOptimizedResult] = useState<LLMResponse | null>(null)

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // 最大录音时长 60 秒
  const MAX_RECORDING_TIME = 60

  // 清理函数
  const cleanup = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null
    }
    chunksRef.current = []
  }

  // 重置状态
  const resetState = () => {
    setState('idle')
    setError(null)
    setRecordingTime(0)
    setAudioBlob(null)
    setAudioDuration(0)
    setRawInputText('')
    setOptimizedResult(null)
    cleanup()
  }

  // 弹窗关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen])

  // 开始录音
  const startRecording = async () => {
    try {
      setError(null)
      setState('recording')

      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      streamRef.current = stream

      // 创建媒体录制器
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        setAudioDuration(recordingTime * 1000) // 转换为毫秒
        setState('recorded')
        cleanup()
      }

      // 开始录音
      mediaRecorder.start()

      // 开始计时
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          // 达到最大时长自动停止
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)

    } catch (err) {
      console.error('录音失败:', err)
      setError(err instanceof Error ? err.message : '录音失败，请检查麦克风权限')
      setState('failed')
      cleanup()
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  // 重新录音
  const resetRecording = () => {
    resetState()
  }

  // 提交音频进行转写和优化
  const submitAudio = async () => {
    if (!audioBlob) return

    try {
      // Step 1: ASR 转写
      setState('submittingASR')
      setError(null)

      // 将录音的 WebM/Opus 转码为 PCM 16k 16bit（raw）并以 Base64 发送
      const audioBase64 = await blobToPcm16Base64(audioBlob)

      const asrResponse = await fetch('/api/asr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          audioParams: { sampleRate: 16000, encoding: 'raw' },
          languageParams: { language: 'zh_cn' },
          addPunctuation: true
        })
      })

      if (!asrResponse.ok) {
        const errorData: ASRResponse = await asrResponse.json()
        throw new Error(errorData.error || '语音转写失败')
      }

      const asrResult: ASRResponse = await asrResponse.json()
      
      if (!asrResult.success || !asrResult.text) {
        throw new Error('语音转写结果为空')
      }

      setRawInputText(asrResult.text)
      setState('asrDone')

      // Step 2: LLM 优化
      setState('submittingLLM')

      const llmResponse = await fetch('/api/ideas/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: asrResult.text
        })
      })

      if (!llmResponse.ok) {
        const errorData: LLMErrorResponse = await llmResponse.json()
        throw new Error(errorData.message || 'AI 优化失败')
      }

      const llmResult: LLMResponse = await llmResponse.json()
      
      if (!llmResult.title || !llmResult.summary) {
        throw new Error('AI 优化结果为空')
      }

      setOptimizedResult(llmResult)
      setState('llmDone')

    } catch (err) {
      console.error('提交失败:', err)
      setError(err instanceof Error ? err.message : '处理失败')
      setState('failed')
    }
  }

  // 将 WebM/Opus Blob 转码为 PCM16(16kHz, mono) 并返回 Base64（不含 WAV 头，raw PCM）
  const blobToPcm16Base64 = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer()
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0))

    // 统一到单声道
    const numChannels = 1
    const srcSampleRate = decoded.sampleRate
    const durationSec = decoded.duration
    const targetSampleRate = 16000
    const targetLength = Math.round(durationSec * targetSampleRate)

    const offlineCtx = new OfflineAudioContext(numChannels, targetLength, targetSampleRate)
    const source = offlineCtx.createBufferSource()
    // down-mix to mono if needed
    const monoBuffer = offlineCtx.createBuffer(1, decoded.length, srcSampleRate)
    const tmp = new Float32Array(decoded.length)
    // mixdown: average across channels
    for (let i = 0; i < decoded.numberOfChannels; i++) {
      const ch = decoded.getChannelData(i)
      for (let j = 0; j < ch.length; j++) {
        tmp[j] = (tmp[j] || 0) + ch[j] / decoded.numberOfChannels
      }
    }
    monoBuffer.getChannelData(0).set(tmp)

    source.buffer = monoBuffer
    source.connect(offlineCtx.destination)
    source.start(0)
    const rendered = await offlineCtx.startRendering()
    const pcm = rendered.getChannelData(0)

    // Float32 [-1,1] -> Int16 LE
    const pcmBuffer = new ArrayBuffer(pcm.length * 2)
    const view = new DataView(pcmBuffer)
    let offset = 0
    for (let i = 0; i < pcm.length; i++) {
      let s = Math.max(-1, Math.min(1, pcm[i]))
      s = s < 0 ? s * 0x8000 : s * 0x7fff
      view.setInt16(offset, s | 0, true)
      offset += 2
    }

    // 转为 Base64
    const uint8 = new Uint8Array(pcmBuffer)
    let binary = ''
    for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i])
    return btoa(binary)
  }

  // 保存创意
  const handleSave = async () => {
    if (!optimizedResult || !audioBlob || !rawInputText) return

    try {
      setState('saving')
      setError(null)

      await onSave({
        title: optimizedResult.title,
        summary: optimizedResult.summary,
        rawInputText,
        audioBlob,
        audioMimeType: audioBlob.type,
        audioDurationMs: audioDuration,
        optimizeModel: 'x1'
      })

      setState('done')
      
      // 延迟关闭弹窗
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (err) {
      console.error('保存失败:', err)
      setError(err instanceof Error ? err.message : '保存失败')
      setState('failed')
    }
  }

  // 处理弹窗关闭
  const handleClose = () => {
    // 录音中或提交中禁用关闭
    if (['recording', 'submittingASR', 'submittingLLM', 'saving'].includes(state)) {
      return
    }

    // 生成结果未保存时确认关闭
    if (state === 'llmDone' && optimizedResult) {
      if (!confirm('您有未保存的内容，确定要关闭吗？')) {
        return
      }
    }

    onClose()
  }

  // 处理 ESC 键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, state, optimizedResult])

  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="voice-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* 背景遮罩 */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose}></div>

        {/* 弹窗内容 */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* 标题栏 */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="voice-modal-title">
                🎙️ 语音收集
              </h3>
              <button
                onClick={handleClose}
                disabled={['recording', 'submittingASR', 'submittingLLM', 'saving'].includes(state)}
                className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="关闭弹窗"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区域 */}
            <div className="space-y-4">
              {/* 录音状态显示 */}
              {state === 'idle' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-2">准备录制您的创意想法</p>
                  <p className="text-sm text-gray-500">最长可录制 60 秒</p>
                </div>
              )}

              {state === 'recording' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-900 mb-2 font-medium">正在录音...</p>
                  <p className="text-lg font-mono text-red-600">
                    {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(recordingTime / MAX_RECORDING_TIME) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {state === 'recorded' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-900 mb-2 font-medium">录音完成</p>
                  <p className="text-sm text-gray-500">录音时长：{formatTime(recordingTime)}</p>
                </div>
              )}

              {(state === 'submittingASR' || state === 'submittingLLM' || state === 'saving') && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="text-gray-900 mb-2 font-medium">
                    {state === 'submittingASR' && '正在转写语音...'}
                    {state === 'submittingLLM' && '正在优化内容...'}
                    {state === 'saving' && '正在保存...'}
                  </p>
                  <p className="text-sm text-gray-500">请稍候</p>
                </div>
              )}

              {state === 'asrDone' && rawInputText && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">转写结果：</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700">{rawInputText}</p>
                  </div>
                </div>
              )}

              {(state === 'llmDone' || state === 'done') && optimizedResult && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">优化结果预览：</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-900 font-medium">{optimizedResult.title}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-700">{optimizedResult.summary}</p>
                      </div>
                    </div>
                  </div>

                  {state === 'done' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-green-800">保存成功！</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {state === 'failed' && error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <div className="space-x-3 flex justify-end">
              {state === 'idle' && (
                <button
                  onClick={startRecording}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>开始录音</span>
                </button>
              )}

              {state === 'recording' && (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 flex items-center space-x-2"
                >
                  <div className="w-3 h-3 bg-white rounded-sm"></div>
                  <span>停止录音</span>
                </button>
              )}

              {state === 'recorded' && (
                <>
                  <button
                    onClick={resetRecording}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  >
                    重新录音
                  </button>
                  <button
                    onClick={submitAudio}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  >
                    提交
                  </button>
                </>
              )}

              {state === 'llmDone' && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                >
                  保存创意
                </button>
              )}

              {state === 'failed' && (
                <>
                  <button
                    onClick={resetRecording}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  >
                    重新开始
                  </button>
                  {audioBlob && (
                    <button
                      onClick={submitAudio}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                    >
                      重试
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
