import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Link from '@material-ui/core/Link';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

import * as api from './api'
import { HBox } from './elem';



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

export default function ChangePwd(props) {
    const classes = useStyles();
    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");

    return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Typography component="h1" variant="h5">
          שינוי סיסמא
        </Typography>
         
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="סיסמא"
            type="password"
            autoComplete="current-password"
            onChange={(e)=>setPwd(e.currentTarget.value)}
          />
           <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="סיסמא בשנית"
            type="password"
            autoComplete="current-password"
            onChange={(e)=>setPwd2(e.currentTarget.value)}
          />
          <HBox>
          <Button
            
            
            variant="contained"
            color="primary"
            className={classes.submit}
            onClick={()=>{
                if (pwd == pwd2) {
                    api.changePwd(props.userInfo._user, pwd).then(
                        ()=>props.onPwdChanged(),
                        (err)=>props.notify.error(err.message, "שינוי סיסמא נכשל"));
                } else {
                    props.notify.error("סיסמאות אינן תואמות");
                }
            }}
          >
            שנה סיסמא
          </Button>
          <Button
            variant="contained"
            color="primary"
            className={classes.submit}
            onClick={()=>props.onCancel()}
          >
            בטל
          </Button>
          </HBox>

      </div>
      
    </Container >
  );
}