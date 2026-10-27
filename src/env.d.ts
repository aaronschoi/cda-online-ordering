/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        DB: import("./adapters/d1.ts").SqlDatabase
        SQUARE_ACCESS_TOKEN?: string
        SQUARE_LOCATION_ID?: string
        SQUARE_ENV?: string
        STAFF_EMAIL?: string
        STAFF_PASSWORD?: string
        KEYSTATIC_GITHUB_REPO?: string
        GITHUB_TOKEN?: string
      }
    }
  }
}
