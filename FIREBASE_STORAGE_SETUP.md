# Firebase Storage Setup

## ⚠️ IMPORTANT: Enable Firebase Storage First

The 404 error means Firebase Storage hasn't been initialized yet in your project.

## Setup Steps:

### 1. Enable Firebase Storage in Console

1. Go to: https://console.firebase.google.com/project/learnit-f06cc/storage
2. Click **"Get Started"**
3. Click **"Next"** (default location is fine)
4. Click **"Done"**

### 2. Update Firebase Storage Rules
Go to [Firebase Console](https://console.firebase.google.com/project/learnit-f06cc/storage/learnit-f06cc.firebasestorage.app/rules) and replace the rules with the content from `storage.rules` file:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Or simply click **"Publish"** in the Firebase Console Storage Rules tab.

### 2. Configure CORS for Firebase Storage

You need to configure CORS using Google Cloud CLI. Run these commands:

```powershell
# Install Google Cloud SDK if not already installed
# Download from: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project learnit-f06cc

# Apply CORS configuration
gsutil cors set cors.json gs://learnit-f06cc.firebasestorage.app
```

### 3. Verify CORS is Applied

```powershell
gsutil cors get gs://learnit-f06cc.firebasestorage.app
```

## Alternative: Use Firebase Console Only

If you don't want to use gcloud CLI, you can:

1. Go to [Firebase Console > Storage](https://console.firebase.google.com/project/learnit-f06cc/storage)
2. Click on the **Rules** tab
3. Update the rules as shown in step 1
4. For CORS, unfortunately Firebase Console doesn't have a UI - you must use `gsutil` command

## What Changed:

- ✅ Created `storage.rules` - Firebase Storage security rules
- ✅ Created `cors.json` - CORS configuration for all origins
- ✅ Storage path uses `uploads/profile_{userId}.{extension}`

## Testing:

After applying the changes:
1. Go to your app's Profile page
2. Upload a profile picture
3. The image should upload successfully and display

## Troubleshooting:

If still getting errors:
- Clear browser cache
- Check Firebase Console > Storage to verify file was uploaded
- Verify the Storage bucket name matches in firebase.ts
- Make sure you're logged in (guest users can't upload)
