
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, TableHead, TableRow, TableBody } from '@material-ui/core';

import { Spacer, Loading, MyTableCell, IOSSwitch } from './elem'

import * as api from './api'
import dayjs from 'dayjs'


export default function Register(props) {

  const [plannedGames, setPlannedGames] = useState(undefined);

  const [editRegistration, setEditRegistration] = useState(undefined);
  const [submitInProcess, setSubmitInProcess] = useState(false);
  const [flip, setFlip] = useState(false);
  const [timer, setTimer] = useState(undefined);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const [lastReloaded, setLastReloaded] = useState(dayjs());
  const [reload, setReload] = useState(1);

  useEffect(() => {
    window.addEventListener('focus', () => {
      setLastReloaded(lr => {
        if (lr.diff(dayjs(), 'minute') < -10) {
          setReload(old=>old+1);
          return dayjs();
        }
        return lr;
      });
    })
  }, []);

  useEffect(() => {
    if (props.UserInfo)
      api.getPlannedGames(props.UserInfo.email).then(games => games ? setPlannedGames(games) : {})
    api.getRegistrationOpen().then(val => setRegistrationOpen(val));


  }, [props.UserInfo, reload]);

  const isDirty = useCallback(() => {
    //console.log(JSON.stringify(editRegistration))
    // eslint-disable-next-line
    return editRegistration && plannedGames.some(g => !g.Registered != !editRegistration[g.id]);
  }, [editRegistration, plannedGames]);

  useEffect(() => {
    if (!submitInProcess && isDirty()) {
      console.log("set blicking")
      if (!timer) {
        let timerId = setInterval(() => setFlip(oldFlip => !oldFlip), 700)
        setTimer(timerId)
      }
    } else {
      if (timer) {
        clearTimeout(timer);
        setTimer(undefined)
      }
    }

  }, [submitInProcess, editRegistration, timer, isDirty]);


  let getChecked = (game) => {
    if (!editRegistration)
      return game.Registered === true;

    let edited = editRegistration[game.id];
    if (edited !== undefined)
      return edited;

    return game.Registered === true;
  }



  let nowDirty = isDirty();
  return (
    <div style={{ height: '65vh', width: '100%' }}>
      <Spacer height={20} />
      <Table >
        <TableHead>
          <TableRow>
            <MyTableCell width={'20%'} className="tableHeader">רישום</MyTableCell>
            <MyTableCell width={'30%'}>יום</MyTableCell>
            <MyTableCell width={'25%'}>שעה</MyTableCell>
            <MyTableCell width={'25%'}>נרשמו?</MyTableCell>
          </TableRow>

        </TableHead>
        {plannedGames ? <TableBody>
          {plannedGames.map((game) => (
            <TableRow key={game.id} style={{ height: '3rem' }}>
              <MyTableCell >
                <IOSSwitch checked={getChecked(game)} onChange={() => {
                  if (registrationOpen) {
                    let edit = { ...editRegistration }
                    edit[game.id] = !getChecked(game);
                    setEditRegistration(edit);
                  }
                }} />
              </MyTableCell>
              <MyTableCell component="th" scope="row" >
                {game.Day}
              </MyTableCell>
              <MyTableCell >{game.Hour}</MyTableCell>
              <MyTableCell >{(game.NumOfRegistered || 0) + (getChecked(game) ? 1 : 0)}</MyTableCell>
            </TableRow>
          ))}
        </TableBody>
          : null}
      </Table>
      {plannedGames ? null : <Loading msg="טוען משחקים" />}
      <Spacer height={20} />
      <Button
        style={{
          fontSize: 35,
          backgroundColor: (!submitInProcess && nowDirty) ? (flip ? '#6CC4D1' : '#1892B8') : '#C4C4C4'
        }}
        size={"large"}
        fullWidth={true}
        variant="contained"
        disabled={submitInProcess || !nowDirty || !registrationOpen} onClick={() => {
          setSubmitInProcess(true);
          let newReg = plannedGames.map(game => { return { id: game.id, Registered: getChecked(game) } });
          api.submitRegistration(newReg, props.UserInfo.email).then(
            () => {
              api.getPlannedGames(props.UserInfo.email).then(games => {
                setPlannedGames(games);
                setEditRegistration(undefined)
                setSubmitInProcess(false);
              });
              props.notify.success("נשלח בהצלחה");
            },
            //error
            (err) => {
              props.notify.error(err.toString(), "שגיאה");
              setSubmitInProcess(false);
            }
          )
        }}>{registrationOpen ? (nowDirty ? "שלח" : "ללא שינוי") : "הרשמה סגורה"}</Button>

    </div>
  );
}
