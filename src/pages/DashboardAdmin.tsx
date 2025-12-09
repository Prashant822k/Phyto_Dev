import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FileUpload from '@/components/FileUpload'
import UnifiedTilesetUploader from '@/components/UnifiedTilesetUploader'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { R2Service } from '@/lib/r2Service'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2, UserPlus, Shield, Users, Upload, FileText, Settings, Map, MapPin, Activity, LogOut } from 'lucide-react'
import { ClientCourseManager } from '@/components/ClientCourseManager'
import { EnhancedUserList } from '@/components/EnhancedUserList'
import HealthMapUploader from '@/components/HealthMapUploader'

const DashboardAdmin = () => {
  const [items, setItems] = useState<Array<{ key?: string, size?: number }>>([])
  const [clubs, setClubs] = useState<Array<{id: string, name: string}>>([])
  const [users, setUsers] = useState<Array<{id: string, email: string, full_name: string, role: string, club_id: string | null, created_at: string}>>([])
  const [newClubName, setNewClubName] = useState('')
  const [clubAssignments, setClubAssignments] = useState<Record<string, Array<{id: string, email: string, full_name: string | null}>>>({})
  // Note: selectedUser and selectedClub are no longer needed - ClientCourseManager handles assignments
  
  // Admin account creation state
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  
  // User role management state
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newUserRole, setNewUserRole] = useState('')
  
  const { toast } = useToast()

  const load = async () => {
    const { items } = await R2Service.list('')
    setItems(items as any)
  }
  
  const loadClubs = async () => {
    try {
      console.log('Loading clubs...')
      const { data, error } = await supabase.from('golf_clubs').select('*').order('name')
      
      if (error) {
        console.error('Error loading clubs:', error)
        toast({ 
          title: 'Error loading clubs', 
          description: error.message,
          variant: 'destructive' 
        })
        return
      }
      
      console.log('Clubs loaded:', data)
      setClubs(data || [])

      // Load assignments for each club
      const assignmentsMap: Record<string, Array<{id: string, email: string, full_name: string | null}>> = {}
      for (const club of data || []) {
        const { data: assignments } = await supabase
          .from('client_golf_courses')
          .select(`
            client_id,
            users:client_id (
              id,
              email,
              full_name
            )
          `)
          .eq('golf_club_id', club.id)
          .eq('is_active', true)
        
        assignmentsMap[club.id] = (assignments || []).map((a: any) => a.users).filter(Boolean)
      }
      setClubAssignments(assignmentsMap)
    } catch (error) {
      console.error('Unexpected error loading clubs:', error)
      toast({ 
        title: 'Error loading clubs', 
        description: 'An unexpected error occurred',
        variant: 'destructive' 
      })
    }
  }
  
  const loadUsers = async () => {
    try {
      console.log('Loading users...')
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, club_id, created_at')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading users:', error)
        toast({ 
          title: 'Error loading users', 
          description: error.message,
          variant: 'destructive' 
        })
        return
      }
      
      console.log('Users loaded:', data)
      setUsers(data || [])
    } catch (error) {
      console.error('Unexpected error loading users:', error)
      toast({ 
        title: 'Error loading users', 
        description: 'An unexpected error occurred',
        variant: 'destructive' 
      })
    }
  }

  useEffect(() => { 
    load()
    loadClubs()
    loadUsers()
  }, [])
  
  const createClub = async () => {
    if (!newClubName.trim()) return
    const { error } = await supabase.from('golf_clubs').insert({ name: newClubName.trim() })
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      setNewClubName('')
      loadClubs()
      toast({ title: 'Club created' })
    }
  }
  
  // NOTE: Client-to-course assignment is now handled by ClientCourseManager
  // which uses the client_golf_courses junction table for multi-course support.
  // The old users.club_id column is kept in sync by the assign_client_to_course SQL function.

  const createAdminAccount = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' })
      return
    }

    try {
      // Note: supabase.auth.admin.createUser requires service role key
      // For now, we'll provide instructions for manual creation
      toast({ 
        title: 'Manual Setup Required', 
        description: 'Please create the user in Supabase Dashboard first, then we\'ll set the admin role.',
        variant: 'default'
      })

      // Try to create via regular signup (this will create a client user)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: newAdminPassword,
        options: {
          data: {
            full_name: newAdminName
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          // User exists, just update role
          toast({ 
            title: 'User exists, updating role...', 
            description: 'Setting role to admin for existing user.'
          })
        } else {
          throw authError
        }
      }

      // Wait for user profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update user role to admin
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          role: 'admin',
          full_name: newAdminName,
          organization: 'PhytoMaps'
        })
        .eq('email', newAdminEmail)

      if (updateError) {
        console.error('Update error:', updateError)
        // Try to insert if user doesn't exist in public.users
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData?.user?.id || 'temp-id',
            email: newAdminEmail,
            full_name: newAdminName,
            role: 'admin',
            organization: 'PhytoMaps'
          })
        
        if (insertError) throw insertError
      }

      toast({ title: 'Admin account created successfully' })
      setNewAdminEmail('')
      setNewAdminPassword('')
      setNewAdminName('')
      setShowCreateAdmin(false)
      loadUsers()
    } catch (error) {
      console.error('Admin creation error:', error)
      toast({ 
        title: 'Error creating admin account', 
        description: error instanceof Error ? error.message : 'Unknown error. Please create user manually in Supabase Dashboard.',
        variant: 'destructive' 
      })
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'User role updated successfully' })
      setEditingUser(null)
      setNewUserRole('')
      loadUsers()
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      // Call edge function to delete user and all related data
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      if (result.warning) {
        toast({ 
          title: 'User partially deleted', 
          description: result.warning,
          variant: 'default'
        })
      } else {
        toast({ 
          title: 'User deleted successfully', 
          description: `${userEmail} and all related data have been removed.`,
          variant: 'default'
        })
      }
      
      loadUsers()
      loadClubs() // Refresh clubs to update assigned client counts
    } catch (error) {
      toast({ 
        title: 'Error deleting user', 
        description: error instanceof Error ? error.message : 'Unknown error. Please delete manually in Supabase Dashboard.',
        variant: 'destructive' 
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header with Logout */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-6 border border-green-100">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your PhytoMaps golf course system</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Shield className="h-5 w-5 text-blue-600" />
              <Badge variant="secondary" className="text-sm font-medium">Administrator</Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

      <Tabs defaultValue="tiles" className="w-full bg-white rounded-lg shadow-sm border border-green-100 p-4">
        <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-green-50 to-blue-50 p-1">
          <TabsTrigger value="tiles" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Map className="h-4 w-4" />
            Upload Tiles
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Upload className="h-4 w-4" />
            Upload Vector Layers
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4" />
            Upload Health Maps
          </TabsTrigger>
          <TabsTrigger value="clubs" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Manage Clubs
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Manage Users
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4" />
            Admin Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tiles">
          {/* Unified Tileset Uploader - Upload tiles with date/time metadata */}
          <UnifiedTilesetUploader />
        </TabsContent>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Admin: Upload Tiles</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileProcessed={() => load()} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="files">
          <HealthMapUploader />
        </TabsContent>
        
        <TabsContent value="clubs">
          <Card>
            <CardHeader>
              <CardTitle>Manage Golf Clubs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Club name" value={newClubName} onChange={(e) => setNewClubName(e.target.value)} />
                <Button onClick={createClub}>Create Club</Button>
              </div>
              <div className="space-y-3">
                {clubs.map((club) => {
                  const assignedClients = clubAssignments[club.id] || []
                  return (
                    <div key={club.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-lg">{club.name}</span>
                          </div>
                          <div className="ml-7">
                            <p className="text-sm text-gray-600 mb-2">
                              <Users className="h-4 w-4 inline mr-1" />
                              Assigned Clients: {assignedClients.length}
                            </p>
                            {assignedClients.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {assignedClients.map((client) => (
                                  <Badge key={client.id} variant="secondary" className="text-xs">
                                    {client.full_name || client.email}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {assignedClients.length === 0 && (
                              <p className="text-xs text-gray-400 italic">No clients assigned yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <div className="space-y-6">
            {/* Client Course Assignment - AT VERY TOP ⭐ */}
            <ClientCourseManager />

            {/* Enhanced Users List with Multi-Course Display - BELOW */}
            <EnhancedUserList 
              users={users} 
              clubs={clubs} 
              onUserUpdate={() => {
                loadUsers()
                loadClubs()
              }} 
            />
          </div>
        </TabsContent>

        <TabsContent value="admin">
          <div className="space-y-6">
            {/* Admin Account Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create Admin Account
                </CardTitle>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create new administrator accounts for your team members.
                  </p>
                </CardContent>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showCreateAdmin ? (
                  <Button onClick={() => setShowCreateAdmin(true)} className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create New Admin
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="admin-email">Admin Email</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          placeholder="admin@phytomaps.com"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin-name">Full Name</Label>
                        <Input
                          id="admin-name"
                          placeholder="John Doe"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="Strong password (min 8 characters)"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createAdminAccount} disabled={!newAdminEmail || !newAdminPassword || !newAdminName}>
                        Create Admin Account
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowCreateAdmin(false)
                        setNewAdminEmail('')
                        setNewAdminPassword('')
                        setNewAdminName('')
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'admin').length}</div>
                    <div className="text-sm text-muted-foreground">Admin Users</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'client').length}</div>
                    <div className="text-sm text-muted-foreground">Client Users</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{clubs.length}</div>
                    <div className="text-sm text-muted-foreground">Golf Clubs</div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Quick Setup Instructions</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Create your first admin account using the form above</li>
                    <li>Create golf clubs in the "Manage Clubs" tab</li>
                    <li>Assign users to clubs in the "Manage Users" tab</li>
                    <li>Upload agricultural data in the "Upload Vector Layers" tab</li>
                    <li>Monitor system activity in the "Manage Files" tab</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Security Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 border-l-4 border-yellow-400 bg-yellow-50 rounded">
                    <strong>Admin Access:</strong> Only trusted personnel should have admin accounts
                  </div>
                  <div className="p-3 border-l-4 border-blue-400 bg-blue-50 rounded">
                    <strong>Password Security:</strong> Use strong passwords with mixed case, numbers, and symbols
                  </div>
                  <div className="p-3 border-l-4 border-green-400 bg-green-50 rounded">
                    <strong>Regular Audits:</strong> Periodically review admin access and remove unused accounts
                  </div>
                  <div className="p-3 border-l-4 border-red-400 bg-red-50 rounded">
                    <strong>Data Protection:</strong> All admin actions are logged and can be audited
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

export default DashboardAdmin


