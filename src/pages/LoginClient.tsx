import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Users } from 'lucide-react'

const LoginClient = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('No user')
      // Require verified email
      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
      }
      const { data: me } = await supabase.from('users').select('role, club_id').eq('id', userId).single()
      if (me?.role !== 'client') {
        throw new Error('This account is not authorized for golf club access')
      }
      navigate('/client')
      toast({ title: 'Welcome!', description: 'You have successfully logged in to your golf club portal' })
    } catch (e) {
      toast({ 
        title: 'Login Failed', 
        description: e instanceof Error ? e.message : 'An error occurred during login', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* Left branding panel */}
        <div className="relative hidden md:flex flex-col items-center justify-center text-white px-8">
          <div className="w-56 h-56 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/phytomaps.jpg" alt="PhytoMaps" className="w-full h-full object-contain p-2" />
          </div>
          <p className="mt-8 text-center text-white/90 text-lg">
            Golf Course Mapping & Analysis Portal
          </p>
          <Link
            to="/login-admin"
            className="absolute left-4 bottom-4 text-sm text-white/90 hover:text-white underline"
          >
            Admin
          </Link>
        </div>

        {/* Right login card */}
        <div className="flex items-center justify-center p-6 md:p-8">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
              <CardTitle className="text-center">Client Access</CardTitle>
              <CardDescription className="text-center">
                Sign in to view your course data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <Link to="/forgot-password" className="text-teal-700 hover:text-teal-800 hover:underline">Forgot Password?</Link>
                  <Link to="/register" className="text-teal-700 hover:text-teal-800 hover:underline">Request Access</Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LoginClient


