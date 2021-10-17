import React, { useState, useEffect } from 'react';
import {
    Button, Divider,
    TextField, Grid
} from '@material-ui/core';

import {
    Paper1, VBox, HBox, Spacer,
    SmallText, Search
} from './elem'

import { Sort } from '@material-ui/icons';
import * as api from './api'

export default function BallsAdmin(props) {

    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState(undefined);

    const [sortByBalls, setSortByBalls] = useState(true);

    // eslint-disable-next-line no-unused-vars 
    const [refresh, setRefresh] = useState(1);

    const getComparator = (byBalls) => {
        return byBalls ?
            (u1, u2) => {
                if (u1.balls && u2.balls) return u2.balls - u1.balls;
                if (!u2.balls) return -1;
                if (!u1.balls) return 1;
                return 1;
            } :
            (u1, u2) => (u1.displayName > u2.displayName ? 1 : -1)
    }

    useEffect(() => {
        setUsers(u => {
            console.log("Sort by" + (sortByBalls ? " balls" : " name"))
            u.sort(getComparator(sortByBalls));
            return u;
        });
        setRefresh(old => old + 1);

    }, [sortByBalls]);

    useEffect(() => {
        return api.getCollection(api.Collections.USERS_INFO_COLLECTION).then(u => {
            u.sort(getComparator(sortByBalls));
            setUsers(u);
        });

    }, []);

    const setUserBalls = (email, delta) => setUsers(u => u.map(u2 => u2.email === email ? { ...u2, balls: (u2.balls ? u2.balls + delta : delta) } : u2));

    let width = props.windowSize.w;
    let condense = width < 600;

    return <Paper1 width={'100%'} height={'90%'}>

        <VBox style={{ width: '100%', margin: 10 }}>
            <Search value={filter} onChange={val => setFilter(val)} />

            <Grid container spacing={2} >
                <Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                    <Grid item xs={condense ? 5 : 3}>
                        <HBox style={{ justifyContent: 'space-between' }}>
                            <SmallText>שם</SmallText>
                            <Sort onClick={() => setSortByBalls(false)} />
                        </HBox>
                    </Grid>


                    <Grid item xs={condense ? 2 : 2}>
                        <HBox style={{ justifyContent: 'space-between' }}>
                            <SmallText>כדורים</SmallText>
                            <Sort onClick={() => setSortByBalls(true)} />
                        </HBox>
                    </Grid>

                </Grid>
                <Grid item xs={12}>
                    <Divider flexItem style={{ height: 2, backgroundColor: 'gray' }} />
                </Grid>
                {users.filter(u => filter ? u.displayName.includes(filter) : true).map((user, i) => (
                    <Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                        <Grid item xs={condense ? 5 : 3} style={{ paddingRight: 2, paddingLeft: 2 }}>
                            <SmallText>{user.displayName}</SmallText>
                        </Grid>
                        <Grid item xs={condense ? 2 : 1} style={{ paddingRight: 2, paddingLeft: 2 }}>
                            <SmallText><div dir="ltr">{user.balls && user.balls>0?user.balls:""}</div></SmallText>
                        </Grid>
                        <Grid item xs={2}>
                            <HBox>
                                <Button variant={"contained"} style={{ fontSize: 25, height: "1.5rem", width: "1.5rem" }}
                                    onClick={() => api.setBallsAmount(user.email, user.balls, 1).then(
                                        () => setUserBalls(user.email, 1),
                                        (err) => props.notify.error(err.message)
                                    )}>+</Button>
                                <Spacer width={20} />
                                <Button variant={"contained"} style={{ fontSize: 25, height: "1.5rem", width: "1.5rem" }}
                                    onClick={() => {
                                        api.setBallsAmount(user.email, user.balls, -1).then(
                                            () => setUserBalls(user.email, -1),
                                            (err) => props.notify.error(err.message)
                                        )
                                    }}>-</Button>
                            </HBox>
                        </Grid>
                    </Grid>))}
            </Grid>
        </VBox>


    </Paper1 >
}