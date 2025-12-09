# Quick UI Guide - PhytoMaps Golf Application

## Admin Dashboard

### Header
```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                    [Administrator] [Logout]    │
│  Manage your PhytoMaps golf course system                       │
└─────────────────────────────────────────────────────────────────┘
```

### Tabs
```
┌─────────────────────────────────────────────────────────────────┐
│ [Upload Tiles] [Upload Vector Layers] [Upload Health Maps]     │
│ [Manage Clubs] [Manage Users] [Admin Settings]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Manage Users Tab

#### Search Section
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Search Clients                                               │
│ [Search by name, email, or ID...]                              │
│ Found 5 clients                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Client Selection
```
┌─────────────────────────────────────────────────────────────────┐
│ Select Client                                                   │
│ [Choose a client... ▼]                                         │
│   - John Doe (john@example.com)                                │
│   - Jane Smith (jane@example.com)                              │
└─────────────────────────────────────────────────────────────────┘
```

### Manage Clubs Tab

#### Club Cards
```
┌─────────────────────────────────────────────────────────────────┐
│ 📍 Pebble Beach Golf Links                                      │
│    👥 Assigned Clients: 3                                       │
│    [John Doe] [Jane Smith] [Bob Johnson]                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📍 Augusta National                                             │
│    👥 Assigned Clients: 0                                       │
│    No clients assigned yet                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Client Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                    Golf Course Map                              │
│  [Raster Layers Toggle] [Zoom Controls] [Vector Layers]        │
│                                                                 │
│  [Map View - 600px height]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Raster Images                                │
│  [Date/Time Selection Dropdown]                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🌿 Health Maps                                                  │
│  [Toggle ON/OFF]                                               │
│  [Select Health Maps]                                          │
│  [Opacity Slider]                                              │
│  [Animate In] [Animate Out]                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Vector Layer Comparison                            │
│  [Side-by-side comparison maps]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme

### Admin UI
- **Background**: Gradient from green-50 → blue-50 → emerald-50
- **Cards**: White with subtle shadow
- **Primary Actions**: Green-600 to Green-700
- **Secondary Actions**: Blue-600 to Blue-700
- **Logout Hover**: Red-50 background, Red-600 text

### Client UI
- **Health Maps Icon**: Emerald-600 (🌿 Activity icon)
- **Map Controls**: Blue-600
- **Vector Layers**: Purple-600

---

## Icons Used

### Admin Dashboard
- 🛡️ Shield - Administrator badge
- 🚪 LogOut - Logout button
- 🗺️ Map - Upload Tiles tab
- 📤 Upload - Upload Vector Layers tab
- 📊 Activity - Upload Health Maps tab
- 👥 Users - Manage Clubs & Users tabs
- ⚙️ Settings - Admin Settings tab
- 📍 MapPin - Golf club locations
- 🔍 Search - Search functionality

### Client Dashboard
- 📍 MapPin - Golf Course Map
- 🌿 Activity - Health Maps section
- 🔲 Layers - Vector Layers

---

## Key Features

### Admin
1. **Logout** - Top right corner, red hover effect
2. **Search** - Real-time filtering in Manage Users
3. **Client Badges** - Visual display of assigned clients per club
4. **Gradient Theme** - Professional golf-themed colors

### Client
1. **Organized Layout** - Clear section hierarchy
2. **No Overlap** - Health Maps below Raster Images
3. **Better Spacing** - Clean, professional layout
4. **Card-based Design** - Consistent visual structure

---

## Responsive Behavior

### Admin Dashboard
- Tabs stack on smaller screens
- Cards maintain padding and spacing
- Search input full width on mobile

### Client Dashboard
- Map maintains aspect ratio
- Sections stack vertically
- Controls remain accessible

---

## User Flows

### Admin: Assign Client to Course
1. Navigate to "Manage Users" tab
2. Use search to find client (by name, email, or ID)
3. Select client from dropdown
4. Check golf courses to assign
5. Click "Save Assignments"

### Admin: View Club Assignments
1. Navigate to "Manage Clubs" tab
2. View each club card
3. See assigned client badges
4. Identify clubs with no assignments

### Client: Use Health Maps
1. View Golf Course Map
2. Scroll down past Raster Images section
3. Find Health Maps card
4. Toggle ON
5. Select health maps
6. Adjust opacity
7. Use animate buttons

---

## Accessibility

- ✅ Keyboard navigation
- ✅ Screen reader labels
- ✅ High contrast colors
- ✅ Clear focus states
- ✅ Semantic HTML structure

---

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

---

**Last Updated:** December 9, 2025
