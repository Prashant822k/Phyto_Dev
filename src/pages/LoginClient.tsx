import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Users, MapPin, ArrowLeft, Eye } from 'lucide-react'

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
        // Sign out the user since they're not a client
        await supabase.auth.signOut()
        throw new Error('This account is not a golf club client. Please use the admin login page if you are an administrator.')
      }
      
      // Check how many courses this client has access to
      const { data: courseAssignments } = await supabase
        .from('client_golf_courses')
        .select('golf_club_id')
        .eq('client_id', userId)
        .eq('is_active', true)
      
      const courseCount = courseAssignments?.length || 0
      
      if (courseCount === 0) {
        // No courses assigned - show error
        toast({ 
          title: 'No Access', 
          description: 'You have not been assigned to any golf courses. Please contact your administrator.',
          variant: 'destructive' 
        })
        await supabase.auth.signOut()
      } else if (courseCount === 1) {
        // Only one course - go directly to client dashboard
        const courseId = courseAssignments![0].golf_club_id
        const { data: courseData } = await supabase
          .from('golf_clubs')
          .select('name')
          .eq('id', courseId)
          .single()
        
        sessionStorage.setItem('selectedGolfCourseId', courseId)
        sessionStorage.setItem('selectedGolfCourseName', courseData?.name || '')
        
        navigate('/client')
        toast({ title: 'Welcome!', description: `Logged in to ${courseData?.name || 'your golf club'}` })
      } else {
        // Multiple courses - go to course selection page
        navigate('/select-course')
        toast({ title: 'Welcome!', description: 'Please select a golf course to continue' })
      }
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
          <p className="text-gray-600">Golf Club Data Portal</p>
        </div>

        {/* Client Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl">Golf Club Portal</CardTitle>
            </div>
            <CardDescription>
              Access your club's agricultural data and analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Club Member Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@golfclub.com"
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
                {loading ? 'Signing in...' : 'Access Club Data'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">View processed agricultural data</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">Access club-specific analysis results</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">Secure, role-based access</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center space-y-2">
          <Link 
            to="/login-admin" 
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Are you an administrator? Sign in here
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

export default LoginClient


