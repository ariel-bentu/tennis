import React, { useState, useEffect } from 'react';
import { Button, Table, TableHead, TableRow, TableBody, TextField } from '@material-ui/core';

import { Paper1, VBox, HBox, Spacer, SmallTableCeEditable, SmallTableCell } from './elem'

import * as api from './api'


export default function Users(props) {

    const [users, setUsers] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [addName, setAddName] = useState("");
    const [addEmail, setAddEmail] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [addRank, setAddRank] = useState("");

    useEffect(() => {
        api.getCollection(api.Collections.USERS_COLLECTION).then(u => setUsers(u))
    }, []);

    let updateUserValue = (email, fragment) => {
        setDirty(true);
        setUsers(oldUsers => oldUsers.map(item =>
            item.email === email
                ? { ...item, ...fragment }
                : item));
    }

    return <Paper1 width={'100%'} height={'100%'}>
        {!addMode ?
            <VBox style={{ width: '100%', margin: 10 }}>
                <Table stickyHeader >
                    <TableHead>
                        <TableRow>

                            <SmallTableCell width={'30%'} >שם</SmallTableCell>
                            <SmallTableCell width={'20%'}>אימייל</SmallTableCell>
                            <SmallTableCell width={'15%'}>טלפון</SmallTableCell>
                            <SmallTableCell width={'10%'}>דירוג</SmallTableCell>
                            <SmallTableCell width={'15%'}>
                                <HBox style={{ justifyContent: 'center' }}>
                                    <Button onClick={() => setAddMode(true)} style={{ fontSize: 35 }}>+</Button>


                                    <Spacer height={20} />
                                    <Button
                                        style={{ fontSize: 15 }}
                                        size={"large"}

                                        variant="contained"
                                        disabled={submitInProcess || !dirty} onClick={() => {
                                            setSubmitInProcess(true);
                                        }
                                        }>שמור</Button>
                                    <Spacer height={20} />

                                </HBox>
                            </SmallTableCell>
                        </TableRow>

                    </TableHead>
                    <TableBody>
                        {users.map((user, i) => (
                            <TableRow key={i}>



                                <SmallTableCeEditable value={user.displayName}
                                    onChange={e => updateUserValue(user.email, { displayName: e.currentTarget.value })} />
                                <SmallTableCeEditable dir={"ltr"} value={user.email}
                                    onChange={e => updateUserValue(user.email, { email: e.currentTarget.value })} />
                                <SmallTableCeEditable value={user.Phone}
                                    onChange={e => updateUserValue(user.email, { Phone: e.currentTarget.value })} />

                                <SmallTableCeEditable value={user.rank}
                                    onChange={e => updateUserValue(user.email, { rank: e.currentTarget.value })} />


                                <SmallTableCell >
                                    <Button variant="contained" onClick={() => {

                                    }}>מחק</Button>
                                </SmallTableCell>
                            </TableRow>
                        ))}
                    </TableBody>

                </Table>
            </VBox>
            :
            <VBox>
                <TextField required label="שם" onChange={(e)=>setAddName(e.currentTarget.value)}/>
                <TextField required label="אימייל" onChange={(e)=>setAddEmail(e.currentTarget.value)}/>
                <TextField required label="טלפון" onChange={(e)=>setAddPhone(e.currentTarget.value)}/>
                <Spacer width={20} />
                <HBox>
                    <Button variant="contained" onClick={() => { 
                        let newUser = {
                            displayeName:addName, email:addEmail, phone:addPhone
                        }
                        api.addUser(newUser).then(
                            ()=>props.notify.success("נשמר בהצלחה"),
                            (err)=>props.notify.error(err, "שמירה נכשלה")
                        );
                    }} >שמור</Button>
                    <Button variant="contained" onClick={() => setAddMode(false)} >בטל</Button>
                </HBox>
            </VBox>
        }
    </Paper1 >
}