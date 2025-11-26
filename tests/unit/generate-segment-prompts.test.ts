import { describe, it, expect } from 'vitest';

/**
 * Tests pour la logique d'extraction JSON de generate-segment-prompts
 * Cette fonction nettoie les réponses AI qui peuvent être encapsulées dans des backticks markdown
 */

// Fonction utilitaire testée (copie de celle dans l'Edge Function)
const extractJsonFromMarkdown = (text: string): string => {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(jsonBlockRegex);
  return match && match[1] ? match[1].trim() : text.trim();
};

describe('generate-segment-prompts - JSON extraction', () => {
  it('should extract JSON from markdown code blocks with json language', () => {
    const input = '```json\n{"prompts": ["prompt 1", "prompt 2"]}\n```';
    const result = extractJsonFromMarkdown(input);
    expect(result).toBe('{"prompts": ["prompt 1", "prompt 2"]}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should extract JSON from markdown code blocks without language specifier', () => {
    const input = '```\n{"prompts": ["prompt 1", "prompt 2"]}\n```';
    const result = extractJsonFromMarkdown(input);
    expect(result).toBe('{"prompts": ["prompt 1", "prompt 2"]}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should handle plain JSON without backticks', () => {
    const input = '{"prompts": ["prompt 1", "prompt 2"]}';
    const result = extractJsonFromMarkdown(input);
    expect(result).toBe('{"prompts": ["prompt 1", "prompt 2"]}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should handle JSON with extra whitespace in backticks', () => {
    const input = '```json\n\n  {"prompts": ["prompt 1"]}\n\n  ```';
    const result = extractJsonFromMarkdown(input);
    expect(result).toBe('{"prompts": ["prompt 1"]}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should parse real AI response format', () => {
    const input = `\`\`\`json
{
  "prompts": [
    "Caméra portée suivant une personne entrant dans une boutique animée, ambiance lumineuse naturelle douce. La personne se dirige vers un rayon, mains tendant vers un objet spécifique. Mouvements fluides, atmosphère authentique, transitions rapides.",
    "Zoom rapide sur la personne, son visage s'illuminant d'enthousiasme, déballant habilement le produit fraîchement acquis. Séquence dynamique et rythmée, montrant la joie de la découverte, avec des gestes vifs et une présentation pleine d'énergie."
  ]
}
\`\`\``;
    const result = extractJsonFromMarkdown(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toHaveProperty('prompts');
    expect(Array.isArray(parsed.prompts)).toBe(true);
    expect(parsed.prompts).toHaveLength(2);
  });

  it('should validate correct number of prompts for 16s duration', () => {
    const input = '```json\n{"prompts": ["prompt 1", "prompt 2"]}\n```';
    const result = extractJsonFromMarkdown(input);
    const parsed = JSON.parse(result);
    
    const targetDuration = 16;
    const expectedSegments = Math.ceil(targetDuration / 8); // 2 segments
    
    expect(parsed.prompts).toHaveLength(expectedSegments);
  });

  it('should validate correct number of prompts for 24s duration', () => {
    const input = '```json\n{"prompts": ["p1", "p2", "p3"]}\n```';
    const result = extractJsonFromMarkdown(input);
    const parsed = JSON.parse(result);
    
    const targetDuration = 24;
    const expectedSegments = Math.ceil(targetDuration / 8); // 3 segments
    
    expect(parsed.prompts).toHaveLength(expectedSegments);
  });

  it('should handle single prompt for 8s duration (no segmentation)', () => {
    const input = '```json\n{"prompts": ["original prompt"]}\n```';
    const result = extractJsonFromMarkdown(input);
    const parsed = JSON.parse(result);
    
    expect(parsed.prompts).toHaveLength(1);
  });
});
