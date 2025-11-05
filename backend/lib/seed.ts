import { presetDomains } from "../prisma/seed"

export { presetDomains }

export function createPresetDomainsForUser(userId: string) {
  return presetDomains.map((domain) => ({
    ...domain,
    userId,
    enabled: domain.order < 3, // Enable first 3 domains by default
  }))
}
