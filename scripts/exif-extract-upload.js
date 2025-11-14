#!/usr/bin/env node
/*
  EXIF extraction and upload helper
  - Reads images from a local folder
  - Extracts DateTimeOriginal/CreateDate via exiftool
  - Computes dataset folder name: datasets/{project}/{YYYY-MM-DD}_{HH-MM}
  - Writes metadata.json and creates tiles/ and overlays/ placeholders
  - Demonstrates upload to Supabase Storage or R2 (S3 compatible)

  Usage:
    node exif-extract-upload.js --project GolfCourse_01 --input ./photos --uploader client_xyz --supabase
    node exif-extract-upload.js --project GolfCourse_01 --input ./photos --uploader client_xyz --r2

  Env vars required (see scripts/env.example):
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (for Supabase)
    R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET  (for R2)
*/

const path = require('path');
const fs = require('fs');
const { exiftool } = require('exiftool-vendored');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const argv = require('node:process').argv.slice(2);
function getArg(name, fallback) {
  const idx = argv.findIndex(a => a === `--${name}`);
  if (idx !== -1) return argv[idx + 1];
  return fallback;
}
function hasFlag(name) {
  return argv.includes(`--${name}`);
}

async function main() {
  const project = getArg('project');
  const inputDir = getArg('input');
  const uploader = getArg('uploader', 'unknown');
  const useSupabase = hasFlag('supabase');
  const useR2 = hasFlag('r2');

  if (!project || !inputDir) {
    console.error('Usage: node exif-extract-upload.js --project <name> --input <folder> [--uploader <id>] [--supabase|--r2]');
    process.exit(1);
  }

  // Read images
  const files = fs.readdirSync(inputDir).filter(f => /\.(jpe?g|tif?f|png)$/i.test(f));
  if (!files.length) {
    console.error('No images found in', inputDir);
    process.exit(1);
  }

  // Extract EXIF times; pick earliest as flight start
  const times = [];
  for (const f of files) {
    try {
      const p = path.join(inputDir, f);
      const exif = await exiftool.read(p);
      const timeStr = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
      const d = timeStr ? new Date(timeStr.replace(/:/, '-').replace(/:/, '-')) : null;
      const mtime = fs.statSync(p).mtime;
      times.push(d || mtime);
    } catch (e) {
      times.push(fs.statSync(path.join(inputDir, f)).mtime);
    }
  }
  times.sort((a,b)=>a-b);
  const start = times[0];
  const yyyy = start.getFullYear();
  const mm = String(start.getMonth()+1).padStart(2,'0');
  const dd = String(start.getDate()).padStart(2,'0');
  const HH = String(start.getHours()).padStart(2,'0');
  const MM = String(start.getMinutes()).padStart(2,'0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${HH}:${MM}`;
  const dateTimeFolder = `${dateStr}_${HH}-${MM}`;

  // Build metadata.json
  const bbox = [0,0,0,0]; // Placeholder; integrate with your pipeline to compute
  const metadata = {
    project,
    date: dateStr,
    time: timeStr,
    flight_id: `flight_${dateStr}_${HH}${MM}`,
    uploader,
    bbox,
    layers: [
      { id: 'imagery', name: 'Imagery Tiles', type: 'tile', path: 'tiles/{z}/{x}/{y}.png', minzoom: 12, maxzoom: 18, tileSize: 256 },
    ],
  };

  // Prepare local temp folder structure
  const base = path.join(process.cwd(), 'datasets', project, dateTimeFolder);
  fs.mkdirSync(path.join(base, 'tiles'), { recursive: true });
  fs.mkdirSync(path.join(base, 'overlays'), { recursive: true });
  fs.writeFileSync(path.join(base, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // Here you would trigger your tile generation pipeline and place outputs under base/tiles
  // For demonstration we just place a placeholder file
  fs.mkdirSync(path.join(base, 'tiles/0/0'), { recursive: true });
  fs.writeFileSync(path.join(base, 'tiles/0/0/0.png'), '');

  // Upload
  if (useR2) {
    const endpoint = process.env.R2_ENDPOINT;
    const region = 'auto';
    const client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    const bucket = process.env.R2_BUCKET;

    async function uploadDir(localDir, prefix) {
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(localDir, e.name);
        const key = `${prefix}/${e.name}`;
        if (e.isDirectory()) await uploadDir(full, key);
        else {
          const Body = fs.readFileSync(full);
          await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body, ContentType: guessContentType(e.name) }));
          console.log('Uploaded', key);
        }
      }
    }
    await uploadDir(base, `datasets/${project}/${dateTimeFolder}`);

    // Update index.json under datasets/{project}/
    const indexKey = `datasets/${project}/index.json`;
    const list = await readR2JsonSafe(client, bucket, indexKey).catch(()=>({ items: [] }));
    const items = Array.isArray(list) ? list : (list.items || list.date_times || []);
    const exists = (Array.isArray(items) ? items : []).some((v) => (typeof v === 'string' ? v === dateTimeFolder : v.date_time === dateTimeFolder));
    const next = Array.isArray(items) ? [...items] : [];
    if (!exists) next.push(dateTimeFolder);
    const body = Buffer.from(JSON.stringify(next, null, 2));
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: indexKey, Body: body, ContentType: 'application/json' }));
    console.log('Updated', indexKey);
  }

  if (useSupabase) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const bucket = 'datasets';

    async function uploadDir(localDir, prefix) {
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(localDir, e.name);
        const key = `${prefix}/${e.name}`;
        if (e.isDirectory()) await uploadDir(full, key);
        else {
          const Body = fs.readFileSync(full);
          const { error } = await supabase.storage.from(bucket).upload(key, Body, { contentType: guessContentType(e.name), upsert: true });
          if (error) throw error;
          console.log('Uploaded', key);
        }
      }
    }
    await uploadDir(base, `${project}/${dateTimeFolder}`);

    // Update index.json under {project}/
    const indexKey = `${project}/index.json`;
    let current = [];
    try {
      const { data, error } = await supabase.storage.from(bucket).download(indexKey);
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        current = Array.isArray(parsed) ? parsed : (parsed.items || parsed.date_times || []);
      }
    } catch {}
    if (!current.some((v)=> (typeof v === 'string' ? v === dateTimeFolder : v?.date_time === dateTimeFolder))) {
      current.push(dateTimeFolder);
    }
    const body = JSON.stringify(current, null, 2);
    const { error: upErr } = await supabase.storage.from(bucket).upload(indexKey, new Blob([body], { type: 'application/json' }), { contentType: 'application/json', upsert: true });
    if (upErr) throw upErr;
    console.log('Updated', indexKey);
  }

  console.log('Done. Dataset folder:', `datasets/${project}/${dateTimeFolder}`);
  await exiftool.end();
}

function guessContentType(name) {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.geojson')) return 'application/geo+json';
  return 'application/octet-stream';
}

async function readR2JsonSafe(client, bucket, key) {
  try {
    const resp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const stream = resp.Body;
    const chunks = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(text);
  } catch (e) {
    return { items: [] };
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
