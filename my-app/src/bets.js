import { documentId } from 'firebase/firestore/lite';
import { Grid } from "@material-ui/core";
import { EmojiEvents, Person, SentimentVeryDissatisfied, SentimentVerySatisfied, ThumbDown, ThumbUp } from "@material-ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import React, { useEffect, useState } from "react";
import * as api from './api'
import { Card, HBox, HBoxC, HSeparator, HThinSeparator, Loading, Picker, SmallText, SmallText2, Spacer, SVGIcon, VBox, VBoxC } from "./elem";
import { getNiceDate, year, years } from "./utils";

const getComparator = () => {
    return (u1, u2) => u2.total - u1.total;
}

export function Bets(props) {
    const [availableYears, setAvailableYears] = useState(years());
    const [selectedYear, setSelectedYear] = useState(year());
    const [bets, setBets] = useState([]);
    const [viewMyBets, setViewMyBets] = useState(false);
    const [usersInfo, setUsersInfo] = useState([]);
    const [myBets, setMyBets] = useState(undefined);
    const [myArchiveBets, setMyArchiveBets] = useState(undefined);

    useEffect(() => {
        Promise.all([
            api.getCollection(api.Collections.USERS_INFO_COLLECTION),
            api.getCollection(api.Collections.BETS_STATS_COLLECTION),
            api.getCollection(api.Collections.BETS_COLLECTION),
        ]).then(all => {
            const users = all[0];
            const betsStats = all[1];
            const allBets = all[2];

            users.forEach(oneUser => {
                let userBet = betsStats.find(betStat => betStat._ref.id === oneUser.email);
                if (!userBet) {
                    betsStats.push({
                        displayName: oneUser.displayName,
                        total: 0,
                        wins: 0,
                        loses: 0,
                        inactive: false,
                        _ref: { id: oneUser.email }
                    })
                } else {
                    const betSum = allBets.filter(bet => bet.email === oneUser.email).reduce((prev, curr) => prev + curr.amount, 0);
                    userBet.displayName = oneUser.displayName;
                    userBet.inactive = oneUser.inactive;
                    userBet.openBets = betSum;
                }
            })
            betsStats.sort(getComparator());

            let place = 1;
            for (let i = 0; i < betsStats.length; i++) {
                betsStats[i].place = place;
                if (i + 1 < betsStats.length && betsStats[i + 1].total < betsStats[i].total) {
                    place++;
                }
            }

            setBets(betsStats.filter(b => b.inactive === false));
            setUsersInfo(users);
        });
    }, []);


    useEffect(() => {
        if (viewMyBets && !myBets) {
            const email = props.UserInfo.email;
            Promise.all([
                api.getCollectionWithWhere(api.Collections.BETS_COLLECTION, "email", "==", email),
                api.getCollectionWithWhere(api.Collections.BETS_ARCHIVE_COLLECTION, "email", "==", email, "date", true, 10),
            ])
                .then(all => {
                    const _myBets = all[0];
                    const _archiveBets = all[1];

                    const matchIDs = _myBets.map(b => b.matchID);
                    const matchArchiveIDs = _archiveBets.map(ab => ab.matchID);
                    const enrich = (bets, matches) => bets.map(bet => {
                        const match = matches.find(m => m._ref.id === bet.matchID)
                        if (match) {
                            return { match: match, ...bet };
                        }
                        return undefined;
                    }).filter(b => b !== undefined);

                    if (matchIDs?.length > 0) {
                        api.getCollectionWithWhere(api.Collections.MATCHES_COLLECTION, documentId(), "in", matchIDs)
                            .then(_matches => {
                                const bb = enrich(_myBets, _matches);
                                setMyBets(bb)
                            });
                    } else {
                        setMyBets([]);
                    }
                    if (matchArchiveIDs?.length > 0) {
                        console.log("archiveIDs", matchArchiveIDs)
                        api.getCollectionWithWhere(api.Collections.MATCHES_ARCHIVE_COLLECTION, documentId(), "in", matchArchiveIDs)
                            .then(_archiveMatches => {
                                const bb = enrich(_archiveBets, _archiveMatches);
                                setMyArchiveBets(bb)
                            });
                    } else {
                        setMyArchiveBets([]);
                    }
                });
        }
    }, [viewMyBets, myBets])

    return <VBox style={{ backgroundColor: "#F3F3F3", width: "96%", padding: "2%" }} >
        <Spacer />
        <Grid container spacing={1} >
            <Grid container spacing={1} style={{ alignItems: "flex-end" }}>

                <Grid item xs={8}  >
                    <div dir="ltr">
                        <ToggleButtonGroup
                            color="primary"
                            value={viewMyBets ? "mine" : "all"}
                            exclusive
                            onChange={() => setViewMyBets(old => !old)}
                        >
                            <ToggleButton value="mine">הימורים שלי</ToggleButton>
                            <ToggleButton value="all">לוח</ToggleButton>
                        </ToggleButtonGroup>
                    </div>
                </Grid>
                <Grid item xs={3} >
                    <Picker values={availableYears} value={selectedYear} onChange={(val) => setSelectedYear(val)} />
                </Grid>


            </Grid>
            <Spacer height={15} />
            {!viewMyBets && <VBoxC>
                <Grid container spacing={1} style={{ fontSize: 12 }}>
                    <Grid item xs={1}  >
                        <SmallText2 textAlign="right">  #  </SmallText2>
                    </Grid>
                    <Grid item xs={3}  >
                        <SmallText2 textAlign="right">  שם  </SmallText2>
                    </Grid>
                    <Grid item xs={2}  >
                        <SmallText2 textAlign="center">=</SmallText2>
                    </Grid>
                    <Grid item xs={1}  >
                        <ThumbUp fontSize={'small'} />
                    </Grid>
                    <Grid item xs={1}  >
                        <ThumbDown fontSize={'small'} />
                    </Grid>
                    <Grid item xs={3}  >
                        <SmallText2 textAlign="center">פתוח</SmallText2>
                    </Grid>
                </Grid>
                <HSeparator key={"sep"} />
                {bets && bets.map((oneBet, i) => (
                    [<Grid key={i} container spacing={1} style={{ fontSize: 12 }}>
                        <Grid item xs={1}  >
                            <SmallText2>{oneBet.place}</SmallText2>
                        </Grid><Grid item xs={3}  >
                            <SmallText2>{oneBet.displayName}</SmallText2>
                        </Grid>
                        <Grid item xs={2}  >
                            {oneBet.total}
                        </Grid>

                        <Grid item xs={1}  >
                            {oneBet.wins}
                        </Grid>
                        <Grid item xs={1}  >
                            {oneBet.loses}
                        </Grid>
                        <Grid item xs={3}  >
                            <SmallText2 textAlign="center">{oneBet.openBets > 0 ? oneBet.openBets : ""}</SmallText2>
                        </Grid>
                    </Grid>,
                    <HSeparator key={"sep2"} />]
                ))
                }
            </VBoxC>
            }

            {viewMyBets && <VBoxC>
                <SmallText2 fontSize={25}>הימורים פתוחים</SmallText2>
                <HSeparator />

                {!myBets && <Loading msg={"טוען..."} />}
                {myBets && (myBets.length === 0 ?
                    <SmallText2 fontSize={18}>אין</SmallText2> :
                    myBets.map((bet, i) => (
                        bet.match ? <OneGame key={i} match={bet.match} bet={bet} /> : <SmallText key={i}>missing: {JSON.stringify(bet)}</SmallText>)
                    ))
                }
                <Spacer />
                <HBox style={{ width: "100%", alignItems: 'center' }}>
                    <SmallText2 fontSize={25}>הימורים קודמים</SmallText2>
                    <SmallText2 fontSize={12}>last 10</SmallText2>
                </HBox>
                <HSeparator />
                {!myArchiveBets && <Loading msg={"טוען..."} />}
                {myArchiveBets && (myArchiveBets.length === 0 ?
                    <SmallText2 fontSize={18}>אין</SmallText2> :
                    myArchiveBets.map((bet, i) => (
                        bet.match ? <OneGame key={i} match={bet.match} bet={bet} /> : <SmallText>חסר</SmallText>)
                    ))
                }
            </VBoxC>
            }
        </Grid>
    </VBox>
}


