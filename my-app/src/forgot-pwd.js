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

export default function ForgotPwd(props) {
    const classes = useStyles();
    const [email, setEmail] = useState("");

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    שכחתי סיסמא
                </Typography>
                <form className={classes.form} noValidate>

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
                    <HBox>
                        <Button


                            variant="contained"
                            color="primary"
                            className={classes.submit}
                            onClick={() => api.forgotPwd(email).then(
                                ()=>props.notify.success("מייל ישלח אליך להמשך תהליך"),
                                (err)=>props.notify.error(err.message)
                            )}
                        >
                            שלח מייל לשינוי סיסמא
                        </Button>
                        <Spacer width={20}/>
                        <Button
                            variant="contained"
                            color="primary"
                            className={classes.submit}
                            onClick={() => props.onCancel()}
                        >
                            בטל
                        </Button>
                    </HBox>
                </form>
            </div>

        </Container >
    );
}