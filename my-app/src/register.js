
import  React, { useState, useEffect } from 'react';
import { DataGrid } from '@material-ui/data-grid';
import { Button } from '@material-ui/core';
import {Spacer, Header} from './elem'


import * as api from './api'


const columns = [
    
    {
      field: 'Day',
      headerName: 'יום',
      flex:3,
      editable: false,
      align:"right",
      disableColumnMenu: true

    },
    {
        field: 'Time',
        headerName: 'שעה',
        flex:3,
        editable: false,
        align:"right",
        disableColumnMenu: true

      },
    {
      field: 'Registered',
      headerName: 'נרשמו?',
      flex:3,
      editable: false,
      align:"right",
      disableColumnMenu: true

    }
  ];
  

export default function Register(props) {

    const [plannedGames, setPlannedGames] = useState([
        {id:1, day: 'ללא', time:'', numOfRegistered: 0 }
    ]);

    useEffect(() => {
      api.getPlannedGames().then(games => setPlannedGames(games));
    }, []);
  
    return (
        <div style={{ height: '65vh', width: '100%' }}>
          <Header>רישום לטניס</Header>
          <DataGrid
            rows={plannedGames}
            columns={columns}
            
            checkboxSelection
            
            
          />
          <Spacer height={20}/>
          <Button variant="contained">שלח</Button>
        </div>
      );
}
