import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import editorApi from "./editor-server/editorApi.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), editorApi()],
  server: {
    // 编辑器自动保存会频繁写 public/works，不让它触发页面刷新
    watch: { ignored: ["**/public/works/**"] },
  },
  build: {
    // 正式网站只打包首页；排版编辑器 editor.html 只在本地使用
    rollupOptions: { input: resolve(__dirname, "index.html") },
  },
});
