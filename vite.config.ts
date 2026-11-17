import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/CI-TEST/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
