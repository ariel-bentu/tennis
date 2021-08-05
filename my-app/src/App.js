import './App.css';
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Collapse, CircularProgress } from '@material-ui/core';
import Register from './register';
import { Toolbar, Text } from './elem'
import * as api from './api'


function App() {

  const [userInfo, setUserInfo] = useState(undefined);
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState({});

  useEffect(() => {

    api.getUserInfo().then(info => {
      if (info === undefined) {
        setBlocked(true);
      } else {
        setUserInfo(info);
      }
    });
  }, []);

  const notify = {
    success: (body, title) => {
      setMsg({ open: true, severity: "success", title, body });
      setTimeout(() => setMsg({}), 5000);
    }
  }

  return (
    userInfo ? <div className="App" dir="rtl" >
      <Collapse in={msg.open} timeout={500} style={{ position: 'absolute', top: 0, width: '100%' }} >
        <Alert severity={msg.severity}>
          {msg.title ? <AlertTitle>{msg.title}</AlertTitle> : null}
          {msg.body}
        </Alert>
      </Collapse>
      <Toolbar><Text>{userInfo.Name}</Text></Toolbar>
      <Register notify={notify} />
    </div> : blocked ? <div>משתמש לא מורשה</div> :
      <div style={{
        dir:"rtl",
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        alignItems: 'center',
        alignContent: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress /><Text fontSize={35} textAlign={"center"}>טוען</Text>
      </div>
  );
}

export default App;
