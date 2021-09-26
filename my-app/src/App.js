import './App.css';
import React, { useState, useEffect } from 'react';
import { withOrientationChange } from 'react-device-detect'

import { Alert, AlertTitle } from '@material-ui/lab';
import { Collapse, Button, Tabs, Tab, Paper, Popper, MenuItem, MenuList, Grow, ClickAwayListener } from '@material-ui/core';
import Register from './register';
import MyMatches from './myMatches'
import MyBill from './myBill';
import Matches from './matches';
import Match from './match'
import Users from './users'
import Billing from './billing';
import ChangePwd from './change-pwd';
import ForgotPwd from './forgot-pwd'
import Board from './board';

import { Toolbar, Text, Loading, HBox, Spacer, TabPanel } from './elem'

import { AttachMoney, PlaylistAdd, SportsTennis, Menu, CalendarToday, BarChart } from '@material-ui/icons';

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

//import { config } from "./config";

//firebase.initializeApp(config);
api.initAPI();

let App = props => {
  const [admin, setAdmin] = useState(false);

  const [userInfo, setUserInfo] = useState(undefined);
  const [userBlocked, setUserBlocked] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [forgotPwd, setForgotPwd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({});
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [menuOpen, setMenuOpen] = useState(false);
  const [allGamesReload, setAllGamesReload] = useState(1);

  const anchorRef = React.useRef(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
    firebase.auth().onAuthStateChanged(function (user) {
      api.getUserObj(user).then(
        uo => {
          setUserInfo(uo);
          api.isAdmin().then(setAdmin);
        },
        (err) => {
          setUserBlocked(true);
          setMsg({ open: true, severity: "error", title: "", body: err.message, top: 100 })
        }
      )
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
    clear: () => {
      setMsg({});
    }

  }
  const { isLandscape } = props;



  return (
    <div className="App" dir="rtl" >

      <Collapse in={msg.open} timeout={500} style={{ position: 'Fixed', top: msg.top || 0, left: 0, right: 0, fontSize: 15, zIndex: 1000 }} >
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
        userBlocked || userInfo ? <Toolbar>
          <HBox style={{ backgroundColor: 'lightgrey', alignItems: 'center', justifyContent: 'flex-start', paddingRight: 10 }}>
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
                          setUserBlocked(false);
                          setMsg({});
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
            {userInfo ? <Text fontSize={15}>{userInfo.displayName}</Text> : null}
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
                <Route
                  path="/admin"
                  children={(props) => {
                    let adminTab = props.location.hash ? parseInt(props.location.hash.substr(1)) : 1;
                    return [<Tabs key={"100"}
                      value={adminTab}
                      onChange={(e, tab) => props.history.push("/admin#" + tab)}
                      indicatorColor="primary"
                      textColor="primary"
                      scrollButtons="auto"
                      centered
                      style={{ marginTop: 5 }}
                    >
                      <Tab label={"ניהול"} />
                      <Tab label={"שיבוץ"} />
                      <Tab label={"משתמשים"} />
                      <Tab label={"חובות"} />
                    </Tabs>,
                    <TabPanel key={"0"} value={adminTab} index={0} >
                      {adminTab === 0 ? <Admin notify={notify} isLandscape={isLandscape} windowSize={windowSize} /> : null}
                    </TabPanel>,
                    <TabPanel key={"1"} value={adminTab} index={1} >
                      <Match notify={notify} isLandscape={isLandscape} windowSize={windowSize} />
                    </TabPanel>,
                    <TabPanel key={"2"} value={adminTab} index={2} >
                      {adminTab === 2 ? <Users notify={notify} isLandscape={isLandscape} windowSize={windowSize} /> : null}
                    </TabPanel>,
                    <TabPanel key={"3"} value={adminTab} index={3} >
                      {adminTab === 3 ? <Billing notify={notify} isLandscape={isLandscape} windowSize={windowSize} /> : null}
                    </TabPanel>
                    ]
                  }}
                />
                <Route path="/match-test">
                  <Match notify={notify} test={true} isLandscape={isLandscape} windowSize={windowSize} />
                </Route>
                <Route path="/match">
                  <Match notify={notify} isLandscape={isLandscape} windowSize={windowSize} />
                </Route>
                <Route path="/users">
                  <Users notify={notify} isLandscape={isLandscape} windowSize={windowSize} />
                </Route>
                <Route path="/"
                  children={(props) => {
                    let tab = props.location.hash ? parseInt(props.location.hash.substr(1)) : 0;
                    return [
                      <Tabs
                        key="100"
                        value={tab}
                        onChange={(e, tab) => props.history.push("/#" + tab)}
                        indicatorColor="primary"
                        textColor="primary"
                        scrollButtons="auto"
                        variant="fullWidth"

                      >
                        <Tab label={"רישום"} icon={<PlaylistAdd />} />
                        <Tab label={"מתוכנן"} icon={<CalendarToday />} />
                        <Tab label={"משחקים"} icon={<SportsTennis />} />
                        <Tab label={"לוח"} icon={<BarChart />} />
                        <Tab label={"חוב"} icon={<AttachMoney />} />
                      </Tabs>,
                      <TabPanel key="0" value={tab} index={0} >
                        <Register notify={notify} UserInfo={userInfo} />
                      </TabPanel>,
                      <TabPanel key="1" value={tab} index={1} >
                        {tab === 1 ? <MyMatches notify={notify} UserInfo={userInfo} admin={admin} reloadMatches={()=>{
                          setAllGamesReload(i=>i+1);
                        }}/> : null}
                      </TabPanel>,
                      <TabPanel key="2" value={tab} index={2} >
                      {tab === 2 ? <Matches notify={notify} UserInfo={userInfo} admin={admin} reload={allGamesReload}/> : null}
                    </TabPanel>,
                     <TabPanel key="3" value={tab} index={3} >
                     {tab === 3 ? <Board notify={notify} UserInfo={userInfo} /> : null}
                   </TabPanel>,
                      <TabPanel key="4" value={tab} index={4}>
                        {tab === 4 ? <MyBill notify={notify} UserInfo={userInfo} /> : null}
                      </TabPanel>
                    ]
                  }}
                />
              </Switch>
            </Router> :

            loading ? <Loading msg={"מאמת זהות"} /> :
              userBlocked ?
                null
                :
                <Login
                  onLogin={(userInfo) => {
                    //setUserInfo(userInfo)
                    //todo
                  }}
                  onError={(err) => notify.error(err.toString())}
                  onForgotPwd={() => setForgotPwd(true)}
                  notify={notify}
                />}
      {/* <Button variant="contained" onClick={()=>api.test1().then(
        (ret)=>{
          notify.success(JSON.stringify(ret))
        },
        (err)=>{
          notify.error(err.message)
      })}>test sms</Button> */}


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
