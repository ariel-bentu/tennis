import React, { useState, useEffect } from 'react';
import { Button } from '@material-ui/core';
import { HBox, VBox, Spacer, SmallText, SmallText2, BoxInput } from './elem';
import { getNiceDate } from './utils';
import * as api from './api'
import { Paper1 } from './elem';

const validate = (sets) => {
    let seenEmpty = false;
    for (let i = 0; i < 5; i++) {
        if (sets[i].pair1 === "" && sets[i].pair2 === "") {
            if (!seenEmpty) {
                seenEmpty = true;
            }
        } else {
            if (seenEmpty) {
                return "אין לדלג על סטים";
            }
            const p1 = parseInt(sets[i].pair1);
            const p2 = parseInt(sets[i].pair2);

            if (isNaN(p1) || isNaN(p2)) {
                return `סט ${i + 1} אינו חוקי - יש להזין ספרות בלבד`;
            }
            if (p1 < 0 || p2 < 0) {
                return `סט ${i + 1} אינו חוקי - אין להזין מספר שלילי`;
            }

            if (p1 === p2) {
                return `סט ${i + 1} אינו חוקי - יש להגיע להכרעה`;

            }

            if (p1 > 7 || p2 > 7) {
                return `סט ${i + 1} אינו חוקי - תוצאה מעל 7 לא אפשרית`;
            }

            if (p1 < 6 && p2 < 6) {
                return `סט ${i + 1} אינו חוקי - יש להזין סט רק אם שוחק עד הכרעה`;
            }

            if (Math.abs(p1 - p2) === 1 && p1 < 7 && p2 < 7) {
                return `סט ${i + 1} אינו חוקי - הכרעה בסט זה אינה חוקית`;
            }
        }

    }
    return "";
}
const isDirty = (setsOrig, setsEdited) => {
    if (!setsOrig) {
        return setsEdited[0].pair1 !== "";
    }

    for (let i = 0; i < 5; i++) {
        if (setsOrig.length <= i) {
            return setsEdited[i].pair1 !== "";
        } else {
            if (setsEdited[i].pair1 !== setsOrig[i].pair1 ||
                setsEdited[i].pair2 !== setsOrig[i].pair2) {
                return true;
            }

        }
    }
    return false;
};

export default function SetResults({ UserInfo, match, notify, onCancel, onDone, isArchived }) {

    const [editedSets, setEditedSets] = useState([]);

    useEffect(() => {
        let sets = match.sets ? [...match.sets] : [];

        for (let i = sets.length; i < 5; i++) {
            sets.push({
                pair1: "",
                pair2: ""
            })
        }
        setEditedSets(sets)
    }, [match])



    return (
        <Paper1 style={{ width: '100%', height: '70vh', justifyContent: 'center' }}>
            <Spacer height={20} />
            <SmallText textAlign='center' fontSize={12}>{match.Day + " ," + getNiceDate(match.date)}</SmallText>
            <Spacer height={20} />
            <HBox style={{ width: '100%', alignItems: 'center' }}>
                <Spacer width={75} />
                {editedSets.map((s, i) => (
                    <HBox style={{ width: 50 }}>
                        <SmallText2 textAlign="left" fontSize={10}>{"set " + (i + 1)}</SmallText2>
                    </HBox>
                )
                )}

            </HBox>

            <HBox style={{ width: '100%', alignItems: 'center' }}>
                <VBox style={{ backgroundColor: 'gold', width: 75 }}>
                    {match.Player1 ? <SmallText>{match.Player1.displayName}</SmallText> : null}
                    {match.Player2 ? <SmallText>{match.Player2.displayName}</SmallText> : null}
                </VBox>
                <Spacer width={15} />
                {editedSets.map((set, i) => (
                    <BoxInput backgroundColor='gold' value={set.pair1}
                        onChange={newVal => setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, pair1: newVal } : s))}
                    />
                )
                )}
            </HBox>
            <HBox>
                <Spacer width={25} />
                <SmallText fontSize={12}>vs</SmallText>
            </HBox>
            <HBox style={{ width: '100%', alignItems: 'center' }}>
                <VBox style={{ width: 75 }}>
                    {match.Player3 ? <SmallText>{match.Player3.displayName}</SmallText> : null}
                    {match.Player4 ? <SmallText>{match.Player4.displayName}</SmallText> : null}
                </VBox>
                <Spacer width={15} />
                {editedSets.map((set, i) => (
                    <BoxInput value={set.pair2}
                        onChange={newVal => setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, pair2: newVal } : s))}
                    />
                )
                )}
            </HBox>

            <Spacer height={40} />
            <HBox style={{ width: '100%', justifyContent: 'center' }}>
                <Button variant="contained" onClick={() => {
                    //Check if changed
                    if (isDirty(match.sets, editedSets)) {
                        let msg = validate(editedSets);
                        if (msg.length > 0) {
                            notify.error(msg);
                            return;
                        }
                        //save changes
                        match.sets = editedSets.filter(s=>s.pair1 !== "");
                        api.saveMatchResults(match, isArchived).then(
                            ()=>{
                                notify.success("נשמר בהצלחה");
                                onDone(match.sets);
                            },
                            (err)=>notify.error(err.message)
                        );
                    }

                    onDone(editedSets);
                }}>שמור</Button>
                <Spacer width={25} />
                <Button variant="contained" onClick={() => onCancel()}>בטל</Button>
            </HBox>
        </Paper1 >);
}