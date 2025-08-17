import Container from '@/components/Container'

export default function DraftsPage() {
  return (
    <Container>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">📝 文案打磨</h1>
          <p className="text-gray-600">
            多轮迭代优化您的文案内容，打造高质量的创作素材。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">功能规划</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">版本管理</h3>
              <p className="text-gray-600 text-sm">保存文案的每个修改版本，支持版本对比和回滚</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900">AI 辅助优化</h3>
              <p className="text-gray-600 text-sm">集成讯飞 API，提供智能文案优化建议</p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-medium text-gray-900">协作评审</h3>
              <p className="text-gray-600 text-sm">支持团队成员对文案进行评论和建议</p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-medium text-gray-900">质量评估</h3>
              <p className="text-gray-600 text-sm">从可读性、吸引力等维度评估文案质量</p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-medium text-gray-900">发布准备</h3>
              <p className="text-gray-600 text-sm">最终确认文案内容，准备进入多语种处理阶段</p>
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
