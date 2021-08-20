import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, TableHead, TableRow, TableBody, TextField } from '@material-ui/core';

import {
    Paper1, VBox, HBox, Spacer, SmallTableCellEditable,
    SmallTableCell, SmallTableCellLeft, Header, Text
} from './elem'

import * as api from './api'


export default function Users(props) {

    const [users, setUsers] = useState([]);
    const [submitInProcess, setSubmitInProcess] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [addName, setAddName] = useState("");
    const [addEmail, setAddEmail] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [paymentUser, setPaymentUser] = useState(undefined);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentComment, setPaymentComment] = useState("");

    useEffect(() => {
        api.getCollection(api.Collections.USERS_COLLECTION).then(u => setUsers(u))
    }, []);

    let updateUserValue = (email, fragment) => {
        setUsers(oldUsers => oldUsers.map(item =>
            item.email === email
                ? { ...item, ...fragment, dirty: true }
                : item));
    }

    const isDirty = useCallback(() => {
        return users.some(u => u.dirty);
    },
        [users]);

    return <Paper1 width={'100%'} height={'90%'}>
        {!addMode && !paymentUser ?
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
                                    <Button variant="contained" onClick={() => setAddMode(true)} style={{ height: '3rem', fontSize: 35 }}>+</Button>


                                    <Spacer height={20} />
                                    <Button
                                        style={{ fontSize: 15, height: '3rem', }}
                                        size={"large"}

                                        variant="contained"
                                        disabled={submitInProcess || !isDirty()} onClick={() => {
                                            setSubmitInProcess(true);
                                            api.saveUsers(users).then(
                                                () => {
                                                    props.notify.success("נשמר בהצלחה");
                                                    let updatedUsers = users.map(({ dirty, ...user }) => user);
                                                    setUsers(updatedUsers);
                                                },
                                                (err) => props.notify.error(err.message)
                                            ).finally(
                                                () => setSubmitInProcess(false)
                                            );
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



                                <SmallTableCellEditable value={user.displayName}
                                    onChange={e => updateUserValue(user.email, { displayName: e.currentTarget.value })} />
                                <SmallTableCellLeft>
                                    {user.email}
                                </SmallTableCellLeft>
                                <SmallTableCellEditable value={user.phone} dir={"ltr"}
                                    onChange={e => updateUserValue(user.email, { phone: e.currentTarget.value })} />
                                <SmallTableCellEditable value={user.rank}
                                    onChange={e => updateUserValue(user.email, { rank: e.currentTarget.value })} />

                                <SmallTableCell >
                                    <VBox>
                                        <Button variant="contained" onClick={() => {
                                            props.notify.ask(`האם למחוק משמתמש ${user.displayName}?`, "מחיקת משתמש", [
                                                {
                                                    caption: "מחק", callback: () => {
                                                        api.deleteUser(user).then(
                                                            () => props.notify.success("נמחק בהצלחה"),
                                                            (err) => props.notify.error(err.toString())
                                                        );
                                                    }
                                                },
                                                { caption: "בטל", callback: () => { } },
                                            ])
                                        }}> מחק</Button>
                                        <Spacer/>
                                        <Button variant="contained" onClick={() => {
                                            setPaymentUser(user);
                                            setPaymentAmount(0);
                                            setPaymentComment("");
                                        }}>תשלום</Button>
                                    </VBox>
                                </SmallTableCell>
                            </TableRow>
                        ))}
                    </TableBody>

                </Table>
            </VBox>
            : addMode ?
                <VBox>
                    <TextField required label="שם" onChange={(e) => setAddName(e.currentTarget.value)} />
                    <TextField required label="אימייל" onChange={(e) => setAddEmail(e.currentTarget.value)} />
                    <TextField required label="טלפון" onChange={(e) => setAddPhone(e.currentTarget.value)} />
                    <Spacer width={20} />
                    <HBox>
                        <Button variant="contained" onClick={() => {
                            let newUser = {
                                displayName: addName,
                                email: addEmail,
                                phone: addPhone
                            }
                            api.addUser(newUser).then(
                                () => {
                                    props.notify.success("נשמר בהצלחה")
                                    api.getCollection(api.Collections.USERS_COLLECTION).then(u => setUsers(u));
                                    setAddMode(false);
                                },
                                (err) => props.notify.error(err.message, "שמירה נכשלה")
                            );
                        }} >שמור</Button>
                        <Button variant="contained" onClick={() => setAddMode(false)} >בטל</Button>
                    </HBox>
                </VBox>
                :
                <VBox>
                    <Header>הזנת תשלום</Header>
                    <Text>{"עבור " + paymentUser.displayName}</Text>
                    <TextField required label="סכום" onChange={(e) => setPaymentAmount(e.currentTarget.value)} />
                    <TextField required label="הערה" onChange={(e) => setPaymentComment(e.currentTarget.value)} />
                    <Spacer width={20} />
                    <HBox>
                        <Button variant="contained" onClick={() => {
                            api.addPayment(paymentUser.email, paymentAmount, paymentComment).then(
                                () => {
                                    props.notify.success("תשלום נשמר בהצלחה")
                                    setPaymentUser(undefined);
                                },
                                (err) => props.notify.error(err.message, "שמירת תשלום נכשלה")
                            );
                        }} >שמור</Button>
                        <Button variant="contained" onClick={() => setPaymentUser(undefined)} >בטל</Button>
                    </HBox>
                </VBox>

        }
    </Paper1 >
}