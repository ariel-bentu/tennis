
import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Table, TableHead, TableRow, TableBody} from '@material-ui/core';

import { Spacer, Header,Loading, MyTableCell } from './elem'

import * as api from './api'


export default function Register(props) {

  const [plannedGames, setPlannedGames] = useState(undefined);

  const [editRegistration, setEditRegistration]  = useState(undefined);
  const [submitInProcess, setSubmitInProcess] = useState(false);

  useEffect(() => {
    if (props.UserInfo)
      api.getPlannedGames(props.UserInfo.email).then(games => games?setPlannedGames(games):{})
  }, [props.UserInfo]);

  let getChecked = (game) => {
    if (!editRegistration)
      return game.Registered === true;

    let edited = editRegistration[game.id];
    if (edited !== undefined) 
      return edited;

    return game.Registered === true;
  }

  let isDirty = () => {
    return editRegistration;
  }

  return (
    <div style={{ height: '65vh', width: '100%' }}>
      <Header>רישום לטניס</Header>
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
            { plannedGames.map((game) => (
              <TableRow key={game.id}>
                <MyTableCell >
                  <Checkbox size={"medium"} checked={getChecked(game)} onChange={()=>{
                    let edit = {...editRegistration}
                    edit[game.id] = !getChecked(game);
                    setEditRegistration(edit);
                  }}/>
                </MyTableCell>
                <MyTableCell component="th" scope="row" >
                  {game.Day}
                </MyTableCell>
                <MyTableCell >{game.Hour}</MyTableCell>
                <MyTableCell >{game.NumOfRegistered}</MyTableCell>
              </TableRow>
            ))}
          </TableBody>
          : null}
        </Table>
        {plannedGames?null:<Loading msg="טוען משחקים"/>}
      <Spacer height={20} />
      <Button 
        style={{fontSize:35}}
        size={"large"}
        fullWidth={true}
        variant="contained" 
        disabled={submitInProcess || !isDirty()} onClick={()=>{
        setSubmitInProcess(true);
        let newReg = plannedGames.map(game=>{return {id:game.id, Registered: getChecked(game)}});
        api.submitRegistration(newReg, props.UserInfo.email).then(
          ()=>{
            api.getPlannedGames(props.UserInfo.email).then(games => {
              setPlannedGames(games);
              setEditRegistration(undefined)
              setSubmitInProcess(false);
            });
            props.notify.success("נשלח בהצלחה");
          },
          //error
          (err) => {
            props.notify.error(err, "שגיאה");
            setSubmitInProcess(false);
          }
        )
      }}>שלח</Button>
      
    </div>
  );
}
