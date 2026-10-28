import { getViteConfig } from "astro/config"

export default getViteConfig({
  test: {
    teardownTimeout: 1000,
  },
})
