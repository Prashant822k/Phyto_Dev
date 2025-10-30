import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Users, MapPin, ArrowLeft, Eye, EyeOff } from 'lucide-react'

const LoginClient = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('No user')
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

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: 'Enter your email', description: 'Please type your email to receive a reset link.' })
      return
    }
    try {
      const redirectTo = `${window.location.origin}/login-client`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      toast({ title: 'Reset link sent', description: `We emailed a reset link to ${email}` })
    } catch (e) {
      toast({ title: 'Reset failed', description: e instanceof Error ? e.message : 'Please try again later', variant: 'destructive' })
    }
  }

  return (
    <main
      className="min-h-screen w-full relative"
      style={{
        backgroundImage: 'linear-gradient(135deg, #009688, #00bfa5)',
        fontFamily: "Inter, Poppins, ui-sans-serif, system-ui, -apple-system"
      }}
    >
      {/* Admin link bottom-left */}
      <div className="absolute left-4 bottom-3 text-gray-200 text-sm">
        <Link to="/login-admin" className="hover:underline transition-colors duration-200 ease-in-out">Admin</Link>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-10 min-h-screen grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left: Logo + tagline */}
        <div className="flex flex-col items-center text-center">
          <div className="w-64 h-64 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src="/logo-phytomaps.jpg"
              alt="PhytoMaps logo"
              className="w-56 h-56 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg' }}
            />
          </div>
          <div className="mt-4 text-white text-2xl font-semibold drop-shadow-sm text-center">PhytoMaps</div>
          <p className="mt-6 text-white text-lg font-medium drop-shadow-sm text-center">
            Golf Course Mapping & Analysis Portal
          </p>
        </div>

        {/* Right: Login Card */}
        <div className="flex justify-center">
          <Card className="w-full max-w-[420px] shadow-xl hover:shadow-2xl transition-shadow duration-200 rounded-2xl border border-gray-100">
            <CardHeader className="space-y-2 text-center px-8 pt-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">👤</div>
              <CardTitle className="text-xl">Client Access</CardTitle>
              <CardDescription>Sign in to view your course data</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-4" aria-label="Client sign in form">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-full h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-full h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full text-white bg-[#009688] hover:bg-[#00897b] transition-colors duration-200 ease-in-out rounded-full h-11" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              <div className="flex items-center justify-between mt-3 text-sm">
                <button type="button" onClick={handleForgotPassword} className="text-sky-700 hover:underline transition-colors duration-200 ease-in-out">
                  Forgot Password?
                </button>
                <Link to="/signup" className="text-sky-700 hover:underline transition-colors duration-200 ease-in-out">
                  New Registration
                </Link>
              </div>
              <div className="mt-2 text-center text-sm text-gray-600">
                Don’t have an account?{' '}
                <Link to="/signup" className="text-sky-700 hover:underline transition-colors duration-200 ease-in-out">
                  New Registration
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}

export default LoginClient


