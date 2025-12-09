import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Users, MapPin, ArrowLeft, Eye, Leaf, Lock, Mail, Shield, ChevronRight } from 'lucide-react'

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
      const { data: me, error: profileError } = await supabase.from('users').select('role, club_id').eq('id', userId).single()
      
      if (profileError) {
        console.error('Profile error:', profileError)
        throw new Error('Could not load user profile. Please contact support.')
      }
      
      if (!me || me.role !== 'client') {
        await supabase.auth.signOut()
        throw new Error('This account is not a golf club client. Please use the admin login page if you are an administrator.')
      }
      
      const { data: courseAssignments, error: courseError } = await supabase
        .from('client_golf_courses')
        .select('golf_club_id')
        .eq('client_id', userId)
        .eq('is_active', true)
      
      if (courseError) {
        console.error('Error fetching course assignments:', courseError)
        throw new Error('Could not load your course assignments. Please try again.')
      }
      
      const courseCount = courseAssignments?.length || 0
      console.log(`Client ${userId} (${email}) has ${courseCount} course(s) assigned:`, courseAssignments)
      
      if (courseCount === 0) {
        toast({ 
          title: 'No Access', 
          description: 'You have not been assigned to any golf courses. Please contact your administrator.',
          variant: 'destructive' 
        })
        await supabase.auth.signOut()
        return
      }
      
      // All clients go to course selection page (even if they have only 1 course)
      console.log(`✅ Navigating to /select-course for ${courseCount} course(s)`)
      navigate('/select-course')
      toast({ title: 'Welcome!', description: courseCount === 1 ? 'Please confirm your golf course' : 'Please select a golf course to continue' })
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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Leaf className="h-8 w-8 text-green-300" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">PhytoMaps</h1>
            <p className="text-green-200/80 text-sm font-medium tracking-wide mt-1">GOLF CLUB MEMBER PORTAL</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">Welcome Back</CardTitle>
                <CardDescription className="text-gray-500">
                  Sign in to access your club's data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@golfclub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium text-base shadow-lg shadow-green-600/25 transition-all hover:shadow-xl hover:shadow-green-600/30" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Access Club Portal
                    <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="pt-5 pb-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto">
                  <Eye className="h-5 w-5 text-green-300" />
                </div>
                <p className="text-xs text-green-100/80">View Data</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto">
                  <MapPin className="h-5 w-5 text-green-300" />
                </div>
                <p className="text-xs text-green-100/80">Analysis</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto">
                  <Shield className="h-5 w-5 text-green-300" />
                </div>
                <p className="text-xs text-green-100/80">Secure</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center space-y-3">
          <Link 
            to="/login-admin" 
            className="text-sm text-green-200/80 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Shield className="w-4 h-4" />
            Administrator? Sign in here
          </Link>
          <div>
            <Link 
              to="/" 
              className="inline-flex items-center text-sm text-green-200/60 hover:text-white transition-colors"
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

export default LoginClient


