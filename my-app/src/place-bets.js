import { Grid } from '@material-ui/core';
import { Check, Close, EmojiEventsOutlined, Lock } from '@material-ui/icons';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import React, { useState, useEffect, useCallback } from 'react';
import { HBox, HThinSeparator, SmallText2, Spacer, Card, SVGIcon, HBoxC } from './elem';
import * as api from './api'
import dayjs from 'dayjs';



export default function PlaceBets({ UserInfo, onDone, match, bets, notify }) {
    const [matchBets, setMatchBets] = useState([]);
    const [myBet, setMyBet] = useState(undefined);
    const [myEditedBet, setMyEditedBet] = useState(undefined);
    const [submitInProcess, setSubmitInProcess] = useState(false);
    const [tokens, setTokens] = useState(0);
    const [locked, setLocked] = useState(false);

    useEffect(() => {
        if (bets && match) {
            let _matchBets = bets.filter(b => b.matchID === match._ref.id);
            const _myBet = _matchBets.find(b => b.email === UserInfo.email);

            setMyBet(_myBet);
            if (_myBet) {
                _matchBets = _matchBets.filter(m => m.email !== UserInfo.email);
            }
            setMatchBets(_matchBets);
        }
        api.getAvailableTokens(UserInfo.email).then(tokens => {
            setTokens(tokens);
        })

        // If match started - lock it
        if (dayjs(match.date + " " + match.Hour).isBefore(dayjs())) {
            setLocked(true);
        }

    }, [match, bets, UserInfo.email]);


    const getNames = useCallback((pairNum) => {
        if (!match) return "";

        const firstId = pairNum === 1 ? 1 : 3;
        let names = "";
        if (match["Player" + firstId]) {
            names += match["Player" + firstId].displayName;
            if (match["Player" + (firstId + 1)]) {
                names += " ו" + match["Player" + (firstId + 1)].displayName;
            }
        }
        return names;
    },
        [match]);

    const isDirty = () => {
        if (!myEditedBet) return false;
        if (!myBet) return (myEditedBet.amount > 0);

        return myBet.amount !== myEditedBet.amount || myBet.winner !== myEditedBet.winner;
    }

    const setMyWinner = useCallback((winner) => {
        let editedBet = myEditedBet;
        if (editedBet === undefined) {
            editedBet = myBet;
            if (editedBet === undefined) {
                editedBet = {
                    email: UserInfo.email,
                    displayName: UserInfo.displayName,
                    matchID: match._ref.id,
                    amount: 0,
                }
            }
        }
        setMyEditedBet({ ...editedBet, winner });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myBet, myEditedBet, UserInfo, match])

    const setMyAmount = useCallback((increase) => {
        let editedBet = myEditedBet;
        if (editedBet === undefined) {
            editedBet = myBet;
            if (editedBet === undefined) {
                editedBet = {
                    email: UserInfo.email,
                    displayName: UserInfo.displayName,
                    matchID: match._ref.id,
                    winner: 1,
                    amount: 0,
                }
            }
        }
        let newAmount = increase ? editedBet.amount + 50 : editedBet.amount - 50;
        if (newAmount < 0) {
            newAmount = 0;
        }
        if (newAmount > tokens) {
            notify.error(" עברת את מכסת הטוקנים שלך");
            return;
        }

        setMyEditedBet({ ...editedBet, amount: newAmount });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myBet, myEditedBet, UserInfo, tokens])
    const actualMyBet = myEditedBet ? myEditedBet : myBet ? myBet : { amount: 0 };
    const deltaBet = myBet ? actualMyBet.amount - myBet.amount : actualMyBet.amount;
    const whoWins = actualMyBet ? actualMyBet.winner : 0;

    return (
        <div style={{ width: '100%', height: "100vh", backgroundColor: "#F3F3F3" }}>
            <HBox style={{ width: "100%", backgroundColor: 'black' }}>
                <SmallText2
                    textAlign="center"
                    fontSize={20}
                    backgroundColor="black"
                    color="white"
                    fontWeight="bold">מי ינצח?</SmallText2>
                <Close style={{ position: 'relative', left: 10, width: 15, height: 30, color: 'white' }}
                    onClick={() => onDone(myBet)} />
            </HBox>


            <Spacer height={20} />
            <Grid container spacing={1} >
                <Grid container spacing={1} >
                    <Grid item xs={3} alignContent={'flex-start'} >

                    </Grid>
                    <Grid item xs={4} alignContent={'flex-start'} >
                        {getNames(1)}
                    </Grid>

                    <Grid item xs={4} alignContent={'flex-start'} >
                        {getNames(2)}
                    </Grid>
                </Grid>
                <Spacer />
                <Card>
                    <Grid container spacing={1} >
                        <Grid item xs={3} style={{ alignSelf: 'center' }} >
                            <SmallText2 textAlign="center" fontSize={15}>אני</SmallText2>
                        </Grid>
                        <Grid item xs={8} alignContent={'flex-start'} >
                            <Spacer height={20} />
                            <ToggleButtonGroup
                                color="primary"
                                style={{ width: "100%" }}
                                value={whoWins === 1 ? "pair1" : whoWins === 2 ? "pair2" : ""}
                                exclusive
                                onChange={(e, val) => { setMyWinner(val === "pair1" ? 1 : 2) }}
                            >
                                <ToggleButton style={{ width: "50%" }} value="pair1"><EmojiEventsOutlined /></ToggleButton>
                                <ToggleButton style={{ width: "50%" }} value="pair2"><EmojiEventsOutlined /></ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>

                    </Grid>

                    <Grid container spacing={1} >
                        <Grid item xs={5} alignContent={'center'} >
                            <SmallText2 textAlign="center" width={80}>יתרה: {tokens - deltaBet}</SmallText2>
                        </Grid>
                        <Grid item xs={4} alignContent={'flex-start'} >
                            <Spacer />
                            <HBoxC>
                                <SVGIcon svg="betPlus" onClick={() => !locked && setMyAmount(true)} size={20} />
                                <SmallText2 textAlign="center" width={40}>{actualMyBet ? actualMyBet.amount : ""}</SmallText2>
                                <SVGIcon svg="betMinus" onClick={() => !locked && setMyAmount(false)} size={20} />
                            </HBoxC>
                            <Spacer />
                        </Grid>

                        <Grid item xs={2} alignContent={'flex-start'} >
                            {locked && <Lock />}
                            {isDirty() ? <Check onClick={() => {
                                if (!submitInProcess) {
                                    setSubmitInProcess(true);
                                    notify.progress();
                                    api.placeBet(myEditedBet).then(
                                        () => {
                                            notify.success("נשמר בהצלחה");
                                            setMyBet(myEditedBet);
                                            setMyEditedBet(undefined);
                                            setSubmitInProcess(false);
                                            onDone(myEditedBet);
                                        },
                                        (err) => {
                                            notify.error(err.message);
                                            setSubmitInProcess(false);
                                        }
                                    )
                                }
                            }} /> : null}
                        </Grid>
                    </Grid>
                </Card>
                <Spacer />
                {matchBets.map(matchBet => (
                    [<Grid key="1" container spacing={1} >
                        <Grid item xs={3} alignContent={'flex-start'} >
                            <SmallText2 textAlign="center" fontSize={15}>{matchBet.displayName}</SmallText2>
                        </Grid>
                        <Grid item xs={4} alignContent={'flex-start'} >
                            {matchBet.winner === 1 ? matchBet.amount : ""}
                        </Grid>
                        <Grid item xs={4} alignContent={'flex-start'} >
                            {matchBet.winner === 2 ? matchBet.amount : ""}
                        </Grid>

                    </Grid>,
                    <HThinSeparator key="2" />
                    ]))}
            </Grid>


        </div>);
}