
import React, { useState, useEffect } from 'react';
import { Grid } from '@material-ui/core';

import { Spacer, Loading, VBox, HBox, SmallText, SmallText2, HSeparator } from './elem'
import { getNiceDate } from './utils'

import * as api from './api'
import { Edit, EmojiEvents } from '@material-ui/icons';
import SetResults from './set-results';

const Val=(v)=>parseInt(v);


export default function Matches({ UserInfo, notify, reload, admin }) {
    const [matches, setMatches] = useState(undefined);
    const [edit, setEdit] = useState(undefined);

    useEffect(() => {
        if (UserInfo) {
            api.getCollection(api.Collections.MATCHES_ARCHIVE_COLLECTION, "date", true).then(matches => {
                setMatches(matches)
            })
        }
    }, [UserInfo, reload])

    
    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Spacer width={10} />
            {edit ?
                <SetResults match={edit} notify={notify} onCancel={() => setEdit(undefined)} 
                onDone={(editedSet => {
                    setMatches(currentMatches=>currentMatches.map(m=>m._ref.id === edit._ref.id? {...m, set:editedSet}: m));
                    setEdit(undefined);
                })} isArchived={true}/>
                : <VBox>
                    <HSeparator/>
                    {matches ?
                        matches.map(match => (
                            <GetMatch match={match} UserInfo={UserInfo} setEdit={setEdit} admin={admin}/>
                        ))
                        :
                        <Loading msg="טוען משחקים" />
                    }
                </VBox>
            }


        </div >
    );
}

function GetMatch({ match, UserInfo, setEdit, admin }) {

    //calculate winner
    const wonSets1 = match.sets ? match.sets.reduce((prev, curr) => prev + (Val(curr.pair1) > Val(curr.pair2) ? 1 : 0), 0) : -1;
    const wonSets2 = match.sets ? match.sets.reduce((prev, curr) => prev + (Val(curr.pair1) < Val(curr.pair2) ? 1 : 0), 0) : -1;
    let winner = 0;

    if (wonSets1 > wonSets2) {
        winner = 1;
    } else if (wonSets1 < wonSets2) {
        winner = 2;
    } else if (match.sets) {
        const wonGames1 = match.sets.reduce((prev, curr) => prev + Val(curr.pair1), 0);
        const wonGames2 = match.sets.reduce((prev, curr) => prev + Val(curr.pair2), 0);
        if (wonGames1 > wonGames2) {
            winner = 1;
        } else if (wonGames1 < wonGames2) {
            winner = 2;
        }
    }

    let sets = match.sets ? [...match.sets] : [];

    for (let i = sets.length; i < 5; i++) {
        sets.push({
            pair1: "-",
            pair2: "-"
        })
    }
    //alert(match.date + "-"+ getNiceDate(match.date));

    return <VBox style={{ width: '80%', height: 100 }}>
        
        <SmallText fontSize={12}>{match.Day + " ," + getNiceDate(match.date)}</SmallText>
        <Spacer />

        <GetOneLine P1={match.Player1} P2={match.Player2} sets={sets} UserInfo={UserInfo}
            firstPair={true} wonSets={wonSets1} wins={winner === 1} tie={winner == 0}
            button={admin || (userInMatch(match, UserInfo) && !match.sets)?
                <Edit onClick={() => setEdit(match)} />
                : undefined} />
        <GetOneLine P1={match.Player3} P2={match.Player4} sets={sets} wonSets={wonSets2}
            wins={winner === 2} tie={winner == 0}
            UserInfo={UserInfo}
        />
        <HSeparator/>
    </VBox>
}

function userInMatch(match, UserInfo) {
    if (!UserInfo)
        return false;

    for (let i = 1; i <= 4; i++) {
        if (match["Player" + i] && match["Player" + i].email === UserInfo.email) {
            return true;
        }
    }
    return false;
}


function GetOneLine(props) {

    return (
        <Grid container spacing={2} style={{ height: 60 }} direction={'row'}>
            <Grid item xs={3} alignContent={'flex-start'} style={{ padding: 2 }}>
                <VBox>
                    {props.P1 ? <SmallText2 backgroundColor={props.P1.email === props.UserInfo.email ? 'yellow' : undefined}>{props.P1.displayName}</SmallText2> : null}
                    {props.P2 ? <SmallText2 backgroundColor={props.P2.email === props.UserInfo.email ? 'yellow' : undefined}>{props.P2.displayName}</SmallText2> : null}
                </VBox>
            </Grid >
            <Grid item xs={1} alignSelf={'center'}>
                {props.wins ? <EmojiEvents style={{ color: 'gold' }} /> : null}
            </Grid>
            {
                props.sets.map(result => (
                    <Grid item xs={1} style={{ padding: 2 }}>
                        <VBox style={{
                            backgroundColor: (props.firstPair && result.pair1 > result.pair2) ||
                                (!props.firstPair && result.pair1 < result.pair2) ?
                                'lightgreen' : result.pair1 === "-" ? 'white' :
                                    result.pair1 === result.pair2 ? 'lightblue' :
                                        'lightpink'
                            ,
                            width: 22, height: 35, justifyContent: 'center'
                        }}>
                            <SmallText2 textAlign='center'>{props.firstPair ? result.pair1 : result.pair2}</SmallText2>
                        </VBox>
                    </Grid>
                ))
            }

            <Grid item xs={1} style={{ padding: 2 }}>
                <HBox style={{ width: '100%', height: '100%' }}>
                    <VBox style={{ backgroundColor: 'black', width: '4%', height: 35 }} />
                    <VBox style={{
                        backgroundColor: (props.wins ? 'lightgreen' : (props.wonSets === -1 ? 'white' : props.tie? 'lightgray': 'lightpink')),
                        width: 22, height: 35, justifyContent: 'center'
                    }}>
                        <SmallText2 textAlign='center'>{props.wonSets >= 0 ? props.wonSets : "-"}</SmallText2>
                    </VBox>
                </HBox>
            </Grid>
            {props.button ? <Grid item xs={1} style={{ padding: 2 }}>{props.button}</Grid> : null}


        </Grid >
    );
}