import copy from "../content/copy.json"
import geoText from "../content/delivery-zips.geojson?raw"
import settings from "../content/settings.json"
import type { ContentData, ContentPort, SpokenIntro, ZipShape } from "../domain/types.ts"

type ZipFile = { name?: string; code?: string }

const zipModules = import.meta.glob("../content/delivery-zips/*.json", {
  eager: true,
  import: "default",
}) as Record<string, ZipFile>

function spokenIntro(file: { intro?: string; introEs?: string; introKo?: string }): SpokenIntro {
  return { en: file.intro ?? "", es: file.introEs ?? "", ko: file.introKo ?? "" }
}

export function bundledContent(): ContentData {
  const intros = spokenIntro(copy)
  const deliveryZips = Object.entries(zipModules)
    .map(([path, data]) => {
      const file = path.split("/").pop()?.replace(/\.json$/, "") ?? ""
      const code = /^\d{5}$/.test(file) ? file : data.code ?? ""
      return { code, name: data.name ?? code }
    })
    .filter((zip) => /^\d{5}$/.test(zip.code))
    .sort((a, b) => a.code.localeCompare(b.code))
  return {
    intro: intros.en,
    intros,
    changeCutoffHours: settings.changeCutoffHours,
    deliveryChargeEnabled: settings.deliveryChargeEnabled,
    deliveryChargeCents: settings.deliveryChargeCents,
    season: settings.seasonName
      ? { name: settings.seasonName, startsAt: settings.seasonStartsAt, endsAt: settings.seasonEndsAt }
      : null,
    lineStyleIds: settings.lineStyleIds,
    deliveryZips,
    shapes: shapesFrom(geoText),
  }
}

export function shapesFrom(text: string): ZipShape[] {
  const geo = JSON.parse(text) as {
    features?: { properties?: { code?: string }; geometry?: { type?: string; coordinates?: number[][][] } }[]
  }
  return (geo.features ?? []).flatMap((feature) => {
    const code = feature.properties?.code
    if (!code || feature.geometry?.type !== "Polygon" || !feature.geometry.coordinates) return []
    return [{ code, rings: feature.geometry.coordinates }]
  })
}

export function contentPort(data: ContentData): ContentPort {
  return {
    async season() {
      return data.season
    },
    async line() {
      return data.lineStyleIds
    },
    async deliveryCharge() {
      return { enabled: data.deliveryChargeEnabled, cents: data.deliveryChargeCents }
    },
    async cutoffHours() {
      return data.changeCutoffHours
    },
    async deliveryZips() {
      return data.deliveryZips
    },
    async shapes() {
      return data.shapes
    },
    async intro() {
      return data.intro
    },
    async intros() {
      return data.intros
    },
  }
}

const unread: ContentPort = {
  async season() {
    return "unread"
  },
  async line() {
    return "unread"
  },
  async deliveryCharge() {
    return "unread"
  },
  async cutoffHours() {
    return "unread"
  },
  async deliveryZips() {
    return "unread"
  },
  async shapes() {
    return "unread"
  },
  async intro() {
    return "unread"
  },
  async intros() {
    return "unread"
  },
}

let githubCache: { at: number; data: ContentData } | null = null

export async function loadContent(env: { KEYSTATIC_GITHUB_REPO?: string; GITHUB_TOKEN?: string }): Promise<ContentPort> {
  if (!env.KEYSTATIC_GITHUB_REPO || !env.GITHUB_TOKEN) return contentPort(bundledContent())
  try {
    if (githubCache && Date.now() - githubCache.at < 30_000) return contentPort(githubCache.data)
    const data = await contentFromGithub(env.KEYSTATIC_GITHUB_REPO, env.GITHUB_TOKEN)
    githubCache = { at: Date.now(), data }
    return contentPort(data)
  } catch {
    return unread
  }
}

async function contentFromGithub(repo: string, token: string): Promise<ContentData> {
  const [settingsFile, copyFile, geoFile, zipList] = await Promise.all([
    githubJson<typeof settings>(repo, "src/content/settings.json", token),
    githubJson<typeof copy>(repo, "src/content/copy.json", token),
    githubText(repo, "src/content/delivery-zips.geojson", token),
    githubJson<{ name: string; path: string; type: string }[]>(repo, "src/content/delivery-zips", token),
  ])
  const files = zipList.filter((entry) => entry.type === "file" && entry.name.endsWith(".json"))
  const zips = await Promise.all(
    files.map(async (entry) => {
      const data = await githubJson<ZipFile>(repo, entry.path, token)
      const code = entry.name.replace(/\.json$/, "")
      return { code, name: data.name ?? code }
    }),
  )
  const intros = spokenIntro(copyFile)
  return {
    intro: intros.en,
    intros,
    changeCutoffHours: settingsFile.changeCutoffHours,
    deliveryChargeEnabled: settingsFile.deliveryChargeEnabled,
    deliveryChargeCents: settingsFile.deliveryChargeCents,
    season: settingsFile.seasonName
      ? { name: settingsFile.seasonName, startsAt: settingsFile.seasonStartsAt, endsAt: settingsFile.seasonEndsAt }
      : null,
    lineStyleIds: settingsFile.lineStyleIds,
    deliveryZips: zips.filter((zip) => /^\d{5}$/.test(zip.code)),
    shapes: shapesFrom(geoFile),
  }
}

async function githubJson<T>(repo: string, path: string, token: string): Promise<T> {
  return JSON.parse(await githubText(repo, path, token)) as T
}

async function githubText(repo: string, path: string, token: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: {
      Accept: "application/vnd.github.raw",
      Authorization: `Bearer ${token}`,
      "User-Agent": "cda-online-ordering",
    },
  })
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`)
  return response.text()
}
