import './App.css';
import React, { useState, useEffect } from 'react';

import Register from './register';
import { Toolbar, Text } from './elem'
import * as api from './api'


function App() {

  const [userInfo, setUserInfo] = useState(undefined);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {

    api.getUserInfo().then(info => {
      if (info === undefined ) {
        setBlocked(true);
      } else {
        setUserInfo(info);
      }
    });
  }, []);

  return (
    userInfo ? <div className="App" dir="rtl">
      <Toolbar><Text>{userInfo.Name}</Text></Toolbar>
      <Register />
    </div> : blocked?<div>Go Away...</div>:<div>2בטעינה...</div>
  );
}

export default App;
