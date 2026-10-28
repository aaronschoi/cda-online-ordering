import type { Passwords } from "./types.ts"

const iterations = 20_000

export function createPasswords(): Passwords {
  return {
    async hash(password) {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const bits = await derive(password, salt)
      return `${toHex(salt)}:${toHex(bits)}`
    },
    async verify(password, stored) {
      const [saltHex, hashHex] = stored.split(":")
      if (!saltHex || !hashHex) return false
      const bits = await derive(password, fromHex(saltHex))
      return safeEqual(toHex(bits), hashHex)
    },
  }
}

export async function hashSignInCode(email: string, code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email}:${code}`))
  return toHex(new Uint8Array(digest))
}

async function derive(password: string, salt: BufferSource): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}
