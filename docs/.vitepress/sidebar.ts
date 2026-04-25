import type { DefaultTheme } from "vitepress";
import { default as backupSidebar } from "../docs/backup/sidebar"
import { default as developSidebar } from "../docs/develop/sidebar"

export default {
    'docs/backup/': backupSidebar,
    'docs/develop/': developSidebar
} satisfies DefaultTheme.Sidebar