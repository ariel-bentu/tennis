
import React, { useState, useEffect } from 'react';

import {
    Spacer, Loading, VBox, Text, SmallText, SmallText2,
    HThinSeparator, HBox, getBallsIndicator, Card, SVGIcon
} from './elem'
import SetResults from './set-results';
import { getNiceDate } from './utils'
import * as api from './api'
import { AccessTime, LocationOn, Person } from '@material-ui/icons'
import { ToggleButtonGroup, ToggleButton } from '@material-ui/lab';
import PlaceBets from './place-bets';



export default function MyMatches({ UserInfo, notify, admin }) {


    const [matches, setMatches] = useState(undefined);
    // const [otherMatches, setOtherMatches] = useState(undefined);
    const [bets, setBets] = useState([]);
    const [placeBets, setPlaceBets] = useState(undefined);
    const [showMineOnly, setShowMineOnly] = useState(false);
    const [myMatches, setMyMatches] = useState(undefined);
    const [edit, setEdit] = useState(undefined);
    const [reload, setReload] = useState(1);
    // eslint-disable-next-line no-unused-vars
    const [refresh, setRefresh] = useState(1);
    const [usersWithBalls, setUsersWithBalls] = useState(undefined);

    useEffect(() => {
        if (UserInfo) {
            api.getCollection(api.Collections.MATCHES_COLLECTION, "date").then(
                mtchs => {
                    setMatches(mtchs);

                    let myM = mtchs.filter(m => {
                        for (let i = 1; i <= 4; i++) {
                            if (m["Player" + i] && m["Player" + i].email === UserInfo.email)
                                return true;
                        }
                        return false;
                    })
                    setMyMatches(myM);

                    api.getCollectionWithWhere(api.Collections.BETS_COLLECTION,
                        "matchID", "in", mtchs.map(u => u._ref.id)).then(_bets => {
                            // add numOfBets per game
                            mtchs.forEach(m => {
                                const matchBets = _bets.filter(bet => bet.matchID === m._ref.id);
                                m._numOfBets = matchBets.length;
                            })

                            setBets(_bets);
                        });


                    // let nonMy = mtchs.filter(m => !myM.find(mm => mm.id === m.id));
                    // setOtherMatches(nonMy);

                },
                (err) => {
                    notify.error(err.message);
                    setMatches([]);
                    setMyMatches([]);
                    // setOtherMatches([]);
                })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [UserInfo, reload])

    useEffect(() => {
        //Load balls list
        api.getUsersWithBalls().then(uwb => {
            setUsersWithBalls(uwb);
        })
    }, [reload]);

    const handleBetsDone = (newMyBet) => {
        setBets(_bets=>{
            let found = false;
            const newBets = _bets.map(b=>{
                if (newMyBet && b.email === newMyBet.email && b.matchID === newMyBet.matchID) {
                    found = true;
                    if (newMyBet.amount === 0) {
                        placeBets._numOfBets--;
                        return undefined;
                    } else {
                        return newMyBet;
                    }
                    
                } else {
                    return b;
                }
            });
            if (!found && newMyBet) {
                newBets.push(newMyBet);
                placeBets._numOfBets++;
            }
            
            return newBets.filter(b=>b !== undefined);
        });
        setPlaceBets(undefined);
    }

    useEffect(() => {
        if (usersWithBalls && usersWithBalls.docs.length > 0 && matches) {
            matches.forEach(m => {
                for (let i = 1; i <= 4; i++) {
                    if (m["Player" + i]) {
                        const oneUserWithBall = usersWithBalls.docs.find(u => u.data().email === m["Player" + i].email);
                        if (oneUserWithBall) {
                            m["Player" + i].balls = oneUserWithBall.data().balls;
                            //console.log("user with balls", m["Player" + i].displayName, m["Player" + i].balls);
                        }
                    }
                }
            })
            setRefresh(old => old + 1);
        }
    }, [usersWithBalls, matches]);

    return (
        placeBets ? <PlaceBets match={placeBets} onDone={handleBetsDone} bets={bets}
            UserInfo={UserInfo} notify={notify} /> :
            <div style={{ height: '100%', width: '100%', backgroundColor: "#F3F3F3" }}>
                <Spacer height={20} />
                {edit ?
                    <SetResults match={edit} notify={notify} onCancel={() => setEdit(undefined)}
                        onDone={(editedSet => {
                            setTimeout(() => setReload(r => r + 1), 4000);
                            setEdit(undefined);
                        })} isArchived={false} Admin={admin} /> :

                    matches ?
                        matches.length === 0 ?
                            <VBox><Text>אין משחקים עדיין</Text></VBox> :
                            <VBox>
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
                                <Spacer />
                                {/* <SmallText2 fontSize={18} textAlign="center">המשחקים שלי</SmallText2> */}
                                {showMineOnly ? myMatches && myMatches.length > 0 ? myMatches.map((match, i) => (
                                    <OneGame key={i} match={match} setEdit={setEdit} showSetResults={true} notify={notify}
                                        setPlaceBets={setPlaceBets} />)) :
                                    <SmallText2 fontSize={14} textAlign="center">אין</SmallText2> : null}
                                {/* <SmallText2 fontSize={18} textAlign="center">שאר המשחקים</SmallText2> */}
                                {!showMineOnly && matches ? matches.map((match, i) => (
                                    <OneGame key={i} match={match} setEdit={setEdit} showSetResults={admin === true || (myMatches && myMatches.find(mm=>mm._ref.id === match._ref.id))} notify={notify}
                                        setPlaceBets={setPlaceBets} />)) : null}
                            </VBox>
                        : <Loading msg="טוען משחקים" />
                }
            </div >
    );
}


function OneGame({ match, setEdit, showSetResults, notify, setPlaceBets }) {
    const foreColor = "#136BC4";
    return <Card>
        <SmallText color="gray">{match.Day + ", " + getNiceDate(match.date)}</SmallText>
        <HThinSeparator />
        <HBox style={{ width: "100%", justifyContent: "center" }}>
            <VBox>
                <AccessTime style={{ color: foreColor }} />
                <SmallText2 textAlign="center">{match.Hour}</SmallText2>
            </VBox>
            <Spacer width={20} />
            <VBox >
                <LocationOn style={{ color: foreColor }} />
                <SmallText2 textAlign="center">{match.Location}</SmallText2>
                <SmallText2 textAlign="center">{match.Court}</SmallText2>
            </VBox>
            <Spacer width={40} />
            <VBox style={{ width: "40%" }}>
                <HBox>
                    <Person style={{ color: foreColor }} />
                    <Person style={{ color: foreColor }} />
                </HBox>
                <HBox style={{ width: "100%", justifyContent: "center" }}>
                    {getBallsIndicator(match.Player1)}
                    <SmallText textAlign='center'>
                        {match.Player1 ? match.Player1.displayName : ""}
                    </SmallText>
                    <SmallText textAlign='center'>
                        {match.Player2 ? " ו" : ""}
                        {match.Player2 ? match.Player2.displayName : ""}
                    </SmallText>
                    {getBallsIndicator(match.Player2)}
                </HBox>
                <SmallText2 textAlign='center'>vs</SmallText2>
                <HBox style={{ width: "100%", justifyContent: "center" }}>
                    {getBallsIndicator(match.Player3)}
                    <SmallText textAlign='center'>
                        {match.Player3 ? match.Player3.displayName : ""}
                    </SmallText>
                    <SmallText textAlign='center'>
                        {match.Player4 ? " ו" : ""}
                        {match.Player4 ? match.Player4.displayName : ""}
                    </SmallText>
                    {getBallsIndicator(match.Player4)}
                </HBox>
            </VBox>
        </HBox>

        <VBox style={{ width: "100%" }}>
            <HThinSeparator />
            <HBox style={{ alignItems: "center" }}>
                {
                    showSetResults ?
                        [<SVGIcon key="1" svg="editResults" size={25}  onClick={() => setEdit(match)}  />,
                        <Spacer key="2" width={20} />] : null
                }
                <div style={{ display: 'flex', alignItems: "center" }}>
                <SVGIcon svg="bet" onClick={() => setPlaceBets(match)} size={20} style={{position:'relative', right:14}}/>
                    {/* <img src={betPlus} onClick={() => setPlaceBets(match)} style={{position:'relative', right:14, width: 20, height: 20, stroke: "gold" }} /> */}
                    {match._numOfBets && match._numOfBets > 0 ? <SmallText2>{match._numOfBets}</SmallText2> : null}
                </div>
            </HBox>
        </VBox>
    </Card>
}