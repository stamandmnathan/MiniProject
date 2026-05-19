import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  customDomain: text('custom_domain'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).default('member').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const policies = pgTable(
  'policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type', {
      enum: ['terms', 'privacy', 'custom'],
    }).notNull(),
    slug: text('slug').notNull(),
    shareId: text('share_id').notNull().unique(),
    title: text('title').notNull(),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .default('draft')
      .notNull(),
    currentVersionId: uuid('current_version_id'),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orgSlugUnique: unique().on(table.orgId, table.slug),
  })
)

export const policyVersions = pgTable(
  'policy_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    policyId: uuid('policy_id')
      .references(() => policies.id, { onDelete: 'cascade' })
      .notNull(),
    versionNum: integer('version_num').notNull(),
    semver: text('semver').notNull(),
    contentMd: text('content_md').notNull(),
    contentHtml: text('content_html').notNull(),
    contentHash: text('content_hash').notNull(),
    publishedAt: timestamp('published_at'),
    publishedBy: uuid('published_by').references(() => users.id),
    changeSummary: text('change_summary'),
  },
  (table) => ({
    policyVersionUnique: unique().on(table.policyId, table.versionNum),
  })
)

export const acceptanceRecords = pgTable(
  'acceptance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    policyVersionId: uuid('policy_version_id')
      .references(() => policyVersions.id)
      .notNull(),
    userIdentifier: text('user_identifier'),
    userMetadata: jsonb('user_metadata').$type<Record<string, unknown>>(),
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent'),
    acceptanceMethod: text('acceptance_method', {
      enum: ['checkbox', 'button', 'api', 'embed'],
    })
      .default('button')
      .notNull(),
    acceptedAt: timestamp('accepted_at').defaultNow().notNull(),
    proofToken: text('proof_token').notNull().unique(),
  },
  (table) => ({
    versionIdx: index('acceptance_version_idx').on(table.policyVersionId),
    userIdx: index('acceptance_user_idx').on(table.userIdentifier),
    timeIdx: index('acceptance_time_idx').on(table.acceptedAt),
  })
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .references(() => organizations.id)
      .notNull(),
    actorId: uuid('actor_id'),
    actorType: text('actor_type', { enum: ['user', 'api_key', 'system'] }).notNull(),
    event: text('event').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    orgTimeIdx: index('audit_org_time_idx').on(table.orgId, table.occurredAt),
    resourceIdx: index('audit_resource_idx').on(table.resourceId),
  })
)

// Relations

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  policies: many(policies),
  auditLogs: many(auditLogs),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  policies: many(policies, { relationName: 'createdBy' }),
}))

export const policiesRelations = relations(policies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [policies.orgId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [policies.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
  versions: many(policyVersions, { relationName: 'versionList' }),
  currentVersion: one(policyVersions, {
    fields: [policies.currentVersionId],
    references: [policyVersions.id],
    relationName: 'currentVersion',
  }),
}))

export const policyVersionsRelations = relations(policyVersions, ({ one, many }) => ({
  policy: one(policies, {
    fields: [policyVersions.policyId],
    references: [policies.id],
    relationName: 'versionList',
  }),
  currentPolicies: many(policies, { relationName: 'currentVersion' }),
  acceptanceRecords: many(acceptanceRecords),
}))

export const acceptanceRecordsRelations = relations(acceptanceRecords, ({ one }) => ({
  policyVersion: one(policyVersions, {
    fields: [acceptanceRecords.policyVersionId],
    references: [policyVersions.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.orgId],
    references: [organizations.id],
  }),
}))

export type Organization = typeof organizations.$inferSelect
export type User = typeof users.$inferSelect
export type Policy = typeof policies.$inferSelect
export type PolicyVersion = typeof policyVersions.$inferSelect
export type AcceptanceRecord = typeof acceptanceRecords.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
