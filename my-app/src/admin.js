import React, { useState, useEffect } from 'react';
import { Button, CssBaseline, FormControlLabel, Table, TableHead, TableRow, TableBody } from '@material-ui/core';
import Container from '@material-ui/core/Container';

import { IOSSwitch, Loading, Spacer, Header, VBox, MyTableCell, Text } from './elem';

import * as api from './api'


export default function Admin(props) {
    const [games, setGames] = useState([]);
    const [reload, setReload] = useState(1);

    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getRegistrationOpen().then(val => setRegistrationOpen(val));

        api.getCollection(api.Collections.PLANNED_GAMES_COLLECTION).then(games => {
            games.sort((g1, g2) => g1.id - g2.id);
            setGames(games);
        });
    }, [reload]);


    return (<Container component="main" maxWidth="xs">
        <CssBaseline />
        <Header>ניהול שבוע</Header>
        <Spacer height={30} />
        <VBox>
            <FormControlLabel
                control={<IOSSwitch
                    checked={registrationOpen}
                    onChange={(e) => {
                        setLoading(true)
                        api.setRegistrationOpen(!registrationOpen).then(
                            () => {
                                setRegistrationOpen(!registrationOpen)
                                props.notify.success("עודכן בהצלחה");
                            },
                            (err) => props.notify.error(err.message)
                        ).finally(() => setLoading(false));
                    }} />}
                label="הרשמה פתוחה"
            />

            <Text>ימים פעילים</Text>
            <Table >
                <TableHead>
                    <TableRow>
                        <MyTableCell width={'20%'} className="tableHeader">פעיל</MyTableCell>
                        <MyTableCell width={'30%'}>יום</MyTableCell>
                        <MyTableCell width={'25%'}>שעה</MyTableCell>

                    </TableRow>

                </TableHead>
                {games ? <TableBody>
                    {games.map((game) => (
                        <TableRow key={game.id} style={{ height: '3rem' }}>
                            <MyTableCell >
                                <IOSSwitch checked={!game.disabled} onChange={() => {
                                    api.setPlannedGameActive(game._ref.id, (game.disabled === true)).then(
                                        () => {
                                            setReload(old => old + 1);
                                            props.notify.success("עודכן בהצלחה");
                                        },
                                        (err) => props.notify.error(err.message));
                                }} />
                            </MyTableCell>
                            <MyTableCell component="th" scope="row" >
                                {game.Day}
                            </MyTableCell>
                            <MyTableCell >{game.Hour}</MyTableCell>

                        </TableRow>
                    ))}
                </TableBody>
                    : null}
            </Table>

            

            <Button variant="contained" onClick={() => {
                props.notify.ask(`האם לפתוח? פתיחה תעביר את כל נתוני הרישום לגיבוי, ותנקה את טבלאות הרישום`, "פתיחת רישום", [
                    {
                        caption: "פתח רישום", callback: () => {
                            api.openWeekForRegistration().then(
                                () => props.notify.success("שיבוץ נפתח בהצלחה"),
                                (err) => props.notify.error(err.message)
                            );
                        }
                    },
                    { caption: "בטל", callback: () => { } },
                ])


            }}>פתיחת רישום</Button>
            {/* <Spacer height={30} />
        <Button variant="contained" onClick={() => {
            props.notify.ask("פתיחת שבוע תעביר את השיבוצים הקיימים לגיבוי, תחשב לכל שחקן את חובו, ותכין המערכת לשיבוץ שבוע","פתיחת שבוע", [
                {
                    caption: "התחל שבוע", callback: () => {
                        api.openWeekForMatch().then(
                            () => props.notify.success("פתיחת שבוע בוצעה בהצלחה"),
                            (err) => props.notify.error(err.message)
                        );
                    }
                },
                { caption: "בטל", callback: () => { } },
            ])


        }}>סגירת ופתיחת שבוע</Button> */}
        </VBox>
        {loading ? <Loading msg="מעדכן..." /> : null}


    </Container>
    );
}