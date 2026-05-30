/**
 * Storage quota logic
 *
 * Two modes:
 * - Per-group override (admin set): the group has its own independent quota
 * - Shared: storage is pooled across all founder's groups (without override),
 *   quota = max(plan.storageGb) across those groups
 */

import { prisma } from '@/lib/prisma'

export const GB = 1024 * 1024 * 1024

export interface StorageInfo {
  /** Bytes currently used (individual group or total across shared pool) */
  usedBytes: number
  /** Quota limit in bytes */
  limitBytes: number
  /** Quota in Gb (for display) */
  limitGb: number
  /** Number of groups in the shared pool (1 if override) */
  groupCount: number
  /** True if this group has an admin-set individual quota */
  hasOverride: boolean
  /** Percentage used (0-100) */
  percent: number
}

/**
 * Compute storage info for a given group.
 * Used in page.tsx (display) and upload API (enforcement).
 */
export async function getGroupStorageInfo(groupId: number): Promise<StorageInfo> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      plan: true,
      storageUsedBytes: true,
      storageQuotaOverrideGb: true,
      createdBy: true,
    },
  })
  if (!group) throw new Error('Group not found')

  // --- Per-group override: independent quota ---
  if (group.storageQuotaOverrideGb !== null) {
    const limitBytes = group.storageQuotaOverrideGb * GB
    const usedBytes = Number(group.storageUsedBytes)
    return {
      usedBytes,
      limitBytes,
      limitGb: group.storageQuotaOverrideGb,
      groupCount: 1,
      hasOverride: true,
      percent: limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0,
    }
  }

  // --- Shared pool: all founder's groups without override ---
  if (!group.createdBy) {
    // No founder set — fall back to per-group plan quota
    const dbPlan = await prisma.plan.findUnique({ where: { key: group.plan } })
    const limitGb = dbPlan ? Number(dbPlan.storageGb) : 0
    const limitBytes = limitGb * GB
    const usedBytes = Number(group.storageUsedBytes)
    return {
      usedBytes,
      limitBytes,
      limitGb,
      groupCount: 1,
      hasOverride: false,
      percent: limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0,
    }
  }

  // Fetch all groups of the same founder that have NO individual override
  const founderGroups = await prisma.group.findMany({
    where: { createdBy: group.createdBy, storageQuotaOverrideGb: null },
    select: { plan: true, storageUsedBytes: true },
  })

  // Total used across all those groups
  const usedBytes = founderGroups.reduce(
    (sum, g) => sum + Number(g.storageUsedBytes),
    0
  )

  // Quota = max storageGb across all founder's plans
  const plans = await prisma.plan.findMany({
    where: { key: { in: founderGroups.map((g) => g.plan) } },
    select: { key: true, storageGb: true },
  })
  const planMap = Object.fromEntries(plans.map((p) => [p.key, Number(p.storageGb)]))
  const limitGb = founderGroups.reduce(
    (max, g) => Math.max(max, planMap[g.plan] ?? 0),
    0
  )
  const limitBytes = limitGb * GB

  return {
    usedBytes,
    limitBytes,
    limitGb,
    groupCount: founderGroups.length,
    hasOverride: false,
    percent: limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0,
  }
}

/** L'ajout de fichiers est-il possible ? (quota effectif strictement > 0) */
export function uploadsEnabled(info: StorageInfo): boolean {
  return info.limitBytes > 0
}

/** Espace restant en octets (jamais négatif) */
export function remainingBytes(info: StorageInfo): number {
  return Math.max(0, info.limitBytes - info.usedBytes)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < GB) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / GB).toFixed(2)} Go`
}
