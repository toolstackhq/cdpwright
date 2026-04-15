import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cdpwright",
  description: "Lightweight Chromium-only browser automation built on CDP",
  base: "/cdpwright/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/intro" },
      { text: "Get Started", link: "/guide/getting-started" },
      { text: "CLI", link: "/guide/cli" },
      { text: "API", link: "/guide/api/" }
    ],
    sidebar: {
      "/guide/": [
        { text: "Introduction", link: "/guide/intro" },
        { text: "Getting Started", link: "/guide/getting-started" },
        { text: "CLI", link: "/guide/cli" },
        {
          text: "API",
          link: "/guide/api/",
          items: [
            { text: "Browser", link: "/guide/api/browser" },
            { text: "Page", link: "/guide/api/page" },
            { text: "Frame", link: "/guide/api/frame" },
            { text: "Locator", link: "/guide/api/locator" },
            { text: "Assertions", link: "/guide/api/assertions" },
            { text: "Under the Hood", link: "/guide/api/under-the-hood" }
          ]
        },
        { text: "Shadow DOM", link: "/guide/shadow-dom" },
        { text: "Frames", link: "/guide/frames" },
        { text: "Configuration", link: "/guide/configuration" },
        { text: "Limitations", link: "/guide/limitations" }
      ]
    },
    editLink: {
      pattern: "https://github.com/toolstackhq/cdpwright/edit/main/docs/:path",
      text: "Edit this page"
    },
    lastUpdatedText: "Updated on",
    footer: {
      message: "Chromium-only automation built on CDP.",
      copyright: "MIT Licensed."
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/toolstackhq/cdpwright" }
    ]
  }
});
