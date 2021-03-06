import React, { useState, useEffect } from 'react';
import { Button, TextField } from '@material-ui/core';
import { HBox, VBox, Spacer, SmallText, SmallText2, BoxInput, IOSSwitch, HBoxC } from './elem';
import { getNiceDate } from './utils';
import * as api from './api'
import { Paper1 } from './elem';
import dayjs from 'dayjs';
import { RadioButtonChecked, RadioButtonUnchecked } from '@material-ui/icons';

const isTieBreakSet = (set) => {
    const p1IntVal = parseInt(set.pair1);
    const p2IntVal = parseInt(set.pair2);
    return !isNaN(p1IntVal) && !isNaN(p2IntVal) &&
        ((p1IntVal === 6 && p2IntVal === 7) ||
            (p1IntVal === 7 && p2IntVal === 6));
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

            if ((p1 === 7 && p2 < 5) || (p1 < 5 && p2 === 7)) {
                return `סט ${i + 1} אינו חוקי - הכרעה בסט זה אינה חוקית`;
            }

            const notEmpty = (val) => val !== undefined && val !== "";

            if ((p1 === 6 && p2 === 7) || (p1 === 7 && p2 === 6)) {
                const p1TieBreak = parseInt(sets[i].tbPair1)
                const p2TieBreak = parseInt(sets[i].tbPair2)

                if ((notEmpty(sets[i].tbPair1) && isNaN(p1TieBreak)) ||
                    (notEmpty(sets[i].tbPair2) && isNaN(p2TieBreak))) {
                    return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון - יש להזין ספרות בלבד`;
                }
                if ((notEmpty(sets[i].tbPair1) && !notEmpty(sets[i].tbPair2)) ||
                    (!notEmpty(sets[i].tbPair1) && notEmpty(sets[i].tbPair2))) {
                    return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון חלקית`;
                }

                if (!isNaN(p1TieBreak) && !isNaN(p2TieBreak)) {
                    if (p1TieBreak < 7 && p2TieBreak < 7) {
                        return `סט ${i + 1} אינו חוקי - תוצאות שובר שוויון ללא הכרעה`;
                    }

                    if (Math.abs(p1TieBreak - p2TieBreak) <= 1) {
                        return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון - הפרש לא חוקי`;
                    }

                    if ((p1TieBreak > p2TieBreak && p1 < p2) ||
                        (p1TieBreak < p2TieBreak && p1 > p2)) {
                        return `סט ${i + 1} אינו חוקי - תוצאת שובר שוויון הפוכה לתוצאת הסט `;
                    }
                }
            }

        }

    }
    return "";
}

const inTheFuture = (match) => {
    const date = match.date;
    const hour = match.Hour;

    const d = dayjs(date + " " + hour);
    const diff = d.diff(dayjs(), 'hour');

    return diff > 0;
}

const isDirty = (match, setsEdited, pairQuit, cancelled, paymentFactor) => {
    const setsOrig = match.sets;

    if (match.pairQuit !== pairQuit) {
        return true;
    }

    if (match?.paymentFactor !== paymentFactor) {
        return true;
    }

    if ((!match.matchCancelled && cancelled) || (match.matchCancelled && !cancelled)) {
        return true;
    }

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

export default function SetResults({ UserInfo, match, notify, onCancel, onDone, isArchived, Admin }) {

    const [editedSets, setEditedSets] = useState([]);
    const [pairQuit, setPairQuit] = useState(undefined);

    const [nextFocus, setNextFocus] = useState(0);
    const [gameCancelled, setGameCancelled] = useState(match.matchCancelled === true);
    const [paymentFactor, setPaymentFactor] = useState(match.paymentFactor);

    const togglePairQuit = (pairIndex) => {
        setPairQuit(currPairQuit => {
            if (currPairQuit === pairIndex) {
                return undefined;
            }

            return pairIndex
        })
    }


    useEffect(() => {
        let pairQuit = match.pairQuit ? match.pairQuit : undefined;
        setPairQuit(pairQuit);

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

    // asigns tab index to each game
    let tabIndex = 0;
    editedSets.forEach((set, i) => {
        set._tabIndex = tabIndex;

        if (isTieBreakSet(set)) {
            tabIndex += 4;
        } else {
            tabIndex += 2;
        }
    });

    return (
        <Paper1 style={{ width: '100%', height: window.height*.7, justifyContent: 'center' }}>
            <Spacer height={20} />
            <SmallText textAlign='center' fontSize={12}>{match.Day + " ," + getNiceDate(match.date)}</SmallText>
            <Spacer height={20} />
            <HBoxC>
                <VBox style={{ width: 75 }} >
                    <SmallText textAlign='center'></SmallText>
                    <SmallText textAlign='center'></SmallText>
                </VBox>
                <Spacer width={15} />
                {editedSets.map((s, i) => (
                    <HBox style={{ width: 40, marginLeft: 5, marginRight: 5 }} key={i}>
                        <SmallText2 textAlign="center" fontSize={10}>{"set " + (i + 1)}</SmallText2>
                    </HBox>
                )
                )}
                <HBox style={{ width: 40, marginLeft: 5, marginRight: 5 }}>
                    <SmallText2 textAlign="center" fontSize={10}>פרישה</SmallText2>
                </HBox>
            </HBoxC>

            {tieBreak ?
                <TieBreakLine editedSets={editedSets} pairIndex={1} setEditedSets={setEditedSets}
                    nextFocus={nextFocus} setNextFocus={setNextFocus} />
                : null}

            <HBoxC>
                <VBox style={{ backgroundColor: 'gold', width: 75 }}>
                    {match.Player1 ? <SmallText textAlign='center'>{match.Player1.displayName}</SmallText> : null}
                    {match.Player2 ? <SmallText textAlign='center'>{match.Player2.displayName}</SmallText> : null}
                </VBox>
                <Spacer width={15} />

                {!gameCancelled && editedSets.map((set, i) => (
                    <BoxInput backgroundColor='gold' value={set.pair1}
                        key={i}
                        focus={set._tabIndex === nextFocus}
                        pattern={"[0-7]"}
                        onNextFocus={() => setNextFocus(n => n + 1)}
                        onFocus={() => nextFocus !== set._tabIndex ? setNextFocus(set._tabIndex) : {}}
                        onChange={newVal => {
                            setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, pair1: newVal } : s))
                        }
                        }
                    />
                )
                )}
                {!gameCancelled && <div style={{ width: 40 }} onClick={() => togglePairQuit(1)}>{pairQuit === 1 ? <RadioButtonChecked /> : <RadioButtonUnchecked />}</div>}
            </HBoxC>
            <HBoxC>
                <Spacer width={25} />
                <SmallText fontSize={12}>vs</SmallText>
                <Spacer width={300} />
            </HBoxC>
            <HBoxC>
                <VBox style={{ width: 75 }}>
                    {match.Player3 ? <SmallText textAlign='center'>{match.Player3.displayName}</SmallText> : null}
                    {match.Player4 ? <SmallText textAlign='center'>{match.Player4.displayName}</SmallText> : null}
                </VBox>
                <Spacer width={15} />
                {!gameCancelled && editedSets.map((set, i) => (
                    <BoxInput
                        key={i}
                        pattern={"[0-7]"}
                        value={set.pair2}
                        focus={set._tabIndex + 1 === nextFocus}
                        onFocus={() => nextFocus !== set._tabIndex + 1 ? setNextFocus(set._tabIndex + 1) : {}}
                        onNextFocus={() => setNextFocus(n => n + 1)}
                        onChange={newVal => setEditedSets(sets => sets.map((s, j) => j === i ? { ...s, pair2: newVal } : s))}
                    />
                )
                )}
                {!gameCancelled && <div style={{ width: 40 }} onClick={() => togglePairQuit(2)}>{pairQuit === 2 ? <RadioButtonChecked /> : <RadioButtonUnchecked />}</div>}
            </HBoxC>

            {tieBreak ?
                <TieBreakLine editedSets={editedSets} pairIndex={2} setEditedSets={setEditedSets}
                    nextFocus={nextFocus} setNextFocus={setNextFocus} />
                : null}


            <Spacer height={30} />
            <HBoxC>
                <SmallText fontSize={15}>משחק בוטל</SmallText>
                <IOSSwitch checked={gameCancelled} onChange={() => {
                    setGameCancelled(canc => !canc);
                }} />


                {Admin ? <TextField
                    variant="outlined"
                    margin="normal"
                    label="מקדם חיוב"
                    autoComplete="number"
                    value={paymentFactor === undefined ? "" : paymentFactor}
                    onFocus={() => setNextFocus(-1)}
                    onChange={(e) => {
                        const val = e.currentTarget.value;
                        const floatVal = parseFloat(val);
                        if (val && val.trim() !== "" && val.trim() !== ".") {
                            if (isNaN(floatVal) || floatVal < 0) {
                                notify.error("מקדם תשלום: ערך חייב להיות גדול אן שווה ל 0");
                            }
                        }
                        setPaymentFactor(val);
                    }}
                /> : null}
            </HBoxC>
            <Spacer height={30} />
            <HBoxC>
                <Button variant="contained" onClick={() => {
                    //Check if changed
                    let pf = parseFloat(paymentFactor);
                    if (isNaN(pf)) {
                        pf = undefined;
                    }
                    if (isDirty(match, editedSets, pairQuit, gameCancelled, paymentFactor)) {
                        if (inTheFuture(match)) {
                            notify.error("משחק טרם החל - אין אפשרות להזין תוצאות");
                            onCancel();
                            return;
                        }

                        if (gameCancelled) {
                            notify.progress();
                            return api.saveMatchCancelled(match, pf, isArchived).then(
                                () => {
                                    notify.success("משחק סומן כבוטל");
                                    onDone([]);
                                },
                                (err) => notify.error(err.message)
                            );
                        }

                        let msg = validate(editedSets);
                        if (msg.length > 0) {
                            notify.error(msg);
                            return;
                        }
                        //save changes
                        match.sets = editedSets.filter(s => s.pair1 !== "").map(s => {
                            const { _tabIndex, ...set } = s;
                            return set;
                        });

                        if (!pairQuit) {
                            delete match.pairQuit;
                        } else {
                            match.pairQuit = pairQuit;
                        }
                        notify.progress();
                        return api.saveMatchResults(match, pf, isArchived).then(
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
            </HBoxC>
        </Paper1 >);
}

function TieBreakLine({ editedSets, pairIndex, setEditedSets, nextFocus, setNextFocus }) {
    return (
        <HBoxC>
            <VBox style={{ width: 75 }} >
                <SmallText textAlign='center'></SmallText>
                <SmallText textAlign='center'></SmallText>
            </VBox>
            <Spacer width={15} />
            {editedSets.map((set, i) => (
                isTieBreakSet(set) ?
                    <BoxInput
                        pattern="[0-9]+"
                        focus={pairIndex === 1 ?
                            (set._tabIndex + 2 == nextFocus) :
                            (set._tabIndex + 3 == nextFocus)
                        }
                        onFocus={() => {
                            let tabIndex = pairIndex === 1 ? set._tabIndex + 2 : set._tabIndex + 3;
                            if (nextFocus !== tabIndex)
                                setNextFocus(tabIndex)
                        }}
                        onNextFocus={() => setNextFocus(n => n + 1)}

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
            <Spacer width={40} />
        </HBoxC>
    )
}