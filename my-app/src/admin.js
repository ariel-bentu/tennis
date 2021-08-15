import React, { useState, useEffect } from 'react';
import { Button, CssBaseline, FormControlLabel } from '@material-ui/core';
import Container from '@material-ui/core/Container';

import { IOSSwitch, Loading, Spacer, Header } from './elem';

import * as api from './api'


export default function Admin(props) {

    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getRegistrationOpen().then(val => setRegistrationOpen(val));
    }, []);




    return (<Container component="main" maxWidth="xs">
        <CssBaseline />
        <Header>ניהול שבוע</Header>
        <Spacer height={30} />
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
        <Spacer height={30} />

        <Button variant="contained" onClick={() => {
            props.notify.ask(`האם לפתוח? פתיחה תעביר את כל נתוני הרישום והמשחקים לגיבוי, ותמחק את המשחקים והרישומים`, "פתיחת שבוע", [
                {
                    caption: "פתח שבוע", callback: () => {
                        api.openWeek().then(
                            () => props.notify.success("שבוע נפתח בהצלחה"),
                            (err) => props.notify.error(err.message)
                        );
                    }
                },
                { caption: "בטל", callback: () => { } },
            ])


        }}>פתיחת שבוע</Button>
        {loading ? <Loading msg="מעדכן..." /> : null}


    </Container>
    );
}