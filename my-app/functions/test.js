let apn = require("apn");
let fs = require("fs");


const sendSafaryNotification = (deviceToken, title, body, param) => {
    var options = {
        pfx: fs.readFileSync("/Users/i022021/dev/tennis/ATPenn/cert_with_pk.p12"),
        passphrase: "ariel",
        production: true
    };

    var apnProvider = new apn.Provider(options);

    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.alert = {
        title,
        body
    };
    note.topic = "web.com.atpenn";
    note.urlArgs = [param]

    return apnProvider.send(note, deviceToken);
};