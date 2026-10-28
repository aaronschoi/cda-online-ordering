const localPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export function localToUtc(local: string, timeZone: string): Date | null {
  const match = localPattern.exec(local)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = zoneOffsetMs(utcGuess, timeZone)
  let result = new Date(utcGuess.getTime() - offset)
  const offsetAgain = zoneOffsetMs(result, timeZone)
  if (offsetAgain !== offset) result = new Date(utcGuess.getTime() - offsetAgain)

  const parts = zoneParts(result, timeZone)
  if (!parts) return null
  if (
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== day ||
    parts.hour !== hour ||
    parts.minute !== minute
  ) {
    return null
  }
  return result
}

export function formatLocal(date: Date, timeZone: string): string | null {
  const parts = zoneParts(date, timeZone)
  if (!parts) return null
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  const hour = String(parts.hour).padStart(2, "0")
  const minute = String(parts.minute).padStart(2, "0")
  return `${parts.year}-${month}-${day}T${hour}:${minute}`
}

export function isSeasonOpen(startsAt: string, endsAt: string, now: Date): boolean {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  const time = now.getTime()
  return time >= start && time <= end
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zoneParts(date, timeZone)
  if (!parts) return 0
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

function zoneParts(date: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)
  const value = (type: string) => formatted.find((part) => part.type === type)?.value
  const year = Number(value("year"))
  const month = Number(value("month"))
  const day = Number(value("day"))
  let hour = Number(value("hour"))
  if (hour === 24) hour = 0
  const minute = Number(value("minute"))
  const second = Number(value("second"))
  if ([year, month, day, hour, minute, second].some((part) => Number.isNaN(part))) return null
  return { year, month, day, hour, minute, second }
}
