import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a legal document specialist who writes clear, comprehensive Terms & Conditions and Privacy Policies for software products. Write policies that are:
- Legally sound but readable by non-lawyers
- Compliant with GDPR, CCPA, and general US/EU law
- Formatted in Markdown with clear headings and sections
- Specific to the product details provided
- Professional and complete

Always output valid Markdown. Use ## for main sections, ### for subsections. Include all standard required clauses for the policy type.`

export type PolicyGenerationInput = {
  type: 'terms' | 'privacy' | 'custom'
  productName: string
  productDescription?: string
  dataCollected?: string[]
  jurisdiction?: string
  usesCookies?: boolean
  hasPayments?: boolean
  contactEmail?: string
}

export async function* generatePolicyStream(
  input: PolicyGenerationInput
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(input) }],
  })

  for await (const chunk of await stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}

function buildPrompt(input: PolicyGenerationInput): string {
  const typeLabel = {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    custom: 'Custom Policy',
  }[input.type]

  const lines = [
    `Generate a complete, professional ${typeLabel} for:`,
    ``,
    `Product Name: ${input.productName}`,
  ]

  if (input.productDescription) lines.push(`Description: ${input.productDescription}`)
  if (input.dataCollected?.length)
    lines.push(`Data Collected: ${input.dataCollected.join(', ')}`)
  lines.push(`Jurisdiction: ${input.jurisdiction ?? 'United States'}`)
  if (input.usesCookies !== undefined) lines.push(`Uses Cookies: ${input.usesCookies}`)
  if (input.hasPayments !== undefined) lines.push(`Processes Payments: ${input.hasPayments}`)
  if (input.contactEmail) lines.push(`Contact Email: ${input.contactEmail}`)

  lines.push(``, `Output the full ${typeLabel} document in Markdown format.`)

  return lines.join('\n')
}
