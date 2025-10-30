import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function TilesetMetadataForm() {
  const { toast } = useToast()
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([])
  const [course, setCourse] = useState('')
  const [jsonText, setJsonText] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('golf_clubs').select('id, name').order('name')
      if (!error && data) setCourses(data as any)
    })()
  }, [])

  const loadExample = () => {
    const example = {
      name: 'The Best Golf - Main Course',
      description: 'High-resolution orthomosaic tiles of the golf course for Mapbox overlay',
      bounds: [5.755898, 51.361755, 5.779088, 51.372146],
      center: [5.767493, 51.366951, 17],
      minzoom: 14,
      maxzoom: 20,
      tileSize: 512,
      attribution: '©️ Company Golf Dataset',
    }
    setJsonText(JSON.stringify(example, null, 2))
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    setJsonText(text)
  }

  const onSave = async () => {
    if (!course) {
      toast({ title: 'Select a course', variant: 'destructive' })
      return
    }
    // Parse JSON only to extract optional name; all other fields are ignored per current schema
    let payloadName: string | undefined
    try {
      const payload = JSON.parse(jsonText)
      if (payload && typeof payload.name === 'string' && payload.name.trim()) {
        payloadName = payload.name.trim()
      }
    } catch {
      // Ignore parse errors; we'll still upsert using the selected course name
    }
    const upName = payloadName || course
    setSaving(true)
    try {
      const { error } = await supabase.from('golf_clubs').upsert({ name: upName }, { onConflict: 'name' })
      if (error) throw error
      toast({ title: 'Saved', description: `Updated/created club: ${upName}. Note: extra metadata isn't stored in the current schema.` })
    } catch (e: any) {
      const desc = e?.message || 'Unknown error'
      toast({ title: 'Save failed', description: desc, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Tileset Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Golf Course</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger>
                <SelectValue placeholder={courses.length ? 'Choose a golf course…' : 'No courses found'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Upload Metadata JSON File</Label>
            <input ref={fileRef} type="file" accept="application/json" onChange={onPickFile} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Metadata JSON</Label>
          <Button variant="ghost" size="sm" onClick={loadExample}>Load Example</Button>
        </div>
        <Textarea className="min-h-[180px] font-mono" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>Save Metadata</Button>
        </div>
      </CardContent>
    </Card>
  )
}
