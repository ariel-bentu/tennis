
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, TableHead, TableRow, TableBody } from '@material-ui/core';
import { List, ListItem, ListItemText, TextareaAutosize, InputBase, Grid } from '@material-ui/core';

import { Spacer, Header, Loading, SmallTableCell, Paper1, HBox, VBox, Text, SmallTableCellEditable } from './elem'
import { Dustbin } from './drop-box';
import { Box } from './drag-box'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

import { isMobile } from 'react-device-detect';
import { Delete } from '@material-ui/icons';

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
        return { ...item, [targetName]: user }
    }
    return { ...item, [targetName]: user, [srcName]: item[targetName] }

}


export default function Match(props) {

    const getCollection = props.test ? api.getCollectionTest : api.getCollection;

    const [games, setGames] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [editedMatches, setEditedMatches] = useState([]);
    const [users, setUsers] = useState([]);
    const [unregUsers, setUnregUsers] = useState([]);
    const [matchText, setMatchText] = useState(undefined);
    const [matchesSaved, setMatchesSaved] = useState(1);


    const [currentGame, setCurrentGame] = useState(undefined);

    const [registrations, setRegistrations] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);

    useEffect(() => {
        getCollection(api.Collections.PLANNED_GAMES_COLLECTION).then(games => {
            setGames(games);
            if (games && games.length > 0) {
                setCurrentGame(games[0].id)
            }
        })
        Promise.all([
            getCollection(api.Collections.REGISTRATION_COLLECTION, "time").then(regs => {
                setRegistrations(regs)
                return regs;
            }),
            getCollection(api.Collections.USERS_COLLECTION).then(us => {
                setUsers(us)
                return us;
            })
        ]).then(all => {
            setRegistrations(all[0].map(reg => {
                let user = all[1].find(u => u.email === reg.email);
                if (!user) {
                    reg.displayName = reg.email;
                }
                return user ? { ...reg, ...user } : reg;
            }))
        });

    }, []);

    useEffect(() => {
        getCollection(api.Collections.MATCHES_COLLECTION).then(mtchs => {
            //enrich with registration info
            mtchs.forEach(m => {
                for (let i = 1; i <= 4; i++) {
                    if (m["Player" + i]) {
                        let reg = registrations.find(r => r.email === m["Player" + i].email &&
                            r.GameID === m.GameID);
                        if (reg) {
                            m["Player" + i] = reg;
                        } else {
                            let user = users.find(r => r.email === m["Player" + i].email);
                            if (user) {
                                m["Player" + i] = user;
                            }
                        }
                    }
                }
            });
            setEditedMatches(mtchs);
        });
    }, [registrations, matchesSaved])


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

    let width = props.windowSize.w;
    let rightPanelWidth = Math.min(width * .12, 120);
    let mainWidth = width - rightPanelWidth;
    let condense = width < 760;
    return (
        <div style={{ height: '65vh', width: '100%' }}>
            {width}
            <HBox style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Header>שיבוץ משחקים</Header>
                <HBox>
                    <Button variant="contained" disabled={!currentGame} onClick={() => {
                        let game = currentGameObj();
                        let nm = newMatch(game);
                        setEditedMatches([...editedMatches, nm]);
                    }} style={{ fontSize: 35, height: '2rem' }}>+</Button>
                    <Spacer height={20} />
                    <Button
                        style={{ fontSize: 15, height: '2rem' }}
                        size={"large"}

                        variant="contained"
                        disabled={submitInProcess || !dirty} onClick={() => {

                            setSubmitInProcess(true);
                            api.saveMatches(editedMatches, props.test).then(
                                () => {
                                    //causes reload of matches
                                    setMatchesSaved(ms => ms + 1);
                                    setSubmitInProcess(false);
                                    setDirty(false);
                                    props.notify.success("נשמר בהצלחה");
                                }
                                ,
                                //error
                                (err) => {
                                    props.notify.error(err.toString(), "שגיאה");
                                    setSubmitInProcess(false);
                                })
                        }
                        }>שמור</Button>
                    <Spacer />
                    <Button
                        style={{ fontSize: 15, height: '2rem' }}
                        size={"large"}

                        variant="contained"
                        disabled={submitInProcess} onClick={() => {
                            setEditedMatches(suggestMatch(games, editedMatches, registrations))
                            setDirty(true);
                        }}
                    >שבץ</Button>
                    <Spacer />
                    <Button
                        style={{ fontSize: 15, height: '2rem' }}
                        size={"large"}

                        variant="contained"
                        disabled={submitInProcess} onClick={() => {
                            let msg = getMatchMessage(games, editedMatches);
                            setMatchText(msg);
                        }}
                    >הודעה</Button>
                </HBox>
            </HBox>

            {matchText ?
                <VBox>
                    <TextareaAutosize style={{ width: '60%' }}>{matchText}</TextareaAutosize>
                    <HBox>
                        <Button variant="contained" onClick={() => navigator.clipboard.writeText(matchText)}>העתק</Button>
                        <Button variant="contained" onClick={() => setMatchText(undefined)}>סגור</Button>
                    </HBox>

                </VBox>
                :

                <Grid container spacing={3} >
                    <Grid item xs={condense ? 2 : 1.5}>
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
                    </Grid>
                    <Grid item xs style={{ textAlign: "right" }}>
                        <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
                            <Spacer />
                            <VBox>
                                <Grid container spacing={3}>
                                    <Grid container item spacing={3}>
                                        <Grid item xs={2}>שעה</Grid>
                                        <Grid item xs={2}>מיקום</Grid>
                                        {condense ? null : <Grid item xs={1}>מגרש</Grid>}
                                        <Grid item xs={condense?6:3}>זוג 1</Grid>
                                        {condense ? null :<Grid item xs={3}>זוג 2</Grid>}
                                    </Grid>


                                    {currentGame ?
                                        currentMatches.map((match, i) => {
                                            let court = <InputBase
                                                fullWidth={true}
                                                value={match.Court}
                                                onChange={e => updateMatchValue(match.id, { Court: e.currentTarget.value })}
                                            />

                                            let player3 = < Dustbin sourcePair={'Pair2'} source={3} Player={match.Player3}
                                                AddPlayer={(user, source) => updateMatch(match.id, user, source, 3)}
                                                onRemove={() => updateMatch(match.id, undefined, 0, 3)}
                                            />
                                            let player4 = <Dustbin sourcePair={'Pair2'} source={4} Player={match.Player4}
                                                AddPlayer={(user, source) => updateMatch(match.id, user, source, 4)}
                                                onRemove={() => updateMatch(match.id, undefined, 0, 4)}
                                            />

                                            return <Grid container item spacing={3} style={{ fontSize: 13 }}>
                                                <Grid item xs={2}>
                                                    <InputBase
                                                        fullWidth={true}
                                                        value={match.Hour}
                                                        onChange={e => updateMatchValue(match.id, { Hour: e.currentTarget.value })}
                                                    />
                                                </Grid>
                                                <Grid item xs={2}>
                                                    <InputBase

                                                        fullWidth={true}
                                                        value={match.Location}
                                                        onChange={e => updateMatchValue(match.id, { Location: e.currentTarget.value })}
                                                    />
                                                    {condense ? court : null}
                                                </Grid>
                                                {condense ? null : <Grid item xs={1}>{court}</Grid>}
                                                <Grid item xs={condense?6:3}>

                                                    <Dustbin sourcePair={'Pair1'} source={1} Player={match.Player1}
                                                        AddPlayer={(user, source) => updateMatch(match.id, user, source, 1)}
                                                        onRemove={() => updateMatch(match.id, undefined, 0, 1)}
                                                    />
                                                    <Dustbin sourcePair={'Pair1'} source={2} Player={match.Player2}
                                                        AddPlayer={(user, source) => updateMatch(match.id, user, source, 2)}
                                                        onRemove={() => updateMatch(match.id, undefined, 0, 2)}
                                                    />
                                                    {condense ? "vs" : null}
                                                    {condense ? player3 : null}
                                                    {condense ? player4 : null}


                                                </Grid>
                                                {condense ? null : <Grid item xs={3}>
                                                    {player3}
                                                    {player4}
                                                </Grid>}
                                            </Grid>
                                        })
                                        : null}


                                </Grid>





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

                        </DndProvider >
                    </Grid >
                </Grid >
            }

            {games ? null : <Loading msg="טוען משחקים" />}

        </div >
    );
}
