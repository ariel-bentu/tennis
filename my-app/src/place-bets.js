import { Grid } from '@material-ui/core';
import { Check, Close, EmojiEventsOutlined } from '@material-ui/icons';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import React, { useState, useEffect, useCallback } from 'react';
import { HBox, HThinSeparator, SmallText2, Spacer, Card, SVGIcon } from './elem';
import * as api from './api'



export default function PlaceBets({ UserInfo, onDone, match, bets, notify }) {
    const [matchBets, setMatchBets] = useState([]);
    const [myBet, setMyBet] = useState(undefined);
    const [myEditedBet, setMyEditedBet] = useState(undefined);
    const [submitInProcess, setSubmitInProcess] = useState(false);

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
    }, [match, bets]);


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
    }, [myBet, myEditedBet])

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

        setMyEditedBet({ ...editedBet, amount: newAmount });
    }, [myBet, myEditedBet])
    const actualMyBet = myEditedBet ? myEditedBet : myBet;
    const whoWins = actualMyBet ? actualMyBet.winner : 0;

    return (
        <div style={{ width: '100%', height: "100vh", backgroundColor: "#F3F3F3" }}>
            <HBox style={{ width: "100%", backgroundColor: 'black' }}>
                <SmallText2
                    textAlign="center"
                    fontSize={20}
                    backgroundColor="black"
                    color="white"
                    fontWeight="bold">הימורים - preview</SmallText2>
                <Close style={{ position: 'relative', left: 10, width: 15, height: 30, color: 'white' }}
                    onClick={()=>onDone(myBet)} />
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
                        <Grid item xs={5} alignContent={'flex-start'} >

                        </Grid>
                        <Grid item xs={4} alignContent={'flex-start'} >
                            <Spacer />
                            <HBox style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <SVGIcon svg="betPlus" onClick={() => setMyAmount(true)} size={20} />
                                <SmallText2 textAlign="center" width={40}>{actualMyBet ? actualMyBet.amount : ""}</SmallText2>
                                <SVGIcon svg="betMinus" onClick={() => setMyAmount(false)} size={20} />
                            </HBox>
                            <Spacer />
                        </Grid>

                        <Grid item xs={2} alignContent={'flex-start'} >
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