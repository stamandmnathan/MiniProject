import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { createToken } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { eq } from 'drizzle-orm'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { name, email, password, orgName } = parsed.data

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  let orgSlug = slugify(orgName)
  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  })
  if (existingOrg) orgSlug = `${orgSlug}-${Date.now()}`

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug: orgSlug })
    .returning()

  const passwordHash = await hash(password, 12)
  const [user] = await db
    .insert(users)
    .values({ orgId: org.id, email, name, passwordHash, role: 'owner' })
    .returning()

  const token = await createToken({
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: org.id,
    orgSlug: org.slug,
    role: user.role,
  })

  const res = NextResponse.json({ success: true })
  res.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
