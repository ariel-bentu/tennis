import './App.css';
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Collapse, Button } from '@material-ui/core';
import Register from './register';
import Match from './match'
import Users from './users'
import ChangePwd from './change-pwd';
import ForgotPwd from './forgot-pwd'

import { Toolbar, Text, Loading, HBox } from './elem'

import { PowerSettingsNew } from '@material-ui/icons';

import * as api from './api'
import Login from './login'

import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

import firebase from 'firebase/app'
import 'firebase/auth';

import { config } from "./config";

firebase.initializeApp(config);

function App() {

  const [userInfo, setUserInfo] = useState(undefined);
  const [changePwd, setChangePwd] = useState(false);
  const [forgotPwd, setForgotPwd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({});

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
    firebase.auth().onAuthStateChanged(function (user) {
      setUserInfo(api.getUserObj(user));
    });

  }, []);

  const notify = {
    success: (body, title) => {
      setMsg({ open: true, severity: "success", title, body });
      setTimeout(() => setMsg({}), 5000);
    },
    error: (body, title) => {
      setMsg({ open: true, severity: "error", title, body });
      setTimeout(() => setMsg({}), 5000);

    }
  }

  return (
    <div className="App" dir="rtl" >
      <Collapse in={msg.open} timeout={500} style={{ position: 'absolute', top: 0, width: '100%' }} >
        <Alert severity={msg.severity}>
          {msg.title ? <AlertTitle>{msg.title}</AlertTitle> : null}
          <Text>{msg.body}</Text>
        </Alert>
      </Collapse>
      {forgotPwd? <ForgotPwd notify={notify} onCancel={()=>setForgotPwd(false)}/>
      :
      userInfo ? <Toolbar>
        <HBox>
          <PowerSettingsNew onClick={() => api.logout().then(() => setUserInfo(undefined))} />
          <Button onClick={() => setChangePwd(true)}>שנה סיסמא</Button>
          <Text fontSize={15}>{userInfo.displayName}</Text>
        </HBox>
      </Toolbar> : null}
      {forgotPwd?null:
      changePwd ?
        <ChangePwd notify={notify} userInfo={userInfo} onCancel={() => setChangePwd(false)} onPwdChanged={() => {
          notify.success("סיסמא שונתה בהצלחה");
          setChangePwd(false);
        }} />
        :
        userInfo ?
          <Router>
            <Switch>
              <Route path="/match">
                <Match notify={notify} />
              </Route>
              <Route path="/users">
                <Users notify={notify} />
              </Route>
              <Route path="/">
                <Register notify={notify} UserInfo={userInfo} />
              </Route>
            </Switch>
          </Router> :

          loading ? <Loading msg={"מאמת זהות"} /> : <Login
            onLogin={(userInfo) => setUserInfo(userInfo)}
            onError={(err) => notify.error(err.toString())}
            onForgotPwd={() => setForgotPwd(true)}
          />}
      {/* <Button onClick={()=> {
          api.initGames().then(
            ()=>notify.success("אותחלו משחקים"),
            (err)=>notify.error(err.toString(), "תקלה")
          )
        }}>Init Games</Button> */}
    </div>
  );
}


export default App;
