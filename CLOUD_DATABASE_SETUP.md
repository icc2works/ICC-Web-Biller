# Cloud Database Setup

The app can sync customers, bills, settings, bill sequence, and invoice templates to Firebase Realtime Database while keeping local browser storage as an offline cache.

1. Create a Firebase project.
2. Add a Web App in Firebase project settings.
3. Create a Realtime Database.
4. Copy the Firebase web config into `js/cloud-db.js`.
5. Change `enabled: false` to `enabled: true`.

For first testing, use Firebase Realtime Database rules that allow your app to read/write. Before using this for real customer data, lock the database with Firebase Authentication and security rules.
