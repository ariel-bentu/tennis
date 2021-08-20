
import React, { useState, useEffect } from 'react';
import { Grid } from '@material-ui/core';

import { Spacer, Loading, VBox, Text, SmallText } from './elem'

import * as api from './api'





export default function MyMatches({ UserInfo, notify }) {


    const [matches, setMatches] = useState(undefined);
    const [myMatches, setMyMatches] = useState(undefined);

    useEffect(() => {
        if (UserInfo) {
            api.getCollection(api.Collections.MATCHES_COLLECTION).then(
                mtchs => {
                    setMatches(mtchs);
                    //enrich with registration info
                    let myM = mtchs.filter(m => {
                        for (let i = 1; i <= 4; i++) {
                            if (m["Player" + i] && m["Player" + i].email === UserInfo.email)
                                return true;
                        }
                        return false;
                    })
                    setMyMatches(myM);
                },
                (err)=>{
                    notify.error(err.message);
                    setMatches([]);
                    setMyMatches([]);
                })
        }
    }, [UserInfo])


    return (
        <div style={{ height: '65vh', width: '100%' }}>
            <Spacer height={20} />
            {myMatches ?
                (myMatches.length === 0 ?
                    (matches.length === 0 ?
                        <VBox><Text>אין משחקים עדיין</Text></VBox> :
                        <VBox><Text>אינך משובץ השבוע</Text></VBox>)
                    :
                    <Grid container spacing={2}>

                        <Grid container item xs={12} spacing={3} style={{ textAlign: "right" }}>
                            <Grid item xs={2}>מתי</Grid>
                            <Grid item xs={4}>איפה</Grid>
                            <Grid item xs={5}>מי נגד מי</Grid>
                        </Grid>
                        {myMatches.map((match, i) => {

                            return <Grid container item xs={12} spacing={3} style={{ fontSize: 13 }} key={match.id}  >
                                <Grid item xs={2}>
                                    <SmallText> {match.Day}</SmallText>
                                    <SmallText> {match.Hour}</SmallText>
                                </Grid>
                                <Grid item xs={4}>
                                    <SmallText> {match.Location}</SmallText>
                                    <SmallText> {match.Court}</SmallText>
                                </Grid>

                                <Grid item xs={5} >
                                    <VBox>
                                        <SmallText>
                                            {match.Player1 ? match.Player1.displayName : ""}
                                            {" ו"}
                                            {match.Player2 ? match.Player2.displayName : ""}
                                        </SmallText>
                                        <SmallText>vs</SmallText>
                                        <SmallText>
                                            {match.Player3 ? match.Player3.displayName : ""}
                                            {" ו"}
                                            {match.Player4 ? match.Player4.displayName : ""}
                                        </SmallText>
                                    </VBox>
                                </Grid>

                            </Grid>
                        })
                        }


                    </Grid>)
                : <Loading msg="טוען משחקים" />
            }

        </div >
    );
}
