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
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface TeamInvitationEmailProps {
  inviteUrl: string;
  teamName: string;
  inviterName: string;
  role: string;
}

export const TeamInvitationEmail = ({
  inviteUrl,
  teamName,
  inviterName,
  role,
}: TeamInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Vous avez été invité à rejoindre {teamName} sur QuickQuick</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚡ Invitation à rejoindre une équipe</Heading>
        
        <Text style={text}>
          <strong>{inviterName}</strong> vous invite à rejoindre l'équipe{' '}
          <strong>{teamName}</strong> sur QuickQuick.
        </Text>

        <Text style={text}>
          En tant que <strong style={roleStyle}>{getRoleLabel(role)}</strong>, vous pourrez :
        </Text>

        <ul style={list}>
          {role === 'admin' ? (
            <>
              <li style={listItem}>Générer des vidéos avec l'IA</li>
              <li style={listItem}>Inviter d'autres membres</li>
              <li style={listItem}>Gérer les paramètres de l'équipe</li>
            </>
          ) : (
            <>
              <li style={listItem}>Générer des vidéos avec l'IA</li>
              <li style={listItem}>Accéder aux images de l'équipe</li>
              <li style={listItem}>Collaborer avec votre équipe</li>
            </>
          )}
        </ul>

        <Section style={buttonContainer}>
          <Button style={button} href={inviteUrl}>
            Accepter l'invitation
          </Button>
        </Section>

        <Text style={text}>
          Ou copiez-collez ce lien dans votre navigateur :
        </Text>
        <Text style={linkText}>{inviteUrl}</Text>

        <Text style={footer}>
          Cette invitation expirera dans 7 jours.
        </Text>

        <Text style={footer}>
          Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
);

function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'member':
      return 'Membre';
    default:
      return 'Membre';
  }
}

export default TeamInvitationEmail;

// Styles
const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  backgroundColor: '#1a1a1a',
  borderRadius: '8px',
};

const h1 = {
  color: '#FFD700',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 30px',
  textAlign: 'center' as const,
};

const text = {
  color: '#e5e5e5',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const roleStyle = {
  color: '#FFD700',
  textTransform: 'capitalize' as const,
};

const list = {
  color: '#e5e5e5',
  fontSize: '16px',
  lineHeight: '26px',
  marginLeft: '20px',
};

const listItem = {
  marginBottom: '8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#FFD700',
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  borderRadius: '6px',
};

const linkText = {
  color: '#00BCD4',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  margin: '8px 0',
};

const footer = {
  color: '#888888',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '24px',
};
