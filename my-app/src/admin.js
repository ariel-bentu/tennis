import React, {  useState, useEffect } from 'react';
import { CssBaseline, FormControlLabel } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

import { IOSSwitch, Loading } from './elem';

import * as api from './api'


const useStyles = makeStyles((theme) => ({
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
}));

export default function Admin(props) {
    const classes = useStyles();

    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getRegistrationOpen().then(val=>setRegistrationOpen(val));
    }, []);

   


    return (<Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    ניהול שבוע
                </Typography>
                <FormControlLabel
                    control={<IOSSwitch
                        checked={registrationOpen}
                        onChange={(e) => {
                            setLoading(true)
                            api.setRegistrationOpen(!registrationOpen).then(
                                ()=>{
                                    setRegistrationOpen(!registrationOpen)
                                    props.notify.success("עודכן בהצלחה");
                                },
                                (err)=>props.notify.error(err.message)
                            ).finally(()=>setLoading(false));
                        }} />}
                    label="הרשמה פתוחה"
                />
                {loading?<Loading msg="מעדכן..." />:null}

            </div>

        </Container>
    );
}