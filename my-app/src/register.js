
import React, { useState, useEffect } from 'react';
//import { DataGrid } from '@material-ui/data-grid';
import { Button, Checkbox, Table, TableHead, TableRow, TableBody, TableCell} from '@material-ui/core';
import { Spacer, Header } from './elem'


import * as api from './api'


// const columns = [

//   {
//     field: 'Day',
//     headerName: 'יום',
//     flex: 3,
//     editable: false,
//     align: "right",
//     disableColumnMenu: true

//   },
//   {
//     field: 'Time',
//     headerName: 'שעה',
//     flex: 3,
//     editable: false,
//     align: "right",
//     disableColumnMenu: true

//   },
//   {
//     field: 'Registered',
//     headerName: 'נרשמו?',
//     flex: 3,
//     editable: false,
//     align: "right",
//     disableColumnMenu: true

//   }
// ];


export default function Register(props) {

  const [plannedGames, setPlannedGames] = useState([
    { id: 1, day: 'ללא', time: '', numOfRegistered: 0, registered: false }
  ]);

  const [editRegistration, setEditRegistration]  = useState(undefined);

  useEffect(() => {
    api.getPlannedGames().then(games => setPlannedGames(games));
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
          <TableBody>
            {plannedGames.map((game) => (
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
                <TableCell align="right">{game.Time}</TableCell>
                <TableCell align="right">{game.NumOfRegistered}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      <Spacer height={20} />
      <Button variant="contained" disabled={!isDirty()}>שלח</Button>
    </div>
  );
}
