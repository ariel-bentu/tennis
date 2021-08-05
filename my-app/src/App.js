import './App.css';
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Collapse } from '@material-ui/core';
import Register from './register';
import { Toolbar, Text, Loading } from './elem'
import * as api from './api'


function App() {

  const [userInfo, setUserInfo] = useState(undefined);
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState({});

  useEffect(() => {

    api.getUserInfo().then(info => {
      if (info === null) {
        setBlocked(true);
      } else {
        setUserInfo(info);
      }
    },
    (err)=>{
      setBlocked(true);
      setMsg({ open: true, severity: "error", title:"שגיאה", body:err })
    });
  }, []);

  const notify = {
    success: (body, title) => {
      setMsg({ open: true, severity: "success", title, body });
      setTimeout(() => setMsg({}), 5000);
    }
  }

  return (
    <div className="App" dir="rtl" >
      <Collapse in={msg.open} timeout={500} style={{ position: 'absolute', top: 0, width: '100%' }} >
        <Alert severity={msg.severity}>
          {msg.title ? <AlertTitle>{msg.title}</AlertTitle> : null}
          {msg.body}
        </Alert>
      </Collapse>
      {userInfo ?<Toolbar><Text>{userInfo.Name}</Text></Toolbar>:null}
      {userInfo? <Register notify={notify} />:
         blocked ? null:
         <Loading msg="מאמת זהות"/>}
    </div>
  );
}

export default App;
