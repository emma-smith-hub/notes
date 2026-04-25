import type { DefaultTheme } from "vitepress";


export default [
    {
        text: '开发层级',
        items: [
            { text: 'Bun Workers', link: 'docs/develop/develop/bun-worker' },
            { text: 'P-Queue 队列', link: 'docs/develop/develop/p-queue' },
            { text: 'OpenAi', link: 'docs/develop/develop/openai' },
            { text: 'Vercel Ai SDK', link: 'docs/develop/develop/vercel-ai-sdk' },
        ],
        collapsed: false
    },
    {
        text: '系统层级',
        collapsed: false,
        items: [
            { text: 'Linux 常用命令', link: 'docs/develop/system/linux' },
            { text: 'Linux Samba', link: 'docs/develop/system/linux-samba' },
        ]
    }

] satisfies DefaultTheme.SidebarItem[]