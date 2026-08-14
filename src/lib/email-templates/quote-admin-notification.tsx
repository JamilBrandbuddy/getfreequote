import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface Row {
  label: string
  value: string
}

interface Props {
  reference?: string
  priority?: string
  submittedAt?: string
  adasReview?: boolean
  rows?: Row[]
  adminUrl?: string
}

const NAVY = '#0f2748'

const Email = ({
  reference = 'RB-000000',
  priority = 'standard',
  submittedAt = '',
  adasReview = false,
  rows = [],
  adminUrl = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New quote request ${reference} — ${priority} priority`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text
          style={{
            ...badge,
            backgroundColor: priority === 'urgent' ? '#b91c1c' : NAVY,
          }}
        >
          {priority.toUpperCase()} PRIORITY
        </Text>
        <Heading style={h1}>New quote request {reference}</Heading>
        {submittedAt ? <Text style={muted}>{submittedAt}</Text> : null}

        {adasReview ? (
          <Text style={warning}>
            ADAS review required — camera / driver-assist calibration likely.
          </Text>
        ) : null}

        <Section>
          {rows.map((row) => (
            <Section key={row.label} style={rowStyle}>
              <Text style={rowLabel}>{row.label}</Text>
              <Text style={rowValue}>{row.value}</Text>
            </Section>
          ))}
        </Section>

        {adminUrl ? (
          <Button href={adminUrl} style={button}>
            Open the full record
          </Button>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `New Auto Glass Quote — ${data['reference'] ?? ''} — ${data['vehicleLine'] ?? 'Vehicle TBC'}`,
  displayName: 'Quote — admin notification',
  previewData: {
    reference: 'RB-482913',
    vehicleLine: '2019 Toyota RAV4',
    priority: 'urgent',
    submittedAt: 'Aug 14, 2026, 9:12 a.m.',
    adasReview: true,
    adminUrl: 'https://getfreequote.lovable.app/admin/quotes/1',
    rows: [
      { label: 'Requested service', value: 'Windshield replacement' },
      { label: 'Customer', value: 'Jane Doe' },
      { label: 'Phone', value: '+1 639-525-9707' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { maxWidth: '640px', margin: '0 auto', padding: '24px' }
const badge = {
  display: 'inline-block',
  color: '#ffffff',
  padding: '6px 14px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '0 0 12px',
}
const h1 = { fontSize: '20px', color: '#0f172a', margin: '0 0 4px' }
const muted = { color: '#64748b', fontSize: '14px', margin: '0 0 20px' }
const warning = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fdba74',
  color: '#9a3412',
  padding: '12px 14px',
  borderRadius: '12px',
  fontSize: '14px',
}
const rowStyle = { borderBottom: '1px solid #e2e8f0', padding: '6px 0' }
const rowLabel = { color: '#64748b', fontSize: '13px', margin: '0' }
const rowValue = { color: '#0f172a', fontSize: '14px', margin: '2px 0 0' }
const button = {
  backgroundColor: NAVY,
  color: '#ffffff',
  padding: '12px 20px',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '14px',
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '24px',
}
