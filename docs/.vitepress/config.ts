import { defineConfig } from "vitepress";
import nav from "./nav";
import sidebar from "./sidebar";

export default defineConfig({
    title: "个人笔记站",
    lang: "zh-CN",
    description: "个人笔记站点，记录及学习",

    themeConfig: {
        nav,
        sidebar,

        outline: {
            label: "本页中",
            level: [2, 3]
        },
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        docFooter: {
            next: '下一项',
            prev: '上一项'
        }

    },

    vite: {
        server: {
            host: '0.0.0.0'
        }
    },

    markdown: {
        lineNumbers: true,
        config(md) {
            md.use((md) => {
                md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
                    return '<div class="table_p">\n<table>'
                }

                md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
                    return '</table>\n</div>';
                };
            })
        },
    }
})