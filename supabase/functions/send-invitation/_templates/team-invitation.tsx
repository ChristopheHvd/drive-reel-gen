import * as React from 'https://esm.sh/react@18.3.1';

interface TeamInvitationEmailProps {
  inviteUrl: string;
  teamName: string;
  inviterName: string;
  role: string;
}

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

export const TeamInvitationEmail = ({
  inviteUrl,
  teamName,
  inviterName,
  role,
}: TeamInvitationEmailProps): React.ReactElement => {
  const roleLabel = getRoleLabel(role);
  const listItems = role === 'admin' 
    ? ['Générer des vidéos avec l\'IA', 'Inviter d\'autres membres', 'Gérer les paramètres de l\'équipe']
    : ['Générer des vidéos avec l\'IA', 'Accéder aux images de l\'équipe', 'Collaborer avec votre équipe'];

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invitation QuickQuick</title>
      </head>
      <body style={{
        backgroundColor: '#0a0a0a',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
        margin: 0,
        padding: '40px 20px',
      }}>
        <div style={{
          margin: '0 auto',
          padding: '40px 20px',
          maxWidth: '600px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
        }}>
          <h1 style={{
            color: '#FFD700',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 30px',
            textAlign: 'center',
          }}>
            ⚡ Invitation à rejoindre une équipe
          </h1>
          
          <p style={{
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            margin: '16px 0',
          }}>
            <strong>{inviterName}</strong> vous invite à rejoindre l'équipe{' '}
            <strong>{teamName}</strong> sur QuickQuick.
          </p>

          <p style={{
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            margin: '16px 0',
          }}>
            En tant que <strong style={{ color: '#FFD700' }}>{roleLabel}</strong>, vous pourrez :
          </p>

          <ul style={{
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            marginLeft: '20px',
          }}>
            {listItems.map((item, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>{item}</li>
            ))}
          </ul>

          <div style={{
            textAlign: 'center',
            margin: '32px 0',
          }}>
            <a
              href={inviteUrl}
              style={{
                backgroundColor: '#FFD700',
                color: '#0a0a0a',
                fontSize: '16px',
                fontWeight: 'bold',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'inline-block',
                padding: '14px 32px',
                borderRadius: '6px',
              }}
            >
              Accepter l'invitation
            </a>
          </div>

          <p style={{
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            margin: '16px 0',
          }}>
            Ou copiez-collez ce lien dans votre navigateur :
          </p>
          
          <p style={{
            color: '#00BCD4',
            fontSize: '14px',
            wordBreak: 'break-all',
            margin: '8px 0',
          }}>
            {inviteUrl}
          </p>

          <p style={{
            color: '#888888',
            fontSize: '14px',
            lineHeight: '22px',
            marginTop: '24px',
          }}>
            Cette invitation expirera dans 7 jours.
          </p>

          <p style={{
            color: '#888888',
            fontSize: '14px',
            lineHeight: '22px',
            marginTop: '24px',
          }}>
            Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
          </p>
        </div>
      </body>
    </html>
  );
};

export default TeamInvitationEmail;
