
import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Table, TableHead, TableRow, TableBody, TableCell} from '@material-ui/core';

import { Spacer, Header,Loading } from './elem'

import * as api from './api'


export default function Register(props) {

  const [plannedGames, setPlannedGames] = useState(undefined);

  const [editRegistration, setEditRegistration]  = useState(undefined);
  const [submitInProcess, setSubmitInProcess] = useState(false);

  useEffect(() => {
    api.getPlannedGames().then(games => games?setPlannedGames(games):{})
  }, []);

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
              <TableCell align="right">רישום</TableCell>
              <TableCell align="right">יום</TableCell>
              <TableCell align="right">שעה</TableCell>
              <TableCell align="right">נרשמו?</TableCell>
            </TableRow>
            
          </TableHead>
          {plannedGames ? <TableBody>
            { plannedGames.map((game) => (
              <TableRow key={game.id}>
                <TableCell align="right">
                  <Checkbox checked={getChecked(game)} onChange={()=>{
                    let edit = {...editRegistration}
                    edit[game.id] = !getChecked(game);
                    setEditRegistration(edit);
                  }}/>
                </TableCell>
                <TableCell component="th" scope="row" align="right">
                  {game.Day}
                </TableCell>
                <TableCell align="right">{game.Hour}</TableCell>
                <TableCell align="right">{game.NumOfRegistered}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          : null}
        </Table>
        {plannedGames?null:<Loading msg="טוען משחקים"/>}
      <Spacer height={20} />
      <Button variant="contained" disabled={submitInProcess || !isDirty()} onClick={()=>{
        setSubmitInProcess(true);
        let newReg = plannedGames.map(game=>{return {id:game.id, Registered: getChecked(game)}});
        api.submitRegistration(newReg).then(
          ()=>{
            api.getPlannedGames().then(games => {
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
