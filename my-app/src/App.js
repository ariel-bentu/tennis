import './App.css';
import React, { useState, useEffect } from 'react';
import {

  withStyles
} from "@material-ui/core/styles";

import { Alert, AlertTitle } from '@material-ui/lab';
import {
  Collapse, Button, Tabs, Tab, Paper, Popper, MenuItem, MenuList, Grow,
  ClickAwayListener, Snackbar
} from '@material-ui/core';
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
import { Notifications } from './notifications';

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
import BallsAdmin from './balls-admin';

//import { config } from "./config";

//firebase.initializeApp(config);

const ResponsiveTab = withStyles({
  root: {
    minWidth: 65,
    width: 65
  }, 
  selected: {
    
  },
  textColorPrimary: {
    color: "#737373",
    '&$selected': {
      color: "#3D95EE",
      FontFace:"bold",
      textDecoration: "underline"
    }
  },
})(Tab);

const ResponsiveTabs = withStyles({
  
})(Tabs);

let App = props => {
  const [admin, setAdmin] = useState(false);
  const [userBalance, setUserBalance] = useState(undefined);


  const [userInfo, setUserInfo] = useState(undefined);
  const [userBlocked, setUserBlocked] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [forgotPwd, setForgotPwd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({});
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [menuOpen, setMenuOpen] = useState(false);
  const [allGamesReload, setAllGamesReload] = useState(1);
  const [notificationToken, setNotificationToken] = useState(undefined);
  const [notifications, setNotifications] = useState([]);
  // eslint-disable-next-line no-unused-vars
  // const [notificationOpen, setNotificationOpen] = useState(false);
  const [forceMode, setForceMode] = useState(undefined);

  const anchorRef = React.useRef(null);
  //const notificationRef = React.useRef(null);
  const notify = {
    success: (body, title) => {
      setMsg({ open: true, severity: "success", title, body });
      setTimeout(() => setMsg({}), 5000);
    },
    notification: (id, body, title) => {
      setNotifications(orig => [...orig, { id, severity: "success", title, body }]);
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

  const hideNotification = (id) => {
    setNotifications(orig => {
      const newNotifications = orig.map(n => n.id === id ? { ...n, closed: true } : n)
      console.log("Notification closed", JSON.stringify(newNotifications, undefined, " "));
      return newNotifications;
    });
  };

  useEffect(() => {
    //Update server with notification info if needed
    if (notificationToken && notificationToken !== "" && userInfo && userInfo._user &&
      (!userInfo._user.notificationTokens || !userInfo._user.notificationTokens.find(n => n.token === notificationToken))) {
      const isSafari = 'safari' in window;
      api.updateUserNotificationToken(userInfo.email, notificationToken, isSafari);
    }
  }, [notificationToken, userInfo]);

  useEffect(() => {
    api.initAPI(
      (msgPayload) => {
        console.log(JSON.stringify(msgPayload, undefined, " "))
        notify.notification(msgPayload.fcmMessageId, msgPayload.notification.body, msgPayload.notification.title)
      },
      (notifToken) => setNotificationToken(notifToken));

    setTimeout(() => setLoading(false), 1000);
    firebase.auth().onAuthStateChanged(function (user) {
      api.getUserObj(user).then(
        uo => {
          setUserInfo(uo);
          api.isAdmin().then(setAdmin);
          api.getUserBalance(uo.email).then(bal=>setUserBalance(bal));
        },
        (err) => {
          setUserBlocked(true);
          setMsg({ open: true, severity: "error", title: "", body: err.message, top: 100 })
        }
      )
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)

  }, [])



  // const handleNotifClick = () => {
  //   if ('safari' in window && 'pushNotification' in window.safari) {
  //     let permissionData = window.safari.pushNotification.permission('web.com.atpenn');
  //     let token = api.checkSafariRemotePermission(permissionData);
  //     if (token) {
  //       setNotificationToken(token);
  //     }
  //   };
  // };

  const isAdminPath = window.location && window.location.pathname && window.location.pathname.endsWith("admin");
  //console.log("adminPath" + (isAdminPath ? " y" : " n"))
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
            <Spacer width={10} />
            {/* <Badge badgeContent={notifications.length} color="primary">
              {notificationToken ?
                <NotificationsActive ref={notificationRef} /> :
                <NotificationsNone ref={notificationRef} onClick={handleNotifClick} />}
            </Badge> */}
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
            <Spacer width={10} />
            {/* <HBox style={{ alignItems: 'center' }}>
              <PowerSettingsNew onClick={() => api.logout().then(() => setUserInfo(undefined))} />
              <Button onClick={() => setChangePwd(true)}>שנה סיסמא</Button>
            </HBox> */}
            {userInfo ? <Text fontSize={15}>{userInfo.displayName}</Text> : null}
            {/* <Text>{window.innerWidth}</Text> */}
            <Spacer width={100} />
            {admin ? <Button style={{ height: "1.5rem" }} variant={"contained"}
              onClick={() => {
                isAdminPath ? setForceMode(0) : setForceMode(1)
                //console.log("clicl " + (isAdminPath?"0":"1"))
              }}>{!isAdminPath ? "ניהול" : "משתמשים"}</Button> : null}

          </HBox>
          <div style={{ position: "absolute", left: 30, top: 0, width: 10, height: 10 }}>
            <img src="penn_logo.png" style={{ width: 38 }} alt="" />
          </div>
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
                <Route path="/notifications">
                  <Notifications notify={notify} windowSize={windowSize} />
                </Route>
                <Route
                  path="/admin"
                  children={(props) => {
                    if (forceMode !== undefined && forceMode === 0) {
                      //console.log("goto /")
                      setForceMode(undefined);
                      props.history.push("/")
                    }
                    let adminTab = props.location.hash ? parseInt(props.location.hash.substr(1)) : 1;
                    return [<ResponsiveTabs key={"100"}
                      value={adminTab}
                      onChange={(e, tab) => props.history.push("/admin#" + tab)}
                      indicatorColor="primary"
                      textColor="primary"
                      scrollButtons="auto"
                      centered
                      style={{ marginTop: 5 }}
                      TabIndicatorProps={{
                        style: {
                          display: "none"
                        }
                      }}
                    >
                      <ResponsiveTab label={"ניהול"} />
                      <ResponsiveTab label={"שיבוץ"} />
                      <ResponsiveTab label={"משתמשים"} />
                      <ResponsiveTab label={"חובות"} />
                      <ResponsiveTab label={"כדורים"} />
                    </ResponsiveTabs>,
                    <TabPanel key={"0"} value={adminTab} index={0} >
                      {adminTab === 0 ? <Admin notify={notify} windowSize={windowSize} /> : null}
                    </TabPanel>,
                    <TabPanel key={"1"} value={adminTab} index={1} >
                      <Match notify={notify} windowSize={windowSize} />
                    </TabPanel>,
                    <TabPanel key={"2"} value={adminTab} index={2} >
                      {adminTab === 2 ? <Users notify={notify} windowSize={windowSize} /> : null}
                    </TabPanel>,
                    <TabPanel key={"3"} value={adminTab} index={3} >
                      {adminTab === 3 ? <Billing notify={notify} windowSize={windowSize} /> : null}
                    </TabPanel>,
                    <TabPanel key={"4"} value={adminTab} index={4} >
                      {adminTab === 4 ? <BallsAdmin notify={notify} windowSize={windowSize} /> : null}
                    </TabPanel>
                    ]
                  }}
                />
                <Route path="/match-test">
                  <Match notify={notify} test={true} windowSize={windowSize} />
                </Route>
                <Route path="/match">
                  <Match notify={notify} windowSize={windowSize} />
                </Route>
                <Route path="/users">
                  <Users notify={notify} windowSize={windowSize} />
                </Route>
                <Route path="/"
                  children={(props) => {
                    if (forceMode !== undefined && forceMode === 1) {
                      //console.log("goto /admin")
                      setForceMode(undefined);
                      props.history.push("/admin")
                    }
                    let tab = props.location.hash ? parseInt(props.location.hash.substr(1)) : 0;
                    return [
                      // <div key="1" style={{position:"absolute", width:"100%", height:30}}>
                      //   <img src="penn_banner.jpg"  alt="" style={{opacity:.3, zIndex:-1}}/>
                      // </div>,
                      <ResponsiveTabs
                        key="100"
                        value={tab}
                        onChange={(e, tab) => props.history.push("/#" + tab)}
                        indicatorColor="primary"
                        textColor="primary"
                        scrollButtons="auto"
                        variant="scrollable"
                        TabIndicatorProps={{
                          style: {
                            display: "none"
                          }
                        }}
                      >
                        <ResponsiveTab label={"רישום"} icon={<PlaylistAdd />} />
                        <ResponsiveTab label={"מתוכנן"} icon={<CalendarToday />} />
                        <ResponsiveTab label={"משחקים"} icon={<SportsTennis />} />
                        <ResponsiveTab label={"לוח"} icon={<BarChart />} />
                        <ResponsiveTab label={"חוב"} icon={<AttachMoney />} />


                      </ResponsiveTabs>,
                      <TabPanel key="0" value={tab} index={0} >
                        <Register notify={notify} UserInfo={userInfo} Balance={userBalance}/>
                      </TabPanel>,
                      <TabPanel key="1" value={tab} index={1} >
                        {tab === 1 ? <MyMatches notify={notify} UserInfo={userInfo} admin={admin} reloadMatches={() => {
                          setAllGamesReload(i => i + 1);
                        }} /> : null}
                      </TabPanel>,
                      <TabPanel key="2" value={tab} index={2} >
                        {tab === 2 ? <Matches notify={notify} UserInfo={userInfo} admin={admin} reload={allGamesReload} /> : null}
                      </TabPanel>,
                      <TabPanel key="3" value={tab} index={3} >
                        {tab === 3 ? <Board notify={notify} UserInfo={userInfo} /> : null}
                      </TabPanel>,
                      <TabPanel key="4" value={tab} index={4}>
                        {tab === 4 ? <MyBill notify={notify} UserInfo={userInfo} Balance={userBalance} /> : null}
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

      <Snackbar open={notifications.length > 0 || true} onClose={() => { }}>
        <div style={{ width: '90%' }} >
          {notifications.filter((n => n.closed !== true)).map((notif) => (
            <Alert key={notif.id} onClose={() => hideNotification(notif.id)} severity={notif.severity} style={{ width: '100%' }} >
              {notif.title ? <AlertTitle>{notif.title}</AlertTitle> : null}
              {notif.body}
            </Alert>
          ))}
        </div>
      </Snackbar>
    </div>
  );
}
// App = withOrientationChange(App);

export default App;

