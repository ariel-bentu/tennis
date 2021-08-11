import './App.css';
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Collapse } from '@material-ui/core';
import Register from './register';
import Match from './match'
import { Toolbar, Text, Loading } from './elem'
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
  const [blocked, setBlocked] = useState(false);
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
      {userInfo ? <Toolbar><Text>{userInfo.email}</Text></Toolbar> : null}
      {userInfo ?
        <Router>
          <Switch>
            <Route path="/match">
              <Match notify={notify}/>
            </Route>
            <Route path="/">
              <Register notify={notify} UserInfo={userInfo} />
            </Route>
          </Switch>
        </Router> :
        blocked ? null :
          loading ? <Loading msg={"מאמת זהות"} /> : <Login onLogin={(userInfo) => setUserInfo(userInfo)} onError={(err) => {
            setBlocked(true);
            setMsg({ open: true, severity: "error", title: "שגיאה", body: err.toString() })
          }} />}
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
