
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, TableHead, TableRow, TableBody } from '@material-ui/core';
import { List, ListItem, ListItemText, TextareaAutosize } from '@material-ui/core';

import { Spacer, Header, Loading, SmallTableCell, Paper1, HBox, VBox, Text, SmallTableCellEditable } from './elem'
import { Dustbin } from './drop-box';
import { Box } from './drag-box'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { newMatch, isNotInMatches, suggestMatch, cleansePlayer, getMatchMessage } from './utils'

import * as api from './api'


const calcChange = (item, user, source, target) => {

    if (source === target)
        return item;
    let srcName = "Player" + source;
    let targetName = "Player" + target;

    if (source === 0) {
        if (!user) {
            delete item[targetName];
            return item;
        }
        return { ...item, [targetName]: cleansePlayer(user) }
    }
    return { ...item, [targetName]: cleansePlayer(user), [srcName]: item[targetName] }

}


export default function Match(props) {

    const [games, setGames] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [editedMatches, setEditedMatches] = useState(undefined);
    const [users, setUsers] = useState([]);
    const [unregUsers, setUnregUsers] = useState([]);
    const [matchText, setMatchText] = useState(undefined);

    const [currentGame, setCurrentGame] = useState(undefined);

    const [registrations, setRegistrations] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);

    useEffect(() => {
        api.getCollection(api.Collections.PLANNED_GAMES_COLLECTION).then(games => {
            setGames(games);
            if (games && games.length > 0) {
                setCurrentGame(games[0].id)
            }
        })
        Promise.all([
            api.getCollection(api.Collections.REGISTRATION_COLLECTION, "time").then(regs => {
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
        users.filter(u => registrations.filter(r => r.GameID === currentGame).every(r => r.email !== u.email))
    ), [currentGame, registrations, users]);

    let updateMatch = (id, user, source, target) => {
        setDirty(true);
        setEditedMatches(oldEditedMatches => oldEditedMatches.map(item =>
            item.id === id
                ? calcChange(item, user, source, target)
                : item));
    }

    let updateMatchValue = (id, fragment) => {
        setDirty(true);
        setEditedMatches(oldEditedMatches => oldEditedMatches.map(item =>
            item.id === id
                ? { ...item, ...fragment }
                : item));
    }


    const currentGameObj = useCallback(() => currentGame ? games.find(g => g.id === currentGame) : {},
        [currentGame, games]);


    let currentMatches = editedMatches ? editedMatches.filter(em => em.GameID === currentGame && !em.deleted) : [];
    let currentRegistrations = registrations ? registrations.filter(em => em.GameID === currentGame) : [];

    return (
        <div style={{ height: '65vh', width: '100%' }}>

            <Header>שיבוץ משחקים</Header>


            {matchText ?
                <VBox>
                    <TextareaAutosize style={{width:'60%'}}>{matchText}</TextareaAutosize>
                    <HBox>
                    <Button variant="contained" onClick={() => navigator.clipboard.writeText(matchText)}>העתק</Button>
                    <Button variant="contained" onClick={() => setMatchText(undefined)}>סגור</Button>
                    </HBox>
                    
                </VBox>
                :

                <HBox>
                    <Paper1 width={'15%'}>
                        <List style={{ margin: 5, height: '30%' }}>
                            {games.sort((g1, g2) => g1.id - g2.id).map((game) => (
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
                        <Paper1 width={'85%'}>
                            <VBox>
                                <Table >
                                    <TableHead>
                                        <TableRow>

                                            <SmallTableCell width={'8%'} >יום</SmallTableCell>
                                            <SmallTableCell width={'10%'}>שעה</SmallTableCell>
                                            <SmallTableCell width={'15%'}>מיקום</SmallTableCell>
                                            <SmallTableCell width={'7%'}>מגרש</SmallTableCell>
                                            <SmallTableCell width={'25%'}>זוג 1</SmallTableCell>
                                            <SmallTableCell width={'25%'}>זוג 2</SmallTableCell>
                                            <SmallTableCell width={'15%'}>
                                                <VBox>
                                                <HBox style={{ justifyContent: 'center' }}>
                                                    <Button variant="contained" disabled={!currentGame} onClick={() => {
                                                        let game = currentGameObj();
                                                        let nm = newMatch(game);
                                                        setEditedMatches([...editedMatches, nm]);
                                                    }} style={{ fontSize: 35, height: '3rem' }}>+</Button>
                                                    <Spacer height={20} />
                                                    <Button
                                                        style={{ fontSize: 15, height: '3rem' }}
                                                        size={"large"}

                                                        variant="contained"
                                                        disabled={submitInProcess || !dirty} onClick={() => {
                                                            setSubmitInProcess(true);
                                                            api.saveMatches(editedMatches).then(
                                                                () => api.getCollection(api.Collections.MATCHES_COLLECTION).then(
                                                                    m => setEditedMatches(m)).then(() => {
                                                                        setSubmitInProcess(false)
                                                                        props.notify.success("נשמר בהצלחה");
                                                                    })
                                                                ,
                                                                //error
                                                                (err) => {
                                                                    props.notify.error(err.toString(), "שגיאה");
                                                                    setSubmitInProcess(false);
                                                                })
                                                        }
                                                        }>שמור</Button>
                                                    <Spacer height={20} />
                                                </HBox>
                                                <Spacer />
                                                <HBox>

                                                    <Button
                                                        style={{ fontSize: 15, height: '3rem' }}
                                                        size={"large"}

                                                        variant="contained"
                                                        disabled={submitInProcess} onClick={() => {
                                                            setEditedMatches(suggestMatch(games, editedMatches, registrations))
                                                            setDirty(true);
                                                        }}
                                                    >שבץ</Button>
                                                    <Spacer />
                                                    <Button
                                                        style={{ fontSize: 15, height: '3rem' }}
                                                        size={"large"}

                                                        variant="contained"
                                                        disabled={submitInProcess} onClick={() => {
                                                            let msg = getMatchMessage(games, editedMatches);
                                                            setMatchText(msg);
                                                        }}
                                                    >הודעה</Button>
                                                </HBox>
                                                </VBox>
                                            </SmallTableCell>
                                        </TableRow>

                                    </TableHead>
                                    {currentGame ? <TableBody>
                                        {currentMatches.map((match, i) => (
                                            <TableRow key={i}>


                                                <SmallTableCell>
                                                    {match.Day}
                                                </SmallTableCell>
                                                <SmallTableCellEditable value={match.Hour}
                                                    onChange={e => updateMatchValue(match.id, { Hour: e.currentTarget.value })} />
                                                <SmallTableCellEditable value={match.Location}
                                                    onChange={e => updateMatchValue(match.id, { Location: e.currentTarget.value })} />

                                                <SmallTableCellEditable value={match.Court}
                                                    onChange={e => updateMatchValue(match.id, { Court: e.currentTarget.value })} />

                                                <SmallTableCell >
                                                    <Dustbin sourcePair={'Pair1'} source={1} Player={match.Player1}
                                                        AddPlayer={(user, source) => updateMatch(match.id, user, source, 1)}
                                                        onRemove={() => updateMatch(match.id, undefined, 0, 1)}
                                                    />
                                                    <Dustbin sourcePair={'Pair1'} source={2} Player={match.Player2}
                                                        AddPlayer={(user, source) => updateMatch(match.id, user, source, 2)}
                                                        onRemove={() => updateMatch(match.id, undefined, 0, 2)}

                                                    />
                                                </SmallTableCell>
                                                <SmallTableCell >
                                                    <Dustbin sourcePair={'Pair2'} source={3} Player={match.Player3}
                                                        AddPlayer={(user, source) => updateMatch(match.id, user, source, 3)}
                                                        onRemove={() => updateMatch(match.id, undefined, 0, 3)}
                                                    />
                                                    <Dustbin sourcePair={'Pair2'} source={4} Player={match.Player4}
                                                        AddPlayer={(user, source) => updateMatch(match.id, user, source, 4)}
                                                        onRemove={() => updateMatch(match.id, undefined, 0, 4)}
                                                    />
                                                </SmallTableCell>
                                                <SmallTableCell >
                                                    <Button variant="contained" onClick={() => props.notify.ask("האם למחוק משחק זה?", "מחיקת משחק", [
                                                        { caption: "מחק", callback: () => updateMatchValue(match.id, { deleted: true }) },
                                                        { caption: "בטל", callback: () => { } }
                                                    ])
                                                    }>מחק</Button>
                                                </SmallTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                        : null}
                                </Table>
                                <VBox>
                                    <Text fontSize={15}>שחקנים שנירשמו</Text>
                                    <HBox style={{ width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>

                                        {currentRegistrations.filter(u => isNotInMatches(currentMatches, u.email)).map(reg =>
                                            <Box key={reg.email} user={reg} sourcePair={'unassigned'} source={0} backgroundColor={'lightblue'} />
                                        )}
                                    </HBox>
                                    <Text fontSize={15}>כל שאר השחקנים</Text>
                                    <HBox style={{ width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>

                                        {unregUsers.filter(u => isNotInMatches(currentMatches, u.email)).map(user =>
                                            <Box key={user.email} user={user} sourcePair={'unassigned'} source={0} backgroundColor={'yellow'} />
                                        )}
                                    </HBox>
                                </VBox>



                            </VBox>
                        </Paper1>
                    </DndProvider>
                </HBox>}
            {games ? null : <Loading msg="טוען משחקים" />}

        </div >
    );
}
