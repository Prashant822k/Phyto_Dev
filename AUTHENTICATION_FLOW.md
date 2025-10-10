# Authentication and Access Control Flow

## Overview

This document outlines the authentication and access control system implemented for the golf club analysis application. The system provides role-based access control with two primary user types:

1. **Administrators** - Can upload PNG tiles and access all data
2. **Clients** - Can only view data related to their specific golf club

## User Roles

### Administrator Role
- Full access to all features and data
- Can upload new PNG tiles for analysis
- Can view analysis results for all golf clubs
- Access to the admin-specific login interface

### Client Role
- Access limited to data from their specific golf club
- Cannot upload new PNG tiles
- Can view analysis results only for their golf club
- Standard login interface with golf club selection during registration

## Database Schema

The following tables support the authentication and access control system:

### Users Table
- Extended with `role` column (values: 'admin' or 'client')
- Added `golf_club_id` column to link clients to their golf club

### Golf Clubs Table
- Stores information about each golf club
- Fields: id, name, location, etc.

## Row Level Security (RLS) Policies

### Images Table
- Admins have full access to all records
- Clients can only view images associated with their golf club

### Golf Clubs Table
- Admins have full access to all records
- Clients can only view their own golf club information

## Authentication Flow

1. **Login Options**
   - The application provides two login options: "Client Login" and "Admin Login"
   - Each option opens a different login modal tailored to the user type

2. **Admin Authentication**
   - Admins use the Admin Login modal
   - After successful authentication, the system verifies the user has the 'admin' role
   - If verified, admin privileges are granted

3. **Client Authentication**
   - Clients use the standard Login modal
   - During registration, clients must select their golf club
   - After login, data access is automatically filtered based on the client's golf club

4. **Access Control**
   - The `accessControl.ts` utility provides functions to:
     - Check if a user is an admin (`isUserAdmin`)
     - Get a user's golf club ID (`getUserGolfClub`)
     - Determine if a user has access to specific data (`hasAccessToData`)

## Frontend Implementation

### Upload Functionality
- The FileUpload component checks for admin role
- Non-admin users see a disabled upload interface with a message indicating admin-only access

### Data Display
- The MapboxMap component filters data based on user role and golf club
- Admins see all data
- Clients only see data from their golf club

## Security Considerations

1. **Server-Side Validation**
   - All access control rules are enforced on the server via RLS policies
   - Client-side checks are for UI purposes only and not relied upon for security

2. **Role Assignment**
   - Only existing admins can create new admin accounts
   - Client accounts are automatically assigned the 'client' role during registration

3. **Data Isolation**
   - Complete data isolation between different golf clubs
   - No data leakage between clients from different golf clubs