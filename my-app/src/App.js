import './App.css';
import React, { useState, useEffect } from 'react';
import { withOrientationChange } from 'react-device-detect'

import { Alert, AlertTitle } from '@material-ui/lab';
import { Collapse, Button, Tabs, Tab, Paper, Popper, MenuItem, MenuList, Grow, ClickAwayListener } from '@material-ui/core';
import Register from './register';
import MyMatches from './myMatches'
import MyBill from './myBill';
import Match from './match'
import Users from './users'
import ChangePwd from './change-pwd';
import ForgotPwd from './forgot-pwd'

import { Toolbar, Text, Loading, HBox, Spacer, TabPanel } from './elem'

import { AttachMoney, PlaylistAdd, SportsTennis, Menu } from '@material-ui/icons';

import * as api from './api' 
import Login from './login'
import Admin from './admin';

import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

import firebase from 'firebase/app'
import 'firebase/auth';

import { config } from "./config";

firebase.initializeApp(config);

let App = props => {

  const [userInfo, setUserInfo] = useState(undefined);
  const [changePwd, setChangePwd] = useState(false);
  const [forgotPwd, setForgotPwd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({});
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [tab, setTab] = React.useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = React.useRef(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
    firebase.auth().onAuthStateChanged(function (user) {
      if (user)
        setUserInfo(api.getUserObj(user));
      else
        setUserInfo(undefined);
    });
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
  }, [])

  const notify = {
    success: (body, title) => {
      setMsg({ open: true, severity: "success", title, body });
      setTimeout(() => setMsg({}), 5000);
    },
    error: (body, title) => {
      setMsg({ open: true, severity: "error", title, body });
      setTimeout(() => setMsg({}), 5000);

    },
    ask: (body, title, buttons) => {
      setMsg({ open: true, severity: "info", title, body, buttons });
    },

  }
  const { isLandscape } = props;



  return (
    <div className="App" dir="rtl" >

      <Collapse in={msg.open} timeout={500} style={{ position: 'absolute', top: 0, width: '100%', fontSize: 15, zIndex: 1000 }} >
        <Alert severity={msg.severity}>
          {msg.title ? <AlertTitle>{msg.title}</AlertTitle> : null}
          <Text>{msg.body}</Text>

          {msg.buttons && msg.buttons.length > 0 ?
            <HBox>
              {msg.buttons.map(btn => ([
                <Spacer key={1} width={20} />,
                <Button key={2} variant="contained" onClick={() => {
                  setMsg({});
                  btn.callback();
                }}>{btn.caption}</Button>
              ])
              )}
            </HBox> : null}
        </Alert>
      </Collapse>
      {forgotPwd ? <ForgotPwd notify={notify} onCancel={() => setForgotPwd(false)} />
        :
        userInfo ? <Toolbar>
          <HBox style={{ backgroundColor: 'lightgrey', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 }}>
            <Menu ref={anchorRef} onClick={() => setMenuOpen(prev => !prev)} />
            <Popper open={menuOpen} anchorEl={anchorRef.current} role={undefined} transition disablePortal style={{ zIndex: 1000, backgroundColor: 'white' }}>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                >
                  <Paper >
                    <ClickAwayListener onClickAway={() => setMenuOpen(false)}>
                      <MenuList autoFocusItem={menuOpen} id="menu-list-grow" >
                        <MenuItem onClick={() => {
                          setChangePwd(true);
                          setMenuOpen(false);
                        }}>שנה סיסמא</MenuItem>
                        <MenuItem onClick={() => {
                          api.logout().then(() => setUserInfo(undefined));
                          setMenuOpen(false);
                        }}>התנתק</MenuItem>
                      </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>
            {/* <HBox style={{ alignItems: 'center' }}>
              <PowerSettingsNew onClick={() => api.logout().then(() => setUserInfo(undefined))} />
              <Button onClick={() => setChangePwd(true)}>שנה סיסמא</Button>
            </HBox> */}
            <Text fontSize={15}>{userInfo.displayName}</Text>
            {/* <Text>{window.innerWidth}</Text> */}
          </HBox>
        </Toolbar> : null}
      {forgotPwd ? null :
        changePwd ?
          <ChangePwd notify={notify} userInfo={userInfo} onCancel={() => setChangePwd(false)} onPwdChanged={() => {
            notify.success("סיסמא שונתה בהצלחה");
            setChangePwd(false);
          }} />
          :
          userInfo ?
            <Router>
              <Switch>
                <Route path="/admin">
                  <Tabs
                    value={tab}
                    onChange={(e, tab) => setTab(tab)}
                    indicatorColor="primary"
                    textColor="primary"
                    scrollButtons="auto"
                    centered
                    style={{ marginTop: 5 }}
                  >
                    <Tab label={"ניהול"} />
                    <Tab label={"שיבוץ"} />
                    <Tab label={"משתמשים"} />
                  </Tabs>
                  <TabPanel value={tab} index={0} >
                    <Admin notify={notify} isLandscape={isLandscape} windowSize={windowSize} />
                  </TabPanel>
                  <TabPanel value={tab} index={1} >
                    <Match notify={notify} isLandscape={isLandscape} windowSize={windowSize} />
                  </TabPanel>
                  <TabPanel value={tab} index={2} >
                    <Users notify={notify} isLandscape={isLandscape} />
                  </TabPanel>

                </Route>
                <Route path="/match-test">
                  <Match notify={notify} test={true} isLandscape={isLandscape} windowSize={windowSize} />
                </Route>
                <Route path="/match">
                  <Match notify={notify} isLandscape={isLandscape} windowSize={windowSize} />
                </Route>
                <Route path="/users">
                  <Users notify={notify} isLandscape={isLandscape} />
                </Route>
                <Route path="/">
                  <Tabs
                    value={tab}
                    onChange={(e, tab) => setTab(tab)}
                    indicatorColor="primary"
                    textColor="primary"
                    scrollButtons="auto"
                    variant="fullWidth"

                  >
                    <Tab label={"רישום"} icon={<PlaylistAdd />} />
                    <Tab label={"המשחקים שלי"} icon={<SportsTennis />} />
                    <Tab label={"חוב"} icon={<AttachMoney />} />
                  </Tabs>
                  <TabPanel value={tab} index={0} >
                    <Register notify={notify} UserInfo={userInfo} />
                  </TabPanel>
                  <TabPanel value={tab} index={1} >
                    {tab === 1 ? <MyMatches notify={notify} UserInfo={userInfo} /> : null}
                  </TabPanel>
                  <TabPanel value={tab} index={2} hidden={tab !== 2}>
                  {tab === 2 ? <MyBill notify={notify} UserInfo={userInfo} />: null}
                  </TabPanel>

                </Route>



              </Switch>
            </Router> :

            loading ? <Loading msg={"מאמת זהות"} /> : <Login
              onLogin={(userInfo) => setUserInfo(userInfo)}
              onError={(err) => notify.error(err.toString())}
              onForgotPwd={() => setForgotPwd(true)}
              notify={notify}
            />}
      {/* <Button onClick={()=>api.registerUser()}>test</Button> */}


      {/* <Button onClick={()=> {
          api.initGames().then(
            ()=>notify.success("אותחלו משחקים"),
            (err)=>notify.error(err.toString(), "תקלה")
          )
        }}>Init Games</Button> */}
    </div>
  );
}
App = withOrientationChange(App);

export default App;
