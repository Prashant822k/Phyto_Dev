/**
 * Admin Dashboard Test Script
 * 
 * Run this in your browser console to test admin dashboard functionality
 * 
 * Instructions:
 * 1. Open your PhytoMaps app in a browser
 * 2. Login as admin and go to /admin
 * 3. Open Developer Tools (F12) → Console
 * 4. Copy and paste this entire script
 * 5. Follow the test results
 */

(async function testAdminDashboard() {
  console.log('🧪 Admin Dashboard Test Script');
  console.log('==============================');
  
  // Check if we're on the admin page
  if (!window.location.href.includes('/admin')) {
    console.warn('⚠️  Please navigate to /admin first');
    return;
  }
  
  // Check if supabase is available
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase client not found');
    return;
  }
  
  console.log('✅ Supabase client found');
  
  // Test 1: Check current user
  console.log('\n🔍 Test 1: Current User');
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('❌ No authenticated user');
      return;
    }
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return;
  }
  
  // Test 2: Check user role
  console.log('\n🔍 Test 2: User Role');
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    const { data: userData, error } = await window.supabase
      .from('users')
      .select('email, role, full_name')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('❌ Error getting user role:', error);
    } else {
      console.log('✅ User role:', userData.role);
      if (userData.role !== 'admin') {
        console.warn('⚠️  User is not an admin. This may cause issues.');
      }
    }
  } catch (error) {
    console.error('❌ Error checking user role:', error);
  }
  
  // Test 3: Check admin function
  console.log('\n🔍 Test 3: Admin Function');
  try {
    const { data, error } = await window.supabase.rpc('is_admin');
    if (error) {
      console.error('❌ Error calling is_admin function:', error);
    } else {
      console.log('✅ is_admin() result:', data);
    }
  } catch (error) {
    console.error('❌ Error testing admin function:', error);
  }
  
  // Test 4: Load users
  console.log('\n🔍 Test 4: Load Users');
  try {
    const { data: users, error } = await window.supabase
      .from('users')
      .select('id, email, full_name, role, club_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error loading users:', error);
    } else {
      console.log('✅ Users loaded:', users.length, 'users found');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
  } catch (error) {
    console.error('❌ Error loading users:', error);
  }
  
  // Test 5: Load clubs
  console.log('\n🔍 Test 5: Load Clubs');
  try {
    const { data: clubs, error } = await window.supabase
      .from('golf_clubs')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ Error loading clubs:', error);
    } else {
      console.log('✅ Clubs loaded:', clubs.length, 'clubs found');
      clubs.forEach(club => {
        console.log(`  - ${club.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Error loading clubs:', error);
  }
  
  // Test 6: Check RLS policies
  console.log('\n🔍 Test 6: RLS Policy Test');
  try {
    // Try to access users table
    const { data, error } = await window.supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ RLS may be blocking access:', error);
    } else {
      console.log('✅ RLS policies allow access to users table');
    }
  } catch (error) {
    console.error('❌ Error testing RLS:', error);
  }
  
  // Summary
  console.log('\n📋 Test Summary');
  console.log('================');
  console.log('If you see errors above, here are the likely causes:');
  console.log('');
  console.log('❌ "Permission denied" → Check RLS policies and admin role');
  console.log('❌ "Table doesn\'t exist" → Run the database schema');
  console.log('❌ "Function doesn\'t exist" → Check if helper functions are created');
  console.log('❌ "No authenticated user" → Login first');
  console.log('❌ "User is not an admin" → Set role to admin in database');
  console.log('');
  console.log('💡 For detailed troubleshooting, see ADMIN_TROUBLESHOOTING.md');
  
})();

// Additional debugging functions
window.debugAdmin = {
  // Test user role
  checkRole: async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    const { data } = await window.supabase
      .from('users')
      .select('email, role')
      .eq('id', user.id)
      .single();
    console.log('Current user role:', data);
    return data;
  },
  
  // Test admin function
  testAdmin: async () => {
    const { data } = await window.supabase.rpc('is_admin');
    console.log('is_admin() result:', data);
    return data;
  },
  
  // Load all users
  loadUsers: async () => {
    const { data, error } = await window.supabase
      .from('users')
      .select('*');
    console.log('All users:', data);
    return { data, error };
  },
  
  // Load all clubs
  loadClubs: async () => {
    const { data, error } = await window.supabase
      .from('golf_clubs')
      .select('*');
    console.log('All clubs:', data);
    return { data, error };
  }
};

console.log('\n🛠️  Debug Functions Available:');
console.log('window.debugAdmin.checkRole() - Check your role');
console.log('window.debugAdmin.testAdmin() - Test admin function');
console.log('window.debugAdmin.loadUsers() - Load all users');
console.log('window.debugAdmin.loadClubs() - Load all clubs');
