# Cameron sync version

This version keeps the latest rules and adds Firebase syncing.

## Rules

- Every new day starts on amber
- Amber to green adds 50 coins every time
- Pressing green again while already green adds 0 coins
- Green to amber removes 0 coins
- Amber is safe
- Cameron must be amber before he can go green
- Green can go straight to red
- Moving onto red removes 50 coins
- Pressing red again while already red removes 0 coins
- 1000 coins unlocks the special treat message
- Changes can sync between phones after Firebase config is added

## Refresh note

This version uses:

style.css?v=10
script.js?v=10


## Version 50 update

- Adds a Family tab.
- Child Mode shows a read-only family tree.
- Parent Mode can add, edit, and delete family members.
- Family tree changes sync through Firebase with the rest of the app data.
- Child Mode calendar still shows the next 7 days; Parent Mode calendar shows the current month.

Refresh note:

style.css?v=50
script.js?v=50
