import type { DefaultTheme } from "vitepress";
import {default as backupSidebar} from "../docs/backup/sidebar"


export default {
    'docs/backup/': backupSidebar
} satisfies DefaultTheme.Sidebar