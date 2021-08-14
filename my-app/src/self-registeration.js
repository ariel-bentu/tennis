import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

import * as api from './api'
import { HBox, Spacer } from './elem';



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

export default function SelfRegistration(props) {
    const classes = useStyles();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [email2, setEmail2] = useState("");
    const [phone, setPhone] = useState("");
    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [disableReg, setDisableReg] = useState(false);


    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    רישום
                </Typography>
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="שם"
                    autoFocus
                    onChange={(e) => setName(e.currentTarget.value)}
                />
                <div style={{ width: '100%' }} dir={'ltr'}>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label="אימייל"
                        autoComplete="email"
                        autoFocus
                        onChange={(e) => setEmail(e.currentTarget.value)}
                    />
                </div>
                <div style={{ width: '100%' }} dir={'ltr'}>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label="אימייל בשנית"
                        autoComplete="email"
                        autoFocus
                        onChange={(e) => setEmail2(e.currentTarget.value)}
                    />
                </div>
                <div style={{ width: '100%' }} dir={'ltr'}>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label="מספר טלפון"
                        autoFocus
                        onChange={(e) => setPhone(e.currentTarget.value)}
                    />
                </div>
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="סיסמא"
                    type="password"
                    autoComplete="current-password"
                    onChange={(e) => setPwd(e.currentTarget.value)}
                />
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="סיסמא בשנית"
                    type="password"
                    autoComplete="current-password"
                    onChange={(e) => setPwd2(e.currentTarget.value)}
                />
                <HBox>
                    <Button
                        disabled={disableReg}
                        variant="contained"
                        color="primary"
                        className={classes.submit}
                        onClick={() => {
                            if (pwd != pwd2) {
                                props.notify.error("סיסמאות אינן תואמות");
                                return;
                            }
                            if (email != email2) {
                                props.notify.error("אימיילים אינם תואמים");
                                return;
                            }
                            if (!phone || phone.length < 10) {
                                props.notify.error("מספר טלפון שגוי");
                                return;
                            }
                                setDisableReg(true)
                                api.registerUser({
                                    displayName: name,
                                    email,
                                    phone
                                }, pwd).then(
                                    ()=> {
                                        props.notify.success("רישום עבר בהצלחה")
                                    },
                                    (err)=> {
                                        props.notify.error(err.message);
                                        setDisableReg(false);
                                    },
                                );
                                
                        }}
                    >
                        הרשם
                    </Button>
                    <Spacer width={20} />
                    <Button
                        variant="contained"
                        color="primary"
                        className={classes.submit}
                        onClick={() => props.onCancel()}
                    >
                        בטל
                    </Button>
                </HBox>

            </div>

        </Container >
    );
}