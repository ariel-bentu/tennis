import './App.css';

import * as React from 'react';
import {
    CircularProgress, TableCell, Box, Paper, InputBase,
    Switch, Typography, TextField, FormControl, InputLabel, Select, MenuItem
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import SportsBaseballSharpIcon from '@material-ui/icons/SportsBaseballSharp';
import { FindReplace } from '@material-ui/icons';


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
    return <TableCell style={{ fontSize: 25, padding: 0, width: props.width }} align="right">{props.children}</TableCell>
}

export function SmallTableCell(props) {
    return <TableCell style={{ fontSize: 15, width: props.width, backgroundColor: props.bg }} align={props.align || "right"}>{props.children}</TableCell>
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

export const getBallsIndicator = (player, inMatch) => player && player.balls && player.balls > 0 ? (
    <VBox style={{ alignContent: "center" }}>
        <SportsBaseballSharpIcon style={{ color: inMatch ? 'red' : '#DAE714', transform: "rotate(45deg)", fontSize: inMatch ? 20 : 25 }} />
        <div style={{ position: "absolute", width: 20, height: 20, backgroundColor: "transparent" }}>
            <SmallText2 textAlign="center" fontSize={inMatch ? 15 : 10} fontWeight={inMatch ? "bold" : "normal"}>{player.balls}</SmallText2>
        </div>
    </VBox>) :
    null

export const getReplacementIndicator = (player) => player?._activeReplacementRequest && (
    <VBox style={{ alignContent: "center" }}>
        <FindReplace style={{ color: 'red', fontSize: 25 }} />
    </VBox>)

export function BoxInput(props) {
    return <div className="Sunken" style={{
        backgroundColor: props.backgroundColor,
        justifyItem: 'center',
        width: 40, height: 50, margin: 5
    }}>
        {props.tieBreak ? <SmallText2 textAlign={'center'} fontSize={8}>שובר שוויון</SmallText2> : null}
        <InputBase
            inputRef={ref => props && props.focus ? (ref && ref.focus ? ref.focus() : {}) : {}}
            onChange={(e) => {
                props.onChange(e.currentTarget.value)

                if (e.currentTarget.value !== "" && props.onNextFocus)
                    props.onNextFocus();
            }}
            onFocus={() => props.onFocus ? props.onFocus() : {}}
            value={props.value} fullwidth={true}
            inputProps={{ pattern: "[0-9]*", style: { textAlign: 'center' } }}
            style={{ height: '100%' }} />
    </div>
};


export function HThinSeparator(props) {
    return <div style={{ height: 1, width: props.width || '95%', borderTop: "1px solid lightgray " }}></div>
}

export function HSeparator() {
    return <div style={{ height: 4, width: '100%', borderTop: "2px solid lightgray " }}></div>
}
export function CircledValue(props) {
    return <div style={{
        display: 'flex',
        borderRadius: '50%',
        width: props.size,
        height: props.size,
        textAlign: 'center',
        alignItems: 'center',
        alignContent: 'center',
        backgroundColor: props.backgroundColor || 'black',
        color: props.color || 'white'
    }}><SmallText2 textAlign={'center'} fontSize={props.size * .55}>{props.children}</SmallText2></div>
}

export function SmallText(props) {
    return <div style={{ textAlign: props.textAlign || 'right', color: props.color, fontSize: props.fontSize || 15, padding: 2 }}>{props.children}</div>
}

export function SmallText2(props) {
    return <div style={{
        width: props.width || '100%',
        textAlign: props.textAlign || 'right',
        fontSize: props.fontSize || 12,
        fontWeight: props.fontWeight,
        textDecoration: props.textDecoration,
        lineHeight: props.lineHeight,
        marginTop: props.marginTop,
        padding: 0,
        backgroundColor: props.backgroundColor,
        color: props.color,
        transform: props.transform || undefined
    }}>{props.children}</div>
}

export function ltr(props) {
    return <div dir="ltr">{props.children}</div>
}

export function SVGIcon(props) {
    let src = "";
    switch (props.svg) {
        case "editResults":
            src = require("./edit-results.svg").default;
            break;
        case "betPlus":
            src = require("./bet+.svg").default;
            break;
        case "betMinus":
            src = require("./bet-.svg").default;
            break;
        case "bet":
            src = require("./bet.svg").default;
            break;
        case "betGray":
            src = require("./bet-gray.svg").default;
            break;
        case "replacementRequest":
            src = require("./replacement.svg").default;
            break;
        case "cancelReplacementRequest":
            src = require("./replacementCancel.svg").default;
            break;
        default:
    }

    return <img src={src} alt="" {...props} style={{ ...props.style, height: props.size, width: props.size }} />
}

export function Card(props) {
    return <Box style={{
        display: 'flex',
        width: props.width || '94%',
        marginRight: '3%',
        marginLeft: '3%',
        marginBottom: 10,
        borderRadius: 4,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'white',
        boxShadow: "1px 2px 1px #9E9E9E",
        ...props.style
    }}>
        {props.children}
    </Box>
}

export function VBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...props.style }}>
        {props.children}
    </Box>
}
export const VBoxC = (props) => (<VBox style={{ alignItems: "center", justifyContent: "center", width: "100%", ...props.style }} >{props.children}</VBox>);


export const HBoxC = (props) => (<HBox style={{ alignItems: "center", justifyContent: "center", width: "100%", ...props.style }} >{props.children}</HBox>);
export const HBoxSB = (props) => (<HBox style={{ alignItems: "center", justifyContent: "space-between", width: "100%", ...props.style }} >{props.children}</HBox>);


export function HBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', ...props.style }}>
        {props.children}
    </Box>
}

export function Search(props) {
    return (
        <div dir="rtl" >
            <TextField label="חפש" type="search" variant="outlined" size="small" style={{ width: 200 }}
                onChange={(e) => props.onChange ? props.onChange(e.currentTarget.value) : {}}
            />
        </div>)
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

export const Picker = (props) => {
    return (<FormControl fullWidth>
        {props.name && <InputLabel >{props.name}</InputLabel>}
        <Select
            native={false}
            value={props.value}
            label={props.value}
            onChange={(event) => props.onChange(event.target.value)}
        >
            {props.values.map((val, i) => <MenuItem key={i} value={val}>{val}</MenuItem>)}
        </Select>
    </FormControl>)
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

export function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            {...other}
            style={{ padding: 0 }}
        >
            {props.title ? <h1 align="center">{props.title}</h1> : null}
            <Box style={{ padding: 2 }} p={3}>{children}</Box>
        </Typography>
    );
}
