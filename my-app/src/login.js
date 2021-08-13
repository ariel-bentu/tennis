import React, { useCallback, useState, useEffect } from 'react';
import Avatar from '@material-ui/core/Avatar';
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


  return (selfRegister? <SelfRegistration notify={props.notify} onCancel={()=>setSelfRegister(false)}/> :
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          התחברות
        </Typography>
        <div style={{width:'100%'}} dir={'ltr'}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="אימייל"
            autoComplete="email"
            autoFocus
            onChange={(e) => setUser(e.currentTarget.value)}
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
        <Button

          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          onClick={ok}
        >
          התחבר
        </Button>
        <Grid container>
          <Grid item xs>
            <Link variant="body2" onClick={props.onForgotPwd}>
              שכחתי סיסמא?
            </Link>
          </Grid>
          <Grid item>
            <Link href="#" variant="body2" onClick={()=>setSelfRegister(true)}>
              {"משתמש חדש? הרשם"}
            </Link>
          </Grid>
        </Grid>
      </div>

    </Container>
  );
}