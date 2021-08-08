
import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Table, TableHead, TableRow, TableBody } from '@material-ui/core';
import { List, ListItem, ListItemText, TextField } from '@material-ui/core';

import { Spacer, Header, Loading, MyTableCell, Paper1, HBox, VBox, DraggableCard } from './elem'

import * as api from './api'


export default function Match(props) {

    const [games, setGames] = useState([]);
    const [matches, setMatches] = useState([]);
    const [editedMatches, setEditedMatches] = useState([]);

    const [currentGame, setCurrentGame] = useState(undefined);

    const [registrations, setRegistrations] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);

    useEffect(() => {
        api.getPlannedGamesRaw().then(games => setGames(games))
        api.getRegistrations().then(regs => setRegistrations(regs))
        api.getMatches().then(m => setMatches(m));
    }, []);

    useEffect(() => {

    }, [currentGame]);


    const effectiveMatches = () => editedMatches ? editedMatches : matches ? matches : [];
    const currentGameObj = () => currentGame ? games.find(g => g.id == currentGame) : {};

    let isDirty = () => {
        return false;
    }

    return (
        <div style={{ height: '65vh', width: '100%' }}>
            <Header>שיבוץ משחקים</Header>
            <HBox>
                <Paper1 width={'15%'}>
                    <List style={{ margin: 5, height: '30%' }}>
                        {games.map((game) => (
                            <ListItem key={game.id}
                                button
                                selected={currentGame === game.id}
                                onClick={() => setCurrentGame(game.id)}
                                onDoubleClick={() => { }}
                            >
                                <ListItemText primary={game.Day + " " + game.Hour} />
                            </ListItem>
                        ))}
                    </List>
                </Paper1>
                <Paper1 width={'80%'}>
                    <VBox>
                        <Table >
                            <TableHead>
                                <TableRow>
                                    <MyTableCell className="tableHeader">
                                        <Button disabled={!currentGame} onClick={() => {
                                            let game = currentGameObj();
                                            let newMatch = {
                                                GameID: currentGame,
                                                Day: game.Day,
                                                Hour: game.Hour,
                                                Location: "רמת השרון",
                                                Court: "?",
                                                Player1: '',
                                                Player2: '',
                                                Player3: '',
                                                Player4: '',
                                            }
                                            setEditedMatches([...effectiveMatches(), newMatch]);
                                        }}>+</Button>
                                    </MyTableCell>
                                    <MyTableCell >יום</MyTableCell>
                                    <MyTableCell >שעה</MyTableCell>
                                    <MyTableCell >מיקום</MyTableCell>
                                    <MyTableCell >מגרש</MyTableCell>
                                    <MyTableCell >זוג 1</MyTableCell>
                                    <MyTableCell >זוג 2</MyTableCell>
                                </TableRow>

                            </TableHead>
                            {currentGame ? <TableBody>
                                {effectiveMatches().filter(em => em.GameID == currentGame).map((match, i) => (
                                    <TableRow key={i}>
                                        <MyTableCell >
                                            <Checkbox size={"medium"} onChange={() => {

                                            }} />
                                        </MyTableCell>
                                        <MyTableCell>
                                            {match.Day}
                                        </MyTableCell>
                                        <MyTableCell >{match.Hour}</MyTableCell>
                                        <MyTableCell >{match.Location}</MyTableCell>
                                        <MyTableCell >{match.Court}</MyTableCell>
                                        <MyTableCell >
                                            {match.Player1 + "," + match.Player2}
                                        </MyTableCell>
                                        <MyTableCell >
                                            {match.Player3 + "," + match.Player4}
                                        </MyTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                                : null}
                        </Table>
                        <HBox style={{width:'100%', justifyContent: 'flex-end'}}>
                        {registrations.filter(r => r.GameID == currentGame).map(reg => 
                            <DraggableCard key={reg.email} text={reg.email}  bgColor="#00A2FF"/>
                        )}



                            {/* <Paper1 width={'30%'}>
                                
                                <List style={{ margin: 5 }}>
                                    {registrations.filter(r => r.GameID == currentGame).map((reg) => (
                                        <ListItem key={reg.email}
                                            button
                                            onDoubleClick={() => { 
                                                if ()
                                            }}
                                        >
                                            <ListItemText primary={reg.email} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper1>
                            <Spacer width='5%'/>
                            <Paper1 width={'30%'}>
                                <List style={{ margin: 5 }}>
                                    {registrations.filter(r => r.GameID == currentGame).map((reg) => (
                                        <ListItem key={reg.email}
                                            button
                                            onDoubleClick={() => { }}
                                        >
                                            <ListItemText primary={reg.email} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper1> */}
                        </HBox>
                    </VBox>
                </Paper1>
            </HBox>
            {games ? null : <Loading msg="טוען משחקים" />}
            <Spacer height={20} />
            <Button
                style={{ fontSize: 35 }}
                size={"large"}

                variant="contained"
                disabled={submitInProcess || !isDirty()} onClick={() => {
                    setSubmitInProcess(true);
                    //let newReg = plannedGames.map(game=>{return {id:game.id, Registered: getChecked(game)}});
                    // api.submitRegistration(newReg, props.UserInfo.email).then(
                    //   ()=>{
                    //     api.getPlannedGames(props.UserInfo.email).then(games => {
                    //       setPlannedGames(games);
                    //       setEditRegistration(undefined)
                    //       setSubmitInProcess(false);
                    //     });
                    //     props.notify.success("נשלח בהצלחה");
                    //   },
                    //   //error
                    //   (err) => {
                    //     props.notify.error(err, "שגיאה");
                    //     setSubmitInProcess(false);
                    //   }
                    // )
                }}>שמור</Button>

        </div>
    );
}
