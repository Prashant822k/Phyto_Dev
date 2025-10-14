import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Shield, MapPin, ArrowLeft } from 'lucide-react'

const LoginAdmin = () => {
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
      const { data: me } = await supabase.from('users').select('role').eq('id', userId).single()
      if (me?.role !== 'admin') {
        throw new Error('This account does not have admin privileges')
      }
      navigate('/admin')
      toast({ title: 'Welcome Admin', description: 'You have successfully logged in as an administrator' })
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <MapPin className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">PhytoMaps</h1>
          </div>
          <p className="text-gray-600">Agricultural Data Analysis Platform</p>
        </div>

        {/* Admin Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">Admin Portal</CardTitle>
            </div>
            <CardDescription>
              Sign in to manage golf clubs, users, and agricultural data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@phytomaps.com"
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
                {loading ? 'Signing in...' : 'Sign in as Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center space-y-2">
          <Link 
            to="/login-client" 
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Are you a golf club member? Sign in here
          </Link>
          <div>
            <Link 
              to="/" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginAdmin


