import React, { useState, useEffect, useCallback } from 'react';
import {
    Button, Divider,
    TextField, Grid, InputBase
} from '@material-ui/core';

import {
    Paper1, VBox, HBox, Spacer,
    Header, Text, SmallText, Search, SmallText2, HBoxSB
} from './elem'

import { Sort } from '@material-ui/icons';
import * as api from './api'


export default function Users(props) {

    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState(undefined);
    // eslint-disable-next-line no-unused-vars
    const [usersInfo, setUsersInfo] = useState(undefined);
    const [submitInProcess, setSubmitInProcess] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [addName, setAddName] = useState("");
    const [addEmail, setAddEmail] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [paymentUser, setPaymentUser] = useState(undefined);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentComment, setPaymentComment] = useState("");
    const [sortBy, setSortBy] = useState(0); // 0 is sortByName
    // eslint-disable-next-line no-unused-vars
    const [refresh, setRefresh] = useState(1);

    const getComparator = (_sortBy) => {
        switch (_sortBy) {
            case 0:
                return (u1, u2) => (u1.displayName > u2.displayName ? 1 : -1);
            case 1:
                return (u1, u2) => u1.rank - u2.rank;
            case 2:
                return (u1, u2) => u2._elo1 - u1._elo1;
            // case 3:
            //     return (u1, u2) => u2._elo2 - u1._elo2;
            default:
                return undefined;
        }
    }

    useEffect(() => {
        setUsers(u => {
            u.sort(getComparator(sortBy))
            return u;
        });

        setRefresh(old => old + 1);
    }, [sortBy]);

    useEffect(() => {
        Promise.all([
            api.getCollection(api.Collections.USERS_COLLECTION).then(u => {

                return u;
            }),
            api.getCollection(api.Collections.USERS_INFO_COLLECTION).then(ui => {
                setUsersInfo(ui)
                return ui;
            }),
            api.getCollection(api.Collections.STATS_COLLECTION)
        ]).then(all => {
            let u = all[0];
            u.forEach(oneUser => {
                let userInfo = all[1].find(ui => ui.email === oneUser.email);
                let userStats = all[2].find(us => us._ref.id === oneUser.email);
                if (!userInfo) {
                    oneUser._waitForApproval = true;
                } else {
                    if (userInfo.inactive) {
                        oneUser._inactive = true;
                    }
                }

                if (userStats) {
                    oneUser._elo1 = userStats.elo1;
                    oneUser._elo2 = userStats.elo2;
                }
            })
            u.sort(getComparator(sortBy));
            setUsers(u);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    let updateUserValue = (email, fragment, ignoreDirty) => {
        let dirtyObj = ignoreDirty ? {} : { dirty: true };
        setUsers(oldUsers => oldUsers.map(item =>
            item.email === email
                ? { ...item, ...fragment, ...dirtyObj }
                : item));
    }

    const isDirty = useCallback(() => {
        return users.some(u => u.dirty);
    },
        [users]);

    let width = props.windowSize.w;
    let condense = width < 600;

    return <Paper1 width={'100%'} height={'90%'}>
        {!addMode && !paymentUser ?
            <VBox style={{ width: '100%', margin: 10 }}>
                <HBoxSB>
                    <Search value={filter} onChange={val => setFilter(val)} />
                    <VBox>
                        <Button variant="contained"
                            onClick={() => setAddMode(true)}
                            style={{ height: '1.5rem', fontSize: 25, width: '2.5rem' }}>+</Button>
                        <Spacer />
                        <Button
                            style={{ fontSize: 15, height: '1.5rem', width: '2.5rem' }}
                            size={"large"}

                            variant="contained"
                            disabled={submitInProcess || !isDirty()} onClick={() => {
                                setSubmitInProcess(true);
                                api.saveUsers(users).then(
                                    () => {
                                        props.notify.success("???????? ????????????");
                                        let updatedUsers = users.map(({ dirty, ...user }) => user);
                                        setUsers(updatedUsers);
                                    },
                                    (err) => props.notify.error(err.message)
                                ).finally(
                                    () => setSubmitInProcess(false)
                                );
                            }
                            }>????????</Button>
                    </VBox>
                </HBoxSB>
                <Grid container spacing={2} >
                    <Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                        <Grid item xs={condense ? 5 : 3}>
                            <HBoxSB>
                                <SmallText>????</SmallText>
                                <Sort style={{ color: sortBy === 0 ? "red" : "black" }} onClick={() => setSortBy(0)} />
                            </HBoxSB>
                        </Grid>
                        {condense ? null : <Grid item xs={4}>????????????</Grid>}
                        <Grid item xs={condense ? 3 : 2}>??????????</Grid>
                        <Grid item xs={condense ? 2 : 1}>
                            <HBoxSB>
                                <SmallText>{"??????????"}</SmallText>
                                <Sort style={{ color: sortBy > 0 ? "red" : "black" }} onClick={() => setSortBy(oldSort => {
                                    let newSort = oldSort + 1;
                                    if (newSort > 2) {
                                        newSort = 1;
                                    }
                                    return newSort;
                                })} />
                            </HBoxSB>
                        </Grid>
                        
                    </Grid>
                    <Grid item xs={12}>
                        <Divider flexItem style={{ height: 2, backgroundColor: 'gray' }} />
                    </Grid>
                    {users.filter(u => filter ? u.displayName.includes(filter) : true).map((user, i) => (<Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                        <Grid item xs={condense ? 5 : 3} style={{ paddingRight: 2, paddingLeft: 2 }}>
                            <InputBase
                                style={{ backgroundColor: user._inactive || user._waitForApproval ? 'red' : '#F3F3F3' }}
                                fullWidth={true}
                                value={user.displayName}
                                onChange={e => updateUserValue(user.email, { displayName: e.currentTarget.value })}
                            />
                            {/* {user.dirty?"*":""} */}
                        </Grid>
                        {condense ? null : <Grid item xs={4} style={{ paddingRight: 2, paddingLeft: 8 }}>
                            <SmallText textAlign='end'>{user.email}</SmallText>
                        </Grid>}
                        <Grid item xs={condense ? 3 : 2} style={{ paddingRight: 2, paddingLeft: 2 }}>
                            <InputBase
                                style={{ backgroundColor: '#F3F3F3' }}
                                fullWidth={true}
                                value={user.phone}
                                onChange={e => updateUserValue(user.email, { phone: e.currentTarget.value })}
                            />
                        </Grid>
                        <Grid item xs={condense ? 2 : 1} style={{ paddingRight: 2, paddingLeft: 2 }}>
                            <VBox>
                                <InputBase
                                    style={{ backgroundColor: '#F3F3F3' }}
                                    fullWidth={true}
                                    value={user.rank}
                                    onChange={e => updateUserValue(user.email, { rank: e.currentTarget.value })}
                                />
                                <HBox>
                                    <SmallText2 textAlign={'center'} fontSize={12}>{user._elo1}n</SmallText2>
                                    <Spacer width={15} />
                                    <SmallText2 textAlign={'center'} fontSize={12}>{user._elo2}</SmallText2>
                                </HBox>
                            </VBox>
                        </Grid>
                        <Grid item xs={2}>
                            <VBox>

                                <Button variant="contained"
                                    style={{ fontSize: 12, height: '1.5rem', width: 100 }}
                                    onClick={() => {
                                        let action = user._waitForApproval ? "???????? ????????" : user._inactive
                                            ? "???????? ???????????? ????????" :
                                            "???????????? ????????"
                                        props.notify.ask(`?????? ${action} - ${user.displayName}?`, "", [
                                            {
                                                caption: "??????", callback: () => {
                                                    if (user._waitForApproval) {
                                                        api.activateUser(user, false, true).then(
                                                            () => {
                                                                props.notify.success("???????? ???????? ????????????")
                                                                updateUserValue(user.email, { _waitForApproval: false, _inactive: false }, true);
                                                            },
                                                            (err) => props.notify.error(err.toString())
                                                        );
                                                    } else if (user._inactive) {
                                                        api.activateUser(user, false, false).then(
                                                            () => {
                                                                props.notify.success("?????????? ???????????? ???????? ????????????");
                                                                updateUserValue(user.email, { _inactive: false }, true);
                                                            },
                                                            (err) => props.notify.error(err.toString())
                                                        );
                                                    } else {
                                                        api.activateUser(user, true, false).then(
                                                            () => {
                                                                props.notify.success("???????????? ?????????? ????????????");
                                                                updateUserValue(user.email, { _inactive: true }, true);
                                                            },
                                                            (err) => props.notify.error(err.toString())
                                                        );
                                                    }
                                                }
                                            },
                                            { caption: "??????", callback: () => { } },
                                        ])
                                    }}>{user._waitForApproval ? "?????? ??????????" : user._inactive
                                        ? "?????? ????????????" :
                                        "????????"}</Button>

                            </VBox>
                        </Grid>
                    </Grid>))}
                </Grid>
            </VBox>
            : addMode ?
                <VBox>
                    <TextField required label="????" onChange={(e) => setAddName(e.currentTarget.value)} />
                    <TextField required label="????????????" onChange={(e) => setAddEmail(e.currentTarget.value)} />
                    <TextField required label="??????????" onChange={(e) => setAddPhone(e.currentTarget.value)} />
                    <Spacer width={20} />
                    <HBox>
                        <Button variant="contained" onClick={() => {
                            let newUser = {
                                displayName: addName,
                                email: addEmail,
                                phone: addPhone
                            }
                            api.addUser(newUser).then(
                                () => {
                                    props.notify.success("???????? ????????????")
                                    api.getCollection(api.Collections.USERS_COLLECTION).then(u => {
                                        u.sort(getComparator(sortBy));
                                        setUsers(u);
                                    });
                                    setAddMode(false);
                                },
                                (err) => props.notify.error(err.message, "?????????? ??????????")
                            );
                        }} >????????</Button>
                        <Button variant="contained" onClick={() => setAddMode(false)} >??????</Button>
                    </HBox>
                </VBox>
                :
                <VBox style={{ width: '100%' }}>
                    <Header>???????? ??????????</Header>
                    <Text>{"???????? " + paymentUser.displayName}</Text>
                    <TextField required label="????????" onChange={(e) => setPaymentAmount(e.currentTarget.value)} />
                    <TextField required label="????????" onChange={(e) => setPaymentComment(e.currentTarget.value)} />
                    <Spacer height={20} />
                    <HBox>
                        <Button variant="contained" onClick={() => {
                            api.addPayment(paymentUser.email, paymentAmount, paymentComment).then(
                                () => {
                                    props.notify.success("?????????? ???????? ????????????")
                                    setPaymentUser(undefined);
                                },
                                (err) => props.notify.error(err.message, "?????????? ?????????? ??????????")
                            );
                        }} >????????</Button>
                        <Spacer width={20} />
                        <Button variant="contained" onClick={() => setPaymentUser(undefined)} >??????</Button>
                    </HBox>
                </VBox>

        }
    </Paper1 >
}