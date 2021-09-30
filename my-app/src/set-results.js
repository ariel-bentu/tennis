import React, { useState, useEffect } from 'react';
import { Button } from '@material-ui/core';
import { HBox, VBox, Spacer, SmallText, SmallText2, BoxInput } from './elem';
import { getNiceDate } from './utils';
import * as api from './api'
import { Paper1 } from './elem';

const isTieBreakSet = (set) => {
    const p1IntVal = parseInt(set.pair1);
    const p2IntVal = parseInt(set.pair2);
    return !isNaN(p1IntVal) && p1IntVal === 7 || !isNaN(p2IntVal) && p2IntVal === 7;
}

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

            if ((Math.abs(p1 - p2) === 1 && p1 < 7 && p2 < 7) ||
                (p1 == 7 && p2 != 6 || p2 == 7 && p1 != 6)) {
                return `סט ${i + 1} אינו חוקי - הכרעה בסט זה אינה חוקית`;
            }

            if (p1 === 7 || p2 === 7) {
                const p1TieBreak = parseInt(sets[i].tbPair1)
                const p2TieBreak = parseInt(sets[i].tbPair2)

                if ((sets[i].tbPair1 !== "" && isNaN(p1TieBreak)) ||
                    (sets[i].tbPair2 !== "" && isNaN(p2TieBreak))) {
                    return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון - יש להזין ספרות בלבד`;
                }
                if ((sets[i].tbPair1 !== "" && sets[i].tbPair2 === "") ||
                    (sets[i].tbPair1 === "" && sets[i].tbPair2 !== "")) {
                    return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון חלקית`;
                }

                if (!isNaN(p1TieBreak) && !isNaN(p2TieBreak)) {
                    if (p1TieBreak < 7 && p2TieBreak < 7) {
                        return `סט ${i + 1} אינו חוקי - תוצאות שובר שוויון ללא הכרעה`;
                    }

                    if (Math.abs(p1TieBreak - p2TieBreak) <= 1) {
                        return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון - הפרש לא חוקי`;
                    }

                    if (p1TieBreak > p2TieBreak && p1 < p2 ||
                        p1TieBreak < p2TieBreak && p1 > p2) {
                        return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון הפוכה לתוצאת הסט `;
                    }
                }
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
                setsEdited[i].pair2 !== setsOrig[i].pair2 ||
                setsEdited[i].tbPair1 !== setsOrig[i].tbPair1 ||
                setsEdited[i].tbPair2 !== setsOrig[i].tbPair2) {
                return true;
            }

        }
    }
    return false;
};

export default function SetResults({ UserInfo, match, notify, onCancel, onDone, isArchived }) {

    const [editedSets, setEditedSets] = useState([]);
    const [nextFocus, setNextFocus] = useState(0);

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

    const tieBreak = editedSets.some(set => isTieBreakSet(set))
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

            {tieBreak ?
                <TieBreakLine editedSets={editedSets} pairIndex={1} setEditedSets={setEditedSets} />
                : null}

            <HBox style={{ width: '100%', alignItems: 'center' }}>
                <VBox style={{ backgroundColor: 'gold', width: 75 }}>
                    {match.Player1 ? <SmallText textAlign='center'>{match.Player1.displayName}</SmallText> : null}
                    {match.Player2 ? <SmallText textAlign='center'>{match.Player2.displayName}</SmallText> : null}
                </VBox>
                <Spacer width={15} />

                {editedSets.map((set, i) => (
                    <BoxInput backgroundColor='gold' value={set.pair1}
                        focus={i * 2 === nextFocus}

                        onNextFocus={() => setNextFocus(n => n + 1)}
                        onFocus={() => nextFocus !== i * 2 ? setNextFocus(i * 2) : {}}
                        onChange={newVal => {
                            setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, pair1: newVal } : s))
                        }
                        }
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
                    {match.Player3 ? <SmallText textAlign='center'>{match.Player3.displayName}</SmallText> : null}
                    {match.Player4 ? <SmallText textAlign='center'>{match.Player4.displayName}</SmallText> : null}
                </VBox>
                <Spacer width={15} />
                {editedSets.map((set, i) => (
                    <BoxInput
                        value={set.pair2}
                        focus={i * 2 + 1 === nextFocus}
                        onFocus={() => nextFocus !== i * 2 + 1 ? setNextFocus(i * 2 + 1) : {}}
                        onNextFocus={() => setNextFocus(n => n + 1)}
                        onChange={newVal => setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, pair2: newVal } : s))}
                    />
                )
                )}
            </HBox>

            {tieBreak ?
                <TieBreakLine editedSets={editedSets} pairIndex={2} setEditedSets={setEditedSets} />
                : null}


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
                        match.sets = editedSets.filter(s => s.pair1 !== "");
                        api.saveMatchResults(match, isArchived).then(
                            () => {
                                if (!isArchived) {
                                    notify.success("תוצאות נשמרו בהצלחה. המשחק יוסר מלשונית ׳מתוכנן׳ ויופיע בלשונית ׳משחקים׳");
                                } else {
                                    notify.success("תוצאות נשמרו בהצלחה");
                                }
                                onDone(match.sets);
                            },
                            (err) => notify.error(err.message)
                        );
                    }

                    onDone(editedSets);
                }}>שמור</Button>
                <Spacer width={25} />
                <Button variant="contained" onClick={() => onCancel()}>בטל</Button>
            </HBox>
        </Paper1 >);
}

function TieBreakLine({ editedSets, pairIndex, setEditedSets }) {
    return (
        <HBox>
            <Spacer width={90} />
            {editedSets.map((set, i) => (
                isTieBreakSet(set) ?
                    <BoxInput
                        backgroundColor={pairIndex === 1 ? 'gold' : 'transparent'}
                        tieBreak={true}
                        value={set["tbPair" + pairIndex]}
                        onChange={newVal => {
                            setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, ["tbPair" + pairIndex]: newVal } : s))
                        }
                        }
                    />
                    : <Spacer width={50} height={50} />
            ))
            }
        </HBox>
    )
}