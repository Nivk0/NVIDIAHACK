# Step-by-Step: Fix Callback URL Mismatch

## The Error
"Callback URL mismatch" means Auth0 doesn't recognize `http://localhost:3000` as an allowed callback URL.

## Exact Steps to Fix

### Step 1: Open Auth0 Dashboard
1. Go to: **https://manage.auth0.com**
2. Make sure you're logged in

### Step 2: Navigate to Your Application
1. Click **"Applications"** in the left sidebar (under "Applications")
2. Click on **"Memory Garden"** (or "My App" - whatever you named it)

### Step 3: Go to Settings
1. Click the **"Settings"** tab at the top (should be the default tab)

### Step 4: Scroll to "Application URIs"
1. Scroll down past:
   - Domain
   - Client ID
   - Client Secret
   - Description
   - Logo
   - Application Type
2. Keep scrolling until you see **"Application URIs"** section

### Step 5: Add the Callback URL
In the **"Allowed Callback URLs"** field, type exactly this:

```
http://localhost:3000
```

**Important:**
- ✅ Use `http://` (lowercase)
- ✅ No `https://`
- ✅ No trailing slash
- ✅ Exactly: `http://localhost:3000`

### Step 6: Add Logout URL
In the **"Allowed Logout URLs"** field, type the same:

```
http://localhost:3000
```

### Step 7: Add Web Origins
In the **"Allowed Web Origins"** field, type the same:

```
http://localhost:3000
```

### Step 8: Save
1. **Scroll all the way to the bottom** of the page
2. Click the blue **"Save Changes"** button
3. Wait for the green success message at the top

### Step 9: Test
1. Go back to http://localhost:3000
2. Click "Login" button
3. It should work now! 🎉

## If It Still Doesn't Work

1. **Check for typos:**
   - Make sure it's exactly `http://localhost:3000`
   - No spaces before or after
   - No quotes

2. **Make sure you clicked "Save Changes":**
   - The button is at the very bottom
   - You should see a green success message

3. **Try clearing browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

4. **Check the exact error:**
   - Click "See details for this error" in Auth0
   - It will show what URL it's expecting vs what you sent

## Visual Guide

The "Application URIs" section should look like this:

```
┌─────────────────────────────────────────┐
│ Application URIs                       │
├─────────────────────────────────────────┤
│ Allowed Callback URLs                  │
│ ┌─────────────────────────────────────┐ │
│ │ http://localhost:3000               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Allowed Logout URLs                    │
│ ┌─────────────────────────────────────┐ │
│ │ http://localhost:3000               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Allowed Web Origins                    │
│ ┌─────────────────────────────────────┐ │
│ │ http://localhost:3000               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

