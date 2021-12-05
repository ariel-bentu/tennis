import './App.css';
import React, { useState, useEffect, useCallback, } from 'react';
import {

  withStyles
} from "@material-ui/core/styles";

import { Alert, AlertTitle } from '@material-ui/lab';
import {
  Collapse, Button, Tabs, Tab, Paper, Popper, MenuItem, MenuList, Grow,
  ClickAwayListener, Snackbar, ListItemIcon, ListItemText, CircularProgress
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

import { Toolbar, Text, Loading, VBox, HBox, Spacer, TabPanel, SmallText2 } from './elem'

import {
  AttachMoney, PlaylistAdd, SportsTennis, Menu, CalendarToday, BarChart, Check,
  NotificationsActive, NotificationsOff
} from '@material-ui/icons';
import * as api from './api'
import Login from './login'
import Admin from './admin';

import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

import BallsAdmin from './balls-admin';
import dayjs from 'dayjs'


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
      FontFace: "bold",
      textDecoration: "underline"
    }
  },
})(Tab);

const ResponsiveTabs = withStyles({

})(Tabs);

function getDefaultTab() {
  const today = dayjs();
  return today.day() === 6 ? 0 : 1;
}

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

  const [pushNotification, setPushNotification] = useState(undefined);
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
      setMsg({ open: true, severity: "success", title, body, progress: false });
      setTimeout(() => setMsg({}), 5000);
    },
    notification: (id, body, title, actionUrlPath) => {
      setNotifications(orig => [...orig, { id, severity: "success", body: title, details: body, actionUrlPath }]);
    },
    error: (body, title) => {
      setMsg({ open: true, severity: "error", title, body, progress: false });
      setTimeout(() => setMsg({}), 5000);

    },
    ask: (body, title, buttons, details) => {
      setMsg({ open: true, severity: "info", title, body, buttons, details, progress: false });
    },
    clear: () => {
      setMsg({});
    },
    progress: () => setMsg({ progress: true }),

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
    if (notificationToken && notificationToken !== "" && userInfo && userInfo._userInfo &&
      (!userInfo._userInfo.notificationTokens || !userInfo._userInfo.notificationTokens.find(n => n.token === notificationToken))) {
      const isSafari = 'safari' in window;
      api.updateUserNotification(pushNotification, notificationToken, isSafari);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationToken, userInfo]);

  useEffect(() => {
    api.initAPI(
      // Callback for AuthStateChanged
      (user) => {
        api.getUserObj(user).then(
          uo => {
            setUserInfo(uo);
            if (uo) {
              setPushNotification(uo.pushNotification);

              if (uo.pushNotification === undefined) {
                setTimeout(() => {
                  notify.ask("מעוניין לקבל הודעות בדחיפה?", undefined, [
                    {
                      caption: "כן", callback: () => {
                        api.updateUserNotification(true).then(
                          () => {
                            notify.success("עודכן בהצלחה")
                            setPushNotification(true);
                          },
                          (err) => notify.error(err.message));

                      }
                    },
                    {
                      caption: "לא", callback: () => {
                        api.updateUserNotification(false).then(
                          () => {
                            setPushNotification(false);
                          });
                      },
                    },


                    { caption: "הזכר לי מאוחר יותר", callback: () => { } },
                  ],
                    "הודעות עבור תוצאות משחקים וכדו׳.\n בכל שלב בהמשך תוכל לשנות את בחירתך על ידי לחיצה על הפעמון"
                  )
                }, 3000);
              }
              api.isAdmin().then(setAdmin);
              api.getUserBalance(uo.email).then(bal => setUserBalance(bal));
            }
          },
          (err) => {
            setUserBlocked(true);
            setMsg({ open: true, severity: "error", title: "", body: err.message, top: 100 })
          }
        )
      },

      (msgPayload) => {
        console.log(JSON.stringify(msgPayload, undefined, " "))
        notify.notification(msgPayload.fcmMessageId, msgPayload.notification.body, msgPayload.notification.title, msgPayload.notification.click_action)
      },
      (notifToken) => setNotificationToken(notifToken));

    setTimeout(() => setLoading(false), 1000);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)

  }, [])

  const handlePushNotificationClick = useCallback(() => {
    notify.ask(`האם ל${pushNotification === true ? "בטל" : "אפשר"} הודעות בדחיפה?`, undefined, [
      {
        caption: "כן", callback: () => {
          api.updateUserNotification(!pushNotification).then(
            () => {
              notify.success("עודכן בהצלחה")
              setPushNotification(!pushNotification);
            },
            (err) => notify.error(err.message));

        }
      },
      { caption: "לא", callback: () => { } },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushNotification]);


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
      {// ---- Progress indicator ----
        msg.progress === true && <div style={{
          display: "flex", position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "white", opacity: 0.6, zIndex: 1000,
          alignItems: "center", justifyContent: "center"
        }}><CircularProgress /></div>
      }
      {// ---- Alert (notify) -----
      }
      <Collapse in={msg.open} timeout={500} style={{ position: 'Fixed', top: msg.top || 0, left: 0, right: 0, fontSize: 15, zIndex: 1000 }} >
        <Alert severity={msg.severity}>
          {msg.title ? <AlertTitle>{msg.title}</AlertTitle> : null}
          <Text>{msg.body}</Text>
          {msg.details ? msg.details.split("\n").map(d => <SmallText2 fontSize={15}>{d}</SmallText2>) : null}
          {msg.details ? <Spacer height={10} /> : null}
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

      {// ---- Login -----
        !loading && !userInfo && !userBlocked && !forgotPwd && !changePwd && <Login
          onLogin={(userInfo) => {

          }}
          onError={(err) => notify.error(err.toString())}
          onForgotPwd={() => setForgotPwd(true)}
          notify={notify}
        />
      }

      {// ---- Forgot pwd -----
        forgotPwd && <ForgotPwd notify={notify} onCancel={() => setForgotPwd(false)} />
      }

      {// ---- Forgot pwd -----
        changePwd && <ChangePwd notify={notify} userInfo={userInfo} onCancel={() => setChangePwd(false)} onPwdChanged={() => {
          notify.success("סיסמא שונתה בהצלחה");
          setChangePwd(false);
        }}
        />
      }


      {(userBlocked || userInfo) && !forgotPwd && !changePwd &&
        <Toolbar>
          <HBox style={{ backgroundColor: 'lightgrey', alignItems: 'center', justifyContent: 'flex-start', paddingRight: 10 }}>
            <Menu ref={anchorRef} onClick={() => setMenuOpen(prev => !prev)} />
            <Spacer width={15} />
            {pushNotification === true ?
              <NotificationsActive onClick={handlePushNotificationClick} /> :
              <NotificationsOff onClick={handlePushNotificationClick} />
            }
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
                        <MenuItem onClick={() => setMenuOpen(false)}>
                          <ListItemText>קבל הודעות push</ListItemText>
                          <Spacer width={20} />
                          <ListItemIcon>
                            <Check fontSize="small" />
                          </ListItemIcon>
                        </MenuItem>

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

            {userInfo ? <Text fontSize={15}>{userInfo.displayName}</Text> : null}

            <Spacer width={40} />
            {admin ? <Button style={{ height: "1.5rem" }} variant={"contained"}
              onClick={() => {
                isAdminPath ? setForceMode(0) : setForceMode(1)
              }}>{!isAdminPath ? "ניהול" : "משתמשים"}</Button> : null}

          </HBox>
          <div style={{ position: "absolute", left: 30, top: 0, width: 10, height: 10 }}>
            <img src="penn_logo.png" style={{ width: 38 }} alt="" />
          </div>
        </Toolbar>
      }

      {userInfo && !forgotPwd && !changePwd && <Router>
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
              let tab = props.location.hash ? parseInt(props.location.hash.substr(1)) :
                getDefaultTab();
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
                  <Register notify={notify} UserInfo={userInfo} Balance={userBalance} />
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
      </Router>}

      {loading && <Loading msg={"מאמת זהות"} />}

      <Snackbar open={notifications.length > 0 || true} onClose={() => { }}>
        <div style={{ width: '90%' }} >
          {notifications.filter((n => n.closed !== true)).map((notif) => (
            <Alert key={notif.id} onClose={() => hideNotification(notif.id)} severity={notif.severity} style={{ width: '100%' }} >
              {notif.title ? <AlertTitle>{notif.title}</AlertTitle> : null}
              <VBox>
                {notif.body ? <SmallText2>{notif.body}</SmallText2> : null}
                {notif.details ? notif.details.split("\n").map(d => <SmallText2>{d}</SmallText2>) : null}
                {/* {notif.actionUrlPath && notif.actionUrlPath.length > 0 ?<Button onClick={()=>{
                  props.history.push(notif.actionUrlPath)
                }}>צפה</Button>:null} */}
              </VBox>
            </Alert>
          ))}
        </div>
      </Snackbar>
    </div >
  );
}
// App = withOrientationChange(App);

export default App;

