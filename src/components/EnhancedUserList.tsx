import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ClientCourseService } from '@/lib/clientCourseService'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, MapPin, Calendar, Users as UsersIcon } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  club_id: string | null
  created_at: string
}

interface GolfClub {
  id: string
  name: string
}

interface UserCourse {
  golf_club_id: string
  golf_club_name: string
  assigned_at: string
}

interface EnhancedUserListProps {
  users: User[]
  clubs: GolfClub[]
  onUserUpdate: () => void
}

export function EnhancedUserList({ users, clubs, onUserUpdate }: EnhancedUserListProps) {
  const [userCourses, setUserCourses] = useState<Record<string, UserCourse[]>>({})
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newUserRole, setNewUserRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadAllUserCourses()
  }, [users])

  const loadAllUserCourses = async () => {
    const coursesMap: Record<string, UserCourse[]> = {}

    for (const user of users) {
      if (user.role === 'client') {
        const courses = await ClientCourseService.getClientCourses(user.id)
        coursesMap[user.id] = courses
      }
    }

    setUserCourses(coursesMap)
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      })

      setEditingUser(null)
      setNewUserRole('')
      onUserUpdate()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string, email: string) => {
    console.log('🗑️ DELETE USER INITIATED:', { userId, email, confirmText: deleteConfirmText })
    
    if (deleteConfirmText !== 'CONFIRM') {
      console.warn('⚠️ DELETE BLOCKED: Confirmation text not matched')
      toast({
        title: 'Confirmation Required',
        description: 'Please type CONFIRM to delete this user',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    console.log('🔄 Starting delete process...')
    
    try {
      console.log('📡 Calling Supabase delete API...')
      
      // Delete the user record from public.users
      const { data: deleteData, error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .select() // Return deleted rows to confirm deletion

      console.log('📥 Delete response:', { data: deleteData, error: deleteError })

      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        throw deleteError
      }

      console.log('✅ User deleted successfully from database')

      toast({
        title: 'User Deleted',
        description: `${email} has been permanently removed`,
      })

      // Reset confirmation state
      console.log('🔄 Resetting confirmation state...')
      setDeleteConfirmText('')
      setDeletingUserId(null)
      
      // Reload the user list
      console.log('🔄 Reloading user list...')
      await onUserUpdate()
      
      console.log('✅ Delete process completed successfully')
    } catch (error) {
      console.error('❌ DELETE FAILED:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      })
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      console.log('🏁 Delete operation finished')
    }
  }

  const getLegacyClubName = (clubId: string | null) => {
    if (!clubId) return null
    return clubs.find((c) => c.id === clubId)?.name || 'Unknown'
  }

  // Filter users based on search query (case-insensitive)
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const email = user.email.toLowerCase()
    const fullName = (user.full_name || '').toLowerCase()
    
    return email.includes(query) || fullName.includes(query)
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            All Users ({filteredUsers.length}{searchQuery ? ` of ${users.length}` : ''})
          </CardTitle>
        </div>
        {/* Search Input */}
        <div className="mt-4">
          <Label htmlFor="user-search" className="text-sm font-medium">
            Search Users
          </Label>
          <Input
            id="user-search"
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2"
          />
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No users found matching "{searchQuery}"</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-3"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            filteredUsers.map((user) => {
            const assignedCourses = userCourses[user.id] || []
            const legacyClub = getLegacyClubName(user.club_id)

            return (
              <div
                key={user.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                {/* User Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{user.email}</span>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    {user.full_name && (
                      <p className="text-sm text-gray-600">{user.full_name}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {editingUser === user.id ? (
                      <div className="flex items-center gap-2">
                        <Select value={newUserRole} onValueChange={setNewUserRole}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => updateUserRole(user.id, newUserRole)}
                          disabled={!newUserRole || loading}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(null)
                            setNewUserRole('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user.id)
                            setNewUserRole(user.role)
                          }}
                        >
                          Edit Role
                        </Button>
                        <AlertDialog
                          onOpenChange={(open) => {
                            if (!open) {
                              setDeleteConfirmText('')
                              setDeletingUserId(null)
                            } else {
                              setDeletingUserId(user.id)
                            }
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User - Confirmation Required</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{user.email}</strong>? This action cannot
                                be undone. All their data will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="confirm-delete" className="text-sm font-medium">
                                Type <span className="font-bold text-red-600">CONFIRM</span> to delete this user:
                              </Label>
                              <Input
                                id="confirm-delete"
                                type="text"
                                placeholder="Type CONFIRM"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="mt-2"
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => {
                                  setDeleteConfirmText('')
                                  setDeletingUserId(null)
                                }}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(user.id, user.email)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteConfirmText !== 'CONFIRM' || loading}
                              >
                                {loading ? 'Deleting...' : 'Delete User'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>

                {/* Course Assignments */}
                {user.role === 'client' && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Assigned Golf Courses:
                      </span>
                    </div>

                    {assignedCourses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assignedCourses.map((course) => (
                          <div
                            key={course.golf_club_id}
                            className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                          >
                            <MapPin className="h-3 w-3 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-900">
                                {course.golf_club_name}
                              </p>
                              <p className="text-xs text-green-600">
                                Assigned {new Date(course.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : legacyClub ? (
                      <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <MapPin className="h-3 w-3 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">{legacyClub}</p>
                          <p className="text-xs text-blue-600">Legacy Assignment</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic bg-gray-50 rounded px-3 py-2 inline-block">
                        No courses assigned yet
                      </div>
                    )}

                    {/* Course Count Badge */}
                    {assignedCourses.length > 0 && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {assignedCourses.length} course{assignedCourses.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Note */}
                {user.role === 'admin' && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="default" className="text-xs">
                      Full System Access
                    </Badge>
                  </div>
                )}
              </div>
            )
          })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
