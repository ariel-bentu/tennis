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
```
