import type { DefaultTheme } from "vitepress";


export default [
    {
        text: '软件工具',
        collapsed: false,
        items: [
            { text: '系统软件', link: 'docs/backup/软件工具/系统软件' },
            { text: '视频处理', link: 'docs/backup/软件工具/视频处理' },
            { text: '图像处理', link: 'docs/backup/软件工具/图像处理' },
            { text: '存储桶', link: 'docs/backup/软件工具/存储桶' },
            { text: '截图工具', link: 'docs/backup/软件工具/截图' },
            { text: 'Adobe', link: 'docs/backup/软件工具/Adobe' },
            { text: 'Jetbrains', link: 'docs/backup/软件工具/Jetbrains' },
            { text: 'VsCode', link: 'docs/backup/软件工具/VsCode' },
        ]
    },
] satisfies DefaultTheme.SidebarItem[]