import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email';
import { LOGO } from './logo';

export type AuthEmailProps = {
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  action: string;
  url: string;
  outro: string;
};

// The client's Geist; clients that drop web fonts (Gmail, Outlook) fall back to the system face.
const GEIST_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap';
const fontFamily =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// The redesign's light tokens (apps/client/src/styles/globals.css): mail clients can't read CSS variables.
const color = {
  raised: '#f7f7f7',
  panel: '#ffffff',
  border: '#e8e8e8',
  foreground: '#0a0a0a',
  secondary: '#404040',
  muted: '#737373',
};

const styles = {
  body: { backgroundColor: color.raised, fontFamily, margin: 0, padding: '32px 0' },
  container: {
    backgroundColor: color.panel,
    border: `1px solid ${color.border}`,
    borderRadius: '16px',
    maxWidth: '480px',
    padding: '28px',
  },
  wordmark: {
    color: color.foreground,
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    margin: 0,
  },
  heading: {
    color: color.foreground,
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    margin: '28px 0 12px',
  },
  text: { color: color.secondary, fontSize: '14px', lineHeight: '22px', margin: '0 0 14px' },
  button: {
    backgroundColor: color.foreground,
    borderRadius: '8px',
    color: color.panel,
    fontSize: '14px',
    fontWeight: 500,
    padding: '9px 16px',
  },
  fallback: { color: color.muted, fontSize: '12.5px', lineHeight: '20px', margin: '22px 0 0' },
  link: { color: color.secondary, wordBreak: 'break-all' },
  hr: { borderColor: color.border, margin: '22px 0' },
  footer: { color: color.muted, fontSize: '12.5px', lineHeight: '20px', margin: 0 },
} as const;

/** The shared layout of every auth email: the Nebula Chat mark, a message and one call to action. */
export const AuthEmail = ({
  preview,
  heading,
  greeting,
  intro,
  action,
  url,
  outro,
}: AuthEmailProps) => (
  <Html lang="en">
    <Head>
      <link rel="stylesheet" href={GEIST_STYLESHEET} />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Section>
          <Row>
            <Column style={{ width: '34px', verticalAlign: 'middle' }}>
              <Img src={`cid:${LOGO.contentId}`} width="26" height="26" alt="" />
            </Column>
            <Column style={{ verticalAlign: 'middle' }}>
              <Text style={styles.wordmark}>nebula chat</Text>
            </Column>
          </Row>
        </Section>
        <Heading as="h1" style={styles.heading}>
          {heading}
        </Heading>
        <Text style={styles.text}>{greeting}</Text>
        <Text style={styles.text}>{intro}</Text>
        <Button href={url} style={styles.button}>
          {action}
        </Button>
        <Text style={styles.fallback}>
          Button not working? Paste this link into your browser:{' '}
          <Link href={url} style={styles.link}>
            {url}
          </Link>
        </Text>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>{outro}</Text>
      </Container>
    </Body>
  </Html>
);
