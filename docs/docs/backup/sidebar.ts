import type { DefaultTheme } from "vitepress";


export default [
    {
        text: '软件工具',
        collapsed: false,
        items: [
            { text: '系统软件', link: 'docs/backup/software/系统软件' },
            { text: '视频处理', link: 'docs/backup/software/视频处理' },
            { text: '图像处理', link: 'docs/backup/software/图像处理' },
            { text: '存储桶', link: 'docs/backup/software/存储桶' },
            { text: '截图工具', link: 'docs/backup/software/截图' },
            { text: 'Jetbrains', link: 'docs/backup/software/Jetbrains' },
            { text: 'VsCode', link: 'docs/backup/software/VsCode' },
            { text: 'VPN', link: 'docs/backup/software/VPN' },
        ]
    },
    {
        text: "系统调优",
        collapsed: false,
        items: [
            { text: '系统调优', link: 'docs/backup/system/系统调优' }
        ]
    }
] satisfies DefaultTheme.SidebarItem[]