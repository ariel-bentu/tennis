
import React, { useState, useEffect } from 'react';
import { Grid, Button } from '@material-ui/core';

import { Spacer, Loading, VBox, HBox, CircledValue, SmallText2, HSeparator } from './elem'

import * as api from './api'
import { DragHandle, EmojiEvents, SportsTennis, ThumbDown, ArrowBackIos } from '@material-ui/icons';

function enrichStats(stats, usersInfo) {
    let _stats = stats.map(s => {
        let userInfo = usersInfo.find(ui => ui._ref.id === s._ref.id);
        if (userInfo && !userInfo.inactive) {
            return { ...s, ...userInfo };
        } else
            return undefined;
    }).filter(s2 => s2 !== undefined);

    _stats.sort((s1, s2) => {
        if (s1.wins !== s2.wins)
            return s2.wins - s1.wins;

        let games1 = s1.wins + s1.loses + s1.ties;
        let games2 = s2.wins + s2.loses + s2.ties;

        if (games1 !== games2) {
            return s2.wins / games2 - s1.wins / games1;
        }
        return 0;
    })
    return _stats;
}

export default function Board({ UserInfo, notify }) {


    const [stats, setStats] = useState(undefined);
    const [usersInfo, setUsersInfo] = useState(undefined);
    const [detailsFor, setDetailsFor] = useState(undefined);
    const [detailedStats, setDetailedStats] = useState(undefined);

    useEffect(() => {
        if (UserInfo) {
            Promise.all(
                [
                    api.getCollection(api.Collections.STATS_COLLECTION),
                    api.getCollection(api.Collections.USERS_INFO_COLLECTION)
                ]).then(all => {
                    setUsersInfo(all[1]);

                    let _stats = enrichStats(all[0], all[1]);


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
        if (detailsFor) {
            api.getDetailedStats(detailsFor.email).then(s => {
                let _stats = enrichStats(s, usersInfo);
                setDetailedStats(_stats);
            });
        } else {
            setDetailedStats(undefined);
        }
    }, [detailsFor, usersInfo]);

    const statsToShow = detailsFor ? detailedStats : stats

    return (<VBox style={{ margin: 10 }}>
        {detailsFor ? <HBox style={{ width: "100%" }}>
            <SmallText2
                textAlign="center"
                fontSize={20}
                backgroundColor="black"
                color="white"
                fontWeight="bold">{detailsFor.displayName}</SmallText2>
            <ArrowBackIos style={{ position: 'relative', left: 20, top: 0, width: 15, height: 30, color: 'white' }}
                onClick={() => setDetailsFor(undefined)} />
        </HBox> : null}
        <Spacer height={5} />
        <Grid container spacing={1} >
            <Grid key={0} container spacing={1} style={{ fontSize: 12 }}>
                <Grid item xs={3} alignContent={'flex-start'} >
                    {detailsFor?<SmallText2 textAlign="right">  מול  </SmallText2>:null}
                </Grid>
                <Grid item xs={1} alignContent={'flex-start'} >
                    <SportsTennis fontSize={'small'} />
                </Grid>
                <Grid item xs={1} alignContent={'flex-start'} >
                    <EmojiEvents fontSize={'small'} />
                </Grid>
                <Grid item xs={1} alignContent={'flex-start'} >
                    <ThumbDown fontSize={'small'} />
                </Grid>
                <Grid item xs={1} alignContent={'flex-start'} >
                    <DragHandle fontSize={'small'} />
                </Grid>
                <Grid item xs={1} alignContent={'flex-start'} >
                    {"%"}
                </Grid>
                <Grid item xs={2} alignContent={'center'} >
                    <a target="_blank" rel="noreferrer" href="https://en.wikipedia.org/wiki/Elo_rating_system">Elo rate</a>
                </Grid>

            </Grid>
            <HSeparator key={1} />
            {statsToShow ? statsToShow.map((oneUserStats, i) => (
                [<Grid key={0} container spacing={1} style={{ fontSize: 12 }}>
                    <Grid item xs={3} alignContent={'flex-start'} >
                        <HBox>
                            {detailsFor ? null : <CircledValue size={17}>{i + 1}</CircledValue>}
                            <Spacer />
                            <SmallText2>{oneUserStats.displayName}</SmallText2>
                        </HBox>
                    </Grid>
                    <Grid item xs={1} alignContent={'flex-start'} >
                        {oneUserStats.wins + oneUserStats.loses + oneUserStats.ties}
                    </Grid>
                    <Grid item xs={1} alignContent={'flex-start'} >
                        {oneUserStats.wins}
                    </Grid>
                    <Grid item xs={1} alignContent={'flex-start'} >
                        {oneUserStats.loses}
                    </Grid>
                    <Grid item xs={1} alignContent={'flex-start'} >
                        {oneUserStats.ties}
                    </Grid>
                    <Grid item xs={1} alignContent={'flex-start'} >
                        {oneUserStats.wins + oneUserStats.loses + oneUserStats.ties === 0 ? "0%" : (Math.floor((oneUserStats.wins / (oneUserStats.wins + oneUserStats.loses + oneUserStats.ties)) * 100) + "%")}
                    </Grid>
                    <Grid item xs={2} alignContent={'center'} >
                        {oneUserStats.elo1}
                    </Grid>
                    {detailsFor ? null :
                        <Grid item xs={1} alignContent={'center'} >
                            <Button variant="outlined" style={{ minWidth: '1rem', paddingBottom: 13, height: '1rem' }}
                                onClick={() => setDetailsFor(oneUserStats)}>...</Button>
                        </Grid>}


                </Grid>,
                <HSeparator key={1} />]
            )) : <Loading msg={detailsFor ?
                "מחשב נתונים עבור " + detailsFor.displayName :
                "טוען נתונים"} />}
        </Grid>
    </VBox>



    );
}
