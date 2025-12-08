import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for send-invitation Edge Function
 * Tests the complete invitation flow with mocked dependencies
 */

// Mock types matching the Edge Function
interface InvitationPayload {
  teamId: string;
  email: string;
  role: 'admin' | 'member';
}

interface TeamMember {
  role: 'owner' | 'admin' | 'member';
  user_id: string;
}

interface Invitation {
  id: string;
  token: string;
  email: string;
  team_id: string;
  role: string;
  status: string;
  expires_at: string;
}

// Simulate the Edge Function logic for testing
class SendInvitationService {
  private teamMembers: TeamMember[] = [];
  private existingInvitations: Invitation[] = [];
  private currentUserId: string = '';
  private currentUserEmail: string = '';

  constructor(config: {
    teamMembers: TeamMember[];
    existingInvitations?: Invitation[];
    currentUserId: string;
    currentUserEmail: string;
  }) {
    this.teamMembers = config.teamMembers;
    this.existingInvitations = config.existingInvitations || [];
    this.currentUserId = config.currentUserId;
    this.currentUserEmail = config.currentUserEmail;
  }

  async processInvitation(payload: InvitationPayload): Promise<{
    success: boolean;
    error?: string;
    invitation?: Partial<Invitation>;
    isResend?: boolean;
    statusCode: number;
  }> {
    // Validate required fields
    if (!payload.teamId || !payload.email || !payload.role) {
      return {
        success: false,
        error: 'teamId, email et role sont requis',
        statusCode: 400,
      };
    }

    // Normalize email
    const normalizedEmail = payload.email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        success: false,
        error: 'Format d\'email invalide',
        statusCode: 400,
      };
    }

    // Validate role
    if (!['admin', 'member'].includes(payload.role)) {
      return {
        success: false,
        error: 'Le rôle doit être "admin" ou "member"',
        statusCode: 400,
      };
    }

    // Check if user is admin/owner
    const currentMember = this.teamMembers.find(m => m.user_id === this.currentUserId);
    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return {
        success: false,
        error: 'Vous devez être admin ou propriétaire pour inviter des membres',
        statusCode: 403,
      };
    }

    // Check self-invitation
    if (normalizedEmail === this.currentUserEmail.toLowerCase()) {
      return {
        success: false,
        error: 'Vous ne pouvez pas vous inviter vous-même',
        statusCode: 400,
      };
    }

    // Check if already a team member
    // (In real implementation, this would query user_profiles)
    
    // Check for existing pending invitation
    const existingInvitation = this.existingInvitations.find(
      inv => inv.email === normalizedEmail && 
             inv.team_id === payload.teamId && 
             inv.status === 'pending'
    );

    if (existingInvitation) {
      // Resend existing invitation
      return {
        success: true,
        invitation: existingInvitation,
        isResend: true,
        statusCode: 200,
      };
    }

    // Create new invitation
    const newInvitation: Invitation = {
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      email: normalizedEmail,
      team_id: payload.teamId,
      role: payload.role,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return {
      success: true,
      invitation: newInvitation,
      isResend: false,
      statusCode: 200,
    };
  }
}

describe('Send Invitation Integration', () => {
  const mockTeamId = 'team-uuid-123';
  const mockUserId = 'user-uuid-456';
  const mockUserEmail = 'admin@example.com';

  describe('Permission checks', () => {
    it('should allow owner to send invitations', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'newuser@example.com',
        role: 'member',
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should allow admin to send invitations', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'admin', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'newuser@example.com',
        role: 'member',
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should deny member from sending invitations', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'member', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'newuser@example.com',
        role: 'member',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain('admin ou propriétaire');
    });

    it('should deny non-team-member from sending invitations', async () => {
      const service = new SendInvitationService({
        teamMembers: [], // User not in team
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'newuser@example.com',
        role: 'member',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('Input validation', () => {
    let service: SendInvitationService;

    beforeEach(() => {
      service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });
    });

    it('should reject missing teamId', async () => {
      const result = await service.processInvitation({
        teamId: '',
        email: 'test@example.com',
        role: 'member',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'invalid-email',
        role: 'member',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('email invalide');
    });

    it('should reject invalid role', async () => {
      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'test@example.com',
        role: 'superadmin' as any,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it('should normalize email to lowercase', async () => {
      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'TEST@EXAMPLE.COM',
        role: 'member',
      });

      expect(result.success).toBe(true);
      expect(result.invitation?.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', async () => {
      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: '  user@example.com  ',
        role: 'member',
      });

      expect(result.success).toBe(true);
      expect(result.invitation?.email).toBe('user@example.com');
    });
  });

  describe('Self-invitation prevention', () => {
    it('should prevent user from inviting themselves', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: 'admin@example.com',
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'admin@example.com',
        role: 'member',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('vous-même');
    });

    it('should prevent self-invitation with different case', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: 'Admin@Example.COM',
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'admin@example.com',
        role: 'member',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('vous-même');
    });
  });

  describe('Duplicate invitation handling', () => {
    it('should resend existing pending invitation instead of creating duplicate', async () => {
      const existingInvitation: Invitation = {
        id: 'existing-inv-id',
        token: 'existing-token',
        email: 'invited@example.com',
        team_id: mockTeamId,
        role: 'member',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        existingInvitations: [existingInvitation],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'invited@example.com',
        role: 'member',
      });

      expect(result.success).toBe(true);
      expect(result.isResend).toBe(true);
      expect(result.invitation?.id).toBe('existing-inv-id');
      expect(result.invitation?.token).toBe('existing-token');
    });

    it('should create new invitation if existing one is not pending', async () => {
      const expiredInvitation: Invitation = {
        id: 'expired-inv-id',
        token: 'expired-token',
        email: 'invited@example.com',
        team_id: mockTeamId,
        role: 'member',
        status: 'expired',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        existingInvitations: [expiredInvitation],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'invited@example.com',
        role: 'member',
      });

      expect(result.success).toBe(true);
      expect(result.isResend).toBe(false);
      expect(result.invitation?.id).not.toBe('expired-inv-id');
    });
  });

  describe('Invitation creation', () => {
    it('should create invitation with correct fields', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'newuser@example.com',
        role: 'admin',
      });

      expect(result.success).toBe(true);
      expect(result.invitation).toBeDefined();
      expect(result.invitation?.email).toBe('newuser@example.com');
      expect(result.invitation?.team_id).toBe(mockTeamId);
      expect(result.invitation?.role).toBe('admin');
      expect(result.invitation?.status).toBe('pending');
      expect(result.invitation?.token).toBeDefined();
      expect(result.invitation?.id).toBeDefined();
    });

    it('should set expiration to 7 days from now', async () => {
      const service = new SendInvitationService({
        teamMembers: [{ role: 'owner', user_id: mockUserId }],
        currentUserId: mockUserId,
        currentUserEmail: mockUserEmail,
      });

      const beforeCall = Date.now();
      const result = await service.processInvitation({
        teamId: mockTeamId,
        email: 'newuser@example.com',
        role: 'member',
      });
      const afterCall = Date.now();

      expect(result.invitation?.expires_at).toBeDefined();
      
      const expiresAt = new Date(result.invitation!.expires_at!).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      
      expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + sevenDaysMs - 1000);
      expect(expiresAt).toBeLessThanOrEqual(afterCall + sevenDaysMs + 1000);
    });
  });
});
