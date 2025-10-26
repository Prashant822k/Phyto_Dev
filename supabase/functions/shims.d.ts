// Teach the local TS server to accept URL imports in these edge function files
declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare module 'https://esm.sh/@aws-sdk/client-s3@3.624.0' {
  export class S3Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  
  export class PutObjectCommand {
    constructor(input: any);
  }
  
  export class GetObjectCommand {
    constructor(input: any);
  }
  
  export class DeleteObjectCommand {
    constructor(input: any);
  }
  
  export class ListObjectsV2Command {
    constructor(input: any);
  }
}

declare module 'https://esm.sh/@aws-sdk/s3-request-presigner@3.624.0' {
  export function getSignedUrl(
    client: any,
    command: any,
    options?: { expiresIn?: number }
  ): Promise<string>;
}


