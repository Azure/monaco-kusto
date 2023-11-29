import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "monaco-editor/esm/vs/language/json/json.worker",
      "@kusto/monaco-kusto/release/esm/kusto.worker",
      "monaco-editor/esm/vs/editor/editor.worker",
    ],
  },
});
