
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@material-ui/core';
import { List, ListItem, ListItemText, TextareaAutosize, InputBase, Grid, Divider } from '@material-ui/core';
import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,

} from '@material-ui/pickers';
import dayjs from 'dayjs'


import { Spacer, Header, Loading, HBox, VBox, Text, SmallText } from './elem'
import { Dustbin } from './drop-box';
import { Box } from './drag-box'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

import { isMobile } from 'react-device-detect';
import { Delete, ExpandMore } from '@material-ui/icons';

import { newMatch, isNotInMatches, suggestMatch, getMatchMessage, getTodayMatchMessage } from './utils'

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
        Promise.all([
            getCollection(api.Collections.REGISTRATION_COLLECTION, "utcTime").then(regs => {
                //order by GameID

                setRegistrations(regs)
                return regs;
            }),
            getCollection(api.Collections.USERS_COLLECTION).then(us => {
                setUsers(us)
                return us;
            }),
            getCollection(api.Collections.PLANNED_GAMES_COLLECTION).then(games => {
                setGames(games);
                if (games && games.length > 0) {
                    setCurrentGame(games[0].id)
                }
                return games;
            })

        ]).then(all => {
            //add user displayNames names
            let regs = all[0].map(reg => {
                let user = all[1].find(u => u.email === reg.email);
                if (!user) {
                    reg.displayName = reg.email;
                }
                return user ? { ...reg, ...user } : reg;
            });
            //make order local to game
            all[2].forEach(game => {
                regs.filter(r => r.GameID === game.id).sort((a, b) => a._order - b._order).forEach((orderedReg, i) => (orderedReg._order = i + 1))
            })

            setRegistrations(regs);
        });

    }, [getCollection]);

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
    }, [registrations, matchesSaved, getCollection, users])


    useEffect(() => setUnregUsers(
        users.filter(u => registrations.filter(r => r.GameID === currentGame).every(r => r.email !== u.email))
    ), [currentGame, registrations, users]);

    let updateMatch = (id, user, source, target) => {
        setDirty(true);
        setEditedMatches(oldEditedMatches => {
            let newEditMatches = oldEditedMatches.map(item =>
                item.id === id
                    ? calcChange(item, user, source, target)
                    : item);

            return newEditMatches;
        });
    }

    let updateMatchValue = (id, fragment, ignoreDirty) => {
        if (!ignoreDirty)
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

    currentRegistrations = currentRegistrations.sort((cr1, cr2) => cr1._order - cr2._order);

    let width = props.windowSize.w;
    let condense = width < 760;
    let dragWidth = condense ? '6rem' : '9rem';
    const plusButton = <Button variant="contained" disabled={!currentGame} onClick={() => {
        let game = currentGameObj();
        let nm = newMatch(game);
        setEditedMatches([...editedMatches, nm]);
    }} style={{ fontSize: 25, height: '1.5rem', width: '3rem' }}
    >+</Button>

    const saveButton = <Button
        style={{ fontSize: 15, height: '1.5rem', width: '3rem' }}
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
    const matchButton = <Button
        style={{ fontSize: 15, height: '1.5rem', width: '3rem' }}
        size={"large"}

        variant="contained"
        disabled={submitInProcess} onClick={() => {
            setEditedMatches(suggestMatch(games, editedMatches, registrations))
            setDirty(true);
        }}
    >שבץ</Button>

    const msgButton = <Button
        style={{ fontSize: 15, height: '1.5rem', width: '3rem' }}
        size={"large"}

        variant="contained"
        disabled={submitInProcess} onClick={() => {
            let msg = getMatchMessage(games, editedMatches);
            setMatchText(msg);
        }}
    >הודעה</Button>
    const msgTodayButton = <Button
        style={{ fontSize: 13, height: condense ? '2.5rem' : '1.5rem', width: condense ? '3rem' : '7rem' }}
        size={"large"}

        variant="contained"
        disabled={submitInProcess} onClick={() => {
            let msg = getTodayMatchMessage(games, currentGame, editedMatches);
            setMatchText(msg);
        }}
    >הודעה היום</Button>

    return (
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <div style={{ height: '65vh', width: '100%' }}>

                <HBox style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Header>שיבוץ משחקים</Header>

                    <HBox>
                        {condense ? [
                            <VBox key={0}>
                                {plusButton}
                                <Spacer />
                                {matchButton}
                            </VBox>,
                            <Spacer key={1} width={10} />,
                            <VBox key={2}>
                                {saveButton}
                                <Spacer />
                                {msgButton}
                            </VBox>,
                            <Spacer key={3} width={10} />,
                            <VBox key={4}>
                                {msgTodayButton}
                            </VBox>
                        ] :
                            <HBox>
                                {plusButton}
                                <Spacer />
                                {matchButton}

                                <Spacer />
                                {saveButton}
                                <Spacer />
                                {msgButton}
                                <Spacer />
                                {msgTodayButton}
                            </HBox>}
                    </HBox>
                </HBox>
                {
                    matchText ?
                        <VBox>
                            <TextareaAutosize style={{ width: '60%' }} onChange={e => setMatchText(e.currentTarget.valueרקען)}>{matchText}</TextareaAutosize>
                            <HBox>
                                <Button variant="contained" onClick={() => navigator.clipboard.writeText(matchText)}>העתק</Button>
                                <Button variant="contained" onClick={() => setMatchText(undefined)}>סגור</Button>
                            </HBox>

                        </VBox>
                        :

                        <Grid container spacing={3} >
                            <Grid item xs={condense ? 3 : 2}  >
                                <List style={{ margin: 5, height: '30%' }}>
                                    {games.sort((g1, g2) => g1.id - g2.id).map((game) => (
                                        <ListItem key={game.id}
                                            style={{ width: '100%' }}
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
                            <Divider orientation="vertical" flexItem style={{ marginRight: "-8px", width: 2 }} />
                            <Grid item xs style={{ textAlign: "right" }}>
                                <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
                                    <Spacer />
                                    <Grid container spacing={2}>
                                        <Grid container item xs={12} spacing={3}>
                                            <Grid item xs={condense ? 2 : 2}>מתי</Grid>
                                            <Grid item xs={condense ? 4 : 2}>מיקום</Grid>
                                            {condense ? null : <Grid item xs={1}>מגרש</Grid>}
                                            <Grid item xs={condense ? 5 : 3}>{condense ? "צוותים" : "זוג 1"}</Grid>
                                            {condense ? null : <Grid item xs={3}>זוג 2</Grid>}

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
                                                    width={dragWidth}
                                                />
                                                let player4 = <Dustbin sourcePair={'Pair2'} source={4} Player={match.Player4}
                                                    AddPlayer={(user, source) => updateMatch(match.id, user, source, 4)}
                                                    onRemove={() => updateMatch(match.id, undefined, 0, 4)}
                                                    width={dragWidth}
                                                />



                                                return <Grid container item xs={12} spacing={3} style={{ fontSize: 13 }} key={match.id}>
                                                    <Grid item xs={2} style={{ paddingRight: 2, paddingLeft: 2 }}>
                                                        <VBox>
                                                            <div dir="ltr">
                                                                <HBox>

                                                                    <InputBase
                                                                        style={{ backgroundColor: '#F3F3F3' }}

                                                                        value={match.Hour}
                                                                        onChange={e => updateMatchValue(match.id, { Hour: e.currentTarget.value })}
                                                                    />
                                                                    <ExpandMore
                                                                        style={match._collapse ? { transform: "rotate(90deg)" } : null}
                                                                        onClick={() => updateMatchValue(match.id, { _collapse: !match._collapse }, true)} />
                                                                </HBox>
                                                                <Spacer />
                                                                {match._collapse ? null : <KeyboardDatePicker
                                                                    margin="normal"
                                                                    variant="inline"
                                                                    style={{ width: 50 }}
                                                                    autoOk
                                                                    //open={true}
                                                                    keyboardIcon={undefined}


                                                                    format={"dd/MMM/yyyy"}

                                                                    inputValue={match.date}
                                                                    onChange={d => {
                                                                        updateMatchValue(match.id, { date: dayjs(d).format("DD/MMM/YYYY") })
                                                                    }
                                                                    }
                                                                />}
                                                                {match._collapse ? null : <SmallText fontSize={12}>{match.date}</SmallText>}
                                                                {/* <InputBase
                                                                style={{ backgroundColor: '#F3F3F3', fontSize: 12 }}
                                                                fullWidth={true}
                                                                value={match.date}
                                                                onChange={e => updateMatchValue(match.id, { date: e.currentTarget.value })}
                                                            /> */}
                                                            </div>
                                                        </VBox>
                                                    </Grid>
                                                    <Grid item xs={condense ? 4 : 2}>
                                                        <InputBase

                                                            fullWidth={true}
                                                            value={match.Location}
                                                            onChange={e => updateMatchValue(match.id, { Location: e.currentTarget.value })}
                                                        />
                                                        {condense && !match._collapse ? court : null}
                                                    </Grid>
                                                    {condense ? null : <Grid item xs={1}>{court}</Grid>}
                                                    {match._collapse ? <Grid item xs={condense ? 5 : 3} /> :
                                                        <Grid item xs={condense ? 5 : 3}>

                                                            <Dustbin sourcePair={'Pair1'} source={1} Player={match.Player1}
                                                                AddPlayer={(user, source) => updateMatch(match.id, user, source, 1)}
                                                                onRemove={() => updateMatch(match.id, undefined, 0, 1)}
                                                                width={dragWidth}
                                                            />
                                                            <Dustbin sourcePair={'Pair1'} source={2} Player={match.Player2}
                                                                AddPlayer={(user, source) => updateMatch(match.id, user, source, 2)}
                                                                onRemove={() => updateMatch(match.id, undefined, 0, 2)}
                                                                width={dragWidth}
                                                            />
                                                            {condense ? "vs" : null}

                                                            {condense ? player3 : null}
                                                            {condense ? player4 : null}
                                                        </Grid>}
                                                    {match._collapse ? <Grid item xs={3} /> : null}
                                                    {condense || match._collapse ? null : <Grid item xs={3}>
                                                        {player3}
                                                        {player4}
                                                    </Grid>}
                                                    {match._collapse ? null : <Grid xs={1}>
                                                        <Delete onClick={() => {
                                                            props.notify.ask("האם למחוק משחקון זה?", "מחיקה", [
                                                                {
                                                                    caption: "מחק",
                                                                    callback: () => updateMatchValue(match.id, { deleted: true })
                                                                },
                                                                { caption: "בטל", callback: () => { } }
                                                            ])

                                                        }} />
                                                    </Grid>}
                                                </Grid>
                                            })
                                            : null}


                                    </Grid>





                                    <VBox>
                                        <Text fontSize={15}>שחקנים שנירשמו</Text>
                                        <HBox style={{ width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>

                                            {currentRegistrations.filter(u => isNotInMatches(currentMatches, u.email)).map(reg =>
                                                <Box key={reg.email} user={reg} sourcePair={'unassigned'} source={0} backgroundColor={'lightblue'} width={dragWidth} />
                                            )}
                                        </HBox>
                                        <Text fontSize={15}>כל שאר השחקנים</Text>
                                        <HBox style={{ width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>

                                            {unregUsers.filter(u => isNotInMatches(currentMatches, u.email)).map(user =>
                                                <Box key={user.email} user={user} sourcePair={'unassigned'} source={0} backgroundColor={'yellow'} width={dragWidth} />
                                            )}
                                        </HBox>
                                    </VBox>





                                </DndProvider >
                            </Grid >
                        </Grid >
                }

                {games ? null : <Loading msg="טוען משחקים" />}

            </div >
        </MuiPickersUtilsProvider>
    );
}
