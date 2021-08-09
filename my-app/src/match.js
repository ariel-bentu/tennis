
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, TableHead, TableRow, TableBody } from '@material-ui/core';
import { List, ListItem, ListItemText } from '@material-ui/core';

import { Spacer, Header, Loading, SmallTableCell, Paper1, HBox, VBox } from './elem'
import { Dustbin } from './drop-box';
import { Box } from './drag-box'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { v4 as uuidv4 } from 'uuid';

import * as api from './api'

const isNotInMatches = (matches, email) => matches.every(m => isNotInMatch(m, email));

const isNotInMatch = (match, email) => {
    return (!match.Player1 || match.Player1.email !== email) &&
        (!match.Player2 || match.Player2.email !== email) &&
        (!match.Player3 || match.Player3.email !== email) &&
        (!match.Player4 || match.Player4.email !== email);
}

const updatePlayer = (match, args) => {
    let fragment = {}
    if (args[1]) {
        if (!match.Player1 || match.Player1.length === 0) {
            fragment.Player1 = args[0];
        } else {
            fragment.Player2 = args[0];
        }
    } else {
        if (!match.Player3 || match.Player3.length === 0) {
            fragment.Player3 = args[0];
        } else {
            fragment.Player4 = args[0];
        }
    }
    return fragment
}


export default function Match(props) {

    const [games, setGames] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [editedMatches, setEditedMatches] = useState(undefined);
    const [users, setUsers] = useState([]);
    const [unregUsers, setUnregUsers] = useState([]);

    const [currentGame, setCurrentGame] = useState(undefined);

    const [registrations, setRegistrations] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);

    useEffect(() => {
        api.getCollection(api.Collections.PLANNED_GAMES_COLLECTION).then(games => setGames(games))
        Promise.all([
            api.getCollection(api.Collections.REGISTRATION_COLLECTION).then(regs => {
                setRegistrations(regs)
                return regs;
            }),
            api.getCollection(api.Collections.USERS_COLLECTION).then(us => {
                setUsers(us)
                return us;
            })
        ]).then(all => {
            setRegistrations(all[0].map(reg => {
                let user = all[1].find(u => u.email === reg.email);
                return user ? { ...reg, ...user } : reg;
            }))
        });
        api.getCollection(api.Collections.MATCHES_COLLECTION).then(m => setEditedMatches(m));
    }, []);

    useEffect(() => setUnregUsers(
        users.filter(u => registrations.filter(r => r.GameID == currentGame).every(r => r.email !== u.email))
    ), [currentGame]);

    let updateMatch = (id, func, ...args) => {
        setDirty(true);
        setEditedMatches(oldEditedMatches => oldEditedMatches.map(item =>
            item.id === id
                ? { ...item, ...(func(item, args)) }
                : item));
    }



    const currentGameObj = useCallback(() => currentGame ? games.find(g => g.id == currentGame) : {},
        [currentGame, games]);


    let currentMatches = editedMatches ? editedMatches.filter(em => em.GameID == currentGame) : [];
    let currentRegistrations = registrations ? registrations.filter(em => em.GameID == currentGame) : [];

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
                <DndProvider backend={HTML5Backend}>
                    <Paper1 width={'80%'}>
                        <VBox>
                            <Table >
                                <TableHead>
                                    <TableRow>

                                        <SmallTableCell >יום</SmallTableCell>
                                        <SmallTableCell >שעה</SmallTableCell>
                                        <SmallTableCell >מיקום</SmallTableCell>
                                        <SmallTableCell >מגרש</SmallTableCell>
                                        <SmallTableCell >זוג 1</SmallTableCell>
                                        <SmallTableCell >זוג 2</SmallTableCell>
                                        <SmallTableCell >
                                            <Button disabled={!currentGame} onClick={() => {
                                                let game = currentGameObj();
                                                let newMatch = {
                                                    id: uuidv4(),
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
                                                setEditedMatches([...editedMatches, newMatch]);
                                            }} style={{ fontSize: 35 }}>+</Button>
                                        </SmallTableCell>
                                    </TableRow>

                                </TableHead>
                                {currentGame ? <TableBody>
                                    {currentMatches.map((match, i) => (
                                        <TableRow key={i}>


                                            <SmallTableCell>
                                                {match.Day}
                                            </SmallTableCell>
                                            <SmallTableCell >{match.Hour}</SmallTableCell>
                                            <SmallTableCell >{match.Location}</SmallTableCell>
                                            <SmallTableCell >{match.Court}</SmallTableCell>
                                            <SmallTableCell >
                                                <Dustbin target={'Pair1'} Player1={match.Player1} Player2={match.Player2}
                                                    AddPlayer={(user) => updateMatch(match.id, updatePlayer, user, true)}
                                                />
                                            </SmallTableCell>
                                            <SmallTableCell >
                                                <Dustbin target={'Pair2'} Player1={match.Player3} Player2={match.Player4}
                                                    AddPlayer={(user) => updateMatch(match.id, updatePlayer, user, false)}
                                                />
                                            </SmallTableCell>
                                            <SmallTableCell >
                                                <Button variant="contained" onClick={() => {

                                                }}>מחק</Button>
                                            </SmallTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                    : null}
                            </Table>
                            <VBox>
                                <HBox style={{ width: '80%', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                                    {currentRegistrations.filter(u => isNotInMatches(currentMatches, u.email)).map(reg =>
                                        <Box user={reg} source={'unassigned'} backgroundColor={'lightblue'} />
                                    )}
                                </HBox>
                                <HBox style={{ width: '80%', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                                    {unregUsers.filter(u => isNotInMatches(currentMatches, u.email)).map(user =>
                                        <Box user={user} source={'unassigned'} backgroundColor={'yellow'} />
                                    )}
                                </HBox>
                            </VBox>



                        </VBox>
                    </Paper1>
                </DndProvider>
            </HBox>
            {games ? null : <Loading msg="טוען משחקים" />}
            <Spacer height={20} />
            <Button
                style={{ fontSize: 35 }}
                size={"large"}

                variant="contained"
                disabled={submitInProcess || !dirty} onClick={() => {
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

        </div >
    );
}
