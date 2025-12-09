# Fixes Applied - Dec 9, 2025

## Issue 1: Health Map Toggle Auto-Off Problem ✅ FIXED

### Problem
After deselecting all health maps once, the toggle would immediately turn OFF whenever the user tried to turn it ON, making it impossible to use the health maps feature again.

### Root Cause
The `hasEverSelectedHealthMap` ref stayed `true` even after the toggle was turned OFF, so the auto-off effect would trigger immediately when:
- User turns toggle ON
- No health maps are selected yet
- `hasEverSelectedHealthMap.current` is still `true` from previous session
- Auto-off effect runs and turns it back OFF

### Solution
Added a reset effect that clears the `hasEverSelectedHealthMap` flag when the toggle is manually turned OFF:

```typescript
// Reset the flag when toggle is manually turned OFF
useEffect(() => {
  if (!showHealthMaps) {
    hasEverSelectedHealthMap.current = false;
  }
}, [showHealthMaps]);
```

**File modified:** `src/components/MapboxGolfCourseMap.tsx` (lines 611-616)

### How it works now
1. User turns Health Map toggle ON → can select health maps
2. User selects health maps → `hasEverSelectedHealthMap.current = true`
3. User deselects all health maps → auto-off triggers, toggle goes OFF
4. **NEW:** Toggle OFF → `hasEverSelectedHealthMap.current = false` (reset)
5. User can turn toggle ON again → works normally

---

## Issue 2: Login Redirect - All Clients Should Go to Select-Course ✅ FIXED

### Problem
Client `111@gmail.com` was being redirected to `/client` instead of `/select-course` because they had only 1 course assigned. The old logic auto-logged in clients with a single course, but you wanted ALL clients to go through the course selection page.

### Root Cause
The login logic had different paths:
- 0 courses → Sign out
- **1 course → Auto-login to `/client`** ← This was the issue
- 2+ courses → Go to `/select-course`

### Solution
**Removed the single-course auto-login logic** - now ALL clients go to `/select-course` regardless of how many courses they have:

```typescript
// Old logic (removed):
if (courseCount === 1) {
  // Auto-login to /client
  navigate('/client')
}

// New logic:
if (courseCount === 0) {
  // Sign out
  return
}

// All clients with 1+ courses go to selection page
navigate('/select-course')
toast({ 
  title: 'Welcome!', 
  description: courseCount === 1 
    ? 'Please confirm your golf course' 
    : 'Please select a golf course to continue' 
})
```

**Additional improvements:**
1. Added error handling for course assignment queries
2. Added fallback in `ClientCourseService` if RPC function fails
3. Enhanced logging for debugging

**Files modified:**
- `src/pages/LoginClient.tsx` (lines 52-65)
- `src/lib/clientCourseService.ts` (lines 35-75)

### How it works now
1. User logs in
2. Query fetches course assignments with error handling
3. If 0 courses → sign out with error message
4. **If 1+ courses → ALWAYS navigate to `/select-course`** ✅
5. User selects their course → navigate to `/client` dashboard

---

## Testing Instructions

### Test Health Map Toggle
1. Login as a client
2. Turn Health Map toggle ON
3. Select a health map
4. Deselect all health maps → toggle should auto-turn OFF
5. **Turn toggle ON again** → should work (this was broken before)
6. Select health maps → should work normally

### Test Client Login (All Clients)
1. **Test with single-course client** (e.g., `111@gmail.com`):
   - Login → should redirect to `/select-course`
   - Should see 1 course with message "Please confirm your golf course"
   - Select course → navigate to `/client` dashboard

2. **Test with multi-course client**:
   - Login → should redirect to `/select-course`
   - Should see all assigned courses with message "Please select a golf course to continue"
   - Select a course → navigate to `/client` dashboard

3. **Test with zero-course client**:
   - Login → should show "No Access" error and sign out

### Verify with Console Logs
Check browser console for:
```
Client <uuid> (<email>) has <N> course(s) assigned: [...]
✅ Navigating to /select-course for <N> courses
```

---

## Database Migration Required

**IMPORTANT:** Run the `fix-club-id-sync.sql` migration in your Supabase SQL Editor to ensure:
- `assign_client_to_course` function keeps `users.club_id` in sync
- `remove_client_from_course` function updates `users.club_id` properly
- Existing data is synced (one-time update)

This ensures backward compatibility with any code that still reads `users.club_id`.
