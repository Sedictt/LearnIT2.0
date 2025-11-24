# Run this after Firebase Storage is initialized
$bucket = "learnit-f06cc.appspot.com"
& "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" cors set cors.json gs://$bucket

# Verify CORS was applied
& "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" cors get gs://$bucket
