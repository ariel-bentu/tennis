
import React, { useState, useEffect } from 'react';
import { Grid, Button } from '@material-ui/core';

import { Spacer, Loading, VBox, Text, SmallText, HSeparator } from './elem'
import SetResults from './set-results';

import * as api from './api'





export default function MyMatches({ UserInfo, notify }) {


    const [matches, setMatches] = useState(undefined);
    const [myMatches, setMyMatches] = useState(undefined);
    const [edit, setEdit] = useState(undefined);
    const [reload, setReload] = useState(1);

    useEffect(() => {
        if (UserInfo) {
            api.getCollection(api.Collections.MATCHES_COLLECTION).then(
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
                },
                (err) => {
                    notify.error(err.message);
                    setMatches([]);
                    setMyMatches([]);
                })
        }
    }, [UserInfo, reload])


    return (
        <div style={{ height: '65vh', width: '100%' }}>
            <Spacer height={20} />
            {edit ?
                <SetResults match={edit} notify={notify} onCancel={() => setEdit(undefined)}
                    onDone={(editedSet => {
                        setTimeout(()=>setReload(r=>r+1), 4000);
                        setEdit(undefined);
                    })} isArchived={false} /> :

                myMatches ?
                    (myMatches.length === 0 ?
                        (matches.length === 0 ?
                            <VBox><Text>אין משחקים עדיין</Text></VBox> :
                            <VBox><Text>אין משחקים מתוכננים</Text></VBox>)
                        :
                        <Grid container spacing={2}>

                            <Grid container item xs={12} spacing={3} style={{ textAlign: "right" }}>
                                <Grid item xs={2}>מתי</Grid>
                                <Grid item xs={4}>איפה</Grid>
                                <Grid item xs={5}>מי נגד מי</Grid>
                            </Grid>
                            <HSeparator />
                            {myMatches.map((match, i) => {

                                return (
                                [<Grid container item xs={12} spacing={3} style={{ fontSize: 13 }} key={match.id}  >
                                    <Grid item xs={2}>
                                        <SmallText> {match.Day}</SmallText>
                                        <SmallText> {match.Hour}</SmallText>
                                    </Grid>
                                    <Grid item xs={3}>
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
                                    <Grid item xs={2} >
                                        <Button variant="contained" onClick={() => setEdit(match)} 
                                        style={{width:'1.2rem', height:'4rem'}}>
                                            <VBox>
                                                <SmallText>הזנת</SmallText>
                                                <SmallText>תוצאות</SmallText>
                                            </VBox>
                                        </Button>
                                    </Grid>
                                </Grid>,
                                <HSeparator />])
                            })
                            }
                        </Grid>)
                    : <Loading msg="טוען משחקים" />
            }
        </div >
    );
}
