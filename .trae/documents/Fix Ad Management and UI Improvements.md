I have completed the requested fixes and improvements.

### 1. Ad Management Fixes
- **Cannot Edit**: Fixed the API endpoint in `Admin.tsx` from `/ads/admin/:id` to `/ads/:id`. Also corrected the status (`isActive`) handling in the edit form to ensure it displays correctly.
- **Cannot Delete**: Fixed the API endpoint in `Admin.tsx` from `/ads/admin/:id` to `/ads/:id`.
- **Redirect URL**: Updated `Home.tsx` to intelligently handle redirect URLs. If a URL does not start with `http` or `/`, it now automatically prepends `http://`, preventing the "domain splicing" issue for external links (e.g., `baidu.com` now correctly redirects to `http://baidu.com`).

### 2. UI Improvement
- **Rating Grade Display**: In `UserProfile.tsx`, I increased the size of the Grade Badge (S, A, B...) and ensured it is perfectly centered horizontally within its container.

Code Changes:
- Modified `src/pages/Admin.tsx`
- Modified `src/pages/Home.tsx`
- Modified `src/pages/UserProfile.tsx`