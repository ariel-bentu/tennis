
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@material-ui/core';
import { List, ListItem, ListItemText, TextareaAutosize, InputBase, Grid } from '@material-ui/core';
import 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,

} from '@material-ui/pickers';
import dayjs from 'dayjs';
import './match.css';

import {
    Spacer, Card, Loading, HBox, VBox, Text, SmallText,
    HBoxSB, HBoxC, SmallText2, HSeparator, VBoxC, HThinSeparator, Search
} from './elem'
import { Dustbin } from './drop-box';
import { Box } from './drag-box'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

import { isMobile } from 'react-device-detect';
import { AccessTime, Delete, ExpandMore, Filter, LocationOn, Person } from '@material-ui/icons';

import {
    newMatch, isNotInMatches, suggestMatch, getMatchMessage,
    getTodayMatchMessage, getShortDay, sortByDays, getNiceDate, isToday
} from './utils'

import * as api from './api'

const foreColor = "#136BC4";


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

    const getCollection = props.test ? api.getCollection : api.getCollection;

    const [games, setGames] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [editedMatches, setEditedMatches] = useState([]);
    const [users, setUsers] = useState([]);
    const [unregUsers, setUnregUsers] = useState([]);
    const [matchText, setMatchText] = useState(undefined);
    const [matchesSaved, setMatchesSaved] = useState(1);
    const [filter, setFilter] = useState("");


    const [currentGame, setCurrentGame] = useState(undefined);

    const [registrations, setRegistrations] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);

    useEffect(() => {
        Promise.all([
            getCollection(api.Collections.REGISTRATION_COLLECTION, "utcTime"),
            getCollection(api.Collections.PLANNED_GAMES_COLLECTION).then(games => {
                games.sort((g1, g2) => sortByDays(g1.Day, g2.Day));

                let today = dayjs()
                if (today.day() !== 6) {
                    //not saturday
                    games = games.filter(g => g.id !== -5);
                }


                setGames(games);
                if (games && games.length > 0) {
                    setCurrentGame(games[0].id)
                }
                return games;
            }),
            getCollection(api.Collections.USERS_INFO_COLLECTION),
            api.thisSatRegistration(),
            getCollection(api.Collections.STATS_COLLECTION),
            getCollection(api.Collections.USERS_COLLECTION),
            getCollection(api.Collections.MATCHES_COLLECTION),
        ]).then(all => {
            const _registrations = all[0];
            const _plannedGames = all[1];
            const _userInfos = all[2];
            const _thisSatRegistrations = all[3];
            const _stats = all[4]
            const _users = all[5].filter(u => {
                let uInfo = _userInfos.find(u1 => u1.email === u.email);
                if (uInfo) {
                    u.balls = uInfo.balls;
                }
                let uStat = _stats.find(u1 => u1._ref.id === u.email);
                if (uStat) {
                    u.elo1 = uStat.elo1;
                    u.elo2 = uStat.elo2;
                }


                return uInfo && uInfo.inactive === false
            })
            const _matches = all[6];

            setUsers(_users)


            let actRegistration = _registrations;
            if (_thisSatRegistrations !== undefined) {
                // remove cases where user registered already to same day (happens in SAT only)
                const cleanSatRegistered = _thisSatRegistrations.filter(r => !actRegistration.some(ar => ar.email === r.email && ar.GameID === r.GameID))

                actRegistration = actRegistration.concat(cleanSatRegistered);
            }

            //add user displayNames names
            actRegistration = actRegistration.map(reg => {
                let user = _users.find(u => u.email === reg.email);
                if (!user) {
                    reg.displayName = reg.email;
                }

                // Add indication which other registration this user has
                let otherRegs = _registrations.filter(r => r.email === reg.email && r.GameID !== reg.GameID && _plannedGames.find(game => r.GameID === game.id));
                if (otherRegs && otherRegs.length > 0) {
                    const days = otherRegs.map(or => {
                        let game = _plannedGames.find(g => g.id === or.GameID)

                        return {
                            id: game.id,
                            Day: game.Day
                        };
                    }
                    );
                    days.sort((d1, d2) => sortByDays(d1.Day, d2.Day));
                    reg._otherRegistrations = {

                        long: days.map(d => d.Day).join(","),
                        short: "[" + days.map(d => getShortDay(d.Day)).join(",") + "]"
                    }
                }

                return user ? { ...reg, ...user } : reg;
            });
            actRegistration.sort((a, b) => a._order - b._order);

            //make order local to game
            _plannedGames.forEach(game => {
                actRegistration.filter(r => r.GameID === game.id).forEach((orderedReg, i) => (orderedReg._order = i + 1))
            })

            setRegistrations(actRegistration);
            loadMatches(_matches, actRegistration, _users);
        });

    }, [getCollection]);

    const loadMatches = (updatedMatches, regs, inUsers) => {
        //enrich with registration info
        updatedMatches.forEach(m => {
            for (let i = 1; i <= 4; i++) {
                let matchGameID = m.GameID;
                if (isToday(m) && m.GameID == 5) {
                    matchGameID = -5;
                }
                if (m["Player" + i]) {
                    let reg = regs.find(r => r.email === m["Player" + i].email &&
                        r.GameID === matchGameID);
                    if (reg) {
                        m["Player" + i] = reg;
                    } else {
                        let user = inUsers.find(r => r.email === m["Player" + i].email);
                        if (user) {
                            m["Player" + i] = user;
                        }
                    }
                }
            }
        });
        setEditedMatches(updatedMatches);
        setDirty(false);
    }

    useEffect(() => {
        if (matchesSaved > 1) {
            getCollection(api.Collections.MATCHES_COLLECTION).then(mtchs => loadMatches(mtchs, registrations, users));
        }
    }, [matchesSaved]);

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


    let currentMatches = editedMatches ? editedMatches.filter(em => {
        if (em.GameID === 5 && isToday(em) && currentGame === 5) {
            // on Sat, show the today's game in the special pane of this Sat
            return false;
        }


        return (em.GameID === currentGame || (currentGame < 0 && isToday(em))) && !em.deleted
    }) : [];
    let currentRegistrations = registrations ? registrations.filter(em => em.GameID === currentGame) : [];
    let notRegistered = unregUsers;
    if (filter.length > 0) {
        currentRegistrations = currentRegistrations.filter(reg => reg.displayName.includes(filter));
        notRegistered = notRegistered.filter(reg => reg.displayName.includes(filter));
    }
    //currentRegistrations = currentRegistrations.sort((cr1, cr2) => cr1._order - cr2._order);

    let width = props.windowSize.w;
    let condense = width < 760;
    let dragWidth = condense ? '6rem' : '9rem';
    const plusButton = <Button variant="contained" disabled={!currentGame} onClick={() => {
        let game = currentGameObj();
        let nm = newMatch(game);
        setEditedMatches([...editedMatches, nm]);
        setDirty(true);
    }} style={{ fontSize: 25, height: '1.5rem', width: '3rem' }}
    >+</Button>

    const saveButton = <Button
        className={dirty ? "blink-bg" : ""}
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
                    //setDirty(false);
                    props.notify.success("???????? ????????????");
                }
                ,
                //error
                (err) => {
                    props.notify.error(err.toString(), "??????????");
                    setSubmitInProcess(false);
                })
        }
        }>????????</Button>
    const matchButton = <Button
        style={{ fontSize: 15, height: '1.5rem', width: '3rem' }}
        size={"large"}

        variant="contained"
        disabled={submitInProcess} onClick={() => {
            setEditedMatches(suggestMatch(currentGameObj(), editedMatches, registrations))
            setDirty(true);
        }}
    >??????</Button>

    const msgButton = <Button
        style={{ fontSize: 15, height: '1.5rem', width: '3rem' }}
        size={"large"}

        variant="contained"
        disabled={submitInProcess} onClick={() => {
            let msg = getMatchMessage(games, editedMatches);
            setMatchText(msg);
        }}
    >??????????</Button>
    const msgTodayButton = <Button
        style={{ fontSize: 13, height: condense ? '2.5rem' : '1.5rem', width: condense ? '3rem' : '7rem' }}
        size={"large"}

        variant="contained"
        disabled={submitInProcess} onClick={() => {
            let msg = getTodayMatchMessage(games, currentGame, editedMatches);
            setMatchText(msg);
        }}
    >?????????? ????????</Button>

    const cancelChanges = <Button variant="contained" style={{ fontSize: 13, height: '1.5rem', width: 150 }}
        onClick={() => {
            setMatchesSaved(old => old + 1);
        }}
    >?????? ??????????????</Button>


    return (
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <div style={{ height: '65vh', width: '100%', backgroundColor: "#F3F3F3" }}>
                <HBoxC>
                    <SmallText2 textAlign="center" fontSize={25}>?????????? ????????????</SmallText2>
                    {dirty && cancelChanges}
                </HBoxC>
                <HBoxSB>
                    {plusButton}
                    <Spacer />
                    {matchButton}
                    <Spacer />
                    {saveButton}
                    <Spacer />
                    {msgButton}
                    <Spacer />
                    {msgTodayButton}
                </HBoxSB>
                <Spacer />
                <HSeparator />
                {
                    matchText ?
                        <VBox>
                            <TextareaAutosize style={{ width: '60%' }} onChange={e => setMatchText(e.currentTarget.value????????)}>{matchText}</TextareaAutosize>
                            <HBox>
                                <Button variant="contained" onClick={() => navigator.clipboard.writeText(matchText)}>????????</Button>
                                <Button variant="contained" onClick={() => setMatchText(undefined)}>????????</Button>
                            </HBox>

                        </VBox>
                        :

                        <Grid container spacing={0} >
                            <Grid item xs={condense ? 3 : 2}  >
                                <List style={{ margin: 5, height: '30%' }}>
                                    {games.map((game) => (
                                        <ListItem key={game.id}
                                            style={{ display: 'flex', width: '100%', textAlign: 'right', textDecorationLine: game.disabled ? 'line-through' : 'none' }}
                                            button
                                            selected={currentGame === game.id}
                                            onClick={() => setCurrentGame(game.id)}
                                            onDoubleClick={() => { }}
                                        >
                                            {/* <ListItemText primary={game.Day + " " + game.Hour} /> */}
                                            <ListItemText primary={game.Day} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>
                            {/* <Divider orientation="vertical" flexItem style={{ marginRight: "-1px", width: 1 }} /> */}
                            <Grid item xs={condense ? 9 : 10}  >
                                <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
                                    {currentMatches?.map((match, i) => (
                                        <Card width={'100%'} key={match.id}>
                                            <VBox>
                                                {!match._collapse && <HBox style={{ justifyContent: "space-between" }} >
                                                    <VBoxC>
                                                        <AccessTime style={{ color: foreColor }} />
                                                        <Spacer />
                                                        <div dir="ltr">


                                                            <InputBase
                                                                inputProps={{ style: { textAlign: 'center' } }}
                                                                style={{ backgroundColor: '#F3F3F3', width: 50 }}
                                                                value={match.Hour}
                                                                onChange={e => updateMatchValue(match.id, { Hour: e.currentTarget.value })}
                                                            />
                                                            <HBoxC>
                                                                <SmallText fontSize={12}>{getNiceDate(match.date)}</SmallText>
                                                                <KeyboardDatePicker
                                                                    InputProps={{
                                                                        disableUnderline: true,

                                                                    }}
                                                                    style={{ width: 0, right: 20 }}
                                                                    // labelFunc={(value, errString)=>getNiceDate(value)}

                                                                    margin="dense"
                                                                    variant="inline"
                                                                    autoOk
                                                                    format={"yyyy-MM-dd"}
                                                                    inputValue={match.date}
                                                                    onChange={d => updateMatchValue(match.id, { date: dayjs(d).format("YYYY-MM-DD") })}
                                                                />
                                                            </HBoxC>
                                                        </div>
                                                    </VBoxC>

                                                    <VBoxC>
                                                        <LocationOn style={{ color: foreColor }} />
                                                        <Spacer />
                                                        <InputBase
                                                            inputProps={{ style: { textAlign: 'center' } }}
                                                            fullWidth={true}
                                                            style={{ backgroundColor: '#F3F3F3' }}
                                                            value={match.Location}
                                                            onChange={e => updateMatchValue(match.id, { Location: e.currentTarget.value })}
                                                        />
                                                        <Spacer />
                                                        <InputBase
                                                            inputProps={{ style: { textAlign: 'center' } }}
                                                            style={{ backgroundColor: '#F3F3F3', width: 50 }}
                                                            fullWidth={true}
                                                            value={match.Court}
                                                            onChange={e => updateMatchValue(match.id, { Court: e.currentTarget.value })}
                                                        />
                                                    </VBoxC>

                                                </HBox>}

                                                {!match._collapse && <VBoxC>
                                                    <HBox>
                                                        <Person style={{ color: foreColor }} />
                                                        <Person style={{ color: foreColor }} />
                                                    </HBox>
                                                    <Spacer />
                                                    <HBox>
                                                        <VBox>
                                                            <Dustbin sourcePair={'Pair1'} source={1} Player={match.Player1}
                                                                AddPlayer={(user, source) => {
                                                                    updateMatch(match.id, user, source, 1)
                                                                    setFilter("");
                                                                }}
                                                                onRemove={() => updateMatch(match.id, undefined, 0, 1)}
                                                                width={dragWidth}
                                                            />
                                                            <Dustbin sourcePair={'Pair1'} source={2} Player={match.Player2}
                                                                AddPlayer={(user, source) => {
                                                                    updateMatch(match.id, user, source, 2)
                                                                    setFilter("");
                                                                }}
                                                                onRemove={() => updateMatch(match.id, undefined, 0, 2)}
                                                                width={dragWidth}
                                                            />
                                                        </VBox>
                                                        <SmallText2 textAlign="center" width={30}>vs</SmallText2>
                                                        <VBox>
                                                            < Dustbin sourcePair={'Pair2'} source={3} Player={match.Player3}
                                                                AddPlayer={(user, source) => {
                                                                    updateMatch(match.id, user, source, 3);
                                                                    setFilter("");
                                                                }}
                                                                onRemove={() => updateMatch(match.id, undefined, 0, 3)}
                                                                width={dragWidth}
                                                            />
                                                            <Dustbin sourcePair={'Pair2'} source={4} Player={match.Player4}
                                                                AddPlayer={(user, source) => {
                                                                    updateMatch(match.id, user, source, 4);
                                                                    setFilter("");
                                                                }}
                                                                onRemove={() => updateMatch(match.id, undefined, 0, 4)}
                                                                width={dragWidth}
                                                            />
                                                        </VBox>
                                                    </HBox>

                                                </VBoxC>}


                                                <Spacer />
                                                {!match._collapse && <HThinSeparator />}
                                                <HBox>
                                                    <ExpandMore
                                                        style={match._collapse ? null : { transform: "rotate(180deg)" }}
                                                        onClick={() => updateMatchValue(match.id, { _collapse: !match._collapse }, true)} />
                                                    {!match._collapse && <Delete style={{ color: foreColor }}
                                                        onClick={() => {
                                                            props.notify.ask(
                                                                "?????? ?????????? ?????????????\n(???? ???????? ?????????? ???? ?????????? ???? ????????)",
                                                                "??????????",
                                                                [
                                                                    {
                                                                        caption: "??????????",
                                                                        callback: () => updateMatchValue(match.id, { deleted: true })
                                                                    },
                                                                    { caption: "??????", callback: () => { } }
                                                                ])

                                                        }} />}
                                                </HBox>
                                            </VBox>
                                        </Card>))
                                    }


                                    <VBox style={{
                                        height: "65vh",
                                        overflowY: "scroll",
                                        flexWrap: "nowrap",
                                        zIndex: 1000,
                                    }}>
                                        <HBox>
                                            <div style={{
                                                height: "200vw", width: "10%",
                                                backgroundColor: "lightgray", zIndex: 1000
                                            }} >
                                                <div style={{ height: 200, writingMode: "tb" }}>???????? ?????? ????????????</div>
                                            </div>

                                            <VBox style={{ width: "90%" }}>
                                                <Search value={filter} onChange={val => {
                                                    setFilter(val)
                                                }} />

                                                <Text fontSize={15}>???????????? ??????????????</Text>
                                                <HBoxC style={{ flexWrap: 'wrap' }}>

                                                    {currentRegistrations.filter(u => isNotInMatches(currentMatches, u.email)).map(reg =>
                                                        <Box key={reg.email} user={reg}
                                                            sourcePair={'unassigned'} source={0} backgroundColor={'lightblue'} width={dragWidth}
                                                            additionalInfo={reg._otherRegistrations}
                                                        />
                                                    )}
                                                </HBoxC>
                                                <Text fontSize={15}>???? ?????? ??????????????</Text>
                                                <HBoxC style={{ flexWrap: 'wrap' }}>

                                                    {notRegistered.filter(u => isNotInMatches(currentMatches, u.email)).map(user =>
                                                        <Box key={user.email} user={user} sourcePair={'unassigned'} source={0} backgroundColor={'yellow'} width={dragWidth} />
                                                    )}
                                                </HBoxC>
                                                <Spacer height="20vh" />
                                            </VBox>
                                        </HBox>
                                    </VBox>





                                </DndProvider >
                            </Grid >
                        </Grid>
                }

                {games ? null : <Loading msg="???????? ????????????" />}

            </div >
        </MuiPickersUtilsProvider>
    );
}
