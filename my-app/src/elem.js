import * as React from 'react';
import { CircularProgress, TableCell, Box, Paper, InputBase, Switch } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

export function Spacer(props) {
    return <div style={{ width: props.width || 5, height: props.height || 5 }} />
}
export function Header(props) {
    return <div style={{ fontSize: 35, padding: 10 }}>{props.children}</div>
}

export function Paper1(props) {
    return <Paper elevation={3} style={{ display: 'flex', width: props.width ? props.width : '27%', height: props.height || '85vh', ...props.style }} {...props}>{props.children}</Paper>
}


export function Toolbar(props) {
    return <div style={{ flex: 1, flexDirection: 'row', height: 30, alignItems: 'flex-start' }}>{props.children}</div>
}

export function MyTableCell(props) {
    return <TableCell style={{ fontSize: 25, padding: 0, width: props.width }}  align="right">{props.children}</TableCell>
}

export function SmallTableCell(props) {
    return <TableCell  style={{ fontSize: 15, width: props.width, backgroundColor: props.bg }} align={props.align || "right"}>{props.children}</TableCell>
}

export function SmallTableCellLeft(props) {
    return <TableCell style={{ fontSize: 15, width: props.width, backgroundColor: props.bg }} >
        <div dir={"ltr"}>
            {props.children}
        </div>
    </TableCell>
}

export function SmallTableCellEditable(props) {
    return <SmallTableCell {...props}>
        <div dir={props.dir}>
            <InputBase
                style={{ width: '100%' }}
                value={props.value}
                onChange={props.onChange}
            />
        </div>
    </SmallTableCell>
}


export function Text(props) {
    return <div style={{ textAlign: props.textAlign || 'right', fontSize: props.fontSize || 25, padding: 10 }}>{props.children}</div>
}

export function VBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...props.style }}>
        {props.children}
    </Box>
}

export function HBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', ...props.style }}>
        {props.children}
    </Box>
}

export const ItemTypes = {
    BOX: 'box',
}




export function Loading(props) {
    return <div style={{
        dir: "rtl",
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        alignContent: 'center',
        justifyItems: 'center',
        //backgroundColor:'green'
    }}>
        <CircularProgress /><Text fontSize={35} textAlign={"center"}>{props.msg}</Text>
    </div>
}

export const IOSSwitch = withStyles((theme) => ({
    root: {
      width: 42,
      height: 26,
      padding: 0,
      margin: theme.spacing(1),
    },
    switchBase: {
      padding: 1,
      '&$checked': {
        transform: 'translateX(16px)',
        color: theme.palette.common.white,
        '& + $track': {
          backgroundColor: '#52d869',
          opacity: 1,
          border: 'none',
        },
      },
      '&$focusVisible $thumb': {
        color: '#52d869',
        border: '6px solid #fff',
      },
    },
    thumb: {
      width: 24,
      height: 24,
    },
    track: {
      borderRadius: 26 / 2,
      border: `1px solid ${theme.palette.grey[400]}`,
      backgroundColor: theme.palette.grey[50],
      opacity: 1,
      transition: theme.transitions.create(['background-color', 'border']),
    },
    checked: {},
    focusVisible: {},
  }))(({ classes, ...props }) => {
    return (
      <Switch
        focusVisibleClassName={classes.focusVisible}
        disableRipple
        classes={{
          root: classes.root,
          switchBase: classes.switchBase,
          thumb: classes.thumb,
          track: classes.track,
          checked: classes.checked,
        }}
        {...props}
      />
    );
  });