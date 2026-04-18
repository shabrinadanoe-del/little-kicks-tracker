"use client";

import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
apiKey: "AIzaSyDcNgHY5TTLAC9ctkT6jjwGR8Yne25nJnA",
authDomain: "little-kicks-tracker-e6eb1.firebaseapp.com",
projectId: "little-kicks-tracker-e6eb1",
storageBucket: "little-kicks-tracker-e6eb1.firebasestorage.app",
messagingSenderId: "84421098243",
appId: "1:84421098243:web:494e4d7303b273ff3b0736",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function Page() {
const [kicks, setKicks] = useState<number[]>([]);
const [user, setUser] = useState<any>(null);

const addKick = () => {
setKicks([...kicks, Date.now()]);
};

const login = async () => {
const result = await signInWithPopup(auth, provider);
setUser(result.user);
};

return (
<div style={{ padding: 20, fontFamily: "sans-serif" }}> <h1>Little Kicks Tracker</h1>

```
  {!user ? (
    <button onClick={login}>Login dengan Google</button>
  ) : (
    <p>Login sebagai: {user.email}</p>
  )}

  <button onClick={addKick} style={{ marginTop: 20 }}>
    Bayi Bergerak
  </button>

  <p>Total Gerakan Hari Ini: {kicks.length}</p>
</div>
```

);
}
