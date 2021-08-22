import React, { useState, useEffect, useCallback } from 'react';
import {
    Button, Divider,
    TextField, Grid, InputBase
} from '@material-ui/core';

import {
    Paper1, VBox, HBox, Spacer,
    Header, Text, SmallText
} from './elem'

import { Sort } from '@material-ui/icons';
import * as api from './api'


export default function Users(props) {

    const [users, setUsers] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [addName, setAddName] = useState("");
    const [addEmail, setAddEmail] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [paymentUser, setPaymentUser] = useState(undefined);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentComment, setPaymentComment] = useState("");
    const [sortByRank, setSortByRank] = useState(false);
    

    useEffect(() => {
        api.getCollection(api.Collections.USERS_COLLECTION).then(u => setUsers(u))
    }, []);

    let updateUserValue = (email, fragment) => {
        setUsers(oldUsers => oldUsers.map(item =>
            item.email === email
                ? { ...item, ...fragment, dirty: true }
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
                <Grid container spacing={2} >
                    <Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                        <Grid item xs={condense ? 5 : 3}>
                            <HBox style={{ justifyContent: 'space-between' }}>
                                <SmallText>שם</SmallText>
                                <Sort onClick={()=>setSortByRank(false)}/>
                            </HBox>
                        </Grid>
                        {condense ? null : <Grid item xs={4}>אימייל</Grid>}
                        <Grid item xs={condense ? 3 : 2}>טלפון</Grid>
                        <Grid item xs={condense ? 2 : 1}>
                        <HBox style={{ justifyContent: 'space-between' }}>
                                <SmallText>דירוג</SmallText>
                                <Sort onClick={()=>setSortByRank(true)}/>
                            </HBox>
                        </Grid>
                        <Grid item xs={2}>
                            <VBox style={{ justifyContent: 'center' }}>
                                <Button variant="contained" onClick={() => setAddMode(true)}
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
                                                props.notify.success("נשמר בהצלחה");
                                                let updatedUsers = users.map(({ dirty, ...user }) => user);
                                                setUsers(updatedUsers);
                                            },
                                            (err) => props.notify.error(err.message)
                                        ).finally(
                                            () => setSubmitInProcess(false)
                                        );
                                    }
                                    }>שמור</Button>


                            </VBox>
                        </Grid>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider flexItem style={{ height: 2, backgroundColor: 'gray' }} />
                    </Grid>
                    {users.sort((u1,u2)=>sortByRank?(u1.rank-u2.rank):(u1.displayName > u2.displayName?1:-1)).map((user, i) => (<Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                        <Grid item xs={condense ? 5 : 3} style={{ paddingRight: 2, paddingLeft: 2 }}>
                            <InputBase
                                style={{ backgroundColor: '#F3F3F3' }}
                                fullWidth={true}
                                value={user.displayName}
                                onChange={e => updateUserValue(user.email, { displayName: e.currentTarget.value })}
                            />
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
                            <InputBase
                                style={{ backgroundColor: '#F3F3F3' }}
                                fullWidth={true}
                                value={user.rank}
                                onChange={e => updateUserValue(user.email, { rank: e.currentTarget.value })}
                            />
                        </Grid>
                        <Grid item xs={2}>
                            <VBox>
                                {/* <Button variant="contained" onClick={() => {
                                    props.notify.ask(`האם למחוק משמתמש ${user.displayName}?`, "מחיקת משתמש", [
                                        {
                                            caption: "מחק", callback: () => {
                                                api.deleteUser(user).then(
                                                    () => props.notify.success("נמחק בהצלחה"),
                                                    (err) => props.notify.error(err.toString())
                                                );
                                            }
                                        },
                                        { caption: "בטל", callback: () => { } },
                                    ])
                                }}> מחק</Button> */}

                                <Button variant="contained"
                                    style={{ fontSize: 12, height: '1.5rem', width: '2.5rem' }}
                                    onClick={() => {
                                        setPaymentUser(user);
                                        setPaymentAmount(0);
                                        setPaymentComment("");
                                    }}>תשלום</Button>
                            </VBox>
                        </Grid>
                    </Grid>))}
                </Grid>
            </VBox>
            : addMode ?
                <VBox>
                    <TextField required label="שם" onChange={(e) => setAddName(e.currentTarget.value)} />
                    <TextField required label="אימייל" onChange={(e) => setAddEmail(e.currentTarget.value)} />
                    <TextField required label="טלפון" onChange={(e) => setAddPhone(e.currentTarget.value)} />
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
                                    props.notify.success("נשמר בהצלחה")
                                    api.getCollection(api.Collections.USERS_COLLECTION).then(u => setUsers(u));
                                    setAddMode(false);
                                },
                                (err) => props.notify.error(err.message, "שמירה נכשלה")
                            );
                        }} >שמור</Button>
                        <Button variant="contained" onClick={() => setAddMode(false)} >בטל</Button>
                    </HBox>
                </VBox>
                :
                <VBox style={{ width: '100%' }}>
                    <Header>הזנת תשלום</Header>
                    <Text>{"עבור " + paymentUser.displayName}</Text>
                    <TextField required label="סכום" onChange={(e) => setPaymentAmount(e.currentTarget.value)} />
                    <TextField required label="הערה" onChange={(e) => setPaymentComment(e.currentTarget.value)} />
                    <Spacer height={20} />
                    <HBox>
                        <Button variant="contained" onClick={() => {
                            api.addPayment(paymentUser.email, paymentAmount, paymentComment).then(
                                () => {
                                    props.notify.success("תשלום נשמר בהצלחה")
                                    setPaymentUser(undefined);
                                },
                                (err) => props.notify.error(err.message, "שמירת תשלום נכשלה")
                            );
                        }} >שמור</Button>
                        <Spacer width={20} />
                        <Button variant="contained" onClick={() => setPaymentUser(undefined)} >בטל</Button>
                    </HBox>
                </VBox>

        }
    </Paper1 >
}