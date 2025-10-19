/**
 * First Admin Account Setup Script
 * 
 * This script helps you create your first admin account.
 * Run this in your browser console on your PhytoMaps application.
 * 
 * Instructions:
 * 1. Open your PhytoMaps application in a browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Follow the prompts
 */

(async function setupFirstAdmin() {
  console.log('🚀 PhytoMaps Admin Setup Script');
  console.log('================================');
  
  // Check if we're on the right page
  if (!window.location.href.includes('phytomaps') && !window.location.href.includes('localhost')) {
    console.warn('⚠️  Make sure you\'re on your PhytoMaps application');
    return;
  }
  
  // Get admin details
  const email = prompt('Enter admin email (e.g., admin@phytomaps.com):');
  if (!email) {
    console.log('❌ Setup cancelled');
    return;
  }
  
  const password = prompt('Enter admin password (min 8 characters):');
  if (!password || password.length < 8) {
    console.log('❌ Password must be at least 8 characters');
    return;
  }
  
  const fullName = prompt('Enter admin full name (e.g., John Doe):');
  if (!fullName) {
    console.log('❌ Full name is required');
    return;
  }
  
  console.log('📝 Creating admin account...');
  console.log(`Email: ${email}`);
  console.log(`Name: ${fullName}`);
  
  try {
    // Check if supabase is available
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you\'re on the PhytoMaps application.');
      return;
    }
    
    // Create auth user
    console.log('🔐 Creating authentication user...');
    const { data: authData, error: authError } = await window.supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    
    if (!authData.user) {
      console.error('❌ No user created');
      return;
    }
    
    console.log('✅ Auth user created successfully');
    
    // Wait a moment for the trigger to create the public.users record
    console.log('⏳ Waiting for user profile creation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update user role to admin
    console.log('👑 Setting admin role...');
    const { error: updateError } = await window.supabase
      .from('users')
      .update({ 
        role: 'admin',
        full_name: fullName,
        organization: 'PhytoMaps'
      })
      .eq('id', authData.user.id);
    
    if (updateError) {
      console.error('❌ Role update error:', updateError.message);
      console.log('💡 Try running this SQL in Supabase:');
      console.log(`UPDATE public.users SET role = 'admin' WHERE email = '${email}';`);
      return;
    }
    
    console.log('✅ Admin role set successfully');
    
    // Verify the admin account
    console.log('🔍 Verifying admin account...');
    const { data: userData, error: userError } = await window.supabase
      .from('users')
      .select('email, role, full_name')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('❌ Verification error:', userError.message);
      return;
    }
    
    console.log('🎉 Admin account created successfully!');
    console.log('================================');
    console.log(`Email: ${userData.email}`);
    console.log(`Name: ${userData.full_name}`);
    console.log(`Role: ${userData.role}`);
    console.log('================================');
    console.log('📋 Next Steps:');
    console.log('1. Go to /login-admin');
    console.log('2. Sign in with your new admin credentials');
    console.log('3. Access the admin dashboard at /admin');
    console.log('4. Create golf clubs and manage users');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('💡 Manual setup instructions:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log('2. Create a new user with your email and password');
    console.log('3. Go to SQL Editor and run:');
    console.log(`UPDATE public.users SET role = 'admin' WHERE email = '${email}';`);
  }
})();

// Alternative manual method
console.log(`
📖 Manual Setup Instructions:
============================

If the script above doesn't work, follow these steps:

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Users
3. Click "Add user"
4. Enter your email and password
5. Click "Create user"
6. Go to SQL Editor
7. Run this query:
   UPDATE public.users 
   SET role = 'admin', full_name = 'Your Name'
   WHERE email = 'your-email@domain.com';

8. Go to /login-admin in your app
9. Sign in with your credentials
10. Access admin dashboard at /admin

For more help, see ADMIN_SETUP_GUIDE.md
`);
