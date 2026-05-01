# Cloud Database Setup

The app stores customers, bills, settings, bill sequence, admin password, theme preference, and invoice templates in Firebase Realtime Database. Browser local storage is not used.

1. Create a Firebase project.
2. Add a Web App in Firebase project settings.
3. Create a Realtime Database.
4. Copy the Firebase web config into `js/cloud-db.js`.
5. Keep `enabled: true` in `js/cloud-db.js`.

For first testing, use Firebase Realtime Database rules that allow your app to read/write. Before using this for real customer data, lock the database with Firebase Authentication and security rules.
