import Container from '@/components/Container'

export default function HomePage() {
  return (
    <Container>
      <div className="py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            欢迎来到 EchoCast Workshop
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            一个专为内容创作者设计的多语种处理工作台，帮助您从创意收集到多语种发布的全流程管理。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 创意收集</h3>
            <p className="text-gray-600">
              随时记录灵感，整理创意想法，为内容创作奠定基础。
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 文案打磨</h3>
            <p className="text-gray-600">
              多轮迭代优化文案内容，打造高质量的创作素材。
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🌍 多语种处理</h3>
            <p className="text-gray-600">
              智能多语种转换与时间线管理，扩展内容影响力。
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">开始使用</h2>
          <div className="flex justify-center space-x-4">
            <a 
              href="/ideas" 
              className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors"
            >
              收集创意
            </a>
            <a 
              href="/drafts" 
              className="bg-gray-200 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
            >
              文案打磨
            </a>
            <a 
              href="/timeline" 
              className="bg-gray-200 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
            >
              时间线管理
            </a>
          </div>
        </div>
      </div>
    </Container>
  )
}
