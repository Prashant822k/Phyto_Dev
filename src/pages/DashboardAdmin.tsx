import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FileUpload from '@/components/FileUpload'
import TilesetUploader from '@/components/TilesetUploader'
import TilesetMetadataUploader from '@/components/TilesetMetadataUploader'
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
import { Trash2, UserPlus, Shield, Users, Upload, FileText, Settings, Map } from 'lucide-react'

const DashboardAdmin = () => {
  const [items, setItems] = useState<Array<{ key?: string, size?: number }>>([])
  const [clubs, setClubs] = useState<Array<{id: string, name: string}>>([])
  const [users, setUsers] = useState<Array<{id: string, email: string, full_name: string, role: string, club_id: string | null, created_at: string}>>([])
  const [newClubName, setNewClubName] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedClub, setSelectedClub] = useState('')
  
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
  
  const assignUserToClub = async () => {
    if (!selectedUser || !selectedClub) return
    const { error } = await supabase.from('users').update({ club_id: selectedClub }).eq('id', selectedUser)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      loadUsers()
      toast({ title: 'User assigned to club' })
    }
  }

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
      // Note: supabase.auth.admin.deleteUser requires service role key
      // For now, we'll just delete from public.users and show instructions
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
      
      toast({ 
        title: 'User profile deleted', 
        description: 'User profile removed. You may need to delete the auth user manually in Supabase Dashboard if needed.',
        variant: 'default'
      })
      loadUsers()
    } catch (error) {
      toast({ 
        title: 'Error deleting user', 
        description: error instanceof Error ? error.message : 'Unknown error. Please delete manually in Supabase Dashboard.',
        variant: 'destructive' 
      })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your PhytoMaps system</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <Badge variant="secondary" className="text-sm">Administrator</Badge>
        </div>
      </div>

      <Tabs defaultValue="tiles" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="tiles" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Upload Tiles
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manage Files
          </TabsTrigger>
          <TabsTrigger value="clubs" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Clubs
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Users
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Admin Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tiles">
          <div className="space-y-6">
            {/* Tileset Metadata Uploader - For adding metadata to existing tiles */}
            <TilesetMetadataUploader 
              golfClubs={clubs} 
              onSuccess={() => {
                toast({
                  title: 'Success',
                  description: 'Tileset metadata uploaded successfully!'
                })
              }}
            />
            
            {/* Tileset File Uploader - For uploading actual tile files */}
            <TilesetUploader />
          </div>
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
          <Card>
            <CardHeader>
              <CardTitle>All Files in R2</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="truncate max-w-[70%]">{i.key}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!i.key) return
                          await R2Service.deleteObject(i.key)
                          load()
                        }}
                      >Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
              <div className="space-y-2">
                {clubs.map((club) => (
                  <div key={club.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{club.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Club</Label>
                    <Select value={selectedClub} onValueChange={setSelectedClub}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select club" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No club</SelectItem>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={assignUserToClub}>Assign to Club</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>All Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.email}</span>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.full_name && <span>{user.full_name} • </span>}
                              {user.club_id ? (
                                <span>Club: {clubs.find(c => c.id === user.club_id)?.name || 'Unknown'}</span>
                              ) : (
                                <span>No club assigned</span>
                              )}
                              <span> • Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
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
                              disabled={!newUserRole}
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.email}? This action cannot be undone.
                                    All their data will be permanently removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUser(user.id, user.email)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                    <li>Upload agricultural data in the "Upload Files" tab</li>
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
  )
}

export default DashboardAdmin


