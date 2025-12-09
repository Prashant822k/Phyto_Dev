import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ClientCourseService } from '@/lib/clientCourseService'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Users, MapPin, Plus, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Client {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface GolfClub {
  id: string
  name: string
}

interface Assignment {
  id: string
  client_id: string
  golf_club_id: string
  assigned_at: string
  users?: {
    id: string
    email: string
    full_name: string | null
  }
  golf_clubs?: {
    id: string
    name: string
  }
}

export function ClientCourseManager() {
  const [clients, setClients] = useState<Client[]>([])
  const [golfClubs, setGolfClubs] = useState<GolfClub[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const { toast } = useToast()

  // Filter clients based on search query
  const filteredClients = clients.filter((client) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      client.email.toLowerCase().includes(query) ||
      client.full_name?.toLowerCase().includes(query) ||
      client.id.toLowerCase().includes(query)
    )
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('role', 'client')
        .order('email')

      if (clientsError) throw clientsError
      setClients(clientsData || [])

      // Load golf clubs
      const { data: clubsData, error: clubsError } = await supabase
        .from('golf_clubs')
        .select('id, name')
        .order('name')

      if (clubsError) throw clubsError
      setGolfClubs(clubsData || [])

      // Load assignments
      const assignmentsData = await ClientCourseService.getAllAssignments()
      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClientSelect = async (clientId: string) => {
    setSelectedClient(clientId)
    setSelectedCourses(new Set())

    // Load existing assignments for this client
    const clientCourses = await ClientCourseService.getClientCourses(clientId)
    const courseIds = new Set(clientCourses.map((c) => c.golf_club_id))
    setSelectedCourses(courseIds)
  }

  const toggleCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      newSelected.add(courseId)
    }
    setSelectedCourses(newSelected)
  }

  const handleSaveAssignments = async () => {
    if (!selectedClient) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Get current assignments
      const currentCourses = await ClientCourseService.getClientCourses(selectedClient)
      const currentCourseIds = new Set(currentCourses.map((c) => c.golf_club_id))

      // Find courses to add and remove
      const toAdd = Array.from(selectedCourses).filter((id) => !currentCourseIds.has(id))
      const toRemove = Array.from(currentCourseIds).filter((id) => !selectedCourses.has(id))

      // Add new assignments
      for (const courseId of toAdd) {
        const result = await ClientCourseService.assignClientToCourse(selectedClient, courseId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to assign course')
        }
      }

      // Remove old assignments
      for (const courseId of toRemove) {
        const result = await ClientCourseService.removeClientFromCourse(selectedClient, courseId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to remove course')
        }
      }

      toast({
        title: 'Success',
        description: `Updated course assignments for client`,
      })

      // Reload assignments
      await loadData()
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save assignments',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAssignment = async (clientId: string, courseId: string) => {
    setLoading(true)
    try {
      const result = await ClientCourseService.removeClientFromCourse(clientId, courseId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove assignment')
      }

      toast({
        title: 'Success',
        description: 'Course assignment removed',
      })

      await loadData()
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove assignment',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getClientAssignments = (clientId: string) => {
    return assignments.filter((a) => a.client_id === clientId)
  }

  return (
    <div className="space-y-6">
      {/* Assignment Manager - AT TOP ⭐ */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle>Assign Golf Courses to Clients</CardTitle>
          </div>
          <CardDescription>
            Select a client and assign them to one or multiple golf courses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              Search Clients
            </label>
            <Input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            {searchQuery && (
              <p className="text-xs text-gray-500">
                Found {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Client</label>
            <Select value={selectedClient} onValueChange={handleClientSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    No clients found
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name || client.email} ({client.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Course Selection */}
          {selectedClient && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Assign Golf Courses</label>
              <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {golfClubs.length === 0 ? (
                  <p className="text-sm text-gray-500">No golf courses available</p>
                ) : (
                  golfClubs.map((club) => (
                    <div key={club.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`course-${club.id}`}
                        checked={selectedCourses.has(club.id)}
                        onCheckedChange={() => toggleCourse(club.id)}
                      />
                      <label
                        htmlFor={`course-${club.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>{club.name}</span>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-600">
                  {selectedCourses.size} course{selectedCourses.size !== 1 ? 's' : ''} selected
                </p>
                <Button onClick={handleSaveAssignments} disabled={loading}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Assignments
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
