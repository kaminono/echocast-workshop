import Container from '@/components/Container'

export default function TimelinePage() {
  return (
    <Container>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🌍 时间线管理</h1>
          <p className="text-gray-600">
            管理多语种内容发布时间线，协调全球化内容策略。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">功能规划</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">多语种翻译</h3>
              <p className="text-gray-600 text-sm">自动或手动将文案翻译为多种目标语言</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900">本地化适配</h3>
              <p className="text-gray-600 text-sm">根据不同地区文化特点调整内容表达</p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-medium text-gray-900">发布时间规划</h3>
              <p className="text-gray-600 text-sm">考虑时区差异，制定最佳发布时间策略</p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-medium text-gray-900">平台同步</h3>
              <p className="text-gray-600 text-sm">支持多平台内容发布和状态同步</p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-medium text-gray-900">效果跟踪</h3>
              <p className="text-gray-600 text-sm">跟踪不同语种版本的传播效果和用户反馈</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">🗓️ 时间线视图</h3>
            <p className="text-blue-700 text-sm">
              可视化展示内容从创意到全球发布的完整时间线
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">📊 数据分析</h3>
            <p className="text-green-700 text-sm">
              分析不同语种和地区的内容表现，优化发布策略
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              🚧 此页面正在开发中，敬请期待！
            </p>
          </div>
        </div>
      </div>
    </Container>
  )
}
