

import { useEffect, useState } from 'react';
import { Spacer, VBox, Text, SmallText } from './elem'
import * as api from './api'
import { Button, Grid } from '@material-ui/core';


export default function MyBill({ Balance, UserInfo, notify }) {
    const [detailsMode, setDetailsMode] = useState(false);
    const [userPayments, setUserPayments] = useState(undefined);
    const [userDebts, setUserDebts] = useState(undefined);

    useEffect(() => {
        if (detailsMode && !userDebts && !userPayments) {
            api.getUserPayments(UserInfo.email).then(
                (p) => {
                    // p.sort(sortByDate);
                    setUserPayments(p)
                },
                (err) => notify.error(err.message)
            )

            api.getUserDebts(UserInfo.email).then(
                (p) => {
                    // p.sort(sortByDate);
                    setUserDebts(p)
                },
                (err) => notify.error(err.message)
            )
        } 
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailsMode, userDebts, userPayments]);

    let balInt = 0;
    if (Balance) {
        balInt = Math.round(Balance);
    }
    return (
        <div style={{ height: '65vh', width: '100%' }}>
            <Spacer height={45} />


            <VBox>
                {!Balance ?
                    "אין נתונים עבורך"
                    :
                    <VBox>
                        <Text fontSize={35}>{balInt > 0 ? balInt + ' ש״ח בזכות' :
                            balInt === 0 ? "0 - אין חוב" :
                                -balInt + ' ש״ח בחובה'
                        }</Text>
                        <Spacer height={20} />
                        <a href="https://payboxapp.page.link/nUbbPFMPQMeBQ8YB9">לתשלום בפייבוקס</a>
                        <Spacer height={20} />
                        <Button variant="contained" onClick={() => setDetailsMode(old=>!old)}>{detailsMode?"סגור":"פרטים..."}</Button>
                    </VBox>
                }
                {detailsMode && <VBox>
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
                </VBox>}
            </VBox>
        </div >
    );
}
