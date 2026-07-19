import { ImageResponse } from 'next/og';
import { EnvelopeSchema } from '@/core/domain/envelope';
import { ResultSchema, gritBand } from '@/core/domain/assessment';

// M4 — OG share image 9:16 (FR-D5). FE responsibility by design: reads result
// data from the BE and renders a templated card — zero Gemini token cost.
// This route runs server-side WITHOUT browser credentials → the BE treats it
// as a non-owner link holder, which still gets the full data (FR-D8).

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export const runtime = 'edge';

type OgLocale = 'en' | 'id';

const BAND_LABELS: Record<OgLocale, Record<'low' | 'medium' | 'high', string>> = {
  en: { low: 'Still warming up', medium: 'Steady climber', high: 'Unstoppable' },
  id: { low: 'Masih pemanasan', medium: 'Pendaki konsisten', high: 'Nggak terbendung' },
};
const TAGLINE: Record<OgLocale, string> = {
  en: 'Meet the real you',
  id: 'Kenalan sama dirimu yang asli',
};
const CTA: Record<OgLocale, string> = {
  en: 'What does yours look like?',
  id: 'Punyamu kayak apa?',
};

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  let mbti = '????';
  let grit: number | null = null;
  let locale: OgLocale = 'en';
  let mascotStyle = 'style_a';
  try {
    const res = await fetch(
      `${BASE_URL}/v1/results/${encodeURIComponent(id)}`,
      { next: { revalidate: 300 } },
    );
    const envelope = EnvelopeSchema.parse(await res.json());
    if (res.ok && envelope.success) {
      const result = ResultSchema.parse(envelope.data);
      if (/^[EI][SN][TF][JP]$/.test(result.mbti_type)) mbti = result.mbti_type;
      grit = result.grit_score;
      locale = result.locale === 'id' ? 'id' : 'en';
      mascotStyle = result.mascot_style === 'style_b' ? 'style_b' : 'style_a';
    }
  } catch {
    // Expired/unreachable → still render a branded card (no broken preview).
  }

  const band = grit !== null ? BAND_LABELS[locale][gritBand(grit)] : null;
  const mascotUrl =
    mbti !== '????'
      ? new URL(`/mascots/${mbti}_${mascotStyle}.jpeg`, req.url).toString()
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #EBF9FB 0%, #ffffff 45%, #F3E8FF 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, color: '#0E9AA8' }}>
          Your Persona&apos;s
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#64748b', marginTop: 8 }}>
          {TAGLINE[locale]}
        </div>

        {mascotUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mascotUrl}
            alt=""
            width={460}
            height={460}
            style={{ marginTop: 70, borderRadius: 96 }}
          />
        )}

        <div
          style={{
            display: 'flex',
            fontSize: 190,
            fontWeight: 800,
            color: '#1e293b',
            marginTop: 50,
            letterSpacing: -6,
          }}
        >
          {mbti}
        </div>

        {band && (
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 700,
              color: '#095F68',
              background: '#D0F1F4',
              padding: '18px 48px',
              borderRadius: 999,
              marginTop: 30,
            }}
          >
            GRIT {grit} · {band}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            fontSize: 42,
            fontWeight: 700,
            color: '#ffffff',
            background: '#9333EA',
            padding: '26px 64px',
            borderRadius: 40,
            marginTop: 110,
          }}
        >
          {CTA[locale]}
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
