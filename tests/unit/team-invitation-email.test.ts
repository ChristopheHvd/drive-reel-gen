import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Unit tests for TeamInvitationEmail React template
 * Tests that the email renders correctly with all required elements
 */

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

/**
 * Recreate the email template for testing purposes
 * This mirrors the template in supabase/functions/send-invitation/_templates/team-invitation.tsx
 */
const TeamInvitationEmail = ({
  inviteUrl,
  teamName,
  inviterName,
  role,
}: TeamInvitationEmailProps): React.ReactElement => {
  const roleLabel = getRoleLabel(role);
  const listItems = role === 'admin' 
    ? ['Générer des vidéos avec l\'IA', 'Inviter d\'autres membres', 'Gérer les paramètres de l\'équipe']
    : ['Générer des vidéos avec l\'IA', 'Accéder aux images de l\'équipe', 'Collaborer avec votre équipe'];

  return React.createElement('html', null,
    React.createElement('head', null,
      React.createElement('meta', { charSet: 'utf-8' }),
      React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
      React.createElement('title', null, 'Invitation QuickQuick')
    ),
    React.createElement('body', {
      style: {
        backgroundColor: '#0a0a0a',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
        margin: 0,
        padding: '40px 20px',
      }
    },
      React.createElement('div', {
        style: {
          margin: '0 auto',
          padding: '40px 20px',
          maxWidth: '600px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
        }
      },
        React.createElement('h1', {
          style: {
            color: '#FFD700',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 30px',
            textAlign: 'center',
          }
        }, '⚡ Invitation à rejoindre une équipe'),
        React.createElement('p', {
          style: {
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            margin: '16px 0',
          }
        },
          React.createElement('strong', null, inviterName),
          ' vous invite à rejoindre l\'équipe ',
          React.createElement('strong', null, teamName),
          ' sur QuickQuick.'
        ),
        React.createElement('p', {
          style: {
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            margin: '16px 0',
          }
        },
          'En tant que ',
          React.createElement('strong', { style: { color: '#FFD700' } }, roleLabel),
          ', vous pourrez :'
        ),
        React.createElement('ul', {
          style: {
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            marginLeft: '20px',
          }
        },
          ...listItems.map((item, index) =>
            React.createElement('li', { key: index, style: { marginBottom: '8px' } }, item)
          )
        ),
        React.createElement('div', {
          style: { textAlign: 'center', margin: '32px 0' }
        },
          React.createElement('a', {
            href: inviteUrl,
            style: {
              backgroundColor: '#FFD700',
              color: '#0a0a0a',
              fontSize: '16px',
              fontWeight: 'bold',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: '6px',
            }
          }, 'Accepter l\'invitation')
        ),
        React.createElement('p', {
          style: {
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '26px',
            margin: '16px 0',
          }
        }, 'Ou copiez-collez ce lien dans votre navigateur :'),
        React.createElement('p', {
          style: {
            color: '#00BCD4',
            fontSize: '14px',
            wordBreak: 'break-all',
            margin: '8px 0',
          }
        }, inviteUrl),
        React.createElement('p', {
          style: {
            color: '#888888',
            fontSize: '14px',
            lineHeight: '22px',
            marginTop: '24px',
          }
        }, 'Cette invitation expirera dans 7 jours.'),
        React.createElement('p', {
          style: {
            color: '#888888',
            fontSize: '14px',
            lineHeight: '22px',
            marginTop: '24px',
          }
        }, 'Si vous n\'avez pas demandé cette invitation, vous pouvez ignorer cet email.')
      )
    )
  );
};

describe('TeamInvitationEmail Template', () => {
  const defaultProps: TeamInvitationEmailProps = {
    inviteUrl: 'https://quickquick.video/invite?token=test-token-123',
    teamName: 'Alpes IA',
    inviterName: 'Jean Dupont',
    role: 'member',
  };

  describe('HTML rendering', () => {
    it('should render valid HTML structure', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('<html');
      expect(html).toContain('<head');
      expect(html).toContain('<body');
      expect(html).toContain('</html>');
    });

    it('should include team name in email body', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('Alpes IA');
    });

    it('should include inviter name in email body', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('Jean Dupont');
    });

    it('should include invite URL in button and text', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('invite?token=test-token-123');
      // URL appears twice: once in the button href, once in plain text
      const urlMatches = html.match(/invite\?token=test-token-123/g);
      expect(urlMatches?.length).toBeGreaterThanOrEqual(2);
    });

    it('should include "Accepter l\'invitation" button', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('Accepter l&#x27;invitation');
    });

    it('should include 7-day expiration notice', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('expirera dans 7 jours');
    });
  });

  describe('Role-based content', () => {
    it('should display "Membre" label for member role', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, { ...defaultProps, role: 'member' })
      );
      
      expect(html).toContain('Membre');
      expect(html).not.toContain('Administrateur');
    });

    it('should display "Administrateur" label for admin role', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, { ...defaultProps, role: 'admin' })
      );
      
      expect(html).toContain('Administrateur');
    });

    it('should show admin-specific permissions for admin role', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, { ...defaultProps, role: 'admin' })
      );
      
      expect(html).toContain('Inviter d&#x27;autres membres');
      expect(html).toContain('Gérer les paramètres de l&#x27;équipe');
    });

    it('should show member-specific permissions for member role', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, { ...defaultProps, role: 'member' })
      );
      
      expect(html).toContain('Accéder aux images de l&#x27;équipe');
      expect(html).toContain('Collaborer avec votre équipe');
    });

    it('should always include video generation permission', () => {
      const memberHtml = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, { ...defaultProps, role: 'member' })
      );
      const adminHtml = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, { ...defaultProps, role: 'admin' })
      );
      
      expect(memberHtml).toContain('Générer des vidéos avec l&#x27;IA');
      expect(adminHtml).toContain('Générer des vidéos avec l&#x27;IA');
    });
  });

  describe('Branding', () => {
    it('should include QuickQuick brand name', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('QuickQuick');
    });

    it('should have correct title', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('<title>Invitation QuickQuick</title>');
    });

    it('should use gold color for emphasis (#FFD700)', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('#FFD700');
    });

    it('should use dark theme background (#0a0a0a)', () => {
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, defaultProps)
      );
      
      expect(html).toContain('#0a0a0a');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in team name', () => {
      const props = {
        ...defaultProps,
        teamName: 'Équipe "Test" & Co.',
      };
      
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, props)
      );
      
      expect(html).toContain('Équipe');
      expect(html).toContain('&amp;');
      expect(html).toContain('Co.');
    });

    it('should handle long URLs', () => {
      const longToken = 'a'.repeat(100);
      const props = {
        ...defaultProps,
        inviteUrl: `https://quickquick.video/invite?token=${longToken}`,
      };
      
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, props)
      );
      
      expect(html).toContain(longToken);
    });

    it('should handle unknown role as member', () => {
      const props = {
        ...defaultProps,
        role: 'unknown_role',
      };
      
      const html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, props)
      );
      
      // Should default to "Membre"
      expect(html).toContain('Membre');
    });
  });
});
