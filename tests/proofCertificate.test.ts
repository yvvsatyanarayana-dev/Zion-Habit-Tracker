import { describe, it, expect } from 'vitest';
import { parseProofCaption } from '../src/lib/proofCertificate';

describe('proofCertificate parsing', () => {
  it('parses AI Vision Sentinel caption correctly', () => {
    const caption = '[AI Verified: 50% Focus Integrity · POW-D700C0E1D954]';
    const result = parseProofCaption(caption);

    expect(result.isAiVerified).toBe(true);
    expect(result.integrityScore).toBe(50);
    expect(result.certificateId).toBe('POW-D700C0E1D954');
  });

  it('handles 100% focus integrity captions', () => {
    const caption = '[AI Verified: 100% Focus Integrity · POW-A1B2C3D4E5F6]';
    const result = parseProofCaption(caption);

    expect(result.isAiVerified).toBe(true);
    expect(result.integrityScore).toBe(100);
    expect(result.certificateId).toBe('POW-A1B2C3D4E5F6');
  });

  it('handles empty or custom photo captions', () => {
    const caption = 'Completed 10 miles morning run';
    const result = parseProofCaption(caption);

    expect(result.isAiVerified).toBe(false);
    expect(result.integrityScore).toBe(100);
    expect(result.certificateId).toBe('');
  });

  it('handles null or undefined captions safely', () => {
    const result = parseProofCaption(undefined);

    expect(result.isAiVerified).toBe(false);
    expect(result.integrityScore).toBe(100);
    expect(result.certificateId).toBe('');
  });
});
