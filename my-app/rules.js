rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
        let email = request.auth.token.email;
        return exists(/databases/$(database)/documents/admins/$(email));
    }
    
    function isFinAdmin() {
        let email = request.auth.token.email;
        return get(/databases/$(database)/documents/admins/$(email)).data.finance == true;
    }
    
    match /planned-games/{pgames} {
    	allow read: if true;
      allow write: if isAdmin();
    }
    
    match /users/{user} {
      allow read: if isAdmin();
    	allow write: if isAdmin() || user == request.auth.token.email;
    }
    
    match /users-info/{user} {
      allow write: if isAdmin();
    	allow read: if request.auth != null;
    }
    
    match /stats/{user} {
      allow write: if isAdmin();
    	allow read: if request.auth != null;
    }

    match /registrations/{reg} {
    	allow read, write: if request.auth != null;
    }

    match /matches/{m} {
      allow read: if request.auth != null;
    	allow write: if isAdmin();
    }
    
    match /matches-archive/{m} {
    	allow read, write: if isAdmin();
    }
    
    match /registrations-archive/{m} {
    	allow read, write: if isAdmin();
    }
    
    match /billing/{user} {
    	allow write: if isFinAdmin();
      allow read: if isFinAdmin() || user == request.auth.token.email;
    }

    match /billing/{m}/debts/{d} {
    	allow read, write: if isFinAdmin();
    }
    
    match /billing/{m}/payments/{d} {
    	allow read, write: if isFinAdmin();
    }


     match /systemInfo/{m} {
      allow read: if request.auth != null;
    	allow read, write: if isAdmin();
    }
    
    match /test/{tDoc} {
      allow read: if true;
      allow write: if isAdmin();
    }

		

  }
}