/// <reference path="../global.d.ts" />
/// <reference path="../shims.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// r2-upload Edge Function removed
// This project no longer uses a dedicated Cloudflare R2 upload function. All uploads go directly to
// Supabase Storage (bucket: raw-images). If you previously relied on this function, delete it from
// your Supabase functions deployment and update any client code that called '/api/upload-to-r2'.