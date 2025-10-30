import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

const RegisterClient = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [golfCourse, setGolfCourse] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (!fullName.trim() || !golfCourse.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/login-client`
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          // Store both golf_course_name and organization (for backward compatibility)
          data: { full_name: fullName, golf_course_name: golfCourse, organization: golfCourse, role: 'client' }
        },
      })
      if (error) throw error

      try {
        // Upsert a row in public.users with provided profile details (role=client)
        await supabase
          .from('users')
          .upsert(
            {
              id: signUpData.user?.id,
              email,
              full_name: fullName,
              golf_course_name: golfCourse,
              organization: golfCourse,
              role: 'client'
            },
            { onConflict: 'id' }
          )
      } catch {}

      toast({ title: 'Check your email', description: 'We sent you a verification link to complete your registration.' })
      navigate('/login-client')
    } catch (e) {
      toast({ title: 'Registration failed', description: e instanceof Error ? e.message : 'An error occurred', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-teal-600" />
          </div>
          <CardTitle className="text-center">Request Access</CardTitle>
          <CardDescription className="text-center">Create your account to access course data</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input id="full-name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="golf-course">Golf Course Name</Label>
              <Input id="golf-course" placeholder="e.g., Greenwood Golf Club" value={golfCourse} onChange={(e) => setGolfCourse(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter a password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input id="confirm" type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Create Account'}
            </Button>
            <div className="text-center text-sm">
              Already have an account? <Link to="/login-client" className="text-teal-700 hover:text-teal-800 hover:underline">Sign In</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterClient
