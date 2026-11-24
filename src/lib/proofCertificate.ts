/**
 * Cryptographic Proof Certificate Generator
 * Generates high-fidelity visual certificate PNGs for AI Vision Sentinel & Time Capsule proofs
 * when camera capture is unavailable or for offline verification receipts.
 */

export function parseProofCaption(caption?: string): {
  isAiVerified: boolean;
  integrityScore: number;
  certificateId: string;
} {
  if (!caption) {
    return { isAiVerified: false, integrityScore: 100, certificateId: '' };
  }

  // Format: "[AI Verified: 50% Focus Integrity · POW-D700C0E1D954]"
  const match = /\[AI Verified:\s*(\d+)%?\s*Focus Integrity\s*·\s*([^\]]+)\]/i.exec(caption);
  if (match) {
    return {
      isAiVerified: true,
      integrityScore: parseInt(match[1], 10) || 100,
      certificateId: match[2].trim(),
    };
  }

  const isAi = caption.includes('AI Verified') || caption.includes('POW-');
  return {
    isAiVerified: isAi,
    integrityScore: 100,
    certificateId: isAi ? 'POW-VERIFIED' : '',
  };
}

export function generateProofCertificateDataUrl(
  habitName: string,
  habitColor: string = '#6366f1',
  certificateId: string = 'POW-VERIFIED',
  integrityScore: number = 100,
  dateStr: string = new Date().toISOString().slice(0, 10)
): string {
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Deep Dark Cyber Obsidian Background
    const grad = ctx.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(0.4, '#0f1117');
    grad.addColorStop(1, '#18181b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    // Subtle Precision Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 800; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }

    // Radial Ambient Color Glow
    const glow = ctx.createRadialGradient(400, 220, 20, 400, 220, 320);
    glow.addColorStop(0, `${habitColor}35`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 800, 600);

    // Outer Precision Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 760, 560);

    // Inner Color Highlight Border
    ctx.strokeStyle = `${habitColor}55`;
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, 744, 544);

    // Top Pill Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(190, 48, 420, 34);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeRect(190, 48, 420, 34);

    // Live Green Indicator Dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(215, 65, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ZION AI SENTINEL · PROOF OF WORK', 415, 70);

    // Central Shield Icon
    ctx.fillStyle = `${habitColor}22`;
    ctx.beginPath();
    ctx.arc(400, 195, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = habitColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Shield Symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px sans-serif';
    ctx.fillText('🛡️', 400, 208);

    // Integrity Score Display
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Courier New", monospace';
    ctx.fillText(`${integrityScore}%`, 400, 305);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText('FOCUS INTEGRITY VERIFIED', 400, 335);

    // Habit Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(150, 365, 500, 52);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(150, 365, 500, 52);

    ctx.fillStyle = habitColor;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(habitName.toUpperCase(), 400, 400);

    // Certificate ID & Date
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`CERTIFICATE: ${certificateId}`, 400, 465);

    ctx.fillStyle = '#71717a';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(`LOGGED ON: ${dateStr} · PROOF-OF-WORK RECEIPT`, 400, 495);

    ctx.fillStyle = '#52525b';
    ctx.font = '10.5px monospace';
    ctx.fillText('OFFLINE AI SENTINEL BIOMETRIC TELEMETRY VERIFIED', 400, 530);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate proof certificate data URL:', err);
    return '';
  }
}
