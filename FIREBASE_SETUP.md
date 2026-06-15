# Firebase setup for Cameron sync

This version syncs Cameron's app between phones using Firebase Firestore.

## What you need to do

1. Go to Firebase Console.
2. Create a new project.
3. Add a Web App.
4. Copy the Firebase config.
5. Open `script.js`.
6. Replace this section:

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};

with your real Firebase config.

7. In Firebase, create a Firestore Database.
8. Start in test mode for now.
9. Put the rules from `firestore.rules` into Firestore Rules.
10. Upload all files to GitHub.
11. Open the same GitHub Pages link on both phones.

## Files to upload

- index.html
- style.css
- script.js
- manifest.json
- icon.png
- icon-192.png
- firestore.rules
- README.md
- FIREBASE_SETUP.md

## Important

The included Firestore rules are easy mode:

allow read, write: if true;

That makes setup simple, but it is not properly private.
Once it is working, you can make it safer with Firebase Authentication.
