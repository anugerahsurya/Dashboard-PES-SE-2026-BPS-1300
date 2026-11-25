import { createHash, timingSafeEqual } from 'node:crypto';
import { validDate, validSnapshot } from '../src/validateSnapshot.js';

function matchesKey(input, expected) {
  if (typeof input !== 'string' || !input || !expected) return false;
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(input), digest(expected));
}

async function supabase(path, body) {
  const key = process.env.SUPABASE_SECRET_KEY;
  const base = process.env.SUPABASE_URL;
  if (!base || !key) throw new Error('Konfigurasi Supabase belum lengkap.');
  const response = await fetch(new URL('/rest/v1/' + path, base), {
    method: body ? 'POST' : 'GET',
    headers: {
      apikey: key,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Supabase HTTP ' + response.status);
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Metode tidak didukung.' });
  }
  try {
    if (req.method === 'GET') {
      const date = new URL(req.url, 'http://localhost').searchParams.get('date');
      if (date !== null && !validDate(date)) {
        return res.status(400).json({ ok: false, error: 'Tanggal laporan tidak valid.' });
      }
      const query = new URLSearchParams({ select: 'snapshot', order: 'report_date.desc,report_time.desc', limit: '1' });
      if (date) query.set('report_date', 'eq.' + date);
      const rows = await supabase('pes_snapshots?' + query);
      return res.json({ ok: true, snapshot: rows[0]?.snapshot ?? null });
    }

    const adminKey = process.env.PES_ADMIN_KEY;
    if (!adminKey) return res.status(503).json({ ok: false, error: 'Kunci admin belum dikonfigurasi di server.' });
    const body = req.body;
    if (!matchesKey(body?.adminKey, adminKey)) {
      return res.status(401).json({ ok: false, error: 'Kunci admin tidak sesuai.' });
    }
    const { snapshot } = body;
    if (!snapshot || JSON.stringify(snapshot).length > 55000 || !validSnapshot(snapshot)) {
      return res.status(400).json({ ok: false, error: 'Tanggal, wilayah, atau rekap status laporan tidak valid.' });
    }
    const saved = await supabase('rpc/save_pes_snapshot', { input_snapshot: snapshot });
    return res.json({ ok: true, snapshot: saved });
  } catch (error) {
    console.error('PES snapshot API:', error.message);
    return res.status(503).json({ ok: false, error: 'Supabase belum dapat diakses. Coba lagi sebentar.' });
  }
}
