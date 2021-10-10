# A project to manage a community of Tennis players

## project
https://console.firebase.google.com/project/atpenn-fe837/hosting/sites


## commands
- Deploy UI
```bash
npm run build
npm run deploy
```

- Deploy functions
```bash
cd functions 
firebase deploy --only functions
```

- Set functions config
```bash
firebase functions:config:set admin.email=<admin email>
firebase functions:config:set sms.apikey=<api key>
firebase functions:config:set notification.serverkey=<server key>
firebase functions:config:set notification.passphrase=<passphrase>
```


## Safari Push

- [Apple docu](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NotificationProgrammingGuideForWebsites/PushNotifications/PushNotifications.html#//apple_ref/doc/uid/TP40013225-CH3-SW10)
- Follow [This article](https://rossbulat.medium.com/safari-push-notifications-complete-setup-ef57f19bbb89)

### convert .cer to .pem
openssl x509 -inform der -in xxx.cer -out xxx.pem

### hash for each file
`shasum -a 512 /path/to/file`

### generate signature
```
  cd ...ATPenn


php -r 'openssl_pkcs7_sign("my-app/safari-push/safariPushPackage/manifest.json", "my-app/safari-push/safariPushPackage/signature", "file:///Users/i022021/dev/tennis/ATPenn/cert.pem", array("file:///Users/i022021/dev/tennis/ATPenn/cert.pem", "ariel"), array(), PKCS7_BINARY | PKCS7_DETACHED, "AppleWWDRCA.pem");'
```

### all in one
php -r "require 'createPushPackage.php'; create_push_package();"