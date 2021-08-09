
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

const calcChange = (item, user, source, target) => {
    
    if (source == target) 
        return {};
    let srcName = "Player"+source;
    let targetName = "Player"+target;

    if (source == 0) {
        return {[targetName]: user}
    }
    return {[targetName]: user , [srcName]:item[targetName]}
    
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

    let updateMatch = (id, user, source, target) => {
        setDirty(true);
        setEditedMatches(oldEditedMatches => oldEditedMatches.map(item =>
            item.id === id
                ? { ...item, ...calcChange(item, user, source, target) }
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
                                                <Dustbin sourcePair={'Pair1'} source={1} Player={match.Player1} 
                                                    AddPlayer={(user, source) => updateMatch(match.id, user, source, 1 )}
                                                    onRemove={()=>updateMatch(match.id, undefined, 0, 1 )}
                                                />
                                                <Dustbin sourcePair={'Pair1'} source={2} Player={match.Player2} 
                                                    AddPlayer={(user, source) => updateMatch(match.id, user, source, 2 )}
                                                    onRemove={()=>updateMatch(match.id, undefined, 0, 2 )}

                                                />
                                            </SmallTableCell>
                                            <SmallTableCell >
                                                <Dustbin sourcePair={'Pair2'} source={3} Player={match.Player3} 
                                                    AddPlayer={(user, source) => updateMatch(match.id, user, source, 3 )}
                                                    onRemove={()=>updateMatch(match.id, undefined, 0, 3 )}
                                                />
                                                <Dustbin sourcePair={'Pair2'} source={4} Player={match.Player4} 
                                                    AddPlayer={(user, source) => updateMatch(match.id, user, source, 4 )}
                                                    onRemove={()=>updateMatch(match.id, undefined, 0, 4 )}
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
                                        <Box user={reg} sourcePair={'unassigned'} source={0}  backgroundColor={'lightblue'} />
                                    )}
                                </HBox>
                                <HBox style={{ width: '80%', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                                    {unregUsers.filter(u => isNotInMatches(currentMatches, u.email)).map(user =>
                                        <Box user={user} sourcePair={'unassigned'} source={0} backgroundColor={'yellow'} />
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
