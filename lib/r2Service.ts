import { supabase } from './supabase'

interface SignedUrlResponse {
  url: string
  key: string
  method: 'GET' | 'PUT'
}

interface ListResponseItem {
  key?: string
  size?: number
  lastModified?: string
}

const EDGE_FUNCTION = 'r2-sign'

export class R2Service {
  static async getPutUrl(key: string, contentType: string): Promise<SignedUrlResponse> {
    const res = await this.callFunction({ action: 'getPutUrl', key, contentType })
    return res as SignedUrlResponse
  }

  static async getGetUrl(key: string, expiresInSeconds = 900): Promise<SignedUrlResponse> {
    const res = await this.callFunction({ action: 'getGetUrl', key, expiresInSeconds })
    return res as SignedUrlResponse
  }

  static async deleteObject(key: string): Promise<{ ok: boolean }> {
    const res = await this.callFunction({ action: 'deleteObject', key })
    return res as { ok: boolean }
  }

  static async list(prefix?: string): Promise<{ items: ListResponseItem[]; prefix: string }> {
    const res = await this.callFunction({ action: 'listObjects', prefix })
    // Normalize items: edge may return an array of strings (keys) or objects
    if (res && Array.isArray(res.items)) {
      if (res.items.length === 0) {
        return { items: [], prefix: res.prefix ?? (prefix || '') }
      }
      const first = res.items[0]
      if (typeof first === 'string') {
        const normalized = (res.items as string[]).map((k) => ({ key: k }))
        return { items: normalized, prefix: res.prefix ?? (prefix || '') }
      }
    }
    return res as { items: ListResponseItem[]; prefix: string }
  }

  static async uploadFile(key: string, file: File): Promise<{ success: boolean; key: string; url: string }> {
    const contentType = file.type || 'application/geo+json'
    try {
      // Try direct presigned PUT first
      const { url } = await this.getPutUrl(key, contentType)
      const putResp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file
      })
      if (!putResp.ok) {
        const text = await putResp.text().catch(() => '')
        throw new Error(`R2 PUT failed: ${putResp.status} ${text}`)
      }
      return { success: true, key, url }
    } catch (putErr) {
      console.warn('Direct PUT failed, falling back to edge uploadFile:', putErr)
      // Fallback: upload via edge function to bypass CORS
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await this.callFunction({ action: 'uploadFile', key, contentType, fileData })
      return res as { success: boolean; key: string; url: string }
    }
  }

  private static async callFunction(body: Record<string, unknown>) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      
      if (!jwt) {
        throw new Error('No authentication token available')
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL environment variable is not set')
      }
      
      const url = `${supabaseUrl}/functions/v1/${EDGE_FUNCTION}`
      console.log('Calling R2 function:', url, 'with body:', body)
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(body)
      })
      
      console.log('R2 function response status:', resp.status)
      
      if (!resp.ok) {
        const text = await resp.text()
        console.error('R2 function error response:', text)
        throw new Error(`Edge function error: ${resp.status} ${text}`)
      }
      
      const result = await resp.json()
      console.log('R2 function success:', result)
      return result
    } catch (error) {
      console.error('R2Service callFunction error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to call R2 function: ${error}`)
    }
  }
}
