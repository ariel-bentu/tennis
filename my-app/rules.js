rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
        let email = request.auth.token.email;
        return get(/databases/$(database)/documents/admins/$(email)).data.admin == true;
    }
    
    function isFinAdmin() {
        let email = request.auth.token.email;
        return get(/databases/$(database)/documents/admins/$(email)).data.finance == true;
    }
    
    function isActiveUser() {
        let email = request.auth.token.email;
        let inactive = get(/databases/$(database)/documents/users-info/$(email)).data.inactive;
        return inactive == false;
    }
    
    match /planned-games/{pgames} {
    	allow read: if true;
      allow write: if isAdmin();
    }
    
    match /users/{user} {
      allow read, write: if isAdmin();
    }
    
    match /users-info/{user} {
      allow write: if isAdmin();
    	allow read: if request.auth != null;
    }
    
    match /bets-stats/{user} {
      allow write: if isAdmin();
    	allow read: if request.auth != null;
    }
    
    match /stats/{user} {
      allow write: if isAdmin();
    	allow read: if request.auth != null;
    }

    match /registrations/{reg} {
    	allow read: if request.auth != null;
      allow write: if isActiveUser();
    }
    
    match /replacement-requests/{rep} {
    	allow read: if request.auth != null;
      allow write: if rep.matches(request.auth.token.email + ".*");
    }

    match /matches/{m} {
      allow write: if isAdmin();
    	allow read: if request.auth != null;
    }
    
    match /matches-archive/{m} {
    	allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    match /registrations-archive/{m} {
    	allow read, write: if isAdmin();
    }
    
    match /billing/{user} {
    	allow write: if isFinAdmin();
      allow read: if isFinAdmin() || user == request.auth.token.email;
    }

    match /billing/{user}/debts/{d} {
    	allow write: if isFinAdmin();
      allow read: if isFinAdmin() || user == request.auth.token.email;
    }
    
    match /billing/{user}/payments/{d} {
    	allow write: if isFinAdmin();
      allow read: if isFinAdmin() || user == request.auth.token.email;
    }
    
    match /bets/{m} {
    	allow read: if isActiveUser();
      allow write: if isAdmin();
    }
    
    match /bets-archive/{m} {
    	allow read: if isActiveUser();
      allow write: if isAdmin();
    }
    
    match /systemInfo/{m} {
      allow read: if request.auth != null;
    	allow read, write: if isAdmin();
    }
    
  }
}