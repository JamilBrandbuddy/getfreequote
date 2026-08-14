import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface Props {
  firstName?: string
  reference?: string
  vehicle?: string
  service?: string
  phone?: string
  phoneHref?: string
  businessName?: string
}

const NAVY = '#0f2748'

const Email = ({
  firstName = 'there',
  reference = '',
  vehicle = 'Vehicle not provided',
  service = '—',
  phone = '',
  phoneHref = '',
  businessName = 'Riverbend Autoglass Inc.',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`We received your auto glass quote request${reference ? ` (${reference})` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thanks, {firstName} — we&apos;ve got your request</Heading>
        <Text style={p}>
          Your reference number is <strong>{reference}</strong>. Please quote it when you call.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Vehicle</Text>
          <Text style={cardValue}>{vehicle}</Text>
          <Text style={cardLabel}>Requested service</Text>
          <Text style={cardValue}>{service}</Text>
        </Section>

        <Text style={p}>
          This is a confirmation that we received your details — your price and your appointment are{' '}
          <strong>not confirmed yet</strong>. One of our advisors will review your request, verify
          the glass and features for your vehicle, and contact you with a written quote and
          available times.
        </Text>

        <Heading as="h2" style={h2}>
          What happens next
        </Heading>
        <Text style={p}>1. We verify your glass and vehicle features.</Text>
        <Text style={p}>2. We confirm your SGI claim or private pricing.</Text>
        <Text style={p}>3. We contact you with your quote and book a time that suits you.</Text>

        {phone ? (
          <Text style={p}>
            Need us sooner? Call{' '}
            <Link href={phoneHref || `tel:${phone}`} style={link}>
              {phone}
            </Link>
            .
          </Text>
        ) : null}

        <Text style={footer}>{businessName}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `We Received Your Auto Glass Quote Request — ${data['reference'] ?? ''}`,
  displayName: 'Quote — customer confirmation',
  previewData: {
    firstName: 'Jane',
    reference: 'RB-482913',
    vehicle: '2019 Toyota RAV4',
    service: 'Windshield replacement',
    phone: '+1 639-525-9707',
    phoneHref: 'tel:+16395259707',
    businessName: 'Riverbend Autoglass Inc.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '24px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 12px' }
const h2 = { fontSize: '16px', color: '#0f172a', margin: '24px 0 8px' }
const p = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 10px' }
const card = { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', margin: '16px 0' }
const cardLabel = { fontSize: '13px', color: '#64748b', margin: '0' }
const cardValue = { fontSize: '15px', color: '#0f172a', margin: '2px 0 12px' }
const link = { color: NAVY, fontWeight: 'bold' }
const footer = { fontSize: '13px', color: '#94a3b8', marginTop: '24px' }
