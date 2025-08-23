// file: src/mock/seed.ts
import type { Idea, ScriptDraft, FinalScript } from '@/types/domain'

const nowIso = () => new Date().toISOString()

export const defaultSeed: {
  ideas: Idea[]
  draft?: ScriptDraft
  finals?: FinalScript[]
} = {
  ideas: [
    {
      id: 'idea-1',
      title: '远程办公效率提升技巧',
      summary: '分享工具与方法，提升远程团队协作效率',
      content: '围绕远程办公的习惯与流程优化',
      tags: ['效率', '远程办公'],
      source: 'text',
      starred: true,
      priority: 3,
      status: 'reviewed',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'idea-2',
      title: 'AI 写作实践',
      summary: '如何与大模型协作，提升创作效率',
      content: '示例与最佳实践',
      tags: ['AI', '写作'],
      source: 'text',
      priority: 4,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'idea-3',
      title: '音频剪辑流程优化',
      summary: '从录音到发布的高效流程',
      content: '软件选择与预设模板',
      tags: ['音频', '流程'],
      source: 'text',
      priority: 2,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  draft: {
    id: 'draft-1',
    ideaId: 'idea-1',
    title: '远程办公效率提升技巧（初稿）',
    intro: '针对远程团队的协作障碍，提供一套可落地的方法。',
    bulletPoints: ['工具与流程', '沟通与节奏'],
    cta: '立即应用到你的团队',
    content: '# 远程办公效率提升技巧\n针对远程团队的协作障碍，提供一套可落地的方法。\n- 工具与流程\n- 沟通与节奏\nCTA: 立即应用到你的团队',
    status: 'draft',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  finals: [
    {
      id: 'final-1',
      finalScriptId: 'idea-1',
      ideaId: 'idea-1',
      versionNumber: 1,
      title: '远程办公效率提升技巧',
      intro: '从工具、流程与沟通三方面入手，系统提升远程协作效率。',
      bulletPoints: ['工具与流程选择', '沟通节奏与文档协作', '度量与复盘'],
      cta: '从今天开始优化你的远程工作方式',
      content: '# 远程办公效率提升技巧\n从工具、流程与沟通三方面入手，系统提升远程协作效率。\n- 工具与流程选择\n- 沟通节奏与文档协作\n- 度量与复盘\nCTA: 从今天开始优化你的远程工作方式',
      status: 'published',
      publishedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'final-2',
      finalScriptId: 'idea-1',
      ideaId: 'idea-1',
      versionNumber: 2,
      title: '远程办公效率提升的三把钥匙',
      intro: '以最小投入提升协作效率，专注于关键环节。',
      bulletPoints: ['工具预设', '沟通准则', '节奏优先'],
      cta: '为团队制定一套协作准则',
      content: '# 远程办公效率提升的三把钥匙\n以最小投入提升协作效率，专注于关键环节。\n- 工具预设\n- 沟通准则\n- 节奏优先\nCTA: 为团队制定一套协作准则',
      status: 'published',
      publishedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
}
