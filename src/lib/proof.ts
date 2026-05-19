import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production-min-32-chars'

export function generateProofToken(
  policyVersionId: string,
  userIdentifier: string,
  timestamp: string
): string {
  const payload = `${policyVersionId}:${userIdentifier}:${timestamp}`
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function verifyProofToken(
  token: string,
  policyVersionId: string,
  userIdentifier: string,
  timestamp: string
): boolean {
  const expected = generateProofToken(policyVersionId, userIdentifier, timestamp)
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
