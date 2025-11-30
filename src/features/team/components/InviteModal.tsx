import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Copy, Check } from 'lucide-react';
import { useTeamInvitations } from '../hooks/useTeamInvitations';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export const InviteModal = ({ open, onOpenChange, teamId }: InviteModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { sendInvitation, invitations } = useTeamInvitations(teamId);
  const { currentUserRole } = useTeamMembers(teamId);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Erreur',
        description: "Veuillez entrer une adresse email",
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendInvitation(email.trim(), role);
      
      if (result) {
        // Générer le lien d'invitation
        const inviteUrl = `${window.location.origin}/invite?token=${result.token}`;
        setGeneratedLink(inviteUrl);
        setEmail('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: 'Lien copié',
        description: 'Le lien d\'invitation a été copié dans le presse-papiers',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de copier le lien',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setGeneratedLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Si l'utilisateur est simplement "member", il ne peut inviter que des "member"
  const canSelectRole = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="membre@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as 'admin' | 'member')}
                disabled={!canSelectRole || isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membre</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
              {!canSelectRole && (
                <p className="text-xs text-muted-foreground">
                  Seuls les administrateurs peuvent choisir le rôle
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  'Envoyer l\'invitation'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Lien d'invitation généré</p>
              <p className="text-xs text-muted-foreground break-all">
                {generatedLink}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier le lien
                  </>
                )}
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Terminer
              </Button>
            </div>
          </div>
        )}

        {invitations.filter((inv) => inv.status === 'pending').length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Invitations en attente</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {invitations
                .filter((inv) => inv.status === 'pending')
                .map((inv) => (
                  <div key={inv.id} className="text-xs bg-muted p-2 rounded flex justify-between items-center">
                    <span className="truncate flex-1">{inv.email}</span>
                    <span className="text-muted-foreground ml-2">{inv.role}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
