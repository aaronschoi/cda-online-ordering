import cloudflare from "@astrojs/cloudflare"
import markdoc from "@astrojs/markdoc"
import react from "@astrojs/react"
import keystatic from "@keystatic/astro"
import { defineConfig } from "astro/config"

const githubRepo = process.env.KEYSTATIC_GITHUB_REPO ?? ""

export default defineConfig({
  output: "server",
  session: { driver: "memory" },
  adapter: cloudflare({
    imageService: "passthrough",
    platformProxy: { enabled: true },
  }),
  integrations: [react(), markdoc(), keystatic()],
  vite: {
    define: {
      "process.env.KEYSTATIC_GITHUB_REPO": JSON.stringify(githubRepo),
    },
  },
})
