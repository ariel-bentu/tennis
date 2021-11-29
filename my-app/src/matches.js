
import React, { useState, useEffect } from 'react';
import { Grid, Button } from '@material-ui/core';

import { Spacer, Loading, VBox, HBox, SmallText2, SVGIcon, Card, HThinSeparator, HBoxC } from './elem'
import { filterByPlayer, getNiceDate } from './utils'

import * as api from './api'
import { EmojiEvents, SentimentDissatisfied } from '@material-ui/icons';
import SetResults from './set-results';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';

const Val = (v) => parseInt(v);


export default function Matches({ UserInfo, notify, reload, admin }) {
    const [matches, setMatches] = useState(undefined);
    const [myMatches, setMyMatches] = useState(undefined);
    const [showMineOnly, setShowMineOnly] = useState(false);

    const [edit, setEdit] = useState(undefined);
    const [more, setMore] = useState(true);

    useEffect(() => {
        if (UserInfo) {
            api.getPaginatedCollection(api.Collections.MATCHES_ARCHIVE_COLLECTION, "date", true, 15).then(matches => {
                setMatches(matches);
                let myM = filterByPlayer(matches, UserInfo.email);
                setMyMatches(myM);

            })
        }
    }, [UserInfo, reload])

    useEffect(() => {
        if (matches) {
            let myM = filterByPlayer(matches, UserInfo.email);
            setMyMatches(myM);
        } else {
            setMyMatches(undefined);
        }
    }, [matches, UserInfo])


    return (
        <div style={{ height: '100%', width: '100%', backgroundColor: "#F3F3F3" }}>
            <Spacer width={10} />
            {edit ?
                <SetResults match={edit} notify={notify} onCancel={() => setEdit(undefined)}
                    onDone={(editedSet => {
                        setMatches(currentMatches => currentMatches.map(m => m._ref.id === edit._ref.id ? { ...m, set: editedSet } : m));
                        setEdit(undefined);
                    })} isArchived={true} Admin={admin} />
                : <VBox>
                    {matches ?
                        <div style={{ height: '100%', width: '100%' }}>
                            <Spacer height={10} />
                            <div dir="ltr">
                                <ToggleButtonGroup
                                    color="primary"
                                    value={showMineOnly ? "mine" : "all"}
                                    exclusive
                                    onChange={() => setShowMineOnly(old => !old)}
                                >
                                    <ToggleButton value="mine">שלי</ToggleButton>
                                    <ToggleButton value="all">הכל</ToggleButton>
                                </ToggleButtonGroup>
                            </div>
                            <Spacer height={10} />
                            {(showMineOnly && myMatches ? myMatches : matches).map(match => (
                                <GetMatch match={match} UserInfo={UserInfo} setEdit={setEdit} admin={admin} />
                            ))
                            }
                        </div>
                        :
                        <Loading msg="טוען משחקים" />
                    }
                    {matches && matches.length > 0 && more ? <Button variant="contained" onClick={() => {
                        notify.progress();
                        api.getPaginatedCollection(api.Collections.MATCHES_ARCHIVE_COLLECTION, "date", true, 15, matches[matches.length - 1]._doc).then(ms => {
                            if (ms.length === 0) {
                                setMore(false);
                                notify.clear();
                                return;
                            }
                            setMatches(oldMatches => [...oldMatches, ...ms]);
                            if (ms.length < 15) {
                                setMore(false);
                            }
                            notify.clear();
                        },
                            (err) => notify.error(err.message)
                        );
                    }}>טען עוד...</Button> : null}
                </VBox>
            }


        </div >
    );
}

function GetMatch({ match, UserInfo, setEdit, admin }) {

    //calculate winner
    const wonSets1 = match.sets ? match.sets.reduce((prev, curr) => prev + (Val(curr.pair1) > Val(curr.pair2) ? 1 : 0), 0) : -1;
    const wonSets2 = match.sets ? match.sets.reduce((prev, curr) => prev + (Val(curr.pair1) < Val(curr.pair2) ? 1 : 0), 0) : -1;
    let winner = 0;

    if (wonSets1 > wonSets2) {
        winner = 1;
    } else if (wonSets1 < wonSets2) {
        winner = 2;
    } else if (match.sets) {
        const wonGames1 = match.sets.reduce((prev, curr) => prev + Val(curr.pair1), 0);
        const wonGames2 = match.sets.reduce((prev, curr) => prev + Val(curr.pair2), 0);
        if (wonGames1 > wonGames2) {
            winner = 1;
        } else if (wonGames1 < wonGames2) {
            winner = 2;
        }
    }

    let sets = match.sets ? [...match.sets] : [];

    for (let i = sets.length; i < 5; i++) {
        sets.push({
            pair1: "-",
            pair2: "-"
        })
    }
    //alert(match.date + "-"+ getNiceDate(match.date));
    const userInM = userInMatch(match, UserInfo);
    const showEdit = admin || (userInM && !match.sets);

    return <Card>
        <Grid container spacing={2} style={{ height: 50 }} direction={'row-reverse'}>
            <Grid item xs={12} >
                <SmallText2 textAlign="center" fontSize={12}>{match.Day + " ," + getNiceDate(match.date)}</SmallText2>
                <HThinSeparator width="100%" />
            </Grid>

        </Grid>
        <Spacer />
        <GetOneLine P1={match.Player1} P2={match.Player2} sets={sets} UserInfo={UserInfo}
            firstPair={true} wonSets={wonSets1} wins={winner === 1} tie={winner === 0}
            cancelled={match.matchCancelled}
        />
        <GetOneLine P1={match.Player3} P2={match.Player4} sets={sets} wonSets={wonSets2}
            wins={winner === 2} tie={winner === 0}
            UserInfo={UserInfo}
            cancelled={match.matchCancelled}
        />
        {showEdit ? <HThinSeparator /> : null}
        {showEdit ?
            <SVGIcon svg="editResults" size={25} onClick={() => setEdit(match)} />
            : null}

    </Card>
}

