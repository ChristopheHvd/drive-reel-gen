import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VideoErrorCard } from "./VideoErrorCard";
import { Video } from "../types";
import { Image } from "@/features/images/types";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed-image.jpg" },
        }),
      }),
    },
  },
}));

const mockImage: Image = {
  id: "img-123",
  team_id: "team-456",
  storage_path: "team-456/image.jpg",
  file_name: "test-image.jpg",
  file_size: 1024,
  mime_type: "image/jpeg",
  width: 1920,
  height: 1080,
  uploaded_by: "user-789",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const createMockVideo = (overrides: Partial<Video> = {}): Video => ({
  id: "video-123",
  team_id: "team-456",
  image_id: "img-123",
  prompt: "Test prompt",
  mode: "packshot",
  aspect_ratio: "16:9",
  duration_seconds: 5,
  status: "failed",
  kie_task_id: "task-123",
  timeout_at: "2024-01-01T01:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  generation_type: "FIRST_AND_LAST_FRAMES_2_VIDEO",
  video_url: "",
  target_duration_seconds: 8,
  current_segment: 1,
  segment_prompts: null,
  ...overrides,
});

describe("VideoErrorCard", () => {
  const mockOnDelete = vi.fn();
  const mockOnRegenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendu de base", () => {
    it("affiche le composant avec l'icône d'alerte", () => {
      render(
        <VideoErrorCard
          video={createMockVideo()}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Échec de génération")).toBeInTheDocument();
    });

    it("charge et affiche l'image source en fond", async () => {
      render(
        <VideoErrorCard
          video={createMockVideo()}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText("test-image.jpg");
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute(
          "src",
          "https://example.com/signed-image.jpg"
        );
      });
    });
  });

  describe("Affichage du message d'erreur", () => {
    it("affiche le message d'erreur tronqué", () => {
      const errorMessage = "Erreur de test courte";
      render(
        <VideoErrorCard
          video={createMockVideo({ error_message: errorMessage })}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("affiche un message par défaut si error_message est null", () => {
      render(
        <VideoErrorCard
          video={createMockVideo({ error_message: null })}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      expect(
        screen.getByText("Une erreur s'est produite lors de la génération")
      ).toBeInTheDocument();
    });

    it("affiche le bouton 'Voir les détails'", () => {
      render(
        <VideoErrorCard
          video={createMockVideo({
            error_message: "Un message d'erreur quelconque",
          })}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Voir les détails")).toBeInTheDocument();
    });
  });

  describe("Modal de détails", () => {
    it("ouvre la modal au clic sur 'Voir les détails'", async () => {
      const longErrorMessage =
        "Ceci est un message d'erreur très long qui devrait être tronqué dans l'affichage principal mais visible entièrement dans la modal de détails.";

      render(
        <VideoErrorCard
          video={createMockVideo({ error_message: longErrorMessage })}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      const detailsButton = screen.getByText("Voir les détails");
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Erreur de génération")).toBeInTheDocument();
      });
    });

    it("affiche le message d'erreur complet dans la modal", async () => {
      const longErrorMessage =
        "Message d'erreur complet avec tous les détails techniques nécessaires pour comprendre le problème.";

      render(
        <VideoErrorCard
          video={createMockVideo({ error_message: longErrorMessage })}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText("Voir les détails"));

      await waitFor(() => {
        // Le message complet apparaît dans la modal (DialogDescription)
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(longErrorMessage);
      });
    });
  });

  describe("Actions utilisateur", () => {
    it("appelle onDelete avec l'id de la vidéo au clic sur Supprimer", () => {
      const video = createMockVideo();

      render(
        <VideoErrorCard
          video={video}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByText("Supprimer");
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(video.id);
    });

    it("appelle onRegenerate avec la vidéo au clic sur Réessayer", () => {
      const video = createMockVideo();

      render(
        <VideoErrorCard
          video={video}
          image={mockImage}
          onDelete={mockOnDelete}
          onRegenerate={mockOnRegenerate}
        />
      );

      const retryButton = screen.getByText("Réessayer");
      fireEvent.click(retryButton);

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
      expect(mockOnRegenerate).toHaveBeenCalledWith(video);
    });

    it("n'affiche pas le bouton Réessayer si onRegenerate n'est pas fourni", () => {
      render(
        <VideoErrorCard
          video={createMockVideo()}
          image={mockImage}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText("Réessayer")).not.toBeInTheDocument();
    });
  });

  describe("Propagation des événements", () => {
    it("empêche la propagation du clic sur Supprimer", () => {
      const parentClickHandler = vi.fn();

      render(
        <div onClick={parentClickHandler}>
          <VideoErrorCard
            video={createMockVideo()}
            image={mockImage}
            onDelete={mockOnDelete}
          />
        </div>
      );

      fireEvent.click(screen.getByText("Supprimer"));

      expect(mockOnDelete).toHaveBeenCalled();
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("empêche la propagation du clic sur Réessayer", () => {
      const parentClickHandler = vi.fn();

      render(
        <div onClick={parentClickHandler}>
          <VideoErrorCard
            video={createMockVideo()}
            image={mockImage}
            onDelete={mockOnDelete}
            onRegenerate={mockOnRegenerate}
          />
        </div>
      );

      fireEvent.click(screen.getByText("Réessayer"));

      expect(mockOnRegenerate).toHaveBeenCalled();
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it("empêche la propagation du clic sur Voir les détails", () => {
      const parentClickHandler = vi.fn();

      render(
        <div onClick={parentClickHandler}>
          <VideoErrorCard
            video={createMockVideo({ error_message: "Erreur test" })}
            image={mockImage}
            onDelete={mockOnDelete}
          />
        </div>
      );

      fireEvent.click(screen.getByText("Voir les détails"));

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });
});
