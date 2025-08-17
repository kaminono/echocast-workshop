import Container from '@/components/Container'

export default function IdeasPage() {
  return (
    <Container>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">💡 创意收集</h1>
          <p className="text-gray-600">
            记录您的创意想法，整理思路，为后续的内容创作做准备。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">功能规划</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">创意快速记录</h3>
              <p className="text-gray-600 text-sm">支持文本、语音、图片等多种形式的创意输入</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900">标签分类管理</h3>
              <p className="text-gray-600 text-sm">为创意添加标签，方便后续查找和整理</p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-medium text-gray-900">创意评估筛选</h3>
              <p className="text-gray-600 text-sm">对创意进行评分和筛选，挑选最有潜力的想法</p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-medium text-gray-900">转化为文案</h3>
              <p className="text-gray-600 text-sm">将精选创意转化为文案草稿，进入打磨阶段</p>
            </div>
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
