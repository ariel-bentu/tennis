import React, { useCallback, useState, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

import * as api from './api'
import SelfRegistration from './self-registeration';


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

export default function Login(props) {
    const classes = useStyles();

    const [user, setUser] = useState("");
    const [pwd, setPwd] = useState("");
    const [selfRegister, setSelfRegister] = useState(false);

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                event.preventDefault();
                ok();
            }
        };
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);

    const ok = useCallback(() => {
        api.getUserInfo(user, pwd).then(
            info => props.onLogin(info),
            err => props.onError(err)
        );
    }, [user, pwd])


    return (selfRegister ? <SelfRegistration notify={props.notify} onCancel={() => setSelfRegister(false)} /> :
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    ניהול שבוע
                </Typography>

                <IOSSwitch
                    checked={true}
                    value={"הרשמה פתוחה"}
                    onChange={() => {

                    }} />
            </div>

        </Container>
    );
}