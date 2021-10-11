
import React, { useState, useEffect } from 'react';
import { Grid } from '@material-ui/core';

import { Spacer, Loading, VBox, HBox, CircledValue, SmallText2, HSeparator } from './elem'

import * as api from './api'
import { DragHandle, EmojiEvents, SportsTennis, ThumbDown } from '@material-ui/icons';





export default function Board({ UserInfo, notify }) {


    const [stats, setStats] = useState(undefined);

    useEffect(() => {
        if (UserInfo) {
            Promise.all(
                [
                    api.getCollection(api.Collections.STATS_COLLECTION),
                    api.getCollection(api.Collections.USERS_INFO_COLLECTION)
                ]).then(all => {
                    let _stats = all[0].map(s => {
                        let userInfo = all[1].find(ui => ui._ref.id === s._ref.id);
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
                    setStats(_stats);

                },
                    (err) => {
                        notify.error(err.message);
                        setStats([]);
                    })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    return (
        stats ?
            <VBox style={{ margin: 10 }}>
                <Spacer />
                <Grid container spacing={1} >
                    <Grid key={0} container spacing={1} style={{ fontSize: 12 }}>
                        <Grid item xs={3} alignContent={'flex-start'} >

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

                    </Grid>
                    <HSeparator key={1} />
                    {stats.map((oneUserStats, i) => (
                        [<Grid key={0} container spacing={1} style={{ fontSize: 12 }}>
                            <Grid item xs={3} alignContent={'flex-start'} >
                                <HBox>
                                    <CircledValue size={17}>{i + 1}</CircledValue>
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
                                {oneUserStats.wins + oneUserStats.loses + oneUserStats.ties === 0? "0%": (Math.floor((oneUserStats.wins / (oneUserStats.wins + oneUserStats.loses + oneUserStats.ties)) * 100) + "%")}
                            </Grid>

                        </Grid>,
                        <HSeparator key={1} />]
                    ))}
                </Grid>
            </VBox>
            : <Loading msg="טוען משחקים" />


    );
}
