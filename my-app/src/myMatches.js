
import React, { useState, useEffect } from 'react';
import { Grid, Button } from '@material-ui/core';

import { Spacer, Loading, VBox, Text, SmallText, SmallText2, HSeparator, HBox, getBallsIndicator } from './elem'
import SetResults from './set-results';
import { getNiceDate } from './utils'
import * as api from './api'




export default function MyMatches({ UserInfo, notify, admin }) {


    const [matches, setMatches] = useState(undefined);
    const [otherMatches, setOtherMatches] = useState(undefined);
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

                    let nonMy = mtchs.filter(m => !myM.find(mm => mm.id === m.id));
                    setOtherMatches(nonMy);

                },
                (err) => {
                    notify.error(err.message);
                    setMatches([]);
                    setMyMatches([]);
                    setOtherMatches([]);
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
            setRefresh(old=>old+1);
        }
    }, [usersWithBalls, matches]);

    return (
        <div style={{ height: '65vh', width: '100%' }}>
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
                        (!myMatches || myMatches.length === 0) && !admin ?
                            <VBox><Text>אין משחקים מתוכננים</Text></VBox>
                            :
                            <Grid container spacing={2}>
                                <SmallText2 fontSize={18} textAlign="center">משחקים שלי</SmallText2>
                                <Grid container item xs={12} spacing={3} style={{ textAlign: "right" }}>
                                    <Grid item xs={2}>מתי</Grid>
                                    <Grid item xs={3}>איפה</Grid>
                                    <Grid item xs={5}><SmallText fontSize={16} textAlign='center'>מי נגד מי</SmallText></Grid>
                                    <Grid item xs={2}></Grid>
                                </Grid>
                                <HSeparator />
                                {myMatches ? myMatches.map((match, i) => <OneGame match={match} setEdit={setEdit} showSetResults={true} />) : null}
                                {admin ? <HSeparator /> : null}
                                <SmallText2 fontSize={18} textAlign="center">שאר המשחקים</SmallText2>
                                {otherMatches ? otherMatches.map((match, i) => <OneGame match={match} setEdit={setEdit} showSetResults={admin === true} />) : null}
                            </Grid>
                    : <Loading msg="טוען משחקים" />
            }
        </div >
    );
}


function OneGame({ match, setEdit, showSetResults }) {
    return [<Grid container item xs={12} spacing={3} style={{ fontSize: 13 }} key={match.id}  >
        <Grid item xs={2}>
            <SmallText> {getNiceDate(match.date) + ", " + match.Day}</SmallText>
            <SmallText> {match.Hour}</SmallText>
        </Grid>
        <Grid item xs={3}>
            <SmallText> {match.Location}</SmallText>
            <SmallText> {match.Court}</SmallText>
        </Grid>

        <Grid item xs={5} >
            <VBox>
                <HBox>
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
                <SmallText>vs</SmallText>
                <HBox>
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
        </Grid>
        {
            showSetResults ?
                <Grid item xs={2}>
                    < Button variant="contained" onClick={() => setEdit(match)}
                        style={{ width: '1.2rem', height: '4rem' }}>
                        <VBox>
                            <SmallText>הזנת</SmallText>
                            <SmallText>תוצאות</SmallText>
                        </VBox>
                    </Button >
                </Grid > : null}
    </Grid >,
    <HSeparator />]
}