function userInMatch(match, UserInfo) {
    if (!UserInfo)
        return false;

    for (let i = 1; i <= 4; i++) {
        if (match["Player" + i] && match["Player" + i].email === UserInfo.email) {
            return true;
        }
    }
    return false;
}


function GetOneLine(props) {
    const p1IsMe = props.P1 && props.P1.email === props.UserInfo.email;
    const p2IsMe = props.P2 && props.P2.email === props.UserInfo.email;
    return (
        <Grid container spacing={2} style={{ height: 60 }} direction={'row-reverse'}>
            <Grid item xs={4} alignContent={'flex-start'} style={{ padding: 2 }}>
                <VBox>
                    {props.P1 ? <SmallText2 marginTop={5} lineHeight={1} textAlign="center" textDecoration={p1IsMe ? 'underline' : undefined} fontWeight={p1IsMe ? 'bold' : undefined}>{props.P1.displayName}</SmallText2> : null}
                    {props.P2 ? <SmallText2 lineHeight={1} textAlign="center" textDecoration={p2IsMe ? 'underline' : undefined} fontWeight={p2IsMe ? 'bold' : undefined}>{props.P2.displayName}</SmallText2> : null}
                </VBox>
            </Grid >
            {props.cancelled ? null :
                <Grid item xs={1} alignSelf={'center'}>
                    {props.wins ? <EmojiEvents style={{ color: 'gold' }} /> : null}
                </Grid>}

            {props.cancelled ?

                <Grid item xs={7} style={{ padding: 2 }}>
                    {props.firstPair ? <HBox style={{ justifyContent: 'center' }}>
                        <SentimentDissatisfied />
                    </HBox>
                        :
                        <HBox >
                            <SmallText2 textAlign="center">משחק בוטל</SmallText2>



                        </HBox>
                    }

                </Grid> :
                props.sets.map(result => {
                    const setValue = props.firstPair ? result.pair1 : result.pair2;
                    const p1IntVal = parseInt(result.pair1);
                    const p2IntVal = parseInt(result.pair2);
                    const tbIntValue = parseInt(props.firstPair ? result.tbPair1 : result.tbPair2);
                    let tbValue = undefined;

                    if (((!isNaN(p1IntVal) && p1IntVal === 7) ||
                        (!isNaN(p2IntVal) && p2IntVal === 7)) && !isNaN(tbIntValue)) {
                        tbValue = tbIntValue;
                    }

                    return <Grid item xs={1} style={{ padding: 2 }}>
                        <HBoxC style={{
                            backgroundColor: (props.firstPair && result.pair1 > result.pair2) ||
                                (!props.firstPair && result.pair1 < result.pair2) ?
                                'lightgreen' : result.pair1 === "-" ? 'white' :
                                    result.pair1 === result.pair2 ? 'lightblue' :
                                        'lightpink'
                            ,
                            width: 22, height: 35,

                        }}>
                            <SmallText2 lineHeight={30} textAlign='center'>{setValue}</SmallText2>
                            {tbValue ? <SmallText2 transform="translateY(-8px)" fontSize={8} textAlign='center'>{tbValue}</SmallText2> : null}

                        </HBoxC>
                    </Grid>
                })
            }

            {props.cancelled ? null :
                <Grid item xs={1} style={{ padding: 2 }}>
                    <HBox style={{ width: '100%', height: '100%' }}>
                        <VBox style={{
                            backgroundColor: (props.wins ? 'lightgreen' : (props.wonSets === -1 ? 'white' : props.tie ? 'lightgray' : 'lightpink')),
                            width: 22, height: 35, justifyContent: 'center'
                        }}>
                            <SmallText2 textAlign='center'>{props.wonSets >= 0 ? props.wonSets : "-"}</SmallText2>
                        </VBox>
                        <VBox style={{ backgroundColor: 'black', width: '4%', height: 35 }} />
                    </HBox>
                </Grid>}
            {props.button ? <Grid item xs={1} style={{ padding: 2 }}>{props.button}</Grid> : null}


        </Grid >
    );
}
