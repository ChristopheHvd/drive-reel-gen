import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Copy, Check, Pencil } from 'lucide-react';
import { useTeamInvitations } from '../hooks/useTeamInvitations';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useCurrentTeam } from '../hooks/useCurrentTeam';
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const { sendInvitation, invitations } = useTeamInvitations(teamId);
  const { currentUserRole } = useTeamMembers(teamId);
  const { teamName, updateTeamName } = useCurrentTeam();
  const { toast } = useToast();

  // Parser et valider les emails
  const parseEmails = (input: string): string[] => {
    return input
      .split(/[,;\n]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parsedEmails = parseEmails(email);
  const validEmails = parsedEmails.filter(e => emailRegex.test(e));
  const invalidEmails = parsedEmails.filter(e => !emailRegex.test(e));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedEmails.length === 0) {
      toast({
        title: 'Erreur',
        description: "Veuillez entrer au moins une adresse email",
        variant: 'destructive',
      });
      return;
    }

    if (invalidEmails.length > 0) {
      toast({
        title: 'Emails invalides',
        description: `Les adresses suivantes sont invalides : ${invalidEmails.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        validEmails.map(e => sendInvitation(e, role))
      );

      const successResults = results.filter(
        (r): r is PromiseFulfilledResult<{ token: string } | null> => 
          r.status === 'fulfilled' && r.value !== null
      );
      const successCount = successResults.length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: 'Invitations envoyées',
          description: `${successCount} invitation(s) envoyée(s)${failCount > 0 ? `, ${failCount} échec(s)` : ''}`,
        });

        // Afficher le lien uniquement si une seule invitation envoyée avec succès
        if (validEmails.length === 1 && successResults.length === 1 && successResults[0].value) {
          const inviteUrl = `${window.location.origin}/invite?token=${successResults[0].value.token}`;
          setGeneratedLink(inviteUrl);
        }

        setEmail('');
      } else {
        toast({
          title: 'Erreur',
          description: 'Aucune invitation n\'a pu être envoyée',
          variant: 'destructive',
        });
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
    setIsEditingName(false);
    setEditedName('');
    onOpenChange(false);
  };

  const handleEditName = () => {
    setEditedName(teamName || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom de l\'équipe ne peut pas être vide',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingName(true);
    try {
      await updateTeamName(editedName.trim());
      toast({
        title: 'Nom modifié',
        description: 'Le nom de l\'équipe a été mis à jour',
      });
      setIsEditingName(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le nom',
        variant: 'destructive',
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  // Si l'utilisateur est simplement "member", il ne peut inviter que des "member"
  const canSelectRole = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canEditTeamName = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          {teamName && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Nom de l'équipe"
                    disabled={isSavingName}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="h-8 px-2"
                  >
                    {isSavingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEditName}
                    disabled={isSavingName}
                    className="h-8 px-2"
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <>
                  <span>Équipe : <strong className="text-foreground">{teamName}</strong></span>
                  {canEditTeamName && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditName}
                      className="h-6 w-6 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {!generatedLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresses email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="email"
                  placeholder="user1@exemple.com, user2@exemple.com&#10;ou une adresse par ligne"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 min-h-[80px] resize-none"
                  disabled={isSubmitting}
                />
              </div>
              {parsedEmails.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {validEmails.length} adresse(s) valide(s)
                  {invalidEmails.length > 0 && (
                    <span className="text-destructive"> • {invalidEmails.length} invalide(s)</span>
                  )}
                </p>
              )}
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
              <Button type="submit" disabled={isSubmitting || validEmails.length === 0} className="flex-1">
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
