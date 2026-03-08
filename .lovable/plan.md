

## Promote Sam James Nelson to Admin

Update the `user_roles` table to change the role for user `f40908f5-16a0-4b25-b2da-e604fcf674d3` from `mentor` to `admin`.

### Implementation
- Run a single SQL update via the insert tool: `UPDATE user_roles SET role = 'admin' WHERE user_id = 'f40908f5-16a0-4b25-b2da-e604fcf674d3';`
- After the update, the user will need to refresh/re-navigate to `/dashboard` to see the Admin Dashboard with charts, stats, and management tools.

