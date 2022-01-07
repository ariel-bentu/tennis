
import React, { useState, useEffect } from 'react';
import { Grid, Button } from '@material-ui/core';

import { Spacer, Loading, VBox, HBox, CircledValue, SmallText2, HSeparator, HBoxC, Picker } from './elem'

import * as api from './api'
import dayjs from 'dayjs'
import { DragHandle, EmojiEvents, SportsTennis, ThumbDown, ArrowBackIos, Sort } from '@material-ui/icons';


function enrichStats(stats, usersInfo, comp) {
    let _stats = stats.map(s => {
        let userInfo = usersInfo.find(ui => ui._ref.id === s._ref.id);
        if (userInfo && !userInfo.inactive) {
            return { ...s, ...userInfo };
        } else
            return undefined;
    }).filter(s2 => s2 !== undefined);

    _stats.sort(comp);
    return _stats;
}

const year = () => dayjs().format("YYYY")
const years = () => {
    const yearsArray = ["2021"]
    let y = 2021
    let endYear = parseInt(year());
    for (let yy = y + 1; yy <= endYear; yy++) {
        yearsArray.push(yy + "");
    }
    return yearsArray;
}

export default function Board({ UserInfo, notify }) {


    const [stats, setStats] = useState(undefined);
    const [sortByWins, setSortByWins] = useState(true);

    const [usersInfo, setUsersInfo] = useState(undefined);
    const [detailsFor, setDetailsFor] = useState(undefined);
    const [detailedStats, setDetailedStats] = useState(undefined);
    const [selectedYear, setSelectedYear] = useState(year());
    // eslint-disable-next-line no-unused-vars
    const [availableYears, setAvailableYears] = useState(years());
    // eslint-disable-next-line no-unused-vars
    const [refresh, setRefresh] = useState(1);

    const yearSuffix = (selectedYear === year() ? "" : selectedYear);
    const winsName = ["wins" + yearSuffix]
    const losesName = ["loses" + yearSuffix]
    const tiesName = ["ties" + yearSuffix]
    const elo = selectedYear === "2021" ? "elo2" : "elo1"

    const SortByWinsComp = (s1, s2) => {
        if (s1[winsName] !== s2[winsName])
            return s2[winsName] - s1[winsName];

        let games1 = s1[winsName] + s1[losesName] + s1[tiesName];
        let games2 = s2[winsName] + s2[losesName] + s2[tiesName];

        if (games1 !== games2) {
            return s2[winsName] / games2 - s1[winsName] / games1;
        }
        return 0;
    };

    useEffect(() => {
        if (UserInfo) {
            Promise.all(
                [
                    api.getCollection(api.Collections.STATS_COLLECTION),
                    api.getCollection(api.Collections.USERS_INFO_COLLECTION)
                ]).then(all => {
                    setUsersInfo(all[1]);

                    let _stats = enrichStats(all[0], all[1], SortByWinsComp);


                    setStats(_stats);

                },
                    (err) => {
                        notify.error(err.message);
                        setStats([]);
                    })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    useEffect(() => {
        if (stats) {
            setStats(_stats => {
                console.log("sort by ", sortByWins ? "wins" : "elo")
                _stats.sort(sortByWins ? SortByWinsComp : (s1, s2) => s2[elo] - s1[elo]);
                return _stats;
            })
            setRefresh(old => old + 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortByWins, stats, selectedYear]);

    useEffect(() => {
        if (detailsFor) {
            api.getDetailedStats(detailsFor.email, selectedYear).then(s => {
                let _stats = enrichStats(s, usersInfo, SortByWinsComp);
                setDetailedStats(_stats);
            });
        } else {
            setDetailedStats(undefined);
        }
        
    }, [detailsFor, usersInfo, selectedYear]);

    const statsToShow = detailsFor ? detailedStats : stats

    return (<VBox style={{ margin: 10 }}>
        {detailsFor && <HBoxC>
            <SmallText2
                textAlign="center"
                fontSize={20}
                backgroundColor="black"
                color="white"
                fontWeight="bold">{detailsFor.displayName}</SmallText2>
            <ArrowBackIos style={{ position: 'relative', left: 20, top: 0, width: 15, height: 30, color: 'white' }}
                onClick={() => setDetailsFor(undefined)} />
        </HBoxC>}
        
        <Grid container spacing={1} >
            {!detailsFor && <Grid container spacing={1} style={{alignItems:"flex-end"}}>
                <Grid item xs={4} >
                    <Picker values={availableYears} value={selectedYear} onChange={(val) => setSelectedYear(val)} />
                </Grid>
                <Grid item xs={1}  >
                    <Sort fontSize={'small'} style={{ color: sortByWins ? "red" : "black" }} onClick={() => setSortByWins(true)} />
                </Grid>
                <Grid item xs={3} />
                <Grid item xs={2}  >
                    <Sort fontSize={'small'} style={{ color: !sortByWins ? "red" : "black" }} onClick={() => setSortByWins(false)} />
                </Grid>

            </Grid>}
            <Spacer height={5}/>

            <Grid container spacing={1} style={{ fontSize: 12 }}>
                <Grid item xs={3}  >
                    {detailsFor && <SmallText2 textAlign="right">  מול  </SmallText2>}
                </Grid>
                <Grid item xs={1}  >
                    <SportsTennis fontSize={'small'} />
                </Grid>
                <Grid item xs={1}  >
                    <EmojiEvents fontSize={'small'} />
                </Grid>
                <Grid item xs={1}  >
                    <ThumbDown fontSize={'small'} />
                </Grid>
                <Grid item xs={1}  >
                    <DragHandle fontSize={'small'} />
                </Grid>
                <Grid item xs={1}  >
                    {"%"}
                </Grid>
                <Grid item xs={2} >
                    <a target="_blank" rel="noreferrer" href="https://en.wikipedia.org/wiki/Elo_rating_system">Elo rate</a>
                </Grid>

            </Grid>
            <HSeparator key={"sep"} />
            {statsToShow ? statsToShow.map((oneUserStats, i) => (
                [<Grid key={i} container spacing={1} style={{ fontSize: 12 }}>
                    <Grid item xs={3}  >
                        <HBox>
                            {detailsFor ? null : <CircledValue size={17}>{i + 1}</CircledValue>}
                            <Spacer />
                            <SmallText2>{oneUserStats.displayName}</SmallText2>
                        </HBox>
                    </Grid>
                    <Grid item xs={1}  >
                        {oneUserStats[winsName] + oneUserStats[losesName] + oneUserStats[tiesName]}
                    </Grid>
                    <Grid item xs={1}  >
                        {oneUserStats[winsName]}
                    </Grid>
                    <Grid item xs={1}  >
                        {oneUserStats[losesName]}
                    </Grid>
                    <Grid item xs={1}  >
                        {oneUserStats[tiesName]}
                    </Grid>
                    <Grid item xs={1}  >
                        {oneUserStats[winsName] + oneUserStats[losesName] + oneUserStats[tiesName] === 0 ? "0%" : (Math.floor((oneUserStats[winsName] / (oneUserStats[winsName] + oneUserStats[losesName] + oneUserStats[tiesName])) * 100) + "%")}
                    </Grid>
                    <Grid item xs={2}  >
                        {oneUserStats[elo]}
                    </Grid>
                    {detailsFor ? null :
                        <Grid item xs={1}  >
                            <Button variant="outlined" style={{ minWidth: '1rem', paddingBottom: 13, height: '1rem' }}
                                onClick={() => setDetailsFor(oneUserStats)}>...</Button>
                        </Grid>}


                </Grid>,
                <HSeparator key={"sep2"} />]
            )) : <Loading msg={detailsFor ?
                "מחשב נתונים עבור " + detailsFor.displayName :
                "טוען נתונים"} />}
        </Grid>
    </VBox>



    );
}
