// Vercel-style serverless function stub
// GET /api/datasets?project=GolfCourse_01
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const project = (req.query.project as string) || 'GolfCourse_01';
  const date_time = '2025-10-27_07-30';
  const base = `/sample-data/datasets/${project}/${date_time}`;
  try {
    const metaRes = await fetch(`${req.headers.origin || ''}${base}/metadata.json`);
    if (!metaRes.ok) return res.status(200).json([]);
    const metadata = await metaRes.json();
    return res.status(200).json([{ project, date_time, urlBase: base, metadata }]);
  } catch (e) {
    return res.status(200).json([]);
  }
}
