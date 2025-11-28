import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ClientCourseService, ClientCourse } from '@/lib/clientCourseService'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { MapPin, ChevronRight, LogOut, User, Calendar, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function CourseSelection() {
  const [courses, setCourses] = useState<ClientCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ email: string; name: string | null }>({
    email: '',
    name: null,
  })
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    loadUserAndCourses()
  }, [])

  const loadUserAndCourses = async () => {
    setLoading(true)
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login-client')
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('email, full_name, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'client') {
        toast({
          title: 'Access Denied',
          description: 'This page is only for golf club clients',
          variant: 'destructive',
        })
        navigate('/')
        return
      }

      setUserInfo({
        email: profile.email,
        name: profile.full_name,
      })

      // Get assigned courses
      const clientCourses = await ClientCourseService.getMyGolfCourses()

      if (clientCourses.length === 0) {
        toast({
          title: 'No Courses Assigned',
          description: 'Please contact your administrator to assign golf courses to your account',
          variant: 'destructive',
        })
      }

      setCourses(clientCourses)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your golf courses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    try {
      // Store selected course in session storage
      sessionStorage.setItem('selectedGolfCourseId', courseId)
      sessionStorage.setItem('selectedGolfCourseName', courseName)

      toast({
        title: 'Course Selected',
        description: `Welcome to ${courseName}`,
      })

      // Navigate to client dashboard
      navigate('/client')
    } catch (error) {
      console.error('Error selecting course:', error)
      toast({
        title: 'Error',
        description: 'Failed to select course',
        variant: 'destructive',
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login-client')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading your golf courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PhytoMaps</h1>
                <p className="text-sm text-gray-600">Golf Course Data Portal</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border">
            <User className="h-5 w-5 text-green-600" />
            <span className="font-medium text-gray-900">
              {userInfo.name || userInfo.email}
            </span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
            Welcome Back! 🏌️
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select a golf course to view its data, analysis, and insights
          </p>
        </div>

        {/* Course Cards */}
        {courses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-16 text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Golf Courses Assigned
              </h3>
              <p className="text-gray-600 mb-6">
                You don't have access to any golf courses yet. Please contact your administrator
                to get started.
              </p>
              <Button variant="outline" onClick={handleLogout}>
                Return to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course.golf_club_id}
                className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-green-500 overflow-hidden"
                onClick={() => handleSelectCourse(course.golf_club_id, course.golf_club_name)}
              >
                {/* Card Header with Gradient */}
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <MapPin className="h-8 w-8" />
                      <Sparkles className="h-5 w-5 opacity-75" />
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{course.golf_club_name}</h3>
                    <p className="text-green-100 text-sm">Golf Course</p>
                  </div>
                </div>

                {/* Card Content */}
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Assignment Date */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Assigned {new Date(course.assigned_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                        Active Access
                      </Badge>
                    </div>

                    {/* Action Button */}
                    <Button
                      className="w-full group-hover:bg-green-600 group-hover:text-white transition-colors"
                      variant="outline"
                    >
                      <span>View Course Data</span>
                      <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        {courses.length > 0 && (
          <div className="mt-12 max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>What You Can Do</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">View Maps</h4>
                      <p className="text-sm text-gray-600">
                        Access high-resolution course imagery and overlays
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-600 p-2 rounded-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Analysis Data</h4>
                      <p className="text-sm text-gray-600">
                        View vegetation health and terrain analysis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-600 p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Historical Data</h4>
                      <p className="text-sm text-gray-600">
                        Track changes over time with dated imagery
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            © 2024 PhytoMaps. Secure golf course data management.
          </p>
        </div>
      </div>
    </div>
  )
}
