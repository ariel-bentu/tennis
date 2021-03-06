import React, { useState, useEffect } from 'react';
import {
    Button, Divider,
    TextField, Grid
} from '@material-ui/core';

import {
    Paper1, VBox, HBox, Spacer,
    Header, Text, SmallText, Search, HBoxSB
} from './elem'

import { Message, Sort } from '@material-ui/icons';
import * as api from './api'

export default function Billing(props) {

    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState(undefined);

    const [userDetails, setUserDetails] = useState(undefined);
    const [userPayments, setUserPayments] = useState(undefined);
    const [userDebts, setUserDebts] = useState(undefined);

    const [sortByDebt, setSortByDebt] = useState(false);


    const [paymentUser, setPaymentUser] = useState(undefined);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentComment, setPaymentComment] = useState("");
    const [usersReload, setUsersReload] = useState(1);

    // eslint-disable-next-line no-unused-vars 
    const [refresh, setRefresh] = useState(1);

    const getComparator = (byDebt) => {
        return byDebt ?
            (u1, u2) => u1.debt - u2.debt :
            (u1, u2) => (u1.displayName > u2.displayName ? 1 : -1)
    }

    useEffect(() => {
        setUsers(u => {
            u.sort(getComparator(sortByDebt))
            return u;
        });
        setRefresh(old => old + 1);

    }, [sortByDebt]);

    useEffect(() => {
        Promise.all([
            api.getCollection(api.Collections.USERS_COLLECTION).then(u => {
                return u;
            }),
            api.getCollection(api.Collections.BILLING_COLLECTION).then(ub => {

                return ub;
            })
        ]).then(all => {
            let u = all[0];
            u.forEach(oneUser => {
                let userBilling = all[1].find(ub => ub._ref.id === oneUser.email);
                if (!userBilling) {
                    oneUser.debt = "חסר"
                } else {
                    oneUser.debt = userBilling.balance.toString();
                }
            })
            u.sort(getComparator(sortByDebt));
            setUsers(u);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usersReload]);

    useEffect(() => {
        if (userDetails) {
            api.getUserPayments(userDetails.email).then(
                (p) => {
                    // p.sort(sortByDate);
                    setUserPayments(p)
                },
                (err) => props.notify.error(err.message)
            )

            api.getUserDebts(userDetails.email).then(
                (p) => {
                    // p.sort(sortByDate);
                    setUserDebts(p)
                },
                (err) => props.notify.error(err.message)
            )
        } else {
            setUserPayments([]);
            setUserDebts([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userDetails]);



    let width = props.windowSize.w;
    let condense = width < 600;

    return <Paper1 width={'100%'} height={'90%'}>
        {!userDetails && !paymentUser ?
            <VBox style={{ width: '100%', margin: 10 }}>
                <Search value={filter} onChange={val => setFilter(val)} />

                <Grid container spacing={2} >
                    <Grid container item xs={12} spacing={2} style={{ textAlign: "right" }}>
                        <Grid item xs={condense ? 5 : 3}>
                            <HBoxSB>
                                <SmallText>שם</SmallText>
                                <Sort onClick={() => setSortByDebt(false)} />
                            </HBoxSB>
                        </Grid>


                        <Grid item xs={condense ? 2 : 1}>
                            <HBoxSB>
                                <SmallText>חוב</SmallText>
                                <Sort onClick={() => setSortByDebt(true)} />
                            </HBoxSB>
                        </Grid>
                        <Grid item xs={2}>
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
                                <SmallText><div dir="ltr">{user.debt}</div></SmallText>
                            </Grid>
                            <Grid item xs={2}>
                                <HBox>
                                    <Button variant="contained"
                                        style={{ fontSize: 12, height: '1.5rem', minWidth: 50 }}
                                        onClick={() => {
                                            setPaymentUser(user);
                                            setPaymentAmount("");
                                            setPaymentComment("");
                                        }}>תשלום</Button>
                                    <Spacer width={10} />
                                    <Button variant="contained"
                                        style={{ fontSize: 12, height: '1.5rem', minWidth: 50 }}
                                        onClick={() => setUserDetails(user)}>פרטים...</Button>

                                    <Spacer />
                                    <Message onClick={() => {
                                        props.notify.ask(`האם לשלוח הודעה על חוב?`, "הודעה על חוב", [
                                            {
                                                caption: "שלח הודעה", callback: () => {
                                                    const msg = `${user.displayName} היקר.
יתרת החוב שלך הינה: ${Math.abs(Math.round(user.debt))}
הנך מתבקש להסדיר התשלום.
לפרטים: https://tennis.atpenn.com/#4

לתשלום: https://preview.page.link/payboxapp.page.link/nUbbPFMPQMeBQ8YB9

טניס טוב`

                                                    api.sendMessage(msg, [user.phone]).then(
                                                        () => props.notify.success("הודעה נשלחה בהצלחה"),
                                                        (err) => props.notify.error(err.message)
                                                    );
                                                }
                                            },
                                            { caption: "בטל", callback: () => { } },
                                        ])
                                    }} />
                                </HBox>
                            </Grid>
                        </Grid>))}
                </Grid>
            </VBox>
            : userDetails ?
                <VBox style={{ width: '100%' }}>
                    <HBox>
                        <Text fontSize={35}>{userDetails.displayName + " - "}</Text>
                        <Text fontSize={35}>{userDetails.debt === "חסר" ? "חסר" :
                            userDetails.debt > 0 ? userDetails.debt + ' ש״ח בזכות' :
                                userDetails.debt === 0 ? "0 - אין חוב" :
                                    -userDetails.debt + ' ש״ח בחובה'
                        }</Text>
                    </HBox>
                    <Text>תשלומים</Text>
                    <Grid container spacing={2} >
                        <Grid container item xs={12} spacing={2} >
                            <Grid item xs={3}>
                                <SmallText>תאריך</SmallText>
                            </Grid>
                            <Grid item xs={3}>
                                <SmallText>סכום</SmallText>
                            </Grid>
                            <Grid item xs={5}>
                                <SmallText>הערה</SmallText>
                            </Grid>
                        </Grid>
                        {userPayments ? userPayments.map((up, i) => (
                            <Grid key={i} container item xs={12} spacing={2} >

                                <Grid item xs={3}>
                                    <SmallText><div dir="ltr">{up.date}</div></SmallText>
                                </Grid>
                                <Grid item xs={3}>
                                    <SmallText><div dir="ltr">{up.amount}</div></SmallText>
                                </Grid>
                                <Grid item xs={5}>
                                    <SmallText>{up.comment}</SmallText>
                                </Grid>
                            </Grid>
                        )) : null}
                    </Grid>
                    <Spacer height={25} />
                    <Text>חובות</Text>
                    <Grid container spacing={2} >
                        <Grid container item xs={12} spacing={2} >
                            <Grid item xs={3}>
                                <SmallText>תאריך</SmallText>
                            </Grid>
                            <Grid item xs={3}>
                                <SmallText>סכום</SmallText>
                            </Grid>

                        </Grid>
                        {userDebts ? userDebts.map((up, i) => (
                            <Grid key={i} container item xs={12} spacing={2} >

                                <Grid item xs={3}>
                                    <SmallText><div dir="ltr">{up.date}</div></SmallText>
                                </Grid>
                                <Grid item xs={3}>
                                    <SmallText><div dir="ltr">{up.amount}</div></SmallText>
                                </Grid>
                            </Grid>
                        )) : null}
                    </Grid>
                    <Spacer height={25} />
                    <Button variant="contained" onClick={() => setUserDetails(undefined)} >סגור</Button>
                </VBox>
                :
                <VBox style={{ width: '100%' }}>
                    <Header>הזנת תשלום</Header>
                    <Text>{"עבור " + paymentUser.displayName}</Text>
                    <div dir="ltr" >
                        <TextField required label="סכום" value={paymentAmount} onChange={(e) => {
                            const val = Number(e.currentTarget.value);
                            if (isNaN(val) &&
                                e.currentTarget.value !== "-" &&
                                e.currentTarget.value !== "" &&
                                e.currentTarget.value !== ".") {
                                props.notify.error("סכום לא חוקי");

                            } else {
                                props.notify.clear();
                            }
                            setPaymentAmount(e.currentTarget.value)
                        }
                        }
                            inputProps={{ style: { textAlign: 'center' } }}
                        />
                    </div>
                    <TextField required label="הערה" onChange={(e) => setPaymentComment(e.currentTarget.value)} />
                    <Spacer height={20} />
                    <HBox>
                        <Button variant="contained" onClick={() => {
                            api.addPayment(paymentUser.email, paymentAmount, paymentComment).then(
                                () => {
                                    setUsersReload(old => old + 1);
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