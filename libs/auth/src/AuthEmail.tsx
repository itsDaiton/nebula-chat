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

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const styles = {
  body: { backgroundColor: '#f4f4f5', fontFamily, margin: 0, padding: '32px 0' },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: '12px',
    maxWidth: '480px',
    padding: '32px',
  },
  wordmark: {
    color: '#09090b',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  heading: { color: '#09090b', fontSize: '22px', fontWeight: 700, margin: '32px 0 16px' },
  text: { color: '#3f3f46', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' },
  button: {
    backgroundColor: '#09090b',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 20px',
  },
  fallback: { color: '#71717a', fontSize: '13px', lineHeight: '20px', margin: '24px 0 0' },
  link: { color: '#3f3f46', wordBreak: 'break-all' },
  hr: { borderColor: '#e4e4e7', margin: '24px 0' },
  footer: { color: '#71717a', fontSize: '13px', lineHeight: '20px', margin: 0 },
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
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Section>
          <Row>
            <Column style={{ width: '40px', verticalAlign: 'middle' }}>
              <Img src={`cid:${LOGO.contentId}`} width="32" height="32" alt="" />
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