function OneGame({ match, bet }) {
    const foreColor = "#136BC4";

    return <Card>
        <SmallText color="gray">{match.Day + ", " + getNiceDate(match.date)}</SmallText>
        <HThinSeparator />
        <HBox style={{ width: '100%', justifyContent: "space-between" }}>
            <VBox style={{ width: "20%" }}>
                {/* <AttachMoney style={{ color: foreColor }} /> */}
                <SVGIcon svg={"betWithColor"} size={22} color={"foreColor"} />
                <SmallText2 fontSize={20} textAlign="center">{bet.amount}</SmallText2>
                <Spacer height={30} />
                {bet.win !== undefined && (bet.win ? <SentimentVerySatisfied fontSize={'large'} color={'primary'} /> : <SentimentVeryDissatisfied fontSize={'large'} color={'error'} />)}
            </VBox>

            <VBox style={{ width: "60%" }}>
                <HBox>
                    <Person style={{ color: foreColor }} />
                    <Person style={{ color: foreColor }} />
                </HBox>
                <HBoxC>
                    {bet.winner === 1 ? <EmojiEvents style={{ color: foreColor }} /> : <Spacer width={10} />}
                    <SmallText textAlign='center'>
                        {match.Player1 ? match.Player1.displayName : ""}
                    </SmallText>
                    <SmallText textAlign='center'>
                        {match.Player2 ? " ו" : ""}
                        {match.Player2 ? match.Player2.displayName : ""}
                    </SmallText>
                </HBoxC>
                <SmallText2 textAlign='center'>vs</SmallText2>
                <HBoxC>
                    {bet.winner === 2 ? <EmojiEvents style={{ color: foreColor }} /> : <Spacer width={10} />}
                    <SmallText textAlign='center'>
                        {match.Player3 ? match.Player3.displayName : ""}
                    </SmallText>
                    <SmallText textAlign='center'>
                        {match.Player4 ? " ו" : ""}
                        {match.Player4 ? match.Player4.displayName : ""}
                    </SmallText>
                </HBoxC>
            </VBox>
        </HBox>
    </Card>
}