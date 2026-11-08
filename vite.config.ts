import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: { "/api": { target: `http://127.0.0.1:${process.env.DASHBOARD_API_PORT||8787}`, changeOrigin: false } },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "charts",
              test: /node_modules[\\/](recharts|@reduxjs|react-redux|d3-|victory|reselect|use-sync-external-store)/,
            },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/*.test.tsx"],
    testTimeout: 30000,
  },
});
