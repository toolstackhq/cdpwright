import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Chromium Automaton",
  description: "Lightweight Chromium-only browser automation built on CDP",
  base: "/chromium-automation/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/intro" },
      { text: "API", link: "/guide/api" },
      { text: "CLI", link: "/guide/cli" }
    ],
    sidebar: {
      "/guide/": [
        { text: "Introduction", link: "/guide/intro" },
        { text: "Getting Started", link: "/guide/getting-started" },
        { text: "API", link: "/guide/api" },
        { text: "CLI", link: "/guide/cli" },
        { text: "Assertions", link: "/guide/assertions" },
        { text: "Shadow DOM", link: "/guide/shadow-dom" },
        { text: "Frames", link: "/guide/frames" },
        { text: "Configuration", link: "/guide/configuration" },
        { text: "Limitations", link: "/guide/limitations" }
      ]
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/quitecode9-lab/chromium-automation" }
    ]
  }
});
